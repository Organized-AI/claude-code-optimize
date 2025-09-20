import chalk from 'chalk';
import ora from 'ora';
import { QuotaService } from '../services/quota';
import { SessionService } from '../services/session';
import { TokenService } from '../services/token';

export async function StatusCommand() {
  const spinner = ora('Fetching status...').start();
  
  try {
    const quotaService = new QuotaService();
    const sessionService = new SessionService();
    const tokenService = new TokenService();
    
    const [quota, currentSession, todayUsage] = await Promise.all([
      quotaService.getCurrentQuota(),
      sessionService.getCurrentSession(),
      tokenService.getTodayUsage()
    ]);
    
    spinner.stop();
    
    console.log(chalk.bold('\n📊 Claude Code Status\n'));
    
    // Quota Information
    console.log(chalk.blue('Quota Status:'));
    const quotaPercent = Math.round((quota.current / quota.limit) * 100);
    const quotaColor = quotaPercent > 80 ? 'red' : quotaPercent > 60 ? 'yellow' : 'green';
    console.log(`  Usage: ${chalk[quotaColor](`${quota.current}/${quota.limit} tokens (${quotaPercent}%)`)}`)
    console.log(`  Reset: ${chalk.gray(quota.resetTime.toLocaleString())}\n`);
    
    // Session Information
    if (currentSession) {
      console.log(chalk.blue('Current Session:'));
      console.log(`  ID: ${chalk.cyan(currentSession.id)}`);
      console.log(`  Started: ${chalk.gray(currentSession.startTime.toLocaleString())}`);
      console.log(`  Tokens Used: ${chalk.yellow(currentSession.tokensUsed.toLocaleString())}`);
      if (currentSession.metadata?.project) {
        console.log(`  Project: ${chalk.magenta(currentSession.metadata.project)}`);
      }
    } else {
      console.log(chalk.blue('Current Session:'));
      console.log(`  ${chalk.gray('No active session')}`);
    }
    
    console.log();
    
    // Today's Usage
    console.log(chalk.blue('Today\'s Usage:'));
    console.log(`  Total Tokens: ${chalk.yellow(todayUsage.totalTokens.toLocaleString())}`);
    console.log(`  Sessions: ${chalk.cyan(todayUsage.sessionCount)}`);
    if (todayUsage.cost) {
      console.log(`  Estimated Cost: ${chalk.green(`$${todayUsage.cost.toFixed(4)}`)}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to fetch status');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}