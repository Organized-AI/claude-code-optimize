#!/usr/bin/env node

/**
 * /save-and-restart Command
 * Create handoff file for clean session restart
 * Triggered when context window is too full
 */

import * as readline from 'readline';
import * as path from 'path';
import { HandoffManager } from '../handoff-manager.js';
import { ContextTracker } from '../context-tracker.js';
import { QuotaTracker } from '../quota-tracker.js';
import type { SessionObjective } from '../types/handoff.js';
import chalk from 'chalk';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => rl.question(prompt, resolve));
};

async function main() {
  try {
    console.log('');
    console.log(chalk.bold.cyan('💾 Save and Restart Session'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    console.log(chalk.yellow('This will create a handoff file to preserve context,'));
    console.log(chalk.yellow('allowing you to restart with a fresh context window.'));
    console.log('');

    // Get current status
    const contextTracker = new ContextTracker();
    const quotaTracker = new QuotaTracker();

    const contextUsage = await contextTracker.estimateCurrentContext();
    const quotaStatus = quotaTracker.getStatus();

    console.log(chalk.bold('📊 Current Session Status'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`Context Usage:    ${contextUsage.totalTokens.toLocaleString()} / 180,000 tokens (${contextUsage.percentUsed.toFixed(1)}%)`);
    console.log(`Quota Usage:      ${quotaStatus.used.toLocaleString()} / ${quotaStatus.limit.toLocaleString()} tokens (${quotaStatus.percent}%)`);
    console.log('');

    // Context status
    if (contextUsage.percentUsed >= 90) {
      console.log(chalk.red('🔴 Context is CRITICAL - Restart strongly recommended'));
    } else if (contextUsage.percentUsed >= 80) {
      console.log(chalk.yellow('⚠️  Context is in DANGER zone - Restart recommended'));
    } else if (quotaStatus.percent >= 80) {
      console.log(chalk.yellow('⚠️  Quota is running low - Good time to restart'));
    } else {
      console.log(chalk.blue('💡 Context and quota are healthy, but restart is always an option'));
    }

    console.log('');
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    // Gather project info
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    console.log(`📁 Project: ${chalk.bold(projectName)}`);
    console.log(`📂 Path: ${chalk.gray(projectPath)}`);
    console.log('');

    // Gather accomplishments
    console.log(chalk.bold('📋 What did you accomplish in this session?'));
    console.log(chalk.gray('   (Enter one per line, empty line to finish)'));
    console.log('');

    const accomplishments: string[] = [];
    let i = 1;
    while (true) {
      const item = await question(`   ${i}> `);
      if (!item.trim()) break;
      accomplishments.push(item.trim());
      i++;
    }

    if (accomplishments.length === 0) {
      console.log(chalk.gray('   No accomplishments entered.'));
      accomplishments.push('Session in progress');
    }

    // Current state
    console.log('');
    console.log(chalk.bold('📋 Current State'));
    console.log('');

    const branch = await question('   Git branch (or press enter): ');
    const lastCommit = await question('   Last commit message (or press enter): ');
    const testsStatus = await question('   Test status (e.g., "15/15 passing", or press enter): ');

    // Next objectives
    console.log('');
    console.log(chalk.bold('📋 What should the next session focus on?'));
    console.log(chalk.gray('   (Enter objectives, empty line to finish)'));
    console.log('');

    const objectives: SessionObjective[] = [];
    let j = 1;
    while (j <= 6) {
      const desc = await question(`   ${j}> `);
      if (!desc.trim()) break;

      const estimateStr = await question(`      Est. tokens? (optional, press enter to skip): `);
      const estimate = estimateStr ? parseInt(estimateStr.replace(/,/g, '')) : undefined;

      objectives.push({
        description: desc.trim(),
        estimatedTokens: estimate,
        priority: j <= 2 ? 'high' : 'medium'
      });
      j++;
    }

    if (objectives.length === 0) {
      console.log(chalk.gray('   No objectives entered. Adding default.'));
      objectives.push({
        description: 'Continue implementation from previous session',
        priority: 'high'
      });
    }

    // Total estimate
    let totalEstimate = objectives.reduce((sum, obj) => sum + (obj.estimatedTokens || 0), 0);

    if (totalEstimate === 0) {
      console.log('');
      const estimateStr = await question('   Estimated tokens for next session (default 50k): ');
      totalEstimate = estimateStr ? parseInt(estimateStr.replace(/,/g, '')) : 50000;
    }

    // Key decisions
    console.log('');
    console.log(chalk.bold('📋 Any key decisions or important context?'));
    console.log(chalk.gray('   (Enter one per line, empty line to finish)'));
    console.log('');

    const keyDecisions: string[] = [];
    let k = 1;
    while (true) {
      const decision = await question(`   ${k}> `);
      if (!decision.trim()) break;
      keyDecisions.push(decision.trim());
      k++;
    }

    // Blockers
    console.log('');
    const blockersInput = await question('   Any blockers or issues? (optional): ');
    const blockers = blockersInput.trim() ? [blockersInput.trim()] : [];

    // Additional notes
    console.log('');
    const notes = await question('   Additional notes? (optional): ');

    // Create handoff
    console.log('');
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');
    console.log(chalk.bold('✅ Creating handoff file...'));
    console.log('');

    const handoffManager = new HandoffManager();
    const handoffPath = await handoffManager.createHandoff({
      projectPath,
      projectName,
      agent: '.claude/agents/implementation.md',
      model: 'sonnet',
      accomplishments,
      currentState: {
        branch: branch || undefined,
        lastCommit: lastCommit || undefined,
        testsStatus: testsStatus || undefined
      },
      nextObjectives: objectives,
      estimatedTokens: totalEstimate,
      keyDecisions,
      blockers,
      notes: notes || 'Ready to proceed with fresh context!'
    });

    console.log(chalk.green('📄 Handoff file created successfully!'));
    console.log(`   ${chalk.cyan(handoffPath)}`);
    console.log('');

    // Quota info
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');
    console.log(chalk.bold('📅 Next Session Planning'));
    console.log('');

    if (quotaStatus.percent >= 80) {
      const resetTime = quotaStatus.resetTime;
      console.log(chalk.yellow(`   ⚠️  Current quota: ${quotaStatus.percent}% used`));
      console.log(chalk.yellow(`   Quota resets at: ${resetTime.toLocaleString()}`));
      console.log(chalk.yellow(`   Time until reset: ${quotaStatus.timeUntilReset}`));
      console.log('');
      console.log(chalk.yellow('   💡 Recommended: Wait for quota reset before starting next session'));
    } else {
      console.log(chalk.green('   ✅ Quota is healthy - can start new session immediately'));
      console.log(`   Remaining quota: ${quotaStatus.remaining.toLocaleString()} tokens`);
    }

    console.log('');

    // Check if next session fits
    const fitsQuota = totalEstimate <= quotaStatus.remaining;
    const percentOfQuota = Math.round((totalEstimate / quotaStatus.limit) * 100);

    console.log(`   Next session estimate: ${totalEstimate.toLocaleString()} tokens (${percentOfQuota}% of quota)`);

    if (fitsQuota) {
      console.log(chalk.green(`   ✅ Fits current quota`));
    } else {
      console.log(chalk.yellow(`   ⚠️  Exceeds remaining quota - wait for reset`));
    }

    console.log('');
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    // Instructions
    console.log(chalk.bold('💡 How to Restart'));
    console.log('');
    console.log('   1. Save and commit all work in this session');
    console.log('   2. Exit Claude (end this session)');

    if (quotaStatus.percent >= 80) {
      console.log(chalk.yellow('   3. Wait for quota reset'));
    }

    console.log('   ' + (quotaStatus.percent >= 80 ? '4' : '3') + '. Start new Claude session:');
    console.log(`      ${chalk.cyan(`cd ${projectPath}`)}`);
    console.log(`      ${chalk.cyan('claude')}`);
    console.log('   ' + (quotaStatus.percent >= 80 ? '5' : '4') + '. Load handoff context:');
    console.log(chalk.gray(`      "Read ${path.basename(handoffPath)} and continue from there"`));
    console.log('');

    // Reset context tracker for next session
    console.log(chalk.bold('🔄 Resetting context tracker...'));
    contextTracker.resetContext();
    console.log(chalk.green('   ✅ Context tracker reset'));
    console.log('');

    console.log(chalk.gray('─'.repeat(80)));
    console.log('');
    console.log(chalk.bold.green('✅ HANDOFF COMPLETE!'));
    console.log('');
    console.log(chalk.gray('You can now safely end this session.'));
    console.log(chalk.gray('The handoff file preserves all context for the next session.'));
    console.log('');

    rl.close();

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    rl.close();
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error);
  rl.close();
  process.exit(1);
});
