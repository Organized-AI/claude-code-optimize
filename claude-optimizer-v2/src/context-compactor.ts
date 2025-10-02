/**
 * Context Compactor
 * Three-level compaction system to reduce context window usage
 */

import * as fs from 'fs';
import * as path from 'path';

export type CompactionLevel = 'soft' | 'strategic' | 'emergency';

export interface CompactionResult {
  beforeTokens: number;
  afterTokens: number;
  tokensSaved: number;
  itemsRemoved: number;
  itemsPreserved: number;
  removedItems: CompactionRemovedItem[];
}

export interface CompactionRemovedItem {
  type: string;
  description: string;
  tokens: number;
}

export class ContextCompactor {
  private contextPath: string;

  constructor(dataDir?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.contextPath = path.join(dataDir || path.join(home, '.claude'), 'context-tracker.json');
  }

  /**
   * Perform compaction at specified level
   */
  async compact(level: CompactionLevel): Promise<CompactionResult> {
    const context = this.loadContext();
    const beforeTokens = this.calculateTotalTokens(context);

    let result: CompactionResult;

    switch (level) {
      case 'soft':
        result = await this.softCompact(context);
        break;
      case 'strategic':
        result = await this.strategicCompact(context);
        break;
      case 'emergency':
        result = await this.emergencyCompact(context);
        break;
    }

    result.beforeTokens = beforeTokens;

    this.saveContext(context);

    return result;
  }

  /**
   * Soft compaction - Remove obvious waste
   * Target: 10-20k token savings
   */
  private async softCompact(context: any): Promise<CompactionResult> {
    const removedItems: CompactionRemovedItem[] = [];
    let tokensSaved = 0;
    let itemsRemoved = 0;
    let itemsPreserved = 0;

    // Rule 1: Remove old file reads (keep most recent 10)
    if (context.fileReads && context.fileReads.length > 10) {
      const oldReads = context.fileReads.slice(0, -10);
      const savedTokens = oldReads.reduce((sum: number, read: any) => sum + read.tokens, 0);

      removedItems.push({
        type: 'old_file_reads',
        description: `Removed ${oldReads.length} old file reads (kept recent 10)`,
        tokens: savedTokens
      });

      context.fileReads = context.fileReads.slice(-10);
      context.fileReadsTokens -= savedTokens;
      tokensSaved += savedTokens;
      itemsRemoved += oldReads.length;
      itemsPreserved += 10;
    } else {
      itemsPreserved += context.fileReads?.length || 0;
    }

    // Rule 2: Deduplicate tool results (keep 5 per type)
    if (context.toolResults && context.toolResults.length > 0) {
      const toolMap = new Map<string, any[]>();

      // Group by tool type
      context.toolResults.forEach((result: any) => {
        if (!toolMap.has(result.tool)) {
          toolMap.set(result.tool, []);
        }
        toolMap.get(result.tool)!.push(result);
      });

      const newToolResults: any[] = [];
      let toolTokensSaved = 0;

      toolMap.forEach((results, toolName) => {
        if (results.length > 5) {
          // Keep most recent 5
          const toRemove = results.slice(0, -5);
          const toKeep = results.slice(-5);

          const savedTokens = toRemove.reduce((sum, r) => sum + r.tokens, 0);
          toolTokensSaved += savedTokens;
          itemsRemoved += toRemove.length;

          removedItems.push({
            type: 'duplicate_tools',
            description: `Deduplicated ${toolName} results (${results.length} → 5)`,
            tokens: savedTokens
          });

          newToolResults.push(...toKeep);
          itemsPreserved += 5;
        } else {
          newToolResults.push(...results);
          itemsPreserved += results.length;
        }
      });

      context.toolResults = newToolResults;
      context.toolResultsTokens -= toolTokensSaved;
      tokensSaved += toolTokensSaved;
    }

    const afterTokens = this.calculateTotalTokens(context);

    return {
      beforeTokens: 0, // Will be set by caller
      afterTokens,
      tokensSaved,
      itemsRemoved,
      itemsPreserved,
      removedItems
    };
  }

