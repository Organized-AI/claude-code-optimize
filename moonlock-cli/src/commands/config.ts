import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { ConfigService } from '../services/config';
import { CommandOptions } from '../types';

export async function ConfigCommand(options: CommandOptions) {
  const configService = new ConfigService();
  
  if (options.set) {
    await setConfig(configService, options.set);
  } else if (options.get) {
    await getConfig(configService, options.get);
  } else if (options.list) {
    await listConfig(configService);
  } else {
    // Interactive mode
    const choice = await prompts({
      type: 'select',
      name: 'action',
      message: 'Configuration options:',
      choices: [
        { title: 'View all settings', value: 'list' },
        { title: 'Update settings', value: 'update' },
        { title: 'Reset to defaults', value: 'reset' },
        { title: 'Import/Export config', value: 'io' }
      ]
    });
    
    switch (choice.action) {
      case 'list':
        await listConfig(configService);
        break;
      case 'update':
        await interactiveUpdate(configService);
        break;
      case 'reset':
        await resetConfig(configService);
        break;
      case 'io':
        await importExportConfig(configService);
        break;
    }
  }
}

async function setConfig(configService: ConfigService, keyValue: string) {
  const [key, ...valueParts] = keyValue.split('=');
  const value = valueParts.join('=');
  
  if (!key || !value) {
    console.error(chalk.red('Invalid format. Use: key=value'));
    return;
  }
  
  const spinner = ora(`Setting ${key}...`).start();
  
  try {
    await configService.set(key.trim(), parseValue(value.trim()));
    spinner.succeed(`Configuration updated: ${chalk.cyan(key)} = ${chalk.yellow(value)}`);
    
  } catch (error) {
    spinner.fail(`Failed to set ${key}`);
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function getConfig(configService: ConfigService, key: string) {
  const spinner = ora(`Getting ${key}...`).start();
  
  try {
    const value = await configService.get(key);
    spinner.stop();
    
    if (value === undefined) {
      console.log(chalk.yellow(`Configuration key '${key}' not found.`));
    } else {
      console.log(`${chalk.cyan(key)}: ${chalk.yellow(JSON.stringify(value, null, 2))}`);
    }
    
  } catch (error) {
    spinner.fail(`Failed to get ${key}`);
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function listConfig(configService: ConfigService) {
  const spinner = ora('Loading configuration...').start();
  
  try {
    const config = await configService.getAll();
    spinner.stop();
    
    console.log(chalk.bold('\n⚙️  Configuration Settings\n'));
    
    // Tracking settings
    console.log(chalk.blue('Tracking:'));
    console.log(`  Enabled: ${formatBoolean(config.tracking.enabled)}`);
    console.log(`  Auto Start: ${formatBoolean(config.tracking.autoStart)}`);
    console.log(`  Save History: ${formatBoolean(config.tracking.saveHistory)}`);
    console.log(`  Max History Items: ${chalk.yellow(config.tracking.maxHistoryItems)}`);
    console.log();
    
    // Notification settings
    console.log(chalk.blue('Notifications:'));
    console.log(`  Quota Warnings: ${formatBoolean(config.notifications.quotaWarnings)}`);
    console.log(`  Session Reminders: ${formatBoolean(config.notifications.sessionReminders)}`);
    console.log(`  Daily Summary: ${formatBoolean(config.notifications.dailySummary)}`);
    console.log();
    
    // Display settings
    console.log(chalk.blue('Display:'));
    console.log(`  Theme: ${chalk.magenta(config.display.theme)}`);
    console.log(`  Verbose: ${formatBoolean(config.display.verbose)}`);
    console.log(`  Show Progress: ${formatBoolean(config.display.showProgress)}`);
    console.log();
    
    // API settings
    if (config.apiEndpoint) {
      console.log(chalk.blue('API:'));
      console.log(`  Endpoint: ${chalk.gray(config.apiEndpoint)}`);
    }
    
  } catch (error) {
    spinner.fail('Failed to load configuration');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function interactiveUpdate(configService: ConfigService) {
  try {
    const currentConfig = await configService.getAll();
    
    const updates = await prompts([
      {
        type: 'toggle',
        name: 'trackingEnabled',
        message: 'Enable token tracking?',
        initial: currentConfig.tracking.enabled,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'toggle',
        name: 'autoStart',
        message: 'Auto-start sessions?',
        initial: currentConfig.tracking.autoStart,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'number',
        name: 'maxHistory',
        message: 'Maximum history items to keep:',
        initial: currentConfig.tracking.maxHistoryItems,
        min: 10,
        max: 1000
      },
      {
        type: 'select',
        name: 'theme',
        message: 'Display theme:',
        choices: [
          { title: 'Auto', value: 'auto' },
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' }
        ],
        initial: ['auto', 'light', 'dark'].indexOf(currentConfig.display.theme)
      },
      {
        type: 'toggle',
        name: 'quotaWarnings',
        message: 'Enable quota warnings?',
        initial: currentConfig.notifications.quotaWarnings,
        active: 'yes',
        inactive: 'no'
      }
    ]);
    
    const spinner = ora('Updating configuration...').start();
    
    // Apply updates
    await configService.update({
      tracking: {
        ...currentConfig.tracking,
        enabled: updates.trackingEnabled,
        autoStart: updates.autoStart,
        maxHistoryItems: updates.maxHistory
      },
      display: {
        ...currentConfig.display,
        theme: updates.theme
      },
      notifications: {
        ...currentConfig.notifications,
        quotaWarnings: updates.quotaWarnings
      }
    });
    
    spinner.succeed('Configuration updated successfully!');
    
  } catch (error) {
    console.error(chalk.red('Error updating configuration:'), error instanceof Error ? error.message : String(error));
  }
}

async function resetConfig(configService: ConfigService) {
  const confirmation = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Reset all settings to defaults? This cannot be undone.',
    initial: false
  });
  
  if (!confirmation.value) {
    console.log(chalk.yellow('Reset cancelled.'));
    return;
  }
  
  const spinner = ora('Resetting configuration...').start();
  
  try {
    await configService.resetToDefaults();
    spinner.succeed('Configuration reset to defaults!');
    
  } catch (error) {
    spinner.fail('Failed to reset configuration');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
  }
}

async function importExportConfig(configService: ConfigService) {
  const choice = await prompts({
    type: 'select',
    name: 'action',
    message: 'Import or export configuration?',
    choices: [
      { title: 'Export current config', value: 'export' },
      { title: 'Import config from file', value: 'import' }
    ]
  });
  
  if (choice.action === 'export') {
    const spinner = ora('Exporting configuration...').start();
    
    try {
      const configPath = await configService.exportConfig();
      spinner.succeed(`Configuration exported to: ${chalk.cyan(configPath)}`);
      
    } catch (error) {
      spinner.fail('Failed to export configuration');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
    
  } else if (choice.action === 'import') {
    const filePath = await prompts({
      type: 'text',
      name: 'path',
      message: 'Path to configuration file:'
    });
    
    if (!filePath.path) return;
    
    const spinner = ora('Importing configuration...').start();
    
    try {
      await configService.importConfig(filePath.path);
      spinner.succeed('Configuration imported successfully!');
      
    } catch (error) {
      spinner.fail('Failed to import configuration');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  }
}

function formatBoolean(value: boolean): string {
  return value ? chalk.green('enabled') : chalk.red('disabled');
}

function parseValue(value: string): any {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If not JSON, return as string
    return value;
  }
}