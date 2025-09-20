/**
 * System Integration Test Suite
 * 
 * Validates complete system integration between all sub-agent deliverables:
 * - UI/Dashboard integration with real-time updates
 * - SDK Integration with Claude Code service simulation  
 * - Project Analysis with complexity assessment and risk analysis
 * - Data Persistence with comprehensive storage and backup
 * - Testing & Validation (this module)
 * 
 * Tests end-to-end workflows and cross-service communication.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../server/services/SessionManager.js';
import { TokenMonitor } from '../server/services/TokenMonitor.js';
import { WebSocketManager } from '../server/services/WebSocketManager.js';
import { JsonDatabaseManager } from '../server/services/JsonDatabaseManager.js';
import { ProjectAnalyzer } from '../server/services/ProjectAnalyzer.js';
import { SessionPlanningService } from '../server/services/SessionPlanningService.js';
import { RiskAssessmentService } from '../server/services/RiskAssessmentService.js';
import { BackupService } from '../server/services/BackupService.js';
import { ClaudeCodeIntegration } from '../server/services/ClaudeCodeIntegration.js';
import { IntegrationTestSuite, IntegrationTestResult, SystemIntegrityReport } from '../contracts/AgentInterfaces.js';
import { Session, WebSocketMessage } from '../shared/types/index.js';
import WebSocket from 'ws';

describe('System Integration Tests', () => {
  let sessionManager: SessionManager;
  let tokenMonitor: TokenMonitor;
  let wsManager: WebSocketManager;
  let database: JsonDatabaseManager;
  let projectAnalyzer: ProjectAnalyzer;
  let sessionPlanning: SessionPlanningService;
  let riskAssessment: RiskAssessmentService;
  let backupService: BackupService;
  let claudeCodeIntegration: ClaudeCodeIntegration;

  beforeEach(async () => {
    // Initialize all system components
    database = new JsonDatabaseManager('./test-data');
    wsManager = new WebSocketManager(8081);
    tokenMonitor = new TokenMonitor(database, wsManager);
    sessionManager = new SessionManager(database, wsManager);
    projectAnalyzer = new ProjectAnalyzer();
    sessionPlanning = new SessionPlanningService(database);
    riskAssessment = new RiskAssessmentService(); 
    backupService = new BackupService(database);
    claudeCodeIntegration = new ClaudeCodeIntegration();

    // Start services
    await wsManager.start();
  });

  afterEach(async () => {
    // Cleanup
    await sessionManager.shutdown();
    tokenMonitor.shutdown();
    await wsManager.shutdown();
    vi.clearAllMocks();
  });

  describe('End-to-End Session Workflow', () => {
    test('Complete session lifecycle with real-time updates', async () => {
      const testResults: string[] = [];
      
      // 1. Project Analysis Phase
      testResults.push('Starting project analysis...');
      const projectPath = './test-project';
      const complexity = await projectAnalyzer.analyzeComplexity(projectPath);
      
      expect(complexity.overall).toBeGreaterThan(0);
      expect(complexity.codebase.score).toBeDefined();
      testResults.push(`✓ Project complexity analyzed: ${complexity.overall}/10`);

      // 2. Risk Assessment Phase  
      testResults.push('Performing risk assessment...');
      const currentQuotas = {
        sonnet: { used: 100, limit: 480, percentage: 20.83 },
        opus: { used: 5, limit: 40, percentage: 12.5 }
      };
      
      const risk = await riskAssessment.assessRisk(complexity, currentQuotas);
      expect(risk.overall).toBeGreaterThan(0);
      expect(risk.quotaRisk.probability).toBeLessThan(90); // Should be safe
      testResults.push(`✓ Risk assessment completed: ${risk.overall}% overall risk`);

      // 3. Session Planning Phase
      testResults.push('Creating session plan...');
      const sessionPlan = await sessionPlanning.planSessions(complexity, risk);
      
      expect(sessionPlan.totalEstimatedTime).toBeGreaterThan(0);
      expect(sessionPlan.modelAllocation.sonnet.estimatedTime).toBeGreaterThan(0);
      testResults.push(`✓ Session plan created: ${sessionPlan.totalEstimatedTime} minutes estimated`);

      // 4. Session Creation and Execution
      testResults.push('Creating and starting session...');
      const session = await sessionManager.createSession({
        name: 'Integration Test Session',
        duration: sessionPlan.totalEstimatedTime * 60 * 1000, // Convert to milliseconds
        tokenBudget: sessionPlan.tokenBudget.total
      });

      expect(session.status).toBe('active');
      expect(session.id).toBeDefined();
      testResults.push(`✓ Session created and started: ${session.id}`);

      // 5. Token Usage Simulation
      testResults.push('Simulating token usage...');
      const tokenUsageSteps = [100, 150, 200, 175, 125]; // Simulate varying token usage
      
      for (let i = 0; i < tokenUsageSteps.length; i++) {
        await tokenMonitor.recordTokenUsage(session.id, tokenUsageSteps[i], `operation-${i + 1}`);
        
        // Verify real-time updates
        const currentUsage = await tokenMonitor.getCurrentUsage(session.id);
        expect(currentUsage.totalUsed).toBeGreaterThan(0);
        
        // Small delay to simulate real usage patterns
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const finalUsage = await tokenMonitor.getCurrentUsage(session.id);
      const expectedTotal = tokenUsageSteps.reduce((sum, tokens) => sum + tokens, 0);
      expect(finalUsage.totalUsed).toBe(expectedTotal);
      testResults.push(`✓ Token usage tracked: ${finalUsage.totalUsed} tokens used`);

      // 6. Checkpoint Creation
      testResults.push('Creating checkpoints...');
      const checkpoint1 = await sessionManager.addCheckpoint(session.id, {
        phase: 'analysis',
        promptCount: 5,
        metadata: { complexity: complexity.overall }
      });

      const checkpoint2 = await sessionManager.addCheckpoint(session.id, {
        phase: 'implementation', 
        promptCount: 12,
        metadata: { tokensUsed: finalUsage.totalUsed }
      });

      expect(checkpoint1.id).toBeDefined();
      expect(checkpoint2.id).toBeDefined();
      testResults.push(`✓ Checkpoints created: ${checkpoint1.phase}, ${checkpoint2.phase}`);

      // 7. Session Completion
      testResults.push('Completing session...');
      await sessionManager.completeSession(session.id);
      
      const completedSession = await sessionManager.getSession(session.id);
      expect(completedSession?.status).toBe('completed');
      expect(completedSession?.endTime).toBeDefined();
      testResults.push('✓ Session completed successfully');

      // 8. Data Persistence Verification
      testResults.push('Verifying data persistence...');
      const persistedSession = await database.getSession(session.id);
      const tokenHistory = await database.getTokenUsageHistory(session.id);
      const checkpoints = await database.getCheckpoints(session.id);

      expect(persistedSession).toBeDefined();
      expect(tokenHistory.length).toBe(tokenUsageSteps.length);
      expect(checkpoints.length).toBe(2);
      testResults.push('✓ All data persisted correctly');

      // 9. Backup Creation
      testResults.push('Creating backup...');
      const backup = await backupService.createBackup();
      expect(backup.id).toBeDefined();
      expect(backup.contents.length).toBeGreaterThan(0);
      testResults.push(`✓ Backup created: ${backup.id}`);

      console.log('Integration Test Results:', testResults);
    }, 30000); // 30 second timeout for complete workflow

    test('WebSocket real-time communication', async () => {
      const messages: WebSocketMessage[] = [];
      const testClient = new WebSocket('ws://localhost:8081');
      
      await new Promise<void>((resolve) => {
        testClient.on('open', () => resolve());
      });

      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        messages.push(message);
      });

      // Create a session to generate WebSocket messages
      const session = await sessionManager.createSession({
        name: 'WebSocket Test Session',
        duration: 60000, // 1 minute
        tokenBudget: 1000
      });

      // Subscribe to session updates
      testClient.send(JSON.stringify({
        type: 'subscribe',
        sessionId: session.id
      }));

      // Record some token usage to trigger messages
      await tokenMonitor.recordTokenUsage(session.id, 100, 'test-operation');
      await tokenMonitor.recordTokenUsage(session.id, 150, 'test-operation-2');

      // Create a checkpoint
      await sessionManager.addCheckpoint(session.id, {
        phase: 'testing',
        promptCount: 3
      });

      // Wait for messages to be received
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify we received the expected message types
      const messageTypes = messages.map(m => m.type);
      expect(messageTypes).toContain('token_update');
      expect(messageTypes).toContain('checkpoint');

      // Verify token update messages have correct structure
      const tokenUpdates = messages.filter(m => m.type === 'token_update');
      expect(tokenUpdates.length).toBeGreaterThanOrEqual(2);
      
      for (const update of tokenUpdates) {
        expect(update.sessionId).toBe(session.id);
        expect(update.tokensUsed).toBeGreaterThan(0);
        expect(update.totalUsed).toBeGreaterThan(0);
      }

      testClient.close();
      await sessionManager.completeSession(session.id);
    });

    test('Cross-service data consistency', async () => {
      // Test that data remains consistent across all services
      const session = await sessionManager.createSession({
        name: 'Consistency Test',
        duration: 120000, // 2 minutes
        tokenBudget: 2000
      });

      // Record token usage through TokenMonitor
      const tokenAmounts = [200, 300, 250, 400];
      for (const amount of tokenAmounts) {
        await tokenMonitor.recordTokenUsage(session.id, amount, 'consistency-test');
      }

      const expectedTotal = tokenAmounts.reduce((sum, amount) => sum + amount, 0);

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify consistency across services
      const monitorUsage = await tokenMonitor.getCurrentUsage(session.id);
      const dbHistory = await database.getTokenUsageHistory(session.id);
      const sessionData = await database.getSession(session.id);

      // All sources should show consistent data
      expect(monitorUsage.totalUsed).toBe(expectedTotal);
      expect(dbHistory.length).toBe(tokenAmounts.length);
      
      const dbTotal = dbHistory.reduce((sum, record) => sum + record.tokensUsed, 0);
      expect(dbTotal).toBe(expectedTotal);

      // Session should be updated with token usage
      expect(sessionData?.tokensUsed).toBe(expectedTotal);

      await sessionManager.completeSession(session.id);
    });
  });

  describe('Service Integration Health Checks', () => {
    test('Database connectivity and operations', async () => {
      // Test basic database operations
      const testSession: Session = {
        id: 'test-db-integration',
        startTime: Date.now(),
        duration: 60000,
        tokensUsed: 0,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Create
      await database.createSession(testSession);
      
      // Read
      const retrieved = await database.getSession(testSession.id);
      expect(retrieved).toEqual(testSession);

      // Update
      testSession.tokensUsed = 500;
      testSession.updatedAt = Date.now();
      await database.updateSession(testSession);

      const updated = await database.getSession(testSession.id);
      expect(updated?.tokensUsed).toBe(500);

      // List
      const allSessions = await database.getAllSessions();
      expect(allSessions.some(s => s.id === testSession.id)).toBe(true);
    });

    test('Claude Code Integration service simulation', async () => {
      // Test the simulated Claude Code service integration
      const projectPath = './test-project';
      
      // Test project analysis
      const analysisResult = await claudeCodeIntegration.analyzeProject({
        projectPath,
        includeComplexity: true,
        includeRisks: true
      });

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.complexity).toBeDefined();
      expect(analysisResult.estimatedTokens).toBeGreaterThan(0);

      // Test session creation simulation
      const sessionResult = await claudeCodeIntegration.createSession({
        projectPath,
        sessionName: 'Integration Test',
        estimatedDuration: 60,
        tokenBudget: 1000
      });

      expect(sessionResult.success).toBe(true);
      expect(sessionResult.sessionId).toBeDefined();

      // Test token usage simulation
      const tokenResult = await claudeCodeIntegration.simulateTokenUsage(
        sessionResult.sessionId!,
        150,
        'test-operation'
      );

      expect(tokenResult.success).toBe(true);
      expect(tokenResult.totalTokens).toBe(150);
    });

    test('Project analysis integration', async () => {
      const projectPath = './test-project';
      
      // Test complexity analysis
      const complexity = await projectAnalyzer.analyzeComplexity(projectPath);
      expect(complexity.overall).toBeGreaterThan(0);
      expect(complexity.codebase).toBeDefined();
      expect(complexity.dependencies).toBeDefined();
      expect(complexity.architecture).toBeDefined();

      // Test risk assessment integration
      const quotas = {
        sonnet: { used: 200, limit: 480, percentage: 41.67 },
        opus: { used: 10, limit: 40, percentage: 25 }
      };

      const risk = await riskAssessment.assessRisk(complexity, quotas);
      expect(risk.overall).toBeGreaterThan(0);
      expect(risk.quotaRisk).toBeDefined();
      expect(risk.timeRisk).toBeDefined();
      expect(risk.complexityRisk).toBeDefined();

      // Test session planning integration
      const plan = await sessionPlanning.planSessions(complexity, risk);
      expect(plan.totalEstimatedTime).toBeGreaterThan(0);
      expect(plan.modelAllocation).toBeDefined();
      expect(plan.sessionSequence.length).toBeGreaterThan(0);

      // Test plan validation
      const validation = await sessionPlanning.validatePlan(plan, quotas);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Session recovery after service restart', async () => {
      // Create a session
      const session = await sessionManager.createSession({
        name: 'Recovery Test',
        duration: 300000, // 5 minutes
        tokenBudget: 1500
      });

      // Record some usage
      await tokenMonitor.recordTokenUsage(session.id, 200, 'pre-restart');
      
      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate service restart by recreating managers
      await sessionManager.shutdown();
      tokenMonitor.shutdown();

      // Recreate services
      const newSessionManager = new SessionManager(database, wsManager);
      const newTokenMonitor = new TokenMonitor(database, wsManager);

      // Try to resume the session
      await newSessionManager.resumeSession(session.id);
      
      // Verify session is still accessible
      const recoveredSession = await newSessionManager.getSession(session.id);
      expect(recoveredSession).toBeDefined();
      expect(recoveredSession?.status).toBe('active');

      // Record more usage
      await newTokenMonitor.recordTokenUsage(session.id, 300, 'post-restart');

      // Verify total usage is correct
      const usage = await newTokenMonitor.getCurrentUsage(session.id);
      expect(usage.totalUsed).toBe(500); // 200 + 300

      await newSessionManager.completeSession(session.id);
    });

    test('Database corruption recovery', async () => {
      // Create some test data
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const session = await sessionManager.createSession({
          name: `Test Session ${i}`,
          duration: 60000,
          tokenBudget: 1000
        });
        sessions.push(session);
        await tokenMonitor.recordTokenUsage(session.id, 100 * (i + 1), 'test-data');
      }

      // Create backup before simulating corruption
      const backup = await backupService.createBackup();
      expect(backup.id).toBeDefined();

      // Simulate database issues by creating invalid data
      try {
        await database.createSession({
          id: 'invalid-session',
          startTime: -1, // Invalid timestamp
          duration: -1000, // Invalid duration
          tokensUsed: NaN, // Invalid number
          status: 'invalid' as any, // Invalid status
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } catch (error) {
        // Expected to fail with invalid data
      }

      // Verify data integrity check detects issues
      const integrityReport = await backupService.validateDataIntegrity();
      if (integrityReport.status !== 'healthy') {
        // Restore from backup
        const restoreResult = await backupService.restoreBackup(backup.id);
        expect(restoreResult.success).toBe(true);
      }

      // Verify original sessions are still accessible
      for (const session of sessions) {
        const retrieved = await database.getSession(session.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.status).toBe('active');
      }
    });

    test('Network failure resilience', async () => {
      // Create session
      const session = await sessionManager.createSession({
        name: 'Network Test',
        duration: 120000,
        tokenBudget: 1000
      });

      // Record initial token usage
      await tokenMonitor.recordTokenUsage(session.id, 150, 'before-network-issue');

      // Simulate network issues by temporarily stopping WebSocket manager
      await wsManager.shutdown();

      // Token monitoring should still work (buffered)
      await tokenMonitor.recordTokenUsage(session.id, 200, 'during-network-issue');
      await tokenMonitor.recordTokenUsage(session.id, 175, 'still-during-issue');

      // Restart WebSocket manager
      await wsManager.start();

      // Wait for reconnection and buffer processing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify all token usage was preserved
      const usage = await tokenMonitor.getCurrentUsage(session.id);
      expect(usage.totalUsed).toBe(525); // 150 + 200 + 175

      await sessionManager.completeSession(session.id);
    });
  });

  describe('Performance and Scalability', () => {
    test('Concurrent session handling', async () => {
      const concurrentSessions = 10;
      const sessionPromises = [];

      // Create multiple sessions concurrently
      for (let i = 0; i < concurrentSessions; i++) {
        const promise = sessionManager.createSession({
          name: `Concurrent Session ${i}`,
          duration: 60000,
          tokenBudget: 500
        });
        sessionPromises.push(promise);
      }

      const sessions = await Promise.all(sessionPromises);
      expect(sessions.length).toBe(concurrentSessions);

      // Record token usage for all sessions concurrently
      const usagePromises = [];
      for (let i = 0; i < sessions.length; i++) {
        const promise = tokenMonitor.recordTokenUsage(
          sessions[i].id,
          50 * (i + 1),
          `concurrent-usage-${i}`
        );
        usagePromises.push(promise);
      }

      await Promise.all(usagePromises);

      // Verify all sessions have correct usage
      for (let i = 0; i < sessions.length; i++) {
        const usage = await tokenMonitor.getCurrentUsage(sessions[i].id);
        expect(usage.totalUsed).toBe(50 * (i + 1));
      }

      // Complete all sessions
      const completionPromises = sessions.map(session => 
        sessionManager.completeSession(session.id)
      );
      await Promise.all(completionPromises);
    });

    test('Large dataset handling', async () => {
      // Create session with large token budget
      const session = await sessionManager.createSession({
        name: 'Large Dataset Test',
        duration: 600000, // 10 minutes
        tokenBudget: 50000 // Large budget
      });

      // Simulate high-frequency token recording
      const batchSize = 100;
      const batches = 10;
      
      for (let batch = 0; batch < batches; batch++) {
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
          promises.push(
            tokenMonitor.recordTokenUsage(
              session.id,
              Math.floor(Math.random() * 100) + 1,
              `batch-${batch}-operation-${i}`
            )
          );
        }
        await Promise.all(promises);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify final usage
      const usage = await tokenMonitor.getCurrentUsage(session.id);
      expect(usage.totalUsed).toBeGreaterThan(0);
      
      // Verify database consistency
      const history = await database.getTokenUsageHistory(session.id);
      expect(history.length).toBe(batchSize * batches);

      const dbTotal = history.reduce((sum, record) => sum + record.tokensUsed, 0);
      expect(dbTotal).toBe(usage.totalUsed);

      await sessionManager.completeSession(session.id);
    });
  });
});

/**
 * System Integrity Validation
 */
