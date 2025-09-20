/**
 * OpenRouterAPIService
 * 
 * Direct integration with OpenRouter API for:
 * - Real-time API usage tracking and cost monitoring
 * - Direct prompt sending and response handling
 * - Multi-model usage distribution analysis
 * - Rate limit monitoring and performance tracking
 * - Token usage accounting (prompt, completion, reasoning, cached)
 */

import { TokenMonitor } from './TokenMonitor.js';
import { JsonDatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';

export interface OpenRouterUsageMetrics {
  dailyRequestCount: number;
  dailyRequestLimit: number;
  tokenConsumption: {
    prompt: number;
    completion: number;
    reasoning: number;
    cached: number;
    total: number;
  };
  costEstimate: {
    daily: number;
    weekly: number;
    monthly: number;
    credits: number;
  };
  responseTimeStats: {
    average: number;
    peak: number;
    current: number;
  };
  rateLimitStatus: {
    requestsRemaining: number;
    resetTime: string;
    percentUsed: number;
  };
  modelUsageDistribution: {
    [modelName: string]: { 
      requests: number; 
      tokens: number; 
      cost: number;
      credits: number;
    };
  };
  successRate: {
    successful: number;
    failed: number;
    percentage: number;
  };
  providerStats: {
    [providerName: string]: {
      requests: number;
      tokens: number;
      cost: number;
      avgResponseTime: number;
    };
  };
}

export interface OpenRouterDirectPromptRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface OpenRouterDirectPromptResponse {
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    reasoningTokens?: number;
    cachedTokens?: number;
    totalTokens: number;
  };
  responseTime: number;
  cost: number;
  credits: number;
  model: string;
  provider: string;
  generationId?: string;
}

export interface OpenRouterHealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  issues: string[];
  modelsAvailable: number;
  activeProviders: string[];
}

export class OpenRouterAPIService {
  private tokenMonitor: TokenMonitor;
  private database: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private usageMetrics: OpenRouterUsageMetrics;
  private healthStatus: OpenRouterHealthCheck;
  private requestHistory: Array<{ timestamp: number; responseTime: number; success: boolean; model: string; provider: string }> = [];
  private apiKey: string;
  
  // OpenRouter API configuration
  private readonly API_BASE = 'https://openrouter.ai/api/v1';
  private readonly SITE_URL = 'https://dashboard.organizedai.vip';
  private readonly APP_NAME = 'Claude Code Optimizer Dashboard';

  constructor(
    tokenMonitor: TokenMonitor,
    database: JsonDatabaseManager,
    wsManager: WebSocketManager
  ) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    this.apiKey = apiKey;
    this.tokenMonitor = tokenMonitor;
    this.database = database;
    this.wsManager = wsManager;

