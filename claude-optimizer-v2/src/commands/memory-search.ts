#!/usr/bin/env node

/**
 * Memory Search Command
 * Search through project memory for keywords
 */

import * as process from 'process';
import chalk from 'chalk';
import { SessionMemoryManager, SessionHistory } from '../session-memory.js';

export interface SearchOptions {
  keyword: string;
  type?: 'decisions' | 'objectives' | 'tasks' | 'all';
  dateFrom?: Date;
  dateTo?: Date;
  sessionNumber?: number;
}

export interface SearchResults {
  decisions: string[];
  sessions: {
    session: SessionHistory;
    matchedObjectives: string[];
    matchedTasks: string[];
  }[];
}

export class MemorySearch {
  constructor(private memoryManager: SessionMemoryManager) {}

  async search(projectPath: string, options: SearchOptions): Promise<SearchResults> {
    const memory = await this.memoryManager.loadProjectMemory(projectPath);

    const results: SearchResults = {
      decisions: [],
      sessions: []
    };

    const keyword = options.keyword.toLowerCase();

    // Search decisions
    if (!options.type || options.type === 'all' || options.type === 'decisions') {
      results.decisions = memory.cumulativeContext.keyDecisions.filter(d =>
        d.toLowerCase().includes(keyword)
      );
    }

    // Search sessions
    memory.sessions.forEach(session => {
      // Filter by session number
      if (options.sessionNumber && session.sessionNumber !== options.sessionNumber) {
        return;
      }

      // Filter by date range
      if (!this.matchesDateRange(session, options)) {
        return;
      }

      const matchedObjectives: string[] = [];
      const matchedTasks: string[] = [];

      // Search objectives
      if (!options.type || options.type === 'all' || options.type === 'objectives') {
        matchedObjectives.push(
          ...session.objectives.filter(obj => obj.toLowerCase().includes(keyword))
        );
      }

      // Search tasks
      if (!options.type || options.type === 'all' || options.type === 'tasks') {
        matchedTasks.push(
          ...session.completedTasks.filter(task => task.toLowerCase().includes(keyword))
        );
      }

      // Add session if any matches found
      if (matchedObjectives.length > 0 || matchedTasks.length > 0) {
        results.sessions.push({
          session,
          matchedObjectives,
          matchedTasks
        });
      }
    });

    return results;
  }

  private matchesDateRange(session: SessionHistory, options: SearchOptions): boolean {
    const sessionDate = new Date(session.startTime);

    if (options.dateFrom && sessionDate < options.dateFrom) {
      return false;
    }

    if (options.dateTo && sessionDate > options.dateTo) {
      return false;
    }

    return true;
  }

  formatOutput(results: SearchResults, keyword: string): string {
    let output = '\n';
    output += chalk.bold.blue('🔍 Search Results') + chalk.gray(` for "${keyword}"`) + '\n';
    output += chalk.gray('═'.repeat(80)) + '\n\n';

    const totalMatches =
      results.decisions.length +
      results.sessions.reduce(
        (sum, s) => sum + s.matchedObjectives.length + s.matchedTasks.length,
        0
      );

    if (totalMatches === 0) {
      output += chalk.yellow('⚠️  No matches found\n');
      output += chalk.gray(`Try different keywords or search options\n\n`);
      return output;
    }

    // Decisions section
    if (results.decisions.length > 0) {
      output += chalk.bold(`💡 Decisions (${results.decisions.length} found)\n`);
      results.decisions.forEach(decision => {
        output += `  • ${this.highlightKeyword(decision, keyword)}\n`;
      });
      output += '\n';
    }

    // Sessions section
    if (results.sessions.length > 0) {
      output += chalk.bold(`📝 Sessions (${results.sessions.length} found)\n\n`);

      results.sessions.forEach(({ session, matchedObjectives, matchedTasks }) => {
        output += chalk.cyan(`  Session ${session.sessionNumber}`) + chalk.gray(` - ${new Date(session.startTime).toLocaleDateString()}`) + '\n';
        output += chalk.gray(`    Tokens: ${session.tokensUsed.toLocaleString()}`);
        output += chalk.gray(` | Files: ${session.filesModified.length}`) + '\n';

        if (matchedObjectives.length > 0) {
          output += chalk.bold('    Objectives:\n');
          matchedObjectives.forEach(obj => {
            output += `      • ${this.highlightKeyword(obj, keyword)}\n`;
          });
        }

        if (matchedTasks.length > 0) {
          output += chalk.bold('    Tasks:\n');
          matchedTasks.forEach(task => {
            output += `      ✓ ${this.highlightKeyword(task, keyword)}\n`;
          });
        }

        output += '\n';
      });
    }

    output += chalk.gray(`Total matches: ${totalMatches}\n\n`);

    return output;
  }

  private highlightKeyword(text: string, keyword: string): string {
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, chalk.yellow.bold('$1'));
  }

  formatJson(results: SearchResults): string {
    return JSON.stringify(results, null, 2);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const keyword = args.find(arg => !arg.startsWith('--'));
  if (!keyword) {
    console.error(chalk.red('❌ Error: Keyword required'));
    console.log(chalk.gray('\nUsage:'));
    console.log('  memory-search <keyword> [options]');
    console.log('\nOptions:');
    console.log('  --type <decisions|objectives|tasks|all>  Search specific type');
    console.log('  --from <YYYY-MM-DD>                      Start date');
    console.log('  --to <YYYY-MM-DD>                        End date');
    console.log('  --session <number>                       Specific session');
    console.log('  --json                                   JSON output\n');
    process.exit(1);
  }

  const jsonMode = args.includes('--json');
  const typeArg = args.indexOf('--type');
  const fromArg = args.indexOf('--from');
  const toArg = args.indexOf('--to');
  const sessionArg = args.indexOf('--session');

  const options: SearchOptions = {
    keyword,
    type: typeArg !== -1 ? args[typeArg + 1] as any : 'all',
    dateFrom: fromArg !== -1 ? new Date(args[fromArg + 1]) : undefined,
    dateTo: toArg !== -1 ? new Date(args[toArg + 1]) : undefined,
    sessionNumber: sessionArg !== -1 ? parseInt(args[sessionArg + 1], 10) : undefined
  };

  // Get project path
  const projectPath = process.cwd();
  const memoryManager = new SessionMemoryManager();
  const search = new MemorySearch(memoryManager);

  try {
    const results = await search.search(projectPath, options);

    if (jsonMode) {
      console.log(search.formatJson(results));
    } else {
      console.log(search.formatOutput(results, keyword));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('❌ Error:'), error.message);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
