#!/usr/bin/env node

/**
 * CLI Interface for Claude Optimizer
 * Main entry point for command-line usage
 */

import { Command } from 'commander';
import { ProjectAnalyzer } from './project-analyzer.js';
import { OptimizerDatabase } from './database.js';
import { CalendarService } from './calendar-service.js';
import { CalendarWatcher } from './calendar-watcher.js';
import { CalendarServer } from './calendar-server.js';
import { QuotaTracker } from './quota-tracker.js';
import { HandoffManager } from './handoff-manager.js';
import { ContextTracker } from './context-tracker.js';
import { launchDashboard } from './commands/dashboard.js';
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

/**
 * Status command - Show quota and automation status
 */
program
  .command('status')
  .description('Show quota usage and automation status')
  .action(async () => {
    try {
      const quotaTracker = new QuotaTracker();
      const status = quotaTracker.getStatus();
      const handoffManager = new HandoffManager();
      const handoffs = handoffManager.listHandoffs();

      console.log(chalk.bold('\n🎯 TOKEN QUOTA (5-Hour Rolling Window)\n'));
      console.log(chalk.gray('═'.repeat(60)));

      // Usage bar
      const barWidth = 40;
      const filled = Math.round((status.percent / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);

      // Color based on threshold
      let barColor = chalk.green;
      if (status.percent >= 95) barColor = chalk.red;
      else if (status.percent >= 90) barColor = chalk.red;
      else if (status.percent >= 80) barColor = chalk.yellow;
      else if (status.percent >= 50) barColor = chalk.blue;

      console.log(`Plan:         ${chalk.bold(status.plan.toUpperCase())}`);
      console.log(`Used:         ${status.used.toLocaleString()} tokens (${status.percent}%)`);
      console.log(`Remaining:    ${status.remaining.toLocaleString()} tokens`);
      console.log(`Usage:        ${barColor(bar)} ${status.percent}%`);
      console.log(`Reset:        ${status.resetTime.toLocaleString()}`);
      console.log(`Time Left:    ${status.timeUntilReset}\n`);

      // Context Window Status
      try {
        const contextTracker = new ContextTracker();
        const contextUsage = await contextTracker.estimateCurrentContext();

        console.log(chalk.bold('📝 CONTEXT WINDOW (Session)\n'));
        console.log(chalk.gray('═'.repeat(60)));

        const contextBarWidth = 40;
        const contextFilled = Math.round((contextUsage.percentUsed / 100) * contextBarWidth);
        const contextEmpty = contextBarWidth - contextFilled;
        const contextBar = '█'.repeat(contextFilled) + '░'.repeat(contextEmpty);

        let contextBarColor = chalk.green;
        if (contextUsage.percentUsed >= 90) contextBarColor = chalk.red;
        else if (contextUsage.percentUsed >= 80) contextBarColor = chalk.yellow;
        else if (contextUsage.percentUsed >= 50) contextBarColor = chalk.blue;

        let contextStatusDisplay = '';
        switch (contextUsage.status) {
          case 'fresh':
          case 'healthy':
            contextStatusDisplay = chalk.green('🟢 HEALTHY - Normal operation');
            break;
          case 'moderate':
            contextStatusDisplay = chalk.blue('🔵 MODERATE - Active session');
            break;
          case 'warning':
            contextStatusDisplay = chalk.yellow('🟡 WARNING - Monitor usage');
            break;
          case 'danger':
            contextStatusDisplay = chalk.red('🟠 DANGER - Consider compaction');
            break;
          case 'critical':
            contextStatusDisplay = chalk.red.bold('🔴 CRITICAL - Compact or restart!');
            break;
        }

        console.log(`Model:        Claude Sonnet 4.5`);
        console.log(`Used:         ${contextUsage.totalTokens.toLocaleString()} / 180,000 tokens (${contextUsage.percentUsed.toFixed(1)}%)`);
        console.log(`Status:       ${contextStatusDisplay}`);
        console.log(`Usage:        ${contextBarColor(contextBar)} ${contextUsage.percentUsed.toFixed(1)}%`);
        console.log(`Est. Hours:   ~${contextUsage.estimatedHoursRemaining.toFixed(1)} hours remaining\n`);

        // Combined Health
        console.log(chalk.bold('⚡ COMBINED HEALTH\n'));
        console.log(chalk.gray('─'.repeat(60)));

        const quotaCritical = status.percent >= 80;
        const contextCritical = contextUsage.percentUsed >= 80;

        if (quotaCritical && contextCritical) {
          console.log(chalk.red.bold('🔴 CRITICAL: Both quota and context approaching limits!'));
          console.log(chalk.red('   Immediate action required:'));
          console.log(chalk.red('   • Run: ') + chalk.cyan('save-and-restart'));
          console.log(chalk.red('   • Or wait for quota reset and compact context'));
        } else if (quotaCritical) {
          console.log(chalk.yellow('⚠️  WARNING: Quota is low'));
          console.log(chalk.yellow('   • Context is healthy'));
          console.log(chalk.yellow('   • Run: ') + chalk.cyan('plan-next-session'));
        } else if (contextCritical) {
          console.log(chalk.yellow('⚠️  WARNING: Context is high'));
          console.log(chalk.yellow('   • Quota is healthy'));
          console.log(chalk.yellow('   • Run: ') + chalk.cyan('compact-context') + chalk.yellow(' or ') + chalk.cyan('save-and-restart'));
        } else {
          console.log(chalk.green('✅ GOOD: Both quota and context are healthy'));
          console.log(chalk.green('   Continue working normally'));
        }

        console.log('');

      } catch (contextError) {
        // Context tracking not initialized - skip this section
        console.log(chalk.gray('📝 Context tracking not initialized yet\n'));
      }

      // Recommendation
      console.log(chalk.bold('📊 QUOTA STATUS\n'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(status.recommendation);
      console.log('');

      // Scheduled sessions
      const pendingHandoffs = handoffs.filter(h => h.status === 'pending');

      if (pendingHandoffs.length > 0) {
        console.log(chalk.bold('\n🤖 SCHEDULED SESSIONS\n'));
        console.log(chalk.gray('═'.repeat(60)));

        pendingHandoffs.forEach((handoff, i) => {
          console.log(chalk.cyan(`${i + 1}. ${handoff.projectName}`));
          console.log(`   Scheduled: ${handoff.scheduledFor ? handoff.scheduledFor.toLocaleString() : 'Not scheduled'}`);
          console.log(`   Estimated: ${handoff.estimatedTokens.toLocaleString()} tokens`);
          console.log(`   Status: ${handoff.status}\n`);
        });
      }

      // Next steps
      console.log(chalk.bold('💡 ACTIONS\n'));
      console.log(chalk.gray('─'.repeat(60)));

      if (status.percent >= 80) {
        console.log(chalk.yellow('⚠️  Time to plan next session!'));
        console.log(chalk.gray('   Run: ') + chalk.cyan('plan-next-session'));
      } else if (status.percent >= 50) {
        console.log(chalk.blue('💡 Monitor your usage'));
        console.log(chalk.gray('   Check status: ') + chalk.cyan('claude-optimizer status'));
      } else {
        console.log(chalk.green('✅ Quota is healthy'));
        console.log(chalk.gray('   Continue working normally'));
      }
      console.log('');

    } catch (error) {
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Dashboard command - Launch live dashboard
 */
program
  .command('dashboard')
  .description('Launch real-time dashboard with live session data')
  .option('--port <port>', 'WebSocket server port (default: 3001)', '3001')
  .option('--no-browser', 'Don\'t auto-open browser')
  .option('--simulation', 'Use mock data instead of live data')
  .action(async (options) => {
    await launchDashboard({
      port: parseInt(options.port),
      noBrowser: !options.browser,
      simulation: options.simulation
    });
  });

/**
 * Calendar commands group
 */
const calendar = program
  .command('calendar')
  .description('Manage Google Calendar integration');

/**
 * Schedule command - Create calendar schedule from analysis
 */
calendar
  .command('schedule <project-path>')
  .description('Create calendar schedule for project')
  .option('--start <date>', 'Start date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--hours <start-end>', 'Working hours (e.g., "9-17")', '9-17')
  .option('--days <days>', 'Days of week (0=Sun, 1=Mon, ..., 6=Sat)', '1,2,3,4,5')
  .option('--length <hours>', 'Session length in hours (max 5)', '4')
  .action(async (projectPath, options) => {
    const spinner = ora('Initializing calendar service...').start();

    try {
      const absolutePath = path.resolve(projectPath);

      // Get project analysis
      const db = new OptimizerDatabase();
      let analysis = db.getProject(absolutePath);

      if (!analysis) {
        spinner.text = 'No analysis found, analyzing project...';
        spinner.stop();
        const analyzer = new ProjectAnalyzer();
        analysis = await analyzer.analyzeProject(absolutePath);
        db.saveProjectAnalysis(analysis);
      }

      db.close();

      // Parse options
      const [startHour, endHour] = options.hours.split('-').map(Number);
      const daysOfWeek = options.days.split(',').map(Number);
      const sessionLength = parseInt(options.length);

      const preferences = {
        startDate: new Date(options.start),
        workingHours: { start: startHour, end: endHour },
        daysOfWeek,
        sessionLength,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      spinner.text = 'Authenticating with Google Calendar...';
      const calendarService = new CalendarService();
      await calendarService.initialize();

      spinner.text = 'Creating calendar schedule...';
      spinner.stop();

      const events = await calendarService.createSessionSchedule(analysis, preferences);

      spinner.succeed(`Created ${events.length} calendar events!`);

      console.log(chalk.bold('\n📅 Calendar Schedule Created\n'));
      events.forEach((event, i) => {
        console.log(chalk.cyan(`${i + 1}. ${event.sessionConfig.phase}`));
        console.log(`   ${event.start.toLocaleString()} - ${event.end.toLocaleString()}`);
        console.log(`   Model: ${event.sessionConfig.model} | Budget: ${event.sessionConfig.tokenBudget.toLocaleString()} tokens\n`);
      });

    } catch (error) {
      spinner.fail('Scheduling failed');
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * List upcoming sessions
 */
calendar
  .command('list')
  .description('List upcoming Claude sessions from calendar')
  .action(async () => {
    const spinner = ora('Loading calendar events...').start();

    try {
      const calendarService = new CalendarService();
      await calendarService.initialize();

      const sessions = await calendarService.listUpcomingSessions();

      spinner.stop();

      if (sessions.length === 0) {
        console.log(chalk.yellow('\nℹ️  No upcoming Claude sessions found\n'));
        return;
      }

      console.log(chalk.bold(`\n📅 Upcoming Claude Sessions (${sessions.length})\n`));

      sessions.forEach((session, i) => {
        const daysUntil = Math.floor((session.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        console.log(chalk.cyan(`${i + 1}. ${session.sessionConfig.phase}`));
        console.log(`   Project: ${session.sessionConfig.projectName}`);
        console.log(`   Time: ${session.start.toLocaleString()}`);
        console.log(`   ${daysUntil === 0 ? 'Today' : `In ${daysUntil} day(s)`}\n`);
      });

    } catch (error) {
      spinner.fail('Failed to load sessions');
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Watch calendar for upcoming sessions
 */
calendar
  .command('watch')
  .description('Watch calendar and auto-start sessions')
  .option('--no-auto-start', 'Disable auto-start (warnings only)')
  .option('--interval <minutes>', 'Check interval in minutes', '5')
  .action(async (options) => {
    console.log(chalk.bold('\n👁️  Calendar Watcher\n'));

    try {
      const watcher = new CalendarWatcher({
        pollIntervalMinutes: parseInt(options.interval),
        autoStart: options.autoStart
      });

      // Set up event listeners
      watcher.on('session-warning', () => {
        // Already handled in watcher
      });

      watcher.on('session-starting', (session) => {
        console.log(chalk.green(`\n🚀 Starting: ${session.sessionConfig.phase}\n`));
      });

      watcher.on('session-complete', (state) => {
        console.log(chalk.green(`\n✅ Session completed: ${state.phase}\n`));
      });

      watcher.on('session-error', (error) => {
        console.error(chalk.red(`\n❌ Session error: ${error.message}\n`));
      });

      await watcher.start();

      console.log(chalk.green('  ✓ Watcher started successfully\n'));
      console.log('  Press Ctrl+C to stop\n');

      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n\n  Stopping watcher...\n');
        watcher.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Logout from Google Calendar
 */
calendar
  .command('logout')
  .description('Clear Google Calendar authentication')
  .action(async () => {
    const spinner = ora('Clearing authentication...').start();

    try {
      const calendarService = new CalendarService();
      await calendarService.logout();
      spinner.succeed('Logged out successfully');
    } catch (error) {
      spinner.fail('Logout failed');
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Export calendar to iCal format
 */
calendar
  .command('export <output-file>')
  .description('Export sessions to iCal format (.ics) for iPhone, Apple Calendar, etc.')
  .action(async (outputFile) => {
    const spinner = ora('Exporting to iCal format...').start();

    try {
      const calendarService = new CalendarService();
      await calendarService.initialize();

      spinner.text = 'Fetching sessions...';
      await calendarService.exportToIcal(outputFile);

      spinner.succeed(`Exported to ${outputFile}`);

      console.log(chalk.bold('\n📱 Next Steps:\n'));
      console.log(chalk.gray('  Mac:     ') + chalk.cyan(`open ${outputFile}`));
      console.log(chalk.gray('  iPhone:  ') + chalk.cyan('AirDrop the file or email to yourself'));
      console.log(chalk.gray('  Import:  ') + chalk.cyan('Tap the file to add to Calendar app'));
      console.log('');

    } catch (error) {
      spinner.fail('Export failed');
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Serve mobile-friendly calendar view
 */
calendar
  .command('serve')
  .description('Start mobile-friendly calendar server')
  .option('-p, --port <port>', 'Server port', '8080')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n📱 Starting mobile calendar server...\n'));

    try {
      const port = parseInt(options.port);
      const server = new CalendarServer(port);

      await server.start();

      // Handle shutdown gracefully
      process.on('SIGINT', async () => {
        console.log('\n\n  Shutting down...');
        await server.stop();
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {});

    } catch (error) {
      console.error(chalk.red('\nError:'), (error as Error).message);

      if ((error as any).code === 'EADDRINUSE') {
        console.log(chalk.yellow('\nPort is already in use. Try:'));
        console.log(chalk.cyan(`  claude-optimizer calendar serve --port 8081`));
      }

      process.exit(1);
    }
  });

program.parse();
