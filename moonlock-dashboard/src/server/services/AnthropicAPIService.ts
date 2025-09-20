/**
 * AnthropicAPIService
 * 
 * Direct integration with Anthropic Claude API for:
 * - Real-time API usage tracking and monitoring
 * - Direct prompt sending and response handling
 * - Rate limit monitoring and cost calculation
 * - API health checks and response time tracking
 * - Model usage distribution analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { TokenMonitor } from './TokenMonitor.js';
import { JsonDatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { ClaudeCodeCommandService, PlanModeSession, PlanStep } from './ClaudeCodeCommandService.js';

export interface APIUsageMetrics {
  dailyRequestCount: number;
  dailyRequestLimit: number;
  tokenConsumption: {
    input: number;
    output: number;
    cache: number;
    total: number;
  };
  costEstimate: {
    daily: number;
    weekly: number;
    monthly: number;
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
    sonnet: { requests: number; tokens: number; cost: number };
    opus: { requests: number; tokens: number; cost: number };
  };
  successRate: {
    successful: number;
    failed: number;
    percentage: number;
  };
}

export interface DirectPromptRequest {
  prompt: string;
  model: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229';
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;
  isCommand?: boolean;
}

export interface PlanModeRequest {
  title: string;
  description: string;
  steps: string[];
  autoExecute?: boolean;
  sessionId?: string;
}

export interface SlashCommandRequest {
  command: string;
  args?: string[];
  sessionId?: string;
}

export interface DirectPromptResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  responseTime: number;
  cost: number;
  model: string;
  sessionId?: string;
  isCommand?: boolean;
}

export interface PlanModeResponse {
  sessionId: string;
  session: PlanModeSession;
}

export interface SlashCommandResponse {
  success: boolean;
  output: string;
  error?: string;
  command: string;
  duration: number;
}

export interface APIHealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  issues: string[];
}

export class AnthropicAPIService {
  private client: Anthropic;
  private tokenMonitor: TokenMonitor;
  private database: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private commandService: ClaudeCodeCommandService;
  private usageMetrics: APIUsageMetrics;
  private healthStatus: APIHealthCheck;
  private requestHistory: Array<{ timestamp: number; responseTime: number; success: boolean }> = [];
  
  // Pricing (as of current rates - should be configurable)
  private readonly PRICING = {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 }, // per million tokens
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 }
  };

  constructor(
    tokenMonitor: TokenMonitor,
    database: JsonDatabaseManager,
    wsManager: WebSocketManager
  ) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ CLAUDE_API_KEY not provided - some features will be unavailable');
    }

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
    
    this.tokenMonitor = tokenMonitor;
    this.database = database;
    this.wsManager = wsManager;
    this.commandService = new ClaudeCodeCommandService(database, wsManager);

    this.initializeMetrics();
    this.startHealthMonitoring();
  }

  private initializeMetrics(): void {
    this.usageMetrics = {
      dailyRequestCount: 0,
      dailyRequestLimit: 1000, // Default limit
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

    this.healthStatus = {
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      uptime: 0,
      issues: []
    };
  }

  async sendDirectPrompt(request: DirectPromptRequest): Promise<DirectPromptResponse> {
    if (!this.client) {
      throw new Error('Claude API not available - CLAUDE_API_KEY not configured');
    }

    const startTime = Date.now();
    
    try {
      console.log(`🤖 Sending direct prompt to ${request.model}...`);
      
      // Check if this is a slash command
      if (request.isCommand && request.prompt.startsWith('/')) {
        return await this.handleSlashCommand(request);
      }
      
      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ]
      });

      const responseTime = Date.now() - startTime;
      const usage = response.usage;
      const cost = this.calculateCost(request.model, usage.input_tokens, usage.output_tokens);

      // Update metrics
      this.updateUsageMetrics(request.model, usage.input_tokens, usage.output_tokens, cost, responseTime, true);

      // Record token usage
      await this.tokenMonitor.recordTokenUsage(
        request.sessionId || 'direct-prompt',
        usage.input_tokens + usage.output_tokens,
        `Direct API call: ${request.model}`
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
        sessionId: request.sessionId,
        isCommand: request.isCommand
      };

      // Broadcast update via WebSocket
      this.wsManager.broadcast('anthropic-api-update', {
        type: 'prompt-response',
        data: result,
        metrics: this.usageMetrics
      });

      console.log(`✅ Prompt completed: ${responseTime}ms, ${usage.output_tokens} tokens, $${cost.toFixed(4)}`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ Direct prompt failed:', error);

      // Update failure metrics
      this.updateUsageMetrics(request.model, 0, 0, 0, responseTime, false);

      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleSlashCommand(request: DirectPromptRequest): Promise<DirectPromptResponse> {
    const startTime = Date.now();
    
    try {
      const [command, ...args] = request.prompt.split(' ');
      const commandResult = await this.commandService.executeCommand(command, args, request.sessionId);
      
      const responseTime = Date.now() - startTime;
      
      // Record as command usage (no tokens from Claude API)
      await this.tokenMonitor.recordTokenUsage(
        request.sessionId || 'command',
        0,
        `Slash command: ${command}`
      );
      
      const result: DirectPromptResponse = {
        response: commandResult.success ? commandResult.output : `Command failed: ${commandResult.error}`,
        usage: {
          inputTokens: 0,
          outputTokens: 0
        },
        responseTime,
        cost: 0,
        model: 'claude-code-cli',
        sessionId: request.sessionId,
        isCommand: true
      };
      
      // Broadcast command result
      this.wsManager.broadcast('claude-command-result', {
        type: 'slash-command',
        data: result,
        commandResult
      });
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        response: `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        usage: { inputTokens: 0, outputTokens: 0 },
        responseTime,
        cost: 0,
        model: 'claude-code-cli',
        sessionId: request.sessionId,
        isCommand: true
      };
    }
  }

  async performHealthCheck(): Promise<APIHealthCheck> {
    if (!this.client) {
      this.healthStatus = {
        status: 'down',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        uptime: this.calculateUptime(),
        issues: ['CLAUDE_API_KEY not configured']
      };
      
      this.wsManager.broadcast('api-health-update', this.healthStatus);
      return this.healthStatus;
    }

    const startTime = Date.now();
    
    try {
      // Send a minimal test prompt
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });

      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        uptime: this.calculateUptime(),
        issues: responseTime > 2000 ? ['High response time detected'] : []
      };

      console.log(`🏥 API health check: ${this.healthStatus.status} (${responseTime}ms)`);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: 'down',
        responseTime,
        lastCheck: new Date().toISOString(),
        uptime: this.calculateUptime(),
        issues: [`API unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };

      console.error('❌ API health check failed:', error);
    }

    // Broadcast health update
    this.wsManager.broadcast('api-health-update', this.healthStatus);
    
    return this.healthStatus;
  }

  getUsageMetrics(): APIUsageMetrics {
    return { ...this.usageMetrics };
  }

  getHealthStatus(): APIHealthCheck {
    return { ...this.healthStatus };
  }

  private updateUsageMetrics(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    responseTime: number,
    success: boolean
  ): void {
    // Update request counts
    this.usageMetrics.dailyRequestCount++;
    
    // Update token consumption
    this.usageMetrics.tokenConsumption.input += inputTokens;
    this.usageMetrics.tokenConsumption.output += outputTokens;
    this.usageMetrics.tokenConsumption.total += inputTokens + outputTokens;

    // Update cost estimates
    this.usageMetrics.costEstimate.daily += cost;
    this.usageMetrics.costEstimate.weekly = this.usageMetrics.costEstimate.daily * 7;
    this.usageMetrics.costEstimate.monthly = this.usageMetrics.costEstimate.daily * 30;

    // Update response time stats
    this.requestHistory.push({ timestamp: Date.now(), responseTime, success });
    this.requestHistory = this.requestHistory.slice(-100); // Keep last 100 requests
    
    const recentTimes = this.requestHistory.map(r => r.responseTime);
    this.usageMetrics.responseTimeStats.average = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
    this.usageMetrics.responseTimeStats.peak = Math.max(...recentTimes);
    this.usageMetrics.responseTimeStats.current = responseTime;

    // Update model distribution
    const modelKey = model.includes('opus') ? 'opus' : 'sonnet';
    this.usageMetrics.modelUsageDistribution[modelKey].requests++;
    this.usageMetrics.modelUsageDistribution[modelKey].tokens += inputTokens + outputTokens;
    this.usageMetrics.modelUsageDistribution[modelKey].cost += cost;

    // Update success rate
    const recentRequests = this.requestHistory.slice(-50); // Last 50 requests
    const successful = recentRequests.filter(r => r.success).length;
    const failed = recentRequests.length - successful;
    
    this.usageMetrics.successRate.successful = successful;
    this.usageMetrics.successRate.failed = failed;
    this.usageMetrics.successRate.percentage = recentRequests.length > 0 ? (successful / recentRequests.length) * 100 : 100;

    // Update rate limit status (mock - real implementation would use response headers)
    this.usageMetrics.rateLimitStatus.requestsRemaining = Math.max(0, this.usageMetrics.dailyRequestLimit - this.usageMetrics.dailyRequestCount);
    this.usageMetrics.rateLimitStatus.percentUsed = (this.usageMetrics.dailyRequestCount / this.usageMetrics.dailyRequestLimit) * 100;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.PRICING[model as keyof typeof this.PRICING];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    
    return inputCost + outputCost;
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

  async getAvailableModels(): Promise<string[]> {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229'
    ];
  }

  // Command service integration methods
  async executeSlashCommand(request: SlashCommandRequest): Promise<SlashCommandResponse> {
    try {
      const result = await this.commandService.executeCommand(
        request.command, 
        request.args || [], 
        request.sessionId
      );
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        command: result.command,
        duration: result.duration
      };
    } catch (error) {
      throw new Error(`Slash command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createPlanModeSession(request: PlanModeRequest): Promise<PlanModeResponse> {
    try {
      const planSteps: Omit<PlanStep, 'id' | 'status' | 'timestamp'>[] = request.steps.map(step => ({
        description: step,
        command: step.startsWith('/') ? step : undefined
      }));
      
      const session = await this.commandService.createPlanModeSession(
        request.title,
        request.description,
        planSteps,
        request.autoExecute
      );
      
      return {
        sessionId: session.id,
        session
      };
    } catch (error) {
      throw new Error(`Plan mode session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executePlanModeSession(sessionId: string): Promise<void> {
    try {
      await this.commandService.executePlanModeSession(sessionId);
    } catch (error) {
      throw new Error(`Plan mode execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelPlanModeSession(sessionId: string): Promise<void> {
    try {
      await this.commandService.cancelPlanModeSession(sessionId);
    } catch (error) {
      throw new Error(`Plan mode cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getPlanModeSession(sessionId: string): PlanModeSession | undefined {
    return this.commandService.getPlanModeSession(sessionId);
  }

  getAllPlanModeSessions(): PlanModeSession[] {
    return this.commandService.getAllPlanModeSessions();
  }

  getAvailableSlashCommands() {
    return this.commandService.getAvailableCommands();
  }

  getCommandHistory(limit?: number) {
    return this.commandService.getCommandHistory(limit);
  }

  async initializeCommandService(): Promise<void> {
    await this.commandService.initialize();
  }

  async shutdownCommandService(): Promise<void> {
    await this.commandService.shutdown();
  }

  isAPIAvailable(): boolean {
    return !!this.client;
  }

  // Reset daily metrics (should be called by a cron job)
  resetDailyMetrics(): void {
    this.usageMetrics.dailyRequestCount = 0;
    this.usageMetrics.tokenConsumption = { input: 0, output: 0, cache: 0, total: 0 };
    this.usageMetrics.costEstimate.daily = 0;
    this.usageMetrics.modelUsageDistribution = {
      sonnet: { requests: 0, tokens: 0, cost: 0 },
      opus: { requests: 0, tokens: 0, cost: 0 }
    };
    
    console.log('📊 Daily API metrics reset');
  }
}