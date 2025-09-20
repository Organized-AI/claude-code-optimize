/**
 * OpenRouter API Integration Routes
 * 
 * Provides endpoints for:
 * - Real-time OpenRouter API usage tracking
 * - Direct OpenRouter API interaction with multi-model support
 * - Cost monitoring and credit tracking
 * - Multi-provider performance comparison
 * - Model availability and provider stats
 */

import { Router } from 'express';
import { OpenRouterAPIService } from '../services/OpenRouterAPIService.js';
import { TokenMonitor } from '../services/TokenMonitor.js';

export function createOpenRouterRoutes(
  openrouterAPIService: OpenRouterAPIService | undefined,
  tokenMonitor: TokenMonitor
): Router {
  const router = Router();

  /**
   * Middleware to check if OpenRouter API service is available
   */
  const requireAPIService = (req: any, res: any, next: any) => {
    if (!openrouterAPIService) {
      return res.status(503).json({
        success: false,
        error: 'OpenRouter API service not available',
        message: 'API service requires OPENROUTER_API_KEY environment variable'
      });
    }
    next();
  };

  /**
   * GET /api/openrouter/usage-stats
   * Get comprehensive OpenRouter API usage statistics
   */
  router.get('/usage-stats', requireAPIService, async (req, res) => {
    try {
      const usageMetrics = openrouterAPIService!.getUsageMetrics();
      const healthStatus = openrouterAPIService!.getHealthStatus();
      
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
      console.error('❌ Failed to get OpenRouter usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve OpenRouter usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/openrouter/models
   * Get available OpenRouter models and providers
   */
  router.get('/models', requireAPIService, async (req, res) => {
    try {
      const models = await openrouterAPIService!.getAvailableModels();
      
      // Group models by provider
      const modelsByProvider = models.reduce((acc: any, model: any) => {
        const provider = model.id.includes('/') ? model.id.split('/')[0] : 'unknown';
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          models,
          modelsByProvider,
          totalModels: models.length,
          providers: Object.keys(modelsByProvider),
          providerCount: Object.keys(modelsByProvider).length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get OpenRouter models:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available models',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/openrouter/direct-prompt
   * Send a direct prompt to OpenRouter API
   */
  router.post('/direct-prompt', requireAPIService, async (req, res) => {
    try {
      const { 
        prompt, 
        model, 
        maxTokens, 
        temperature, 
        topP, 
        frequencyPenalty, 
        presencePenalty, 
        stop,
        stream 
      } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'prompt is required and must be a string'
        });
      }

      if (!model || typeof model !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'model is required and must be a string'
        });
      }

      const response = await openrouterAPIService!.sendDirectPrompt({
        prompt,
        model,
        maxTokens: maxTokens || 4000,
        temperature: temperature || 0.7,
        topP: topP || 1,
        frequencyPenalty: frequencyPenalty || 0,
        presencePenalty: presencePenalty || 0,
        stop: stop || null,
        stream: stream || false
      });
      
      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to send OpenRouter prompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send prompt to OpenRouter API',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/openrouter/health-check
   * Perform OpenRouter API health check
   */
  router.get('/health-check', requireAPIService, async (req, res) => {
    try {
      const healthCheck = await openrouterAPIService!.performHealthCheck();
      
      res.json({
        success: true,
        data: healthCheck,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ OpenRouter health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'OpenRouter health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/openrouter/credit-balance
   * Get current OpenRouter credit balance and usage
   */
  router.get('/credit-balance', requireAPIService, async (req, res) => {
    try {
      const balanceData = await openrouterAPIService!.getCreditBalance();
      
      res.json({
        success: true,
        data: balanceData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get OpenRouter credit balance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve credit balance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/openrouter/provider-stats
   * Get usage statistics by provider
   */
  router.get('/provider-stats', requireAPIService, async (req, res) => {
    try {
      const usageMetrics = openrouterAPIService!.getUsageMetrics();
      
      res.json({
        success: true,
        data: {
          providerStats: usageMetrics.providerStats,
          modelDistribution: usageMetrics.modelUsageDistribution,
          totalProviders: Object.keys(usageMetrics.providerStats).length,
          mostUsedProvider: Object.entries(usageMetrics.providerStats)
            .sort(([,a], [,b]) => b.requests - a.requests)[0]?.[0] || 'none'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get provider stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve provider statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/openrouter/multi-provider-comparison
   * Compare usage across different providers
   */
  router.get('/multi-provider-comparison', requireAPIService, async (req, res) => {
    try {
      const comprehensiveStats = await tokenMonitor.getComprehensiveUsageStats();
      
      const comparison = {
        providers: {
          anthropic: comprehensiveStats.apiUsage.anthropic ? {
            available: true,
            requests: comprehensiveStats.apiUsage.anthropic.dailyRequestCount,
            tokens: comprehensiveStats.apiUsage.anthropic.tokenConsumption.total,
            cost: comprehensiveStats.apiUsage.anthropic.costEstimate.daily,
            avgResponseTime: comprehensiveStats.apiUsage.anthropic.responseTimeStats.average,
            successRate: comprehensiveStats.apiUsage.anthropic.successRate.percentage
          } : { available: false },
          openrouter: comprehensiveStats.apiUsage.openrouter ? {
            available: true,
            requests: comprehensiveStats.apiUsage.openrouter.dailyRequestCount,
            tokens: comprehensiveStats.apiUsage.openrouter.tokenConsumption.total,
            cost: comprehensiveStats.apiUsage.openrouter.costEstimate.daily,
            avgResponseTime: comprehensiveStats.apiUsage.openrouter.responseTimeStats.average,
            successRate: comprehensiveStats.apiUsage.openrouter.successRate.percentage,
            providerBreakdown: comprehensiveStats.apiUsage.openrouter.providerStats
          } : { available: false }
        },
        combined: comprehensiveStats.apiUsage.combined,
        efficiency: comprehensiveStats.efficiency.providerComparison,
        recommendations: this.generateProviderRecommendations(comprehensiveStats)
      };

      res.json({
        success: true,
        data: comparison,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get multi-provider comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve multi-provider comparison',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/openrouter/reset-daily-metrics
   * Reset daily OpenRouter usage metrics (admin endpoint)
   */
  router.post('/reset-daily-metrics', requireAPIService, async (req, res) => {
    try {
      openrouterAPIService!.resetDailyMetrics();
      
      res.json({
        success: true,
        message: 'Daily OpenRouter metrics reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to reset OpenRouter daily metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset daily metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/openrouter/status
   * Get OpenRouter service availability status
   */
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        serviceAvailable: !!openrouterAPIService,
        features: {
          directPrompts: !!openrouterAPIService,
          multiModel: !!openrouterAPIService,
          providerStats: !!openrouterAPIService,
          creditTracking: !!openrouterAPIService,
          healthMonitoring: !!openrouterAPIService,
          modelComparison: true
        },
        message: openrouterAPIService ? 
          'OpenRouter API service is fully operational' : 
          'OpenRouter API service not available (requires OPENROUTER_API_KEY)'
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

// Helper function for generating provider recommendations
function generateProviderRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  const anthropic = stats.efficiency.providerComparison.anthropic;
  const openrouter = stats.efficiency.providerComparison.openrouter;
  
  if (anthropic.avgCostPerToken > 0 && openrouter.avgCostPerToken > 0) {
    if (anthropic.avgCostPerToken < openrouter.avgCostPerToken * 0.8) {
      recommendations.push('Anthropic offers better cost efficiency for your usage patterns');
    } else if (openrouter.avgCostPerToken < anthropic.avgCostPerToken * 0.8) {
      recommendations.push('OpenRouter provides better cost efficiency with multiple provider options');
    }
  }
  
  if (anthropic.avgResponseTime > 0 && openrouter.avgResponseTime > 0) {
    if (anthropic.avgResponseTime < openrouter.avgResponseTime * 0.8) {
      recommendations.push('Anthropic shows faster response times');
    } else if (openrouter.avgResponseTime < anthropic.avgResponseTime * 0.8) {
      recommendations.push('OpenRouter demonstrates better response performance');
    }
  }
  
  if (stats.apiUsage.openrouter?.providerStats) {
    const providers = Object.entries(stats.apiUsage.openrouter.providerStats);
    if (providers.length > 1) {
      const fastest = providers.reduce((min, [name, stats]: [string, any]) => 
        stats.avgResponseTime < min.time ? { name, time: stats.avgResponseTime } : min, 
        { name: '', time: Infinity }
      );
      
      if (fastest.name) {
        recommendations.push(`${fastest.name} provider shows best performance in OpenRouter`);
      }
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Both providers are performing well - consider load balancing for optimal results');
  }
  
  return recommendations;
}