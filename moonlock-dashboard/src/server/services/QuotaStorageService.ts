import { 
  DetailedQuotaUsage, 
  QuotaHistoryEntry, 
  QuotaAnalytics,
  QuotaProjection,
  QuotaRecommendation,
  QuotaAlert,
  QuotaTrend,
  QuotaBenchmark,
  ModelQuotaUsage,
  UsageTrend,
  QuotaEfficiency,
  QuotaPeriod
} from '../../contracts/AgentInterfaces.js';
import { DatabaseManager } from './DatabaseManager.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Quota tracking and analytics service
 * Handles comprehensive quota monitoring, usage analytics, and recommendations
 */
export class QuotaStorageService {
  private dbManager: DatabaseManager;
  private db: any;
  private dataPath: string;

  // Quota limits (in hours per week)
  private readonly QUOTA_LIMITS = {
    sonnet: 480, // 480 hours/week for Sonnet 4
    opus: 40     // 40 hours/week for Opus 4
  };

  constructor(dbManager: DatabaseManager, dataPath: string) {
    this.dbManager = dbManager;
    this.db = (dbManager as any).db;
    this.dataPath = dataPath;

    this.initializeQuotaSchema();
  }

  private initializeQuotaSchema(): void {
    this.db.exec(`
      -- Quota usage tracking
      CREATE TABLE IF NOT EXISTS quota_usage (
        id TEXT PRIMARY KEY,
        period TEXT NOT NULL, -- 'hour', 'day', 'week', 'month', etc.
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        sonnet_used REAL NOT NULL DEFAULT 0,
        opus_used REAL NOT NULL DEFAULT 0,
        sonnet_sessions INTEGER NOT NULL DEFAULT 0,
        opus_sessions INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        efficiency_score REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Detailed usage breakdown by session
      CREATE TABLE IF NOT EXISTS quota_session_usage (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        model TEXT NOT NULL CHECK(model IN ('sonnet', 'opus')),
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_hours REAL NOT NULL,
        tokens_used INTEGER NOT NULL,
        tokens_per_hour REAL NOT NULL,
        complexity_score REAL,
        efficiency_score REAL,
        timestamp INTEGER NOT NULL
      );

      -- Quota alerts and warnings
      CREATE TABLE IF NOT EXISTS quota_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')),
        message TEXT NOT NULL,
        threshold_value REAL NOT NULL,
        current_value REAL NOT NULL,
        model TEXT CHECK(model IN ('sonnet', 'opus')),
        resolved BOOLEAN DEFAULT FALSE,
        created_at INTEGER NOT NULL,
        resolved_at INTEGER
      );

      -- Usage trends and patterns
      CREATE TABLE IF NOT EXISTS quota_trends (
        id TEXT PRIMARY KEY,
        metric TEXT NOT NULL,
        period TEXT NOT NULL,
        model TEXT CHECK(model IN ('sonnet', 'opus')),
        value REAL NOT NULL,
        change_percentage REAL NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('increasing', 'decreasing', 'stable')),
        significance TEXT NOT NULL CHECK(significance IN ('low', 'medium', 'high')),
        timestamp INTEGER NOT NULL
      );

      -- Performance benchmarks
      CREATE TABLE IF NOT EXISTS quota_benchmarks (
        id TEXT PRIMARY KEY,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        percentile REAL NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('excellent', 'good', 'average', 'poor')),
        period TEXT NOT NULL,
        model TEXT CHECK(model IN ('sonnet', 'opus')),
        timestamp INTEGER NOT NULL
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_quota_usage_period ON quota_usage (period, start_time);
      CREATE INDEX IF NOT EXISTS idx_quota_session_model ON quota_session_usage (model, timestamp);
      CREATE INDEX IF NOT EXISTS idx_quota_alerts_severity ON quota_alerts (severity, resolved);
      CREATE INDEX IF NOT EXISTS idx_quota_trends_metric ON quota_trends (metric, period);
      CREATE INDEX IF NOT EXISTS idx_quota_benchmarks_metric ON quota_benchmarks (metric, period);
    `);
  }

