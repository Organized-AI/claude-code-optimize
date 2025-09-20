import { Router } from 'express';
import { TokenPredictorService } from '../services/TokenPredictorService.js';
import { ExtendedSessionManager } from '../services/ExtendedSessionManager.js';
import { WebSocketManager } from '../services/WebSocketManager.js';

export function createPredictionsRouter(
  sessionManager: ExtendedSessionManager,
  wsManager: WebSocketManager
): Router {
  const router = Router();
  const predictor = new TokenPredictorService(sessionManager, wsManager);
  
  // Get token usage prediction for a session
  router.get('/sessions/:sessionId/prediction', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const prediction = await predictor.predictTokenUsage(sessionId);
      res.json(prediction);
    } catch (error) {
      console.error('Error getting prediction:', error);
      res.status(500).json({ 
        error: 'Failed to generate prediction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get optimal schedule for a session
  router.get('/sessions/:sessionId/schedule', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const schedule = await predictor.generateOptimalSchedule(sessionId);
      res.json(schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
      res.status(500).json({ 
        error: 'Failed to generate schedule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get predictions for all active sessions
  router.get('/predictions/active', async (req, res) => {
    try {
      const sessions = await sessionManager.getAllSessions();
      const activeSessions = sessions.filter(s => s.status === 'active');
      
      const predictions = await Promise.all(
        activeSessions.map(async session => {
          try {
            const prediction = await predictor.predictTokenUsage(session.id);
            return { sessionId: session.id, prediction };
          } catch (error) {
            return { sessionId: session.id, error: 'Failed to generate prediction' };
          }
        })
      );
      
      res.json(predictions);
    } catch (error) {
      console.error('Error getting active predictions:', error);
      res.status(500).json({ 
        error: 'Failed to get active predictions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}