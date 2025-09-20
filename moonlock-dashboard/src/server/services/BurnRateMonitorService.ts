import { BurnRateMetrics, BurnRateAlert, Session, TokenUsage } from '../../shared/types/index.js';
import { ExtendedSessionManager } from './ExtendedSessionManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { v4 as uuidv4 } from 'uuid';

export class BurnRateMonitorService {
  private sessionManager: ExtendedSessionManager;
  private wsManager: WebSocketManager;
  private metricsCache: Map<string, BurnRateMetrics> = new Map();
  private alertHistory: Map<string, BurnRateAlert[]> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Thresholds for alerts
  private readonly SPIKE_THRESHOLD = 2.0; // 2x average rate
  private readonly HIGH_RATE_THRESHOLD = 2000; // tokens per minute
  private readonly HIGH_RATE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CRITICAL_USAGE_THRESHOLD = 0.8; // 80% of budget
  
  constructor(sessionManager: ExtendedSessionManager, wsManager: WebSocketManager) {
    this.sessionManager = sessionManager;
    this.wsManager = wsManager;
  }
  
  async startMonitoring(sessionId: string): Promise<void> {
    // Clear any existing monitoring
    this.stopMonitoring(sessionId);
    
    // Initial calculation
    await this.calculateMetrics(sessionId);
    
    // Set up real-time monitoring
    const interval = setInterval(async () => {
      try {
        await this.calculateMetrics(sessionId);
        await this.checkForAlerts(sessionId);
      } catch (error) {
        console.error(`Error monitoring session ${sessionId}:`, error);
      }
    }, 10000); // Update every 10 seconds
    
    this.monitoringIntervals.set(sessionId, interval);
  }
  
