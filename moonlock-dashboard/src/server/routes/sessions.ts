import { Router } from 'express';
import { SessionManager } from '../services/SessionManager.js';
import { TokenMonitor } from '../services/TokenMonitor.js';

export const createSessionRoutes = (sessionManager: SessionManager, tokenMonitor: TokenMonitor) => {
  const router = Router();

  // Get current active session (for auto-detection)
  router.get('/current', async (req, res) => {
    try {
      const activeSessionIds = sessionManager.getActiveSessionIds();
      
      if (activeSessionIds.length > 0) {
        // Get the most recent active session
        const sessionId = activeSessionIds[0];
        const session = await sessionManager.getSession(sessionId);
        
        if (session && session.status === 'active') {
          res.json(session);
          return;
        }
      }
      
      res.status(404).json({
        error: 'Not Found',
        message: 'No active session found',
        code: 404,
      });
    } catch (error) {
      console.error('Failed to get current session:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve current session',
        code: 500,
      });
    }
  });

  // Create new session
  router.post('/', async (req, res) => {
    try {
      const { name, duration, tokenBudget } = req.body;
      
      if (!duration || duration <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Duration must be a positive number',
          code: 400,
        });
      }

      const session = await sessionManager.createSession({
        name,
        duration,
        tokenBudget,
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Failed to create session:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create session',
        code: 500,
      });
    }
  });

  // Get session by ID
  router.get('/:id', async (req, res) => {
    try {
      const session = await sessionManager.getSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Session not found',
          code: 404,
        });
      }

      res.json(session);
    } catch (error) {
      console.error('Failed to get session:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve session',
        code: 500,
      });
    }
  });

  // Update session status
  router.patch('/:id', async (req, res) => {
    try {
      const { status } = req.body;
      const sessionId = req.params.id;
      
      if (!['active', 'paused', 'completed'].includes(status)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid status. Must be active, paused, or completed',
          code: 400,
        });
      }

      switch (status) {
        case 'paused':
          await sessionManager.pauseSession(sessionId);
          break;
        case 'active':
          await sessionManager.resumeSession(sessionId);
          break;
        case 'completed':
          await sessionManager.completeSession(sessionId);
          break;
      }

      const updatedSession = await sessionManager.getSession(sessionId);
      res.json(updatedSession);
    } catch (error) {
      console.error('Failed to update session:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update session',
        code: 500,
      });
    }
  });

  // Record token usage
  router.post('/:id/tokens', async (req, res) => {
    try {
      const { tokensUsed, operation } = req.body;
      const sessionId = req.params.id;
      
      if (!tokensUsed || tokensUsed <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'tokensUsed must be a positive number',
          code: 400,
        });
      }

      await tokenMonitor.recordTokenUsage(sessionId, tokensUsed, operation || 'unknown');
      
      const currentUsage = await tokenMonitor.getCurrentUsage(sessionId);
      res.json(currentUsage);
    } catch (error) {
      console.error('Failed to record token usage:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to record token usage',
        code: 500,
      });
    }
  });

  // Get token usage for session
  router.get('/:id/tokens', async (req, res) => {
    try {
      const sessionId = req.params.id;
      const usage = await tokenMonitor.getCurrentUsage(sessionId);
      const history = await tokenMonitor.getUsageHistory(sessionId);
      
      res.json({
        ...usage,
        history,
      });
    } catch (error) {
      console.error('Failed to get token usage:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve token usage',
        code: 500,
      });
    }
  });

  // Add checkpoint
  router.post('/:id/checkpoints', async (req, res) => {
    try {
      const { phase, promptCount, metadata } = req.body;
      const sessionId = req.params.id;
      
      if (!phase || !promptCount) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Phase and promptCount are required',
          code: 400,
        });
      }

      const checkpoint = await sessionManager.addCheckpoint(sessionId, {
        phase,
        promptCount,
        metadata,
      });

      res.status(201).json(checkpoint);
    } catch (error) {
      console.error('Failed to add checkpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add checkpoint',
        code: 500,
      });
    }
  });

  return router;
};