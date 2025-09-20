# Claude SDK Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the Anthropic Claude SDK into your moonlock-dashboard. The Claude SDK offers direct access to Claude models with advanced usage tracking, real-time monitoring, and cost optimization features.

## Table of Contents

1. [Quick Start](#quick-start)
2. [SDK Configuration](#sdk-configuration)
3. [Usage Monitoring System](#usage-monitoring-system)
4. [Model Selection & Optimization](#model-selection--optimization)
5. [Implementation Examples](#implementation-examples)
6. [Security Considerations](#security-considerations)  
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### 1. Obtain Anthropic API Key

```bash
# Visit https://console.anthropic.com/ to get your API key
# Example key format: sk-ant-api03-...
```

### 2. Environment Setup

```bash
# Add to your .env file
CLAUDE_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_API_BASE_URL=https://api.anthropic.com
CLAUDE_DEFAULT_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7
```

### 3. Basic Configuration

```typescript
// src/server/services/AnthropicAPIService.ts
import { AnthropicAPIService } from './AnthropicAPIService.js';

const anthropicService = new AnthropicAPIService(
  tokenMonitor,
  database,
  wsManager
);

await anthropicService.performHealthCheck();
```

---

## SDK Configuration

### Configuration File Structure

The Claude SDK follows a structured configuration pattern that integrates with the multi-provider system:

```json
// ~/.claude-code-router/config.json
{
  "Providers": [
    {
      "name": "anthropic",
      "api_base_url": "https://api.anthropic.com/v1/messages",
      "api_key": "sk-ant-api03-your-key-here",
      "models": [
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-5-haiku-20241022"
      ],
      "default_model": "claude-3-5-sonnet-20241022",
      "rate_limits": {
        "requests_per_minute": 60,
        "tokens_per_minute": 40000,
        "requests_per_day": 1000
      },
      "transformer": { "use": ["anthropic"] }
    }
  ],
  "Router": {
    "premium": "anthropic,claude-3-opus-20240229",
    "coding": "anthropic,claude-3-5-sonnet-20241022", 
    "reasoning": "anthropic,claude-3-5-sonnet-20241022",
    "fast": "anthropic,claude-3-5-haiku-20241022",
    "balanced": "anthropic,claude-3-5-sonnet-20241022"
  }
}
```

### Service Initialization

```typescript
// src/server/services/AnthropicAPIService.ts
export class AnthropicAPIService {
  private client: Anthropic;
  private tokenMonitor: TokenMonitor;
  private database: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private usageMetrics: APIUsageMetrics;
  private healthStatus: APIHealthCheck;

  // Current pricing per million tokens (as of 2024)
  private readonly PRICING = {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 }
  };

  constructor(
    tokenMonitor: TokenMonitor,
    database: JsonDatabaseManager,
    wsManager: WebSocketManager
  ) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }

    this.client = new Anthropic({ 
      apiKey,
      baseURL: process.env.ANTHROPIC_API_BASE_URL
    });
    
    this.tokenMonitor = tokenMonitor;
    this.database = database;
    this.wsManager = wsManager;

    this.initializeMetrics();
    this.startHealthMonitoring();
    this.setupRateLimitHandling();
  }

  async initialize(): Promise<void> {
    console.log('🤖 Initializing Claude SDK service...');
    
    // Validate API key and connectivity
    const healthCheck = await this.performHealthCheck();
    if (healthCheck.status === 'down') {
      throw new Error(`Claude API unhealthy: ${healthCheck.issues.join(', ')}`);
    }
    
    // Load historical usage data
    await this.loadHistoricalMetrics();
    
    console.log('✅ Claude SDK service initialized successfully');
  }
}
```

---

## Usage Monitoring System

### Comprehensive Usage Metrics Interface

```typescript
export interface APIUsageMetrics {
  // Request tracking
  dailyRequestCount: number;
  dailyRequestLimit: number;
  
  // Token consumption breakdown
  tokenConsumption: {
    input: number;
    output: number;
    cache: number;
    total: number;
  };
  
  // Cost analysis
  costEstimate: {
    daily: number;
    weekly: number;
    monthly: number;
    projected: number;
  };
  
  // Performance metrics
  responseTimeStats: {
    average: number;
    peak: number;
    current: number;
    p95: number;
    p99: number;
  };
  
  // Rate limiting status
  rateLimitStatus: {
    requestsRemaining: number;
    tokensRemaining: number;
    resetTime: string;
    percentUsed: number;
    warningThreshold: boolean;
  };
  
  // Model usage distribution
  modelUsageDistribution: {
    sonnet: { requests: number; tokens: number; cost: number; avgLatency: number };
    opus: { requests: number; tokens: number; cost: number; avgLatency: number };
    haiku: { requests: number; tokens: number; cost: number; avgLatency: number };
  };
  
  // Reliability metrics
  successRate: {
    successful: number;
    failed: number;
    percentage: number;
    errorTypes: Record<string, number>;
  };
  
  // Usage patterns
  usagePatterns: {
    peakHours: number[];
    averageSessionDuration: number;
    mostUsedFeatures: string[];
    costPerSession: number;
  };
}
```

### Real-time Usage Tracking Implementation

```typescript
async sendDirectPrompt(request: DirectPromptRequest): Promise<DirectPromptResponse> {
  const startTime = Date.now();
  const sessionId = request.sessionId || 'default';
  
  try {
    // Pre-flight checks
    await this.validateRateLimit();
    await this.validateCostThreshold(request);
    
    console.log(`🤖 Sending prompt to ${request.model} (Session: ${sessionId})`);
    
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens || 4000,
      temperature: request.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      // Enable usage tracking headers
      metadata: {
        user_id: sessionId,
        session_id: sessionId,
        feature: 'direct-prompt'
      }
    });

    const responseTime = Date.now() - startTime;
    const usage = response.usage;
    const cost = this.calculateCost(request.model, usage.input_tokens, usage.output_tokens);

    // Comprehensive metrics update
    await this.updateUsageMetrics({
      model: request.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cost,
      responseTime,
      success: true,
      sessionId,
      feature: 'direct-prompt',
      timestamp: startTime
    });

    // Record detailed token usage
    await this.tokenMonitor.recordTokenUsage(
      sessionId,
      usage.input_tokens + usage.output_tokens,
      `Claude ${request.model}: ${request.prompt.substring(0, 50)}...`
    );

    const result: DirectPromptResponse = {
      response: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens
      },
      responseTime,
      cost,
      model: request.model,
      metadata: {
        sessionId,
        timestamp: startTime,
        rateLimit: this.getCurrentRateLimit(),
        costAccumulator: this.usageMetrics.costEstimate.daily
      }
    };

    // Real-time WebSocket broadcast
    this.wsManager.broadcast('claude-api-update', {
      type: 'prompt-response',
      data: result,
      metrics: this.getUsageMetrics(),
      alerts: await this.checkUsageAlerts()
    });

    console.log(`✅ Prompt completed: ${responseTime}ms, ${usage.output_tokens} tokens, $${cost.toFixed(4)}`);
    return result;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Record failure metrics
    await this.updateUsageMetrics({
      model: request.model,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      responseTime,
      success: false,
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: startTime
    });

    // Enhanced error handling
    this.handleAPIError(error, request);
    throw new Error(`Claude API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Advanced Cost Tracking

```typescript
interface CostAnalytics {
  realTimeCost: number;
  projectedDailyCost: number;
  costTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  budgetAlerts: {
    daily: { threshold: number; current: number; exceeded: boolean };
    weekly: { threshold: number; current: number; exceeded: boolean };
    monthly: { threshold: number; current: number; exceeded: boolean };
  };
  costOptimization: {
    modelRecommendations: string[];
    potentialSavings: number;
    efficiencyScore: number;
  };
}

private async calculateAdvancedCost(model: string, inputTokens: number, outputTokens: number): Promise<{
  cost: number;
  breakdown: CostBreakdown;
  analytics: CostAnalytics;
}> {
  const pricing = this.PRICING[model as keyof typeof this.PRICING];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  // Calculate cost analytics
  const analytics: CostAnalytics = {
    realTimeCost: totalCost,
    projectedDailyCost: this.projectDailyCost(totalCost),
    costTrends: await this.getCostTrends(),
    budgetAlerts: this.checkBudgetAlerts(totalCost),
    costOptimization: await this.getCostOptimization(model, inputTokens, outputTokens)
  };

  return {
    cost: totalCost,
    breakdown: {
      input: { tokens: inputTokens, cost: inputCost, rate: pricing.input },
      output: { tokens: outputTokens, cost: outputCost, rate: pricing.output },
      total: totalCost
    },
    analytics
  };
}

private async getCostOptimization(model: string, inputTokens: number, outputTokens: number): Promise<{
  modelRecommendations: string[];
  potentialSavings: number;
  efficiencyScore: number;
}> {
  const alternatives = ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
  const currentCost = this.calculateCost(model, inputTokens, outputTokens);
  
  const recommendations = alternatives
    .filter(alt => alt !== model)
    .map(alt => ({
      model: alt,
      cost: this.calculateCost(alt, inputTokens, outputTokens),
      savings: currentCost - this.calculateCost(alt, inputTokens, outputTokens)
    }))
    .filter(rec => rec.savings > 0)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 2)
    .map(rec => rec.model);

  const maxSavings = Math.max(0, ...alternatives.map(alt => 
    currentCost - this.calculateCost(alt, inputTokens, outputTokens)
  ));

  const efficiencyScore = this.calculateEfficiencyScore(model, inputTokens, outputTokens);

  return {
    modelRecommendations: recommendations,
    potentialSavings: maxSavings,
    efficiencyScore
  };
}
```

---

## Model Selection & Optimization

### Intelligent Model Selection Strategy

```typescript
interface ModelSelectionCriteria {
  taskType: 'reasoning' | 'coding' | 'creative' | 'analysis' | 'simple_query';
  complexity: 'low' | 'medium' | 'high';
  latencyRequirement: 'fast' | 'balanced' | 'quality';
  budgetConstraint: 'strict' | 'moderate' | 'premium';
  contextLength: number;
  qualityRequirement: 'basic' | 'high' | 'maximum';
}

interface ModelRecommendation {
  primaryModel: string;
  alternatives: string[];
  reasoning: string;
  estimatedCost: number;
  expectedLatency: number;
  qualityScore: number;
  fallbackStrategy: string[];
}

class IntelligentModelSelector {
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  
  selectOptimalModel(criteria: ModelSelectionCriteria): ModelRecommendation {
    const candidates = this.getCandidateModels(criteria);
    const scored = candidates.map(model => ({
      model,
      score: this.calculateModelScore(model, criteria),
      metrics: this.getModelMetrics(model)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    const primary = scored[0];
    
    return {
      primaryModel: primary.model,
      alternatives: scored.slice(1, 3).map(s => s.model),
      reasoning: this.generateRecommendationReasoning(primary, criteria),
      estimatedCost: this.estimateRequestCost(primary.model, criteria),
      expectedLatency: primary.metrics.averageLatency,
      qualityScore: primary.metrics.qualityScore,
      fallbackStrategy: this.generateFallbackStrategy(primary.model, criteria)
    };
  }
  
  private getCandidateModels(criteria: ModelSelectionCriteria): string[] {
    // Context length filtering
    if (criteria.contextLength > 150000) {
      return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
    }
    
    // Budget-first filtering
    if (criteria.budgetConstraint === 'strict') {
      return ['claude-3-5-haiku-20241022'];
    }
    
    // Quality-first filtering
    if (criteria.qualityRequirement === 'maximum') {
      return ['claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'];
    }
    
    // Task-specific filtering
    switch (criteria.taskType) {
      case 'reasoning':
        return ['claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'];
      case 'coding':
        return ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
      case 'simple_query':
        return ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'];
      default:
        return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-5-haiku-20241022'];
    }
  }
  
  private calculateModelScore(model: string, criteria: ModelSelectionCriteria): number {
    let score = 0;
    const metrics = this.getModelMetrics(model);
    
    // Quality weight (0-40 points)
    if (criteria.qualityRequirement === 'maximum') {
      score += metrics.qualityScore * 0.4;
    } else if (criteria.qualityRequirement === 'high') {
      score += metrics.qualityScore * 0.3;
    } else {
      score += metrics.qualityScore * 0.2;
    }
    
    // Cost weight (0-30 points)
    const costScore = this.calculateCostScore(model, criteria);
    if (criteria.budgetConstraint === 'strict') {
      score += costScore * 0.3;
    } else if (criteria.budgetConstraint === 'moderate') {
      score += costScore * 0.2;
    } else {
      score += costScore * 0.1;
    }
    
    // Latency weight (0-20 points)
    const latencyScore = this.calculateLatencyScore(model, criteria);
    if (criteria.latencyRequirement === 'fast') {
      score += latencyScore * 0.2;
    } else {
      score += latencyScore * 0.1;
    }
    
    // Task suitability (0-10 points)
    score += this.calculateTaskSuitabilityScore(model, criteria.taskType) * 0.1;
    
    return score;
  }
  
  private generateRecommendationReasoning(primary: any, criteria: ModelSelectionCriteria): string {
    const model = primary.model;
    const reasons = [];
    
    if (model === 'claude-3-5-haiku-20241022') {
      reasons.push('Optimized for cost-effectiveness and speed');
      if (criteria.budgetConstraint === 'strict') {
        reasons.push('Meets strict budget requirements');
      }
    } else if (model === 'claude-3-5-sonnet-20241022') {
      reasons.push('Balanced performance and cost');
      if (criteria.taskType === 'coding') {
        reasons.push('Excellent coding capabilities');
      }
    } else if (model === 'claude-3-opus-20240229') {
      reasons.push('Highest quality and reasoning capabilities');
      if (criteria.qualityRequirement === 'maximum') {
        reasons.push('Meets maximum quality requirements');
      }
    }
    
    return reasons.join('; ');
  }
}
```

### Dynamic Model Switching

```typescript
class AdaptiveModelManager {
  private currentLoad: number = 0;
  private errorRates: Map<string, number> = new Map();
  
  async executeWithAdaptiveModel(
    request: DirectPromptRequest,
    criteria: ModelSelectionCriteria
  ): Promise<DirectPromptResponse> {
    const selector = new IntelligentModelSelector();
    const recommendation = selector.selectOptimalModel(criteria);
    
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;
    
    // Try primary model and fallbacks
    const modelsToTry = [recommendation.primaryModel, ...recommendation.alternatives];
    
    for (const model of modelsToTry) {
      if (attempts >= maxAttempts) break;
      
      try {
        // Check model health before attempting
        if (await this.isModelHealthy(model)) {
          const response = await this.sendDirectPrompt({
            ...request,
            model: model as any
          });
          
          // Success - update model reliability metrics
          this.updateModelReliability(model, true);
          return response;
        }
      } catch (error) {
        attempts++;
        lastError = error as Error;
        
        // Update model reliability metrics
        this.updateModelReliability(model, false);
        
        console.warn(`⚠️ Model ${model} failed (attempt ${attempts}), trying fallback...`);
      }
    }
    
    throw new Error(`All models failed after ${attempts} attempts. Last error: ${lastError?.message}`);
  }
  
  private async isModelHealthy(model: string): Promise<boolean> {
    const errorRate = this.errorRates.get(model) || 0;
    const threshold = 0.1; // 10% error rate threshold
    
    if (errorRate > threshold) {
      console.warn(`🔴 Model ${model} has high error rate (${(errorRate * 100).toFixed(1)}%)`);
      return false;
    }
    
    return true;
  }
  
  private updateModelReliability(model: string, success: boolean): void {
    const current = this.errorRates.get(model) || 0;
    const alpha = 0.1; // Exponential smoothing factor
    
    const newRate = success 
      ? current * (1 - alpha) 
      : current * (1 - alpha) + alpha;
      
    this.errorRates.set(model, newRate);
  }
}
```

---

## Implementation Examples

### Complete Service Integration

```typescript
// src/server/index.ts - Server initialization
import { AnthropicAPIService } from './services/AnthropicAPIService.js';
import { TokenMonitor } from './services/TokenMonitor.js';
import { JsonDatabaseManager } from './services/JsonDatabaseManager.js';
import { WebSocketManager } from './services/WebSocketManager.js';

export async function initializeServices(): Promise<{
  anthropicService: AnthropicAPIService;
  tokenMonitor: TokenMonitor;
  database: JsonDatabaseManager;
  wsManager: WebSocketManager;
}> {
  console.log('🔧 Initializing moonlock services...');
  
  // Initialize core services
  const database = new JsonDatabaseManager('./data/moonlock.json');
  await database.initialize();
  
  const wsManager = new WebSocketManager();
  const tokenMonitor = new TokenMonitor(database, wsManager);
  
  // Initialize Claude SDK service
  const anthropicService = new AnthropicAPIService(tokenMonitor, database, wsManager);
  await anthropicService.initialize();
  
  // Setup service integration
  await setupServiceIntegration(anthropicService, tokenMonitor, wsManager);
  
  console.log('✅ All services initialized successfully');
  
  return { anthropicService, tokenMonitor, database, wsManager };
}

async function setupServiceIntegration(
  anthropicService: AnthropicAPIService,
  tokenMonitor: TokenMonitor,
  wsManager: WebSocketManager
): Promise<void> {
  // Set up real-time usage broadcasting
  setInterval(async () => {
    const metrics = anthropicService.getUsageMetrics();
    const health = anthropicService.getHealthStatus();
    const alerts = await checkSystemAlerts(metrics);
    
    wsManager.broadcast('system-status', {
      anthropic: {
        metrics,
        health,
        alerts
      },
      timestamp: new Date().toISOString()
    });
  }, 5000); // Every 5 seconds
  
  // Set up daily metric resets
  setInterval(() => {
    anthropicService.resetDailyMetrics();
  }, 24 * 60 * 60 * 1000); // Daily
}
```

### Advanced React Hook Integration

```typescript
// src/client/src/hooks/useClaudeSDK.ts
export function useClaudeSDK() {
  const [metrics, setMetrics] = useState<APIUsageMetrics | null>(null);
  const [health, setHealth] = useState<APIHealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // Advanced prompt sending with optimization
  const sendOptimizedPrompt = useCallback(async (
    prompt: string,
    options: {
      taskType?: 'reasoning' | 'coding' | 'creative' | 'analysis' | 'simple_query';
      complexity?: 'low' | 'medium' | 'high';
      budgetConstraint?: 'strict' | 'moderate' | 'premium';
      qualityRequirement?: 'basic' | 'high' | 'maximum';
      maxTokens?: number;
      temperature?: number;
      sessionId?: string;
    } = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get model recommendation
      const recommendation = await fetch('/api/claude/recommend-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: options.taskType || 'analysis',
          complexity: options.complexity || 'medium',
          budgetConstraint: options.budgetConstraint || 'moderate',
          qualityRequirement: options.qualityRequirement || 'high',
          contextLength: prompt.length
        }),
      });
      
      const { primaryModel, reasoning } = await recommendation.json();
      
      // Send prompt with recommended model
      const response = await fetch('/api/claude/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: primaryModel,
          maxTokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
          sessionId: options.sessionId,
          optimization: {
            reasoning,
            adaptiveModel: true,
            costOptimization: options.budgetConstraint === 'strict'
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      // Update local metrics
      await refreshMetrics();
      
      return {
        ...data,
        modelRecommendation: {
          selected: primaryModel,
          reasoning
        }
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time metrics monitoring
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'system-status' && data.anthropic) {
        setMetrics(data.anthropic.metrics);
        setHealth(data.anthropic.health);
        setAlerts(data.anthropic.alerts || []);
      }
    };
    
    return () => ws.close();
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/claude/metrics'),
        fetch('/api/claude/health')
      ]);
      
      const [metricsData, healthData] = await Promise.all([
        metricsRes.json(),
        healthRes.json()
      ]);
      
      setMetrics(metricsData);
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to refresh metrics:', err);
    }
  }, []);

  // Utility functions
  const formatCost = useCallback((cost: number): string => {
    if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
    return `$${cost.toFixed(4)}`;
  }, []);

  const formatTokens = useCallback((tokens: number): string => {
    if (tokens > 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  }, []);

  const getModelDisplayName = useCallback((model: string): string => {
    const names: Record<string, string> = {
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
    };
    return names[model] || model;
  }, []);

  return {
    // Core functionality
    sendOptimizedPrompt,
    sendDirectPrompt: sendOptimizedPrompt, // Backward compatibility
    
    // State
    metrics,
    health,
    loading,
    error,
    alerts,
    
    // Utilities
    refreshMetrics,
    formatCost,
    formatTokens,
    getModelDisplayName,
    
    // Computed values
    serviceAvailable: health?.status !== 'down',
    costToday: metrics?.costEstimate.daily || 0,
    tokensUsed: metrics?.tokenConsumption.total || 0,
    requestsToday: metrics?.dailyRequestCount || 0,
    averageLatency: metrics?.responseTimeStats.average || 0,
    successRate: metrics?.successRate.percentage || 100
  };
}
```

### Enhanced Dashboard Component

```typescript
// src/client/src/components/ClaudeSDKDashboard.tsx
export const ClaudeSDKDashboard: React.FC = () => {
  const { 
    metrics, 
    health, 
    alerts, 
    serviceAvailable,
    formatCost,
    formatTokens 
  } = useClaudeSDK();

  if (!serviceAvailable) {
    return <ServiceUnavailableView />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Real-time Usage Card */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-semibold text-moonlock-400 mb-4">
          Real-time Usage
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Requests Today</span>
            <span className="text-white font-mono">
              {metrics?.dailyRequestCount || 0} / {metrics?.dailyRequestLimit || 1000}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Cost Today</span>
            <span className="text-green-400 font-mono">
              {formatCost(metrics?.costEstimate.daily || 0)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Total Tokens</span>
            <span className="text-blue-400 font-mono">
              {formatTokens(metrics?.tokenConsumption.total || 0)}
            </span>
          </div>
        </div>
        
        {/* Usage Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-dark-400 mb-1">
            <span>Daily Limit</span>
            <span>{((metrics?.dailyRequestCount || 0) / (metrics?.dailyRequestLimit || 1000) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div 
              className="bg-moonlock-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (metrics?.dailyRequestCount || 0) / (metrics?.dailyRequestLimit || 1000) * 100)}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Model Performance Card */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-semibold text-moonlock-400 mb-4">
          Model Performance
        </h3>
        
        <div className="space-y-3">
          {Object.entries(metrics?.modelUsageDistribution || {}).map(([model, data]) => (
            <div key={model} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getModelColor(model)}`} />
                <span className="text-dark-200 capitalize">{model}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-white">{data.requests} requests</div>
                <div className="text-xs text-dark-400">{formatCost(data.cost)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health Card */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-semibold text-moonlock-400 mb-4">
          System Health
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">API Status</span>
            <span className={`flex items-center space-x-2 ${
              health?.status === 'healthy' ? 'text-green-400' : 
              health?.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-green-500' : 
                health?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              } animate-pulse`} />
              <span className="capitalize">{health?.status || 'unknown'}</span>
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Avg Response</span>
            <span className="text-blue-400 font-mono">
              {metrics?.responseTimeStats.average?.toFixed(0) || 0}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Success Rate</span>
            <span className="text-green-400 font-mono">
              {metrics?.successRate.percentage?.toFixed(1) || 100}%
            </span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="lg:col-span-2 xl:col-span-3">
          <AlertsPanel alerts={alerts} />
        </div>
      )}
    </div>
  );
};

function getModelColor(model: string): string {
  const colors: Record<string, string> = {
    sonnet: 'bg-moonlock-500',
    opus: 'bg-purple-500',
    haiku: 'bg-green-500'
  };
  return colors[model] || 'bg-gray-500';
}
```

---

## Security Considerations

### API Key Management

```typescript
interface SecurityConfig {
  apiKey: {
    rotation: {
      enabled: boolean;
      intervalDays: number;
      warningDays: number;
    };
    validation: {
      pattern: RegExp;
      prefix: string;
      minLength: number;
    };
    storage: {
      encrypted: boolean;
      keyDerivation: string;
      saltRounds: number;
    };
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  requestValidation: {
    maxPromptLength: number;
    allowedModels: string[];
    contentFiltering: boolean;
  };
}

class SecurityManager {
  private config: SecurityConfig;
  private keyRotationSchedule: NodeJS.Timeout | null = null;
  
  constructor(config: SecurityConfig) {
    this.config = config;
    this.setupKeyRotation();
  }
  
  validateAPIKey(key: string): boolean {
    // Check format
    if (!this.config.apiKey.validation.pattern.test(key)) {
      console.error('🔒 Invalid API key format');
      return false;
    }
    
    // Check prefix
    if (!key.startsWith(this.config.apiKey.validation.prefix)) {
      console.error('🔒 Invalid API key prefix');
      return false;
    }
    
    // Check length
    if (key.length < this.config.apiKey.validation.minLength) {
      console.error('🔒 API key too short');
      return false;
    }
    
    return true;
  }
  
  validateRequest(request: DirectPromptRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate prompt length
    if (request.prompt.length > this.config.requestValidation.maxPromptLength) {
      errors.push(`Prompt exceeds maximum length of ${this.config.requestValidation.maxPromptLength} characters`);
    }
    
    // Validate model
    if (!this.config.requestValidation.allowedModels.includes(request.model)) {
      errors.push(`Model ${request.model} is not allowed`);
    }
    
    // Content filtering
    if (this.config.requestValidation.contentFiltering && this.containsUnsafeContent(request.prompt)) {
      errors.push('Request contains potentially unsafe content');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private containsUnsafeContent(prompt: string): boolean {
    const unsafePatterns = [
      /password/i,
      /api.key/i,
      /secret/i,
      /token/i,
      // Add more patterns as needed
    ];
    
    return unsafePatterns.some(pattern => pattern.test(prompt));
  }
  
  private setupKeyRotation(): void {
    if (!this.config.apiKey.rotation.enabled) return;
    
    const intervalMs = this.config.apiKey.rotation.intervalDays * 24 * 60 * 60 * 1000;
    
    this.keyRotationSchedule = setInterval(() => {
      this.checkKeyRotation();
    }, intervalMs);
  }
  
  private checkKeyRotation(): void {
    console.log('🔄 Checking API key rotation schedule...');
    // Implementation would check key age and trigger rotation warning
  }
}
```

### Request Sanitization & Validation

```typescript
class RequestSanitizer {
  private maxPromptLength = 50000;
  private forbiddenPatterns = [
    /\b(api[_-]?key|password|secret|token)\b/i,
    /sk-[a-zA-Z0-9]{20,}/,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
  ];
  
  sanitizeRequest(request: DirectPromptRequest): DirectPromptRequest {
    return {
      ...request,
      prompt: this.sanitizePrompt(request.prompt),
      maxTokens: this.sanitizeMaxTokens(request.maxTokens),
      temperature: this.sanitizeTemperature(request.temperature)
    };
  }
  
  private sanitizePrompt(prompt: string): string {
    // Remove potentially dangerous patterns
    let sanitized = prompt;
    
    this.forbiddenPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    // Truncate if too long
    if (sanitized.length > this.maxPromptLength) {
      sanitized = sanitized.substring(0, this.maxPromptLength) + '... [TRUNCATED]';
    }
    
    return sanitized;
  }
  
  private sanitizeMaxTokens(maxTokens?: number): number {
    if (!maxTokens) return 4000;
    return Math.min(Math.max(1, maxTokens), 8192);
  }
  
  private sanitizeTemperature(temperature?: number): number {
    if (!temperature) return 0.7;
    return Math.min(Math.max(0, temperature), 1);
  }
}
```

### Audit Logging

```typescript
interface AuditEvent {
  timestamp: string;
  eventType: 'request' | 'response' | 'error' | 'security';
  sessionId: string;
  userId?: string;
  model: string;
  tokenUsage: {
    input: number;
    output: number;
  };
  cost: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  securityFlags?: string[];
}

class AuditLogger {
  private logQueue: AuditEvent[] = [];
  private flushInterval = 10000; // 10 seconds
  
  constructor(private database: JsonDatabaseManager) {
    this.startLogFlushing();
  }
  
  logRequest(event: Omit<AuditEvent, 'timestamp' | 'eventType'>): void {
    this.logQueue.push({
      ...event,
      timestamp: new Date().toISOString(),
      eventType: event.success ? 'request' : 'error'
    });
  }
  
  logSecurityEvent(event: {
    sessionId: string;
    securityFlags: string[];
    details: any;
  }): void {
    this.logQueue.push({
      timestamp: new Date().toISOString(),
      eventType: 'security',
      sessionId: event.sessionId,
      model: 'n/a',
      tokenUsage: { input: 0, output: 0 },
      cost: 0,
      responseTime: 0,
      success: false,
      securityFlags: event.securityFlags
    });
  }
  
  private startLogFlushing(): void {
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }
  
  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;
    
    const logs = [...this.logQueue];
    this.logQueue = [];
    
    try {
      await this.database.appendAuditLogs(logs);
      console.log(`📝 Flushed ${logs.length} audit events`);
    } catch (error) {
      console.error('❌ Failed to flush audit logs:', error);
      // Re-queue logs for retry
      this.logQueue.unshift(...logs);
    }
  }
}
```

---

## Troubleshooting

### Common Issues & Diagnostics

#### 1. Authentication Problems

```typescript
class AuthenticationDiagnostics {
  async diagnoseAPIKey(): Promise<DiagnosticResult> {
    const key = process.env.CLAUDE_API_KEY;
    
    if (!key) {
      return {
        status: 'error',
        issue: 'Missing API Key',
        solution: 'Set CLAUDE_API_KEY environment variable',
        code: 'AUTH_001'
      };
    }
    
    if (!key.startsWith('sk-ant-api03-')) {
      return {
        status: 'error',
        issue: 'Invalid API Key Format',
        solution: 'Ensure API key starts with sk-ant-api03-',
        code: 'AUTH_002'
      };
    }
    
    try {
      const client = new Anthropic({ apiKey: key });
      await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      
      return {
        status: 'success',
        issue: 'API Key Valid',
        solution: 'Authentication working correctly'
      };
    } catch (error) {
      return {
        status: 'error',
        issue: 'API Key Rejected',
        solution: 'Verify API key is correct and has not expired',
        code: 'AUTH_003',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

#### 2. Rate Limiting Issues

```typescript
class RateLimitDiagnostics {
  private requestHistory: Array<{ timestamp: number; success: boolean }> = [];
  
  async diagnoseRateLimit(error: any): Promise<DiagnosticResult> {
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'];
      const resetTime = error.headers?.['x-ratelimit-reset'];
      
      return {
        status: 'warning',
        issue: 'Rate Limit Exceeded',
        solution: `Wait ${retryAfter || 'unknown'} seconds before retrying`,
        code: 'RATE_001',
        details: {
          retryAfter,
          resetTime,
          suggestions: [
            'Implement exponential backoff',
            'Reduce request frequency',
            'Consider using multiple API keys',
            'Implement request queuing'
          ]
        }
      };
    }
    
    // Check for approaching rate limit
    const recentRequests = this.requestHistory.filter(
      req => Date.now() - req.timestamp < 60000 // Last minute
    );
    
    if (recentRequests.length > 50) { // Approaching limit
      return {
        status: 'warning',
        issue: 'Approaching Rate Limit',
        solution: 'Slow down request rate to avoid hitting limits',
        code: 'RATE_002'
      };
    }
    
    return {
      status: 'success',
      issue: 'Rate Limiting OK',
      solution: 'No rate limiting issues detected'
    };
  }
}
```

#### 3. Model Availability Issues

```typescript
class ModelDiagnostics {
  async diagnoseModelAvailability(model: string): Promise<DiagnosticResult> {
    try {
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
      
      await client.messages.create({
        model: model as any,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      
      return {
        status: 'success',
        issue: 'Model Available',
        solution: `${model} is working correctly`
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('model')) {
        return {
          status: 'error',
          issue: 'Model Not Available',
          solution: 'Try alternative model or check model name spelling',
          code: 'MODEL_001',
          details: {
            requestedModel: model,
            alternatives: [
              'claude-3-5-sonnet-20241022',
              'claude-3-5-haiku-20241022',
              'claude-3-opus-20240229'
            ]
          }
        };
      }
      
      return {
        status: 'error',
        issue: 'Model Test Failed',
        solution: 'Check network connectivity and API key permissions',
        code: 'MODEL_002',
        details: error.message
      };
    }
  }
}
```

#### 4. Performance Issues

```typescript
class PerformanceDiagnostics {
  async diagnosePerformance(): Promise<DiagnosticResult> {
    const testPrompt = "Hello, how are you?";
    const startTime = Date.now();
    
    try {
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
      
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 50,
        messages: [{ role: 'user', content: testPrompt }]
      });
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 10000) { // >10 seconds
        return {
          status: 'warning',
          issue: 'Slow Response Time',
          solution: 'Consider using faster models or checking network connectivity',
          code: 'PERF_001',
          details: { responseTime: `${responseTime}ms` }
        };
      }
      
      if (responseTime > 5000) { // >5 seconds
        return {
          status: 'warning',
          issue: 'Moderate Response Time',
          solution: 'Response time is acceptable but could be improved',
          code: 'PERF_002',
          details: { responseTime: `${responseTime}ms` }
        };
      }
      
      return {
        status: 'success',
        issue: 'Good Performance',
        solution: `Response time: ${responseTime}ms - performing well`
      };
      
    } catch (error) {
      return {
        status: 'error',
        issue: 'Performance Test Failed',
        solution: 'Unable to measure performance due to API error',
        code: 'PERF_003',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

### Automated Health Monitoring

```typescript
class HealthMonitor {
  private diagnostics = {
    auth: new AuthenticationDiagnostics(),
    rateLimit: new RateLimitDiagnostics(),
    model: new ModelDiagnostics(),
    performance: new PerformanceDiagnostics()
  };
  
  async performFullDiagnostic(): Promise<HealthReport> {
    console.log('🔍 Performing comprehensive health check...');
    
    const results = await Promise.allSettled([
      this.diagnostics.auth.diagnoseAPIKey(),
      this.diagnostics.performance.diagnosePerformance(),
      this.diagnostics.model.diagnoseModelAvailability('claude-3-5-sonnet-20241022'),
      this.diagnostics.model.diagnoseModelAvailability('claude-3-5-haiku-20241022')
    ]);
    
    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      issues: [],
      recommendations: [],
      diagnostics: []
    };
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const diagnostic = result.value;
        report.diagnostics.push(diagnostic);
        
        if (diagnostic.status === 'error') {
          report.overallStatus = 'unhealthy';
          report.issues.push(diagnostic.issue);
        } else if (diagnostic.status === 'warning' && report.overallStatus === 'healthy') {
          report.overallStatus = 'degraded';
        }
        
        if (diagnostic.solution) {
          report.recommendations.push(diagnostic.solution);
        }
      }
    });
    
    console.log(`🏥 Health check complete: ${report.overallStatus}`);
    return report;
  }
}
```

---

## Best Practices

### 1. Cost Optimization Strategies

```typescript
const COST_OPTIMIZATION_BEST_PRACTICES = {
  modelSelection: {
    // Use Haiku for simple tasks
    simpleQueries: 'claude-3-5-haiku-20241022',
    // Use Sonnet for balanced performance
    generalPurpose: 'claude-3-5-sonnet-20241022',
    // Reserve Opus for complex reasoning
    complexReasoning: 'claude-3-opus-20240229'
  },
  
  promptOptimization: {
    // Be specific and concise
    maxPromptLength: 10000,
    // Use system messages effectively
    useSystemMessages: true,
    // Avoid redundant context
    removeRedundancy: true
  },
  
  tokenManagement: {
    // Set appropriate max_tokens
    defaultMaxTokens: 4000,
    // Monitor token usage
    trackTokens: true,
    // Use caching when possible
    enableCaching: true
  }
};
```

### 2. Performance Optimization

```typescript
const PERFORMANCE_BEST_PRACTICES = {
  requestBatching: {
    // Batch similar requests
    batchSize: 5,
    batchDelay: 100, // ms
  },
  
  caching: {
    // Cache frequent requests
    cacheTimeout: 3600000, // 1 hour
    maxCacheSize: 1000,
  },
  
  errorHandling: {
    // Implement retry logic
    maxRetries: 3,
    backoffMultiplier: 2,
    baseDelay: 1000
  }
};
```

### 3. Security Best Practices

```typescript
const SECURITY_BEST_PRACTICES = {
  apiKeyManagement: {
    // Rotate keys regularly
    rotationInterval: 90, // days
    // Use environment variables
    useEnvVars: true,
    // Monitor key usage
    auditKeyUsage: true
  },
  
  inputValidation: {
    // Sanitize all inputs
    sanitizeInputs: true,
    // Validate request parameters
    validateParams: true,
    // Filter sensitive content
    contentFiltering: true
  },
  
  logging: {
    // Log all requests
    logAllRequests: true,
    // Audit security events
    auditSecurity: true,
    // Monitor for anomalies
    anomalyDetection: true
  }
};
```

### 4. Monitoring & Alerting

```typescript
const MONITORING_BEST_PRACTICES = {
  metrics: {
    // Track key metrics
    trackUsage: true,
    trackCost: true,
    trackPerformance: true,
    trackErrors: true
  },
  
  alerting: {
    // Set up cost alerts
    costThreshold: 10.00, // $10/day
    // Set up usage alerts
    usageThreshold: 0.8, // 80% of limit
    // Set up performance alerts
    latencyThreshold: 5000 // 5 seconds
  },
  
  reporting: {
    // Generate regular reports
    dailyReports: true,
    weeklyReports: true,
    monthlyReports: true
  }
};
```

---

## Next Steps

1. **Environment Setup**: Configure environment variables and API keys
2. **Service Integration**: Deploy the AnthropicAPIService to your server
3. **Frontend Integration**: Implement the React hooks and components
4. **Monitoring Setup**: Configure health monitoring and alerting
5. **Security Implementation**: Apply security best practices and audit logging
6. **Performance Optimization**: Implement caching and request optimization
7. **Testing**: Verify all functionality with comprehensive tests

For additional support and advanced configuration options, refer to the [Anthropic API Documentation](https://docs.anthropic.com/claude/reference) and the existing codebase implementation patterns.