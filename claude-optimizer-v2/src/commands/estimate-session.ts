#!/usr/bin/env node

import { SessionPlanParser } from '../session-plan-parser.js';
import { TokenEstimator } from '../token-estimator.js';
import chalk from 'chalk';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(chalk.red('❌ Error: Please provide a session plan file'));
    console.log(chalk.gray('\nUsage: estimate-session SESSION_5_PLAN.md'));
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  console.log(chalk.bold('\n📊 Session Token Estimation Tool\n'));
  console.log(chalk.gray(`Reading: ${path.basename(filePath)}...\n`));

  try {
    // Parse session plan
    const parser = new SessionPlanParser();
    const sessionPlan = parser.parseFile(filePath);

    // Estimate tokens
    const estimator = new TokenEstimator();
    const estimate = estimator.estimateSession(sessionPlan);

    // Display results
    displayEstimate(estimate);

  } catch (error) {
    console.log(chalk.red(`\n❌ Error: ${(error as Error).message}\n`));
    process.exit(1);
  }
}

function displayEstimate(estimate: any) {
  // Analyzing phases
  console.log(chalk.bold('Analyzing phases:'));
  for (const phase of estimate.phases) {
    console.log(chalk.green(`✓ Phase ${phase.phaseNumber}: ${phase.phaseName}`));
  }

  // Complexity factors
  console.log(chalk.bold('\n🔍 Detected Complexity Factors:'));
  console.log(chalk.gray(`• Project size: Medium (${estimate.complexityFactors.projectSize.toFixed(1)}x)`));
  console.log(chalk.gray(`• Tech stack: Familiar (${estimate.complexityFactors.techStack.toFixed(1)}x)`));
  console.log(chalk.gray(`• Code quality: Clean (${estimate.complexityFactors.codeQuality.toFixed(1)}x)`));

  // Phase estimates
  console.log(chalk.bold('\n📈 Token Estimates:\n'));
  for (const phase of estimate.phases) {
    const low = phase.estimatedTokens.low.toLocaleString();
    const high = phase.estimatedTokens.high.toLocaleString();
    const mid = phase.estimatedTokens.mid.toLocaleString();

    console.log(chalk.cyan(`Phase ${phase.phaseNumber}: ${low} - ${high} tokens`));
    console.log(chalk.gray(`  Base: ${mid} | Confidence: ${phase.confidenceLevel.toUpperCase()}\n`));
  }

  // Total estimate
  console.log(chalk.bold('━'.repeat(50)));
  console.log(chalk.bold(`\nTOTAL ESTIMATE: ${estimate.totalTokens.low.toLocaleString()} - ${estimate.totalTokens.high.toLocaleString()} tokens`));
  console.log(chalk.gray(`Mid-Range: ${estimate.totalTokens.mid.toLocaleString()} tokens (${estimate.quotaCheck.percentageOfQuota.toFixed(1)}% of Pro quota)`));
  console.log(chalk.gray(`Recommended Buffer: +15% = ${estimate.quotaCheck.recommendedBuffer.toLocaleString()} tokens\n`));

  // Quota check
  const fitsIcon = estimate.quotaCheck.fitsProQuota ? '✅' : '❌';
  console.log(`${fitsIcon} Fits Pro Quota (200k)? ${estimate.quotaCheck.fitsProQuota ? 'YES' : 'NO'}`);

  // Confidence
  const confIcon = estimate.confidenceLevel === 'high' ? '💪' : estimate.confidenceLevel === 'medium' ? '👍' : '⚠️';
  console.log(`${confIcon} Confidence: ${estimate.confidenceLevel.toUpperCase()}\n`);

  // Time estimate
  console.log(chalk.gray(`⏱️  Estimated Duration: ${estimate.totalHours.low}-${estimate.totalHours.high} hours\n`));
}

main().catch(console.error);