  async saveQuotaUsage(usage: DetailedQuotaUsage): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quota_usage (
        id, period, start_time, end_time, sonnet_used, opus_used,
        sonnet_sessions, opus_sessions, total_tokens, efficiency_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `${usage.period}_${usage.startTime}`;
    const totalTokens = (usage.sonnet.sessions * usage.sonnet.averageTokensPerHour * usage.sonnet.used) +
                       (usage.opus.sessions * usage.opus.averageTokensPerHour * usage.opus.used);

    stmt.run(
      id,
      usage.period,
      usage.startTime,
      usage.endTime,
      usage.sonnet.used,
      usage.opus.used,
      usage.sonnet.sessions,
      usage.opus.sessions,
      totalTokens,
      usage.efficiency.completionRate,
      Date.now(),
      usage.updatedAt
    );

    // Save detailed session usage data
    await this.saveSessionUsageData(usage);

    // Update trends
    await this.updateQuotaTrends(usage);

    // Check for alerts
    await this.checkQuotaAlerts(usage);
  }

  async getQuotaUsage(period: QuotaPeriod = 'week'): Promise<DetailedQuotaUsage> {
    const timeRange = this.getTimeRangeForPeriod(period);
    
    // Get current usage data
    const stmt = this.db.prepare(`
      SELECT * FROM quota_usage 
      WHERE period = ? AND start_time >= ? AND end_time <= ?
      ORDER BY start_time DESC 
      LIMIT 1
    `);

    let row = stmt.get(period, timeRange.start, timeRange.end) as any;

    if (!row) {
      // Calculate usage from session data if no aggregated data exists
      return await this.calculateCurrentUsage(period, timeRange);
    }

    // Get detailed model usage
    const sonnetUsage = await this.getModelUsage('sonnet', timeRange);
    const opusUsage = await this.getModelUsage('opus', timeRange);

    // Calculate efficiency metrics
    const efficiency = await this.calculateEfficiency(timeRange);

    return {
      period,
      startTime: timeRange.start,
      endTime: timeRange.end,
      sonnet: sonnetUsage,
      opus: opusUsage,
      totalSessions: sonnetUsage.sessions + opusUsage.sessions,
      averageSessionDuration: await this.getAverageSessionDuration(timeRange),
      peakUsageHours: await this.getPeakUsageHours(timeRange),
      efficiency,
      updatedAt: row.updated_at
    };
  }

  async getQuotaHistory(period: QuotaPeriod): Promise<QuotaHistoryEntry[]> {
    const intervals = this.getHistoryIntervals(period);
    const history: QuotaHistoryEntry[] = [];

    for (const interval of intervals) {
      const usage = await this.getQuotaUsage(period);
      const efficiency = await this.calculateEfficiency(interval);

      history.push({
        timestamp: interval.start,
        sonnetUsage: usage.sonnet.used,
        opusUsage: usage.opus.used,
        sessionCount: usage.totalSessions,
        efficiency: efficiency.completionRate
      });
    }

    return history.reverse(); // Most recent first
  }

  async getQuotaAnalytics(): Promise<QuotaAnalytics> {
    const currentPeriod = await this.getQuotaUsage('week');
    const projectedUsage = await this.calculateProjections();
    const recommendations = await this.generateRecommendations();
    const alerts = await this.getCurrentAlerts();
    const trends = await this.getQuotaTrends();
    const benchmarks = await this.getQuotaBenchmarks();

    return {
      currentPeriod,
      projectedUsage,
      recommendations,
      alerts,
      trends,
      benchmarks
    };
  }

