#!/usr/bin/env node

/**
 * /context-status Command
 * Display detailed context window analysis
 */

import { ContextTracker } from '../context-tracker.js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

interface SessionTimeInfo {
  display: string;
  percentUsed: number;
  minutesRemaining: number;
}

/**
 * Get 5-hour session time remaining from Claude Code's actual session data
 */
function getSessionTimeRemaining(): SessionTimeInfo | null {
  try {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    let cwd = process.cwd();

    // Collect all possible project directories (current + parents)
    const projectDirs: string[] = [];
    const maxLevels = 3;

    for (let level = 0; level < maxLevels; level++) {
      // Convert path: replace slashes/spaces/tildes with hyphens
      const projectKey = cwd.replace(/\//g, '-').replace(/\s+/g, '-').replace(/~/g, '-');
      const testDir = path.join(home, '.claude', 'projects', projectKey);

      if (fs.existsSync(testDir)) {
        projectDirs.push(testDir);
      }

      // Go up one level
      const parent = path.dirname(cwd);
      if (parent === cwd) break; // Reached root
      cwd = parent;
    }

    if (projectDirs.length === 0) {
      return null;
    }

    // Find the most recent session file across ALL project directories
    let mostRecentSession: { file: string; mtime: Date } | null = null;

    for (const projectDir of projectDirs) {
      const sessionFiles = fs.readdirSync(projectDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
          file: path.join(projectDir, f),
          mtime: fs.statSync(path.join(projectDir, f)).mtime
        }));

      for (const session of sessionFiles) {
        if (!mostRecentSession || session.mtime > mostRecentSession.mtime) {
          mostRecentSession = session;
        }
      }
    }

    if (!mostRecentSession) {
      return null;
    }

    const sessionContent = fs.readFileSync(mostRecentSession.file, 'utf-8');

    // Find first user message to get session start time
    const lines = sessionContent.split('\n').filter(l => l.trim());
    let startTime: Date | null = null;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.type === 'user' && data.timestamp) {
          startTime = new Date(data.timestamp);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!startTime) {
      return null;
    }

    const now = new Date();
    const elapsedMs = now.getTime() - startTime.getTime();
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    const remainingMs = fiveHoursMs - elapsedMs;

    // Calculate time components
    const minutesRemaining = Math.max(0, Math.floor(remainingMs / (60 * 1000)));
    const hoursRemaining = Math.floor(minutesRemaining / 60);
    const minsOnly = minutesRemaining % 60;

    // Calculate percent used
    const percentUsed = Math.min(100, (elapsedMs / fiveHoursMs) * 100);

    // Format display string
    let display: string;
    if (remainingMs <= 0) {
      display = chalk.red('Session expired (5h limit reached)');
    } else if (hoursRemaining > 0) {
      display = `${hoursRemaining}h ${minsOnly}m remaining of 5h session`;
    } else {
      display = `${minsOnly}m remaining of 5h session`;
    }

    return {
      display,
      percentUsed,
      minutesRemaining
    };
  } catch (error) {
    // Session tracking not found or error reading
    return null;
  }
}

