#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { StatusCommand } from './commands/status';
import { SessionCommand } from './commands/session';
import { TokenCommand } from './commands/token';
import { ConfigCommand } from './commands/config';

const program = new Command();

program
  .name('moonlock')
  .description('CLI tool for Claude Code optimization and token tracking')
  .version('1.0.0');

program
  .command('status')
  .description('Show current Claude Code usage status')
  .action(StatusCommand);

program
  .command('session')
  .description('Manage Claude Code sessions')
  .option('-s, --start', 'Start a new session')
  .option('-e, --end', 'End current session')
  .option('-l, --list', 'List recent sessions')
  .action(SessionCommand);

program
  .command('tokens')
  .description('Token tracking and management')
  .option('-c, --current', 'Show current token usage')
  .option('-h, --history', 'Show token usage history')
  .option('-r, --reset', 'Reset token counter')
  .action(TokenCommand);

program
  .command('config')
  .description('Configure Moonlock CLI settings')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-l, --list', 'List all configuration')
  .action(ConfigCommand);

program.parse();