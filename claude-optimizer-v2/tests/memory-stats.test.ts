import { describe, it, expect, beforeEach } from 'vitest';
import { SessionMemoryManager } from '../src/session-memory.js';
import { MemoryStats } from '../src/commands/memory-stats.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('MemoryStats', () => {
  const testDir = path.join(os.tmpdir(), 'claude-test-stats-' + Date.now());
  const testProject = path.join(testDir, 'test-project');
  let memoryManager: SessionMemoryManager;
  let stats: MemoryStats;

  beforeEach(async () => {
    // Clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testProject, { recursive: true });

    memoryManager = new SessionMemoryManager(testDir);
    stats = new MemoryStats(memoryManager);
  });

  it('should handle empty memory (0 sessions)', async () => {
    const report = await stats.getStats(testProject);

    expect(report.totalSessions).toBe(0);
    expect(report.totalTokens).toBe(0);
    expect(report.avgTokensPerSession).toBe(0);
    expect(report.totalDecisions).toBe(0);
    expect(report.filesModified).toBe(0);
  });

  it('should calculate total tokens correctly', async () => {
    // Add 3 sessions
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date('2025-10-01'),
      endTime: new Date('2025-10-01'),
      objectives: ['Build feature'],
      completedTasks: ['Task 1'],
      keyDecisions: ['Decision 1'],
      tokensUsed: 10000,
      filesModified: ['file1.ts']
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date('2025-10-02'),
      endTime: new Date('2025-10-02'),
      objectives: ['Add tests'],
      completedTasks: ['Task 2'],
      keyDecisions: ['Decision 2'],
      tokensUsed: 20000,
      filesModified: ['file2.ts']
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '3',
      sessionNumber: 3,
      startTime: new Date('2025-10-03'),
      endTime: new Date('2025-10-03'),
      objectives: ['Fix bugs'],
      completedTasks: ['Task 3'],
      keyDecisions: ['Decision 3'],
      tokensUsed: 30000,
      filesModified: ['file3.ts']
    });

    const report = await stats.getStats(testProject);

    expect(report.totalTokens).toBe(60000);
    expect(report.avgTokensPerSession).toBe(20000);
    expect(report.totalSessions).toBe(3);
  });

  it('should count unique files modified', async () => {
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Work'],
      completedTasks: ['Task'],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: ['file1.ts', 'file2.ts']
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Work'],
      completedTasks: ['Task'],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: ['file2.ts', 'file3.ts'] // file2.ts is duplicate
    });

    const report = await stats.getStats(testProject);

    expect(report.filesModified).toBe(3); // Should count unique files only
  });

  it('should identify top objectives', async () => {
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Build feature', 'Add tests'],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Build feature'], // Repeated
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '3',
      sessionNumber: 3,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Build feature', 'Fix bugs'], // Build feature again
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    const report = await stats.getStats(testProject);

    expect(report.topObjectives.length).toBeGreaterThan(0);
    expect(report.topObjectives[0].objective).toBe('build feature'); // Normalized to lowercase
    expect(report.topObjectives[0].count).toBe(3);
  });

  it('should detect efficiency trend (improving)', async () => {
    // Earlier sessions: 10k tokens per task
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date('2025-09-01'),
      endTime: new Date('2025-09-01'),
      objectives: ['Work'],
      completedTasks: ['Task 1'],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date('2025-09-02'),
      endTime: new Date('2025-09-02'),
      objectives: ['Work'],
      completedTasks: ['Task 1'],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    // Recent sessions: 5k tokens per task (improving!)
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '3',
      sessionNumber: 3,
      startTime: new Date('2025-10-01'),
      endTime: new Date('2025-10-01'),
      objectives: ['Work'],
      completedTasks: ['Task 1'],
      keyDecisions: [],
      tokensUsed: 5000,
      filesModified: []
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '4',
      sessionNumber: 4,
      startTime: new Date('2025-10-02'),
      endTime: new Date('2025-10-02'),
      objectives: ['Work'],
      completedTasks: ['Task 1'],
      keyDecisions: [],
      tokensUsed: 5000,
      filesModified: []
    });

    const report = await stats.getStats(testProject);

    expect(report.efficiency.trend).toBe('improving');
  });

  it('should format output with proper alignment', async () => {
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Test'],
      completedTasks: ['Done'],
      keyDecisions: ['Decided'],
      tokensUsed: 10000,
      filesModified: ['file.ts']
    });

    const report = await stats.getStats(testProject);
    const output = stats.formatOutput(report, 'test-project');

    expect(output).toContain('Memory Statistics');
    expect(output).toContain('test-project');
    expect(output).toContain('10,000');
    expect(output).toContain('1 total');
  });

  it('should support JSON output mode', async () => {
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Test'],
      completedTasks: ['Done'],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    const report = await stats.getStats(testProject);
    const jsonOutput = stats.formatJson(report, 'test-project');

    expect(() => JSON.parse(jsonOutput)).not.toThrow();
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.projectName).toBe('test-project');
    expect(parsed.totalSessions).toBe(1);
  });
});