  private async saveSessionUsageData(usage: DetailedQuotaUsage): Promise<void> {
    // This would typically be called when individual sessions complete
    // For now, we'll store aggregated data
    const stmt = this.db.prepare(`
      INSERT INTO quota_session_usage (
        id, session_id, model, start_time, end_time, duration_hours,
        tokens_used, tokens_per_hour, efficiency_score, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Create representative entries for the period
    const timestamp = Date.now();
    
    if (usage.sonnet.sessions > 0) {
      stmt.run(
        `sonnet_${usage.startTime}`,
        `aggregated_${usage.startTime}`,
        'sonnet',
        usage.startTime,
        usage.endTime,
        usage.sonnet.used,
        usage.sonnet.sessions * usage.sonnet.averageTokensPerHour * usage.sonnet.used,
        usage.sonnet.averageTokensPerHour,
        usage.efficiency.completionRate,
        timestamp
      );
    }

    if (usage.opus.sessions > 0) {
      stmt.run(
        `opus_${usage.startTime}`,
        `aggregated_${usage.startTime}`,
        'opus',
        usage.startTime,
        usage.endTime,
        usage.opus.used,
        usage.opus.sessions * usage.opus.averageTokensPerHour * usage.opus.used,
        usage.opus.averageTokensPerHour,
        usage.efficiency.completionRate,
        timestamp
      );
    }
  }

  private async calculateCurrentUsage(period: QuotaPeriod, timeRange: {start: number, end: number}): Promise<DetailedQuotaUsage> {
    // Calculate from session data
    const sessionStmt = this.db.prepare(`
      SELECT 
        model,
        COUNT(*) as session_count,
        SUM(duration_hours) as total_hours,
        SUM(tokens_used) as total_tokens,
        AVG(tokens_per_hour) as avg_tokens_per_hour,
        MAX(tokens_per_hour) as peak_tokens_per_hour
      FROM quota_session_usage 
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY model
    `);

    const results = sessionStmt.all(timeRange.start, timeRange.end) as any[];
    
    const sonnetData = results.find(r => r.model === 'sonnet') || {
      session_count: 0, total_hours: 0, total_tokens: 0, 
      avg_tokens_per_hour: 0, peak_tokens_per_hour: 0
    };
    
    const opusData = results.find(r => r.model === 'opus') || {
      session_count: 0, total_hours: 0, total_tokens: 0, 
      avg_tokens_per_hour: 0, peak_tokens_per_hour: 0
    };

    const efficiency = await this.calculateEfficiency(timeRange);
    
    return {
      period,
      startTime: timeRange.start,
      endTime: timeRange.end,
      sonnet: {
        used: sonnetData.total_hours,
        limit: this.QUOTA_LIMITS.sonnet,
        percentage: (sonnetData.total_hours / this.QUOTA_LIMITS.sonnet) * 100,
        sessions: sonnetData.session_count,
        averageTokensPerHour: sonnetData.avg_tokens_per_hour,
        peakUsage: sonnetData.peak_tokens_per_hour,
        trends: [] // Would be populated from historical data
      },
      opus: {
        used: opusData.total_hours,
        limit: this.QUOTA_LIMITS.opus,
        percentage: (opusData.total_hours / this.QUOTA_LIMITS.opus) * 100,
        sessions: opusData.session_count,
        averageTokensPerHour: opusData.avg_tokens_per_hour,
        peakUsage: opusData.peak_tokens_per_hour,
        trends: [] // Would be populated from historical data
      },
      totalSessions: sonnetData.session_count + opusData.session_count,
      averageSessionDuration: await this.getAverageSessionDuration(timeRange),
      peakUsageHours: await this.getPeakUsageHours(timeRange),
      efficiency,
      updatedAt: Date.now()
    };
  }

  private async getModelUsage(model: 'sonnet' | 'opus', timeRange: {start: number, end: number}): Promise<ModelQuotaUsage> {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as sessions,
        SUM(duration_hours) as total_hours,
        AVG(tokens_per_hour) as avg_tokens_per_hour,
        MAX(tokens_per_hour) as peak_usage
      FROM quota_session_usage 
      WHERE model = ? AND timestamp BETWEEN ? AND ?
    `);

    const result = stmt.get(model, timeRange.start, timeRange.end) as any;
    const totalHours = result?.total_hours || 0;
    const limit = this.QUOTA_LIMITS[model];

    return {
      used: totalHours,
      limit,
      percentage: (totalHours / limit) * 100,
      sessions: result?.sessions || 0,
      averageTokensPerHour: result?.avg_tokens_per_hour || 0,
      peakUsage: result?.peak_usage || 0,
      trends: await this.getUsageTrends(model, timeRange)
    };
  }

