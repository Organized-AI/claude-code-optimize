/**
 * Anthropic API Integration Routes
 * 
 * Provides endpoints for:
 * - Real-time API usage tracking
 * - Direct Claude API interaction
 * - Cost monitoring and projections
 * - Rate limit monitoring
 * - Model usage analytics
 */

import { Router } from 'express';
import { AnthropicAPIService } from '../services/AnthropicAPIService.js';
import { TokenMonitor } from '../services/TokenMonitor.js';

export function createAnthropicRoutes(
  anthropicAPIService: AnthropicAPIService | undefined,
  tokenMonitor: TokenMonitor
): Router {
  const router = Router();

  /**
   * Middleware to check if Anthropic API service is available
   */
  const requireAPIService = (req: any, res: any, next: any) => {
    if (!anthropicAPIService) {
      return res.status(503).json({
        success: false,
        error: 'Anthropic API service not available',
        message: 'API service requires CLAUDE_API_KEY environment variable'
      });
    }
    next();
  };

  /**
   * GET /api/anthropic/usage-stats
   * Get comprehensive API usage statistics
   */
  router.get('/usage-stats', requireAPIService, async (req, res) => {
    try {
      const usageMetrics = anthropicAPIService!.getUsageMetrics();
      const healthStatus = anthropicAPIService!.getHealthStatus();
      
      res.json({
        success: true,
        data: {
          usage: usageMetrics,
          health: healthStatus,
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get API usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/comprehensive-stats
   * Get combined session and API usage statistics
   */
  router.get('/comprehensive-stats', async (req, res) => {
    try {
      const comprehensiveStats = await tokenMonitor.getComprehensiveUsageStats();
      
      res.json({
        success: true,
        data: comprehensiveStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get comprehensive stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve comprehensive statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/anthropic/direct-prompt
   * Send a direct prompt to Claude API
   */
  router.post('/direct-prompt', requireAPIService, async (req, res) => {
    try {
      const { prompt, model, maxTokens, temperature } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'prompt is required and must be a string'
        });
      }

      if (model && !['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'].includes(model)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid model',
          message: 'model must be claude-3-5-sonnet-20241022 or claude-3-opus-20240229'
        });
      }

      const response = await anthropicAPIService!.sendDirectPrompt({
        prompt,
        model: model || 'claude-3-5-sonnet-20241022',
        maxTokens: maxTokens || 4000,
        temperature: temperature || 0.7
      });
      
      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to send direct prompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send prompt to Claude API',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/health-check
   * Perform API health check
   */
  router.get('/health-check', requireAPIService, async (req, res) => {
    try {
      const healthCheck = await anthropicAPIService!.performHealthCheck();
      
      res.json({
        success: true,
        data: healthCheck,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ API health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'API health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/models
   * Get available Claude models
   */
  router.get('/models', requireAPIService, async (req, res) => {
    try {
      const models = await anthropicAPIService!.getAvailableModels();
      
      res.json({
        success: true,
        data: {
          models,
          count: models.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get available models:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available models',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/quota-alerts
   * Get quota and efficiency alerts
   */
  router.get('/quota-alerts', async (req, res) => {
    try {
      const quotaAlerts = await tokenMonitor.generateQuotaAlerts();
      
      res.json({
        success: true,
        data: {
          alerts: quotaAlerts,
          count: quotaAlerts.length,
          critical: quotaAlerts.filter(a => a.severity === 'critical').length,
          high: quotaAlerts.filter(a => a.severity === 'high').length,
          medium: quotaAlerts.filter(a => a.severity === 'medium').length,
          low: quotaAlerts.filter(a => a.severity === 'low').length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get quota alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quota alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/api-health-status
   * Get real-time API health and usage status
   */
  router.get('/api-health-status', async (req, res) => {
    try {
      const apiHealthStatus = await tokenMonitor.getAPIHealthStatus();
      
      res.json({
        success: true,
        data: apiHealthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get API health status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API health status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/cost-projection/:sessionId
   * Get cost-aware projections for a session
   */
  router.get('/cost-projection/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing session ID',
          message: 'sessionId parameter is required'
        });
      }

      const costProjection = await tokenMonitor.getCostAwareProjection(sessionId);
      
      res.json({
        success: true,
        data: costProjection,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get cost projection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cost projection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/anthropic/record-usage
   * Record API-integrated token usage
   */
  router.post('/record-usage', async (req, res) => {
    try {
      const { 
        sessionId, 
        tokensUsed, 
        operation, 
        apiCost, 
        model, 
        apiResponseTime 
      } = req.body;
      
      if (!sessionId || !tokensUsed || !operation) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'sessionId, tokensUsed, and operation are required'
        });
      }

      await tokenMonitor.recordAPIIntegratedUsage(
        sessionId,
        tokensUsed,
        operation,
        apiCost,
        model,
        apiResponseTime
      );
      
      res.json({
        success: true,
        message: 'API usage recorded successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to record API usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record API usage',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/anthropic/reset-daily-metrics
   * Reset daily API usage metrics (admin endpoint)
   */
  router.post('/reset-daily-metrics', requireAPIService, async (req, res) => {
    try {
      anthropicAPIService!.resetDailyMetrics();
      
      res.json({
        success: true,
        message: 'Daily metrics reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to reset daily metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset daily metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/anthropic/status
   * Get service availability status
   */
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        serviceAvailable: !!anthropicAPIService,
        features: {
          directPrompts: !!anthropicAPIService,
          usageTracking: true,
          costProjections: !!anthropicAPIService,
          healthMonitoring: !!anthropicAPIService,
          quotaAlerts: true
        },
        message: anthropicAPIService ? 
          'Anthropic API service is fully operational' : 
          'Anthropic API service not available (requires CLAUDE_API_KEY)'
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}