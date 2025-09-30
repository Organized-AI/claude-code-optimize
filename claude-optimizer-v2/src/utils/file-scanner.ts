/**
 * File Scanner Utility
 * Recursively scans project directories and gathers metadata
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ProjectMetadata, LanguageMap } from '../types.js';

export class FileScanner {
  private readonly LANGUAGE_MAP: LanguageMap = {
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'js': 'JavaScript',
    'jsx': 'JavaScript React',
    'py': 'Python',
    'go': 'Go',
    'rs': 'Rust',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'rb': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'dart': 'Dart',
    'scala': 'Scala',
    'cs': 'C#'
  };

  private readonly IGNORE_PATTERNS = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.next/,
    /coverage/,
    /\.cache/,
    /\.vscode/,
    /\.idea/,
    /\.DS_Store/,
    /package-lock\.json/,
    /yarn\.lock/,
    /pnpm-lock\.yaml/,
    /__pycache__/,
    /\.pytest_cache/,
    /\.pyc$/,
    /target\//,  // Rust/Java
    /out\//,     // General output
    /tmp\//,
    /temp\//
  ];

  private readonly KEY_FILES = [
    'package.json',
    'tsconfig.json',
    'Cargo.toml',
    'go.mod',
    'requirements.txt',
    'setup.py',
    'Pipfile',
    'build.gradle',
    'pom.xml',
    'Gemfile',
    'composer.json',
    'Makefile',
    'CMakeLists.txt'
  ];

  /**
   * Main entry point: Scan a project and return metadata
   */
  async scanProject(projectPath: string): Promise<ProjectMetadata> {
    console.log('  📂 Scanning project files...');

    // 1. Get all files recursively
    const allFiles = await this.getAllFiles(projectPath);

    // 2. Filter out ignored files
    const relevantFiles = this.filterRelevantFiles(allFiles);

    console.log(`  ✓ Found ${relevantFiles.length} relevant files`);

    // 3. Detect languages
    const languages = this.detectLanguages(relevantFiles);

    // 4. Identify key configuration files
    const keyFiles = this.identifyKeyFiles(relevantFiles);

    // 5. Detect technologies from package files
    const technologies = await this.detectTechnologies(projectPath, keyFiles);

    // 6. Calculate total size
    const totalSizeKB = await this.calculateTotalSize(relevantFiles);

    // 7. Check for tests and documentation
    const hasTests = this.hasTestFiles(relevantFiles);
    const hasDocs = this.hasDocumentation(relevantFiles);

    // 8. Get directory structure (top-level only)
    const directories = this.getDirectoryStructure(projectPath, relevantFiles);

    return {
      fileCount: relevantFiles.length,
      totalSizeKB,
      languages,
      technologies,
      keyFiles: keyFiles.map(f => path.relative(projectPath, f)),
      hasTests,
      hasDocs,
      directories
    };
  }

  /**
   * Recursively get all files in a directory
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip if matches ignore pattern
        if (this.shouldIgnore(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recurse into subdirectory
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`  ⚠️  Error reading directory ${dir}:`, (error as Error).message);
    }

    return files;
  }

  /**
   * Filter out files matching ignore patterns
   */
  private filterRelevantFiles(files: string[]): string[] {
    return files.filter(file => !this.shouldIgnore(file));
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(filePath: string): boolean {
    return this.IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
  }

  /**
   * Detect programming languages from file extensions
   */
  private detectLanguages(files: string[]): string[] {
    const extensions = new Set<string>();

    for (const file of files) {
      const ext = path.extname(file).slice(1); // Remove leading dot
      if (ext && this.LANGUAGE_MAP[ext]) {
        extensions.add(this.LANGUAGE_MAP[ext]);
      }
    }

    return Array.from(extensions).sort();
  }

  /**
   * Identify key configuration/build files
   */
  private identifyKeyFiles(files: string[]): string[] {
    return files.filter(file => {
      const basename = path.basename(file);
      return this.KEY_FILES.includes(basename);
    });
  }

  /**
   * Detect technologies from package files
   */
  private async detectTechnologies(_projectPath: string, keyFiles: string[]): Promise<string[]> {
    const technologies: string[] = [];

    // Check package.json for Node.js projects
    const packageJson = keyFiles.find(f => f.endsWith('package.json'));
    if (packageJson) {
      try {
        const content = await fs.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);

        // Extract framework/library info
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Frontend Frameworks
        if (deps.react) technologies.push('React');
        if (deps.vue) technologies.push('Vue');
        if (deps['@angular/core']) technologies.push('Angular');
        if (deps.svelte) technologies.push('Svelte');
        if (deps['solid-js']) technologies.push('Solid.js');
        if (deps.preact) technologies.push('Preact');

        // Meta Frameworks
        if (deps.next) technologies.push('Next.js');
        if (deps.nuxt) technologies.push('Nuxt.js');
        if (deps['@remix-run/react']) technologies.push('Remix');
        if (deps.astro) technologies.push('Astro');
        if (deps.gatsby) technologies.push('Gatsby');
        if (deps['@sveltejs/kit']) technologies.push('SvelteKit');

        // Backend Frameworks
        if (deps.express) technologies.push('Express');
        if (deps.fastify) technologies.push('Fastify');
        if (deps['@nestjs/core']) technologies.push('NestJS');
        if (deps.koa) technologies.push('Koa');
        if (deps.hapi) technologies.push('Hapi');
        if (deps.trpc || deps['@trpc/server']) technologies.push('tRPC');

        // Build Tools
        if (deps.vite) technologies.push('Vite');
        if (deps.webpack) technologies.push('Webpack');
        if (deps.rollup) technologies.push('Rollup');
        if (deps.esbuild) technologies.push('esbuild');
        if (deps.turbopack) technologies.push('Turbopack');

        // State Management
        if (deps.redux || deps['@reduxjs/toolkit']) technologies.push('Redux');
        if (deps.zustand) technologies.push('Zustand');
        if (deps.mobx) technologies.push('MobX');
        if (deps.jotai) technologies.push('Jotai');
        if (deps.recoil) technologies.push('Recoil');

        // Testing
        if (deps.jest) technologies.push('Jest');
        if (deps.vitest) technologies.push('Vitest');
        if (deps.mocha) technologies.push('Mocha');
        if (deps.cypress) technologies.push('Cypress');
        if (deps.playwright) technologies.push('Playwright');
        if (deps['@testing-library/react']) technologies.push('React Testing Library');

        // ORMs & Databases
        if (deps.prisma || deps['@prisma/client']) technologies.push('Prisma ORM');
        if (deps.sequelize) technologies.push('Sequelize ORM');
        if (deps.typeorm) technologies.push('TypeORM');
        if (deps.mongoose) technologies.push('Mongoose');
        if (deps['drizzle-orm']) technologies.push('Drizzle ORM');

        // Utilities
        if (deps.typescript) technologies.push('TypeScript');
        if (deps.tailwindcss) technologies.push('Tailwind CSS');
        if (deps['@tanstack/react-query']) technologies.push('TanStack Query');
        if (deps['socket.io']) technologies.push('Socket.IO');
        if (deps.graphql || deps['@apollo/client']) technologies.push('GraphQL');
        if (deps.zod) technologies.push('Zod');
        if (deps.yup) technologies.push('Yup');
      } catch (error) {
        // Ignore parse errors
      }
    }

    // Check for Python frameworks
    const requirementsTxt = keyFiles.find(f => f.endsWith('requirements.txt'));
    if (requirementsTxt) {
      try {
        const content = await fs.readFile(requirementsTxt, 'utf-8');
        if (content.includes('django')) technologies.push('Django');
        if (content.includes('flask')) technologies.push('Flask');
        if (content.includes('fastapi')) technologies.push('FastAPI');
        if (content.includes('numpy') || content.includes('pandas')) {
          technologies.push('Data Science');
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Check for Cargo.toml (Rust)
    if (keyFiles.some(f => f.endsWith('Cargo.toml'))) {
      technologies.push('Cargo');
    }

    // Check for Go modules
    if (keyFiles.some(f => f.endsWith('go.mod'))) {
      technologies.push('Go Modules');
    }

    return technologies;
  }

  /**
   * Calculate total size of all files in KB
   */
  private async calculateTotalSize(files: string[]): Promise<number> {
    let totalBytes = 0;

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        totalBytes += stats.size;
      } catch (error) {
        // Skip files we can't stat
      }
    }

    return Math.round(totalBytes / 1024); // Convert to KB
  }

  /**
   * Check if project has test files
   */
  private hasTestFiles(files: string[]): boolean {
    return files.some(file => {
      const basename = path.basename(file).toLowerCase();
      return (
        basename.includes('test') ||
        basename.includes('spec') ||
        file.includes('__tests__') ||
        file.includes('/tests/') ||
        file.includes('/test/')
      );
    });
  }

  /**
   * Check if project has documentation
   */
  private hasDocumentation(files: string[]): boolean {
    return files.some(file => {
      const basename = path.basename(file);
      return (
        basename === 'README.md' ||
        basename === 'README.rst' ||
        basename === 'CONTRIBUTING.md' ||
        file.includes('/docs/') ||
        file.includes('/documentation/')
      );
    });
  }

  /**
   * Get top-level directory structure
   */
  private getDirectoryStructure(projectPath: string, files: string[]): string[] {
    const dirSet = new Set<string>();

    for (const file of files) {
      const relative = path.relative(projectPath, file);
      const parts = relative.split(path.sep);

      // Add top-level directory
      if (parts.length > 1) {
        dirSet.add(parts[0]);
      }
    }

    return Array.from(dirSet).sort();
  }
}
