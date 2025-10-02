import { describe, it, expect, beforeEach } from 'vitest';
import { SessionMemoryManager } from '../src/session-memory.js';
import { MemoryAnalytics } from '../src/memory-analytics.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('MemoryAnalytics', () => {
  const testDir = path.join(os.tmpdir(), 'claude-test-analytics-' + Date.now());
  const testProject = path.join(testDir, 'test-project');
  let memoryManager: SessionMemoryManager;
  let analytics: MemoryAnalytics;

  beforeEach(async () => {
    // Clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testProject, { recursive: true });

    memoryManager = new SessionMemoryManager(testDir);
    analytics = new MemoryAnalytics(memoryManager);
  });

  it('should handle empty memory', async () => {
    const report = await analytics.analyze(testProject);

    expect(report.trends.tokenUsage).toEqual([]);
    expect(report.patterns.mostCommonObjectives).toEqual([]);
    expect(report.predictions.nextSessionTokens.mid).toBe(0);
  });

  it('should calculate trends correctly', async () => {
    // Week 1
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date('2025-10-01'),
      endTime: new Date('2025-10-01'),
      objectives: ['Build feature'],
      completedTasks: ['Task 1'],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    // Week 2 - more tokens
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date('2025-10-08'),
      endTime: new Date('2025-10-08'),
      objectives: ['Add tests'],
      completedTasks: ['Task 2'],
      keyDecisions: [],
      tokensUsed: 20000,
      filesModified: []
    });

    const report = await analytics.analyze(testProject);

    expect(report.trends.tokenUsage.length).toBeGreaterThan(0);
    expect(report.trends.sessionFrequency.length).toBeGreaterThan(0);
  });

  it('should detect most common objectives', async () => {
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
      objectives: ['Build feature', 'Fix bugs'],
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
      objectives: ['Build feature'],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    const report = await analytics.analyze(testProject);

    expect(report.patterns.mostCommonObjectives.length).toBeGreaterThan(0);
    expect(report.patterns.mostCommonObjectives[0].objective).toBe('build feature');
    expect(report.patterns.mostCommonObjectives[0].count).toBe(3);
  });

  it('should find peak productivity time', async () => {
    // Tuesday at 2 PM - high tokens
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date('2025-10-01T14:00:00'), // Tuesday 2 PM
      endTime: new Date('2025-10-01T15:00:00'),
      objectives: ['Work'],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 50000,
      filesModified: []
    });

    // Wednesday at 10 AM - lower tokens
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date('2025-10-02T10:00:00'), // Wednesday 10 AM
      endTime: new Date('2025-10-02T11:00:00'),
      objectives: ['Work'],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 20000,
      filesModified: []
    });

    const report = await analytics.analyze(testProject);

    expect(report.patterns.peakProductivityTime).not.toBeNull();
    expect(report.patterns.peakProductivityTime?.avgTokens).toBe(50000);
  });

  it('should rank performance correctly', async () => {
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date('2025-10-01T10:00:00'),
      endTime: new Date('2025-10-01T11:00:00'), // 1 hour
      objectives: ['Work'],
      completedTasks: ['Task 1', 'Task 2'],
      keyDecisions: [],
      tokensUsed: 20000, // 10k per task - efficient
      filesModified: []
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date('2025-10-02T10:00:00'),
      endTime: new Date('2025-10-02T12:00:00'), // 2 hours
      objectives: ['Work'],
      completedTasks: ['Task 1'],
      keyDecisions: [],
      tokensUsed: 50000, // 50k per task - less efficient
      filesModified: []
    });

    const report = await analytics.analyze(testProject);

    expect(report.performance.fastestSessions.length).toBeGreaterThan(0);
    expect(report.performance.mostEfficientSessions.length).toBeGreaterThan(0);
    expect(report.performance.highestTokenSessions.length).toBeGreaterThan(0);

    // Session 1 should be most efficient (lower tokens per task)
    expect(report.performance.mostEfficientSessions[0].sessionNumber).toBe(1);

    // Session 2 should be highest token
    expect(report.performance.highestTokenSessions[0].sessionNumber).toBe(2);
  });

  it('should generate predictions from recent sessions', async () => {
    // Add 5 sessions with varying token usage
    for (let i = 0; i < 5; i++) {
      await memoryManager.saveSessionMemory(testProject, {
        sessionId: `${i + 1}`,
        sessionNumber: i + 1,
        startTime: new Date(`2025-10-0${i + 1}`),
        endTime: new Date(`2025-10-0${i + 1}`),
        objectives: ['Work'],
        completedTasks: ['Task'],
        keyDecisions: [],
        tokensUsed: 40000 + i * 2000, // 40k, 42k, 44k, 46k, 48k
        filesModified: []
      });
    }

    const report = await analytics.analyze(testProject);

    expect(report.predictions.nextSessionTokens.mid).toBeGreaterThan(0);
    expect(report.predictions.nextSessionTokens.low).toBeLessThan(report.predictions.nextSessionTokens.mid);
    expect(report.predictions.nextSessionTokens.high).toBeGreaterThan(report.predictions.nextSessionTokens.mid);
    expect(report.predictions.burnRate).toBeGreaterThan(0);
  });

  it('should handle small datasets gracefully', async () => {
    // Only 2 sessions
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Work'],
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
      objectives: ['Work'],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    });

    const report = await analytics.analyze(testProject);

    // Should not throw errors
    expect(report).toBeDefined();
    expect(report.predictions).toBeDefined();
  });
});
