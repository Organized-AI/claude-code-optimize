#!/usr/bin/env node

/**
 * Memory Import Command
 * Import project memory from JSON file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import chalk from 'chalk';
import { SessionMemoryManager, ProjectMemory, SessionHistory } from '../session-memory.js';
import { MemoryExportData } from './memory-export.js';

export type ImportStrategy = 'merge' | 'replace';

export class MemoryImport {
  constructor(private memoryManager: SessionMemoryManager) {}

  async import(
    projectPath: string,
    importPath: string,
    strategy: ImportStrategy = 'merge'
  ): Promise<void> {
    // Validate import file
    if (!fs.existsSync(importPath)) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    const importData = JSON.parse(fs.readFileSync(importPath, 'utf8')) as MemoryExportData;

    // Validate format
    if (!importData.version || !importData.memory) {
      throw new Error('Invalid import file format');
    }

    // Version check
    if (importData.version !== '1.0.0') {
      console.warn(chalk.yellow(`⚠️  Warning: Import file version ${importData.version} may be incompatible`));
    }

    if (strategy === 'replace') {
      // Direct replacement
      await this.persistMemory(importData.memory, projectPath);
    } else {
      // Merge strategy
      const existing = await this.memoryManager.loadProjectMemory(projectPath);
      const merged = this.mergeMemories(existing, importData.memory);
      await this.persistMemory(merged, projectPath);
    }
  }

  private mergeMemories(existing: ProjectMemory, imported: ProjectMemory): ProjectMemory {
    // Merge sessions (avoid duplicates by sessionId)
    const sessionMap = new Map<string, SessionHistory>();

    // Add existing sessions
    existing.sessions.forEach(s => {
      sessionMap.set(s.sessionId, s);
    });

    // Add/overwrite with imported sessions
    imported.sessions.forEach(s => {
      sessionMap.set(s.sessionId, s);
    });

    const mergedSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Merge decisions (avoid duplicates)
    const decisionsSet = new Set<string>([
      ...existing.cumulativeContext.keyDecisions,
      ...imported.cumulativeContext.keyDecisions
    ]);

    // Merge patterns (avoid duplicates)
    const patternsSet = new Set<string>([
      ...existing.cumulativeContext.commonPatterns,
      ...imported.cumulativeContext.commonPatterns
    ]);

    // Use the most recent tech stack
    const latestTechStack =
      new Date(existing.lastSessionAt) > new Date(imported.lastSessionAt)
        ? existing.cumulativeContext.techStack
        : imported.cumulativeContext.techStack;

    // Create merged memory
    return {
      projectPath: existing.projectPath,
      projectName: existing.projectName,
      createdAt: new Date(
        Math.min(
          new Date(existing.createdAt).getTime(),
          new Date(imported.createdAt).getTime()
        )
      ),
      lastSessionAt: new Date(
        Math.max(
          new Date(existing.lastSessionAt).getTime(),
          new Date(imported.lastSessionAt).getTime()
        )
      ),
      totalSessions: mergedSessions.length,
      sessions: mergedSessions,
      cumulativeContext: {
        techStack: latestTechStack,
        architecture: existing.cumulativeContext.architecture || imported.cumulativeContext.architecture,
        testingFramework: existing.cumulativeContext.testingFramework || imported.cumulativeContext.testingFramework,
        buildSystem: existing.cumulativeContext.buildSystem || imported.cumulativeContext.buildSystem,
        keyDecisions: Array.from(decisionsSet),
        commonPatterns: Array.from(patternsSet)
      }
    };
  }

  private async persistMemory(memory: ProjectMemory, projectPath: string): Promise<void> {
    // Use the SessionMemoryManager's private method via reflection
    // This is a workaround since persistMemory is private
    const memoryManager = this.memoryManager as any;
    memory.projectPath = projectPath;
    await memoryManager.persistMemory(memory);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  // Get import path
  const importPath = args.find(arg => !arg.startsWith('--'));
  if (!importPath) {
    console.error(chalk.red('❌ Error: Import file required'));
    console.log(chalk.gray('\nUsage:'));
    console.log('  memory-import <import-file.json> [options]');
    console.log('\nOptions:');
    console.log('  --replace         Replace current memory (default: merge)');
    console.log('  --project <path>  Target project path (default: current directory)');
    console.log('\nExamples:');
    console.log('  memory-import backup.json');
    console.log('  memory-import backup.json --replace');
    console.log('  memory-import backup.json --project /path/to/project\n');
    process.exit(1);
  }

  const strategy: ImportStrategy = args.includes('--replace') ? 'replace' : 'merge';

  // Get project path
  let projectPath = process.cwd();
  const projectArg = args.indexOf('--project');
  if (projectArg !== -1 && args[projectArg + 1]) {
    projectPath = path.resolve(args[projectArg + 1]);
  }

  const resolvedImportPath = path.resolve(importPath);
  const memoryManager = new SessionMemoryManager();
  const importer = new MemoryImport(memoryManager);

  try {
    console.log(chalk.blue('📥 Importing memory...'));
    console.log(chalk.gray(`  Source:   ${resolvedImportPath}`));
    console.log(chalk.gray(`  Project:  ${projectPath}`));
    console.log(chalk.gray(`  Strategy: ${strategy}`));
    console.log();

    await importer.import(projectPath, resolvedImportPath, strategy);

    console.log(chalk.green('✅ Import complete!'));
    console.log();

    if (strategy === 'merge') {
      console.log(chalk.yellow('ℹ️  Sessions were merged. Use --replace to overwrite completely.'));
    }
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
