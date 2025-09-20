/**
 * Testing API Endpoints
 * 
 * Provides REST API endpoints for the Testing & Validation system:
 * - Quota protection testing endpoints
 * - System integration test endpoints  
 * - Performance testing endpoints
 * - Data integrity validation endpoints
 * - Health monitoring endpoints
 * - Test automation endpoints
 * 
 * All endpoints implement the TestingAPI interface functionality.
 */

import { Router, Request, Response } from 'express';
import { TestingService } from '../services/TestingService.js';
import { ValidationService } from '../services/ValidationService.js';
import { HealthMonitoring } from '../services/HealthMonitoring.js';
import {
  QuotaTestScenario,
  QuotaLimitTest,
  IntegrationTestSuite,
  LoadTestConfig,
  PerformanceScenario,
  HealthCheck,
  SystemFailureType,
  TestSchedule,
  TestHistoryFilter
} from '../../contracts/AgentInterfaces.js';

export function createTestingRouter(testingService: TestingService): Router {
  const router = Router();

  // QUOTA PROTECTION VALIDATION ENDPOINTS

  /**
   * POST /api/testing/quota/validate
   * Validate quota protection with test scenarios
   */
  router.post('/quota/validate', async (req: Request, res: Response) => {
    try {
      const scenarios: QuotaTestScenario[] = req.body.scenarios;
      
      if (!Array.isArray(scenarios)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'scenarios must be an array of QuotaTestScenario objects'
        });
      }

      const result = await testingService.validateQuotaProtection(scenarios);
      
      // Log critical failures for monitoring
      if (result.criticalFailures.length > 0) {
        console.error('CRITICAL QUOTA PROTECTION FAILURES:', result.criticalFailures);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Quota validation failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/quota/limits
   * Test quota limits for a specific model
   */
  router.post('/quota/limits', async (req: Request, res: Response) => {
    try {
      const { model, testCases } = req.body;
      
      if (!model || !['sonnet', 'opus'].includes(model)) {
        return res.status(400).json({
          error: 'Invalid model',
          message: 'model must be either "sonnet" or "opus"'
        });
      }

      if (!Array.isArray(testCases)) {
        return res.status(400).json({
          error: 'Invalid test cases',
          message: 'testCases must be an array of QuotaLimitTest objects'
        });
      }

      const results = await testingService.testQuotaLimits(model, testCases);
      res.json(results);
    } catch (error) {
      res.status(500).json({
        error: 'Quota limit test failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/quota/simulate-exhaustion
   * Simulate quota exhaustion scenario
   */
  router.post('/quota/simulate-exhaustion', async (req: Request, res: Response) => {
    try {
      const { model, approachRate } = req.body;
      
      if (!model || !['sonnet', 'opus'].includes(model)) {
        return res.status(400).json({
          error: 'Invalid model',
          message: 'model must be either "sonnet" or "opus"'
        });
      }

      if (typeof approachRate !== 'number' || approachRate <= 0) {
        return res.status(400).json({
          error: 'Invalid approach rate',
          message: 'approachRate must be a positive number'
        });
      }

      const result = await testingService.simulateQuotaExhaustion(model, approachRate);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Quota exhaustion simulation failed',
        message: error.message
      });
    }
  });

  // SYSTEM INTEGRATION TESTING ENDPOINTS

  /**
   * POST /api/testing/integration/run
   * Run integration test suite
   */
  router.post('/integration/run', async (req: Request, res: Response) => {
    try {
      const testSuite: IntegrationTestSuite = req.body;

      if (!testSuite.name || !Array.isArray(testSuite.tests)) {
        return res.status(400).json({
          error: 'Invalid test suite',
          message: 'Test suite must have a name and tests array'
        });
      }

      const result = await testingService.runIntegrationTests(testSuite);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Integration test failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/integration/system-integrity
   * Validate system integrity
   */
  router.get('/integration/system-integrity', async (req: Request, res: Response) => {
    try {
      const report = await testingService.validateSystemIntegrity();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'System integrity validation failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/integration/websocket-test
   * Test WebSocket connections
   */
  router.get('/integration/websocket-test', async (req: Request, res: Response) => {
    try {
      const result = await testingService.testWebSocketConnections();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'WebSocket test failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/integration/data-consistency
   * Validate data consistency
   */
  router.get('/integration/data-consistency', async (req: Request, res: Response) => {
    try {
      const report = await testingService.validateDataConsistency();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Data consistency validation failed',
        message: error.message
      });
    }
  });

  // PERFORMANCE TESTING ENDPOINTS

  /**
   * POST /api/testing/performance/load-test
   * Run load tests
   */
  router.post('/performance/load-test', async (req: Request, res: Response) => {
    try {
      const config: LoadTestConfig = req.body;

      if (!config.name || !config.targetRPS || !config.duration) {
        return res.status(400).json({
          error: 'Invalid load test config',
          message: 'Config must include name, targetRPS, and duration'
        });
      }

      const result = await testingService.runLoadTests(config);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Load test failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/performance/benchmark
   * Run performance benchmark
   */
  router.post('/performance/benchmark', async (req: Request, res: Response) => {
    try {
      const scenarios: PerformanceScenario[] = req.body.scenarios;

      if (!Array.isArray(scenarios)) {
        return res.status(400).json({
          error: 'Invalid scenarios',
          message: 'scenarios must be an array of PerformanceScenario objects'
        });
      }

      const result = await testingService.benchmarkPerformance(scenarios);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Performance benchmark failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/performance/memory-monitor
   * Monitor memory usage
   */
  router.post('/performance/memory-monitor', async (req: Request, res: Response) => {
    try {
      const { duration } = req.body;

      if (typeof duration !== 'number' || duration <= 0 || duration > 300000) {
        return res.status(400).json({
          error: 'Invalid duration',
          message: 'duration must be a positive number (max 300000ms / 5 minutes)'
        });
      }

      const report = await testingService.monitorMemoryUsage(duration);
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Memory monitoring failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/performance/concurrency-test
   * Test concurrent sessions
   */
  router.post('/performance/concurrency-test', async (req: Request, res: Response) => {
    try {
      const { sessionCount } = req.body;

      if (typeof sessionCount !== 'number' || sessionCount <= 0 || sessionCount > 100) {
        return res.status(400).json({
          error: 'Invalid session count',
          message: 'sessionCount must be a positive number (max 100)'
        });
      }

      const result = await testingService.testConcurrentSessions(sessionCount);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Concurrency test failed',
        message: error.message
      });
    }
  });

  // DATA INTEGRITY VALIDATION ENDPOINTS

  /**
   * GET /api/testing/data-integrity/validate
   * Validate data integrity
   */
  router.get('/data-integrity/validate', async (req: Request, res: Response) => {
    try {
      const report = await testingService.validateDataIntegrity();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Data integrity validation failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/data-integrity/backup-restore-test
   * Test backup and restore functionality
   */
  router.post('/data-integrity/backup-restore-test', async (req: Request, res: Response) => {
    try {
      const result = await testingService.testBackupRestore();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Backup restore test failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/data-integrity/session-persistence
   * Validate session persistence
   */
  router.get('/data-integrity/session-persistence', async (req: Request, res: Response) => {
    try {
      const report = await testingService.validateSessionPersistence();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Session persistence validation failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/data-integrity/database-consistency
   * Test database consistency
   */
  router.get('/data-integrity/database-consistency', async (req: Request, res: Response) => {
    try {
      const report = await testingService.testDatabaseConsistency();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Database consistency test failed',
        message: error.message
      });
    }
  });

  // HEALTH MONITORING ENDPOINTS

  /**
   * GET /api/testing/health/system-health
   * Get current system health
   */
  router.get('/health/system-health', async (req: Request, res: Response) => {
    try {
      const report = await testingService.getSystemHealth();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'System health check failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/health/checks
   * Run custom health checks
   */
  router.post('/health/checks', async (req: Request, res: Response) => {
    try {
      const checks: HealthCheck[] = req.body.checks;

      if (!Array.isArray(checks)) {
        return res.status(400).json({
          error: 'Invalid health checks',
          message: 'checks must be an array of HealthCheck objects'
        });
      }

      const results = await testingService.runHealthChecks(checks);
      res.json(results);
    } catch (error) {
      res.status(500).json({
        error: 'Health checks failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/health/metrics-monitor
   * Monitor system metrics
   */
  router.post('/health/metrics-monitor', async (req: Request, res: Response) => {
    try {
      const { duration } = req.body;

      if (typeof duration !== 'number' || duration <= 0 || duration > 600000) {
        return res.status(400).json({
          error: 'Invalid duration',
          message: 'duration must be a positive number (max 600000ms / 10 minutes)'
        });
      }

      const report = await testingService.monitorSystemMetrics(duration);
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'System metrics monitoring failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/health/anomaly-detection
   * Detect anomalies in system metrics
   */
  router.post('/health/anomaly-detection', async (req: Request, res: Response) => {
    try {
      const { timeRange } = req.body;

      if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
        return res.status(400).json({
          error: 'Invalid time range',
          message: 'timeRange must have start and end timestamps'
        });
      }

      if (timeRange.start >= timeRange.end) {
        return res.status(400).json({
          error: 'Invalid time range',
          message: 'start time must be before end time'
        });
      }

      const report = await testingService.detectAnomalies(timeRange);
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Anomaly detection failed',
        message: error.message
      });
    }
  });

  // TEST AUTOMATION ENDPOINTS

  /**
   * POST /api/testing/automation/schedule
   * Schedule a test run
   */
  router.post('/automation/schedule', async (req: Request, res: Response) => {
    try {
      const schedule: TestSchedule = req.body;

      if (!schedule.name || !schedule.cron || !schedule.testSuite) {
        return res.status(400).json({
          error: 'Invalid schedule',
          message: 'Schedule must have name, cron pattern, and testSuite'
        });
      }

      await testingService.scheduleTestRun(schedule);
      res.json({ message: 'Test run scheduled successfully', schedule: schedule.name });
    } catch (error) {
      res.status(500).json({
        error: 'Test scheduling failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/automation/history
   * Get test execution history
   */
  router.get('/automation/history', async (req: Request, res: Response) => {
    try {
      const filter: TestHistoryFilter = {};

      // Parse query parameters
      if (req.query.testSuite) filter.testSuite = req.query.testSuite as string;
      if (req.query.status) filter.status = req.query.status as any;
      if (req.query.limit) filter.limit = parseInt(req.query.limit as string);
      
      if (req.query.startDate && req.query.endDate) {
        filter.dateRange = {
          start: parseInt(req.query.startDate as string),
          end: parseInt(req.query.endDate as string)
        };
      }

      const history = await testingService.getTestHistory(filter);
      res.json(history);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve test history',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/automation/report/:testRunId
   * Generate test report for a specific test run
   */
  router.get('/automation/report/:testRunId', async (req: Request, res: Response) => {
    try {
      const { testRunId } = req.params;

      if (!testRunId) {
        return res.status(400).json({
          error: 'Invalid test run ID',
          message: 'testRunId parameter is required'
        });
      }

      const report = await testingService.generateTestReport(testRunId);
      res.json(report);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Test run not found',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Report generation failed',
          message: error.message
        });
      }
    }
  });

  // EMERGENCY PROTOCOL TESTING ENDPOINTS

  /**
   * POST /api/testing/emergency/test-protocols
   * Test emergency protocols
   */
  router.post('/emergency/test-protocols', async (req: Request, res: Response) => {
    try {
      const result = await testingService.testEmergencyProtocols();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Emergency protocol testing failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/emergency/simulate-failure
   * Simulate system failure
   */
  router.post('/emergency/simulate-failure', async (req: Request, res: Response) => {
    try {
      const { failureType } = req.body;

      const validFailureTypes: SystemFailureType[] = [
        'database_failure',
        'network_partition',
        'memory_exhaustion',
        'cpu_overload',
        'disk_full',
        'service_crash',
        'quota_exceeded'
      ];

      if (!failureType || !validFailureTypes.includes(failureType)) {
        return res.status(400).json({
          error: 'Invalid failure type',
          message: `failureType must be one of: ${validFailureTypes.join(', ')}`
        });
      }

      const result = await testingService.simulateSystemFailure(failureType);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'System failure simulation failed',
        message: error.message
      });
    }
  });

  /**
   * POST /api/testing/emergency/validate-recovery
   * Validate recovery procedures
   */
  router.post('/emergency/validate-recovery', async (req: Request, res: Response) => {
    try {
      const result = await testingService.validateRecoveryProcedures();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Recovery validation failed',
        message: error.message
      });
    }
  });

  // UTILITY ENDPOINTS

  /**
   * GET /api/testing/status
   * Get testing service status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const status = {
        service: 'Testing & Validation Service',
        version: '1.0.0',
        status: 'operational',
        uptime: process.uptime(),
        timestamp: Date.now(),
        capabilities: [
          'quota-protection-validation',
          'system-integration-testing',
          'performance-testing',
          'data-integrity-validation',
          'health-monitoring',
          'emergency-protocol-testing'
        ]
      };

      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Status check failed',
        message: error.message
      });
    }
  });

  /**
   * GET /api/testing/capabilities
   * List all available testing capabilities
   */
  router.get('/capabilities', (req: Request, res: Response) => {
    const capabilities = {
      quotaProtection: {
        description: 'Validate 90% quota safety requirements',
        endpoints: [
          'POST /api/testing/quota/validate',
          'POST /api/testing/quota/limits',
          'POST /api/testing/quota/simulate-exhaustion'
        ]
      },
      systemIntegration: {
        description: 'Test end-to-end system integration',
        endpoints: [
          'POST /api/testing/integration/run',
          'GET /api/testing/integration/system-integrity',
          'GET /api/testing/integration/websocket-test',
          'GET /api/testing/integration/data-consistency'
        ]
      },
      performance: {
        description: 'Performance and load testing',
        endpoints: [
          'POST /api/testing/performance/load-test',
          'POST /api/testing/performance/benchmark',
          'POST /api/testing/performance/memory-monitor',
          'POST /api/testing/performance/concurrency-test'
        ]
      },
      dataIntegrity: {
        description: 'Data consistency and integrity validation',
        endpoints: [
          'GET /api/testing/data-integrity/validate',
          'POST /api/testing/data-integrity/backup-restore-test',
          'GET /api/testing/data-integrity/session-persistence',
          'GET /api/testing/data-integrity/database-consistency'
        ]
      },
      healthMonitoring: {
        description: 'System health monitoring and anomaly detection',
        endpoints: [
          'GET /api/testing/health/system-health',
          'POST /api/testing/health/checks',
          'POST /api/testing/health/metrics-monitor',
          'POST /api/testing/health/anomaly-detection'
        ]
      },
      emergencyProtocols: {
        description: 'Emergency protocol and recovery testing',
        endpoints: [
          'POST /api/testing/emergency/test-protocols',
          'POST /api/testing/emergency/simulate-failure',
          'POST /api/testing/emergency/validate-recovery'
        ]
      }
    };

    res.json(capabilities);
  });

  return router;
}