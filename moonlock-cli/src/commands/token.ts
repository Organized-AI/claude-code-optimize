import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { TokenService } from '../services/token';
import { CommandOptions } from '../types';

export async function TokenCommand(options: CommandOptions) {
  const tokenService = new TokenService();
  
  if (options.current) {
    await showCurrentUsage(tokenService);
  } else if (options.history) {
    await showHistory(tokenService);
  } else if (options.reset) {
    await resetTokens(tokenService);
  } else {
    // Interactive mode
    const choice = await prompts({
      type: 'select',
      name: 'action',
      message: 'Token tracking options:',
      choices: [
        { title: 'Show current usage', value: 'current' },
        { title: 'Show usage history', value: 'history' },
        { title: 'Show detailed breakdown', value: 'breakdown' },
        { title: 'Reset counters', value: 'reset' }
      ]
    });
    
    switch (choice.action) {
      case 'current':
        await showCurrentUsage(tokenService);
        break;
      case 'history':
        await showHistory(tokenService);
        break;
      case 'breakdown':
        await showBreakdown(tokenService);
        break;
      case 'reset':
        await resetTokens(tokenService);
        break;
    }
  }
}

async function showCurrentUsage(tokenService: TokenService) {
  const spinner = ora('Fetching current token usage...').start();
  
  try {
    const [todayUsage, weekUsage, monthUsage] = await Promise.all([
      tokenService.getTodayUsage(),
      tokenService.getWeekUsage(),
      tokenService.getMonthUsage()
    ]);
    
    spinner.stop();
    
    console.log(chalk.bold('\n🪙 Token Usage Summary\n'));
    
    // Today's usage
    console.log(chalk.blue('Today:'));
    console.log(`  Input Tokens: ${chalk.cyan(todayUsage.inputTokens.toLocaleString())}`);
    console.log(`  Output Tokens: ${chalk.magenta(todayUsage.outputTokens.toLocaleString())}`);
    console.log(`  Total: ${chalk.yellow(todayUsage.totalTokens.toLocaleString())}`);
    if (todayUsage.cost) {
      console.log(`  Cost: ${chalk.green(`$${todayUsage.cost.toFixed(4)}`)}`);
    }
    console.log();
    
    // This week
    console.log(chalk.blue('This Week:'));
    console.log(`  Total: ${chalk.yellow(weekUsage.totalTokens.toLocaleString())}`);
    console.log(`  Sessions: ${chalk.cyan(weekUsage.sessionCount)}`);
    if (weekUsage.cost) {
      console.log(`  Cost: ${chalk.green(`$${weekUsage.cost.toFixed(4)}`)}`);
    }
    console.log();
    
    // This month
    console.log(chalk.blue('This Month:'));
    console.log(`  Total: ${chalk.yellow(monthUsage.totalTokens.toLocaleString())}`);
    console.log(`  Sessions: ${chalk.cyan(monthUsage.sessionCount)}`);
    if (monthUsage.cost) {
      console.log(`  Cost: ${chalk.green(`$${monthUsage.cost.toFixed(4)}`)}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch token usage');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function showHistory(tokenService: TokenService) {
  const spinner = ora('Fetching token usage history...').start();
  
  try {
    const history = await tokenService.getUsageHistory(30); // Last 30 days
    spinner.stop();
    
    if (history.length === 0) {
      console.log(chalk.gray('No usage history found.'));
      return;
    }
    
    console.log(chalk.bold('\n📈 Token Usage History (Last 30 Days)\n'));
    
    // Group by date
    const dailyUsage = new Map<string, { total: number; cost: number; sessions: number }>();
    
    history.forEach(usage => {
      const date = usage.timestamp.toISOString().split('T')[0];
      const existing = dailyUsage.get(date) || { total: 0, cost: 0, sessions: 0 };
      
      existing.total += usage.totalTokens;
      existing.cost += usage.cost || 0;
      existing.sessions += 1;
      
      dailyUsage.set(date, existing);
    });
    
    // Sort by date (most recent first)
    const sortedDates = Array.from(dailyUsage.keys()).sort().reverse();
    
    console.log(chalk.gray('Date       │ Tokens     │ Sessions │ Cost'));
    console.log(chalk.gray('───────────┼────────────┼──────────┼──────────'));
    
    sortedDates.slice(0, 14).forEach(date => {
      const usage = dailyUsage.get(date)!;
      const formattedDate = new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit' 
      });
      
      console.log(
        `${formattedDate.padEnd(10)} │ ` +
        `${chalk.yellow(usage.total.toLocaleString().padStart(10))} │ ` +
        `${chalk.cyan(usage.sessions.toString().padStart(8))} │ ` +
        `${chalk.green(`$${usage.cost.toFixed(4)}`)}`
      );
    });
    
  } catch (error) {
    spinner.fail('Failed to fetch usage history');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function showBreakdown(tokenService: TokenService) {
  const spinner = ora('Analyzing token usage breakdown...').start();
  
  try {
    const breakdown = await tokenService.getUsageBreakdown();
    spinner.stop();
    
    console.log(chalk.bold('\n🔍 Detailed Token Breakdown\n'));
    
    if (breakdown.byModel && Object.keys(breakdown.byModel).length > 0) {
      console.log(chalk.blue('By Model:'));
      Object.entries(breakdown.byModel).forEach(([model, usage]) => {
        console.log(`  ${model}: ${chalk.yellow(usage.toLocaleString())} tokens`);
      });
      console.log();
    }
    
    if (breakdown.byHour && Object.keys(breakdown.byHour).length > 0) {
      console.log(chalk.blue('Peak Usage Hours (Last 7 Days):'));
      const sortedHours = Object.entries(breakdown.byHour)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      sortedHours.forEach(([hour, usage]) => {
        const hourDisplay = `${hour.padStart(2, '0')}:00`;
        console.log(`  ${hourDisplay}: ${chalk.yellow(usage.toLocaleString())} tokens`);
      });
      console.log();
    }
    
    if (breakdown.averages) {
      console.log(chalk.blue('Averages:'));
      console.log(`  Per Session: ${chalk.cyan(Math.round(breakdown.averages.perSession).toLocaleString())} tokens`);
      console.log(`  Per Day: ${chalk.magenta(Math.round(breakdown.averages.perDay).toLocaleString())} tokens`);
      console.log(`  Per Hour (active): ${chalk.yellow(Math.round(breakdown.averages.perHour).toLocaleString())} tokens`);
    }
    
  } catch (error) {
    spinner.fail('Failed to analyze token breakdown');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function resetTokens(tokenService: TokenService) {
  const confirmation = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Are you sure you want to reset all token counters? This cannot be undone.',
    initial: false
  });
  
  if (!confirmation.value) {
    console.log(chalk.yellow('Reset cancelled.'));
    return;
  }
  
  const spinner = ora('Resetting token counters...').start();
  
  try {
    await tokenService.resetCounters();
    spinner.succeed('Token counters reset successfully!');
    
  } catch (error) {
    spinner.fail('Failed to reset token counters');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}