  /**
   * Strategic compaction - More aggressive cleanup
   * Target: 30-50k token savings
   */
  private async strategicCompact(context: any): Promise<CompactionResult> {
    // Start with soft compaction
    const softResult = await this.softCompact(context);

    // Rule 3: Trim verbose outputs (keep first/last 200 chars)
    if (context.toolResults) {
      let verboseSavings = 0;

      context.toolResults = context.toolResults.map((result: any) => {
        if (result.tokens > 1000) {
          // Large result - trim it
          const originalTokens = result.tokens;
          const newTokens = Math.floor(originalTokens * 0.3); // Keep 30%

          verboseSavings += (originalTokens - newTokens);

          return {
            ...result,
            tokens: newTokens,
            trimmed: true
          };
        }
        return result;
      });

      if (verboseSavings > 0) {
        softResult.removedItems.push({
          type: 'verbose_output',
          description: 'Trimmed verbose tool outputs (kept summaries)',
          tokens: verboseSavings
        });

        context.toolResultsTokens -= verboseSavings;
        softResult.tokensSaved += verboseSavings;
      }
    }

    // Rule 4: Keep only recent 5 file reads
    if (context.fileReads && context.fileReads.length > 5) {
      const toRemove = context.fileReads.slice(0, -5);
      const savedTokens = toRemove.reduce((sum: number, read: any) => sum + read.tokens, 0);

      softResult.removedItems.push({
        type: 'old_file_reads',
        description: `Further reduced file reads (kept only 5 most recent)`,
        tokens: savedTokens
      });

      context.fileReads = context.fileReads.slice(-5);
      context.fileReadsTokens -= savedTokens;
      softResult.tokensSaved += savedTokens;
      softResult.itemsRemoved += toRemove.length;
      softResult.itemsPreserved = (softResult.itemsPreserved || 0) - toRemove.length;
    }

    // Rule 5: Reduce conversation history (keep recent 50%)
    if (context.conversationTokens > 5000) {
      const reductionTokens = Math.floor(context.conversationTokens * 0.5);

      softResult.removedItems.push({
        type: 'conversation_history',
        description: 'Trimmed conversation history (kept recent 50%)',
        tokens: reductionTokens
      });

      context.conversationTokens -= reductionTokens;
      softResult.tokensSaved += reductionTokens;
    }

    softResult.afterTokens = this.calculateTotalTokens(context);

    return softResult;
  }