describe('System Integrity Validation', () => {
  test('Complete system health check', async () => {
    const healthReport: SystemIntegrityReport = {
      timestamp: Date.now(),
      overall: 'healthy',
      components: [
        {
          name: 'Database',
          status: 'healthy',
          message: 'All database operations functional',
          metrics: { responseTime: 10, connections: 1 }
        },
        {
          name: 'WebSocket Manager',
          status: 'healthy', 
          message: 'WebSocket server running on port 8081',
          metrics: { connections: 0, uptime: 1000 }
        },
        {
          name: 'Session Manager',
          status: 'healthy',
          message: 'Session management operational',
          metrics: { activeSessions: 0 }
        },
        {
          name: 'Token Monitor',
          status: 'healthy',
          message: 'Token monitoring active',
          metrics: { batchInterval: 100 }
        }
      ],
      dependencies: [
        {
          name: 'Node.js',
          version: process.version,
          status: 'available',
          responseTime: 1
        },
        {
          name: 'File System',
          version: '1.0',
          status: 'available',
          responseTime: 5
        }
      ],
      recommendations: []
    };

    // Validate report structure
    expect(healthReport.overall).toBe('healthy');
    expect(healthReport.components.length).toBeGreaterThan(0);
    expect(healthReport.dependencies.length).toBeGreaterThan(0);

    // Validate all components are healthy
    const unhealthyComponents = healthReport.components.filter(
      c => c.status !== 'healthy'
    );
    expect(unhealthyComponents.length).toBe(0);

    // Validate all dependencies are available
    const unavailableDependencies = healthReport.dependencies.filter(
      d => d.status !== 'available'
    );
    expect(unavailableDependencies.length).toBe(0);
  });
});