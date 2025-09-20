import { Router } from 'express';
import { JsonDatabaseManager as DatabaseManager } from '../services/JsonDatabaseManager.js';

export const createAnalyticsRoutes = (db: DatabaseManager) => {
  const router = Router();

  // Get usage analytics
  router.get('/usage', async (req, res) => {
    try {
      const { period = 'day' } = req.query;
      
      if (!['hour', 'day', 'week', 'month'].includes(period as string)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid period. Must be hour, day, week, or month',
          code: 400,
        });
      }

      const analytics = await db.getUsageAnalytics(period as any);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve analytics',
        code: 500,
      });
    }
  });

  // Export data
  router.get('/export', async (req, res) => {
    try {
      const data = await db.exportData();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=moonlock-export.json');
      res.json(data);
    } catch (error) {
      console.error('Failed to export data:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to export data',
        code: 500,
      });
    }
  });

  return router;
};