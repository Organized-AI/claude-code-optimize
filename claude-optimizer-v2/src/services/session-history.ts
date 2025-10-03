import { SessionJSONLParser, SessionData, DailyUsage, WeeklyQuota } from '../parsers/session-jsonl-parser.js';

/**
 * Session analytics for dashboard
 */
export interface SessionAnalytics {
  totalSessions: number;
  totalTokens: number;
  avgSessionTime: number; // minutes
  avgEfficiency: number; // percent
  totalCost: number;
}

/**
 * Service for managing session history and analytics
 */
export class SessionHistoryService {
  private parser: SessionJSONLParser;

  constructor() {
    this.parser = new SessionJSONLParser();
  }

  /**
   * Get all recent sessions
   */
  getAllSessions(days: number = 30): SessionData[] {
    return this.parser.getRecentSessions(days);
  }

  /**
   * Get session analytics
   */
  getAnalytics(days: number = 7): SessionAnalytics {
    const sessions = this.parser.getRecentSessions(days);

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalTokens: 0,
        avgSessionTime: 0,
        avgEfficiency: 0,
        totalCost: 0
      };
    }

    const totalTokens = sessions.reduce((sum, s) => sum + s.tokens.total, 0);
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalEfficiency = sessions.reduce((sum, s) => sum + s.metrics.efficiency, 0);
    const totalCost = sessions.reduce((sum, s) => sum + s.metrics.cost, 0);

    return {
      totalSessions: sessions.length,
      totalTokens,
      avgSessionTime: Math.round((totalDuration / sessions.length) / 60000), // Convert to minutes
      avgEfficiency: Math.round((totalEfficiency / sessions.length) * 10) / 10,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }

  /**
   * Get usage trends for charting
   */
  getUsageTrends(days: number = 7): DailyUsage[] {
    return this.parser.getUsageTrends(days);
  }

  /**
   * Get weekly quota status
   */
  getWeeklyQuota(): WeeklyQuota {
    return this.parser.getWeeklyUsage();
  }

  /**
   * Get project phase progress (calculated from recent activity)
   */
  getProjectPhases(): {
    architecture: number;
    implementation: number;
    testing: number;
  } {
    const sessions = this.parser.getRecentSessions(30);

    if (sessions.length === 0) {
      return { architecture: 0, implementation: 0, testing: 0 };
    }

    // Calculate progress based on session count and tokens
    // This is a simplified heuristic - could be enhanced with actual phase tracking
    const totalSessions = sessions.length;

    // Assume early sessions are architecture (first 30%)
    // Middle sessions are implementation (next 50%)
    // Recent sessions are testing (last 20%)
    const architectureProgress = Math.min(100, (totalSessions * 0.3 / 10) * 100);
    const implementationProgress = Math.min(100, (totalSessions * 0.5 / 15) * 100);
    const testingProgress = Math.min(100, (totalSessions * 0.2 / 5) * 100);

    return {
      architecture: Math.round(architectureProgress),
      implementation: Math.round(implementationProgress),
      testing: Math.round(testingProgress)
    };
  }

  /**
   * Format session for History tab display
   */
  formatSessionForHistory(session: SessionData): {
    id: string;
    time: string;
    duration: string;
    tokens: string;
    efficiency: string;
    cost: string;
    status: 'success' | 'warning' | 'error';
  } {
    const durationMinutes = Math.round(session.duration / 60000);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Determine status based on efficiency
    let status: 'success' | 'warning' | 'error' = 'success';
    if (session.metrics.efficiency < 50) {
      status = 'warning';
    } else if (session.metrics.efficiency < 30) {
      status = 'error';
    }

    return {
      id: session.sessionId.substring(0, 8),
      time: session.startTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      duration: durationStr,
      tokens: this.formatTokens(session.tokens.total),
      efficiency: `${session.metrics.efficiency}%`,
      cost: `$${session.metrics.cost.toFixed(2)}`,
      status
    };
  }

  /**
   * Format large token numbers with K/M suffixes
   */
  private formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    } else if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
  }
}
