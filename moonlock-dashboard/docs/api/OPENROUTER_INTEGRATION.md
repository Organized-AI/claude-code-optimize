# OpenRouter API Integration Guide

## Overview

This guide provides comprehensive instructions for integrating OpenRouter API into your dashboard alongside the existing Anthropic API integration. OpenRouter offers access to multiple AI models with credit-based pricing and detailed usage accounting.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Configuration](#api-configuration)
3. [Usage Accounting System](#usage-accounting-system)
4. [Multi-Model Routing](#multi-model-routing)
5. [Implementation Examples](#implementation-examples)
6. [Cost Optimization](#cost-optimization)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Obtain OpenRouter API Key

```bash
# Visit https://openrouter.ai/keys to get your API key
# Example key format: sk-or-v1-...
```

### 2. Environment Setup

```bash
# Add to your .env file
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_APP_NAME=moonlock-dashboard
OPENROUTER_APP_URL=https://moonlock-dashboard.vercel.app
```

### 3. Basic Configuration

```typescript
// src/server/services/OpenRouterAPIService.ts
import { OpenRouterAPIService } from './OpenRouterAPIService.js';

const openrouterService = new OpenRouterAPIService(
  tokenMonitor,
  database,
  wsManager
);

await openrouterService.initialize();
```

---

## API Configuration

### Configuration File Structure

The OpenRouter configuration follows the multi-provider pattern established in the codebase:

```json
// ~/.claude-code-router/config.json
{
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "sk-or-v1-your-key-here",
      "models": [
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet", 
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.5-pro-preview",
        "moonshotai/kimi-k2",
        "openai/gpt-4o",
        "meta-llama/llama-3.2-90b-instruct"
      ],
      "transformer": { "use": ["openrouter"] }
    }
  ],
  "Router": {
    "premium": "openrouter,anthropic/claude-sonnet-4",
    "coding": "openrouter,moonshotai/kimi-k2", 
    "longContext": "openrouter,google/gemini-2.5-pro-preview",
    "reasoning": "openrouter,anthropic/claude-3.5-sonnet",
    "budget": "openrouter,anthropic/claude-3.5-haiku"
  }
}
```

### Service Initialization

```typescript
// src/server/services/OpenRouterAPIService.ts
export class OpenRouterAPIService {
  private readonly baseURL = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private tokenMonitor: TokenMonitor;
  private db: JsonDatabaseManager;
  private wsManager: WebSocketManager;

  constructor(
    tokenMonitor: TokenMonitor,
    db: JsonDatabaseManager,
    wsManager: WebSocketManager
  ) {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    this.tokenMonitor = tokenMonitor;
    this.db = db;
    this.wsManager = wsManager;
  }

  async initialize(): Promise<void> {
    console.log('🔗 Initializing OpenRouter API service...');
    
    // Test API connectivity
    const healthCheck = await this.checkHealth();
    if (!healthCheck.healthy) {
      throw new Error(`OpenRouter API unhealthy: ${healthCheck.error}`);
    }
    
    console.log('✅ OpenRouter API service initialized successfully');
  }
}
```

---

## Usage Accounting System

### Core Usage Tracking Interface

```typescript
interface OpenRouterUsageMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  
  // Token breakdown by type
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  
  // Model-specific metrics
  modelUsage: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    avgLatency: number;
  }>;
  
  // Performance metrics
  averageLatency: number;
  successRate: number;
  errorCount: number;
  
  // Cost optimization
  estimatedSavings: number;
  costPerToken: number;
  budgetUtilization: number;
}
```

### Usage Tracking Implementation

```typescript
async sendDirectPrompt(request: OpenRouterDirectPromptRequest): Promise<OpenRouterDirectPromptResponse> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_APP_URL,
        'X-Title': process.env.OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        ...request,
        // Enable detailed usage tracking
        usage: { include: true },
        // Track generation details
        generation_id: `moonlock-${Date.now()}`,
      }),
    });

    const data = await response.json();
    const endTime = Date.now();
    
    // Extract detailed usage information
    const usage = data.usage || {};
    const cost = usage.total_cost || 0;
    
    // Record comprehensive metrics
    await this.tokenMonitor.recordOpenRouterUsage({
      sessionId: request.sessionId || 'default',
      model: request.model,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        reasoningTokens: usage.reasoning_tokens || 0,
        cachedTokens: usage.cached_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        totalCost: cost,
      },
      performance: {
        latency: endTime - startTime,
        timestamp: startTime,
        success: response.ok,
      },
      metadata: {
        generationId: data.generation_id,
        model: request.model,
        provider: 'openrouter',
      },
    });

    return {
      content: data.choices[0]?.message?.content || '',
      usage,
      cost,
      model: request.model,
      latency: endTime - startTime,
    };
    
  } catch (error) {
    await this.handleAPIError(error, request);
    throw error;
  }
}
```

### Cost Calculation

```typescript
interface OpenRouterPricing {
  [modelName: string]: {
    prompt: number;      // Price per 1K prompt tokens
    completion: number;  // Price per 1K completion tokens
    reasoning?: number;  // Price per 1K reasoning tokens (for reasoning models)
    image?: number;      // Price per image
  };
}

const OPENROUTER_PRICING: OpenRouterPricing = {
  'anthropic/claude-sonnet-4': {
    prompt: 0.015,
    completion: 0.075,
  },
  'anthropic/claude-3.5-sonnet': {
    prompt: 0.003,
    completion: 0.015,
  },
  'anthropic/claude-3.5-haiku': {
    prompt: 0.001,
    completion: 0.005,
  },
  'google/gemini-2.5-pro-preview': {
    prompt: 0.00125,
    completion: 0.005,
  },
  'moonshotai/kimi-k2': {
    prompt: 0.0003,
    completion: 0.0006,
  },
};

calculateCost(usage: OpenRouterUsage, model: string): number {
  const pricing = OPENROUTER_PRICING[model];
  if (!pricing) return usage.total_cost || 0;
  
  const promptCost = (usage.prompt_tokens / 1000) * pricing.prompt;
  const completionCost = (usage.completion_tokens / 1000) * pricing.completion;
  const reasoningCost = usage.reasoning_tokens 
    ? (usage.reasoning_tokens / 1000) * (pricing.reasoning || pricing.completion)
    : 0;
    
  return promptCost + completionCost + reasoningCost;
}
```

---

## Multi-Model Routing

### Model Selection Strategy

```typescript
interface ModelRoutingConfig {
  // Task-based routing
  coding: string[];
  reasoning: string[];
  creative: string[];
  analysis: string[];
  
  // Performance-based routing
  fastest: string[];
  balanced: string[];
  highest_quality: string[];
  
  // Cost-based routing
  budget: string[];
  premium: string[];
  
  // Context length routing
  long_context: string[];
  standard_context: string[];
}

const ROUTING_CONFIG: ModelRoutingConfig = {
  coding: [
    'moonshotai/kimi-k2',        // Excellent for code, very cost-effective
    'anthropic/claude-3.5-sonnet', // Strong coding capabilities
    'google/gemini-2.5-pro-preview', // Good for complex coding tasks
  ],
  reasoning: [
    'anthropic/claude-sonnet-4',    // Best reasoning capabilities
    'anthropic/claude-3.5-sonnet',  // Strong analytical thinking
    'openai/o1-preview',            // Specialized reasoning model
  ],
  budget: [
    'moonshotai/kimi-k2',           // $0.3/$0.6 per 1M tokens
    'anthropic/claude-3.5-haiku',   // $1/$5 per 1M tokens
    'google/gemini-2.5-pro-preview', // $1.25/$5 per 1M tokens
  ],
  premium: [
    'anthropic/claude-sonnet-4',    // $15/$75 per 1M tokens
    'openai/gpt-4o',               // Premium OpenAI model
  ],
  long_context: [
    'google/gemini-2.5-pro-preview', // 2M+ context window
    'anthropic/claude-3.5-sonnet',   // 200K context window
    'moonshotai/kimi-k2',           // 200K+ context window
  ],
};
```

### Intelligent Model Selection

```typescript
class ModelSelector {
  selectOptimalModel(request: {
    task: string;
    complexity: 'low' | 'medium' | 'high';
    budget: 'strict' | 'moderate' | 'premium';
    contextLength: number;
    latencyRequirement: 'fast' | 'balanced' | 'quality';
  }): string {
    
    // Context length filtering
    if (request.contextLength > 100000) {
      const longContextModels = ROUTING_CONFIG.long_context;
      return this.selectFromPool(longContextModels, request);
    }
    
    // Budget-based selection
    if (request.budget === 'strict') {
      return this.selectFromPool(ROUTING_CONFIG.budget, request);
    }
    
    // Task-specific routing
    const taskModels = ROUTING_CONFIG[request.task] || ROUTING_CONFIG.balanced;
    
    // Complexity and budget filtering
    if (request.complexity === 'high' && request.budget === 'premium') {
      return 'anthropic/claude-sonnet-4';
    }
    
    if (request.complexity === 'low' && request.budget !== 'premium') {
      return 'moonshotai/kimi-k2';
    }
    
    // Default balanced selection
    return taskModels[0] || 'anthropic/claude-3.5-sonnet';
  }
  
  private selectFromPool(models: string[], request: any): string {
    // Advanced selection logic based on current performance metrics
    // This could incorporate real-time latency, success rates, etc.
    return models[0];
  }
}
```

---

## Implementation Examples

### Complete API Service Implementation

```typescript
// src/server/services/OpenRouterAPIService.ts
export class OpenRouterAPIService {
  async getUsageMetrics(timeRange?: TimeRange): Promise<OpenRouterUsageMetrics> {
    const usage = await this.db.getOpenRouterUsage(timeRange);
    
    return {
      totalRequests: usage.length,
      totalTokens: usage.reduce((sum, u) => sum + u.totalTokens, 0),
      totalCost: usage.reduce((sum, u) => sum + u.totalCost, 0),
      
      promptTokens: usage.reduce((sum, u) => sum + u.promptTokens, 0),
      completionTokens: usage.reduce((sum, u) => sum + u.completionTokens, 0),
      reasoningTokens: usage.reduce((sum, u) => sum + (u.reasoningTokens || 0), 0),
      cachedTokens: usage.reduce((sum, u) => sum + (u.cachedTokens || 0), 0),
      
      modelUsage: this.aggregateModelUsage(usage),
      averageLatency: this.calculateAverageLatency(usage),
      successRate: this.calculateSuccessRate(usage),
      errorCount: usage.filter(u => !u.success).length,
      
      estimatedSavings: await this.calculateSavingsVsAnthropic(usage),
      costPerToken: this.calculateAverageCostPerToken(usage),
      budgetUtilization: await this.calculateBudgetUtilization(usage),
    };
  }
  
  private async calculateSavingsVsAnthropic(usage: OpenRouterUsage[]): Promise<number> {
    // Compare costs against direct Anthropic pricing
    let openrouterCost = 0;
    let anthropicEquivalentCost = 0;
    
    for (const record of usage) {
      openrouterCost += record.totalCost;
      
      // Calculate what this would cost on direct Anthropic API
      if (record.model.includes('claude')) {
        const anthropicCost = this.calculateAnthropicEquivalentCost(record);
        anthropicEquivalentCost += anthropicCost;
      }
    }
    
    return Math.max(0, anthropicEquivalentCost - openrouterCost);
  }
}
```

### React Hook Integration

```typescript
// src/client/src/hooks/useOpenRouterAPI.ts
export function useOpenRouterAPI() {
  const [usage, setUsage] = useState<OpenRouterUsageMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPrompt = useCallback(async (
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      sessionId?: string;
    } = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/openrouter/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: options.model || 'anthropic/claude-3.5-sonnet',
          maxTokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
          sessionId: options.sessionId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      // Refresh usage metrics after successful request
      await refreshUsage();
      
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/openrouter/usage');
      const data = await response.json();
      setUsage(data);
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }, []);
  
  // Auto-refresh usage every 30 seconds
  useEffect(() => {
    refreshUsage();
    const interval = setInterval(refreshUsage, 30000);
    return () => clearInterval(interval);
  }, [refreshUsage]);

  return {
    sendPrompt,
    usage,
    loading,
    error,
    refreshUsage,
  };
}
```

### Multi-Provider Comparison Component

```typescript
// src/client/src/components/ProviderComparison.tsx
interface ProviderComparisonProps {
  anthropicUsage: AnthropicUsageMetrics;
  openrouterUsage: OpenRouterUsageMetrics;
}

export function ProviderComparison({ anthropicUsage, openrouterUsage }: ProviderComparisonProps) {
  const comparison = useMemo(() => ({
    cost: {
      anthropic: anthropicUsage.totalCost,
      openrouter: openrouterUsage.totalCost,
      savings: Math.max(0, anthropicUsage.totalCost - openrouterUsage.totalCost),
      savingsPercentage: anthropicUsage.totalCost > 0 
        ? ((anthropicUsage.totalCost - openrouterUsage.totalCost) / anthropicUsage.totalCost) * 100
        : 0,
    },
    performance: {
      anthropic: {
        latency: anthropicUsage.averageLatency,
        successRate: anthropicUsage.successRate,
      },
      openrouter: {
        latency: openrouterUsage.averageLatency,
        successRate: openrouterUsage.successRate,
      },
    },
    tokens: {
      anthropic: anthropicUsage.totalTokens,
      openrouter: openrouterUsage.totalTokens,
      total: anthropicUsage.totalTokens + openrouterUsage.totalTokens,
    },
  }), [anthropicUsage, openrouterUsage]);

  return (
    <div className="provider-comparison">
      <h3>Provider Comparison</h3>
      
      <div className="comparison-grid">
        <div className="cost-comparison">
          <h4>Cost Analysis</h4>
          <div className="metric">
            <span>Total Savings:</span>
            <span className="value positive">
              ${comparison.cost.savings.toFixed(4)} 
              ({comparison.cost.savingsPercentage.toFixed(1)}%)
            </span>
          </div>
          
          <div className="cost-breakdown">
            <div>Anthropic: ${comparison.cost.anthropic.toFixed(4)}</div>
            <div>OpenRouter: ${comparison.cost.openrouter.toFixed(4)}</div>
          </div>
        </div>
        
        <div className="performance-comparison">
          <h4>Performance Metrics</h4>
          <div className="performance-grid">
            <div>
              <strong>Latency</strong>
              <div>Anthropic: {comparison.performance.anthropic.latency}ms</div>
              <div>OpenRouter: {comparison.performance.openrouter.latency}ms</div>
            </div>
            <div>
              <strong>Success Rate</strong>
              <div>Anthropic: {(comparison.performance.anthropic.successRate * 100).toFixed(1)}%</div>
              <div>OpenRouter: {(comparison.performance.openrouter.successRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
      
      <ProviderRecommendation comparison={comparison} />
    </div>
  );
}
```

---

## Cost Optimization

### Smart Model Selection for Cost Efficiency

```typescript
interface CostOptimizationStrategy {
  budgetThreshold: number;
  fallbackModel: string;
  rules: OptimizationRule[];
}

interface OptimizationRule {
  condition: (request: any) => boolean;
  recommendedModel: string;
  reasoning: string;
}

const COST_OPTIMIZATION_RULES: OptimizationRule[] = [
  {
    condition: (req) => req.taskType === 'simple_query' && req.expectedTokens < 1000,
    recommendedModel: 'moonshotai/kimi-k2',
    reasoning: 'Simple queries work well with cost-effective models'
  },
  {
    condition: (req) => req.taskType === 'code_review' && req.complexity === 'low',
    recommendedModel: 'anthropic/claude-3.5-haiku',
    reasoning: 'Code reviews benefit from fast, efficient models'
  },
  {
    condition: (req) => req.taskType === 'complex_reasoning' || req.complexity === 'high',
    recommendedModel: 'anthropic/claude-sonnet-4',
    reasoning: 'Complex tasks require premium reasoning capabilities'
  },
  {
    condition: (req) => req.contextLength > 50000,
    recommendedModel: 'google/gemini-2.5-pro-preview',
    reasoning: 'Long context requires specialized models'
  },
];

class CostOptimizer {
  recommendModel(request: APIRequest, currentBudget: number): {
    model: string;
    reasoning: string;
    estimatedCost: number;
    alternatives: ModelAlternative[];
  } {
    // Apply optimization rules
    for (const rule of COST_OPTIMIZATION_RULES) {
      if (rule.condition(request)) {
        const estimatedCost = this.estimateRequestCost(request, rule.recommendedModel);
        
        return {
          model: rule.recommendedModel,
          reasoning: rule.reasoning,
          estimatedCost,
          alternatives: this.generateAlternatives(request),
        };
      }
    }
    
    // Default to balanced selection
    return this.getBalancedRecommendation(request, currentBudget);
  }
  
  private estimateRequestCost(request: APIRequest, model: string): number {
    const pricing = OPENROUTER_PRICING[model];
    if (!pricing) return 0;
    
    const estimatedPromptTokens = request.maxTokens * 0.1; // Rough estimate
    const estimatedCompletionTokens = request.maxTokens * 0.9;
    
    return (estimatedPromptTokens / 1000) * pricing.prompt + 
           (estimatedCompletionTokens / 1000) * pricing.completion;
  }
}
```

### Budget Monitoring & Alerts

```typescript
interface BudgetAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  recommendation: string;
  threshold: number;
  currentUsage: number;
}

class BudgetMonitor {
  private budgetLimits = {
    daily: 5.00,      // $5 per day
    weekly: 25.00,    // $25 per week  
    monthly: 100.00,  // $100 per month
  };
  
  async checkBudgetStatus(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const usage = await this.getCurrentUsage();
    
    // Daily budget check
    if (usage.daily > this.budgetLimits.daily * 0.8) {
      alerts.push({
        type: usage.daily > this.budgetLimits.daily ? 'critical' : 'warning',
        message: `Daily spending: $${usage.daily.toFixed(2)} / $${this.budgetLimits.daily}`,
        recommendation: usage.daily > this.budgetLimits.daily 
          ? 'Switch to budget models (kimi-k2, claude-haiku) for remaining requests'
          : 'Consider using cost-effective models for simple tasks',
        threshold: this.budgetLimits.daily,
        currentUsage: usage.daily,
      });
    }
    
    // Weekly budget check
    if (usage.weekly > this.budgetLimits.weekly * 0.9) {
      alerts.push({
        type: 'warning',
        message: `Weekly spending approaching limit: $${usage.weekly.toFixed(2)} / $${this.budgetLimits.weekly}`,
        recommendation: 'Optimize model selection for cost efficiency',
        threshold: this.budgetLimits.weekly,
        currentUsage: usage.weekly,
      });
    }
    
    return alerts;
  }
}
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. API Key Issues

```typescript
// Error: Invalid API key
async validateAPIKey(): Promise<boolean> {
  try {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    
    if (response.status === 401) {
      console.error('❌ Invalid OpenRouter API key');
      return false;
    }
    
    if (response.status === 403) {
      console.error('❌ OpenRouter API key lacks required permissions');
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Failed to validate API key:', error);
    return false;
  }
}
```

#### 2. Rate Limiting

```typescript
class RateLimitHandler {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async handleRateLimit(error: any, retryCount = 0): Promise<any> {
    if (error.status === 429 && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.retryRequest(error.request, retryCount + 1);
    }
    
    throw error;
  }
}
```

#### 3. Model Availability

```typescript
async checkModelAvailability(model: string): Promise<{
  available: boolean;
  alternatives: string[];
  reason?: string;
}> {
  try {
    const response = await fetch(`${this.baseURL}/models/${model}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    
    if (response.ok) {
      return { available: true, alternatives: [] };
    }
    
    if (response.status === 404) {
      return {
        available: false,
        alternatives: this.getSimilarModels(model),
        reason: 'Model not found or not accessible with current API key',
      };
    }
    
    return {
      available: false,
      alternatives: this.getBackupModels(),
      reason: 'Model temporarily unavailable',
    };
    
  } catch (error) {
    return {
      available: false,
      alternatives: this.getBackupModels(),
      reason: 'Failed to check model availability',
    };
  }
}
```

#### 4. Connection Issues

```typescript
class ConnectionManager {
  private retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.retryConfig.maxRetries) {
          console.error(`❌ ${context} failed after ${attempt + 1} attempts:`, error);
          break;
        }
        
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        
        console.log(`⚠️ ${context} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```

### Health Monitoring

```typescript
interface HealthStatus {
  healthy: boolean;
  latency: number;
  lastCheck: Date;
  error?: string;
  details: {
    apiConnectivity: boolean;
    modelAvailability: boolean;
    rateLimitStatus: 'ok' | 'throttled' | 'blocked';
    creditBalance: number;
  };
}

async checkHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    const response = await fetch(`${this.baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        healthy: false,
        latency,
        lastCheck: new Date(),
        error: `API returned ${response.status}: ${response.statusText}`,
        details: {
          apiConnectivity: false,
          modelAvailability: false,
          rateLimitStatus: response.status === 429 ? 'blocked' : 'ok',
          creditBalance: 0,
        },
      };
    }
    
    const data = await response.json();
    
    return {
      healthy: true,
      latency,
      lastCheck: new Date(),
      details: {
        apiConnectivity: true,
        modelAvailability: data.data && data.data.length > 0,
        rateLimitStatus: 'ok',
        creditBalance: await this.getCreditBalance(),
      },
    };
    
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      lastCheck: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        apiConnectivity: false,
        modelAvailability: false,
        rateLimitStatus: 'ok',
        creditBalance: 0,
      },
    };
  }
}
```

---

## Next Steps

1. **Implement Environment Configuration**: Set up environment variables and API keys
2. **Deploy Service Integration**: Add OpenRouter service to your server initialization
3. **Configure Model Routing**: Set up intelligent model selection based on task requirements
4. **Monitor Usage & Costs**: Implement budget tracking and cost optimization
5. **Test Multi-Provider Setup**: Verify both Anthropic and OpenRouter APIs work correctly

For additional support and advanced configuration options, refer to the [OpenRouter API Documentation](https://openrouter.ai/docs) and the existing codebase implementation.