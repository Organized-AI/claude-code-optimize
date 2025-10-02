/**
 * Context Tracker - Per-session context window monitoring
 * Tracks conversation context usage (0-180k tokens) separately from quota
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CompactionItem {
  type: 'old_file_read' | 'duplicate_tool' | 'verbose_output';
  estimatedTokens: number;
  description: string;
  preserve: boolean;
}

export interface ContextUsage {
  totalTokens: number;
  breakdown: {
    systemPrompt: number;      // ~5k
    fileReads: number;         // 500-5k each
    toolResults: number;       // 100-2k each
    conversation: number;      // 100-500 per exchange
    codeGenerated: number;     // 500-3k per response
  };
  percentUsed: number;
  status: 'fresh' | 'healthy' | 'moderate' | 'warning' | 'danger' | 'critical';
  compactionOpportunities: CompactionItem[];
  estimatedHoursRemaining: number;
}

export type NotificationLevel = 'normal' | 'high' | 'critical';

export class ContextTracker {
  private readonly CONTEXT_LIMIT = 180000;  // 90% of 200k
  private readonly THRESHOLDS = {
    WARNING: 0.50,   // 90k tokens
    DANGER: 0.80,    // 144k tokens
    CRITICAL: 0.90   // 162k tokens
  };

  private contextPath: string;
  private sessionId: string;

  constructor(dataDir?: string, sessionId?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.contextPath = path.join(dataDir || path.join(home, '.claude'), 'context-tracker.json');
    this.sessionId = sessionId || this.generateSessionId();
  }

  /**
   * Estimate current context usage
   */
  async estimateCurrentContext(): Promise<ContextUsage> {
    const context = this.loadContext();

    // Calculate breakdown
    const breakdown = {
      systemPrompt: this.estimateSystemPrompt(),
      fileReads: context.fileReadsTokens || 0,
      toolResults: context.toolResultsTokens || 0,
      conversation: context.conversationTokens || 0,
      codeGenerated: context.codeGeneratedTokens || 0
    };

    const totalTokens = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const percentUsed = (totalTokens / this.CONTEXT_LIMIT) * 100;

    // Determine status
    const status = this.determineStatus(percentUsed);

    // Identify compaction opportunities
    const compactionOpportunities = this.identifyCompactionOpportunities(context);

    // Estimate hours remaining (conservative: 10k tokens per hour)
    const remainingTokens = this.CONTEXT_LIMIT - totalTokens;
    const estimatedHoursRemaining = Math.max(0, remainingTokens / 10000);

    return {
      totalTokens,
      breakdown,
      percentUsed,
      status,
      compactionOpportunities,
      estimatedHoursRemaining
    };
  }

  /**
   * Track a file read operation
   */
  trackFileRead(filePath: string, estimatedTokens: number): void {
    const context = this.loadContext();

    if (!context.fileReads) {
      context.fileReads = [];
    }

    context.fileReads.push({
      path: filePath,
      tokens: estimatedTokens,
      timestamp: new Date().toISOString()
    });

    context.fileReadsTokens = (context.fileReadsTokens || 0) + estimatedTokens;

    this.saveContext(context);
    this.checkThresholds();
  }

  /**
   * Track a tool result
   */
  trackToolResult(tool: string, estimatedTokens: number): void {
    const context = this.loadContext();

    if (!context.toolResults) {
      context.toolResults = [];
    }

    context.toolResults.push({
      tool,
      tokens: estimatedTokens,
      timestamp: new Date().toISOString()
    });

    context.toolResultsTokens = (context.toolResultsTokens || 0) + estimatedTokens;

    this.saveContext(context);
    this.checkThresholds();
  }

  /**
   * Track conversation exchange
   */
  trackConversation(estimatedTokens: number): void {
    const context = this.loadContext();

    context.conversationTokens = (context.conversationTokens || 0) + estimatedTokens;
    context.exchangeCount = (context.exchangeCount || 0) + 1;

    this.saveContext(context);
    this.checkThresholds();
  }

  /**
   * Track code generation
   */
  trackCodeGeneration(estimatedTokens: number): void {
    const context = this.loadContext();

    context.codeGeneratedTokens = (context.codeGeneratedTokens || 0) + estimatedTokens;
    context.codeResponseCount = (context.codeResponseCount || 0) + 1;

    this.saveContext(context);
    this.checkThresholds();
  }

  /**
   * Check if notification should be sent
   */
  shouldNotify(usage: number): NotificationLevel | null {
    const percent = (usage / this.CONTEXT_LIMIT) * 100;

    if (percent >= this.THRESHOLDS.CRITICAL * 100) {
      return 'critical';
    }

    if (percent >= this.THRESHOLDS.DANGER * 100) {
      return 'high';
    }

    if (percent >= this.THRESHOLDS.WARNING * 100) {
      return 'normal';
    }

    return null;
  }

  /**
   * Identify compaction opportunities
   */
  identifyCompactionOpportunities(context: any): CompactionItem[] {
    const opportunities: CompactionItem[] = [];

    // Old file reads (keep most recent 10)
    if (context.fileReads && context.fileReads.length > 10) {
      const oldReads = context.fileReads.slice(0, -10);
      const tokens = oldReads.reduce((sum: number, read: any) => sum + read.tokens, 0);

      opportunities.push({
        type: 'old_file_read',
        estimatedTokens: tokens,
        description: `Remove ${oldReads.length} old file reads (keep recent 10)`,
        preserve: false
      });
    }

    // Duplicate tool results
    if (context.toolResults) {
      const toolCounts = new Map<string, number>();
      context.toolResults.forEach((result: any) => {
        toolCounts.set(result.tool, (toolCounts.get(result.tool) || 0) + 1);
      });

      toolCounts.forEach((count, tool) => {
        if (count > 5) {
          opportunities.push({
            type: 'duplicate_tool',
            estimatedTokens: (count - 5) * 300, // Estimate
            description: `Deduplicate ${tool} results (${count} occurrences, keep 5)`,
            preserve: false
          });
        }
      });
    }

    // Verbose output (heuristic)
    if (context.toolResultsTokens > 15000) {
      opportunities.push({
        type: 'verbose_output',
        estimatedTokens: Math.floor(context.toolResultsTokens * 0.2), // 20% can be trimmed
        description: 'Trim verbose tool outputs',
        preserve: false
      });
    }

    return opportunities;
  }

  /**
   * Determine status from percentage
   */
  private determineStatus(percent: number): 'fresh' | 'healthy' | 'moderate' | 'warning' | 'danger' | 'critical' {
    if (percent >= 90) return 'critical';
    if (percent >= 80) return 'danger';
    if (percent >= 50) return 'warning';
    if (percent >= 25) return 'moderate';
    if (percent >= 10) return 'healthy';
    return 'fresh';
  }

  /**
   * Check thresholds and send warnings
   */
  private async checkThresholds(): Promise<void> {
    const usage = await this.estimateCurrentContext();
    const percent = usage.percentUsed;

    const context = this.loadContext();
    const lastWarning = context.lastWarningPercent || 0;

    // 50% - Warning
    if (percent >= 50 && lastWarning < 50) {
      this.sendNotification(
        '📝 50% Context Used',
        `Context window is ${percent.toFixed(1)}% full. ${usage.estimatedHoursRemaining.toFixed(1)}h estimated remaining.`,
        'normal'
      );
      context.lastWarningPercent = 50;
    }

    // 80% - Danger
    if (percent >= 80 && lastWarning < 80) {
      this.sendNotification(
        '⚠️ 80% Context Used - DANGER',
        `Context approaching limit! ${(100 - percent).toFixed(1)}% remaining. Consider compaction.`,
        'high'
      );
      context.lastWarningPercent = 80;
    }

    // 90% - Critical
    if (percent >= 90 && lastWarning < 90) {
      this.sendNotification(
        '🚨 90% Context CRITICAL',
        `Context nearly full! ${(100 - percent).toFixed(1)}% left. Compact or restart session immediately!`,
        'critical'
      );
      context.lastWarningPercent = 90;
    }

    this.saveContext(context);
  }

  /**
   * Send notification (platform-specific)
   */
  private sendNotification(title: string, message: string, urgency: NotificationLevel): void {
    console.log(`${title}: ${message}`);

    // macOS notification
    if (process.platform === 'darwin') {
      const sound = urgency === 'critical' ? 'Basso' : 'Ping';
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "${message}" with title "${title}" sound name "${sound}"'`);
    }
  }

  /**
   * Estimate system prompt tokens
   */
  private estimateSystemPrompt(): number {
    // Claude's system prompt + CLAUDE.md + any agent files
    return 5000; // Conservative estimate
  }

  /**
   * Load context state
   */
  private loadContext(): any {
    if (!fs.existsSync(this.contextPath)) {
      return this.initializeContext();
    }

    const data = JSON.parse(fs.readFileSync(this.contextPath, 'utf-8'));

    // Check if this is a new session
    if (data.sessionId !== this.sessionId) {
      return this.initializeContext();
    }

    return data;
  }

  /**
   * Save context state
   */
  private saveContext(context: any): void {
    const dir = path.dirname(this.contextPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    context.sessionId = this.sessionId;
    context.lastUpdated = new Date().toISOString();

    fs.writeFileSync(this.contextPath, JSON.stringify(context, null, 2));
  }

  /**
   * Initialize new context tracker
   */
  private initializeContext(): any {
    return {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      fileReads: [],
      fileReadsTokens: 0,
      toolResults: [],
      toolResultsTokens: 0,
      conversationTokens: 0,
      exchangeCount: 0,
      codeGeneratedTokens: 0,
      codeResponseCount: 0,
      lastWarningPercent: 0
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}`;
  }

  /**
   * Reset context for new session
   */
  resetContext(): void {
    this.sessionId = this.generateSessionId();
    const context = this.initializeContext();
    this.saveContext(context);
    console.log('✅ Context window reset for new session');
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
