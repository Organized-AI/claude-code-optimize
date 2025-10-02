#!/usr/bin/env node

/**
 * Memory Insights Generator
 * Actionable recommendations from session analytics
 */

import * as process from 'process';
import chalk from 'chalk';
import { SessionMemoryManager, ProjectMemory } from './session-memory.js';
import { MemoryAnalytics, AnalyticsReport } from './memory-analytics.js';

export type InsightType = 'success' | 'warning' | 'tip' | 'pattern';
export type InsightCategory = 'efficiency' | 'planning' | 'quality' | 'timing';
export type InsightImpact = 'high' | 'medium' | 'low';

export interface Insight {
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  recommendation?: string;
  impact: InsightImpact;
}

export class MemoryInsights {
  constructor(private memoryManager: SessionMemoryManager) {}

  async generate(projectPath: string): Promise<Insight[]> {
    const analytics = await new MemoryAnalytics(this.memoryManager).analyze(projectPath);
    const memory = await this.memoryManager.loadProjectMemory(projectPath);

    const insights: Insight[] = [];

    // Efficiency insights
    insights.push(...this.analyzeEfficiency(analytics, memory));

    // Planning insights
    insights.push(...this.analyzePlanning(analytics, memory));

    // Quality insights
    insights.push(...this.analyzeQuality(memory));

    // Timing insights
    insights.push(...this.analyzeTiming(analytics));

    // Remove duplicates and sort by impact
    const uniqueInsights = this.deduplicateInsights(insights);
    return uniqueInsights.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  private analyzeEfficiency(analytics: AnalyticsReport, memory: ProjectMemory): Insight[] {
    const insights: Insight[] = [];

    if (memory.sessions.length < 3) {
      return insights; // Need more data
    }

    // Check if efficiency is improving
    const efficiencyTrend = analytics.trends.efficiency;
    if (efficiencyTrend.length >= 2) {
      const recent = efficiencyTrend[efficiencyTrend.length - 1];
      if (recent.change < -10) {
        insights.push({
          type: 'success',
          category: 'efficiency',
          title: 'Efficiency Improving',
          description: `You're using ${Math.abs(recent.change).toFixed(0)}% fewer tokens per task than previous week`,
          recommendation: 'Keep following current patterns and workflows',
          impact: 'high'
        });
      } else if (recent.change > 10) {
        insights.push({
          type: 'warning',
          category: 'efficiency',
          title: 'Efficiency Declining',
          description: `Token usage per task increased ${recent.change.toFixed(0)}% from previous week`,
          recommendation: 'Review recent sessions for process improvements',
          impact: 'high'
        });
      }
    }

    // Check for high-token sessions
    const recentSessions = memory.sessions.slice(-3);
    const avgTokens = memory.sessions.reduce((sum, s) => sum + s.tokensUsed, 0) / memory.sessions.length;
    const recentHigh = recentSessions.some(s => s.tokensUsed > avgTokens * 1.5);

    if (recentHigh) {
      insights.push({
        type: 'warning',
        category: 'efficiency',
        title: 'Recent High Token Usage',
        description: 'Last sessions used 50% more tokens than average',
        recommendation: 'Consider breaking large sessions into smaller chunks',
        impact: 'medium'
      });
    }

    // Check for consistency
    const tokenVariance = this.calculateVariance(memory.sessions.map(s => s.tokensUsed));
    const avgVariance = avgTokens * 0.3; // 30% is considered stable

    if (tokenVariance < avgVariance) {
      insights.push({
        type: 'success',
        category: 'efficiency',
        title: 'Consistent Token Usage',
        description: 'Your sessions have predictable token consumption',
        recommendation: 'This consistency helps with planning and budgeting',
        impact: 'low'
      });
    }

    return insights;
  }

  private analyzePlanning(analytics: AnalyticsReport, memory: ProjectMemory): Insight[] {
    const insights: Insight[] = [];

    // Check if objectives are clear and specific
    const hasVagueObjectives = memory.sessions.some(session =>
      session.objectives.some(obj =>
        obj.length < 10 || obj.toLowerCase().includes('various') || obj.toLowerCase().includes('stuff')
      )
    );

    if (hasVagueObjectives) {
      insights.push({
        type: 'tip',
        category: 'planning',
        title: 'Objectives Could Be More Specific',
        description: 'Some sessions have vague objectives',
        recommendation: 'Use concrete, actionable objectives for better tracking',
        impact: 'medium'
      });
    }

    // Check session frequency
    const frequencyTrend = analytics.trends.sessionFrequency;
    if (frequencyTrend.length >= 2) {
      const recent = frequencyTrend[frequencyTrend.length - 1];
      if (recent.change > 50) {
        insights.push({
          type: 'pattern',
          category: 'planning',
          title: 'Increased Session Frequency',
          description: `Session frequency increased ${recent.change.toFixed(0)}%`,
          recommendation: 'High momentum detected - great for making progress!',
          impact: 'medium'
        });
      }
    }

    // Check for common patterns
    if (analytics.patterns.mostCommonObjectives.length > 0) {
      const topObjective = analytics.patterns.mostCommonObjectives[0];
      if (topObjective.count >= 3) {
        insights.push({
          type: 'pattern',
          category: 'planning',
          title: 'Recurring Focus Area',
          description: `"${topObjective.objective}" appears in ${topObjective.count} sessions`,
          recommendation: 'Consider creating templates or automation for this workflow',
          impact: 'medium'
        });
      }
    }

    return insights;
  }

  private analyzeQuality(memory: ProjectMemory): Insight[] {
    const insights: Insight[] = [];

    // Check if tests are mentioned
    const testMentions = memory.sessions.filter(s =>
      s.objectives.some(obj => obj.toLowerCase().includes('test')) ||
      s.completedTasks.some(task => task.toLowerCase().includes('test'))
    ).length;

    const testRatio = testMentions / memory.sessions.length;

    if (testRatio > 0.7) {
      insights.push({
        type: 'success',
        category: 'quality',
        title: 'Strong Testing Practice',
        description: `${(testRatio * 100).toFixed(0)}% of sessions include testing`,
        recommendation: 'Great job maintaining test coverage!',
        impact: 'high'
      });
    } else if (testRatio < 0.3) {
      insights.push({
        type: 'warning',
        category: 'quality',
        title: 'Limited Testing Coverage',
        description: 'Only ${(testRatio * 100).toFixed(0)}% of sessions mention testing',
        recommendation: 'Consider adding tests to your regular workflow',
        impact: 'high'
      });
    }

    // Check documentation
    const docMentions = memory.sessions.filter(s =>
      s.completedTasks.some(task =>
        task.toLowerCase().includes('doc') ||
        task.toLowerCase().includes('readme') ||
        task.toLowerCase().includes('comment')
      )
    ).length;

    if (docMentions >= 5) {
      insights.push({
        type: 'success',
        category: 'quality',
        title: 'Documentation Streak',
        description: `Documentation updates in ${docMentions} sessions`,
        recommendation: 'Great practice - keep it up!',
        impact: 'low'
      });
    }

    // Check for decision tracking
    if (memory.cumulativeContext.keyDecisions.length > memory.sessions.length * 2) {
      insights.push({
        type: 'success',
        category: 'quality',
        title: 'Excellent Decision Tracking',
        description: `${memory.cumulativeContext.keyDecisions.length} decisions recorded across ${memory.sessions.length} sessions`,
        recommendation: 'This will be invaluable for future reference',
        impact: 'medium'
      });
    }

    return insights;
  }

  private analyzeTiming(analytics: AnalyticsReport): Insight[] {
    const insights: Insight[] = [];

    // Peak productivity insight
    if (analytics.patterns.peakProductivityTime) {
      const peak = analytics.patterns.peakProductivityTime;
      const timeStr = peak.hour < 12 ? `${peak.hour} AM` : peak.hour === 12 ? '12 PM' : `${peak.hour - 12} PM`;

      insights.push({
        type: 'pattern',
        category: 'timing',
        title: 'Peak Productivity Pattern Detected',
        description: `You're most productive on ${peak.day} at ${timeStr}`,
        recommendation: `Schedule complex tasks for ${peak.day} ${timeStr}`,
        impact: 'medium'
      });
    }

    // Burn rate warning
    if (analytics.predictions.burnRate > 150000) {
      insights.push({
        type: 'warning',
        category: 'timing',
        title: 'High Burn Rate',
        description: `Current rate: ${(analytics.predictions.burnRate / 1000).toFixed(0)}k tokens/day`,
        recommendation: 'Monitor quota usage to avoid hitting limits',
        impact: 'high'
      });
    } else if (analytics.predictions.burnRate > 0 && analytics.predictions.burnRate < 50000) {
      insights.push({
        type: 'tip',
        category: 'timing',
        title: 'Low Burn Rate',
        description: `Current rate: ${(analytics.predictions.burnRate / 1000).toFixed(0)}k tokens/day`,
        recommendation: 'You have room to increase session frequency if needed',
        impact: 'low'
      });
    }

    return insights;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const avg = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length);
  }

