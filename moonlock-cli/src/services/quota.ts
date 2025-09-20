import { QuotaStatus } from '../types';
import { TokenService } from './token';
import { StorageService } from './storage';

export class QuotaService {
  private tokenService: TokenService;
  private storage: StorageService;
  
  // Default quota limits (these would be configurable)
  private static readonly DEFAULT_LIMITS = {
    weekly: 100000,    // 100k tokens per week
    monthly: 400000,   // 400k tokens per month
    daily: 20000       // 20k tokens per day
  };
  
  constructor() {
    this.tokenService = new TokenService();
    this.storage = new StorageService();
  }
  
  async getCurrentQuota(): Promise<QuotaStatus> {
    const config = await this.storage.getConfig();
    const weekUsage = await this.tokenService.getWeekUsage();
    
    // For now, we'll use weekly limits as the primary quota
    const limit = QuotaService.DEFAULT_LIMITS.weekly;
    const current = weekUsage.totalTokens;
    
    // Calculate when the quota resets (next Sunday at midnight)
    const now = new Date();
    const resetTime = new Date();
    resetTime.setDate(now.getDate() + (7 - now.getDay()));
    resetTime.setHours(0, 0, 0, 0);
    
    const warningThreshold = limit * 0.8; // 80% warning threshold
    
    return {
      current,
      limit,
      resetTime,
      warningThreshold
    };
  }
  
  async getDailyQuota(): Promise<QuotaStatus> {
    const todayUsage = await this.tokenService.getTodayUsage();
    const limit = QuotaService.DEFAULT_LIMITS.daily;
    const current = todayUsage.totalTokens;
    
    // Reset time is tomorrow at midnight
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    
    return {
      current,
      limit,
      resetTime,
      warningThreshold: limit * 0.8
    };
  }
  
  async getMonthlyQuota(): Promise<QuotaStatus> {
    const monthUsage = await this.tokenService.getMonthUsage();
    const limit = QuotaService.DEFAULT_LIMITS.monthly;
    const current = monthUsage.totalTokens;
    
    // Reset time is first day of next month
    const now = new Date();
    const resetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    return {
      current,
      limit,
      resetTime,
      warningThreshold: limit * 0.8
    };
  }
  
  async checkQuotaExceeded(tokensToAdd: number = 0): Promise<{
    exceeded: boolean;
    quotaType: 'daily' | 'weekly' | 'monthly';
    current: number;
    limit: number;
    afterAddition: number;
  } | null> {
    const [daily, weekly, monthly] = await Promise.all([
      this.getDailyQuota(),
      this.getCurrentQuota(), // weekly
      this.getMonthlyQuota()
    ]);
    
    const checks = [
      { quota: daily, type: 'daily' as const },
      { quota: weekly, type: 'weekly' as const },
      { quota: monthly, type: 'monthly' as const }
    ];
    
    for (const { quota, type } of checks) {
      const afterAddition = quota.current + tokensToAdd;
      if (afterAddition > quota.limit) {
        return {
          exceeded: true,
          quotaType: type,
          current: quota.current,
          limit: quota.limit,
          afterAddition
        };
      }
    }
    
    return null;
  }
  
  async getQuotaWarnings(): Promise<Array<{
    type: 'daily' | 'weekly' | 'monthly';
    level: 'warning' | 'critical';
    percentage: number;
    message: string;
  }>> {
    const [daily, weekly, monthly] = await Promise.all([
      this.getDailyQuota(),
      this.getCurrentQuota(),
      this.getMonthlyQuota()
    ]);
    
    const warnings: Array<{
      type: 'daily' | 'weekly' | 'monthly';
      level: 'warning' | 'critical';
      percentage: number;
      message: string;
    }> = [];
    
    const quotas = [
      { quota: daily, type: 'daily' as const },
      { quota: weekly, type: 'weekly' as const },
      { quota: monthly, type: 'monthly' as const }
    ];
    
    for (const { quota, type } of quotas) {
      const percentage = (quota.current / quota.limit) * 100;
      
      if (percentage >= 95) {
        warnings.push({
          type,
          level: 'critical',
          percentage,
          message: `Critical: ${type} quota at ${percentage.toFixed(1)}% (${quota.current.toLocaleString()}/${quota.limit.toLocaleString()})`
        });
      } else if (percentage >= 80) {
        warnings.push({
          type,
          level: 'warning',
          percentage,
          message: `Warning: ${type} quota at ${percentage.toFixed(1)}% (${quota.current.toLocaleString()}/${quota.limit.toLocaleString()})`
        });
      }
    }
    
    return warnings;
  }
  
