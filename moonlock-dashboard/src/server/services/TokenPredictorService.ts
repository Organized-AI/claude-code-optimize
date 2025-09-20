import { Session, TokenUsage, TokenPrediction, OptimalSchedule } from '../../shared/types/index.js';
import { ExtendedSessionManager } from './ExtendedSessionManager.js';
import { WebSocketManager } from './WebSocketManager.js';

export class TokenPredictorService {
  private sessionManager: ExtendedSessionManager;
  private wsManager: WebSocketManager;
  
  // ML model parameters (simplified for implementation)
  private readonly LEARNING_RATE = 0.1;
  private readonly MOMENTUM = 0.9;
  private readonly WINDOW_SIZE = 10; // minutes
  
  constructor(sessionManager: ExtendedSessionManager, wsManager: WebSocketManager) {
    this.sessionManager = sessionManager;
    this.wsManager = wsManager;
  }
  
  async predictTokenUsage(sessionId: string): Promise<TokenPrediction> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    const tokenHistory = await this.sessionManager.getTokenHistory(sessionId);
    
    // Calculate burn rate patterns
    const burnRates = this.calculateBurnRates(tokenHistory);
    const avgBurnRate = burnRates.reduce((a, b) => a + b, 0) / burnRates.length || 0;
    const maxBurnRate = Math.max(...burnRates, 0);
    
    // Predict future usage based on patterns
    const remainingTime = session.tokenBudget ? 
      (session.tokenBudget - session.tokensUsed) / avgBurnRate : 
      Infinity;
    
    const predictedUsage = session.tokensUsed + (avgBurnRate * 60); // Next hour
    const confidence = this.calculateConfidence(burnRates);
    
    // Identify optimal break points based on usage patterns
    const optimalBreakPoints = this.identifyBreakPoints(tokenHistory, session);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(
      session.tokensUsed,
      session.tokenBudget || Infinity,
      avgBurnRate,
      maxBurnRate
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      session,
      avgBurnRate,
      riskLevel,
      optimalBreakPoints
    );
    
    const prediction: TokenPrediction = {
      sessionId,
      predictedUsage,
      confidence,
      timeToLimit: remainingTime * 60 * 1000, // Convert to milliseconds
      optimalBreakPoints,
      riskLevel,
      recommendations
    };
    
    // Broadcast prediction update
    this.wsManager.broadcastPredictionUpdate(sessionId, prediction);
    
