#!/usr/bin/env node

/**
 * Memory Stats Command
 * Display comprehensive statistics about project memory
 */

import * as path from 'path';
import * as process from 'process';
import chalk from 'chalk';
import { SessionMemoryManager } from '../session-memory.js';

interface StatsReport {
  totalSessions: number;
  totalTokens: number;
  avgTokensPerSession: number;
  totalDecisions: number;
  techStack: string[];
  dateRange: {
    first: Date;
    last: Date;
    durationDays: number;
  };
  topObjectives: { objective: string; count: number }[];
  filesModified: number;
  efficiency: {
    tokensPerTask: number;
    trend: 'improving' | 'declining' | 'stable';
  };
}

export class MemoryStats {
  constructor(private memoryManager: SessionMemoryManager) {}

  async getStats(projectPath: string): Promise<StatsReport> {
    const memory = await this.memoryManager.loadProjectMemory(projectPath);

    if (memory.totalSessions === 0) {
      return {
        totalSessions: 0,
        totalTokens: 0,
        avgTokensPerSession: 0,
        totalDecisions: 0,
        techStack: [],
        dateRange: {
          first: new Date(),
          last: new Date(),
          durationDays: 0
        },
        topObjectives: [],
        filesModified: 0,
        efficiency: {
          tokensPerTask: 0,
          trend: 'stable'
        }
      };
    }

    // Calculate total tokens
    const totalTokens = memory.sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    const avgTokensPerSession = Math.round(totalTokens / memory.totalSessions);

    // Calculate date range
    const first = memory.createdAt;
    const last = memory.lastSessionAt;
    const durationDays = Math.ceil(
      (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count unique files modified
    const uniqueFiles = new Set<string>();
    memory.sessions.forEach(s => {
      s.filesModified.forEach(f => uniqueFiles.add(f));
    });

    // Extract and count objectives
    const objectiveMap = new Map<string, number>();
    memory.sessions.forEach(session => {
      session.objectives.forEach(obj => {
        const normalized = obj.toLowerCase().trim();
        objectiveMap.set(normalized, (objectiveMap.get(normalized) || 0) + 1);
      });
    });

    // Get top 5 objectives
    const topObjectives = Array.from(objectiveMap.entries())
      .map(([objective, count]) => ({ objective, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate efficiency trend
    const totalTasks = memory.sessions.reduce((sum, s) => sum + s.completedTasks.length, 0);
    const tokensPerTask = totalTasks > 0 ? Math.round(totalTokens / totalTasks) : 0;

    // Calculate trend (compare recent 3 sessions to earlier sessions)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (memory.sessions.length >= 4) {
      const recentSessions = memory.sessions.slice(-3);
      const earlierSessions = memory.sessions.slice(0, -3);

      const recentTokensPerTask = this.calculateTokensPerTask(recentSessions);
      const earlierTokensPerTask = this.calculateTokensPerTask(earlierSessions);

      if (recentTokensPerTask < earlierTokensPerTask * 0.9) {
        trend = 'improving';
      } else if (recentTokensPerTask > earlierTokensPerTask * 1.1) {
        trend = 'declining';
      }
    }

    return {
      totalSessions: memory.totalSessions,
      totalTokens,
      avgTokensPerSession,
      totalDecisions: memory.cumulativeContext.keyDecisions.length,
      techStack: memory.cumulativeContext.techStack,
      dateRange: {
        first,
        last,
        durationDays
      },
      topObjectives,
      filesModified: uniqueFiles.size,
      efficiency: {
        tokensPerTask,
        trend
      }
    };
  }

  private calculateTokensPerTask(sessions: any[]): number {
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    const totalTasks = sessions.reduce((sum, s) => sum + s.completedTasks.length, 0);
    return totalTasks > 0 ? totalTokens / totalTasks : 0;
  }

  formatOutput(stats: StatsReport, projectName: string): string {
    let output = '\n';
    output += chalk.bold.blue('📊 Memory Statistics') + chalk.gray(` - ${projectName}`) + '\n';
    output += chalk.gray('═'.repeat(80)) + '\n\n';

    if (stats.totalSessions === 0) {
      output += chalk.yellow('⚠️  No sessions recorded yet\n');
      output += chalk.gray('Run your first session to start building memory!\n\n');
      return output;
    }

    // Overview section
    output += chalk.bold('📈 Overview\n');
    output += `  Sessions:      ${chalk.cyan(stats.totalSessions)} total\n`;
    output += `  Tokens:        ${chalk.cyan(stats.totalTokens.toLocaleString())} total `;
    output += chalk.gray(`(avg ${stats.avgTokensPerSession.toLocaleString()} per session)`) + '\n';
    output += `  Decisions:     ${chalk.cyan(stats.totalDecisions)} total\n`;
    output += `  Files:         ${chalk.cyan(stats.filesModified)} unique files modified\n`;
    output += '\n';

    // Date range
    output += chalk.bold('📅 Timeline\n');
    output += `  First Session: ${chalk.cyan(stats.dateRange.first.toLocaleDateString())}\n`;
    output += `  Last Session:  ${chalk.cyan(stats.dateRange.last.toLocaleDateString())}\n`;
    output += `  Duration:      ${chalk.cyan(stats.dateRange.durationDays)} days\n`;
    output += '\n';

    // Tech stack
    output += chalk.bold('🛠  Tech Stack\n');
    if (stats.techStack.length > 0) {
      stats.techStack.forEach(tech => {
        output += `  • ${chalk.cyan(tech)}\n`;
      });
    } else {
      output += chalk.gray('  Detecting...\n');
    }
    output += '\n';

    // Top objectives
    output += chalk.bold('🎯 Top Objectives\n');
    if (stats.topObjectives.length > 0) {
      stats.topObjectives.forEach((obj, i) => {
        const badge = obj.count > 1 ? chalk.gray(` (${obj.count} sessions)`) : '';
        output += `  ${i + 1}. ${chalk.cyan(obj.objective)}${badge}\n`;
      });
    } else {
      output += chalk.gray('  No objectives recorded\n');
    }
    output += '\n';

    // Efficiency
    output += chalk.bold('⚡ Efficiency\n');
    output += `  Tokens/Task:   ${chalk.cyan(stats.efficiency.tokensPerTask.toLocaleString())}\n`;

    const trendIcon = {
      improving: chalk.green('↗️  Improving'),
      declining: chalk.red('↘️  Declining'),
      stable: chalk.yellow('→  Stable')
    }[stats.efficiency.trend];
    output += `  Trend:         ${trendIcon}\n`;
    output += '\n';

    return output;
  }

  formatJson(stats: StatsReport, projectName: string): string {
    return JSON.stringify({ projectName, ...stats }, null, 2);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  // Get project path (current directory by default)
  let projectPath = process.cwd();
  const pathArg = args.find(arg => !arg.startsWith('--'));
  if (pathArg) {
    projectPath = path.resolve(pathArg);
  }

  const projectName = path.basename(projectPath);
  const memoryManager = new SessionMemoryManager();
  const stats = new MemoryStats(memoryManager);

  try {
    const report = await stats.getStats(projectPath);

    if (jsonMode) {
      console.log(stats.formatJson(report, projectName));
    } else {
      console.log(stats.formatOutput(report, projectName));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('❌ Error:'), error.message);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
