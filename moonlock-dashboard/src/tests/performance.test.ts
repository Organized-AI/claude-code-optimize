/**
 * Performance and Load Testing Suite
 * 
 * Tests system performance under various load conditions:
 * - Concurrent session handling
 * - High-frequency token recording
 * - Memory usage monitoring
 * - Database performance under load
 * - WebSocket connection scaling
 * - System resource utilization
 * 
 * Ensures system remains responsive and stable under production workloads.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { SessionManager } from '../server/services/SessionManager.js';
import { TokenMonitor } from '../server/services/TokenMonitor.js';
import { WebSocketManager } from '../server/services/WebSocketManager.js';
import { JsonDatabaseManager } from '../server/services/JsonDatabaseManager.js';
import { 
  LoadTestConfig, 
  LoadTestResult, 
  PerformanceScenario, 
  PerformanceBenchmark,
  MemoryUsageReport,
  ConcurrencyTestResult
} from '../contracts/AgentInterfaces.js';
import WebSocket from 'ws';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  sessionCreation: 100, // ms
  tokenRecording: 10, // ms
  databaseQuery: 50, // ms
  websocketMessage: 20, // ms
  memoryGrowth: 10, // MB per minute
  maxConcurrentSessions: 100,
  maxTokenRecordsPerSecond: 1000
} as const;

describe('Performance Testing', () => {
  let sessionManager: SessionManager;
  let tokenMonitor: TokenMonitor;
  let wsManager: WebSocketManager;
  let database: JsonDatabaseManager;

  beforeEach(async () => {
    database = new JsonDatabaseManager('./perf-test-data');
    wsManager = new WebSocketManager(8082);
    tokenMonitor = new TokenMonitor(database, wsManager);
    sessionManager = new SessionManager(database, wsManager);
    
    await wsManager.start();
  });

  afterEach(async () => {
    await sessionManager.shutdown();
    tokenMonitor.shutdown();
    await wsManager.shutdown();
    vi.clearAllMocks();
  });

  describe('Session Management Performance', () => {
    test('Session creation performance benchmark', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const session = await sessionManager.createSession({
          name: `Perf Test Session ${i}`,
          duration: 60000,
          tokenBudget: 1000
        });

        const end = performance.now();
        times.push(end - start);

        expect(session.id).toBeDefined();
        expect(session.status).toBe('active');

        // Complete session to avoid resource buildup
        await sessionManager.completeSession(session.id);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Session Creation Performance:
        Average: ${averageTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        Threshold: ${PERFORMANCE_THRESHOLDS.sessionCreation}ms`);

      // Verify performance meets thresholds
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.sessionCreation);
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.sessionCreation * 2); // Allow 2x threshold for max
    });

    test('Concurrent session creation stress test', async () => {
      const concurrentCount = 50;
      const startTime = performance.now();

      // Create sessions concurrently
      const sessionPromises = Array(concurrentCount).fill(null).map(async (_, i) => {
        return sessionManager.createSession({
          name: `Concurrent Session ${i}`,
          duration: 30000,
          tokenBudget: 500
        });
      });

      const sessions = await Promise.all(sessionPromises);
      const creationTime = performance.now() - startTime;

      // Verify all sessions created successfully
      expect(sessions.length).toBe(concurrentCount);
      sessions.forEach(session => {
        expect(session.id).toBeDefined();
        expect(session.status).toBe('active');
      });

      const averageTimePerSession = creationTime / concurrentCount;
      console.log(`Concurrent Session Creation:
        Total time: ${creationTime.toFixed(2)}ms
        Average per session: ${averageTimePerSession.toFixed(2)}ms
        Sessions: ${concurrentCount}`);

      // Performance should scale reasonably
      expect(averageTimePerSession).toBeLessThan(PERFORMANCE_THRESHOLDS.sessionCreation * 3);

      // Clean up
      const completionPromises = sessions.map(session => 
        sessionManager.completeSession(session.id)
      );
      await Promise.all(completionPromises);
    });

    test('Session recovery performance after restart', async () => {
      // Create multiple active sessions
      const sessionCount = 20;
      const sessions = [];

      for (let i = 0; i < sessionCount; i++) {
        const session = await sessionManager.createSession({
          name: `Recovery Test Session ${i}`,
          duration: 300000, // 5 minutes
          tokenBudget: 1000
        });
        sessions.push(session);

        // Add some usage data
        await tokenMonitor.recordTokenUsage(session.id, 100 + i * 10, `initial-usage-${i}`);
      }

      // Wait for data persistence
      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate restart
      await sessionManager.shutdown();
      tokenMonitor.shutdown();

      const newSessionManager = new SessionManager(database, wsManager);
      const newTokenMonitor = new TokenMonitor(database, wsManager);

      // Measure recovery time
      const recoveryStart = performance.now();
      
      // Attempt to resume all sessions
      const resumePromises = sessions.map(session => 
        newSessionManager.resumeSession(session.id).catch(() => {
          // Some sessions might have expired, which is okay
          return null;
        })
      );

      await Promise.all(resumePromises);
      const recoveryTime = performance.now() - recoveryStart;

      console.log(`Session Recovery Performance:
        Sessions: ${sessionCount}
        Recovery time: ${recoveryTime.toFixed(2)}ms
        Average per session: ${(recoveryTime / sessionCount).toFixed(2)}ms`);

      // Recovery should be fast
      expect(recoveryTime).toBeLessThan(sessionCount * 50); // 50ms per session max

      // Verify sessions are accessible
      let recoveredCount = 0;
      for (const session of sessions) {
        const recovered = await newSessionManager.getSession(session.id);
        if (recovered) recoveredCount++;
      }

      expect(recoveredCount).toBeGreaterThan(sessionCount * 0.8); // At least 80% recovery rate
    });
  });

  describe('Token Monitoring Performance', () => {
    test('High-frequency token recording performance', async () => {
      const session = await sessionManager.createSession({
        name: 'Token Performance Test',
        duration: 120000,
        tokenBudget: 50000
      });

      const recordCount = 1000;
      const times: number[] = [];

      for (let i = 0; i < recordCount; i++) {
        const start = performance.now();
        
        await tokenMonitor.recordTokenUsage(
          session.id,
          Math.floor(Math.random() * 100) + 1,
          `perf-test-${i}`
        );

        const end = performance.now();
        times.push(end - start);

        // Brief pause every 100 records to prevent overwhelming
        if (i % 100 === 99) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`Token Recording Performance:
        Records: ${recordCount}
        Average: ${averageTime.toFixed(2)}ms
        P95: ${p95Time.toFixed(2)}ms
        Threshold: ${PERFORMANCE_THRESHOLDS.tokenRecording}ms`);

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all records were processed
      const usage = await tokenMonitor.getCurrentUsage(session.id);
      expect(usage.totalUsed).toBeGreaterThan(0);

      const history = await database.getTokenUsageHistory(session.id);
      expect(history.length).toBe(recordCount);

      // Performance should meet thresholds
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.tokenRecording);
      expect(p95Time).toBeLessThan(PERFORMANCE_THRESHOLDS.tokenRecording * 3);

      await sessionManager.completeSession(session.id);
    });

    test('Batch processing efficiency', async () => {
      const session = await sessionManager.createSession({
        name: 'Batch Processing Test',
        duration: 60000,
        tokenBudget: 10000
      });

      const batchSize = 50;
      const batchCount = 10;
      const startTime = performance.now();

      // Record tokens in rapid succession to trigger batching
      for (let batch = 0; batch < batchCount; batch++) {
        const batchPromises = [];
        for (let i = 0; i < batchSize; i++) {
          batchPromises.push(
            tokenMonitor.recordTokenUsage(
              session.id,
              10,
              `batch-${batch}-record-${i}`
            )
          );
        }
        await Promise.all(batchPromises);
      }

      const recordingTime = performance.now() - startTime;

      // Wait for all batches to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const totalRecords = batchSize * batchCount;
      const usage = await tokenMonitor.getCurrentUsage(session.id);
      const expectedTotal = totalRecords * 10;

      console.log(`Batch Processing Performance:
        Total records: ${totalRecords}
        Recording time: ${recordingTime.toFixed(2)}ms
        Expected total: ${expectedTotal}
        Actual total: ${usage.totalUsed}`);

      // Verify all batches processed correctly
      expect(usage.totalUsed).toBe(expectedTotal);

      // Recording should be efficient
      const timePerRecord = recordingTime / totalRecords;
      expect(timePerRecord).toBeLessThan(PERFORMANCE_THRESHOLDS.tokenRecording);

      await sessionManager.completeSession(session.id);
    });

    test('Token projection calculation performance', async () => {
      const session = await sessionManager.createSession({
        name: 'Projection Performance Test',
        duration: 180000,
        tokenBudget: 5000
      });

      // Create historical data for projection
      const historyCount = 100;
      for (let i = 0; i < historyCount; i++) {
        await tokenMonitor.recordTokenUsage(
          session.id,
          Math.floor(Math.random() * 50) + 25, // 25-75 tokens
          `history-${i}`
        );

        // Add small delays to simulate realistic timing
        if (i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Measure projection calculation performance
      const projectionTimes: number[] = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const projection = await tokenMonitor.generateUsageProjection(session.id);
        const end = performance.now();

        projectionTimes.push(end - start);

        expect(projection.currentRate).toBeGreaterThan(0);
        expect(projection.projectedTotal).toBeGreaterThan(0);
        expect(projection.confidence).toBeGreaterThanOrEqual(0);
      }

      const averageProjectionTime = projectionTimes.reduce((sum, time) => sum + time, 0) / projectionTimes.length;

      console.log(`Projection Calculation Performance:
        Iterations: ${iterations}
        History records: ${historyCount}
        Average time: ${averageProjectionTime.toFixed(2)}ms`);

      // Projection calculation should be fast
      expect(averageProjectionTime).toBeLessThan(20); // 20ms threshold

      await sessionManager.completeSession(session.id);
    });
  });

  describe('Database Performance', () => {
    test('Database query performance under load', async () => {
      // Create test data
      const sessionCount = 100;
      const sessions = [];

      for (let i = 0; i < sessionCount; i++) {
        const session = await sessionManager.createSession({
          name: `DB Perf Test ${i}`,
          duration: 60000,
          tokenBudget: 1000
        });
        sessions.push(session);

        // Add token usage data
        for (let j = 0; j < 10; j++) {
          await tokenMonitor.recordTokenUsage(session.id, 50, `usage-${j}`);
        }

        if (i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Wait for all data to be persisted
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test query performance
      const queryTests = [
        {
          name: 'Get All Sessions',
          test: () => database.getAllSessions()
        },
        {
          name: 'Get Session by ID',
          test: () => database.getSession(sessions[Math.floor(Math.random() * sessions.length)].id)
        },
        {
          name: 'Get Token History',
          test: () => database.getTokenUsageHistory(sessions[Math.floor(Math.random() * sessions.length)].id)
        }
      ];

      for (const queryTest of queryTests) {
        const times: number[] = [];
        const iterations = 20;

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          await queryTest.test();
          const end = performance.now();
          times.push(end - start);
        }

        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);

        console.log(`${queryTest.name} Performance:
          Average: ${averageTime.toFixed(2)}ms
          Max: ${maxTime.toFixed(2)}ms
          Threshold: ${PERFORMANCE_THRESHOLDS.databaseQuery}ms`);

        expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery);
      }

      // Clean up
      for (const session of sessions) {
        await sessionManager.completeSession(session.id);
      }
    });

    test('Database integrity under concurrent writes', async () => {
      const concurrentSessions = 20;
      const tokensPerSession = 50;

      // Create sessions
      const sessions = await Promise.all(
        Array(concurrentSessions).fill(null).map(async (_, i) => {
          return sessionManager.createSession({
            name: `Concurrent Write Test ${i}`,
            duration: 120000,
            tokenBudget: 2000
          });
        })
      );

      // Perform concurrent writes
      const writePromises = [];
      for (let i = 0; i < sessions.length; i++) {
        for (let j = 0; j < tokensPerSession; j++) {
          writePromises.push(
            tokenMonitor.recordTokenUsage(
              sessions[i].id,
              Math.floor(Math.random() * 100) + 1,
              `concurrent-${i}-${j}`
            )
          );
        }
      }

      const writeStart = performance.now();
      await Promise.all(writePromises);
      const writeTime = performance.now() - writeStart;

      console.log(`Concurrent Write Performance:
        Sessions: ${concurrentSessions}
        Tokens per session: ${tokensPerSession}
        Total writes: ${writePromises.length}
        Total time: ${writeTime.toFixed(2)}ms
        Average per write: ${(writeTime / writePromises.length).toFixed(2)}ms`);

      // Wait for all batches to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify data integrity
      for (let i = 0; i < sessions.length; i++) {
        const usage = await tokenMonitor.getCurrentUsage(sessions[i].id);
        expect(usage.totalUsed).toBeGreaterThan(0);

        const history = await database.getTokenUsageHistory(sessions[i].id);
        expect(history.length).toBe(tokensPerSession);

        const dbTotal = history.reduce((sum, record) => sum + record.tokensUsed, 0);
        expect(dbTotal).toBe(usage.totalUsed);
      }

      // Clean up
      for (const session of sessions) {
        await sessionManager.completeSession(session.id);
      }
    });
  });

  describe('WebSocket Performance', () => {
    test('WebSocket connection scaling', async () => {
      const connectionCount = 50;
      const clients: WebSocket[] = [];
      const connectionTimes: number[] = [];

      // Create multiple WebSocket connections
      for (let i = 0; i < connectionCount; i++) {
        const start = performance.now();
        const client = new WebSocket('ws://localhost:8082');
        
        await new Promise<void>((resolve) => {
          client.on('open', () => {
            const end = performance.now();
            connectionTimes.push(end - start);
            resolve();
          });
        });

        clients.push(client);
      }

      const averageConnectionTime = connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length;

      console.log(`WebSocket Connection Performance:
        Connections: ${connectionCount}
        Average connection time: ${averageConnectionTime.toFixed(2)}ms`);

      expect(averageConnectionTime).toBeLessThan(100); // 100ms connection threshold

      // Test message broadcasting performance
      const session = await sessionManager.createSession({
        name: 'WebSocket Broadcast Test',
        duration: 60000,
        tokenBudget: 1000
      });

      // Subscribe all clients to session updates
      for (const client of clients) {
        client.send(JSON.stringify({
          type: 'subscribe',
          sessionId: session.id
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Measure broadcast performance
      const broadcastStart = performance.now();
      await tokenMonitor.recordTokenUsage(session.id, 100, 'broadcast-test');
      
      // Wait for messages to be received
      await new Promise(resolve => setTimeout(resolve, 200));
      const broadcastTime = performance.now() - broadcastStart;

      console.log(`WebSocket Broadcast Performance:
        Clients: ${connectionCount}
        Broadcast time: ${broadcastTime.toFixed(2)}ms`);

      expect(broadcastTime).toBeLessThan(PERFORMANCE_THRESHOLDS.websocketMessage * connectionCount);

      // Clean up
      for (const client of clients) {
        client.close();
      }
      await sessionManager.completeSession(session.id);
    });

    test('WebSocket message throughput', async () => {
      const client = new WebSocket('ws://localhost:8082');
      const messages: any[] = [];

      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      client.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      const session = await sessionManager.createSession({
        name: 'Message Throughput Test',
        duration: 60000,
        tokenBudget: 5000
      });

      client.send(JSON.stringify({
        type: 'subscribe',
        sessionId: session.id
      }));

      // Generate high-frequency token updates
      const messageCount = 100;
      const throughputStart = performance.now();

      for (let i = 0; i < messageCount; i++) {
        await tokenMonitor.recordTokenUsage(session.id, 10, `throughput-${i}`);
        
        // Small delay to prevent overwhelming
        if (i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Wait for all messages
      await new Promise(resolve => setTimeout(resolve, 500));
      const throughputTime = performance.now() - throughputStart;

      const tokenUpdateMessages = messages.filter(m => m.type === 'token_update');

      console.log(`WebSocket Message Throughput:
        Generated: ${messageCount} token updates
        Received: ${tokenUpdateMessages.length} messages
        Time: ${throughputTime.toFixed(2)}ms
        Messages per second: ${(tokenUpdateMessages.length / (throughputTime / 1000)).toFixed(2)}`);

      expect(tokenUpdateMessages.length).toBeGreaterThan(messageCount * 0.8); // At least 80% message delivery
      expect(throughputTime / messageCount).toBeLessThan(PERFORMANCE_THRESHOLDS.websocketMessage);

      client.close();
      await sessionManager.completeSession(session.id);
    });
  });

  describe('Memory Usage Monitoring', () => {
    test('Memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots: Array<{ timestamp: number; memory: NodeJS.MemoryUsage }> = [];

      const monitoringInterval = setInterval(() => {
        memorySnapshots.push({
          timestamp: Date.now(),
          memory: process.memoryUsage()
        });
      }, 100); // Every 100ms

      try {
        // Create load
        const sessionCount = 30;
        const sessions = [];

        for (let i = 0; i < sessionCount; i++) {
          const session = await sessionManager.createSession({
            name: `Memory Test Session ${i}`,
            duration: 60000,
            tokenBudget: 1000
          });
          sessions.push(session);

          // Generate token usage
          for (let j = 0; j < 20; j++) {
            await tokenMonitor.recordTokenUsage(session.id, 25, `mem-test-${j}`);
          }

          // Brief pause
          if (i % 5 === 4) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Complete sessions
        for (const session of sessions) {
          await sessionManager.completeSession(session.id);
        }

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));

      } finally {
        clearInterval(monitoringInterval);
      }

      const finalMemory = process.memoryUsage();
      const peakMemory = memorySnapshots.reduce(
        (peak, snapshot) => ({
          heapUsed: Math.max(peak.heapUsed, snapshot.memory.heapUsed),
          heapTotal: Math.max(peak.heapTotal, snapshot.memory.heapTotal),
          external: Math.max(peak.external, snapshot.memory.external),
          rss: Math.max(peak.rss, snapshot.memory.rss)
        }),
        { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }
      );

      const memoryGrowth = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        rss: finalMemory.rss - initialMemory.rss
      };

      console.log(`Memory Usage Analysis:
        Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Peak heap: ${(peakMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Heap growth: ${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB
        RSS growth: ${(memoryGrowth.rss / 1024 / 1024).toFixed(2)}MB`);

      // Memory growth should be reasonable
      const heapGrowthMB = memoryGrowth.heapUsed / 1024 / 1024;
      expect(heapGrowthMB).toBeLessThan(50); // Less than 50MB growth

      // Check for potential memory leaks
      const memoryGrowthRate = memoryGrowth.heapUsed / (memorySnapshots.length * 100); // bytes per ms
      const memoryGrowthPerMinute = (memoryGrowthRate * 60 * 1000) / 1024 / 1024; // MB per minute

      expect(memoryGrowthPerMinute).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryGrowth);
    });

    test('Garbage collection efficiency', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage();
      
      // Create and destroy many objects
      const sessions = [];
      for (let i = 0; i < 100; i++) {
        const session = await sessionManager.createSession({
          name: `GC Test Session ${i}`,
          duration: 30000,
          tokenBudget: 500
        });
        sessions.push(session);

        // Generate some token data
        for (let j = 0; j < 10; j++) {
          await tokenMonitor.recordTokenUsage(session.id, 10, `gc-test-${j}`);
        }
      }

      // Complete all sessions
      for (const session of sessions) {
        await sessionManager.completeSession(session.id);
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force GC again if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage();
      const memoryDifference = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Garbage Collection Test:
        Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Difference: ${(memoryDifference / 1024 / 1024).toFixed(2)}MB`);

      // Memory should not grow significantly after cleanup
      const memoryGrowthMB = memoryDifference / 1024 / 1024;
      expect(memoryGrowthMB).toBeLessThan(20); // Less than 20MB permanent growth
    });
  });

  describe('Performance Benchmarking', () => {
    test('Complete system performance benchmark', async () => {
      const scenarios: PerformanceScenario[] = [
        {
          name: 'Session Creation',
          description: 'Create and start a new session',
          setup: async () => {},
          execute: async () => {
            const start = performance.now();
            const session = await sessionManager.createSession({
              name: 'Benchmark Session',
              duration: 60000,
              tokenBudget: 1000
            });
            const end = performance.now();
            
            await sessionManager.completeSession(session.id);
            
            return {
              executionTime: end - start,
              memoryUsage: process.memoryUsage().heapUsed,
              cpuUsage: 0, // Not easily measurable in Node.js
              databaseQueries: 1,
              networkRequests: 0
            };
          }
        },
        {
          name: 'Token Recording Batch',
          description: 'Record multiple token usage entries',
          setup: async () => {},
          execute: async () => {
            const session = await sessionManager.createSession({
              name: 'Token Benchmark Session',
              duration: 60000,
              tokenBudget: 1000
            });

            const start = performance.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < 10; i++) {
              await tokenMonitor.recordTokenUsage(session.id, 50, `benchmark-${i}`);
            }
            
            const end = performance.now();
            const endMemory = process.memoryUsage().heapUsed;
            
            await sessionManager.completeSession(session.id);
            
            return {
              executionTime: end - start,
              memoryUsage: endMemory - startMemory,
              cpuUsage: 0,
              databaseQueries: 10,
              networkRequests: 0
            };
          }
        },
        {
          name: 'Database Query',
          description: 'Retrieve session data and history',
          setup: async () => {},
          execute: async () => {
            const session = await sessionManager.createSession({
              name: 'Query Benchmark Session',
              duration: 60000,
              tokenBudget: 1000
            });

            // Add some data
            for (let i = 0; i < 5; i++) {
              await tokenMonitor.recordTokenUsage(session.id, 25, `query-benchmark-${i}`);
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const start = performance.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            await database.getSession(session.id);
            await database.getTokenUsageHistory(session.id);
            
            const end = performance.now();
            const endMemory = process.memoryUsage().heapUsed;
            
            await sessionManager.completeSession(session.id);
            
            return {
              executionTime: end - start,
              memoryUsage: endMemory - startMemory,
              cpuUsage: 0,
              databaseQueries: 2,
              networkRequests: 0
            };
          }
        }
      ];

      const benchmark: PerformanceBenchmark = {
        scenarios: [],
        summary: {
          overallRating: 'good',
          recommendations: [],
          regressions: [],
          improvements: []
        }
      };

      for (const scenario of scenarios) {
        await scenario.setup();
        const metrics = await scenario.execute();
        
        let rating: 'excellent' | 'good' | 'acceptable' | 'poor';
        if (metrics.executionTime < 50) rating = 'excellent';
        else if (metrics.executionTime < 100) rating = 'good';
        else if (metrics.executionTime < 200) rating = 'acceptable';
        else rating = 'poor';

        benchmark.scenarios.push({
          name: scenario.name,
          metrics,
          rating
        });

        console.log(`${scenario.name} Benchmark:
          Execution time: ${metrics.executionTime.toFixed(2)}ms
          Memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
          Database queries: ${metrics.databaseQueries}
          Rating: ${rating}`);
      }

      // Generate summary
      const excellentCount = benchmark.scenarios.filter(s => s.rating === 'excellent').length;
      const goodCount = benchmark.scenarios.filter(s => s.rating === 'good').length;
      const acceptableCount = benchmark.scenarios.filter(s => s.rating === 'acceptable').length;
      const poorCount = benchmark.scenarios.filter(s => s.rating === 'poor').length;

      if (excellentCount >= scenarios.length * 0.7) {
        benchmark.summary.overallRating = 'excellent';
      } else if (goodCount + excellentCount >= scenarios.length * 0.8) {
        benchmark.summary.overallRating = 'good';
      } else if (poorCount === 0) {
        benchmark.summary.overallRating = 'acceptable';
      } else {
        benchmark.summary.overallRating = 'poor';
      }

      expect(benchmark.summary.overallRating).not.toBe('poor');
      expect(poorCount).toBe(0);
    });
  });
});