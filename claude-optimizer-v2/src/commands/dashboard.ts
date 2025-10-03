import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the live dashboard
 */
export async function launchDashboard(options: {
  port?: number;
  noBrowser?: boolean;
  simulation?: boolean;
} = {}): Promise<void> {
  const port = options.port || 3001;

  console.log(chalk.cyan('\n' + '━'.repeat(60)));
  console.log(chalk.bold.white('  📊 Claude Code Optimizer Dashboard'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log();
  console.log(chalk.gray('  Starting live dashboard server...'));

  try {
    // Launch dashboard-live.ts
    const dashboardScript = path.join(__dirname, '../dashboard-live.js');

    const serverProcess: ChildProcess = spawn('node', [dashboardScript], {
      stdio: 'inherit',
      detached: false,
      env: {
        ...process.env,
        DASHBOARD_PORT: port.toString(),
        DASHBOARD_NO_BROWSER: options.noBrowser ? 'true' : 'false',
        DASHBOARD_SIMULATION: options.simulation ? 'true' : 'false'
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n  Shutting down dashboard...'));
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });

    serverProcess.on('error', (error) => {
      console.error(chalk.red(`\n  ❌ Failed to start dashboard: ${error.message}\n`));
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      if (code && code !== 0) {
        console.error(chalk.red(`\n  ❌ Dashboard exited with code ${code}\n`));
        process.exit(code);
      }
    });

    // Keep process alive
    await new Promise<void>(() => {
      // Never resolves, keeps process running
    });

  } catch (error: any) {
    console.error(chalk.red(`\n  ❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Show dashboard help
 */
export function showDashboardHelp(): void {
  console.log(chalk.cyan('\n' + '━'.repeat(60)));
  console.log(chalk.bold.white('  📊 Claude Code Optimizer Dashboard'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log();
  console.log(chalk.white('  USAGE:'));
  console.log(chalk.gray('    dashboard [options]'));
  console.log();
  console.log(chalk.white('  OPTIONS:'));
  console.log(chalk.gray('    --port <port>      WebSocket server port (default: 3001)'));
  console.log(chalk.gray('    --no-browser       Don\'t auto-open browser'));
  console.log(chalk.gray('    --simulation       Use mock data instead of live data'));
  console.log(chalk.gray('    --help, -h         Show this help message'));
  console.log();
  console.log(chalk.white('  EXAMPLES:'));
  console.log(chalk.gray('    dashboard                    # Launch with defaults'));
  console.log(chalk.gray('    dashboard --port 3002        # Use custom port'));
  console.log(chalk.gray('    dashboard --no-browser       # Don\'t open browser'));
  console.log(chalk.gray('    dashboard --simulation       # Use mock data'));
  console.log();
  console.log(chalk.cyan('━'.repeat(60) + '\n'));
}
