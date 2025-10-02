/**
 * Handoff Manager
 * Creates and manages session handoff files for context preservation
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionHandoff, HandoffMetadata } from './types/handoff.js';
import { SessionMemoryManager, SessionHistory } from './session-memory.js';

export class HandoffManager {
  private handoffDir: string;
  private memoryManager: SessionMemoryManager;

  constructor(dataDir?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.handoffDir = path.join(dataDir || path.join(home, '.claude'), 'session-handoffs');
    this.memoryManager = new SessionMemoryManager(dataDir);

    // Ensure directory exists
    if (!fs.existsSync(this.handoffDir)) {
      fs.mkdirSync(this.handoffDir, { recursive: true });
    }
  }

  /**
   * Create a new handoff file with project memory integration
   */
  async createHandoff(handoff: Omit<SessionHandoff, 'fromSessionId' | 'createdAt'>): Promise<string> {
    const sessionId = this.generateSessionId();
    const timestamp = new Date().toISOString();

    const completeHandoff: SessionHandoff = {
      ...handoff,
      fromSessionId: sessionId,
      createdAt: timestamp
    };

    // Load project memory
    const memory = await this.memoryManager.loadProjectMemory(handoff.projectPath);

    // Create session history entry
    const sessionHistory: SessionHistory = {
      sessionId,
      sessionNumber: memory.totalSessions + 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: handoff.nextObjectives.map(obj => obj.description),
      completedTasks: handoff.accomplishments,
      keyDecisions: handoff.keyDecisions,
      tokensUsed: handoff.estimatedTokens,
      filesModified: handoff.currentState.filesModified || []
    };

    // Save session to memory
    await this.memoryManager.saveSessionMemory(handoff.projectPath, sessionHistory);

    // Generate markdown with memory context
    const markdown = this.generateMarkdown(completeHandoff, memory);
    const filename = `handoff-${sessionId}.md`;
    const filepath = path.join(this.handoffDir, filename);

    fs.writeFileSync(filepath, markdown, 'utf-8');

    return filepath;
  }

  /**
   * Load a handoff file
   */
  loadHandoff(handoffId: string): SessionHandoff | null {
    const filepath = path.join(this.handoffDir, `handoff-${handoffId}.md`);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    return this.parseMarkdown(content);
  }

  /**
   * List all handoffs
   */
  listHandoffs(): HandoffMetadata[] {
    if (!fs.existsSync(this.handoffDir)) {
      return [];
    }

    const files = fs.readdirSync(this.handoffDir)
      .filter(f => f.startsWith('handoff-') && f.endsWith('.md'));

    return files.map(file => {
      const content = fs.readFileSync(path.join(this.handoffDir, file), 'utf-8');
      const handoff = this.parseMarkdown(content);

      return {
        id: handoff.fromSessionId,
        projectPath: handoff.projectPath,
        projectName: handoff.projectName,
        createdAt: new Date(handoff.createdAt),
        scheduledFor: handoff.scheduledFor ? new Date(handoff.scheduledFor) : undefined,
        status: this.determineStatus(handoff),
        estimatedTokens: handoff.estimatedTokens
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate markdown format from handoff object
   */
  private generateMarkdown(handoff: SessionHandoff, memory?: any): string {
    const scheduledTime = handoff.scheduledFor
      ? new Date(handoff.scheduledFor).toLocaleString()
      : 'Not scheduled';

    let md = '';

    // Inject project memory context at the top
    if (memory) {
      md += this.memoryManager.injectContextOnStart(memory);
      md += '\n---\n\n';
    }

    md += `# Session Handoff: ${handoff.projectName}\n\n`;
    md += `**From Session**: ${handoff.fromSessionId}\n`;
    md += `**To Session**: ${handoff.toSessionId || '(auto-generated at launch)'}\n`;
    md += `**Scheduled For**: ${scheduledTime}\n`;
    if (handoff.agent) md += `**Agent**: ${handoff.agent}\n`;
    if (handoff.model) md += `**Model**: ${handoff.model}\n`;
    md += `**Project**: ${handoff.projectPath}\n\n`;

    // Accomplishments
    md += `## What Was Accomplished\n\n`;
    handoff.accomplishments.forEach(item => {
      md += `- ✅ ${item}\n`;
    });
    md += `\n`;

    // Current State
    md += `## Current State\n\n`;
    if (handoff.currentState.branch) {
      md += `- **Branch**: ${handoff.currentState.branch}\n`;
    }
    if (handoff.currentState.lastCommit) {
      md += `- **Last Commit**: "${handoff.currentState.lastCommit}"\n`;
    }
    if (handoff.currentState.testsStatus) {
      md += `- **Tests**: ${handoff.currentState.testsStatus}\n`;
    }
    if (handoff.currentState.filesModified && handoff.currentState.filesModified.length > 0) {
      md += `- **Files Modified**:\n`;
      handoff.currentState.filesModified.forEach(file => {
        md += `  - ${file}\n`;
      });
    }
    md += `\n`;

    // Next Objectives
    md += `## Next Session Objectives\n\n`;
    handoff.nextObjectives.forEach((obj, i) => {
      const priority = obj.priority ? ` [${obj.priority.toUpperCase()}]` : '';
      const tokens = obj.estimatedTokens ? ` (Est: ${obj.estimatedTokens.toLocaleString()} tokens)` : '';
      md += `${i + 1}. **${obj.description}**${priority}${tokens}\n`;
      if (obj.dependencies && obj.dependencies.length > 0) {
        md += `   - Dependencies: ${obj.dependencies.join(', ')}\n`;
      }
      md += `\n`;
    });

    md += `**Total Estimate**: ${handoff.estimatedTokens.toLocaleString()} tokens\n\n`;

    // Key Decisions
    if (handoff.keyDecisions.length > 0) {
      md += `## Key Decisions & Context\n\n`;
      handoff.keyDecisions.forEach(decision => {
        md += `- ${decision}\n`;
      });
      md += `\n`;
    }

    // Blockers
    md += `## Blockers & Notes\n\n`;
    if (handoff.blockers.length > 0) {
      handoff.blockers.forEach(blocker => {
        md += `⚠️ ${blocker}\n`;
      });
    } else {
      md += `None! Ready to proceed immediately.\n`;
    }
    if (handoff.notes) {
      md += `\n${handoff.notes}\n`;
    }
    md += `\n`;

    // Files to Read
    if (handoff.filesToRead && handoff.filesToRead.length > 0) {
      md += `## Files to Read First\n\n`;
      handoff.filesToRead.forEach((file, i) => {
        md += `${i + 1}. ${file}\n`;
      });
      md += `\n`;
    }

    // Startup Commands
    if (handoff.startupCommands && handoff.startupCommands.length > 0) {
      md += `## Commands to Run on Start\n\n`;
      md += `\`\`\`bash\n`;
      handoff.startupCommands.forEach(cmd => {
        md += `${cmd}\n`;
      });
      md += `\`\`\`\n\n`;
    }

    // Agent Instructions
    if (handoff.agentInstructions) {
      md += `## Agent Instructions\n\n`;
      md += `${handoff.agentInstructions}\n`;
    }

    return md;
  }

  /**
   * Parse markdown back to handoff object (basic implementation)
   */
  private parseMarkdown(content: string): SessionHandoff {
    // Simple regex-based parsing
    // In production, consider using a markdown parser

    const extractLine = (pattern: RegExp): string | undefined => {
      const match = content.match(pattern);
      return match ? match[1].trim() : undefined;
    };

    const extractSection = (heading: string): string[] => {
      const regex = new RegExp(`## ${heading}([\\s\\S]*?)(?=##|$)`, 'i');
      const match = content.match(regex);
      if (!match) return [];

      return match[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.✅⚠️\s]+/, '').trim())
        .filter(Boolean);
    };

    return {
      fromSessionId: extractLine(/\*\*From Session\*\*:\s*(.+)/) || 'unknown',
      toSessionId: undefined,
      createdAt: new Date().toISOString(),
      projectPath: extractLine(/\*\*Project\*\*:\s*(.+)/) || '',
      projectName: content.match(/# Session Handoff:\s*(.+)/)?.[1] || 'Unknown Project',
      agent: extractLine(/\*\*Agent\*\*:\s*(.+)/),
      model: extractLine(/\*\*Model\*\*:\s*(.+)/),
      accomplishments: extractSection('What Was Accomplished'),
      currentState: {},
      nextObjectives: extractSection('Next Session Objectives').map(desc => ({ description: desc })),
      estimatedTokens: parseInt(extractLine(/\*\*Total Estimate\*\*:\s*([\d,]+)/)?.replace(/,/g, '') || '0'),
      keyDecisions: extractSection('Key Decisions'),
      blockers: [],
      notes: ''
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
   * Determine handoff status
   */
  private determineStatus(handoff: SessionHandoff): 'pending' | 'launched' | 'completed' | 'cancelled' {
    if (handoff.toSessionId) {
      return 'launched';
    }
    if (handoff.scheduledFor) {
      const scheduledTime = new Date(handoff.scheduledFor);
      if (scheduledTime > new Date()) {
        return 'pending';
      }
      return 'launched'; // Past scheduled time
    }
    return 'pending';
  }
}
