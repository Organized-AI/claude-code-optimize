import { Router } from 'express';
import { BurnRateMonitorService } from '../services/BurnRateMonitorService.js';
import { ExtendedSessionManager } from '../services/ExtendedSessionManager.js';
import { WebSocketManager } from '../services/WebSocketManager.js';

export function createBurnRateRouter(
  sessionManager: ExtendedSessionManager,
  wsManager: WebSocketManager
): Router {
  const router = Router();
  const burnRateService = new BurnRateMonitorService(sessionManager, wsManager);
  
  // Start monitoring a session
  router.post('/sessions/:sessionId/monitor/start', async (req, res) => {
    try {
      const { sessionId } = req.params;
      await burnRateService.startMonitoring(sessionId);
      res.json({ success: true, message: 'Monitoring started' });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      res.status(500).json({ 
        error: 'Failed to start monitoring',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Stop monitoring a session
  router.post('/sessions/:sessionId/monitor/stop', async (req, res) => {
    try {
      const { sessionId } = req.params;
      burnRateService.stopMonitoring(sessionId);
      res.json({ success: true, message: 'Monitoring stopped' });
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      res.status(500).json({ 
        error: 'Failed to stop monitoring',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get current burn rate metrics
  router.get('/sessions/:sessionId/metrics', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const metrics = await burnRateService.getMetrics(sessionId);
      
      if (!metrics) {
        return res.status(404).json({ error: 'Metrics not found' });
      }
      
      res.json(metrics);
    } catch (error) {
      console.error('Error getting metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get historical metrics
  router.get('/sessions/:sessionId/metrics/history', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { start, end } = req.query;
      
      const startTime = start ? parseInt(start as string) : Date.now() - 60 * 60 * 1000; // Default last hour
      const endTime = end ? parseInt(end as string) : Date.now();
      
      const history = await burnRateService.getHistoricalMetrics(sessionId, {
        start: startTime,
        end: endTime
      });
      
      res.json(history);
    } catch (error) {
      console.error('Error getting historical metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get historical metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Acknowledge an alert
  router.post('/alerts/:alertId/acknowledge', async (req, res) => {
    try {
      const { alertId } = req.params;
      await burnRateService.acknowledgeAlert(alertId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ 
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get all active monitoring sessions
  router.get('/monitor/active', async (req, res) => {
    try {
      const sessions = await sessionManager.getAllSessions();
      const activeSessions = sessions.filter(s => s.status === 'active');
      
      const metricsPromises = activeSessions.map(async session => {
        const metrics = await burnRateService.getMetrics(session.id);
        return {
          sessionId: session.id,
          sessionName: session.name,
          metrics
        };
      });
      
      const results = await Promise.all(metricsPromises);
      res.json(results.filter(r => r.metrics !== null));
    } catch (error) {
      console.error('Error getting active monitors:', error);
      res.status(500).json({ 
        error: 'Failed to get active monitors',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}