    this.initializeMetrics();
    this.startHealthMonitoring();
  }

  private initializeMetrics(): void {
    this.usageMetrics = {
      dailyRequestCount: 0,
      dailyRequestLimit: 1000, // Default limit
      tokenConsumption: { prompt: 0, completion: 0, reasoning: 0, cached: 0, total: 0 },
      costEstimate: { daily: 0, weekly: 0, monthly: 0, credits: 0 },
      responseTimeStats: { average: 0, peak: 0, current: 0 },
      rateLimitStatus: { requestsRemaining: 1000, resetTime: '', percentUsed: 0 },
      modelUsageDistribution: {},
      successRate: { successful: 0, failed: 0, percentage: 100 },
      providerStats: {}
    };

    this.healthStatus = {
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      issues: [],
      modelsAvailable: 0,
      activeProviders: []
    };
  }

  async sendDirectPrompt(request: OpenRouterDirectPromptRequest): Promise<OpenRouterDirectPromptResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🌐 Sending OpenRouter prompt to ${request.model}...`);
      
      const response = await fetch(`${this.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.SITE_URL,
          'X-Title': this.APP_NAME,
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ],
          max_tokens: request.maxTokens || 4000,
          temperature: request.temperature || 0.7,
          top_p: request.topP || 1,
          frequency_penalty: request.frequencyPenalty || 0,
          presence_penalty: request.presencePenalty || 0,
          stop: request.stop || null,
          stream: request.stream || false,
          // Enable usage tracking
          usage: { include: true }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      // Extract usage information
      const usage = data.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const reasoningTokens = usage.reasoning_tokens || 0;
      const cachedTokens = usage.cached_tokens || 0;
      const totalTokens = usage.total_tokens || (promptTokens + completionTokens + reasoningTokens);
      const cost = usage.cost || 0;

      // Extract model and provider info
      const modelName = data.model || request.model;
      const provider = this.extractProviderFromModel(modelName);

      // Update metrics
      this.updateUsageMetrics(modelName, provider, promptTokens, completionTokens, reasoningTokens, cachedTokens, cost, responseTime, true);

      // Record token usage
      await this.tokenMonitor.recordTokenUsage(
        'openrouter-direct-prompt',
        totalTokens,
        `OpenRouter API call: ${modelName} via ${provider}`
      );

      const result: OpenRouterDirectPromptResponse = {
        response: data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens,
          completionTokens,
          reasoningTokens,
          cachedTokens,
          totalTokens
        },
        responseTime,
        cost,
        credits: cost, // OpenRouter uses credits
        model: modelName,
        provider,
        generationId: data.id
      };

      // Broadcast update via WebSocket
      this.wsManager.broadcast('openrouter-api-update', {
        type: 'prompt-response',
        data: result,
        metrics: this.usageMetrics
      });

      console.log(`✅ OpenRouter prompt completed: ${responseTime}ms, ${totalTokens} tokens, ${cost} credits`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ OpenRouter direct prompt failed:', error);

      // Update failure metrics
      const modelName = request.model;
      const provider = this.extractProviderFromModel(modelName);
      this.updateUsageMetrics(modelName, provider, 0, 0, 0, 0, 0, responseTime, false);

      throw new Error(`OpenRouter API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async performHealthCheck(): Promise<OpenRouterHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Get available models
      const modelsResponse = await fetch(`${this.API_BASE}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!modelsResponse.ok) {
        throw new Error(`Models API error: ${modelsResponse.status}`);
      }

      const modelsData = await modelsResponse.json();
      const models = modelsData.data || [];
      const providers = [...new Set(models.map((model: any) => this.extractProviderFromModel(model.id)))];

      // Test with a simple prompt
      const testResponse = await fetch(`${this.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.SITE_URL,
          'X-Title': this.APP_NAME,
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
          usage: { include: true }
        })
      });

      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: responseTime < 3000 && testResponse.ok ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        uptime: this.calculateUptime(),
        issues: responseTime > 3000 ? ['High response time detected'] : 
                !testResponse.ok ? [`API test failed: ${testResponse.status}`] : [],
        modelsAvailable: models.length,
        activeProviders: providers
      };

      console.log(`🏥 OpenRouter health check: ${this.healthStatus.status} (${responseTime}ms, ${models.length} models)`);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: 'down',
        responseTime,
        lastCheck: new Date().toISOString(),
        uptime: this.calculateUptime(),
        issues: [`API unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`],
        modelsAvailable: 0,
        activeProviders: []
      };

      console.error('❌ OpenRouter health check failed:', error);
    }

    // Broadcast health update
    this.wsManager.broadcast('openrouter-health-update', this.healthStatus);
    
    return this.healthStatus;
  }

  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.API_BASE}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Models API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch OpenRouter models:', error);
      return [];
    }
  }

  async getCreditBalance(): Promise<{ balance: number; usage: any }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/key`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Auth API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        balance: data.data?.credit_balance || 0,
        usage: data.data?.usage || {}
      };
    } catch (error) {
      console.error('❌ Failed to fetch OpenRouter credit balance:', error);
      return { balance: 0, usage: {} };
    }
  }

  getUsageMetrics(): OpenRouterUsageMetrics {
    return { ...this.usageMetrics };
  }

  getHealthStatus(): OpenRouterHealthCheck {
    return { ...this.healthStatus };
  }

  private updateUsageMetrics(
    model: string,
    provider: string,
    promptTokens: number,
    completionTokens: number,
    reasoningTokens: number,
    cachedTokens: number,
    cost: number,
    responseTime: number,
    success: boolean
  ): void {
    // Update request counts
    this.usageMetrics.dailyRequestCount++;
    
    // Update token consumption
    this.usageMetrics.tokenConsumption.prompt += promptTokens;
    this.usageMetrics.tokenConsumption.completion += completionTokens;
    this.usageMetrics.tokenConsumption.reasoning += reasoningTokens;
    this.usageMetrics.tokenConsumption.cached += cachedTokens;
    this.usageMetrics.tokenConsumption.total += promptTokens + completionTokens + reasoningTokens;

    // Update cost estimates
    this.usageMetrics.costEstimate.daily += cost;
    this.usageMetrics.costEstimate.credits += cost;
    this.usageMetrics.costEstimate.weekly = this.usageMetrics.costEstimate.daily * 7;
    this.usageMetrics.costEstimate.monthly = this.usageMetrics.costEstimate.daily * 30;

    // Update response time stats
    this.requestHistory.push({ timestamp: Date.now(), responseTime, success, model, provider });
    this.requestHistory = this.requestHistory.slice(-100); // Keep last 100 requests
    
    const recentTimes = this.requestHistory.map(r => r.responseTime);
    this.usageMetrics.responseTimeStats.average = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
    this.usageMetrics.responseTimeStats.peak = Math.max(...recentTimes);
    this.usageMetrics.responseTimeStats.current = responseTime;

    // Update model distribution
    if (!this.usageMetrics.modelUsageDistribution[model]) {
      this.usageMetrics.modelUsageDistribution[model] = { requests: 0, tokens: 0, cost: 0, credits: 0 };
    }
    this.usageMetrics.modelUsageDistribution[model].requests++;
    this.usageMetrics.modelUsageDistribution[model].tokens += promptTokens + completionTokens + reasoningTokens;
    this.usageMetrics.modelUsageDistribution[model].cost += cost;
    this.usageMetrics.modelUsageDistribution[model].credits += cost;

    // Update provider stats
    if (!this.usageMetrics.providerStats[provider]) {
      this.usageMetrics.providerStats[provider] = { requests: 0, tokens: 0, cost: 0, avgResponseTime: 0 };
    }
    const providerStat = this.usageMetrics.providerStats[provider];
    providerStat.requests++;
    providerStat.tokens += promptTokens + completionTokens + reasoningTokens;
    providerStat.cost += cost;
    providerStat.avgResponseTime = (providerStat.avgResponseTime * (providerStat.requests - 1) + responseTime) / providerStat.requests;

    // Update success rate
    const recentRequests = this.requestHistory.slice(-50); // Last 50 requests
    const successful = recentRequests.filter(r => r.success).length;
    const failed = recentRequests.length - successful;
    
    this.usageMetrics.successRate.successful = successful;
    this.usageMetrics.successRate.failed = failed;
    this.usageMetrics.successRate.percentage = recentRequests.length > 0 ? (successful / recentRequests.length) * 100 : 100;

    // Update rate limit status (estimated - OpenRouter doesn't provide exact limits)
    this.usageMetrics.rateLimitStatus.requestsRemaining = Math.max(0, this.usageMetrics.dailyRequestLimit - this.usageMetrics.dailyRequestCount);
    this.usageMetrics.rateLimitStatus.percentUsed = (this.usageMetrics.dailyRequestCount / this.usageMetrics.dailyRequestLimit) * 100;
  }

  private extractProviderFromModel(modelId: string): string {
    if (modelId.includes('/')) {
      return modelId.split('/')[0];
    }
    // Fallback mapping for common models
    if (modelId.includes('gpt')) return 'openai';
    if (modelId.includes('claude')) return 'anthropic';
    if (modelId.includes('gemini')) return 'google';
    if (modelId.includes('llama')) return 'meta';
    return 'unknown';
  }

  private calculateUptime(): number {
    // Simple uptime calculation - in production would track actual service start time
    return Date.now() - (Date.now() - 24 * 60 * 60 * 1000); // Mock 24h uptime
  }

  private startHealthMonitoring(): void {
    // Perform health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    // Initial health check
    setTimeout(() => {
      this.performHealthCheck();
    }, 1000);
  }

  // Reset daily metrics (should be called by a cron job)
  resetDailyMetrics(): void {
    this.usageMetrics.dailyRequestCount = 0;
    this.usageMetrics.tokenConsumption = { prompt: 0, completion: 0, reasoning: 0, cached: 0, total: 0 };
    this.usageMetrics.costEstimate.daily = 0;
    this.usageMetrics.costEstimate.credits = 0;
    this.usageMetrics.modelUsageDistribution = {};
    this.usageMetrics.providerStats = {};
    
    console.log('📊 Daily OpenRouter metrics reset');
  }
}