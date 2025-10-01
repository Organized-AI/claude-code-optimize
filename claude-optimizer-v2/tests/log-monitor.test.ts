/**
 * Tests for LogMonitor
 */

import { LogMonitor, LogEntry } from '../src/log-monitor.js';
import * as path from 'path';

describe('LogMonitor', () => {
  const testLogPath = path.join(__dirname, '../docs/log-format-examples.jsonl');

  describe('JSONL Parsing', () => {
    it('should create monitor with valid log path', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      expect(monitor).toBeDefined();
      expect(monitor.getLogPath()).toBe(testLogPath);
    });

    it('should initialize with zero metrics', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      const metrics = monitor.getMetrics();

      expect(metrics.tokensUsed).toBe(0);
      expect(metrics.inputTokens).toBe(0);
      expect(metrics.outputTokens).toBe(0);
      expect(metrics.cacheTokens).toBe(0);
      expect(metrics.estimatedCost).toBe(0);
      expect(metrics.toolCalls).toBe(0);
      expect(metrics.objectivesCompleted).toHaveLength(0);
      expect(metrics.messageCount).toBe(0);
    });

    it('should not be active initially', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      expect(monitor.isActive()).toBe(false);
    });
  });

  describe('Objective Detection', () => {
    it('should detect ✓ Completed: pattern', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      const objectives: string[] = [];

      monitor.on('objective-complete', (obj: string) => {
        objectives.push(obj);
      });

      // Simulate processing text content
      const testText = '✓ Completed: Examine project structure';
      (monitor as any).processTextContent(testText);

      expect(objectives).toContain('Examine project structure');
    });

    it('should detect ✅ Done: pattern', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      const objectives: string[] = [];

      monitor.on('objective-complete', (obj: string) => {
        objectives.push(obj);
      });

      const testText = '✅ Done: Write unit tests for authentication';
      (monitor as any).processTextContent(testText);

      expect(objectives).toContain('Write unit tests for authentication');
    });

    it('should not add duplicate objectives', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      const objectives: string[] = [];

      monitor.on('objective-complete', (obj: string) => {
        objectives.push(obj);
      });

      // Process same objective twice
      (monitor as any).processTextContent('✓ Completed: Create auth module');
      (monitor as any).processTextContent('✓ Completed: Create auth module');

      expect(objectives).toHaveLength(1);
    });
  });

  describe('Token Tracking', () => {
    it('should calculate total tokens correctly', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');

      const usage = {
        input_tokens: 100,
        cache_creation_input_tokens: 50,
        cache_read_input_tokens: 200,
        output_tokens: 75
      };

      (monitor as any).updateTokenMetrics(usage);

      const metrics = monitor.getMetrics();
      expect(metrics.inputTokens).toBe(150); // 100 + 50
      expect(metrics.outputTokens).toBe(75);
      expect(metrics.cacheTokens).toBe(200);
      expect(metrics.tokensUsed).toBe(425); // 150 + 75 + 200
    });

    it('should calculate cost for Sonnet model', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');

      const usage = {
        input_tokens: 10000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 5000
      };

      (monitor as any).updateTokenMetrics(usage);

      const metrics = monitor.getMetrics();
      // Sonnet: $3/M input, $15/M output
      // Input: (10000 / 1000000) * 3 = 0.03
      // Output: (5000 / 1000000) * 15 = 0.075
      // Total: 0.105
      expect(metrics.estimatedCost).toBeCloseTo(0.105, 3);
    });

    it('should calculate cost for Opus model', () => {
      const monitor = new LogMonitor(testLogPath, 'opus');

      const usage = {
        input_tokens: 10000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 5000
      };

      (monitor as any).updateTokenMetrics(usage);

      const metrics = monitor.getMetrics();
      // Opus: $15/M input, $75/M output
      // Input: (10000 / 1000000) * 15 = 0.15
      // Output: (5000 / 1000000) * 75 = 0.375
      // Total: 0.525
      expect(metrics.estimatedCost).toBeCloseTo(0.525, 3);
    });

    it('should apply discount for cache reads', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');

      const usage = {
        input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 10000, // Cache reads are 90% cheaper
        output_tokens: 0
      };

      (monitor as any).updateTokenMetrics(usage);

      const metrics = monitor.getMetrics();
      // Cache read: (10000 / 1000000) * 3 * 0.1 = 0.003
      expect(metrics.estimatedCost).toBeCloseTo(0.003, 4);
    });
  });

  describe('Log Entry Processing', () => {
    it('should increment message count', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');

      const entry: LogEntry = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Test message' }]
        },
        parentUuid: null,
        isSidechain: false,
        userType: 'external',
        cwd: '/test',
        sessionId: 'test-123',
        version: '2.0.1',
        gitBranch: 'main',
        uuid: 'abc-123',
        timestamp: new Date().toISOString()
      };

      (monitor as any).processLogEntry(entry);

      const metrics = monitor.getMetrics();
      expect(metrics.messageCount).toBe(1);
    });

    it('should track tool usage', () => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');
      const toolsUsed: string[] = [];

      monitor.on('tool-use', (tool: any) => {
        toolsUsed.push(tool.name);
      });

      const toolUse = {
        type: 'tool_use' as const,
        id: 'tool-123',
        name: 'Read',
        input: { file_path: '/test/file.ts' }
      };

      (monitor as any).processToolUse(toolUse);

      expect(toolsUsed).toContain('Read');
      expect(monitor.getMetrics().toolCalls).toBe(1);
    });
  });

  describe('Event Emission', () => {
    it('should emit token-update events', (done) => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');

      monitor.on('token-update', (data: any) => {
        expect(data.total).toBeGreaterThan(0);
        expect(data.input).toBeDefined();
        expect(data.output).toBeDefined();
        expect(data.cost).toBeDefined();
        done();
      });

      const usage = {
        input_tokens: 100,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 50
      };

      (monitor as any).updateTokenMetrics(usage);
    });

    it('should emit assistant-message events', (done) => {
      const monitor = new LogMonitor(testLogPath, 'sonnet');

      monitor.on('assistant-message', (text: string) => {
        expect(text).toBe('Hello, this is a test message');
        done();
      });

      (monitor as any).processTextContent('Hello, this is a test message');
    });
  });
});