    return prediction;
  }
  
  async generateOptimalSchedule(sessionId: string): Promise<OptimalSchedule> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    const tokenHistory = await this.sessionManager.getTokenHistory(sessionId);
    
    // Analyze productivity patterns
    const productivityWindows = this.analyzeProductivity(tokenHistory);
    
    // Calculate optimal break times based on cognitive load
    const suggestedBreaks = this.calculateOptimalBreaks(
      session.startTime,
      productivityWindows
    );
    
    // Calculate scores
    const productivityScore = this.calculateProductivityScore(tokenHistory);
    const burnoutRisk = this.calculateBurnoutRisk(session, tokenHistory);
    
    return {
      sessionId,
      suggestedBreaks,
      productivityScore,
      burnoutRisk
    };
  }
  
  private calculateBurnRates(history: TokenUsage[]): number[] {
    if (history.length < 2) return [0];
    
    const rates: number[] = [];
    const windowMs = this.WINDOW_SIZE * 60 * 1000;
    
    for (let i = 1; i < history.length; i++) {
      const timeDiff = history[i].timestamp - history[i - 1].timestamp;
      const tokenDiff = history[i].tokensUsed;
      
      if (timeDiff > 0) {
        // Tokens per minute
        const rate = (tokenDiff / timeDiff) * 60 * 1000;
        rates.push(rate);
      }
    }
    
    return rates;
  }
  
  private calculateConfidence(rates: number[]): number {
    if (rates.length < 3) return 0.5;
    
    // Calculate variance
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = higher confidence
    const cv = stdDev / mean; // Coefficient of variation
    return Math.max(0.3, Math.min(0.95, 1 - cv));
  }
  
  private identifyBreakPoints(history: TokenUsage[], session: Session): number[] {
    const breakPoints: number[] = [];
    const sessionDuration = Date.now() - session.startTime;
    
    // Suggest breaks every 45-60 minutes based on cognitive load
    const baseInterval = 45 * 60 * 1000; // 45 minutes
    const breaks = Math.floor(sessionDuration / baseInterval);
    
    for (let i = 1; i <= Math.min(breaks + 2, 5); i++) {
      breakPoints.push(session.startTime + (i * baseInterval));
    }
    
    return breakPoints;
  }
  
  private assessRiskLevel(
    used: number,
    budget: number,
    avgRate: number,
    maxRate: number
  ): 'low' | 'medium' | 'high' {
    const usagePercent = (used / budget) * 100;
    const rateRatio = maxRate / avgRate;
    
    if (usagePercent > 80 || rateRatio > 3) return 'high';
    if (usagePercent > 60 || rateRatio > 2) return 'medium';
    return 'low';
  }
  
  private generateRecommendations(
    session: Session,
    avgRate: number,
    riskLevel: 'low' | 'medium' | 'high',
    breakPoints: number[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'high') {
      recommendations.push('Consider taking a break to reduce token burn rate');
      recommendations.push('Review your approach - current usage is unsustainable');
    }
    
    if (avgRate > 1000) {
      recommendations.push('High token usage detected - consider optimizing prompts');
    }
    
    const nextBreak = breakPoints.find(bp => bp > Date.now());
    if (nextBreak && nextBreak - Date.now() < 10 * 60 * 1000) {
      recommendations.push(`Break recommended in ${Math.round((nextBreak - Date.now()) / 60000)} minutes`);
    }
    
    if (session.tokenBudget && session.tokensUsed > session.tokenBudget * 0.7) {
      recommendations.push('Approaching token budget limit - prioritize critical tasks');
    }
    
    return recommendations;
  }
  
  private analyzeProductivity(history: TokenUsage[]): Array<{ start: number; end: number; score: number }> {
    const windows: Array<{ start: number; end: number; score: number }> = [];
    const windowSize = 15 * 60 * 1000; // 15 minutes
    
    if (history.length < 2) return windows;
    
    for (let i = 0; i < history.length - 1; i++) {
      const start = history[i].timestamp;
      const end = Math.min(start + windowSize, history[i + 1]?.timestamp || start + windowSize);
      
      // Simple productivity score based on token efficiency
      const tokensInWindow = history
        .filter(h => h.timestamp >= start && h.timestamp < end)
        .reduce((sum, h) => sum + h.tokensUsed, 0);
      
      const duration = (end - start) / 60000; // minutes
      const score = Math.min(100, (tokensInWindow / duration) / 10);
      
      windows.push({ start, end, score });
    }
    
    return windows;
  }
  
  private calculateOptimalBreaks(
    sessionStart: number,
    productivityWindows: Array<{ start: number; end: number; score: number }>
  ): Array<{ time: number; duration: number }> {
    const breaks: Array<{ time: number; duration: number }> = [];
    
    // Suggest breaks after low productivity periods
    productivityWindows.forEach((window, index) => {
      if (window.score < 30 && index > 0) {
        breaks.push({
          time: window.end,
          duration: 10 * 60 * 1000 // 10 minute break
        });
      }
    });
    
    // Add regular breaks if none identified
    if (breaks.length === 0) {
      const now = Date.now();
      const sessionDuration = now - sessionStart;
      
      if (sessionDuration > 45 * 60 * 1000) {
        breaks.push({
          time: now + 5 * 60 * 1000, // 5 minutes from now
          duration: 10 * 60 * 1000
        });
      }
    }
    
    return breaks;
  }
  
  private calculateProductivityScore(history: TokenUsage[]): number {
    if (history.length < 2) return 50;
    
    // Calculate consistency of token usage
    const rates = this.calculateBurnRates(history);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    
    // Ideal rate is between 500-1500 tokens/minute
    const idealMin = 500;
    const idealMax = 1500;
    
    if (avgRate >= idealMin && avgRate <= idealMax) {
      return 80 + (20 * (1 - Math.abs(avgRate - 1000) / 500));
    } else if (avgRate < idealMin) {
      return Math.max(20, 80 * (avgRate / idealMin));
    } else {
      return Math.max(20, 80 * (idealMax / avgRate));
    }
  }
  
  private calculateBurnoutRisk(session: Session, history: TokenUsage[]): number {
    const sessionDuration = (Date.now() - session.startTime) / (60 * 60 * 1000); // hours
    const rates = this.calculateBurnRates(history);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    
    let risk = 0;
    
    // Long session duration increases burnout risk
    if (sessionDuration > 4) risk += 30;
    else if (sessionDuration > 2) risk += 15;
    
    // High token burn rate increases risk
    if (avgRate > 2000) risk += 30;
    else if (avgRate > 1500) risk += 15;
    
    // Variance in rates indicates inconsistency
    const variance = this.calculateVariance(rates);
    if (variance > 500) risk += 20;
    
    // No recent breaks
    const timeSinceStart = Date.now() - session.startTime;
    const expectedBreaks = Math.floor(timeSinceStart / (60 * 60 * 1000));
    if (expectedBreaks > 0 && session.status === 'active') {
      risk += expectedBreaks * 10;
    }
    
    return Math.min(100, risk);
  }
  
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
  }
}