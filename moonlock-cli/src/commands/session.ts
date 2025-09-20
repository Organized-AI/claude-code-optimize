import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { SessionService } from '../services/session';
import { CommandOptions } from '../types';

export async function SessionCommand(options: CommandOptions) {
  const sessionService = new SessionService();
  
  if (options.start) {
    await startSession(sessionService);
  } else if (options.end) {
    await endSession(sessionService);
  } else if (options.list) {
    await listSessions(sessionService);
  } else {
    // Interactive mode
    const choice = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Start new session', value: 'start' },
        { title: 'End current session', value: 'end' },
        { title: 'List recent sessions', value: 'list' },
        { title: 'Show current session', value: 'current' }
      ]
    });
    
    switch (choice.action) {
      case 'start':
        await startSession(sessionService);
        break;
      case 'end':
        await endSession(sessionService);
        break;
      case 'list':
        await listSessions(sessionService);
        break;
      case 'current':
        await showCurrentSession(sessionService);
        break;
    }
  }
}

async function startSession(sessionService: SessionService) {
  const spinner = ora('Starting new session...').start();
  
  try {
    // Check if there's already an active session
    const currentSession = await sessionService.getCurrentSession();
    
    if (currentSession) {
      spinner.stop();
      const shouldEnd = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'There is already an active session. End it and start a new one?',
        initial: false
      });
      
      if (!shouldEnd.value) {
        console.log(chalk.yellow('Keeping current session active.'));
        return;
      }
      
      await sessionService.endSession(currentSession.id);
    }
    
    // Get session metadata
    spinner.stop();
    const metadata = await prompts([
      {
        type: 'text',
        name: 'project',
        message: 'Project name (optional):',
        initial: ''
      },
      {
        type: 'text',
        name: 'description',
        message: 'Session description (optional):',
        initial: ''
      }
    ]);
    
    const newSpinner = ora('Creating session...').start();
    const session = await sessionService.startSession({
      project: metadata.project || undefined,
      description: metadata.description || undefined
    });
    
    newSpinner.succeed('Session started successfully!');
    console.log(`Session ID: ${chalk.cyan(session.id)}`);
    
  } catch (error) {
    spinner.fail('Failed to start session');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function endSession(sessionService: SessionService) {
  const spinner = ora('Ending current session...').start();
  
  try {
    const currentSession = await sessionService.getCurrentSession();
    
    if (!currentSession) {
      spinner.warn('No active session to end');
      return;
    }
    
    await sessionService.endSession(currentSession.id);
    spinner.succeed('Session ended successfully!');
    
    console.log(`\nSession Summary:`);
    console.log(`  Duration: ${chalk.cyan(formatDuration(Date.now() - currentSession.startTime.getTime()))}`);
    console.log(`  Tokens Used: ${chalk.yellow(currentSession.tokensUsed.toLocaleString())}`);
    
  } catch (error) {
    spinner.fail('Failed to end session');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function listSessions(sessionService: SessionService) {
  const spinner = ora('Fetching recent sessions...').start();
  
  try {
    const sessions = await sessionService.getRecentSessions(10);
    spinner.stop();
    
    if (sessions.length === 0) {
      console.log(chalk.gray('No sessions found.'));
      return;
    }
    
    console.log(chalk.bold('\n📋 Recent Sessions\n'));
    
    sessions.forEach((session, index) => {
      const isActive = session.status === 'active';
      const statusColor = isActive ? 'green' : session.status === 'completed' ? 'blue' : 'red';
      const duration = session.endTime 
        ? formatDuration(session.endTime.getTime() - session.startTime.getTime())
        : formatDuration(Date.now() - session.startTime.getTime());
      
      console.log(`${index + 1}. ${chalk.cyan(session.id.slice(0, 8))} ${chalk[statusColor](`[${session.status}]`)}`);
      console.log(`   Started: ${chalk.gray(session.startTime.toLocaleString())}`);
      console.log(`   Duration: ${chalk.yellow(duration)}`);
      console.log(`   Tokens: ${chalk.magenta(session.tokensUsed.toLocaleString())}`);
      
      if (session.metadata?.project) {
        console.log(`   Project: ${chalk.blue(session.metadata.project)}`);
      }
      console.log();
    });
    
  } catch (error) {
    spinner.fail('Failed to fetch sessions');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function showCurrentSession(sessionService: SessionService) {
  const spinner = ora('Fetching current session...').start();
  
  try {
    const session = await sessionService.getCurrentSession();
    spinner.stop();
    
    if (!session) {
      console.log(chalk.gray('No active session.'));
      return;
    }
    
    console.log(chalk.bold('\n🔄 Current Session\n'));
    console.log(`ID: ${chalk.cyan(session.id)}`);
    console.log(`Started: ${chalk.gray(session.startTime.toLocaleString())}`);
    console.log(`Duration: ${chalk.yellow(formatDuration(Date.now() - session.startTime.getTime()))}`);
    console.log(`Tokens Used: ${chalk.magenta(session.tokensUsed.toLocaleString())}`);
    console.log(`Status: ${chalk.green(session.status)}`);
    
    if (session.metadata?.project) {
      console.log(`Project: ${chalk.blue(session.metadata.project)}`);
    }
    
    if (session.metadata?.description) {
      console.log(`Description: ${chalk.gray(session.metadata.description)}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch current session');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}