/**
 * Tests for SessionLauncher
 */

import { SessionLauncher } from '../src/session-launcher.js';
import { SessionConfig } from '../src/types.js';
import * as path from 'path';
import * as os from 'os';

describe('SessionLauncher', () => {
  let launcher: SessionLauncher;

  beforeEach(() => {
    launcher = new SessionLauncher();
  });

  describe('Log File Path Generation', () => {
    it('should generate correct log file path for simple project', () => {
      const projectPath = '/Users/test/my-project';
      const sessionId = '12345678-1234-1234-1234-123456789abc';

      // Access private method via any cast for testing
      const logPath = (launcher as any).getLogFilePath(projectPath, sessionId);

      const expected = path.join(
        os.homedir(),
        '.claude',
        'projects',
        '-Users-test-my-project',
        `${sessionId}.jsonl`
      );

      expect(logPath).toBe(expected);
    });

    it('should encode spaces in project path', () => {
      const projectPath = '/Users/test/My Project Name';
      const sessionId = 'test-session-id';

      const logPath = (launcher as any).getLogFilePath(projectPath, sessionId);

      expect(logPath).toContain('-Users-test-My-Project-Name');
    });

    it('should handle complex paths with multiple segments', () => {
      const projectPath = '/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/Projects/test';
      const sessionId = 'abc-123';

      const logPath = (launcher as any).getLogFilePath(projectPath, sessionId);

      // Check encoding
      expect(logPath).toContain('-Users-jordaaan-Library-Mobile-Documents');
      expect(logPath).toContain('com~apple~CloudDocs-Projects-test');
      expect(logPath).toContain(`${sessionId}.jsonl`);
    });
  });

  describe('Instruction Building', () => {
    it('should build well-formatted instructions', () => {
      const config: SessionConfig = {
        projectPath: '/test/project',
        projectName: 'Test Project',
        phase: 'Implementation',
        model: 'sonnet',
        tokenBudget: 50000,
        tools: ['Edit', 'Bash', 'Read'],
        objectives: [
          'Create authentication module',
          'Write unit tests',
          'Update documentation'
        ]
      };

      const instructions = (launcher as any).buildInstructions(config);

      // Check key elements
      expect(instructions).toContain('# Implementation - Test Project');
      expect(instructions).toContain('## Session Objectives');
      expect(instructions).toContain('1. Create authentication module');
      expect(instructions).toContain('2. Write unit tests');
      expect(instructions).toContain('3. Update documentation');
      expect(instructions).toContain('Token Budget: 50,000 tokens');
      expect(instructions).toContain('Model: sonnet');
      expect(instructions).toContain('✓ Completed:');
      expect(instructions).toContain('BEGIN SESSION NOW');
    });

    it('should handle empty objectives gracefully', () => {
      const config: SessionConfig = {
        projectPath: '/test',
        projectName: 'Test',
        phase: 'Setup',
        model: 'haiku',
        tokenBudget: 10000,
        tools: [],
        objectives: []
      };

      const instructions = (launcher as any).buildInstructions(config);

      expect(instructions).toContain('# Setup - Test');
      expect(instructions).toContain('Token Budget: 10,000 tokens');
    });
  });

  describe('Static Methods', () => {
    it('should parse log file path correctly', () => {
      const logPath = path.join(
        os.homedir(),
        '.claude',
        'projects',
        '-Users-test-my-project',
        'abc-123.jsonl'
      );

      const result = SessionLauncher.parseLogFilePath(logPath);

      expect(result).toBeDefined();
      expect(result?.projectPath).toBe('/Users/test/my/project');
      expect(result?.sessionId).toBe('abc-123');
    });

    it('should return null for invalid log path', () => {
      const invalidPath = '/some/random/path.txt';
      const result = SessionLauncher.parseLogFilePath(invalidPath);

      expect(result).toBeNull();
    });
  });

  describe('Active Session Management', () => {
    it('should track active session', () => {
      expect(launcher.getActiveSession()).toBeNull();

      // Note: We can't test actual session launch without mocking spawn
      // This is more of a structural test
    });

    it('should clear active session', () => {
      launcher.clearActiveSession();
      expect(launcher.getActiveSession()).toBeNull();
    });
  });
});
