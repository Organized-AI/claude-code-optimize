/**
 * Health and Hook Activity API Routes
 * 
 * Provides endpoints for:
 * - Mission-critical system alerts
 * - System health monitoring
 * - Hook activity logging and statistics
 * - Rule2hook integration monitoring
 * - Performance metrics
 * - Disaster prevention alerts
 */

import { Router } from 'express';
import { HealthMonitoring } from '../services/HealthMonitoring.js';
import { HookLoggingService } from '../services/HookLoggingService.js';

export function createHealthRoutes(healthMonitoring: HealthMonitoring, hookLoggingService?: HookLoggingService): Router {
  const router = Router();

  /**
   * GET /api/health/critical-alerts
   * Get mission-critical alerts for disaster prevention
   */
  router.get('/critical-alerts', async (req, res) => {
    try {
      const alertsReport = await healthMonitoring.generateCriticalAlertsReport();
      
      res.json({
        success: true,
        data: alertsReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get critical alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve critical alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/health/system-status
   * Get comprehensive system health status
   */
  router.get('/system-status', async (req, res) => {
    try {
      const systemHealth = await healthMonitoring.getSystemHealth();
      
      res.json({
        success: true,
        data: systemHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/health/alerts/:severity
   * Get alerts by severity level
   */
  router.get('/alerts/:severity', async (req, res) => {
    try {
      const { severity } = req.params;
      
      if (!['critical', 'warning', 'healthy'].includes(severity)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid severity level',
          message: 'Severity must be one of: critical, warning, healthy'
        });
      }

      const alertsReport = await healthMonitoring.generateCriticalAlertsReport();
      const filteredAlerts = alertsReport.alerts.filter(alert => alert.type === severity);
      
      res.json({
        success: true,
        data: {
          severity,
          count: filteredAlerts.length,
          alerts: filteredAlerts,
          overallStatus: alertsReport.overallStatus
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Failed to get ${req.params.severity} alerts:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to retrieve ${req.params.severity} alerts`,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/health/run-checks
   * Run custom health checks
   */
  router.post('/run-checks', async (req, res) => {
    try {
      const { checks } = req.body;
      
      if (!Array.isArray(checks)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request format',
          message: 'checks must be an array of health check definitions'
        });
      }

      const results = await healthMonitoring.runHealthChecks(checks);
      
      res.json({
        success: true,
        data: {
          totalChecks: checks.length,
          results,
          summary: {
            passed: results.filter(r => r.status === 'pass').length,
            failed: results.filter(r => r.status === 'fail').length,
            warnings: results.filter(r => r.status === 'warn').length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to run health checks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run health checks',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/health/metrics/:duration
   * Monitor system metrics for specified duration (in milliseconds)
   */
  router.get('/metrics/:duration', async (req, res) => {
    try {
      const duration = parseInt(req.params.duration);
      
      if (isNaN(duration) || duration <= 0 || duration > 600000) { // Max 10 minutes
        return res.status(400).json({
          success: false,
          error: 'Invalid duration',
          message: 'Duration must be a positive number up to 600000ms (10 minutes)'
        });
      }

      const metricsReport = await healthMonitoring.monitorSystemMetrics(duration);
      
      res.json({
        success: true,
        data: metricsReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to monitor system metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to monitor system metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/health/anomalies
   * Detect system anomalies in specified time range
   */
  router.get('/anomalies', async (req, res) => {
    try {
      const { start, end } = req.query;
      
      const timeRange = {
        start: start ? parseInt(start as string) : Date.now() - (60 * 60 * 1000), // Default: last hour
        end: end ? parseInt(end as string) : Date.now()
      };

      if (isNaN(timeRange.start) || isNaN(timeRange.end) || timeRange.start >= timeRange.end) {
        return res.status(400).json({
          success: false,
          error: 'Invalid time range',
          message: 'start and end must be valid timestamps with start < end'
        });
      }

      const anomalyReport = await healthMonitoring.detectAnomalies(timeRange);
      
      res.json({
        success: true,
        data: anomalyReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to detect anomalies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect anomalies',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/health/live-alerts
   * Get current live critical alerts (cached from last check)
   */
  router.get('/live-alerts', async (req, res) => {
    try {
      const liveAlerts = healthMonitoring.getCriticalAlerts();
      
      res.json({
        success: true,
        data: {
          count: liveAlerts.length,
          alerts: liveAlerts,
          lastUpdate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get live alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve live alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Hook Activity Endpoints (if HookLoggingService is available)
  if (hookLoggingService) {
    /**
     * GET /api/health/hook-logs
     * Get recent hook activity logs
     */
    router.get('/hook-logs', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        
        if (limit > 200) {
          return res.status(400).json({
            success: false,
            error: 'Invalid limit',
            message: 'Limit cannot exceed 200'
          });
        }

        const logs = await hookLoggingService.getRecentLogs(limit);
        
        res.json({
          success: true,
          data: {
            logs,
            count: logs.length,
            limit
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Failed to get hook logs:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve hook logs',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * GET /api/health/hook-stats
     * Get hook execution statistics and performance metrics
     */
    router.get('/hook-stats', async (req, res) => {
      try {
        const stats = await hookLoggingService.getHookStats();
        
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Failed to get hook stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve hook statistics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * GET /api/health/active-hooks
     * Get list of currently active hooks
     */
    router.get('/active-hooks', async (req, res) => {
      try {
        const stats = await hookLoggingService.getHookStats();
        
        res.json({
          success: true,
          data: {
            totalHooks: stats.totalHooks,
            activeHooks: stats.activeHooks,
            hooksByType: stats.hooksByType,
            hooksBySource: stats.hooksBySource
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Failed to get active hooks:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve active hooks',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * GET /api/health/hook-activity-feed
     * Get formatted hook activity feed for dashboard display
     */
    router.get('/hook-activity-feed', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const logs = await hookLoggingService.getRecentLogs(limit);
        const stats = await hookLoggingService.getHookStats();
        
        // Format for dashboard consumption
        const feed = {
          recentActivity: logs.map(log => ({
            id: log.id,
            hookName: log.hookName,
            event: log.event,
            status: log.status,
            source: log.source,
            timestamp: log.timestamp,
            duration: log.duration,
            command: log.command,
            error: log.error
          })),
          summary: {
            totalHooks: stats.totalHooks,
            activeHooks: stats.activeHooks,
            recentExecutions: logs.filter(l => l.event === 'executed').length,
            successRate: stats.successRate,
            averageExecutionTime: stats.averageExecutionTime
          },
          categories: stats.hooksByType,
          sources: stats.hooksBySource
        };
        
        res.json({
          success: true,
          data: feed,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Failed to get hook activity feed:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve hook activity feed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * POST /api/health/record-hook-execution
     * Record a hook execution event (for external integrations)
     */
    router.post('/record-hook-execution', async (req, res) => {
      try {
        const { hookId, hookName, command, result } = req.body;
        
        if (!hookId || !hookName || !command || !result) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: 'hookId, hookName, command, and result are required'
          });
        }

        await hookLoggingService.recordHookExecution(hookId, hookName, command, result);
        
        res.json({
          success: true,
          message: 'Hook execution recorded successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Failed to record hook execution:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to record hook execution',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  } else {
    // Return 503 for hook-related endpoints when service is not available
    const hookEndpoints = ['/hook-logs', '/hook-stats', '/active-hooks', '/hook-activity-feed'];
    
    hookEndpoints.forEach(endpoint => {
      router.get(endpoint, (req, res) => {
        res.status(503).json({
          success: false,
          error: 'Hook Logging Service not available',
          message: 'Hook logging functionality is not enabled'
        });
      });
    });

    router.post('/record-hook-execution', (req, res) => {
      res.status(503).json({
        success: false,
        error: 'Hook Logging Service not available',
        message: 'Hook logging functionality is not enabled'
      });
    });
  }

  return router;
}