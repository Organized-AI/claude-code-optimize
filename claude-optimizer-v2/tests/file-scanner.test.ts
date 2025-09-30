/**
 * File Scanner Unit Tests
 * Comprehensive test coverage for the file scanning utility
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FileScanner } from '../src/utils/file-scanner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FileScanner', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures');
  const scanner = new FileScanner();

  beforeAll(async () => {
    // Create test fixtures
    await fs.mkdir(testDir, { recursive: true });

    // Create a simple test project structure
    await fs.mkdir(path.join(testDir, 'simple-project'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'simple-project', 'src'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'simple-project', 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.18.0'
        }
      })
    );
    await fs.writeFile(
      path.join(testDir, 'simple-project', 'src', 'index.ts'),
      'console.log("Hello World");'
    );
    await fs.writeFile(
      path.join(testDir, 'simple-project', 'src', 'App.tsx'),
      'export function App() { return <div>Test</div>; }'
    );
    await fs.writeFile(
      path.join(testDir, 'simple-project', 'README.md'),
      '# Test Project\n\nThis is a test.'
    );

    // Create a project with tests
    await fs.mkdir(path.join(testDir, 'project-with-tests'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'project-with-tests', 'tests'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'project-with-tests', 'tests', 'app.test.ts'),
      'import { test } from "vitest";'
    );
    await fs.writeFile(
      path.join(testDir, 'project-with-tests', 'index.js'),
      'console.log("test");'
    );

    // Create a project with node_modules (should be ignored)
    await fs.mkdir(path.join(testDir, 'project-with-deps'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'project-with-deps', 'node_modules'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'project-with-deps', 'node_modules', 'some-dep.js'),
      '// This should be ignored'
    );
    await fs.writeFile(
      path.join(testDir, 'project-with-deps', 'app.js'),
      'console.log("app");'
    );
  });

  afterAll(async () => {
    // Clean up test fixtures
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('scanProject', () => {
    it('should scan a simple project successfully', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(metadata).toBeDefined();
      expect(metadata.fileCount).toBeGreaterThan(0);
      expect(metadata.totalSizeKB).toBeGreaterThanOrEqual(0);
    });

    it('should detect languages correctly', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(metadata.languages).toContain('TypeScript');
      expect(metadata.languages).toContain('TypeScript React');
    });

    it('should detect technologies from package.json', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(metadata.technologies).toContain('React');
      expect(metadata.technologies).toContain('Express');
    });

    it('should identify key files', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(metadata.keyFiles).toContain('package.json');
    });

    it('should detect documentation', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(metadata.hasDocs).toBe(true);
    });

    it('should detect test files', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'project-with-tests'));

      expect(metadata.hasTests).toBe(true);
    });

    it('should ignore node_modules directory', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'project-with-deps'));

      // Should only count app.js, not the file in node_modules
      expect(metadata.fileCount).toBe(1);
    });

    it('should handle empty directories gracefully', async () => {
      const emptyDir = path.join(testDir, 'empty-project');
      await fs.mkdir(emptyDir, { recursive: true });

      const metadata = await scanner.scanProject(emptyDir);

      expect(metadata.fileCount).toBe(0);
      expect(metadata.languages).toEqual([]);
      expect(metadata.hasTests).toBe(false);
      expect(metadata.hasDocs).toBe(false);

      await fs.rm(emptyDir, { recursive: true });
    });

    it('should handle non-existent directory gracefully', async () => {
      // File scanner returns empty metadata instead of throwing
      const metadata = await scanner.scanProject('/path/that/does/not/exist');

      expect(metadata.fileCount).toBe(0);
      expect(metadata.languages).toEqual([]);
    });
  });

  describe('language detection', () => {
    it('should detect multiple languages in same project', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(metadata.languages.length).toBeGreaterThan(0);
      expect(Array.isArray(metadata.languages)).toBe(true);
    });

    it('should not detect languages from ignored directories', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'project-with-deps'));

      // Should not include any files from node_modules
      expect(metadata.languages).not.toContain('node_modules');
    });
  });

  describe('size calculation', () => {
    it('should calculate project size in KB', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(typeof metadata.totalSizeKB).toBe('number');
      expect(metadata.totalSizeKB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('directory structure', () => {
    it('should map directory structure', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'simple-project'));

      expect(Array.isArray(metadata.directories)).toBe(true);
      expect(metadata.directories.length).toBeGreaterThan(0);
    });

    it('should not include ignored directories in structure', async () => {
      const metadata = await scanner.scanProject(path.join(testDir, 'project-with-deps'));

      expect(metadata.directories).not.toContain('node_modules');
    });
  });
});
