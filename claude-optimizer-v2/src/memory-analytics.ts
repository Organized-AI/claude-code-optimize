#!/usr/bin/env node

/**
 * Memory Analytics Engine
 * Trends, patterns, and predictions from session memory
 */

import * as process from 'process';
import chalk from 'chalk';
import { SessionMemoryManager, SessionHistory, ProjectMemory } from './session-memory.js';

export interface TrendData {
  period: string;
  value: number;
  change: number;
}

export interface AnalyticsReport {
  trends: {
    tokenUsage: TrendData[];
    sessionFrequency: TrendData[];
    efficiency: TrendData[];
  };
  patterns: {
    mostCommonObjectives: { objective: string; count: number }[];
    peakProductivityTime: { day: string; hour: number; avgTokens: number } | null;
    techStackChanges: { date: Date; added: string[]; removed: string[] }[];
  };
  performance: {
    fastestSessions: SessionHistory[];
    mostEfficientSessions: SessionHistory[];
    highestTokenSessions: SessionHistory[];
  };
  predictions: {
    nextSessionTokens: { low: number; mid: number; high: number };
    burnRate: number;
    quotaExhaustion: Date | null;
  };
}

export class MemoryAnalytics {
  constructor(private memoryManager: SessionMemoryManager) {}

  async analyze(projectPath: string): Promise<AnalyticsReport> {
    const memory = await this.memoryManager.loadProjectMemory(projectPath);

    // Calculate trends
    const trends = await this.calculateTrends(memory);

    // Detect patterns
    const patterns = this.detectPatterns(memory);

    // Performance metrics
    const performance = this.analyzePerformance(memory);

    // Predictions
    const predictions = this.generatePredictions(memory);

    return { trends, patterns, performance, predictions };
  }

  private async calculateTrends(
    memory: ProjectMemory
  ): Promise<AnalyticsReport['trends']> {
    // Group sessions by week
    const weeklyGroups = this.groupByWeek(memory.sessions);
    const tokenUsage: TrendData[] = [];
    const sessionFrequency: TrendData[] = [];
    const efficiency: TrendData[] = [];

    let prevTokens = 0;
    let prevSessions = 0;
    let prevEfficiency = 0;

    for (const [week, sessions] of weeklyGroups) {
      const totalTokens = sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
      const totalTasks = sessions.reduce((sum, s) => sum + s.completedTasks.length, 0);
      const tokensPerTask = totalTasks > 0 ? totalTokens / totalTasks : 0;

      tokenUsage.push({
        period: week,
        value: totalTokens,
        change: prevTokens > 0 ? ((totalTokens - prevTokens) / prevTokens) * 100 : 0
      });

      sessionFrequency.push({
        period: week,
        value: sessions.length,
        change: prevSessions > 0 ? ((sessions.length - prevSessions) / prevSessions) * 100 : 0
      });

      efficiency.push({
        period: week,
        value: Math.round(tokensPerTask),
        change: prevEfficiency > 0 ? ((tokensPerTask - prevEfficiency) / prevEfficiency) * 100 : 0
      });

      prevTokens = totalTokens;
      prevSessions = sessions.length;
      prevEfficiency = tokensPerTask;
    }

    return { tokenUsage, sessionFrequency, efficiency };
  }

  private groupByWeek(sessions: SessionHistory[]): Map<string, SessionHistory[]> {
    const groups = new Map<string, SessionHistory[]>();

    sessions.forEach(session => {
      const date = new Date(session.startTime);
      const week = this.getWeekIdentifier(date);

      if (!groups.has(week)) {
        groups.set(week, []);
      }
      groups.get(week)!.push(session);
    });

    return groups;
  }

  private getWeekIdentifier(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekNum = Math.ceil(day / 7);
    return `${year}-${String(month).padStart(2, '0')}-W${weekNum}`;
  }

