#!/usr/bin/env node

/**
 * Session Start Command
 * Launches Claude Code session from SESSION_X_PLAN.md file
 */

import { SessionPlanParser } from '../session-plan-parser.js';
import { SessionLauncher } from '../session-launcher.js';
import ora from 'ora';
import chalk from 'chalk';
import type { CalendarEvent } from '../types.js';

export async function sessionStart(planIdentifier: string): Promise<void> {
  const spinner = ora('Loading session plan...').start();

  try {
    // 1. Find and parse session plan
    const parser = new SessionPlanParser();
    const planPath = await parser.findPlan(planIdentifier);

    spinner.text = 'Parsing session plan...';
    const plan = await parser.parsePlan(planPath);

    spinner.succeed('Session plan loaded');

    // 2. Display session info
    console.log('');
    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log(chalk.bold.cyan(`  ${plan.title}`));
    console.log(chalk.bold.cyan('═'.repeat(80)));
    console.log('');

    console.log(chalk.bold('Status:'), plan.status ? getStatusDisplay(plan.status) : chalk.gray('Unknown'));
    console.log(chalk.bold('Estimated Time:'), plan.estimatedTime ? chalk.yellow(plan.estimatedTime) : chalk.gray('Unknown'));
    console.log(chalk.bold('Token Budget:'), plan.estimatedTokens ? chalk.yellow(plan.estimatedTokens) : chalk.gray('Unknown'));

    if (plan.prerequisites.length > 0) {
      console.log('');
      console.log(chalk.bold('Prerequisites:'));
      plan.prerequisites.forEach(prereq => {
        console.log(chalk.gray(`  • ${prereq}`));
      });
    }

    if (plan.objectives.length > 0) {
      console.log('');
      console.log(chalk.bold('Session Objectives:'));
      plan.objectives.forEach((obj, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${obj}`));
      });
    }

    if (plan.phases.length > 0) {
      console.log('');
      console.log(chalk.bold('Phases:'));
      plan.phases.forEach(phase => {
        console.log(chalk.yellow(`  Phase ${phase.number}: ${phase.name}`));
        if (phase.objectives.length > 0 && phase.objectives.length <= 3) {
          phase.objectives.forEach(obj => {
            console.log(chalk.gray(`    • ${obj}`));
          });
        } else if (phase.objectives.length > 3) {
          console.log(chalk.gray(`    • ${phase.objectives[0]}`));
          console.log(chalk.gray(`    • ${phase.objectives[1]}`));
          console.log(chalk.gray(`    ... and ${phase.objectives.length - 2} more objectives`));
        }
      });
    }

    console.log('');
    console.log(chalk.gray('─'.repeat(80)));

    // 3. Build prompt from session plan
    spinner.start('Preparing Claude Code session...');
    const prompt = parser.buildPrompt(plan);

    // 4. Create mock calendar event for launcher
    // (SessionLauncher expects CalendarEvent, so we create one from the plan)
    const projectPath = process.cwd();
    const projectName = projectPath.split('/').pop() || 'Unknown Project';

    const mockEvent: CalendarEvent = {
      id: plan.sessionId,
      summary: plan.title,
      description: prompt,
      start: new Date(),
      end: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      sessionConfig: {
        projectPath,
        projectName,
        phase: plan.title,
        model: 'sonnet', // Default model
        tokenBudget: parseTokenBudget(plan.estimatedTokens || '80k tokens'),
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        objectives: plan.objectives
      }
    };

    // 5. Launch session
    spinner.text = 'Launching Claude Code...';
    const launcher = new SessionLauncher();

    // Override buildInstructions to use our plan prompt
    const handle = await launcher.launchSession(mockEvent);

    spinner.succeed('Session started!');

    console.log('');
    console.log(chalk.green('✓ Claude Code session launched'));
    console.log(chalk.gray(`  Session ID: ${handle.sessionId}`));
    console.log(chalk.gray(`  PID: ${handle.pid}`));
    console.log(chalk.gray(`  Log: ${handle.logFilePath}`));
    console.log('');
    console.log(chalk.bold('📋 Follow the objectives above to complete this session.'));
    console.log('');

  } catch (error) {
    spinner.fail('Failed to start session');
    console.error(chalk.red('\nError:'), (error as Error).message);

    if (planIdentifier && !planIdentifier.match(/SESSION_\d+/)) {
      console.log(chalk.yellow('\nTip: Try using the full plan name:'));
      console.log(chalk.cyan(`  node dist/cli.js session start SESSION_${planIdentifier}_PLAN`));
    }

    console.log(chalk.gray('\nAvailable plans:'));
    const parser = new SessionPlanParser();
    const plans = await parser.listPlans();
    plans.forEach(p => {
      console.log(chalk.gray(`  • ${p.replace('.md', '')}`));
    });

    process.exit(1);
  }
}

/**
 * Get colorized status display
 */
function getStatusDisplay(status: string): string {
  if (status.includes('READY')) {
    return chalk.green(status);
  } else if (status.includes('IN PROGRESS') || status.includes('STARTED')) {
    return chalk.yellow(status);
  } else if (status.includes('COMPLETE')) {
    return chalk.blue(status);
  } else if (status.includes('BLOCKED')) {
    return chalk.red(status);
  }
  return chalk.gray(status);
}

/**
 * Parse token budget from string like "65-85k tokens"
 */
function parseTokenBudget(budgetStr: string): number {
  const match = budgetStr.match(/(\d+)[-\s]*(\d+)?k/i);
  if (match) {
    const lower = parseInt(match[1]);
    const upper = match[2] ? parseInt(match[2]) : lower;
    // Use midpoint of range
    return Math.round((lower + upper) / 2 * 1000);
  }
  return 80000; // Default
}