  private async getUsageTrends(model: 'sonnet' | 'opus', timeRange: {start: number, end: number}): Promise<UsageTrend[]> {
    const stmt = this.db.prepare(`
      SELECT timestamp, value, change_percentage as change
      FROM quota_trends 
      WHERE model = ? AND metric = 'usage' AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `);

    const results = stmt.all(model, timeRange.start, timeRange.end) as any[];
    
    return results.map(r => ({
      timestamp: r.timestamp,
      value: r.value,
      change: r.change
    }));
  }

  private async calculateEfficiency(timeRange: {start: number, end: number}): Promise<QuotaEfficiency> {
    const stmt = this.db.prepare(`
      SELECT 
        AVG(tokens_per_hour) as avg_tokens_per_hour,
        COUNT(DISTINCT session_id) as total_sessions,
        AVG(efficiency_score) as completion_rate,
        AVG(complexity_score) as avg_complexity
      FROM quota_session_usage 
      WHERE timestamp BETWEEN ? AND ?
    `);

    const result = stmt.get(timeRange.start, timeRange.end) as any;
    
    // Calculate sessions per hour
    const timeSpanHours = (timeRange.end - timeRange.start) / (1000 * 60 * 60);
    const sessionsPerHour = (result?.total_sessions || 0) / Math.max(timeSpanHours, 1);

    return {
      tokensPerHour: result?.avg_tokens_per_hour || 0,
      sessionsPerHour,
      completionRate: result?.completion_rate || 0,
      averageComplexityHandled: result?.avg_complexity || 0,
      wastedQuota: 0 // Would need to calculate based on unused allocated time
    };
  }

