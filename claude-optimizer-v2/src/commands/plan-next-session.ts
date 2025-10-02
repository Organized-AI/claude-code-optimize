#!/usr/bin/env node

/**
 * /plan-next-session Command
 * Interactive session planning and automation setup
 * Triggered at 80% quota usage
 */

import * as readline from 'readline';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { HandoffManager } from '../handoff-manager.js';
import { QuotaTracker } from '../quota-tracker.js';
import type { SessionObjective } from '../types/handoff.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => rl.question(prompt, resolve));
};

async function main() {
  console.log('\n⚠️  STRATEGIC PLANNING TIME (80% quota used)\n');
  console.log('Let\'s prepare your next session for maximum efficiency!\n');

  // Get quota status
  const quotaTracker = new QuotaTracker();
  const status = quotaTracker.getStatus();

  console.log(`Current Usage: ${status.used.toLocaleString()} / ${status.limit.toLocaleString()} tokens (${status.percent}%)`);
  console.log(`Remaining: ${status.remaining.toLocaleString()} tokens\n`);
  console.log('─'.repeat(60) + '\n');

  // Gather project info
  const projectPath = process.cwd();
  const projectName = path.basename(projectPath);

  console.log(`📁 Project: ${projectName}`);
  console.log(`📂 Path: ${projectPath}\n`);

  // Gather accomplishments
  console.log('📋 What did you accomplish this session?');
  console.log('   (Enter one per line, empty line to finish)\n');

  const accomplishments: string[] = [];
  let i = 1;
  while (true) {
    const item = await question(`   ${i}> `);
    if (!item.trim()) break;
    accomplishments.push(item.trim());
    i++;
  }

  if (accomplishments.length === 0) {
    console.log('   ⚠️  No accomplishments entered. Let\'s add at least one.\n');
    const item = await question('   1> ');
    if (item.trim()) accomplishments.push(item.trim());
  }

  // Current state
  console.log('\n📋 What\'s the current state?');
  console.log('   (branch, commits, tests, etc.)\n');

  const branch = await question('   Git branch (or press enter): ');
  const lastCommit = await question('   Last commit message (or press enter): ');
  const testsStatus = await question('   Test status (e.g., "15/15 passing"): ');

  // Next objectives
  console.log('\n📋 What are the next objectives? (2-4 tasks)');
  console.log('   (Enter one per line, empty line to finish)\n');

  const objectives: SessionObjective[] = [];
  let j = 1;
  while (j <= 6) { // Max 6 objectives
    const desc = await question(`   ${j}> `);
    if (!desc.trim()) break;

    const estimateStr = await question(`      Estimated tokens? (optional, press enter to skip): `);
    const estimate = estimateStr ? parseInt(estimateStr.replace(/,/g, '')) : undefined;

    objectives.push({
      description: desc.trim(),
      estimatedTokens: estimate,
      priority: j <= 2 ? 'high' : 'medium'
    });
    j++;
  }

  if (objectives.length === 0) {
    console.log('   ⚠️  No objectives entered. Adding a placeholder.\n');
    objectives.push({
      description: 'Continue implementation',
      priority: 'high'
    });
  }

  // Total token estimate
  let totalEstimate = objectives.reduce((sum, obj) => sum + (obj.estimatedTokens || 0), 0);

  if (totalEstimate === 0) {
    console.log('\n📋 Estimated tokens for next session?');
    console.log('   (We\'ll use this to verify it fits quota)\n');

    const estimateStr = await question('   Tokens: ');
    totalEstimate = parseInt(estimateStr.replace(/,/g, '')) || 50000;
  }

  // Key decisions and blockers
  console.log('\n📋 Any key decisions or important context?');
  console.log('   (Enter one per line, empty line to finish)\n');

  const keyDecisions: string[] = [];
  let k = 1;
  while (true) {
    const decision = await question(`   ${k}> `);
    if (!decision.trim()) break;
    keyDecisions.push(decision.trim());
    k++;
  }

  console.log('\n📋 Any blockers or issues?');
  const blockersInput = await question('   > ');
  const blockers = blockersInput.trim() ? [blockersInput.trim()] : [];

  // Additional notes
  console.log('\n📋 Any additional notes?');
  const notes = await question('   > ');

  // Create handoff
  console.log('\n' + '─'.repeat(60));
  console.log('\n✅ Creating handoff file...\n');

  const handoffManager = new HandoffManager();
  const handoffPath = await handoffManager.createHandoff({
    projectPath,
    projectName,
    agent: '.claude/agents/implementation.md', // Default, can be customized
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
    notes: notes || 'Ready to proceed!'
  });

  console.log(`📄 Handoff file created!`);
  console.log(`   ${handoffPath}\n`);

  // Quota reset info
  console.log('─'.repeat(60));
  console.log('\n📅 Quota Reset Information\n');

  const resetTime = status.resetTime;
  const now = new Date();
  const msUntilReset = Math.max(0, resetTime.getTime() - now.getTime());
  const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
  const minsUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  console.log(`   Quota resets at: ${resetTime.toLocaleTimeString()}`);
  console.log(`   Time until reset: ${hoursUntilReset}h ${minsUntilReset}m\n`);

  // Check if next session fits quota
  const fitsQuota = totalEstimate <= status.limit;
  const percentOfQuota = Math.round((totalEstimate / status.limit) * 100);

  console.log(`   Next session estimate: ${totalEstimate.toLocaleString()} tokens (${percentOfQuota}% of quota)`);

  if (fitsQuota) {
    console.log(`   ✅ Fits quota with ${(status.limit - totalEstimate).toLocaleString()} tokens buffer\n`);
  } else {
    console.log(`   ⚠️  Exceeds quota by ${(totalEstimate - status.limit).toLocaleString()} tokens`);
    console.log(`   Consider breaking into smaller sessions\n`);
  }

  // Scheduling options
  console.log('─'.repeat(60));
  console.log('\n🤖 AUTOMATION OPTIONS\n');
  console.log('   How would you like to start the next session?\n');
  console.log('   1. At quota reset (' + resetTime.toLocaleTimeString() + ')');
  console.log('   2. 5 minutes after reset (recommended)');
  console.log('   3. Custom time');
  console.log('   4. Manual (I\'ll start it myself)\n');

  const choice = await question('   Choice [1-4]: ');

  if (choice === '4') {
    console.log('\n💡 Manual mode selected');
    console.log('   To start the next session:');
    console.log(`   1. Wait for quota reset (${resetTime.toLocaleTimeString()})`);
    console.log(`   2. cd ${projectPath}`);
    console.log(`   3. Load handoff context and begin work\n`);
  } else {
    console.log('\n🔧 Automation scheduling...\n');

    // Calculate launch time based on choice
    let launchTime: string;

    if (choice === '1') {
      // At quota reset
      const hours = resetTime.getHours().toString().padStart(2, '0');
      const mins = resetTime.getMinutes().toString().padStart(2, '0');
      launchTime = `${hours}:${mins}`;
    } else if (choice === '2') {
      // 5 minutes after reset
      const fiveAfter = new Date(resetTime.getTime() + 5 * 60 * 1000);
      const hours = fiveAfter.getHours().toString().padStart(2, '0');
      const mins = fiveAfter.getMinutes().toString().padStart(2, '0');
      launchTime = `${hours}:${mins}`;
    } else {
      // Custom time
      launchTime = await question('   Enter time (HH:MM): ');
    }

    // Call automation scheduler (from Session 4B)
    const schedulerScript = path.join(os.homedir(), '.claude', 'automation', 'schedule-session.sh');
    const agentFile = path.join(projectPath, '.claude', 'agents', 'implementation.md');

    try {
      const cmd = `"${schedulerScript}" "${handoffPath}" "${agentFile}" "${projectPath}" "${launchTime}"`;
      execSync(cmd, { stdio: 'inherit' });

      console.log(`\n✅ Session scheduled for ${launchTime}`);
      console.log(`   The session will launch automatically\n`);
    } catch (error) {
      console.log(`\n⚠️  Automation scheduling failed: ${(error as Error).message}`);
      console.log('   Handoff file is ready for manual use\n');
    }
  }

  // Summary
  console.log('─'.repeat(60));
  console.log('\n✅ PLANNING COMPLETE\n');
  console.log(`   📄 Handoff: ${path.basename(handoffPath)}`);
  console.log(`   📊 Estimated: ${totalEstimate.toLocaleString()} tokens`);
  console.log(`   🎯 Objectives: ${objectives.length}`);
  console.log(`   ⏰ Reset: ${status.timeUntilReset}\n`);

  console.log('💡 Next steps:');
  console.log('   • Finish any small tasks (<15k tokens)');
  console.log('   • Commit and save your work');
  console.log('   • Take a break until quota resets\n');

  console.log('─'.repeat(60) + '\n');

  rl.close();
}

// Run
main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  rl.close();
  process.exit(1);
});