async function main() {
  try {
    const contextTracker = new ContextTracker();
    const usage = await contextTracker.estimateCurrentContext();

    console.log('');
    console.log(chalk.bold.cyan('📝 Context Window Analysis'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    // Usage Summary
    console.log(chalk.bold.cyan('📊 USAGE SUMMARY'));
    console.log(chalk.gray('━'.repeat(80)));

    const totalTokens = usage.totalTokens.toLocaleString();
    const limit = '180,000';
    const percent = usage.percentUsed.toFixed(1);
    const remaining = (180000 - usage.totalTokens).toLocaleString();

    console.log(`Total Context:    ${totalTokens} / ${limit} tokens`);
    console.log(`Percentage:       ${percent}% used`);

    // 5-Hour Session Time Remaining
    const sessionTimeRemaining = getSessionTimeRemaining();
    if (sessionTimeRemaining) {
      console.log(`Session Time:     ${sessionTimeRemaining.display}`);

      // Session time bar
      const sessionBarWidth = 60;
      const sessionFilled = Math.round((sessionTimeRemaining.percentUsed / 100) * sessionBarWidth);
      const sessionEmpty = sessionBarWidth - sessionFilled;

      let sessionBarColor = chalk.green;
      if (sessionTimeRemaining.percentUsed >= 90) sessionBarColor = chalk.red;
      else if (sessionTimeRemaining.percentUsed >= 80) sessionBarColor = chalk.yellow;
      else if (sessionTimeRemaining.percentUsed >= 60) sessionBarColor = chalk.blue;

      const sessionBar = '█'.repeat(sessionFilled) + '░'.repeat(sessionEmpty);
      console.log(`Session Progress: ${sessionBarColor(sessionBar)} ${sessionTimeRemaining.percentUsed.toFixed(1)}%`);
    }

    // Status with emoji and color
    let statusDisplay = '';
    switch (usage.status) {
      case 'fresh':
        statusDisplay = chalk.green('🟢 FRESH - Just started');
        break;
      case 'healthy':
        statusDisplay = chalk.green('🟢 HEALTHY - Normal operation');
        break;
      case 'moderate':
        statusDisplay = chalk.blue('🔵 MODERATE - Active session');
        break;
      case 'warning':
        statusDisplay = chalk.yellow('🟡 WARNING - Monitor usage');
        break;
      case 'danger':
        statusDisplay = chalk.red('🟠 DANGER - Consider compaction');
        break;
      case 'critical':
        statusDisplay = chalk.red.bold('🔴 CRITICAL - Compact or restart!');
        break;
    }

    console.log(`Status:           ${statusDisplay}`);
    console.log(`Remaining:        ${remaining} tokens (~${usage.estimatedHoursRemaining.toFixed(1)} hours)`);
    console.log('');

    // Context Breakdown
    console.log(chalk.bold.cyan('📁 CONTEXT BREAKDOWN'));
    console.log(chalk.gray('━'.repeat(80)));

    const breakdown = usage.breakdown;
    const total = usage.totalTokens;

    const formatBreakdown = (label: string, tokens: number) => {
      const percent = total > 0 ? Math.round((tokens / total) * 100) : 0;
      const tokensStr = tokens.toLocaleString().padStart(10);
      const percentStr = `${percent}%`.padStart(5);
      return `${label.padEnd(20)} ${tokensStr} tokens  (${percentStr})`;
    };

    console.log(formatBreakdown('System Prompt:', breakdown.systemPrompt));
    console.log(formatBreakdown('File Reads:', breakdown.fileReads));
    console.log(formatBreakdown('Tool Results:', breakdown.toolResults));
    console.log(formatBreakdown('Conversation:', breakdown.conversation));
    console.log(formatBreakdown('Code Generated:', breakdown.codeGenerated));
    console.log('');

    // Usage bar
    const barWidth = 60;
    const filled = Math.round((usage.percentUsed / 100) * barWidth);
    const empty = barWidth - filled;

    let barColor = chalk.green;
    if (usage.percentUsed >= 90) barColor = chalk.red;
    else if (usage.percentUsed >= 80) barColor = chalk.yellow;
    else if (usage.percentUsed >= 50) barColor = chalk.blue;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    console.log(`Progress:         ${barColor(bar)} ${percent}%`);
    console.log('');

    // Compaction Opportunities
    if (usage.compactionOpportunities.length > 0) {
      console.log(chalk.bold.cyan('🧹 COMPACTION OPPORTUNITIES'));
      console.log(chalk.gray('━'.repeat(80)));

      let totalSavings = 0;

      usage.compactionOpportunities.forEach(opp => {
        const savings = opp.estimatedTokens.toLocaleString();
        console.log(`${chalk.yellow('•')} ${opp.description}`);
        console.log(`  ${chalk.gray(`Savings: ~${savings} tokens`)}`);
        totalSavings += opp.estimatedTokens;
      });

      console.log('');
      console.log(chalk.bold(`Total Potential Savings: ~${totalSavings.toLocaleString()} tokens`));
      console.log('');
    }

    // Recommendations
    console.log(chalk.bold.cyan('💡 RECOMMENDATIONS'));
    console.log(chalk.gray('━'.repeat(80)));

    if (usage.percentUsed >= 90) {
      console.log(chalk.red.bold('🚨 CRITICAL ACTION REQUIRED:'));
      console.log(chalk.red('   1. Run: ') + chalk.cyan('compact-context') + chalk.red(' immediately'));
      console.log(chalk.red('   2. Or: ') + chalk.cyan('save-and-restart') + chalk.red(' to start fresh'));
      console.log(chalk.red('   3. Save all work before context limit is reached'));
    } else if (usage.percentUsed >= 80) {
      console.log(chalk.yellow('⚠️  DANGER ZONE:'));
      console.log(chalk.yellow('   • Consider compaction: ') + chalk.cyan('compact-context'));
      console.log(chalk.yellow('   • Or plan restart: ') + chalk.cyan('save-and-restart'));
      console.log(chalk.yellow('   • Monitor usage closely'));
    } else if (usage.percentUsed >= 50) {
      console.log(chalk.blue('📊 Active session:'));
      console.log(chalk.blue('   • Context usage is moderate'));
      console.log(chalk.blue('   • Continue monitoring'));
      console.log(chalk.blue('   • Next checkpoint: 80% (144k tokens)'));
    } else if (usage.percentUsed >= 25) {
      console.log(chalk.green('✅ Context is healthy'));
      console.log(chalk.green('   • Normal operation'));
      console.log(chalk.green('   • Plenty of space remaining'));
      console.log(chalk.green('   • Next checkpoint: 50% (90k tokens)'));
    } else {
      console.log(chalk.green('✅ Context is fresh'));
      console.log(chalk.green('   • Excellent - just started'));
      console.log(chalk.green('   • Full context window available'));
      console.log(chalk.green('   • Next checkpoint: 25% (45k tokens)'));
    }

    console.log('');

    // Commands
    console.log(chalk.bold.cyan('⚡ AVAILABLE COMMANDS'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log(chalk.cyan('  compact-context     ') + chalk.gray('- Compact context to free up space'));
    console.log(chalk.cyan('  save-and-restart    ') + chalk.gray('- Create handoff and restart fresh'));
    console.log(chalk.cyan('  context-status      ') + chalk.gray('- Show this status (refresh)'));
    console.log('');

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    console.error(chalk.gray('\nMake sure context tracking is initialized.'));
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error);
  process.exit(1);
});
