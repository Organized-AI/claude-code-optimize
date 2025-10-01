/**
 * Quota Tracker - Rolling 5-hour window token tracking
 * Monitors Claude Code's rate limits and manages scheduling
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TokenQuota {
  plan: 'free' | 'pro' | 'team';
  limit: number;              // 50k, 200k, or 500k
  windowHours: number;        // Always 5

  currentWindow: {
    startTime: string;        // ISO timestamp of first token
    resetTime: string;        // startTime + 5 hours
    tokensUsed: number;
    remaining: number;
  };

  sessions: {
    id: string;
    tokensUsed: number;
    startTime: string;
    endTime?: string;
  }[];

  scheduledSessions: {
    id: string;
    scheduledFor: string;     // ISO timestamp when quota will be available
    estimatedTokens: number;
    reason: 'quota_exceeded' | 'low_quota' | 'user_scheduled';
  }[];
}

export interface QuotaStatus {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  resetTime: Date;
  timeUntilReset: string;
  canStartSession: boolean;
  recommendation: string;
}

export class QuotaTracker {
  private quotaPath: string;

  constructor(dataDir?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.quotaPath = path.join(dataDir || path.join(home, '.claude'), 'quota-tracker.json');
  }

  /**
   * Load current quota state or initialize
   */
  loadQuota(): TokenQuota {
    if (!fs.existsSync(this.quotaPath)) {
      return this.initializeQuota();
    }

    const quota = JSON.parse(fs.readFileSync(this.quotaPath, 'utf-8'));

    // Check if window has reset
    const now = new Date();
    const resetTime = new Date(quota.currentWindow.resetTime);

    if (now >= resetTime) {
      return this.resetWindow(quota);
    }

    return quota;
  }

  /**
   * Save quota state
   */
  private saveQuota(quota: TokenQuota): void {
    const dir = path.dirname(this.quotaPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.quotaPath, JSON.stringify(quota, null, 2));
  }

  /**
   * Track token usage from a session
   */
  trackTokenUsage(sessionId: string, tokensUsed: number): void {
    const quota = this.loadQuota();

    // First token in window? Start the clock
    if (quota.currentWindow.tokensUsed === 0) {
      const now = new Date();
      const resetTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);

      quota.currentWindow.startTime = now.toISOString();
      quota.currentWindow.resetTime = resetTime.toISOString();
    }

    // Update usage
    quota.currentWindow.tokensUsed += tokensUsed;
    quota.currentWindow.remaining = quota.limit - quota.currentWindow.tokensUsed;

    // Update session record
    const sessionIndex = quota.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex >= 0) {
      quota.sessions[sessionIndex].tokensUsed += tokensUsed;
    } else {
      quota.sessions.push({
        id: sessionId,
        tokensUsed,
        startTime: new Date().toISOString()
      });
    }

    this.saveQuota(quota);

    // Check for warnings
    this.checkQuotaWarnings(quota);
  }

  /**
   * Check if a session can start now, or schedule for later
   */
  canStartSession(estimatedTokens: number): {
    canStart: boolean;
    remaining: number;
    resetTime: Date;
    scheduleFor?: Date;
    message: string;
  } {
    const quota = this.loadQuota();
    const canStart = estimatedTokens <= quota.currentWindow.remaining;

    if (canStart) {
      return {
        canStart: true,
        remaining: quota.currentWindow.remaining,
        resetTime: new Date(quota.currentWindow.resetTime),
        message: `✅ Quota available (${estimatedTokens.toLocaleString()} tokens needed, ${quota.currentWindow.remaining.toLocaleString()} available)`
      };
    }

    // Can't start now - when will quota reset?
    const resetTime = new Date(quota.currentWindow.resetTime);
    const scheduleFor = resetTime;

    return {
      canStart: false,
      remaining: quota.currentWindow.remaining,
      resetTime,
      scheduleFor,
      message: `⏰ Insufficient quota. Session needs ${estimatedTokens.toLocaleString()} tokens, only ${quota.currentWindow.remaining.toLocaleString()} available. Scheduling for ${resetTime.toLocaleTimeString()}`
    };
  }

  /**
   * Schedule a session for when quota is available
   */
  scheduleSession(
    sessionId: string,
    estimatedTokens: number,
    reason: 'quota_exceeded' | 'low_quota' | 'user_scheduled' = 'quota_exceeded'
  ): Date {
    const quota = this.loadQuota();
    const resetTime = new Date(quota.currentWindow.resetTime);

    // Add 1 minute buffer after reset
    const scheduleFor = new Date(resetTime.getTime() + 60 * 1000);

    quota.scheduledSessions.push({
      id: sessionId,
      scheduledFor: scheduleFor.toISOString(),
      estimatedTokens,
      reason
    });

    this.saveQuota(quota);

    return scheduleFor;
  }

  /**
   * Get detailed quota status
   */
  getStatus(): QuotaStatus {
    const quota = this.loadQuota();
    const percent = Math.round((quota.currentWindow.tokensUsed / quota.limit) * 100);

    const now = new Date();
    const reset = new Date(quota.currentWindow.resetTime);
    const msUntilReset = Math.max(0, reset.getTime() - now.getTime());
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minsUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    return {
      plan: quota.plan,
      used: quota.currentWindow.tokensUsed,
      limit: quota.limit,
      remaining: quota.currentWindow.remaining,
      percent,
      resetTime: reset,
      timeUntilReset: `${hoursUntilReset}h ${minsUntilReset}m`,
      canStartSession: quota.currentWindow.remaining > 30000, // Conservative threshold
      recommendation: this.getRecommendation(quota)
    };
  }

  /**
   * Get action recommendation based on quota state
   * CONSERVATIVE thresholds for hyperawareness
   */
  private getRecommendation(quota: TokenQuota): string {
    const percent = (quota.currentWindow.tokensUsed / quota.limit) * 100;
    const remaining = quota.currentWindow.remaining;

    if (percent > 95) {
      return `🚨 CRITICAL: Only ${remaining.toLocaleString()} tokens left (${(100 - percent).toFixed(1)}% remaining). Save work immediately and prepare to stop. All future sessions auto-scheduled.`;
    }

    if (percent > 90) {
      return `🔴 DANGER: ${remaining.toLocaleString()} tokens remaining (${(100 - percent).toFixed(1)}% left). Complete current task quickly. New sessions will be auto-scheduled. Est. ${Math.floor(remaining / 1500)} tool calls remaining.`;
    }

    if (percent > 75) {
      return `⚠️ HIGH USAGE: ${remaining.toLocaleString()} tokens available (${(100 - percent).toFixed(1)}% left). Small tasks only (<30k tokens, ~20 tool calls). Consider scheduling larger work.`;
    }

    if (percent > 50) {
      return `💡 MODERATE: ${remaining.toLocaleString()} tokens remaining (${(100 - percent).toFixed(1)}% left). Medium tasks OK (30-60k tokens, 20-40 tool calls). Monitor burn rate.`;
    }

    if (percent > 25) {
      return `✅ GOOD: ${remaining.toLocaleString()} tokens available (${(100 - percent).toFixed(1)}% left). Large tasks OK (60-80k tokens, 40-55 tool calls). Stay aware of usage patterns.`;
    }

    if (percent > 10) {
      return `🟢 EXCELLENT: ${remaining.toLocaleString()} tokens available (${(100 - percent).toFixed(1)}% left). Any task size OK. Early monitoring active - you'll be notified at 25% usage.`;
    }

    return `🎯 FRESH START: ${remaining.toLocaleString()} tokens available (full quota). Plan your session strategically. Notifications at 10%, 25%, 50%, 75%, 90%, 95% usage.`;
  }

  /**
   * Check quota and send warnings at thresholds
   * HYPERAWARE: 10%, 25%, 50%, 75%, 90%, 95%
   */
  private checkQuotaWarnings(quota: TokenQuota): void {
    const percent = (quota.currentWindow.tokensUsed / quota.limit) * 100;
    const remaining = quota.currentWindow.remaining;
    const burnRate = this.calculateBurnRate(quota);

    // Use hysteresis to avoid duplicate warnings
    const lastWarning = (quota as any).lastWarningPercent || 0;

    // 10% - Early awareness
    if (percent >= 10 && lastWarning < 10) {
      this.sendNotification(
        '📊 10% Quota Used',
        `${remaining.toLocaleString()} tokens left. Burn rate: ${burnRate} tokens/min. Tracking started.`,
        'normal'
      );
      (quota as any).lastWarningPercent = 10;
    }

    // 25% - Quarter usage checkpoint
    if (percent >= 25 && lastWarning < 25) {
      this.sendNotification(
        '📈 25% Quota Used',
        `${remaining.toLocaleString()} tokens left (75% available). Current pace: ${burnRate} tokens/min. Stay aware.`,
        'normal'
      );
      (quota as any).lastWarningPercent = 25;
    }

    // 50% - Halfway mark
    if (percent >= 50 && lastWarning < 50) {
      this.sendNotification(
        '⚡ 50% Quota Used',
        `${remaining.toLocaleString()} tokens remaining. Monitor your usage. Burn rate: ${burnRate} tokens/min.`,
        'normal'
      );
      (quota as any).lastWarningPercent = 50;
    }

    // 75% - Caution zone
    if (percent >= 75 && lastWarning < 75) {
      this.sendNotification(
        '⚠️ 75% Quota Used',
        `${remaining.toLocaleString()} tokens left (25% remaining). Small tasks only. Consider scheduling larger work. Burn: ${burnRate}/min.`,
        'high'
      );
      (quota as any).lastWarningPercent = 75;
    }

    // 90% - Danger zone
    if (percent >= 90 && lastWarning < 90) {
      this.sendNotification(
        '🚨 90% Quota Used - DANGER',
        `Only ${remaining.toLocaleString()} tokens left! Wrap up current task. Rate limit approaching. ~${Math.floor(remaining / 1500)} tool calls left.`,
        'critical'
      );
      (quota as any).lastWarningPercent = 90;
    }

    // 95% - Critical
    if (percent >= 95 && lastWarning < 95) {
      this.sendNotification(
        '🔴 95% Quota CRITICAL',
        `${remaining.toLocaleString()} tokens left! Save work immediately. Session may be rate limited. ~${Math.floor(remaining / 1500)} tool calls.`,
        'critical'
      );
      (quota as any).lastWarningPercent = 95;
    }

    this.saveQuota(quota);
  }

  /**
   * Calculate current burn rate (tokens per minute)
   */
  private calculateBurnRate(quota: TokenQuota): string {
    if (quota.sessions.length === 0 || quota.currentWindow.tokensUsed === 0) {
      return 'calculating...';
    }

    const windowStart = new Date(quota.currentWindow.startTime);
    const now = new Date();
    const minutesElapsed = (now.getTime() - windowStart.getTime()) / (1000 * 60);

    if (minutesElapsed < 1) {
      return 'starting...';
    }

    const tokensPerMin = Math.round(quota.currentWindow.tokensUsed / minutesElapsed);
    return `${tokensPerMin.toLocaleString()}`;
  }

  /**
   * Send notification (platform-specific)
   */
  private sendNotification(title: string, message: string, urgency: 'normal' | 'high' | 'critical'): void {
    console.log(`${title}: ${message}`);

    // macOS notification
    if (process.platform === 'darwin') {
      const sound = urgency === 'critical' ? 'Basso' : 'Ping';
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "${message}" with title "${title}" sound name "${sound}"'`);
    }
  }

  /**
   * Reset quota window
   */
  private resetWindow(quota: TokenQuota): TokenQuota {
    console.log('✅ Quota window reset!');

    quota.currentWindow = {
      startTime: new Date().toISOString(),
      resetTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      tokensUsed: 0,
      remaining: quota.limit
    };

    // Archive old sessions
    quota.sessions = [];

    // Clear scheduled sessions that are now in the past
    const now = new Date();
    quota.scheduledSessions = quota.scheduledSessions.filter(s =>
      new Date(s.scheduledFor) > now
    );

    this.saveQuota(quota);

    return quota;
  }

  /**
   * Initialize new quota tracker
   */
  private initializeQuota(): TokenQuota {
    const now = new Date();
    const resetTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);

    const quota: TokenQuota = {
      plan: 'pro', // Default assumption - will auto-detect
      limit: 200000,
      windowHours: 5,
      currentWindow: {
        startTime: now.toISOString(),
        resetTime: resetTime.toISOString(),
        tokensUsed: 0,
        remaining: 200000
      },
      sessions: [],
      scheduledSessions: []
    };

    this.saveQuota(quota);
    return quota;
  }

  /**
   * Detect plan from usage patterns (optional enhancement)
   */
  async detectPlan(): Promise<'free' | 'pro' | 'team'> {
    const quota = this.loadQuota();

    // If we've observed > 200k usage without issues, must be team
    const maxObserved = Math.max(...quota.sessions.map(s => s.tokensUsed), 0);

    if (maxObserved > 200000) return 'team';
    if (maxObserved > 50000) return 'pro';

    return quota.plan; // Use configured plan
  }
}
