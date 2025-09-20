import { 
  AnalyticsEvent, 
  AnalyticsQuery, 
  AnalyticsResult, 
  AnalyticsReport,
  AnalyticsSearchQuery,
  AnalyticsTrend,
  AnalyticsInsight,
  ReportType,
  QuotaPeriod,
  ReportSummary,
  ReportSection,
  ChartData,
  TableData,
  AnalyticsEventType
} from '../../contracts/AgentInterfaces.js';
import { DatabaseManager } from './DatabaseManager.js';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Data analysis and reporting service
 * Handles analytics event collection, trend analysis, and comprehensive reporting
 */
export class AnalyticsService {
  private dbManager: DatabaseManager;
  private db: any;
  private dataPath: string;

  constructor(dbManager: DatabaseManager, dataPath: string) {
    this.dbManager = dbManager;
    this.db = (dbManager as any).db;
    this.dataPath = dataPath;

    this.initializeAnalyticsSchema();
  }

  private initializeAnalyticsSchema(): void {
    this.db.exec(`
      -- Analytics events storage
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        session_id TEXT,
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL, -- JSON object
        tags TEXT NOT NULL, -- JSON array
        user_id TEXT,
        processed BOOLEAN DEFAULT FALSE,
        created_at INTEGER NOT NULL
      );

      -- Aggregated analytics data for faster queries
      CREATE TABLE IF NOT EXISTS analytics_aggregations (
        id TEXT PRIMARY KEY,
        metric_name TEXT NOT NULL,
        period TEXT NOT NULL, -- 'hour', 'day', 'week', 'month'
        period_start INTEGER NOT NULL,
        period_end INTEGER NOT NULL,
        value REAL NOT NULL,
        count INTEGER NOT NULL,
        metadata TEXT, -- JSON object with additional context
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Analytics insights and patterns
      CREATE TABLE IF NOT EXISTS analytics_insights (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('pattern', 'anomaly', 'correlation', 'prediction')),
        message TEXT NOT NULL,
        confidence REAL NOT NULL,
        data TEXT NOT NULL, -- JSON object
        actionable BOOLEAN DEFAULT FALSE,
        session_id TEXT,
        metric_name TEXT,
        timestamp INTEGER NOT NULL,
        expires_at INTEGER -- Optional expiration for temporary insights
      );

      -- Performance tracking for analytics queries
      CREATE TABLE IF NOT EXISTS analytics_performance (
        id TEXT PRIMARY KEY,
        query_type TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        result_count INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        query_hash TEXT NOT NULL
      );

      -- Indexes for performance optimization
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type, timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events (session_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events (timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_tags ON analytics_events (tags);
      CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_metric ON analytics_aggregations (metric_name, period_start);
      CREATE INDEX IF NOT EXISTS idx_analytics_insights_type ON analytics_insights (type, timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_insights_actionable ON analytics_insights (actionable, timestamp);

      -- Full-text search for events
      CREATE VIRTUAL TABLE IF NOT EXISTS analytics_search USING fts5(
        event_id, event_type, content, tags,
        content='analytics_events',
        prefix='2 3 4'
      );

      -- Triggers to maintain search index
      CREATE TRIGGER IF NOT EXISTS analytics_search_insert AFTER INSERT ON analytics_events BEGIN
        INSERT INTO analytics_search(event_id, event_type, content, tags) 
        VALUES (new.id, new.event_type, new.data, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS analytics_search_update AFTER UPDATE ON analytics_events BEGIN
        DELETE FROM analytics_search WHERE event_id = old.id;
        INSERT INTO analytics_search(event_id, event_type, content, tags) 
        VALUES (new.id, new.event_type, new.data, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS analytics_search_delete AFTER DELETE ON analytics_events BEGIN
        DELETE FROM analytics_search WHERE event_id = old.id;
      END;
    `);
  }

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO analytics_events (
        id, event_type, session_id, timestamp, data, tags, user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.type,
      event.sessionId || null,
      event.timestamp,
      JSON.stringify(event.data),
      JSON.stringify(event.tags),
      event.userId || null,
      Date.now()
    );

    // Process event for real-time insights
    await this.processEventForInsights(event);

