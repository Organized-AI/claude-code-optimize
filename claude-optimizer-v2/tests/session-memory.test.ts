/**
 * Session Memory Tests
 * Tests for project memory persistence and context injection
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionMemoryManager, SessionHistory, ProjectMemory } from '../src/session-memory.js';

describe('SessionMemoryManager', () => {
  let manager: SessionMemoryManager;
  let testProjectPath: string;
  let testMemoryDir: string;

  beforeEach(() => {
    // Create temp test directory
    testMemoryDir = path.join(os.tmpdir(), `claude-test-memory-${Date.now()}`);
    manager = new SessionMemoryManager(testMemoryDir);
    testProjectPath = '/test/project/path';
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMemoryDir)) {
      fs.rmSync(testMemoryDir, { recursive: true, force: true });
    }
  });

  test('creates new project memory on first session', async () => {
    const memory = await manager.loadProjectMemory(testProjectPath);

    expect(memory.projectPath).toBe(testProjectPath);
    expect(memory.totalSessions).toBe(0);
    expect(memory.sessions).toEqual([]);
    expect(memory.cumulativeContext).toBeDefined();
    expect(memory.cumulativeContext.techStack).toBeDefined();
    expect(memory.cumulativeContext.keyDecisions).toEqual([]);
  });

  test('saves and loads session history', async () => {
    const session: SessionHistory = {
      sessionId: 'test-session-1',
      sessionNumber: 1,
      startTime: new Date(),
      endTime: new Date(),
      objectives: ['Build feature X', 'Fix bug Y'],
      completedTasks: ['Feature X complete', 'Bug Y fixed'],
      keyDecisions: ['Use async/await pattern', 'Store in JSON format'],
      tokensUsed: 25000,
      filesModified: ['src/file1.ts', 'src/file2.ts']
    };

    await manager.saveSessionMemory(testProjectPath, session);
    const memory = await manager.loadProjectMemory(testProjectPath);

    expect(memory.sessions).toHaveLength(1);
    expect(memory.sessions[0].sessionId).toBe('test-session-1');
    expect(memory.sessions[0].objectives).toEqual(['Build feature X', 'Fix bug Y']);
    expect(memory.totalSessions).toBe(1);
  });

  test('updates cumulative context with decisions', async () => {
    const session1: SessionHistory = {
      sessionId: 'test-session-1',
      sessionNumber: 1,
      startTime: new Date(),
      objectives: ['Task 1'],
      completedTasks: ['Task 1 done'],
      keyDecisions: ['Use TypeScript', 'Follow ESLint rules'],
      tokensUsed: 20000,
      filesModified: ['file1.ts']
    };

    const session2: SessionHistory = {
      sessionId: 'test-session-2',
      sessionNumber: 2,
      startTime: new Date(),
      objectives: ['Task 2'],
      completedTasks: ['Task 2 done'],
      keyDecisions: ['Use Vitest for testing', 'Store data in ~/.claude'],
      tokensUsed: 15000,
      filesModified: ['file2.ts']
    };

    await manager.saveSessionMemory(testProjectPath, session1);
    await manager.saveSessionMemory(testProjectPath, session2);

    const memory = await manager.loadProjectMemory(testProjectPath);

    expect(memory.cumulativeContext.keyDecisions).toContain('Use TypeScript');
    expect(memory.cumulativeContext.keyDecisions).toContain('Use Vitest for testing');
    expect(memory.cumulativeContext.keyDecisions).toHaveLength(4);
  });

  test('avoids duplicate decisions in cumulative context', async () => {
    const session1: SessionHistory = {
      sessionId: 'test-session-1',
      sessionNumber: 1,
      startTime: new Date(),
      objectives: ['Task 1'],
      completedTasks: ['Task 1 done'],
      keyDecisions: ['Use TypeScript'],
      tokensUsed: 10000,
      filesModified: []
    };

    const session2: SessionHistory = {
      sessionId: 'test-session-2',
      sessionNumber: 2,
      startTime: new Date(),
      objectives: ['Task 2'],
      completedTasks: ['Task 2 done'],
      keyDecisions: ['Use TypeScript'], // Duplicate
      tokensUsed: 10000,
      filesModified: []
    };

    await manager.saveSessionMemory(testProjectPath, session1);
    await manager.saveSessionMemory(testProjectPath, session2);

    const memory = await manager.loadProjectMemory(testProjectPath);

    // Should only have one "Use TypeScript" decision
    const tsDecisions = memory.cumulativeContext.keyDecisions.filter(d => d === 'Use TypeScript');
    expect(tsDecisions).toHaveLength(1);
  });

  test('detects tech stack correctly for current project', async () => {
    // Test with current project directory (claude-optimizer-v2)
    const currentProjectPath = process.cwd();
    const memory = await manager.loadProjectMemory(currentProjectPath);

    expect(memory.cumulativeContext.techStack).toContain('TypeScript');
    expect(memory.cumulativeContext.techStack).toContain('Node.js');
    expect(memory.cumulativeContext.testingFramework).toBe('Vitest');
  });

  test('generates context injection with session history', () => {
    const memory: ProjectMemory = {
      projectPath: '/test/project',
      projectName: 'test-project',
      createdAt: new Date('2025-01-01'),
      lastSessionAt: new Date('2025-01-05'),
      totalSessions: 3,
      sessions: [
        {
          sessionId: 'session-1',
          sessionNumber: 1,
          startTime: new Date('2025-01-01'),
          objectives: ['Build feature'],
          completedTasks: ['Feature built'],
          keyDecisions: ['Use React'],
          tokensUsed: 20000,
          filesModified: ['app.tsx']
        },
        {
          sessionId: 'session-2',
          sessionNumber: 2,
          startTime: new Date('2025-01-03'),
          objectives: ['Add tests'],
          completedTasks: ['Tests added'],
          keyDecisions: ['Use Vitest'],
          tokensUsed: 15000,
          filesModified: ['app.test.tsx']
        }
      ],
      cumulativeContext: {
        techStack: ['TypeScript', 'React', 'Node.js'],
        architecture: 'Web Application',
        testingFramework: 'Vitest',
        buildSystem: 'Vite',
        keyDecisions: ['Use React', 'Use Vitest', 'Follow component patterns'],
        commonPatterns: []
      }
    };

    const context = manager.injectContextOnStart(memory);

    expect(context).toContain('Project Memory: test-project');
    expect(context).toContain('Total Sessions**: 3');
    expect(context).toContain('Tech Stack');
    expect(context).toContain('TypeScript');
    expect(context).toContain('React');
    expect(context).toContain('Key Decisions');
    expect(context).toContain('Use React');
    expect(context).toContain('Recent Sessions');
    expect(context).toContain('Session 1');
    expect(context).toContain('Session 2');
  });

  test('generates unique session IDs', () => {
    const id1 = manager.generateSessionId();
    const id2 = manager.generateSessionId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^session-\d+-[a-z0-9]+$/);
    expect(id2).toMatch(/^session-\d+-[a-z0-9]+$/);
  });

  test('persists memory across manager instances', async () => {
    const session: SessionHistory = {
      sessionId: 'test-persistence',
      sessionNumber: 1,
      startTime: new Date(),
      objectives: ['Test persistence'],
      completedTasks: ['Persistence tested'],
      keyDecisions: ['Use file system'],
      tokensUsed: 10000,
      filesModified: []
    };

    // Save with first manager
    await manager.saveSessionMemory(testProjectPath, session);

    // Load with new manager instance
    const newManager = new SessionMemoryManager(testMemoryDir);
    const memory = await newManager.loadProjectMemory(testProjectPath);

    expect(memory.sessions).toHaveLength(1);
    expect(memory.sessions[0].sessionId).toBe('test-persistence');
  });

  test('increments session number automatically', async () => {
    const session1: SessionHistory = {
      sessionId: 'session-1',
      sessionNumber: 1,
      startTime: new Date(),
      objectives: [],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    };

    const session2: SessionHistory = {
      sessionId: 'session-2',
      sessionNumber: 2,
      startTime: new Date(),
      objectives: [],
      completedTasks: [],
      keyDecisions: [],
      tokensUsed: 10000,
      filesModified: []
    };

    await manager.saveSessionMemory(testProjectPath, session1);
    await manager.saveSessionMemory(testProjectPath, session2);

    const memory = await manager.loadProjectMemory(testProjectPath);

    expect(memory.totalSessions).toBe(2);
    expect(memory.sessions[0].sessionNumber).toBe(1);
    expect(memory.sessions[1].sessionNumber).toBe(2);
  });

  test('limits recent sessions in context injection to last 5', () => {
    const sessions: SessionHistory[] = [];
    for (let i = 1; i <= 10; i++) {
      sessions.push({
        sessionId: `session-${i}`,
        sessionNumber: i,
        startTime: new Date(),
        objectives: [`Task ${i}`],
        completedTasks: [`Task ${i} done`],
        keyDecisions: [],
        tokensUsed: 10000,
        filesModified: []
      });
    }

    const memory: ProjectMemory = {
      projectPath: '/test',
      projectName: 'test',
      createdAt: new Date(),
      lastSessionAt: new Date(),
      totalSessions: 10,
      sessions,
      cumulativeContext: {
        techStack: [],
        architecture: 'Test',
        testingFramework: 'Unknown',
        buildSystem: 'Unknown',
        keyDecisions: [],
        commonPatterns: []
      }
    };

    const context = manager.injectContextOnStart(memory);

    // Should only show sessions 6-10 (last 5)
    expect(context).toContain('### Session 6');
    expect(context).toContain('### Session 10');
    // Session 1 and 5 should not appear (Session 10 contains "Session 1" substring but not as a heading)
    expect(context).not.toMatch(/### Session 1 \(/);
    expect(context).not.toMatch(/### Session 5 \(/);
  });

  test('limits recent decisions in context injection to last 10', () => {
    const decisions: string[] = [];
    for (let i = 1; i <= 15; i++) {
      decisions.push(`Decision ${i}`);
    }

    const memory: ProjectMemory = {
      projectPath: '/test',
      projectName: 'test',
      createdAt: new Date(),
      lastSessionAt: new Date(),
      totalSessions: 5,
      sessions: [],
      cumulativeContext: {
        techStack: [],
        architecture: 'Test',
        testingFramework: 'Unknown',
        buildSystem: 'Unknown',
        keyDecisions: decisions,
        commonPatterns: []
      }
    };

    const context = manager.injectContextOnStart(memory);

    // Should only show decisions 6-15 (last 10)
    expect(context).toContain('1. Decision 6');
    expect(context).toContain('10. Decision 15');
    expect(context).not.toContain('. Decision 1\n');
    expect(context).not.toContain('. Decision 5\n');
  });
});
