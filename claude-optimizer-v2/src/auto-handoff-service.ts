/**
 * Auto-Handoff Service
 * Automatically creates handoffs at context/quota thresholds
 * Intelligently populates fields from session memory and git
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { HandoffManager } from './handoff-manager.js';
import { SessionMemoryManager, ProjectMemory } from './session-memory.js';
import { ContextTracker } from './context-tracker.js';
import { QuotaTracker } from './quota-tracker.js';
import type { SessionHandoff, SessionObjective } from './types/handoff.js';

export class AutoHandoffService {
  private handoffManager: HandoffManager;
  private memoryManager: SessionMemoryManager;
  private contextTracker: ContextTracker;
  private quotaTracker: QuotaTracker;

  constructor() {
    this.handoffManager = new HandoffManager();
    this.memoryManager = new SessionMemoryManager();
    this.contextTracker = new ContextTracker();
    this.quotaTracker = new QuotaTracker();
  }

  /**
   * Check thresholds and prompt for handoff if needed
   */
  async checkAndPrompt(): Promise<void> {
    const contextUsage = await this.contextTracker.estimateCurrentContext();
    const quotaStatus = this.quotaTracker.getStatus();

    const contextPercent = contextUsage.percentUsed;
    const quotaPercent = quotaStatus.percent;

    // Determine urgency
    let urgency: 'normal' | 'high' | 'critical' = 'normal';
    let message = '';

    if (contextPercent >= 90 || quotaPercent >= 90) {
      urgency = 'critical';
      message = 'CRITICAL: Context or quota at 90%+. Creating emergency handoff...';
      // Force auto-create at 90%
      await this.createQuickHandoff();
      return;
    } else if (contextPercent >= 80 && quotaPercent >= 80) {
      urgency = 'critical';
      message = 'Both context and quota at 80%. Handoff strongly recommended!';
    } else if (contextPercent >= 80) {
      urgency = 'high';
      message = `Context window at ${contextPercent.toFixed(0)}%. Consider creating handoff.`;
    } else if (quotaPercent >= 80) {
      urgency = 'high';
      message = `Quota at ${quotaPercent}%. Consider creating handoff.`;
    }

    if (urgency !== 'normal') {
      console.log('');
      console.log('━'.repeat(80));
      console.log(`🚨 ${message}`);
      console.log('━'.repeat(80));
      console.log('');
      console.log('Would you like to create a handoff now?');
      console.log('  1. Yes - Create auto-populated handoff');
      console.log('  2. Snooze - Check again in 15 minutes');
      console.log('  3. Ignore - Continue working');
      console.log('');

      // TODO: Implement interactive prompt
      // For now, just notify
      this.sendNotification('🚨 Handoff Recommended', message, urgency);
    }
  }

  /**
   * Auto-populate handoff from session memory
   */
  async generateAutoHandoff(projectPath: string): Promise<Partial<SessionHandoff>> {
    const memory = await this.memoryManager.loadProjectMemory(projectPath);
    const modifiedFiles = this.detectModifiedFiles();
    const lastSession = memory.sessions[memory.sessions.length - 1];

    // Auto-populate from memory
    const accomplishments = lastSession
      ? lastSession.completedTasks
      : ['Session in progress'];

    const keyDecisions = memory.cumulativeContext.keyDecisions.slice(-5);

    const nextObjectives = await this.extractNextObjectives(memory, projectPath);

    const estimatedTokens = nextObjectives.reduce(
      (sum, obj) => sum + (obj.estimatedTokens || 50000),
      0
    );

    return {
      projectPath,
      projectName: memory.projectName,
      accomplishments,
      currentState: {
        branch: this.getCurrentBranch(),
        lastCommit: this.getLastCommit(),
        testsStatus: await this.getTestStatus(),
        filesModified: modifiedFiles
      },
      nextObjectives,
      estimatedTokens,
      keyDecisions,
      blockers: [],
      notes: 'Auto-generated handoff from session memory'
    };
  }

  /**
   * Create quick handoff without user interaction
   */
  async createQuickHandoff(options?: Partial<SessionHandoff>): Promise<string> {
    const projectPath = process.cwd();
    const autoData = await this.generateAutoHandoff(projectPath);

    // Merge with provided options
    const handoffData = {
      ...autoData,
      ...options,
      agent: options?.agent || '.claude/agents/implementation.md',
      model: options?.model || 'sonnet'
    };

    console.log('💾 Creating automatic handoff...');
    console.log('  ✓ Loaded session memory');
    console.log(`  ✓ Detected ${handoffData.currentState?.filesModified?.length || 0} modified files`);
    console.log(`  ✓ Extracted ${handoffData.accomplishments?.length || 0} accomplishments`);
    console.log(`  ✓ Generated ${handoffData.nextObjectives?.length || 0} next objectives`);

    const handoffPath = await this.handoffManager.createHandoff(
      handoffData as Omit<SessionHandoff, 'fromSessionId' | 'createdAt'>
    );

    console.log('');
    console.log(`📄 Handoff created: ${path.basename(handoffPath)}`);
    console.log('');

    // Reset context tracker
    this.contextTracker.resetContext();

    return handoffPath;
  }

  /**
   * TODO(human): Extract next objectives intelligently
   *
   * Analyze the current session to suggest 3-5 next objectives.
   *
   * Data sources to consider:
   * - memory.sessions[-1].objectives - What was planned but not completed?
   * - Git diff stats - What files have uncommitted changes suggesting unfinished work?
   * - memory.cumulativeContext.keyDecisions - Are there follow-up tasks from decisions?
   * - Unresolved test failures or build errors?
   * - Patterns in modified files (e.g., only tests updated = implementation pending)
   *
   * Return 3-5 objectives with:
   * - description: Clear, actionable task
   * - priority: 'high' | 'medium' | 'low'
   * - estimatedTokens: Optional estimate (use 30-50k for medium tasks)
   * - dependencies: Optional array of prerequisite task descriptions
   *
   * Example return:
   * [
   *   {
   *     description: "Complete implementation of auto-handoff service",
   *     priority: "high",
   *     estimatedTokens: 45000
   *   },
   *   {
   *     description: "Add tests for threshold-based triggers",
   *     priority: "medium",
   *     estimatedTokens: 30000,
   *     dependencies: ["Complete implementation of auto-handoff service"]
   *   }
   * ]
   */
  private async extractNextObjectives(
    _memory: ProjectMemory,
    _projectPath: string
  ): Promise<SessionObjective[]> {
    // TODO(human): Implement intelligent objective extraction

    // Placeholder implementation
    return [
      {
        description: 'Continue implementation from previous session',
        priority: 'high',
        estimatedTokens: 50000
      }
    ];
  }

  /**
   * Detect modified files from git
   */
  private detectModifiedFiles(): string[] {
    try {
      const output = execSync('git status --porcelain', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      return output
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3).trim());
    } catch {
      return [];
    }
  }

  /**
   * Get current git branch
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get last commit message
   */
  private getLastCommit(): string {
    try {
      return execSync('git log -1 --pretty=%B', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
    } catch {
      return '';
    }
  }

  /**
   * Get test status
   */
  private async getTestStatus(): Promise<string> {
    // Check if package.json has test script
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      if (pkg.scripts?.test) {
        return 'Run `npm test` to verify';
      }
    }
    return 'Unknown';
  }

  /**
   * Send notification
   */
  private sendNotification(
    title: string,
    message: string,
    urgency: 'normal' | 'high' | 'critical' = 'normal'
  ): void {
    if (process.platform === 'darwin') {
      const sound = urgency === 'critical' ? 'Basso' : 'Ping';
      const { exec } = require('child_process');
      exec(
        `osascript -e 'display notification "${message}" with title "${title}" sound name "${sound}"'`
      );
    }
  }
}