    // Update aggregations
    await this.updateAggregations(event);
  }

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    // Build SQL query
    let sqlQuery = 'SELECT * FROM analytics_events WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      sqlQuery += ` AND event_type IN (${query.eventTypes.map(() => '?').join(',')})`;
      params.push(...query.eventTypes);
    }

    if (query.sessionIds && query.sessionIds.length > 0) {
      sqlQuery += ` AND session_id IN (${query.sessionIds.map(() => '?').join(',')})`;
      params.push(...query.sessionIds);
    }

    sqlQuery += ' AND timestamp BETWEEN ? AND ?';
    params.push(query.timeRange.start, query.timeRange.end);

    // Apply additional filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        sqlQuery += ` AND json_extract(data, '$.${key}') = ?`;
        params.push(value);
      });
    }

    // Apply ordering
    sqlQuery += ' ORDER BY timestamp DESC';

    // Apply pagination
    if (query.limit) {
      sqlQuery += ' LIMIT ?';
      params.push(query.limit);
      
      if (query.offset) {
        sqlQuery += ' OFFSET ?';
        params.push(query.offset);
      }
    }

    // Execute query
    const stmt = this.db.prepare(sqlQuery);
    const rows = stmt.all(...params) as any[];

    // Convert to AnalyticsEvent objects
    const events: AnalyticsEvent[] = rows.map(row => ({
      id: row.id,
      type: row.event_type,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      data: JSON.parse(row.data || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      userId: row.user_id
    }));

    // Calculate aggregations
    const aggregations = await this.calculateAggregations(query);

    // Get trends
    const trends = await this.calculateTrends(query);

    // Get insights
    const insights = await this.getRelevantInsights(query);

    // Log performance
    const executionTime = Date.now() - startTime;
    await this.logQueryPerformance('getAnalytics', executionTime, events.length, query);

    return {
      events,
      aggregations,
      trends,
      insights,
      totalCount: events.length
    };
  }

  async generateReport(type: ReportType, period: QuotaPeriod): Promise<AnalyticsReport> {
    const reportId = uuidv4();
    const timeRange = this.getTimeRangeForPeriod(period);
    
    // Generate report based on type
    let reportData;
    switch (type) {
      case 'usage':
        reportData = await this.generateUsageReport(timeRange);
        break;
      case 'efficiency':
        reportData = await this.generateEfficiencyReport(timeRange);
        break;
      case 'trends':
        reportData = await this.generateTrendsReport(timeRange);
        break;
      case 'insights':
        reportData = await this.generateInsightsReport(timeRange);
        break;
      case 'performance':
        reportData = await this.generatePerformanceReport(timeRange);
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    const report: AnalyticsReport = {
      id: reportId,
      type,
      period,
      generatedAt: Date.now(),
      data: reportData
    };

    // Cache report for future use
    await this.cacheReport(report);

    return report;
  }

  async searchEvents(query: AnalyticsSearchQuery): Promise<AnalyticsEvent[]> {
    let sqlQuery: string;
    const params: any[] = [];

    if (query.text) {
      // Use full-text search
      sqlQuery = `
        SELECT DISTINCT ae.* FROM analytics_events ae
        JOIN analytics_search asearch ON ae.id = asearch.event_id
        WHERE analytics_search MATCH ?
      `;
      params.push(query.text);
    } else {
      sqlQuery = 'SELECT * FROM analytics_events WHERE 1=1';
    }

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      sqlQuery += ` AND event_type IN (${query.eventTypes.map(() => '?').join(',')})`;
      params.push(...query.eventTypes);
    }

    if (query.sessionIds && query.sessionIds.length > 0) {
      sqlQuery += ` AND session_id IN (${query.sessionIds.map(() => '?').join(',')})`;
      params.push(...query.sessionIds);
    }

    sqlQuery += ' AND timestamp BETWEEN ? AND ?';
    params.push(query.timeRange.start, query.timeRange.end);

    sqlQuery += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sqlQuery += ' LIMIT ?';
      params.push(query.limit);
      
      if (query.offset) {
        sqlQuery += ' OFFSET ?';
        params.push(query.offset);
      }
    }

    const stmt = this.db.prepare(sqlQuery);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.event_type,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      data: JSON.parse(row.data || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      userId: row.user_id
    }));
  }

  private async processEventForInsights(event: AnalyticsEvent): Promise<void> {
    const insights: AnalyticsInsight[] = [];

    // Pattern detection
    if (event.type === 'session_start') {
      const recentSessions = await this.getRecentSessionEvents(event.sessionId!, 5);
      if (recentSessions.length >= 4) {
        const avgDuration = this.calculateAverageSessionDuration(recentSessions);
        if (avgDuration > 120) { // More than 2 hours
          insights.push({
            type: 'pattern',
            message: 'User consistently runs long sessions. Consider session break reminders.',
            confidence: 0.8,
            data: { avgDuration, sessionCount: recentSessions.length },
            actionable: true
          });
        }
      }
    }

    // Anomaly detection
    if (event.type === 'quota_warning') {
      const recentWarnings = await this.getRecentQuotaWarnings(24); // Last 24 hours
      if (recentWarnings.length > 5) {
        insights.push({
          type: 'anomaly',
          message: 'Unusual number of quota warnings. Check for system issues or usage spikes.',
          confidence: 0.9,
          data: { warningCount: recentWarnings.length, timeframe: '24h' },
          actionable: true
        });
      }
    }

    // Performance insights
    if (event.type === 'performance_metric' && event.data.responseTime) {
      const responseTime = event.data.responseTime as number;
      if (responseTime > 5000) { // More than 5 seconds
        insights.push({
          type: 'performance',
          message: `Slow response detected: ${responseTime}ms. Consider optimization.`,
          confidence: 1.0,
          data: { responseTime, threshold: 5000 },
          actionable: true
        });
      }
    }

    // Save insights
    for (const insight of insights) {
      await this.saveInsight(insight, event.sessionId);
    }
  }

  private async saveInsight(insight: AnalyticsInsight, sessionId?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO analytics_insights (
        id, type, message, confidence, data, actionable, session_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      insight.type,
      insight.message,
      insight.confidence,
      JSON.stringify(insight.data),
      insight.actionable,
      sessionId || null,
      Date.now()
    );
  }

  private async updateAggregations(event: AnalyticsEvent): Promise<void> {
    const periods = ['hour', 'day', 'week'];
    
    for (const period of periods) {
      const timeRange = this.getTimeRangeForPeriod(period as QuotaPeriod);
      const aggregationId = `${event.type}_${period}_${timeRange.start}`;

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO analytics_aggregations (
          id, metric_name, period, period_start, period_end, value, count, updated_at
        ) VALUES (?, ?, ?, ?, ?, 
          COALESCE((SELECT value FROM analytics_aggregations WHERE id = ?), 0) + 1,
          COALESCE((SELECT count FROM analytics_aggregations WHERE id = ?), 0) + 1,
          ?
        )
      `);

      stmt.run(
        aggregationId,
        event.type,
        period,
        timeRange.start,
        timeRange.end,
        aggregationId,
        aggregationId,
        Date.now()
      );
    }
  }

  private async calculateAggregations(query: AnalyticsQuery): Promise<Record<string, number>> {
    const aggregations: Record<string, number> = {};

    if (query.metrics && query.metrics.length > 0) {
      for (const metric of query.metrics) {
        const stmt = this.db.prepare(`
          SELECT COUNT(*) as count, AVG(json_extract(data, '$.${metric}')) as avg_value
          FROM analytics_events 
          WHERE timestamp BETWEEN ? AND ?
          ${query.eventTypes ? `AND event_type IN (${query.eventTypes.map(() => '?').join(',')})` : ''}
        `);

        const params = [query.timeRange.start, query.timeRange.end];
        if (query.eventTypes) {
          params.push(...query.eventTypes);
        }

        const result = stmt.get(...params) as any;
        aggregations[`${metric}_count`] = result.count || 0;
        aggregations[`${metric}_average`] = result.avg_value || 0;
      }
    }

    // Default aggregations
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM analytics_events 
      WHERE timestamp BETWEEN ? AND ?
    `);
    const totalResult = totalStmt.get(query.timeRange.start, query.timeRange.end) as any;
    aggregations.total_events = totalResult.total || 0;

    return aggregations;
  }

  private async calculateTrends(query: AnalyticsQuery): Promise<AnalyticsTrend[]> {
    const trends: AnalyticsTrend[] = [];

    // Calculate event count trend
    const intervals = this.getTimeIntervals(query.timeRange, 12);
    const eventCounts: { timestamp: number; value: number }[] = [];

    for (const interval of intervals) {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM analytics_events 
        WHERE timestamp BETWEEN ? AND ?
      `);
      
      const result = stmt.get(interval.start, interval.end) as any;
      eventCounts.push({
        timestamp: interval.start,
        value: result.count || 0
      });
    }

    trends.push({
      metric: 'event_count',
      values: eventCounts,
      trend: this.determineTrend(eventCounts),
      correlation: this.calculateCorrelation(eventCounts)
    });

    return trends;
  }

  private async getRelevantInsights(query: AnalyticsQuery): Promise<AnalyticsInsight[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics_insights 
      WHERE timestamp BETWEEN ? AND ?
      ${query.sessionIds ? `AND session_id IN (${query.sessionIds.map(() => '?').join(',')})` : ''}
      ORDER BY confidence DESC, timestamp DESC
      LIMIT 10
    `);

    const params = [query.timeRange.start, query.timeRange.end];
    if (query.sessionIds) {
      params.push(...query.sessionIds);
    }

    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      type: row.type,
      message: row.message,
      confidence: row.confidence,
      data: JSON.parse(row.data || '{}'),
      actionable: row.actionable
    }));
  }

  // Report generation methods
  private async generateUsageReport(timeRange: {start: number, end: number}): Promise<any> {
    const summary = await this.calculateUsageSummary(timeRange);
    const sections = await this.generateUsageSections(timeRange);
    const charts = await this.generateUsageCharts(timeRange);

    return {
      summary,
      sections,
      charts,
      recommendations: await this.generateUsageRecommendations(summary)
    };
  }

  private async generateEfficiencyReport(timeRange: {start: number, end: number}): Promise<any> {
    const summary = await this.calculateEfficiencySummary(timeRange);
    const sections = await this.generateEfficiencySections(timeRange);
    const charts = await this.generateEfficiencyCharts(timeRange);

    return {
      summary,
      sections,
      charts,
      recommendations: await this.generateEfficiencyRecommendations(summary)
    };
  }

  private async generateTrendsReport(timeRange: {start: number, end: number}): Promise<any> {
    const trends = await this.calculateAllTrends(timeRange);
    const sections = await this.generateTrendsSections(trends);
    const charts = await this.generateTrendsCharts(trends);

    return {
      summary: { keyTrends: trends.slice(0, 5) },
      sections,
      charts,
      recommendations: await this.generateTrendsRecommendations(trends)
    };
  }

  private async generateInsightsReport(timeRange: {start: number, end: number}): Promise<any> {
    const insights = await this.getAllInsights(timeRange);
    const sections = await this.generateInsightsSections(insights);
    const charts = await this.generateInsightsCharts(insights);

    return {
      summary: { totalInsights: insights.length, actionableInsights: insights.filter(i => i.actionable).length },
      sections,
      charts,
      recommendations: insights.filter(i => i.actionable).map(i => i.message)
    };
  }

  private async generatePerformanceReport(timeRange: {start: number, end: number}): Promise<any> {
    const performanceData = await this.getPerformanceData(timeRange);
    const sections = await this.generatePerformanceSections(performanceData);
    const charts = await this.generatePerformanceCharts(performanceData);

    return {
      summary: { avgResponseTime: performanceData.avgResponseTime, totalQueries: performanceData.totalQueries },
      sections,
      charts,
      recommendations: await this.generatePerformanceRecommendations(performanceData)
    };
  }

  // Utility methods
  private async logQueryPerformance(queryType: string, executionTime: number, resultCount: number, query: any): Promise<void> {
    const queryHash = this.hashQuery(query);
    
    const stmt = this.db.prepare(`
      INSERT INTO analytics_performance (
        id, query_type, execution_time_ms, result_count, timestamp, query_hash
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      queryType,
      executionTime,
      resultCount,
      Date.now(),
      queryHash
    );
  }

  private hashQuery(query: any): string {
    return require('crypto').createHash('md5').update(JSON.stringify(query)).digest('hex');
  }

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

  private getTimeIntervals(timeRange: {start: number, end: number}, count: number): Array<{start: number, end: number}> {
    const intervals: Array<{start: number, end: number}> = [];
    const intervalSize = (timeRange.end - timeRange.start) / count;

    for (let i = 0; i < count; i++) {
      const start = timeRange.start + (i * intervalSize);
      const end = start + intervalSize;
      intervals.push({ start, end });
    }

    return intervals;
  }

  private determineTrend(values: Array<{timestamp: number, value: number}>): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v.value, 0) / secondHalf.length;

    const changePercentage = ((secondAvg - firstAvg) / Math.max(firstAvg, 1)) * 100;

    if (changePercentage > 5) return 'up';
    if (changePercentage < -5) return 'down';
    return 'stable';
  }

  private calculateCorrelation(values: Array<{timestamp: number, value: number}>): number {
    // Simple correlation calculation (simplified for demo)
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = values.reduce((sum, v, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v.value, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v.value), 0);
    const sumX2 = values.reduce((sum, v, i) => sum + (i * i), 0);
    const sumY2 = values.reduce((sum, v) => sum + (v.value * v.value), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Placeholder methods for report generation (would be implemented based on specific requirements)
  private async calculateUsageSummary(timeRange: any): Promise<ReportSummary> {
    return {
      totalSessions: 0,
      totalTokens: 0,
      averageEfficiency: 0,
      topPerformingModel: 'sonnet',
      mostComplexProject: '',
      keyInsights: []
    };
  }

  private async generateUsageSections(timeRange: any): Promise<ReportSection[]> { return []; }
  private async generateUsageCharts(timeRange: any): Promise<ChartData[]> { return []; }
  private async generateUsageRecommendations(summary: any): Promise<string[]> { return []; }
  private async calculateEfficiencySummary(timeRange: any): Promise<ReportSummary> { 
    return {
      totalSessions: 0,
      totalTokens: 0,
      averageEfficiency: 0,
      topPerformingModel: 'sonnet',
      mostComplexProject: '',
      keyInsights: []
    };
  }
  private async generateEfficiencySections(timeRange: any): Promise<ReportSection[]> { return []; }
  private async generateEfficiencyCharts(timeRange: any): Promise<ChartData[]> { return []; }
  private async generateEfficiencyRecommendations(summary: any): Promise<string[]> { return []; }
  private async calculateAllTrends(timeRange: any): Promise<any[]> { return []; }
  private async generateTrendsSections(trends: any): Promise<ReportSection[]> { return []; }
  private async generateTrendsCharts(trends: any): Promise<ChartData[]> { return []; }
  private async generateTrendsRecommendations(trends: any): Promise<string[]> { return []; }
  private async getAllInsights(timeRange: any): Promise<AnalyticsInsight[]> { return []; }
  private async generateInsightsSections(insights: any): Promise<ReportSection[]> { return []; }
  private async generateInsightsCharts(insights: any): Promise<ChartData[]> { return []; }
  private async getPerformanceData(timeRange: any): Promise<any> { return { avgResponseTime: 0, totalQueries: 0 }; }
  private async generatePerformanceSections(data: any): Promise<ReportSection[]> { return []; }
  private async generatePerformanceCharts(data: any): Promise<ChartData[]> { return []; }
  private async generatePerformanceRecommendations(data: any): Promise<string[]> { return []; }
  private async cacheReport(report: AnalyticsReport): Promise<void> { }
  private async getRecentSessionEvents(sessionId: string, limit: number): Promise<any[]> { return []; }
  private calculateAverageSessionDuration(sessions: any[]): number { return 0; }
  private async getRecentQuotaWarnings(hours: number): Promise<any[]> { return []; }

  async cleanup(olderThan: number): Promise<void> {
    // Clean up old analytics events
    const stmt = this.db.prepare('DELETE FROM analytics_events WHERE created_at < ?');
    stmt.run(olderThan);

    // Clean up old aggregations
    const aggStmt = this.db.prepare('DELETE FROM analytics_aggregations WHERE created_at < ?');
    aggStmt.run(olderThan);

    // Clean up expired insights
    const insightStmt = this.db.prepare('DELETE FROM analytics_insights WHERE expires_at IS NOT NULL AND expires_at < ?');
    insightStmt.run(Date.now());

    // Clean up old performance logs
    const performanceStmt = this.db.prepare('DELETE FROM analytics_performance WHERE timestamp < ?');
    performanceStmt.run(olderThan);
  }
}