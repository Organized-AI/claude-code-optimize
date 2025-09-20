import { TokenUsage, UsageProjection } from '../../shared/types/index.js';
import { JsonDatabaseManager as DatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { AnthropicAPIService, APIUsageMetrics } from './AnthropicAPIService.js';
import { OpenRouterAPIService, OpenRouterUsageMetrics } from './OpenRouterAPIService.js';
import { v4 as uuidv4 } from 'uuid';

interface TokenBuffer {
  sessionId: string;
  tokensUsed: number;
  operation: string;
  timestamp: number;
}

export interface ComprehensiveUsageStats {
  sessionUsage: {
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    averageTokensPerSession: number;
  };
  apiUsage: {
    anthropic: APIUsageMetrics | null;
    openrouter: OpenRouterUsageMetrics | null;
    combined: {
      totalRequests: number;
      totalTokens: number;
      totalCost: number;
      averageResponseTime: number;
      successRate: number;
    };
  };
  costProjections: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
    breakdown: {
      anthropic: { daily: number; weekly: number; monthly: number };
      openrouter: { daily: number; weekly: number; monthly: number };
    };
  };
  efficiency: {
    tokensPerMinute: number;
    costPerToken: number;
    utilizationRate: number;
    providerComparison: {
      anthropic: { avgCostPerToken: number; avgResponseTime: number };
      openrouter: { avgCostPerToken: number; avgResponseTime: number };
    };
  };
  alerts: Array<{
    type: 'budget' | 'rate' | 'quota' | 'efficiency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    provider?: 'anthropic' | 'openrouter' | 'combined';
  }>;
}

export interface APIIntegratedUsage extends TokenUsage {
  apiCost?: number;
  model?: string;
  apiResponseTime?: number;
}

export class TokenMonitor {
  private db: DatabaseManager;
  private wsManager: WebSocketManager;
  private anthropicAPIService?: AnthropicAPIService;
  private openrouterAPIService?: OpenRouterAPIService;
  private tokenBuffer: Map<string, TokenBuffer[]> = new Map(); // sessionId -> buffer
  private sessionTotals: Map<string, number> = new Map(); // sessionId -> total tokens
  private batchInterval: NodeJS.Timeout;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_INTERVAL = 100; // ms
  
  constructor(
    db: DatabaseManager, 
    wsManager: WebSocketManager, 
    anthropicAPIService?: AnthropicAPIService,
    openrouterAPIService?: OpenRouterAPIService
  ) {
    this.db = db;
    this.wsManager = wsManager;
    this.anthropicAPIService = anthropicAPIService;
    this.openrouterAPIService = openrouterAPIService;
    
    // Start batch processing
    this.batchInterval = setInterval(() => {
      this.processBatches();
    }, this.BATCH_INTERVAL);
  }
  
  async recordTokenUsage(sessionId: string, tokensUsed: number, operation: string): Promise<void> {
    const timestamp = Date.now();
    
    // Update session total
    const currentTotal = this.sessionTotals.get(sessionId) || 0;
    const newTotal = currentTotal + tokensUsed;
    this.sessionTotals.set(sessionId, newTotal);
    
    // Add to buffer for batch processing
    if (!this.tokenBuffer.has(sessionId)) {
      this.tokenBuffer.set(sessionId, []);
    }
    
    const buffer = this.tokenBuffer.get(sessionId)!;
    buffer.push({
      sessionId,
      tokensUsed,
      operation,
      timestamp,
    });
    
    // Send real-time update
    this.wsManager.sendToSession(sessionId, {
      type: 'token_update',
      sessionId,
      tokensUsed,
      totalUsed: newTotal,
      projectedTotal: await this.calculateProjection(sessionId),
    });
    
    // Process immediately if buffer is full
    if (buffer.length >= this.BATCH_SIZE) {
      await this.processBatch(sessionId);
    }
  }
  