  async getTimeUntilReset(): Promise<{
    daily: { hours: number; minutes: number };
    weekly: { days: number; hours: number };
    monthly: { days: number; hours: number };
  }> {
    const now = new Date();
    
    // Daily reset (tomorrow at midnight)
    const dailyResetTime = new Date();
    dailyResetTime.setDate(dailyResetTime.getDate() + 1);
    dailyResetTime.setHours(0, 0, 0, 0);
    const dailyMs = dailyResetTime.getTime() - now.getTime();
    
    // Weekly reset (next Sunday at midnight)
    const weeklyResetTime = new Date();
    weeklyResetTime.setDate(now.getDate() + (7 - now.getDay()));
    weeklyResetTime.setHours(0, 0, 0, 0);
    const weeklyMs = weeklyResetTime.getTime() - now.getTime();
    
    // Monthly reset (first day of next month)
    const monthlyResetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthlyMs = monthlyResetTime.getTime() - now.getTime();
    
    return {
      daily: {
        hours: Math.floor(dailyMs / (1000 * 60 * 60)),
        minutes: Math.floor((dailyMs % (1000 * 60 * 60)) / (1000 * 60))
      },
      weekly: {
        days: Math.floor(weeklyMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((weeklyMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      },
      monthly: {
        days: Math.floor(monthlyMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((monthlyMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      }
    };
  }
  
  async getQuotaProjection(days: number = 7): Promise<{
    projectedUsage: number;
    projectedDate: Date;
    willExceed: boolean;
    quotaType: 'daily' | 'weekly' | 'monthly';
  } | null> {
    // Get usage from the last 7 days to calculate average
    const history = await this.tokenService.getUsageHistory(7);
    
    if (history.length === 0) {
      return null;
    }
    
    // Calculate daily average
    const totalTokens = history.reduce((sum, usage) => sum + usage.totalTokens, 0);
    const dailyAverage = totalTokens / 7;
    
    // Project usage for the specified number of days
    const projectedUsage = dailyAverage * days;
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + days);
    
    // Check against current quotas
    const [daily, weekly, monthly] = await Promise.all([
      this.getDailyQuota(),
      this.getCurrentQuota(),
      this.getMonthlyQuota()
    ]);
    
    // Determine which quota would be exceeded first
    const dailyProjected = daily.current + (dailyAverage * Math.min(days, 1));
    const weeklyProjected = weekly.current + (dailyAverage * Math.min(days, 7));
    const monthlyProjected = monthly.current + projectedUsage;
    
    if (dailyProjected > daily.limit) {
      return {
        projectedUsage: dailyProjected,
        projectedDate,
        willExceed: true,
        quotaType: 'daily'
      };
    }
    
    if (weeklyProjected > weekly.limit) {
      return {
        projectedUsage: weeklyProjected,
        projectedDate,
        willExceed: true,
        quotaType: 'weekly'
      };
    }
    
    if (monthlyProjected > monthly.limit) {
      return {
        projectedUsage: monthlyProjected,
        projectedDate,
        willExceed: true,
        quotaType: 'monthly'
      };
    }
    
    return {
      projectedUsage,
      projectedDate,
      willExceed: false,
      quotaType: 'monthly' // Default to monthly if no exceeding
    };
  }
  
  async updateQuotaLimits(limits: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  }): Promise<void> {
    // This would update configurable limits
    // For now, we'll store them in the config
    const config = await this.storage.getConfig();
    
    config.quotaLimits = {
      daily: limits.daily || QuotaService.DEFAULT_LIMITS.daily,
      weekly: limits.weekly || QuotaService.DEFAULT_LIMITS.weekly,
      monthly: limits.monthly || QuotaService.DEFAULT_LIMITS.monthly
    };
    
    await this.storage.saveConfig(config);
  }
  
  async getRemainingQuota(): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
  }> {
    const [daily, weekly, monthly] = await Promise.all([
      this.getDailyQuota(),
      this.getCurrentQuota(),
      this.getMonthlyQuota()
    ]);
    
    return {
      daily: Math.max(0, daily.limit - daily.current),
      weekly: Math.max(0, weekly.limit - weekly.current),
      monthly: Math.max(0, monthly.limit - monthly.current)
    };
  }
}