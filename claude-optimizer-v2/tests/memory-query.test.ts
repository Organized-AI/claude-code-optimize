import { describe, it, expect, beforeEach } from 'vitest';
import { SessionMemoryManager } from '../src/session-memory.js';
import { MemoryQuery } from '../src/memory-query.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('MemoryQuery', () => {
  const testDir = path.join(os.tmpdir(), 'claude-test-query-' + Date.now());
  const testProject = path.join(testDir, 'test-project');
  let memoryManager: SessionMemoryManager;
  let query: MemoryQuery;

  beforeEach(async () => {
    // Clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testProject, { recursive: true });

    memoryManager = new SessionMemoryManager(testDir);
    query = new MemoryQuery(memoryManager);

    // Add test sessions
    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '1',
      sessionNumber: 1,
      startTime: new Date('2025-10-01'),
      endTime: new Date('2025-10-01'),
      objectives: ['Build auth system'],
      completedTasks: ['Created login', 'Added JWT'],
      keyDecisions: ['Use bcrypt for passwords'],
      tokensUsed: 50000,
      filesModified: ['auth.ts', 'jwt.ts']
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '2',
      sessionNumber: 2,
      startTime: new Date('2025-10-02'),
      endTime: new Date('2025-10-02'),
      objectives: ['Add tests'],
      completedTasks: ['Test auth', 'Test JWT'],
      keyDecisions: ['Use Vitest for testing'],
      tokensUsed: 30000,
      filesModified: ['auth.test.ts']
    });

    await memoryManager.saveSessionMemory(testProject, {
      sessionId: '3',
      sessionNumber: 3,
      startTime: new Date('2025-10-03'),
      endTime: new Date('2025-10-03'),
      objectives: ['Optimize performance'],
      completedTasks: ['Cached queries', 'Indexed DB'],
      keyDecisions: ['Use Redis for caching'],
      tokensUsed: 40000,
      filesModified: ['cache.ts', 'db.ts']
    });
  });

  it('should filter sessions by token usage (greater than)', async () => {
    const sessions = await query
      .sessions(testProject)
      .where('tokensUsed', '>', 35000)
      .execute();

    expect(sessions.length).toBe(2); // Sessions 1 and 3
    expect(sessions[0].tokensUsed).toBe(50000);
    expect(sessions[1].tokensUsed).toBe(40000);
  });

  it('should filter sessions by objectives (contains)', async () => {
    const sessions = await query
      .sessions(testProject)
      .where('objectives', 'contains', 'test')
      .execute();

    expect(sessions.length).toBe(1);
    expect(sessions[0].sessionNumber).toBe(2);
  });

  it('should support chaining multiple where clauses', async () => {
    const sessions = await query
      .sessions(testProject)
      .where('tokensUsed', '>', 25000)
      .where('tokensUsed', '<', 45000)
      .execute();

    expect(sessions.length).toBe(2); // Sessions 2 and 3
    expect(sessions.map(s => s.sessionNumber).sort()).toEqual([2, 3]);
  });

  it('should order sessions by tokensUsed descending', async () => {
    const sessions = await query
      .sessions(testProject)
      .orderBy('tokensUsed', 'desc')
      .execute();

    expect(sessions.length).toBe(3);
    expect(sessions[0].tokensUsed).toBe(50000); // Highest
    expect(sessions[1].tokensUsed).toBe(40000);
    expect(sessions[2].tokensUsed).toBe(30000); // Lowest
  });

  it('should limit and offset results', async () => {
    const sessions = await query
      .sessions(testProject)
      .orderBy('sessionNumber', 'asc')
      .limit(2)
      .offset(1)
      .execute();

    expect(sessions.length).toBe(2);
    expect(sessions[0].sessionNumber).toBe(2);
    expect(sessions[1].sessionNumber).toBe(3);
  });

  it('should count sessions matching criteria', async () => {
    const count = await query
      .sessions(testProject)
      .where('tokensUsed', '>', 35000)
      .count();

    expect(count).toBe(2);
  });

  it('should calculate sum of tokens', async () => {
    const total = await query
      .sessions(testProject)
      .sum('tokensUsed');

    expect(total).toBe(120000); // 50k + 30k + 40k
  });

  it('should calculate average of tokens', async () => {
    const avg = await query
      .sessions(testProject)
      .avg('tokensUsed');

    expect(avg).toBe(40000); // 120k / 3
  });

  it('should find min and max tokens', async () => {
    const min = await query.sessions(testProject).min('tokensUsed');
    const max = await query.sessions(testProject).max('tokensUsed');

    expect(min).toBe(30000);
    expect(max).toBe(50000);
  });

  it('should query decisions with contains filter', async () => {
    const decisions = await query
      .decisions(testProject)
      .where('text', 'contains', 'bcrypt')
      .execute();

    expect(decisions.length).toBe(1);
    expect(decisions[0]).toContain('bcrypt');
  });

  it('should support nested field queries', async () => {
    const sessions = await query
      .sessions(testProject)
      .where('completedTasks.length', '>=', 2)
      .execute();

    expect(sessions.length).toBe(3); // All have 2+ tasks
  });
});