  private async processBatches(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [sessionId, buffer] of this.tokenBuffer.entries()) {
      if (buffer.length > 0) {
        promises.push(this.processBatch(sessionId));
      }
    }
    
    await Promise.all(promises);
  }
  
  private async processBatch(sessionId: string): Promise<void> {
    const buffer = this.tokenBuffer.get(sessionId);
    if (!buffer || buffer.length === 0) return;
    
    const batch = buffer.splice(0);
    const currentTotal = this.sessionTotals.get(sessionId) || 0;
    
    try {
      // Save all token usage records in a transaction-like manner
      for (const item of batch) {
        const tokenUsage: TokenUsage = {
          id: uuidv4(),
          sessionId: item.sessionId,
          tokensUsed: item.tokensUsed,
          operation: item.operation,
          timestamp: item.timestamp,
          cumulativeTotal: currentTotal,
        };
        
        await this.db.recordTokenUsage(tokenUsage);
      }
    } catch (error) {
      console.error('Failed to process token usage batch:', error);
      // Re-add items to buffer for retry
      buffer.unshift(...batch);
    }
  }
  
  async getUsageHistory(sessionId: string): Promise<TokenUsage[]> {
    return await this.db.getTokenUsageHistory(sessionId);
  }
  
  async getCurrentUsage(sessionId: string): Promise<{
    totalUsed: number;
    averagePerMinute: number;
    projectedTotal: number;
  }> {
    const totalUsed = this.sessionTotals.get(sessionId) || 0;
    const history = await this.getUsageHistory(sessionId);
    
    if (history.length === 0) {
      return {
        totalUsed,
        averagePerMinute: 0,
        projectedTotal: totalUsed,
      };
    }
    
    const duration = Date.now() - history[0].timestamp;
    const averagePerMinute = duration > 0 ? (totalUsed / duration) * 60000 : 0;
    const projectedTotal = await this.calculateProjection(sessionId);
    
    return {
      totalUsed,
      averagePerMinute,
      projectedTotal,
    };
  }
  
  private async calculateProjection(sessionId: string): Promise<number> {
    const history = await this.getUsageHistory(sessionId);
    const currentTotal = this.sessionTotals.get(sessionId) || 0;
    
    if (history.length < 3) {
      return currentTotal; // Not enough data for projection
    }
    
    // Use exponential weighted moving average for trend analysis
    const recentHistory = history.slice(-10); // Last 10 data points
    const weights = recentHistory.map((_, i) => Math.pow(0.8, recentHistory.length - i - 1));
    
    let weightedSum = 0;
    let totalWeight = 0;
    let timeIntervals: number[] = [];
    
    for (let i = 1; i < recentHistory.length; i++) {
      const interval = recentHistory[i].timestamp - recentHistory[i - 1].timestamp;
      const tokensPerInterval = recentHistory[i].tokensUsed;
      const weight = weights[i];
      
      if (interval > 0) {
        const tokensPerMs = tokensPerInterval / interval;
        weightedSum += tokensPerMs * weight;
        totalWeight += weight;
        timeIntervals.push(interval);
      }
    }
    
    if (totalWeight === 0) return currentTotal;
    
    const averageTokensPerMs = weightedSum / totalWeight;
    const session = await this.db.getSession(sessionId);
    
    if (!session || session.status === 'completed') {
      return currentTotal;
    }
    
    const elapsed = Date.now() - session.startTime;
    const remaining = Math.max(0, session.duration - elapsed);
    
    const projectedAdditional = averageTokensPerMs * remaining;
    
    return Math.round(currentTotal + projectedAdditional);
  }
  
  async generateUsageProjection(sessionId: string): Promise<UsageProjection> {
    const history = await this.getUsageHistory(sessionId);
    const currentTotal = this.sessionTotals.get(sessionId) || 0;
    const session = await this.db.getSession(sessionId);
    
    if (!session || history.length < 2) {
      return {
        currentRate: 0,
        projectedTotal: currentTotal,
        timeToLimit: Infinity,
        confidence: 0,
      };
    }
    
    const recentHistory = history.slice(-5);
    const duration = Date.now() - session.startTime;
    const currentRate = duration > 0 ? (currentTotal / duration) * 60000 : 0; // tokens per minute
    
    const projectedTotal = await this.calculateProjection(sessionId);
    
    // Calculate confidence based on data consistency
    let confidence = 0;
    if (recentHistory.length >= 3) {
      const rates = [];
      for (let i = 1; i < recentHistory.length; i++) {
        const interval = recentHistory[i].timestamp - recentHistory[i - 1].timestamp;
        if (interval > 0) {
          rates.push((recentHistory[i].tokensUsed / interval) * 60000);
        }
      }
      
      if (rates.length > 0) {
        const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
        const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rates.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Higher consistency = higher confidence
        confidence = Math.max(0, Math.min(1, 1 - (standardDeviation / mean)));
      }
    }
    
    // Calculate time to token limit (if set)
    let timeToLimit = Infinity;
    if (session.tokenBudget && currentRate > 0) {
      const remainingTokens = session.tokenBudget - currentTotal;
      if (remainingTokens > 0) {
        timeToLimit = remainingTokens / currentRate; // minutes
      } else {
        timeToLimit = 0;
      }
    }
    
    return {
      currentRate,
      projectedTotal,
      timeToLimit,
      confidence,
    };
  }
  
  async checkAlerts(sessionId: string): Promise<{
    level: 'warning' | 'error';
    message: string;
  }[]> {
    const alerts: { level: 'warning' | 'error'; message: string }[] = [];
    const session = await this.db.getSession(sessionId);
    const currentUsage = await this.getCurrentUsage(sessionId);
    const projection = await this.generateUsageProjection(sessionId);
    
    if (!session) return alerts;
    
    // Token budget alerts
    if (session.tokenBudget) {
      const usagePercentage = (currentUsage.totalUsed / session.tokenBudget) * 100;
      const projectedPercentage = (projection.projectedTotal / session.tokenBudget) * 100;
      
      if (usagePercentage >= 95) {
        alerts.push({
          level: 'error',
          message: `Token usage at ${usagePercentage.toFixed(1)}% of budget (${currentUsage.totalUsed}/${session.tokenBudget})`,
        });
      } else if (usagePercentage >= 80) {
        alerts.push({
          level: 'warning',
          message: `Token usage at ${usagePercentage.toFixed(1)}% of budget (${currentUsage.totalUsed}/${session.tokenBudget})`,
        });
      } else if (projectedPercentage > 100 && projection.confidence > 0.5) {
        alerts.push({
          level: 'warning',
          message: `Projected to exceed token budget by ${(projectedPercentage - 100).toFixed(1)}%`,
        });
      }
      
      if (projection.timeToLimit < 60 && projection.timeToLimit > 0) {
        alerts.push({
          level: 'warning',
          message: `Estimated ${projection.timeToLimit.toFixed(0)} minutes until token limit`,
        });
      }
    }
    
    // Rate-based alerts
    const elapsed = Date.now() - session.startTime;
    const remaining = Math.max(0, session.duration - elapsed);
    
    if (remaining < 600000 && projection.currentRate > currentUsage.averagePerMinute * 2) {
      alerts.push({
        level: 'warning',
        message: 'Token usage rate has significantly increased in final minutes',
      });
    }
    
    return alerts;
  }
  
  getSessionTotal(sessionId: string): number {
    return this.sessionTotals.get(sessionId) || 0;
  }
  
  removeSession(sessionId: string): void {
    this.tokenBuffer.delete(sessionId);
    this.sessionTotals.delete(sessionId);
  }

  /**
   * Get comprehensive usage statistics combining session and API data from all providers
   */
  async getComprehensiveUsageStats(): Promise<ComprehensiveUsageStats> {
    const sessions = await this.db.getAllSessions();
    const activeSessions = sessions.filter(s => s.status === 'active');
    const totalTokens = Array.from(this.sessionTotals.values()).reduce((sum, tokens) => sum + tokens, 0);

    // Get API usage from both providers
    const anthropicUsage = this.anthropicAPIService ? 
      this.anthropicAPIService.getUsageMetrics() : null;
    
    const openrouterUsage = this.openrouterAPIService ?
      this.openrouterAPIService.getUsageMetrics() : null;

    // Calculate combined API metrics
    const combinedApiMetrics = this.calculateCombinedApiMetrics(anthropicUsage, openrouterUsage);

    // Calculate cost projections with provider breakdown
    const costProjections = this.calculateCostProjections(anthropicUsage, openrouterUsage);

    // Calculate efficiency metrics
    const totalTimeHours = sessions.reduce((sum, s) => {
      const duration = s.status === 'active' ? 
        Date.now() - s.startTime : 
        s.endTime ? s.endTime - s.startTime : 0;
      return sum + (duration / (1000 * 60 * 60));
    }, 0);

    const efficiency = this.calculateEfficiencyMetrics(
      totalTokens, 
      totalTimeHours, 
      sessions, 
      anthropicUsage, 
      openrouterUsage,
      combinedApiMetrics
    );

    // Generate alerts from all providers
    const alerts = await this.generateMultiProviderAlerts(anthropicUsage, openrouterUsage, efficiency);

    return {
      sessionUsage: {
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        totalTokens,
        averageTokensPerSession: sessions.length > 0 ? totalTokens / sessions.length : 0
      },
      apiUsage: {
        anthropic: anthropicUsage,
        openrouter: openrouterUsage,
        combined: combinedApiMetrics
      },
      costProjections,
      efficiency,
      alerts
    };
  }

  /**
   * Record API-integrated token usage with cost and model information
   */
  async recordAPIIntegratedUsage(
    sessionId: string, 
    tokensUsed: number, 
    operation: string,
    apiCost?: number,
    model?: string,
    apiResponseTime?: number
  ): Promise<void> {
    const timestamp = Date.now();
    
    // Update session total
    const currentTotal = this.sessionTotals.get(sessionId) || 0;
    const newTotal = currentTotal + tokensUsed;
    this.sessionTotals.set(sessionId, newTotal);
    
    // Add to buffer for batch processing
    if (!this.tokenBuffer.has(sessionId)) {
      this.tokenBuffer.set(sessionId, []);
    }
    
    const buffer = this.tokenBuffer.get(sessionId)!;
    buffer.push({
      sessionId,
      tokensUsed,
      operation: `${operation}${model ? ` (${model})` : ''}${apiCost ? ` - $${apiCost.toFixed(4)}` : ''}`,
      timestamp,
    });
    
    // Send enhanced real-time update
    this.wsManager.sendToSession(sessionId, {
      type: 'token_update_enhanced',
      sessionId,
      tokensUsed,
      totalUsed: newTotal,
      projectedTotal: await this.calculateProjection(sessionId),
      apiCost: apiCost || 0,
      model: model || 'unknown',
      responseTime: apiResponseTime || 0,
      efficiency: tokensUsed > 0 && apiResponseTime ? tokensUsed / (apiResponseTime / 1000) : 0
    });
    
    // Process immediately if buffer is full
    if (buffer.length >= this.BATCH_SIZE) {
      await this.processBatch(sessionId);
    }
  }

  /**
   * Get real-time API health and usage status
   */
  async getAPIHealthStatus(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    dailyUsage: number;
    rateLimit: number;
    issues: string[];
  }> {
    if (!this.anthropicAPIService) {
      return {
        isHealthy: false,
        responseTime: 0,
        dailyUsage: 0,
        rateLimit: 0,
        issues: ['Anthropic API service not initialized']
      };
    }

    const healthStatus = this.anthropicAPIService.getHealthStatus();
    const usageMetrics = this.anthropicAPIService.getUsageMetrics();

    return {
      isHealthy: healthStatus.status === 'healthy',
      responseTime: healthStatus.responseTime,
      dailyUsage: usageMetrics.dailyRequestCount,
      rateLimit: usageMetrics.rateLimitStatus.percentUsed,
      issues: healthStatus.issues
    };
  }

  /**
   * Calculate cost-aware projections
   */
  async getCostAwareProjection(sessionId: string): Promise<{
    tokenProjection: number;
    costProjection: number;
    budgetAlert?: string;
  }> {
    const tokenProjection = await this.calculateProjection(sessionId);
    const currentUsage = await this.getCurrentUsage(sessionId);
    
    let costProjection = 0;
    let budgetAlert: string | undefined;

    if (this.anthropicAPIService) {
      const apiMetrics = this.anthropicAPIService.getUsageMetrics();
      const avgCostPerToken = apiMetrics.tokenConsumption.total > 0 ? 
        apiMetrics.costEstimate.daily / apiMetrics.tokenConsumption.total : 
        0.00001; // Fallback rate

      costProjection = tokenProjection * avgCostPerToken;

      // Check budget alerts
      const session = await this.db.getSession(sessionId);
      if (session?.tokenBudget) {
        const projectedBudgetUsage = (tokenProjection / session.tokenBudget) * 100;
        if (projectedBudgetUsage > 100) {
          budgetAlert = `Projected to exceed token budget by ${(projectedBudgetUsage - 100).toFixed(1)}%`;
        }
      }
    }

    return {
      tokenProjection,
      costProjection,
      budgetAlert
    };
  }

  /**
   * Generate quota and efficiency alerts
   */
  async generateQuotaAlerts(): Promise<Array<{
    type: 'quota' | 'efficiency' | 'cost';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    value: number;
    threshold: number;
  }>> {
    const alerts: Array<{
      type: 'quota' | 'efficiency' | 'cost';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      value: number;
      threshold: number;
    }> = [];

    if (!this.anthropicAPIService) {
      return alerts;
    }

    const apiMetrics = this.anthropicAPIService.getUsageMetrics();
    const healthStatus = this.anthropicAPIService.getHealthStatus();

    // Quota alerts
    if (apiMetrics.rateLimitStatus.percentUsed > 90) {
      alerts.push({
        type: 'quota',
        severity: 'critical',
        message: `API quota usage at ${apiMetrics.rateLimitStatus.percentUsed.toFixed(1)}%`,
        value: apiMetrics.rateLimitStatus.percentUsed,
        threshold: 90
      });
    } else if (apiMetrics.rateLimitStatus.percentUsed > 75) {
      alerts.push({
        type: 'quota',
        severity: 'high',
        message: `API quota usage at ${apiMetrics.rateLimitStatus.percentUsed.toFixed(1)}%`,
        value: apiMetrics.rateLimitStatus.percentUsed,
        threshold: 75
      });
    }

    // Efficiency alerts
    if (healthStatus.responseTime > 5000) {
      alerts.push({
        type: 'efficiency',
        severity: 'high',
        message: `API response time degraded: ${healthStatus.responseTime}ms`,
        value: healthStatus.responseTime,
        threshold: 5000
      });
    }

    // Cost alerts
    const dailyCost = apiMetrics.costEstimate.daily;
    if (dailyCost > 50) {
      alerts.push({
        type: 'cost',
        severity: 'high',
        message: `Daily cost estimate high: $${dailyCost.toFixed(2)}`,
        value: dailyCost,
        threshold: 50
      });
    } else if (dailyCost > 20) {
      alerts.push({
        type: 'cost',
        severity: 'medium',
        message: `Daily cost estimate: $${dailyCost.toFixed(2)}`,
        value: dailyCost,
        threshold: 20
      });
    }

    return alerts;
  }

  // Helper methods for multi-provider support

  private calculateCombinedApiMetrics(
    anthropicUsage: APIUsageMetrics | null,
    openrouterUsage: OpenRouterUsageMetrics | null
  ): {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    successRate: number;
  } {
    const anthropicRequests = anthropicUsage?.dailyRequestCount || 0;
    const openrouterRequests = openrouterUsage?.dailyRequestCount || 0;
    const totalRequests = anthropicRequests + openrouterRequests;

    const anthropicTokens = anthropicUsage?.tokenConsumption.total || 0;
    const openrouterTokens = openrouterUsage?.tokenConsumption.total || 0;
    const totalTokens = anthropicTokens + openrouterTokens;

    const anthropicCost = anthropicUsage?.costEstimate.daily || 0;
    const openrouterCost = openrouterUsage?.costEstimate.daily || 0;
    const totalCost = anthropicCost + openrouterCost;

    const anthropicResponseTime = anthropicUsage?.responseTimeStats.average || 0;
    const openrouterResponseTime = openrouterUsage?.responseTimeStats.average || 0;
    const avgResponseTime = totalRequests > 0 ? 
      ((anthropicResponseTime * anthropicRequests) + (openrouterResponseTime * openrouterRequests)) / totalRequests : 0;

    const anthropicSuccessful = anthropicUsage?.successRate.successful || 0;
    const anthropicFailed = anthropicUsage?.successRate.failed || 0;
    const openrouterSuccessful = openrouterUsage?.successRate.successful || 0;
    const openrouterFailed = openrouterUsage?.successRate.failed || 0;
    
    const totalSuccessful = anthropicSuccessful + openrouterSuccessful;
    const totalFailed = anthropicFailed + openrouterFailed;
    const successRate = (totalSuccessful + totalFailed) > 0 ? 
      (totalSuccessful / (totalSuccessful + totalFailed)) * 100 : 100;

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageResponseTime: avgResponseTime,
      successRate
    };
  }

  private calculateCostProjections(
    anthropicUsage: APIUsageMetrics | null,
    openrouterUsage: OpenRouterUsageMetrics | null
  ): {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
    breakdown: {
      anthropic: { daily: number; weekly: number; monthly: number };
      openrouter: { daily: number; weekly: number; monthly: number };
    };
  } {
    const anthropicDaily = anthropicUsage?.costEstimate.daily || 0;
    const openrouterDaily = openrouterUsage?.costEstimate.daily || 0;
    const totalDaily = anthropicDaily + openrouterDaily;

    return {
      hourly: totalDaily / 24,
      daily: totalDaily,
      weekly: totalDaily * 7,
      monthly: totalDaily * 30,
      breakdown: {
        anthropic: {
          daily: anthropicDaily,
          weekly: anthropicDaily * 7,
          monthly: anthropicDaily * 30
        },
        openrouter: {
          daily: openrouterDaily,
          weekly: openrouterDaily * 7,
          monthly: openrouterDaily * 30
        }
      }
    };
  }

  private calculateEfficiencyMetrics(
    totalTokens: number,
    totalTimeHours: number,
    sessions: any[],
    anthropicUsage: APIUsageMetrics | null,
    openrouterUsage: OpenRouterUsageMetrics | null,
    combinedMetrics: any
  ): {
    tokensPerMinute: number;
    costPerToken: number;
    utilizationRate: number;
    providerComparison: {
      anthropic: { avgCostPerToken: number; avgResponseTime: number };
      openrouter: { avgCostPerToken: number; avgResponseTime: number };
    };
  } {
    const tokensPerMinute = totalTimeHours > 0 ? (totalTokens / (totalTimeHours * 60)) : 0;
    const costPerToken = combinedMetrics.totalTokens > 0 ? 
      (combinedMetrics.totalCost / combinedMetrics.totalTokens) : 0;
    const utilizationRate = this.calculateUtilizationRate(sessions);

    // Provider comparison
    const anthropicCostPerToken = anthropicUsage && anthropicUsage.tokenConsumption.total > 0 ?
      anthropicUsage.costEstimate.daily / anthropicUsage.tokenConsumption.total : 0;
    const openrouterCostPerToken = openrouterUsage && openrouterUsage.tokenConsumption.total > 0 ?
      openrouterUsage.costEstimate.daily / openrouterUsage.tokenConsumption.total : 0;

    return {
      tokensPerMinute,
      costPerToken,
      utilizationRate,
      providerComparison: {
        anthropic: {
          avgCostPerToken: anthropicCostPerToken,
          avgResponseTime: anthropicUsage?.responseTimeStats.average || 0
        },
        openrouter: {
          avgCostPerToken: openrouterCostPerToken,
          avgResponseTime: openrouterUsage?.responseTimeStats.average || 0
        }
      }
    };
  }

  private async generateMultiProviderAlerts(
    anthropicUsage: APIUsageMetrics | null,
    openrouterUsage: OpenRouterUsageMetrics | null,
    efficiency: any
  ): Promise<Array<{
    type: 'budget' | 'rate' | 'quota' | 'efficiency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    provider?: 'anthropic' | 'openrouter' | 'combined';
  }>> {
    const alerts: Array<{
      type: 'budget' | 'rate' | 'quota' | 'efficiency';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: number;
      provider?: 'anthropic' | 'openrouter' | 'combined';
    }> = [];

    const timestamp = Date.now();

    // Anthropic alerts
    if (anthropicUsage) {
      if (anthropicUsage.rateLimitStatus.percentUsed > 90) {
        alerts.push({
          type: 'quota',
          severity: 'critical',
          message: `Anthropic API quota critically high: ${anthropicUsage.rateLimitStatus.percentUsed.toFixed(1)}%`,
          timestamp,
          provider: 'anthropic'
        });
      }

      if (anthropicUsage.responseTimeStats.average > 3000) {
        alerts.push({
          type: 'rate',
          severity: 'high',
          message: `Anthropic API response time degraded: ${anthropicUsage.responseTimeStats.average.toFixed(0)}ms`,
          timestamp,
          provider: 'anthropic'
        });
      }

      if (anthropicUsage.costEstimate.daily > 50) {
        alerts.push({
          type: 'budget',
          severity: 'critical',
          message: `Anthropic daily cost critical: $${anthropicUsage.costEstimate.daily.toFixed(2)}`,
          timestamp,
          provider: 'anthropic'
        });
      }
    }

    // OpenRouter alerts
    if (openrouterUsage) {
      if (openrouterUsage.rateLimitStatus.percentUsed > 90) {
        alerts.push({
          type: 'quota',
          severity: 'critical',
          message: `OpenRouter API quota critically high: ${openrouterUsage.rateLimitStatus.percentUsed.toFixed(1)}%`,
          timestamp,
          provider: 'openrouter'
        });
      }

      if (openrouterUsage.responseTimeStats.average > 3000) {
        alerts.push({
          type: 'rate',
          severity: 'high',
          message: `OpenRouter API response time degraded: ${openrouterUsage.responseTimeStats.average.toFixed(0)}ms`,
          timestamp,
          provider: 'openrouter'
        });
      }

      if (openrouterUsage.costEstimate.daily > 50) {
        alerts.push({
          type: 'budget',
          severity: 'critical',
          message: `OpenRouter daily cost critical: ${openrouterUsage.costEstimate.daily.toFixed(2)} credits`,
          timestamp,
          provider: 'openrouter'
        });
      }
    }

    // Combined efficiency alerts
    if (efficiency.utilizationRate < 30) {
      alerts.push({
        type: 'efficiency',
        severity: 'medium',
        message: `Low utilization rate across providers: ${efficiency.utilizationRate.toFixed(1)}%`,
        timestamp,
        provider: 'combined'
      });
    }

    // Provider comparison alerts
    if (anthropicUsage && openrouterUsage) {
      const anthropicCost = efficiency.providerComparison.anthropic.avgCostPerToken;
      const openrouterCost = efficiency.providerComparison.openrouter.avgCostPerToken;
      
      if (anthropicCost > 0 && openrouterCost > 0) {
        const costDifference = Math.abs(anthropicCost - openrouterCost) / Math.min(anthropicCost, openrouterCost);
        
        if (costDifference > 0.5) { // More than 50% difference
          const cheaperProvider = anthropicCost < openrouterCost ? 'Anthropic' : 'OpenRouter';
          alerts.push({
            type: 'efficiency',
            severity: 'medium',
            message: `Significant cost difference detected: ${cheaperProvider} is more cost-effective`,
            timestamp,
            provider: 'combined'
          });
        }
      }
    }

    return alerts;
  }

  private getDefaultAPIUsageMetrics(): APIUsageMetrics {
    return {
      dailyRequestCount: 0,
      dailyRequestLimit: 1000,
      tokenConsumption: { input: 0, output: 0, cache: 0, total: 0 },
      costEstimate: { daily: 0, weekly: 0, monthly: 0 },
      responseTimeStats: { average: 0, peak: 0, current: 0 },
      rateLimitStatus: { requestsRemaining: 1000, resetTime: '', percentUsed: 0 },
      modelUsageDistribution: {
        sonnet: { requests: 0, tokens: 0, cost: 0 },
        opus: { requests: 0, tokens: 0, cost: 0 }
      },
      successRate: { successful: 0, failed: 0, percentage: 100 }
    };
  }

  private calculateUtilizationRate(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const activeTime = sessions.reduce((sum, session) => {
      if (session.status === 'active') {
        return sum + (Date.now() - session.startTime);
      } else if (session.endTime) {
        return sum + (session.endTime - session.startTime);
      }
      return sum;
    }, 0);

    const totalPossibleTime = sessions.length * 4 * 60 * 60 * 1000; // 4 hours per session
    return totalPossibleTime > 0 ? (activeTime / totalPossibleTime) * 100 : 0;
  }

  private async generateComprehensiveAlerts(
    apiUsage: APIUsageMetrics, 
    efficiency: any
  ): Promise<Array<{
    type: 'budget' | 'rate' | 'quota' | 'efficiency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
  }>> {
    const alerts: Array<{
      type: 'budget' | 'rate' | 'quota' | 'efficiency';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: number;
    }> = [];

    const timestamp = Date.now();

    // Quota alerts
    if (apiUsage.rateLimitStatus.percentUsed > 90) {
      alerts.push({
        type: 'quota',
        severity: 'critical',
        message: `API quota critically high: ${apiUsage.rateLimitStatus.percentUsed.toFixed(1)}%`,
        timestamp
      });
    }

    // Rate alerts  
    if (apiUsage.responseTimeStats.average > 3000) {
      alerts.push({
        type: 'rate',
        severity: 'high',
        message: `API response time degraded: ${apiUsage.responseTimeStats.average.toFixed(0)}ms`,
        timestamp
      });
    }

    // Budget alerts
    if (apiUsage.costEstimate.daily > 100) {
      alerts.push({
        type: 'budget',
        severity: 'critical',
        message: `Daily cost estimate critical: $${apiUsage.costEstimate.daily.toFixed(2)}`,
        timestamp
      });
    }

    // Efficiency alerts
    if (efficiency.utilizationRate < 30) {
      alerts.push({
        type: 'efficiency',
        severity: 'medium',
        message: `Low utilization rate: ${efficiency.utilizationRate.toFixed(1)}%`,
        timestamp
      });
    }

    return alerts;
  }
  
  shutdown(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    
    // Process all remaining batches
    this.processBatches().catch(console.error);
  }
}