  /**
   * Emergency compaction - Extreme measures
   * Target: 60-80k token savings
   */
  private async emergencyCompact(context: any): Promise<CompactionResult> {
    // Start with strategic compaction
    const strategicResult = await this.strategicCompact(context);

    // Rule 6: Keep only 3 most recent file reads
    if (context.fileReads && context.fileReads.length > 3) {
      const toRemove = context.fileReads.slice(0, -3);
      const savedTokens = toRemove.reduce((sum: number, read: any) => sum + read.tokens, 0);

      strategicResult.removedItems.push({
        type: 'old_file_reads',
        description: 'Emergency: Kept only 3 most recent file reads',
        tokens: savedTokens
      });

      context.fileReads = context.fileReads.slice(-3);
      context.fileReadsTokens -= savedTokens;
      strategicResult.tokensSaved += savedTokens;
      strategicResult.itemsRemoved += toRemove.length;
    }

    // Rule 7: Keep only 2 tool results per type
    if (context.toolResults) {
      const toolMap = new Map<string, any[]>();

      context.toolResults.forEach((result: any) => {
        if (!toolMap.has(result.tool)) {
          toolMap.set(result.tool, []);
        }
        toolMap.get(result.tool)!.push(result);
      });

      const newToolResults: any[] = [];
      let emergencyToolSavings = 0;

      toolMap.forEach((results) => {
        if (results.length > 2) {
          const toRemove = results.slice(0, -2);
          const savedTokens = toRemove.reduce((sum, r) => sum + r.tokens, 0);

          emergencyToolSavings += savedTokens;
          strategicResult.itemsRemoved += toRemove.length;

          newToolResults.push(...results.slice(-2));
        } else {
          newToolResults.push(...results);
        }
      });

      if (emergencyToolSavings > 0) {
        strategicResult.removedItems.push({
          type: 'tool_results',
          description: 'Emergency: Kept only 2 results per tool type',
          tokens: emergencyToolSavings
        });

        context.toolResults = newToolResults;
        context.toolResultsTokens -= emergencyToolSavings;
        strategicResult.tokensSaved += emergencyToolSavings;
      }
    }

    // Rule 8: Drastically reduce conversation history (keep recent 25%)
    if (context.conversationTokens > 2000) {
      const additionalReduction = Math.floor(context.conversationTokens * 0.75);

      strategicResult.removedItems.push({
        type: 'conversation_history',
        description: 'Emergency: Trimmed conversation to recent 25%',
        tokens: additionalReduction
      });

      context.conversationTokens = Math.floor(context.conversationTokens * 0.25);
      strategicResult.tokensSaved += additionalReduction;
    }

    // Rule 9: Reduce code generation history (keep recent 25%)
    if (context.codeGeneratedTokens > 2000) {
      const codeReduction = Math.floor(context.codeGeneratedTokens * 0.75);

      strategicResult.removedItems.push({
        type: 'code_generation',
        description: 'Emergency: Trimmed code generation history to 25%',
        tokens: codeReduction
      });

      context.codeGeneratedTokens = Math.floor(context.codeGeneratedTokens * 0.25);
      strategicResult.tokensSaved += codeReduction;
    }

    strategicResult.afterTokens = this.calculateTotalTokens(context);

    return strategicResult;
  }

  /**
   * Calculate total tokens from context
   */
  private calculateTotalTokens(context: any): number {
    const systemPrompt = 5000; // Estimated

    return systemPrompt +
      (context.fileReadsTokens || 0) +
      (context.toolResultsTokens || 0) +
      (context.conversationTokens || 0) +
      (context.codeGeneratedTokens || 0);
  }

  /**
   * Load context state
   */
  private loadContext(): any {
    if (!fs.existsSync(this.contextPath)) {
      throw new Error('No context tracker found. Start tracking first.');
    }

    return JSON.parse(fs.readFileSync(this.contextPath, 'utf-8'));
  }

  /**
   * Save context state
   */
  private saveContext(context: any): void {
    const dir = path.dirname(this.contextPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    context.lastCompacted = new Date().toISOString();
    fs.writeFileSync(this.contextPath, JSON.stringify(context, null, 2));
  }

  /**
   * Get compaction recommendations
   */
  async getRecommendation(currentTokens: number): Promise<CompactionLevel | null> {
    const CONTEXT_LIMIT = 180000;
    const percent = (currentTokens / CONTEXT_LIMIT) * 100;

    if (percent >= 90) {
      return 'emergency';
    }

    if (percent >= 80) {
      return 'strategic';
    }

    if (percent >= 60) {
      return 'soft';
    }

    return null;
  }

  /**
   * Preview compaction without applying
   */
  async previewCompaction(level: CompactionLevel): Promise<CompactionResult> {
    const context = JSON.parse(JSON.stringify(this.loadContext())); // Deep copy
    const beforeTokens = this.calculateTotalTokens(context);

    let result: CompactionResult;

    switch (level) {
      case 'soft':
        result = await this.softCompact(context);
        break;
      case 'strategic':
        result = await this.strategicCompact(context);
        break;
      case 'emergency':
        result = await this.emergencyCompact(context);
        break;
    }

    result.beforeTokens = beforeTokens;

    // Don't save - this is just a preview
    return result;
  }
}