  private async getAverageSessionDuration(timeRange: {start: number, end: number}): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT AVG(duration_hours) as avg_duration
      FROM quota_session_usage 
      WHERE timestamp BETWEEN ? AND ?
    `);

    const result = stmt.get(timeRange.start, timeRange.end) as any;
    return (result?.avg_duration || 0) * 60; // Convert to minutes
  }

  private async getPeakUsageHours(timeRange: {start: number, end: number}): Promise<number[]> {
    const stmt = this.db.prepare(`
      SELECT 
        strftime('%H', datetime(timestamp / 1000, 'unixepoch')) as hour,
        SUM(duration_hours) as total_usage
      FROM quota_session_usage 
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY hour 
      ORDER BY total_usage DESC 
      LIMIT 5
    `);

    const results = stmt.all(timeRange.start, timeRange.end) as any[];
    return results.map(r => parseInt(r.hour, 10));
  }

  private async updateQuotaTrends(usage: DetailedQuotaUsage): Promise<void> {
    const trends = [
      { metric: 'sonnet_usage', value: usage.sonnet.used, model: 'sonnet' },
      { metric: 'opus_usage', value: usage.opus.used, model: 'opus' },
      { metric: 'total_sessions', value: usage.totalSessions, model: null },
      { metric: 'efficiency', value: usage.efficiency.completionRate, model: null }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO quota_trends (
        id, metric, period, model, value, change_percentage, 
        direction, significance, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const trend of trends) {
      const changePercentage = await this.calculateChangePercentage(trend.metric, trend.value, usage.period);
      const direction = changePercentage > 2 ? 'increasing' : 
                       changePercentage < -2 ? 'decreasing' : 'stable';
      const significance = Math.abs(changePercentage) > 10 ? 'high' :
                          Math.abs(changePercentage) > 5 ? 'medium' : 'low';

      stmt.run(
        `${trend.metric}_${usage.period}_${usage.startTime}`,
        trend.metric,
        usage.period,
        trend.model,
        trend.value,
        changePercentage,
        direction,
        significance,
        usage.updatedAt
      );
    }
  }

  private async calculateChangePercentage(metric: string, currentValue: number, period: QuotaPeriod): Promise<number> {
    // Get previous period's value
    const previousPeriod = this.getPreviousPeriod(period);
    const stmt = this.db.prepare(`
      SELECT value FROM quota_trends 
      WHERE metric = ? AND period = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    const result = stmt.get(metric, period) as any;
    const previousValue = result?.value || 0;

    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  private async checkQuotaAlerts(usage: DetailedQuotaUsage): Promise<void> {
    const alerts: Array<{type: string, severity: string, message: string, threshold: number, current: number, model?: string}> = [];

    // Check Sonnet quota
    if (usage.sonnet.percentage > 90) {
      alerts.push({
        type: 'approaching_limit',
        severity: 'critical',
        message: `Sonnet quota at ${usage.sonnet.percentage.toFixed(1)}% (${usage.sonnet.used}/${usage.sonnet.limit} hours)`,
        threshold: 90,
        current: usage.sonnet.percentage,
        model: 'sonnet'
      });
    } else if (usage.sonnet.percentage > 75) {
      alerts.push({
        type: 'approaching_limit',
        severity: 'warning',
        message: `Sonnet quota at ${usage.sonnet.percentage.toFixed(1)}% (${usage.sonnet.used}/${usage.sonnet.limit} hours)`,
        threshold: 75,
        current: usage.sonnet.percentage,
        model: 'sonnet'
      });
    }

    // Check Opus quota
    if (usage.opus.percentage > 90) {
      alerts.push({
        type: 'approaching_limit',
        severity: 'critical',
        message: `Opus quota at ${usage.opus.percentage.toFixed(1)}% (${usage.opus.used}/${usage.opus.limit} hours)`,
        threshold: 90,
        current: usage.opus.percentage,
        model: 'opus'
      });
    } else if (usage.opus.percentage > 75) {
      alerts.push({
        type: 'approaching_limit',
        severity: 'warning',
        message: `Opus quota at ${usage.opus.percentage.toFixed(1)}% (${usage.opus.used}/${usage.opus.limit} hours)`,
        threshold: 75,
        current: usage.opus.percentage,
        model: 'opus'
      });
    }

    // Check efficiency
    if (usage.efficiency.completionRate < 60) {
      alerts.push({
        type: 'efficiency_drop',
        severity: usage.efficiency.completionRate < 40 ? 'error' : 'warning',
        message: `Session completion rate dropped to ${usage.efficiency.completionRate.toFixed(1)}%`,
        threshold: 60,
        current: usage.efficiency.completionRate
      });
    }

    // Save alerts to database
    const stmt = this.db.prepare(`
      INSERT INTO quota_alerts (
        id, type, severity, message, threshold_value, current_value, 
        model, resolved, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const alert of alerts) {
      stmt.run(
        `${alert.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alert.type,
        alert.severity,
        alert.message,
        alert.threshold,
        alert.current,
        alert.model || null,
        false,
        Date.now()
      );
    }
  }

  private async calculateProjections(): Promise<QuotaProjection[]> {
    // Calculate projections for both models based on current usage trends
    const projections: QuotaProjection[] = [];
    
    for (const model of ['sonnet', 'opus'] as const) {
      const currentUsage = await this.getModelUsage(model, this.getTimeRangeForPeriod('week'));
      
      // Simple linear projection based on current rate
      const timeRemaining = this.getTimeRemainingInPeriod('week');
      const currentRate = currentUsage.used / (168 - timeRemaining); // hours per hour
      const projectedUsage = currentUsage.used + (currentRate * timeRemaining);
      
      projections.push({
        model,
        projectedUsage,
        confidence: Math.max(0, Math.min(100, 100 - (timeRemaining / 168) * 50)), // Lower confidence with more time remaining
        timeToLimit: projectedUsage >= currentUsage.limit ? 0 : 
                    (currentUsage.limit - currentUsage.used) / Math.max(currentRate, 0.001) * 60, // minutes
        basedOnSessions: currentUsage.sessions
      });
    }

    return projections;
  }

