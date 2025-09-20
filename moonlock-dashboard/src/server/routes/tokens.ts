import { Router } from 'express';
import { TokenMonitor } from '../services/TokenMonitor.js';

export const createTokenRoutes = (tokenMonitor: TokenMonitor) => {
  const router = Router();

  // Get token usage analytics
  router.get('/analytics', async (req, res) => {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'sessionId is required',
          code: 400,
        });
      }

      const usage = await tokenMonitor.getCurrentUsage(sessionId);
      const projection = await tokenMonitor.generateUsageProjection(sessionId);
      const alerts = await tokenMonitor.checkAlerts(sessionId);

      res.json({
        usage,
        projection,
        alerts,
      });
    } catch (error) {
      console.error('Failed to get token analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve token analytics',
        code: 500,
      });
    }
  });

  return router;
};