  private deduplicateInsights(insights: Insight[]): Insight[] {
    const seen = new Set<string>();
    return insights.filter(insight => {
      const key = `${insight.category}-${insight.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  formatOutput(insights: Insight[]): string {
    let output = '\n';
    output += chalk.bold.blue('💡 Insights & Recommendations') + '\n';
    output += chalk.gray('═'.repeat(80)) + '\n\n';

    if (insights.length === 0) {
      output += chalk.yellow('⚠️  Not enough data for insights yet\n');
      output += chalk.gray('Run more sessions to get personalized recommendations\n\n');
      return output;
    }

    // Group by impact
    const byImpact = {
      high: insights.filter(i => i.impact === 'high'),
      medium: insights.filter(i => i.impact === 'medium'),
      low: insights.filter(i => i.impact === 'low')
    };

    // High impact
    if (byImpact.high.length > 0) {
      output += chalk.bold('🔴 HIGH IMPACT\n\n');
      byImpact.high.forEach(insight => {
        output += this.formatInsight(insight);
      });
      output += '\n';
    }

    // Medium impact
    if (byImpact.medium.length > 0) {
      output += chalk.bold('🟡 MEDIUM IMPACT\n\n');
      byImpact.medium.forEach(insight => {
        output += this.formatInsight(insight);
      });
      output += '\n';
    }

    // Low impact
    if (byImpact.low.length > 0) {
      output += chalk.bold('🟢 LOW IMPACT\n\n');
      byImpact.low.forEach(insight => {
        output += this.formatInsight(insight);
      });
      output += '\n';
    }

    return output;
  }

  private formatInsight(insight: Insight): string {
    const icons = {
      success: '✅',
      warning: '⚠️',
      tip: '💡',
      pattern: '🔍'
    };

    let output = `  ${icons[insight.type]} ${chalk.bold(insight.title)}\n`;
    output += `     ${insight.description}\n`;
    if (insight.recommendation) {
      output += chalk.gray(`     → ${insight.recommendation}\n`);
    }
    output += '\n';

    return output;
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  const categoryArg = args.indexOf('--category');
  const topArg = args.indexOf('--top');
  const jsonMode = args.includes('--json');

  const category = categoryArg !== -1 ? args[categoryArg + 1] as InsightCategory : undefined;
  const topN = topArg !== -1 ? parseInt(args[topArg + 1], 10) : undefined;

  // Get project path
  const projectPath = process.cwd();
  const memoryManager = new SessionMemoryManager();
  const insights = new MemoryInsights(memoryManager);

  try {
    let results = await insights.generate(projectPath);

    // Filter by category
    if (category) {
      results = results.filter(i => i.category === category);
    }

    // Limit to top N
    if (topN) {
      results = results.slice(0, topN);
    }

    if (jsonMode) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(insights.formatOutput(results));
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