  private detectPatterns(memory: ProjectMemory): AnalyticsReport['patterns'] {
    // Most common objectives
    const objectiveMap = new Map<string, number>();
    memory.sessions.forEach(session => {
      session.objectives.forEach(obj => {
        const normalized = obj.toLowerCase().trim();
        objectiveMap.set(normalized, (objectiveMap.get(normalized) || 0) + 1);
      });
    });

    const mostCommonObjectives = Array.from(objectiveMap.entries())
      .map(([objective, count]) => ({ objective, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Peak productivity time
    const peakProductivityTime = this.findPeakProductivityTime(memory.sessions);

    // Tech stack changes (not implemented yet)
    const techStackChanges: any[] = [];

    return {
      mostCommonObjectives,
      peakProductivityTime,
      techStackChanges
    };
  }

  private findPeakProductivityTime(sessions: SessionHistory[]): { day: string; hour: number; avgTokens: number } | null {
    if (sessions.length === 0) return null;

    const timeMap = new Map<string, { totalTokens: number; count: number }>();

    sessions.forEach(session => {
      const date = new Date(session.startTime);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      const key = `${day}-${hour}`;

      if (!timeMap.has(key)) {
        timeMap.set(key, { totalTokens: 0, count: 0 });
      }

      const entry = timeMap.get(key)!;
      entry.totalTokens += session.tokensUsed;
      entry.count += 1;
    });

    let maxAvg = 0;
    let bestTime = { day: '', hour: 0, avgTokens: 0 };

    for (const [key, data] of timeMap.entries()) {
      const avg = data.totalTokens / data.count;
      if (avg > maxAvg) {
        maxAvg = avg;
        const [day, hourStr] = key.split('-');
        bestTime = { day, hour: parseInt(hourStr), avgTokens: Math.round(avg) };
      }
    }

    return maxAvg > 0 ? bestTime : null;
  }

  private analyzePerformance(memory: ProjectMemory): AnalyticsReport['performance'] {
    const sessions = [...memory.sessions];

    // Calculate duration for each session
    const sessionsWithDuration = sessions.map(s => {
      const duration = s.endTime
        ? new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
        : 0;
      const tokensPerTask = s.completedTasks.length > 0 ? s.tokensUsed / s.completedTasks.length : 0;
      return { ...s, duration, tokensPerTask };
    });

    // Fastest sessions (shortest duration)
    const fastestSessions = sessionsWithDuration
      .filter(s => s.duration > 0)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 5)
      .map(({ duration, tokensPerTask, ...session }) => session);

    // Most efficient sessions (lowest tokens per task)
    const mostEfficientSessions = sessionsWithDuration
      .filter(s => s.tokensPerTask > 0)
      .sort((a, b) => a.tokensPerTask - b.tokensPerTask)
      .slice(0, 5)
      .map(({ duration, tokensPerTask, ...session }) => session);

    // Highest token sessions
    const highestTokenSessions = sessions
      .sort((a, b) => b.tokensUsed - a.tokensUsed)
      .slice(0, 5);

    return {
      fastestSessions,
      mostEfficientSessions,
      highestTokenSessions
    };
  }

  private generatePredictions(memory: ProjectMemory): AnalyticsReport['predictions'] {
    const sessions = memory.sessions;

    if (sessions.length === 0) {
      return {
        nextSessionTokens: { low: 0, mid: 0, high: 0 },
        burnRate: 0,
        quotaExhaustion: null
      };
    }

    // Use recent 5 sessions for prediction
    const recentSessions = sessions.slice(-5);
    const recentTokens = recentSessions.map(s => s.tokensUsed);

    // Simple linear regression
    const avg = recentTokens.reduce((sum, t) => sum + t, 0) / recentTokens.length;
    const stdDev = Math.sqrt(
      recentTokens.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / recentTokens.length
    );

    const nextSessionTokens = {
      low: Math.round(Math.max(0, avg - stdDev)),
      mid: Math.round(avg),
      high: Math.round(avg + stdDev)
    };

    // Calculate burn rate (tokens per day)
    const firstSession = new Date(sessions[0].startTime);
    const lastSession = new Date(sessions[sessions.length - 1].startTime);
    const daysDiff = (lastSession.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24);
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    const burnRate = daysDiff > 0 ? Math.round(totalTokens / daysDiff) : 0;

    // Quota exhaustion (assuming 200k daily Pro quota)
    const quotaExhaustion = null; // Always null as quota resets

    return {
      nextSessionTokens,
      burnRate,
      quotaExhaustion
    };
  }

  formatOutput(report: AnalyticsReport): string {
    let output = '\n';
    output += chalk.bold.blue('📈 Analytics Report') + '\n';
    output += chalk.gray('═'.repeat(80)) + '\n\n';

    // Trends
    output += chalk.bold('📊 TRENDS\n\n');

    output += chalk.cyan('  Token Usage:\n');
    if (report.trends.tokenUsage.length > 0) {
      report.trends.tokenUsage.forEach(trend => {
        const arrow = trend.change > 0 ? chalk.green('⬆') : trend.change < 0 ? chalk.red('⬇') : chalk.yellow('→');
        const changeStr = trend.change !== 0 ? ` (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}% ${arrow})` : '';
        output += `    ${trend.period}: ${chalk.cyan(trend.value.toLocaleString())} tokens${chalk.gray(changeStr)}\n`;
      });
    } else {
      output += chalk.gray('    No data yet\n');
    }
    output += '\n';

    output += chalk.cyan('  Session Frequency:\n');
    if (report.trends.sessionFrequency.length > 0) {
      report.trends.sessionFrequency.forEach(trend => {
        const arrow = trend.change > 0 ? chalk.green('⬆') : trend.change < 0 ? chalk.red('⬇') : chalk.yellow('→');
        const changeStr = trend.change !== 0 ? ` (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}% ${arrow})` : '';
        output += `    ${trend.period}: ${chalk.cyan(trend.value)} sessions${chalk.gray(changeStr)}\n`;
      });
    } else {
      output += chalk.gray('    No data yet\n');
    }
    output += '\n';

    // Patterns
    output += chalk.bold('🔍 PATTERNS\n\n');

    output += chalk.cyan('  Most Common Objectives:\n');
    if (report.patterns.mostCommonObjectives.length > 0) {
      report.patterns.mostCommonObjectives.forEach((obj, i) => {
        const badge = obj.count > 1 ? chalk.gray(` (${obj.count} times)`) : '';
        output += `    ${i + 1}. ${obj.objective}${badge}\n`;
      });
    } else {
      output += chalk.gray('    No patterns detected\n');
    }
    output += '\n';

    if (report.patterns.peakProductivityTime) {
      output += chalk.cyan('  Peak Productivity:\n');
      const peak = report.patterns.peakProductivityTime;
      const timeStr = peak.hour < 12 ? `${peak.hour} AM` : peak.hour === 12 ? '12 PM' : `${peak.hour - 12} PM`;
      output += `    ${chalk.cyan(peak.day)} at ${chalk.cyan(timeStr)} (avg ${chalk.cyan(peak.avgTokens.toLocaleString())} tokens)\n`;
      output += '\n';
    }

    // Predictions
    output += chalk.bold('🔮 PREDICTIONS\n\n');

    output += chalk.cyan('  Next Session:\n');
    output += `    Low:  ${chalk.cyan(report.predictions.nextSessionTokens.low.toLocaleString())} tokens\n`;
    output += `    Mid:  ${chalk.cyan(report.predictions.nextSessionTokens.mid.toLocaleString())} tokens\n`;
    output += `    High: ${chalk.cyan(report.predictions.nextSessionTokens.high.toLocaleString())} tokens\n`;
    output += '\n';

    output += chalk.cyan('  Burn Rate:\n');
    output += `    ${chalk.cyan(report.predictions.burnRate.toLocaleString())} tokens/day\n`;
    output += '\n';

    return output;
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  const jsonMode = args.includes('--json');

  // Get project path
  const projectPath = process.cwd();
  const memoryManager = new SessionMemoryManager();
  const analytics = new MemoryAnalytics(memoryManager);

  try {
    const report = await analytics.analyze(projectPath);

    if (jsonMode) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(analytics.formatOutput(report));
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