  stopMonitoring(sessionId: string): void {
    const interval = this.monitoringIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(sessionId);
    }
  }
  
  async calculateMetrics(sessionId: string): Promise<BurnRateMetrics> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    const tokenHistory = await this.sessionManager.getTokenHistory(sessionId);
    
    // Calculate burn rates over different time windows
    const rates = this.calculateRatesOverWindows(tokenHistory);
    const currentRate = rates.current;
    const averageRate = rates.average;
    const peakRate = rates.peak;
    const volatility = this.calculateVolatility(rates.history);
    const trend = this.determineTrend(rates.history);
    
    // Get existing alerts
    const alerts = this.alertHistory.get(sessionId) || [];
    
    const metrics: BurnRateMetrics = {
      sessionId,
      currentRate,
      averageRate,
      peakRate,
      volatility,
      trend,
      alerts: alerts.filter(a => !a.acknowledged) // Only include unacknowledged alerts
    };
    
    // Cache metrics
    this.metricsCache.set(sessionId, metrics);
    
    // Broadcast update
    this.wsManager.broadcastBurnRateUpdate(sessionId, metrics);
    
    return metrics;
  }
  
  async getMetrics(sessionId: string): Promise<BurnRateMetrics | null> {
    // Return cached metrics if available
    const cached = this.metricsCache.get(sessionId);
    if (cached) return cached;
    
    // Otherwise calculate fresh
    try {
      return await this.calculateMetrics(sessionId);
    } catch {
      return null;
    }
  }
  
  async acknowledgeAlert(alertId: string): Promise<void> {
    // Find and acknowledge the alert
    for (const [sessionId, alerts] of this.alertHistory.entries()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        
        // Update metrics to reflect acknowledged alert
        const metrics = await this.calculateMetrics(sessionId);
        return;
      }
    }
  }
  
  private calculateRatesOverWindows(history: TokenUsage[]): {
    current: number;
    average: number;
    peak: number;
    history: number[];
  } {
    if (history.length < 2) {
      return { current: 0, average: 0, peak: 0, history: [] };
    }
    
    const rates: number[] = [];
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Calculate rates between consecutive entries
    for (let i = 1; i < history.length; i++) {
      const timeDiff = history[i].timestamp - history[i - 1].timestamp;
      if (timeDiff > 0) {
        const rate = (history[i].tokensUsed / timeDiff) * 60 * 1000; // tokens per minute
        rates.push(rate);
      }
    }
    
    // Current rate (last minute)
    const recentEntries = history.filter(h => h.timestamp > oneMinuteAgo);
    let currentRate = 0;
    if (recentEntries.length >= 2) {
      const totalTokens = recentEntries[recentEntries.length - 1].cumulativeTotal - 
                         recentEntries[0].cumulativeTotal;
      const timeDiff = recentEntries[recentEntries.length - 1].timestamp - 
                      recentEntries[0].timestamp;
      currentRate = (totalTokens / timeDiff) * 60 * 1000;
    }
    
    // Average rate (last 5 minutes)
    const recentRates = rates.slice(-30); // Last 30 measurements
    const averageRate = recentRates.length > 0 
      ? recentRates.reduce((a, b) => a + b, 0) / recentRates.length 
      : 0;
    
    // Peak rate
    const peakRate = Math.max(...rates, 0);
    
    return {
      current: currentRate,
      average: averageRate,
      peak: peakRate,
      history: rates
    };
  }
  
  private calculateVolatility(rates: number[]): number {
    if (rates.length < 2) return 0;
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation as volatility measure
    return mean > 0 ? (stdDev / mean) : 0;
  }
  
  private determineTrend(rates: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (rates.length < 3) return 'stable';
    
    // Compare recent average to overall average
    const recentCount = Math.min(5, Math.floor(rates.length / 3));
    const recentRates = rates.slice(-recentCount);
    const olderRates = rates.slice(0, -recentCount);
    
    const recentAvg = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    const olderAvg = olderRates.reduce((a, b) => a + b, 0) / olderRates.length;
    
    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (changePercent > 20) return 'increasing';
    if (changePercent < -20) return 'decreasing';
    return 'stable';
  }
  
  private async checkForAlerts(sessionId: string): Promise<void> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) return;
    
    const metrics = this.metricsCache.get(sessionId);
    if (!metrics) return;
    
    const existingAlerts = this.alertHistory.get(sessionId) || [];
    const newAlerts: BurnRateAlert[] = [];
    
    // Check for rate spike
    if (metrics.currentRate > metrics.averageRate * this.SPIKE_THRESHOLD) {
      const existingSpike = existingAlerts.find(
        a => a.type === 'spike' && Date.now() - a.timestamp < 5 * 60 * 1000
      );
      
      if (!existingSpike) {
        newAlerts.push({
          id: uuidv4(),
          sessionId,
          type: 'spike',
          severity: 'warning',
          message: `Token usage spike detected: ${Math.round(metrics.currentRate)} tokens/min (${Math.round(metrics.currentRate / metrics.averageRate)}x average)`,
          timestamp: Date.now(),
          acknowledged: false,
          metrics: {
            rate: metrics.currentRate,
            threshold: metrics.averageRate * this.SPIKE_THRESHOLD
          }
        });
      }
    }
    
    // Check for sustained high rate
    if (metrics.currentRate > this.HIGH_RATE_THRESHOLD) {
      const highRateAlerts = existingAlerts.filter(
        a => a.type === 'sustained_high' && Date.now() - a.timestamp < this.HIGH_RATE_DURATION
      );
      
      if (highRateAlerts.length === 0) {
        const firstHighRate = existingAlerts.find(
          a => a.type === 'spike' && 
               a.metrics.rate > this.HIGH_RATE_THRESHOLD &&
               Date.now() - a.timestamp < this.HIGH_RATE_DURATION
        );
        
        if (firstHighRate && Date.now() - firstHighRate.timestamp >= this.HIGH_RATE_DURATION) {
          newAlerts.push({
            id: uuidv4(),
            sessionId,
            type: 'sustained_high',
            severity: 'critical',
            message: `Sustained high token usage: ${Math.round(metrics.currentRate)} tokens/min for over 5 minutes`,
            timestamp: Date.now(),
            acknowledged: false,
            metrics: {
              rate: metrics.currentRate,
              threshold: this.HIGH_RATE_THRESHOLD,
              duration: Date.now() - firstHighRate.timestamp
            }
          });
        }
      }
    }
    
    // Check for approaching limit
    if (session.tokenBudget) {
      const usagePercent = session.tokensUsed / session.tokenBudget;
      
      if (usagePercent >= this.CRITICAL_USAGE_THRESHOLD) {
        const existingLimit = existingAlerts.find(
          a => a.type === 'approaching_limit' && Date.now() - a.timestamp < 10 * 60 * 1000
        );
        
        if (!existingLimit) {
          const remainingTokens = session.tokenBudget - session.tokensUsed;
          const minutesRemaining = remainingTokens / metrics.currentRate;
          
          newAlerts.push({
            id: uuidv4(),
            sessionId,
            type: 'approaching_limit',
            severity: 'critical',
            message: `${Math.round(usagePercent * 100)}% of token budget used. ~${Math.round(minutesRemaining)} minutes remaining at current rate`,
            timestamp: Date.now(),
            acknowledged: false,
            metrics: {
              rate: metrics.currentRate,
              threshold: session.tokenBudget * this.CRITICAL_USAGE_THRESHOLD
            }
          });
        }
      }
    }
    
    // Check for anomalies (high volatility)
    if (metrics.volatility > 2.0) {
      const existingAnomaly = existingAlerts.find(
        a => a.type === 'anomaly' && Date.now() - a.timestamp < 15 * 60 * 1000
      );
      
      if (!existingAnomaly) {
        newAlerts.push({
          id: uuidv4(),
          sessionId,
          type: 'anomaly',
          severity: 'info',
          message: `Irregular token usage pattern detected (volatility: ${metrics.volatility.toFixed(2)})`,
          timestamp: Date.now(),
          acknowledged: false,
          metrics: {
            rate: metrics.currentRate,
            threshold: 2.0
          }
        });
      }
    }
    
    // Add new alerts
    if (newAlerts.length > 0) {
      existingAlerts.push(...newAlerts);
      this.alertHistory.set(sessionId, existingAlerts);
      
      // Update metrics with new alerts
      metrics.alerts = existingAlerts.filter(a => !a.acknowledged);
      
      // Broadcast critical alerts immediately
      for (const alert of newAlerts) {
        if (alert.severity === 'critical') {
          this.wsManager.sendToSession(sessionId, {
            type: 'alert',
            sessionId,
            level: 'error',
            message: alert.message
          });
        }
      }
    }
  }
  
  async getHistoricalMetrics(
    sessionId: string, 
    timeRange: { start: number; end: number }
  ): Promise<Array<{ timestamp: number; rate: number }>> {
    const tokenHistory = await this.sessionManager.getTokenHistory(sessionId);
    
    // Filter to time range
    const relevantHistory = tokenHistory.filter(
      h => h.timestamp >= timeRange.start && h.timestamp <= timeRange.end
    );
    
    // Calculate rates at each point
    const metrics: Array<{ timestamp: number; rate: number }> = [];
    
    for (let i = 1; i < relevantHistory.length; i++) {
      const timeDiff = relevantHistory[i].timestamp - relevantHistory[i - 1].timestamp;
      if (timeDiff > 0) {
        const rate = (relevantHistory[i].tokensUsed / timeDiff) * 60 * 1000;
        metrics.push({
          timestamp: relevantHistory[i].timestamp,
          rate
        });
      }
    }
    
    return metrics;
  }
}