  private async generateRecommendations(): Promise<QuotaRecommendation[]> {
    const recommendations: QuotaRecommendation[] = [];
    const currentUsage = await this.getQuotaUsage('week');
    
    // Model allocation recommendations
    if (currentUsage.sonnet.percentage > 80 && currentUsage.opus.percentage < 50) {
      recommendations.push({
        type: 'model_allocation',
        message: 'Consider using Opus for complex tasks to balance quota usage',
        impact: 25,
        priority: 'high',
        actionRequired: true
      });
    }

    // Timing recommendations
    const peakHours = currentUsage.peakUsageHours;
    if (peakHours.length > 0) {
      recommendations.push({
        type: 'timing',
        message: `Avoid peak usage hours ${peakHours.join(', ')} to improve performance`,
        impact: 15,
        priority: 'medium',
        actionRequired: false
      });
    }

    // Efficiency recommendations
    if (currentUsage.efficiency.completionRate < 70) {
      recommendations.push({
        type: 'optimization',
        message: 'Session completion rate is low. Consider shorter, focused sessions',
        impact: 30,
        priority: 'high',
        actionRequired: true
      });
    }

    return recommendations;
  }

  private async getCurrentAlerts(): Promise<QuotaAlert[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM quota_alerts 
      WHERE resolved = FALSE 
      ORDER BY created_at DESC
    `);

    const results = stmt.all() as any[];
    
    return results.map(r => ({
      type: r.type,
      severity: r.severity,
      message: r.message,
      threshold: r.threshold_value,
      currentValue: r.current_value,
      timestamp: r.created_at
    }));
  }

  private async getQuotaTrends(): Promise<QuotaTrend[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM quota_trends 
      ORDER BY timestamp DESC 
      LIMIT 20
    `);

    const results = stmt.all() as any[];
    
    return results.map(r => ({
      metric: r.metric,
      direction: r.direction,
      magnitude: Math.abs(r.change_percentage),
      period: r.period,
      significance: r.significance
    }));
  }

  private async getQuotaBenchmarks(): Promise<QuotaBenchmark[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM quota_benchmarks 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);

    const results = stmt.all() as any[];
    
    return results.map(r => ({
      metric: r.metric,
      value: r.value,
      percentile: r.percentile,
      category: r.category
    }));
  }

  // Utility methods
  private getTimeRangeForPeriod(period: QuotaPeriod): {start: number, end: number} {
    const now = Date.now();
    const periods = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    const periodMs = periods[period];
    return {
      start: now - periodMs,
      end: now
    };
  }

  private getHistoryIntervals(period: QuotaPeriod): Array<{start: number, end: number}> {
    const now = Date.now();
    const intervals: Array<{start: number, end: number}> = [];
    
    // Generate 12 intervals for the requested period
    const timeRange = this.getTimeRangeForPeriod(period);
    const intervalSize = (timeRange.end - timeRange.start) / 12;
    
    for (let i = 0; i < 12; i++) {
      const start = timeRange.start + (i * intervalSize);
      const end = start + intervalSize;
      intervals.push({ start, end });
    }

    return intervals;
  }

  private getPreviousPeriod(period: QuotaPeriod): QuotaPeriod {
    // For now, return the same period. In a real implementation,
    // this would return the previous period's identifier
    return period;
  }

  private getTimeRemainingInPeriod(period: QuotaPeriod): number {
    // Calculate hours remaining in current period
    const now = new Date();
    
    if (period === 'week') {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      
      return (endOfWeek.getTime() - now.getTime()) / (1000 * 60 * 60);
    }

    // Default fallback
    return 24;
  }

  async cleanup(olderThan: number): Promise<void> {
    // Clean up old quota data
    const tables = ['quota_usage', 'quota_session_usage', 'quota_alerts', 'quota_trends', 'quota_benchmarks'];
    
    for (const table of tables) {
      const stmt = this.db.prepare(`DELETE FROM ${table} WHERE created_at < ?`);
      stmt.run(olderThan);
    }
  }
}