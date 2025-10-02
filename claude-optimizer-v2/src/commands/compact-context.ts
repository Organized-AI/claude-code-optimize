#!/usr/bin/env node

/**
 * /compact-context Command
 * Interactive context compaction with user confirmation
 */

import * as readline from 'readline';
import { ContextTracker } from '../context-tracker.js';
import { ContextCompactor, CompactionLevel } from '../context-compactor.js';
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
    console.log(chalk.bold.cyan('🧹 Context Compaction Tool'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    const contextTracker = new ContextTracker();
    const contextCompactor = new ContextCompactor();

    // Get current status
    const usage = await contextTracker.estimateCurrentContext();

    console.log(chalk.bold('📊 Current Status'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`Context Usage:    ${usage.totalTokens.toLocaleString()} / 180,000 tokens (${usage.percentUsed.toFixed(1)}%)`);

    let statusDisplay = '';
    switch (usage.status) {
      case 'fresh':
      case 'healthy':
        statusDisplay = chalk.green('🟢 HEALTHY');
        break;
      case 'moderate':
        statusDisplay = chalk.blue('🔵 MODERATE');
        break;
      case 'warning':
        statusDisplay = chalk.yellow('🟡 WARNING');
        break;
      case 'danger':
        statusDisplay = chalk.red('🟠 DANGER');
        break;
      case 'critical':
        statusDisplay = chalk.red.bold('🔴 CRITICAL');
        break;
    }

    console.log(`Status:           ${statusDisplay}`);
    console.log('');

    // Get recommendation
    const recommendation = await contextCompactor.getRecommendation(usage.totalTokens);

    if (!recommendation) {
      console.log(chalk.green('✅ Context is healthy - no compaction needed!'));
      console.log(chalk.gray('\nYou can still compact if you want to free up space.'));
      console.log('');
    } else {
      console.log(chalk.yellow(`💡 Recommended level: ${chalk.bold(recommendation.toUpperCase())}`));
      console.log('');
    }

    // Show compaction options
    console.log(chalk.bold('🎯 Compaction Levels'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    // Preview all levels
    console.log(chalk.cyan('1. SOFT COMPACTION') + chalk.gray(' (Conservative)'));
    console.log(chalk.gray('   • Remove old file reads (keep recent 10)'));
    console.log(chalk.gray('   • Deduplicate tool results (keep 5 per type)'));
    console.log(chalk.gray('   • Target: 10-20k token savings'));
    console.log('');

    console.log(chalk.yellow('2. STRATEGIC COMPACTION') + chalk.gray(' (Recommended)'));
    console.log(chalk.gray('   • Everything from SOFT, plus:'));
    console.log(chalk.gray('   • Trim verbose outputs'));
    console.log(chalk.gray('   • Reduce file reads to 5'));
    console.log(chalk.gray('   • Trim conversation history (50%)'));
    console.log(chalk.gray('   • Target: 30-50k token savings'));
    console.log('');

    console.log(chalk.red('3. EMERGENCY COMPACTION') + chalk.gray(' (Aggressive)'));
    console.log(chalk.gray('   • Everything from STRATEGIC, plus:'));
    console.log(chalk.gray('   • Keep only 3 file reads'));
    console.log(chalk.gray('   • Keep only 2 tool results per type'));
    console.log(chalk.gray('   • Drastically reduce history (25%)'));
    console.log(chalk.gray('   • Target: 60-80k token savings'));
    console.log('');

    console.log(chalk.gray('4. Cancel'));
    console.log('');

    // Get user choice
    const choice = await question(chalk.bold('Choose compaction level [1-4]: '));

    if (choice === '4' || !choice.trim()) {
      console.log(chalk.gray('\nCancelled. No changes made.\n'));
      rl.close();
      return;
    }

    let level: CompactionLevel;
    switch (choice) {
      case '1':
        level = 'soft';
        break;
      case '2':
        level = 'strategic';
        break;
      case '3':
        level = 'emergency';
        break;
      default:
        console.log(chalk.red('\n❌ Invalid choice. Cancelled.\n'));
        rl.close();
        return;
    }

    // Preview compaction
    console.log('');
    console.log(chalk.bold(`🔍 Previewing ${level.toUpperCase()} compaction...`));
    console.log('');

    const preview = await contextCompactor.previewCompaction(level);

    console.log(chalk.bold('📋 Compaction Plan'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`Before:           ${preview.beforeTokens.toLocaleString()} tokens`);
    console.log(`After:            ${preview.afterTokens.toLocaleString()} tokens`);
    console.log(`Savings:          ${chalk.green(preview.tokensSaved.toLocaleString() + ' tokens')}`);
    console.log(`Items removed:    ${preview.itemsRemoved}`);
    console.log(`Items preserved:  ${preview.itemsPreserved}`);
    console.log('');

    if (preview.removedItems.length > 0) {
      console.log(chalk.bold('🗑️  What will be removed:'));
      console.log(chalk.gray('─'.repeat(80)));

      preview.removedItems.forEach(item => {
        console.log(chalk.yellow(`• ${item.description}`));
        console.log(chalk.gray(`  Saves: ~${item.tokens.toLocaleString()} tokens`));
      });

      console.log('');
    }

    // Preservation rules
    console.log(chalk.bold('✅ What will be preserved:'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.green('• All current objectives and decisions'));
    console.log(chalk.green('• Recent file reads (most important context)'));
    console.log(chalk.green('• Current edits and code in progress'));
    console.log(chalk.green('• Error messages and debugging context'));
    console.log(chalk.green('• System prompt and instructions'));
    console.log('');

    // Confirmation
    const confirm = await question(chalk.bold.yellow('Proceed with compaction? [y/N]: '));

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log(chalk.gray('\nCancelled. No changes made.\n'));
      rl.close();
      return;
    }

    // Perform compaction
    console.log('');
    console.log(chalk.bold('🔄 Compacting context...'));
    console.log('');

    const result = await contextCompactor.compact(level);

    // Show results
    console.log(chalk.bold.green('✅ Compaction Complete!'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    console.log(chalk.bold('📊 Results'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`Before:           ${result.beforeTokens.toLocaleString()} tokens`);
    console.log(`After:            ${chalk.green(result.afterTokens.toLocaleString() + ' tokens')}`);
    console.log(`Savings:          ${chalk.bold.green(result.tokensSaved.toLocaleString() + ' tokens')}`);
    console.log(`Items removed:    ${result.itemsRemoved}`);
    console.log(`Items preserved:  ${result.itemsPreserved}`);
    console.log('');

    const newPercent = ((result.afterTokens / 180000) * 100).toFixed(1);
    console.log(chalk.bold(`New usage: ${newPercent}% of context window`));
    console.log('');

    // Next steps
    console.log(chalk.bold('💡 Next Steps'));
    console.log(chalk.gray('─'.repeat(80)));

    const afterUsage = parseFloat(newPercent);

    if (afterUsage >= 80) {
      console.log(chalk.yellow('⚠️  Still high usage. Consider:'));
      console.log(chalk.yellow('   • More aggressive compaction'));
      console.log(chalk.yellow('   • Or: ') + chalk.cyan('save-and-restart') + chalk.yellow(' for fresh start'));
    } else if (afterUsage >= 50) {
      console.log(chalk.blue('📊 Good! You have room to continue.'));
      console.log(chalk.blue('   • Monitor with: ') + chalk.cyan('context-status'));
      console.log(chalk.blue('   • Compact again if needed'));
    } else {
      console.log(chalk.green('✅ Excellent! Plenty of space now.'));
      console.log(chalk.green('   • Continue working normally'));
      console.log(chalk.green('   • Check status: ') + chalk.cyan('context-status'));
    }

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
