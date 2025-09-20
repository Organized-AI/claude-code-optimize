import { TokenUsage } from '../types';
import { StorageService } from './storage';
import { SessionService } from './session';

export interface UsageSummary {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
  cost?: number;
}

export interface UsageBreakdown {
  byModel?: { [model: string]: number };
  byHour?: { [hour: string]: number };
  averages?: {
    perSession: number;
    perDay: number;
    perHour: number;
  };
}

export class TokenService {
  private storage: StorageService;
  private sessionService: SessionService;
  
  // Token costs per 1K tokens (approximate, varies by model)
  private static readonly TOKEN_COSTS = {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'default': { input: 0.003, output: 0.015 }
  };
  
  constructor() {
    this.storage = new StorageService();
    this.sessionService = new SessionService();
  }
  
  async trackUsage(
    inputTokens: number,
    outputTokens: number,
    model: string = 'claude-3.5-sonnet'
  ): Promise<TokenUsage> {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.calculateCost(inputTokens, outputTokens, model);
    
    // Get current session
    const currentSession = await this.sessionService.getCurrentSession();
    const sessionId = currentSession?.id || 'no-session';
    
    const usage: TokenUsage = {
      sessionId,
      timestamp: new Date(),
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      model
    };
    
    // Save token usage
    await this.storage.saveTokenUsage(usage);
    
    // Update session token count if there's an active session
    if (currentSession) {
      await this.sessionService.updateSessionTokens(currentSession.id, totalTokens);
    }
    
    return usage;
  }
  
  async getTodayUsage(): Promise<UsageSummary> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    return this.getUsageForPeriod(startOfDay, endOfDay);
  }
  
  async getWeekUsage(): Promise<UsageSummary> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return this.getUsageForPeriod(startOfWeek, endOfWeek);
  }
  
  async getMonthUsage(): Promise<UsageSummary> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    return this.getUsageForPeriod(startOfMonth, endOfMonth);
  }
  
  async getUsageHistory(days: number = 30): Promise<TokenUsage[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return this.storage.getTokenUsageByDateRange(startDate, endDate);
  }
  
  async getUsageBreakdown(): Promise<UsageBreakdown> {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const usage = await this.storage.getTokenUsageByDateRange(last7Days, new Date());
    
    const byModel: { [model: string]: number } = {};
    const byHour: { [hour: string]: number } = {};
    
    let totalTokens = 0;
    const uniqueSessions = new Set<string>();
    
    for (const record of usage) {
      // By model
      const model = record.model || 'unknown';
      byModel[model] = (byModel[model] || 0) + record.totalTokens;
      
      // By hour
      const hour = record.timestamp.getHours().toString();
      byHour[hour] = (byHour[hour] || 0) + record.totalTokens;
      
      totalTokens += record.totalTokens;
      uniqueSessions.add(record.sessionId);
    }
    
    // Calculate averages
    const averages = {
      perSession: uniqueSessions.size > 0 ? totalTokens / uniqueSessions.size : 0,
      perDay: totalTokens / 7, // Last 7 days
      perHour: Object.keys(byHour).length > 0 ? totalTokens / Object.keys(byHour).length : 0
    };
    
    return { byModel, byHour, averages };
  }
  
  async resetCounters(): Promise<void> {
    // This would typically reset daily/weekly counters but preserve historical data
    // For now, we'll implement a soft reset by marking a reset point
    const resetMarker: TokenUsage = {
      sessionId: 'system-reset',
      timestamp: new Date(),
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      model: 'system',
      cost: 0
    };
    
    await this.storage.saveTokenUsage(resetMarker);
  }
  
  async cleanupOldData(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    return this.storage.deleteTokenUsage(cutoffDate);
  }
  
  private async getUsageForPeriod(startDate: Date, endDate: Date): Promise<UsageSummary> {
    const usage = await this.storage.getTokenUsageByDateRange(startDate, endDate);
    
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalCost = 0;
    const sessions = new Set<string>();
    
    for (const record of usage) {
      totalTokens += record.totalTokens;
      inputTokens += record.inputTokens;
      outputTokens += record.outputTokens;
      totalCost += record.cost || 0;
      
      if (record.sessionId !== 'no-session' && record.sessionId !== 'system-reset') {
        sessions.add(record.sessionId);
      }
    }
    
    return {
      totalTokens,
      inputTokens,
      outputTokens,
      sessionCount: sessions.size,
      cost: totalCost
    };
  }
  
  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const costs = (TokenService.TOKEN_COSTS as any)[model] || TokenService.TOKEN_COSTS.default;
    
    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    
    return inputCost + outputCost;
  }
  
  // Token estimation utilities
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
  
  static estimateInputTokens(prompt: string, context?: string): number {
    let total = this.estimateTokens(prompt);
    if (context) {
      total += this.estimateTokens(context);
    }
    return total;
  }
  
  // Usage monitoring and alerts
  async checkQuotaStatus(): Promise<{
    currentUsage: UsageSummary;
    warningLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }> {
    const weekUsage = await this.getWeekUsage();
    const monthUsage = await this.getMonthUsage();
    
    // These would be configurable limits
    const weeklyLimit = 100000; // 100k tokens per week
    const monthlyLimit = 400000; // 400k tokens per month
    
    const weeklyPercent = (weekUsage.totalTokens / weeklyLimit) * 100;
    const monthlyPercent = (monthUsage.totalTokens / monthlyLimit) * 100;
    
    const maxPercent = Math.max(weeklyPercent, monthlyPercent);
    
    let warningLevel: 'low' | 'medium' | 'high' | 'critical';
    let recommendation: string;
    
    if (maxPercent < 50) {
      warningLevel = 'low';
      recommendation = 'Usage is well within limits. Continue as normal.';
    } else if (maxPercent < 75) {
      warningLevel = 'medium';
      recommendation = 'Moderate usage detected. Monitor your token consumption.';
    } else if (maxPercent < 90) {
      warningLevel = 'high';
      recommendation = 'High usage detected. Consider optimizing prompts or reducing sessions.';
    } else {
      warningLevel = 'critical';
      recommendation = 'Critical usage level! Implement immediate usage reduction strategies.';
    }
    
    return {
      currentUsage: weekUsage,
      warningLevel,
      recommendation
    };
  }
  
  async getProjectUsage(projectName: string, days: number = 30): Promise<UsageSummary> {
    const sessions = await this.sessionService.getSessionsByProject(projectName);
    const sessionIds = sessions.map(s => s.id);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const allUsage = await this.storage.getTokenUsageByDateRange(startDate, endDate);
    const projectUsage = allUsage.filter(usage => sessionIds.includes(usage.sessionId));
    
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalCost = 0;
    
    for (const record of projectUsage) {
      totalTokens += record.totalTokens;
      inputTokens += record.inputTokens;
      outputTokens += record.outputTokens;
      totalCost += record.cost || 0;
    }
    
    return {
      totalTokens,
      inputTokens,
      outputTokens,
      sessionCount: sessionIds.length,
      cost: totalCost
    };
  }
}