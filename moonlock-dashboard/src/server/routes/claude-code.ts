/**
 * Claude Code API Routes
 * 
 * Provides real-time endpoints for Claude Code session monitoring:
 * - /api/claude-code/live-status - Current live session status
 * - /api/claude-code/precision-metrics - Token metrics with cache efficiency
 * - /api/claude-code/budget-progress - 5-hour window budget tracking
 * - /api/claude-code/session-history - Historical session data
 */

import express from 'express';
import { ClaudeCodeMonitor } from '../services/ClaudeCodeMonitor.js';
import { WebSocketManager } from '../services/WebSocketManager.js';

export function createClaudeCodeRoutes(
  claudeCodeMonitor: ClaudeCodeMonitor,
  wsManager: WebSocketManager
): express.Router {
  const router = express.Router();

  // Get current live session status
  router.get('/live-status', async (req, res) => {
    try {
      const status = claudeCodeMonitor.getCurrentLiveStatus();
      res.json(status);
    } catch (error) {
      console.error('Failed to get live status:', error);
      res.status(500).json({ 
        error: 'Failed to get live status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get precision token metrics
  router.get('/precision-metrics', async (req, res) => {
    try {
      const metrics = claudeCodeMonitor.getPrecisionTokenMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Failed to get precision metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get precision metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get budget progress for 5-hour windows
  router.get('/budget-progress', async (req, res) => {
    try {
      const progress = claudeCodeMonitor.getBudgetProgress();
      res.json(progress);
    } catch (error) {
      console.error('Failed to get budget progress:', error);
      res.status(500).json({ 
        error: 'Failed to get budget progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all session windows
  router.get('/sessions', async (req, res) => {
    try {
      const sessions = claudeCodeMonitor.getAllSessionWindows();
      res.json(sessions);
    } catch (error) {
      console.error('Failed to get sessions:', error);
      res.status(500).json({ 
        error: 'Failed to get sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get active session windows only
  router.get('/sessions/active', async (req, res) => {
    try {
      const sessions = claudeCodeMonitor.getActiveSessionWindows();
      res.json(sessions);
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      res.status(500).json({ 
        error: 'Failed to get active sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get specific session window
  router.get('/sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = claudeCodeMonitor.getSessionWindow(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Failed to get session:', error);
      res.status(500).json({ 
        error: 'Failed to get session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get session history with filtering
  router.get('/history', async (req, res) => {
    try {
      const { 
        limit = '50', 
        offset = '0', 
        status,
        projectId,
        startDate,
        endDate 
      } = req.query;

      let sessions = claudeCodeMonitor.getAllSessionWindows();
      
      // Apply filters
      if (status) {
        sessions = sessions.filter(s => s.status === status);
      }
      
      if (projectId) {
        sessions = sessions.filter(s => s.projectId === projectId);
      }
      
      if (startDate) {
        const start = new Date(startDate as string).getTime();
        sessions = sessions.filter(s => s.startTime >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string).getTime();
        sessions = sessions.filter(s => s.startTime <= end);
      }
      
      // Sort by start time (newest first)
      sessions.sort((a, b) => b.startTime - a.startTime);
      
      // Apply pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedSessions = sessions.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        sessions: paginatedSessions,
        total: sessions.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error) {
      console.error('Failed to get session history:', error);
      res.status(500).json({ 
        error: 'Failed to get session history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get analytics and insights
  router.get('/analytics', async (req, res) => {
    try {
      const sessions = claudeCodeMonitor.getAllSessionWindows();
      const activeSessions = claudeCodeMonitor.getActiveSessionWindows();
      const metrics = claudeCodeMonitor.getPrecisionTokenMetrics();
      const budget = claudeCodeMonitor.getBudgetProgress();
      
      // Calculate analytics
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const expiredSessions = sessions.filter(s => s.status === 'expired').length;
      
      const totalTokensAllTime = sessions.reduce((sum, s) => sum + s.tokenUsage.totalTokens, 0);
      const totalCostAllTime = sessions.reduce((sum, s) => sum + s.costEstimate, 0);
      const averageEfficiency = sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + s.efficiency, 0) / sessions.length 
        : 0;
      
      // Token usage trends (last 24 hours)
      const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
      const recentSessions = sessions.filter(s => s.startTime >= last24Hours);
      const hourlyUsage = new Array(24).fill(0);
      
      recentSessions.forEach(session => {
        const hour = Math.floor((Date.now() - session.startTime) / (60 * 60 * 1000));
        if (hour < 24) {
          hourlyUsage[23 - hour] += session.tokenUsage.totalTokens;
        }
      });
      
      const analytics = {
        overview: {
          totalSessions,
          activeSessions: activeSessions.length,
          completedSessions,
          expiredSessions,
          totalTokensAllTime,
          totalCostAllTime,
          averageEfficiency
        },
        current: {
          metrics,
          budget,
          activeSessionCount: activeSessions.length
        },
        trends: {
          hourlyUsage,
          last24Hours: {
            sessions: recentSessions.length,
            tokens: recentSessions.reduce((sum, s) => sum + s.tokenUsage.totalTokens, 0),
            cost: recentSessions.reduce((sum, s) => sum + s.costEstimate, 0)
          }
        },
        recommendations: generateRecommendations(sessions, metrics, budget)
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get analytics:', error);
      res.status(500).json({ 
        error: 'Failed to get analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Health check for Claude Code monitoring
  router.get('/health', async (req, res) => {
    try {
      const isMonitoring = (claudeCodeMonitor as any).isMonitoring;
      const activeWindows = claudeCodeMonitor.getAllSessionWindows().length;
      
      res.json({
        status: 'ok',
        monitoring: isMonitoring,
        activeWindows,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

function generateRecommendations(sessions: any[], metrics: any, budget: any): string[] {
  const recommendations: string[] = [];
  
  // Budget warnings
  if (budget.percentage > 90) {
    recommendations.push('⚠️ Critical: 5-hour budget nearly exhausted. Consider optimizing prompts.');
  } else if (budget.percentage > 75) {
    recommendations.push('⚠️ Warning: 75% of 5-hour budget used. Monitor usage closely.');
  }
  
  // Efficiency recommendations
  if (metrics.efficiency < 15) {
    recommendations.push('💡 Low cache efficiency detected. Consider breaking down complex requests.');
  } else if (metrics.efficiency > 40) {
    recommendations.push('✅ Excellent cache efficiency! Keep using similar conversation patterns.');
  }
  
  // Rate recommendations
  if (metrics.ratePerMin > 1000) {
    recommendations.push('🚀 High token rate detected. Consider batching requests or using shorter prompts.');
  }
  
  // Session recommendations
  const activeSessions = sessions.filter(s => s.status === 'active');
  if (activeSessions.length > 3) {
    recommendations.push('📊 Multiple active sessions detected. Consider consolidating for better tracking.');
  }
  
  // Cost optimization
  if (metrics.costEstimate > 5.0) {
    recommendations.push('💰 Session cost is high. Consider using Claude 3 Haiku for simpler tasks.');
  }
  
  // Time-based recommendations
  const now = Date.now();
  const recentSessions = sessions.filter(s => (now - s.startTime) < (60 * 60 * 1000)); // Last hour
  if (recentSessions.length > 5) {
    recommendations.push('⏰ Many sessions in the last hour. Take a break to optimize your approach.');
  }
  
  return recommendations;
}