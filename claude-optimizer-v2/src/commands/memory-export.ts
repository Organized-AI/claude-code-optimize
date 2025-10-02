#!/usr/bin/env node

/**
 * Memory Export Command
 * Export project memory to JSON file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as process from 'process';
import chalk from 'chalk';
import { SessionMemoryManager, ProjectMemory } from '../session-memory.js';

export interface MemoryExportData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  source: string;
  memory: ProjectMemory;
}

export class MemoryExport {
  constructor(private memoryManager: SessionMemoryManager) {}

  async export(projectPath: string, outputPath: string): Promise<void> {
    const memory = await this.memoryManager.loadProjectMemory(projectPath);

    const exportData: MemoryExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: os.userInfo().username,
      source: projectPath,
      memory
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write export file
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  getExportStats(exportPath: string): {
    size: number;
    sessions: number;
    decisions: number;
    files: number;
  } {
    const stats = fs.statSync(exportPath);
    const content = JSON.parse(fs.readFileSync(exportPath, 'utf8')) as MemoryExportData;

    const uniqueFiles = new Set<string>();
    content.memory.sessions.forEach(s => {
      s.filesModified.forEach(f => uniqueFiles.add(f));
    });

    return {
      size: stats.size,
      sessions: content.memory.totalSessions,
      decisions: content.memory.cumulativeContext.keyDecisions.length,
      files: uniqueFiles.size
    };
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  // Get output path
  const outputPath = args.find(arg => !arg.startsWith('--'));
  if (!outputPath) {
    console.error(chalk.red('❌ Error: Output path required'));
    console.log(chalk.gray('\nUsage:'));
    console.log('  memory-export <output-file.json> [project-path]');
    console.log('\nExamples:');
    console.log('  memory-export backup.json');
    console.log('  memory-export /path/to/backup.json /path/to/project\n');
    process.exit(1);
  }

  // Get project path (current directory by default)
  let projectPath = process.cwd();
  const pathArg = args.find((arg, i) => i > 0 && !arg.startsWith('--'));
  if (pathArg) {
    projectPath = path.resolve(pathArg);
  }

  const resolvedOutputPath = path.resolve(outputPath);
  const memoryManager = new SessionMemoryManager();
  const exporter = new MemoryExport(memoryManager);

  try {
    console.log(chalk.blue('📤 Exporting memory...'));
    console.log(chalk.gray(`  Project: ${projectPath}`));
    console.log(chalk.gray(`  Output:  ${resolvedOutputPath}`));
    console.log();

    await exporter.export(projectPath, resolvedOutputPath);

    const stats = exporter.getExportStats(resolvedOutputPath);

    console.log(chalk.green('✅ Export complete!'));
    console.log();
    console.log(chalk.bold('Export Stats:'));
    console.log(`  File Size:  ${chalk.cyan((stats.size / 1024).toFixed(2))} KB`);
    console.log(`  Sessions:   ${chalk.cyan(stats.sessions)}`);
    console.log(`  Decisions:  ${chalk.cyan(stats.decisions)}`);
    console.log(`  Files:      ${chalk.cyan(stats.files)}`);
    console.log();
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
