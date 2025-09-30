#!/usr/bin/env node

/**
 * CLI Interface for Claude Optimizer
 * Main entry point for command-line usage
 */

import { Command } from 'commander';
import { ProjectAnalyzer } from './project-analyzer.js';
import { OptimizerDatabase } from './database.js';
import ora from 'ora';
import chalk from 'chalk';
import * as path from 'path';

const program = new Command();

program
  .name('claude-optimizer')
  .version('2.0.0')
  .description('AI-powered Claude Code session optimizer with calendar automation');

/**
 * Analyze command - Main functionality
 */
program
  .command('analyze <project-path>')
  .description('Analyze project complexity and generate session plan')
  .option('--force', 'Force re-analysis even if cached')
  .option('--no-cache', 'Skip reading from cache')
  .action(async (projectPath, options) => {
    const spinner = ora('Initializing...').start();

    try {
      // Resolve to absolute path
      const absolutePath = path.resolve(projectPath);

      const db = new OptimizerDatabase();
      const analyzer = new ProjectAnalyzer();

      // Check cache unless --force or --no-cache
      if (!options.force && options.cache) {
        spinner.text = 'Checking cache...';
        const cached = db.getProject(absolutePath);
        if (cached) {
          spinner.succeed('Found cached analysis');
          displayAnalysis(cached);
          db.close();
          return;
        }
      }

      spinner.text = 'Analyzing project...';
      spinner.stop();

      const analysis = await analyzer.analyzeProject(absolutePath);

      spinner.start('Saving analysis...');
      db.saveProjectAnalysis(analysis);

      spinner.succeed('Analysis complete!');
      displayAnalysis(analysis);

      db.close();

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('\nError:'), (error as Error).message);
      if (process.env.DEBUG) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  });

/**
 * List command - Show all analyzed projects
 */
program
  .command('list')
  .description('List all analyzed projects')
  .action(() => {
    try {
      const db = new OptimizerDatabase();
      const projects = db.listProjects();

      if (projects.length === 0) {
        console.log(chalk.yellow('\nNo projects analyzed yet.'));
        console.log(chalk.gray('Run: claude-optimizer analyze <project-path>'));
        return;
      }

      console.log(chalk.bold.cyan('\n📊 Analyzed Projects\n'));
      console.log(chalk.gray('─'.repeat(80)));

      projects.forEach((project, i) => {
        console.log(`\n${chalk.bold(`${i + 1}. ${project.name}`)}`);
        console.log(chalk.gray(`   Path: ${project.path}`));
        console.log(chalk.gray(`   Complexity: ${getComplexityDisplay(project.complexity)}`));
        console.log(chalk.gray(`   Estimated: ${project.estimatedHours}h`));
        console.log(chalk.gray(`   Analyzed: ${project.analyzedAt.toLocaleDateString()}`));
      });

      console.log('');
      db.close();

    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Show command - Display detailed analysis
 */
program
  .command('show <project-path>')
  .description('Show detailed analysis for a project')
  .action((projectPath) => {
    try {
      const absolutePath = path.resolve(projectPath);
      const db = new OptimizerDatabase();
      const analysis = db.getProject(absolutePath);

      if (!analysis) {
        console.log(chalk.yellow('\nNo analysis found for this project.'));
        console.log(chalk.gray('Run: claude-optimizer analyze <project-path>'));
        db.close();
        return;
      }

      displayAnalysis(analysis);
      db.close();

    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Delete command - Remove project from database
 */
program
  .command('delete <project-path>')
  .description('Delete project analysis from database')
  .action((projectPath) => {
    try {
      const absolutePath = path.resolve(projectPath);
      const db = new OptimizerDatabase();

      if (db.deleteProject(absolutePath)) {
        console.log(chalk.green('✓ Project analysis deleted'));
      } else {
        console.log(chalk.yellow('No analysis found for this project'));
      }

      db.close();

    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Display formatted analysis output
 */
function displayAnalysis(analysis: any): void {
  console.log('');
  console.log(chalk.bold.cyan('📊 Project Analysis Results'));
  console.log(chalk.gray('═'.repeat(80)));
  console.log('');

  console.log(chalk.bold('Project:'), analysis.projectPath);
  console.log(chalk.bold('Complexity:'), getComplexityDisplay(analysis.complexity));
  console.log(chalk.bold('Estimated Time:'), chalk.yellow(`${analysis.estimatedHours} hours`));
  console.log(chalk.bold('Files:'), analysis.fileCount.toLocaleString());
  console.log(chalk.bold('Size:'), `${analysis.totalSizeKB.toLocaleString()}KB`);
  console.log(chalk.bold('Technologies:'), analysis.technologies.join(', ') || 'None detected');
  console.log(chalk.bold('Tests:'), analysis.hasTests ? chalk.green('✓ Yes') : chalk.red('✗ No'));
  console.log(chalk.bold('Docs:'), analysis.hasDocs ? chalk.green('✓ Yes') : chalk.red('✗ No'));

  console.log('');
  console.log(chalk.bold.cyan('📋 Recommended Session Plan'));
  console.log(chalk.gray('═'.repeat(80)));
  console.log('');

  analysis.phases.forEach((phase: any, i: number) => {
    const phaseNum = chalk.bold.yellow(`${i + 1}.`);
    const phaseName = chalk.bold(phase.name);
    const phaseTime = chalk.gray(`(${phase.estimatedHours.toFixed(1)}h)`);

    console.log(`${phaseNum} ${phaseName} ${phaseTime}`);
    console.log(chalk.gray(`   ${phase.description}`));
    console.log(chalk.gray(`   Model: ${phase.suggestedModel} | Budget: ${phase.tokenBudget.toLocaleString()} tokens`));
    console.log(chalk.gray(`   Objectives:`));

    phase.objectives.forEach((obj: string) => {
      console.log(chalk.gray(`   • ${obj}`));
    });

    console.log('');
  });

  if (analysis.riskFactors && analysis.riskFactors.length > 0) {
    console.log(chalk.bold.yellow('⚠️  Risk Factors'));
    console.log(chalk.gray('═'.repeat(80)));
    analysis.riskFactors.forEach((risk: string) => {
      console.log(chalk.yellow(`• ${risk}`));
    });
    console.log('');
  }

  console.log(chalk.gray('Next Steps:'));
  console.log(chalk.gray('• Run ') + chalk.cyan('claude-optimizer schedule <project-path>') + chalk.gray(' to create calendar events'));
  console.log(chalk.gray('• View all projects: ') + chalk.cyan('claude-optimizer list'));
  console.log('');
}

/**
 * Get colorized complexity display
 */
function getComplexityDisplay(complexity: number): string {
  const colors = [
    chalk.green,   // 1-2: Trivial
    chalk.green,   // 3-4: Simple
    chalk.yellow,  // 5-6: Moderate
    chalk.yellow,  // 7-8: Complex
    chalk.red      // 9-10: Very Complex
  ];

  const labels = ['Trivial', 'Simple', 'Moderate', 'Complex', 'Very Complex'];

  const index = Math.min(Math.floor((complexity - 1) / 2), 4);
  const color = colors[index];
  const label = labels[index];

  return color(`${complexity}/10 (${label})`);
}

program.parse();
