import fs from 'fs';
import path from 'path';

/**
 * Comprehensive session data extracted from JSONL
 */
export interface SessionData {
  sessionId: string;
  projectPath: string;
  projectName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds

  tokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
    total: number;
  };

  prompts: number; // count of user messages
  model: string; // claude-sonnet-4-5, etc.

  metrics: {
    efficiency: number; // cache hit ratio %
    tokensPerMinute: number;
    cost: number; // calculated cost
  };
}

/**
 * Weekly quota tracking
 */
export interface WeeklyQuota {
  sonnet: {
    used: number; // hours
    limit: number; // 432 hours
    remaining: number;
  };
  opus: {
    used: number; // hours
    limit: number; // 36 hours
    remaining: number;
  };
  resetDate: Date;
  sessionsRemaining: number;
}

/**
 * Daily usage for trending
 */
export interface DailyUsage {
  date: string; // YYYY-MM-DD
  tokens: number;
  sessions: number;
  formattedDate: string;
}

/**
 * Parser for Claude Code session JSONL files
 */
export class SessionJSONLParser {
  private sessionDir: string;

  constructor() {
    const home = process.env.HOME || '';

    // Find the session directory for current project
    const projectsDir = path.join(home, '.claude/projects');
    const dirs = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];

    // Look for matching project directory
    for (const dir of dirs) {
      if (dir.includes('Claude-Code-Optimizer')) {
        this.sessionDir = path.join(projectsDir, dir);
        return;
      }
    }

    // Fallback to first available project
    if (dirs.length > 0) {
      this.sessionDir = path.join(projectsDir, dirs[0]);
    } else {
      this.sessionDir = projectsDir;
    }
  }

  /**
   * Parse a single session JSONL file
   */
  parseSession(sessionId: string): SessionData {
    const filePath = path.join(this.sessionDir, `${sessionId}.jsonl`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreation = 0;
    let cacheRead = 0;
    let prompts = 0;
    let model = '';
    let startTime: Date | null = null;
    let endTime: Date | null = null;
    let projectPath = '';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Extract timestamps
        if (entry.timestamp) {
          const ts = new Date(entry.timestamp);
          if (!startTime || ts < startTime) startTime = ts;
          if (!endTime || ts > endTime) endTime = ts;
        }

        // Extract project path from first entry
        if (!projectPath && entry.cwd) {
          projectPath = entry.cwd;
        }

        // Count user prompts
        if (entry.type === 'user') {
          prompts++;
        }

        // Extract token usage from assistant messages
        if (entry.type === 'assistant' && entry.message?.usage) {
          const usage = entry.message.usage;
          inputTokens += usage.input_tokens || 0;
          outputTokens += usage.output_tokens || 0;
          cacheCreation += usage.cache_creation_input_tokens || 0;
          cacheRead += usage.cache_read_input_tokens || 0;

          // Get model from message
          if (entry.message.model) {
            model = entry.message.model;
          }
        }
      } catch (e) {
        // Skip malformed lines
        continue;
      }
    }

    const totalTokens = inputTokens + outputTokens + cacheCreation + cacheRead;
    const duration = (endTime && startTime) ? endTime.getTime() - startTime.getTime() : 0;

    // Calculate metrics
    const efficiency = totalTokens > 0 ? (cacheRead / totalTokens) * 100 : 0;
    const tokensPerMinute = duration > 0 ? (totalTokens / (duration / 60000)) : 0;
    const cost = this.calculateCost({
      input: inputTokens,
      output: outputTokens,
      cacheWrite: cacheCreation,
      cacheRead: cacheRead
    }, model);

    // Extract project name from path
    const projectName = projectPath ? path.basename(projectPath) : 'Unknown Project';

    return {
      sessionId,
      projectPath: projectPath || process.cwd(),
      projectName,
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      duration,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        cacheCreation,
        cacheRead,
        total: totalTokens
      },
      prompts,
      model: model || 'claude-sonnet-4-5',
      metrics: {
        efficiency: Math.round(efficiency * 10) / 10,
        tokensPerMinute: Math.round(tokensPerMinute * 10) / 10,
        cost
      }
    };
  }

  /**
   * Get current session (most recent)
   */
  getCurrentSession(): SessionData | null {
    if (!fs.existsSync(this.sessionDir)) {
      return null;
    }

    const files = fs.readdirSync(this.sessionDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(this.sessionDir, f)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime());

    if (files.length === 0) {
      return null;
    }

    const sessionId = files[0].name.replace('.jsonl', '');
    return this.parseSession(sessionId);
  }

  /**
   * Get sessions from last N days
   */
  getRecentSessions(days: number = 7): SessionData[] {
    if (!fs.existsSync(this.sessionDir)) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const files = fs.readdirSync(this.sessionDir)
      .filter(f => f.endsWith('.jsonl'))
      .filter(f => {
        const stat = fs.statSync(path.join(this.sessionDir, f));
        return stat.mtime >= cutoffDate;
      });

    return files.map(f => {
      try {
        return this.parseSession(f.replace('.jsonl', ''));
      } catch (e) {
        return null;
      }
    }).filter((s): s is SessionData => s !== null);
  }

  /**
   * Get weekly quota usage
   */
  getWeeklyUsage(): WeeklyQuota {
    const sessions = this.getRecentSessions(7);

    let sonnetHours = 0;
    let opusHours = 0;

    for (const session of sessions) {
      const hours = session.duration / (1000 * 60 * 60);

      if (session.model.includes('sonnet')) {
        sonnetHours += hours;
      } else if (session.model.includes('opus')) {
        opusHours += hours;
      }
    }

    const sonnetLimit = 432;
    const opusLimit = 36;
    const avgSessionHours = 4;

    const remainingHours = Math.max(
      (sonnetLimit - sonnetHours),
      (opusLimit - opusHours) * 12
    );

    const sessionsRemaining = Math.floor(remainingHours / avgSessionHours);

    return {
      sonnet: {
        used: Math.round(sonnetHours * 10) / 10,
        limit: sonnetLimit,
        remaining: Math.round((sonnetLimit - sonnetHours) * 10) / 10
      },
      opus: {
        used: Math.round(opusHours * 10) / 10,
        limit: opusLimit,
        remaining: Math.round((opusLimit - opusHours) * 10) / 10
      },
      resetDate: this.getNextWeeklyReset(),
      sessionsRemaining
    };
  }

  /**
   * Get usage trends for charting
   */
  getUsageTrends(days: number = 7): DailyUsage[] {
    const sessions = this.getRecentSessions(days);

    // Group by date
    const byDate = new Map<string, { tokens: number; sessions: number }>();

    for (const session of sessions) {
      const date = session.startTime.toISOString().split('T')[0];
      const existing = byDate.get(date) || { tokens: 0, sessions: 0 };
      byDate.set(date, {
        tokens: existing.tokens + session.tokens.total,
        sessions: existing.sessions + 1
      });
    }

    // Convert to array
    return Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        tokens: data.tokens,
        sessions: data.sessions,
        formattedDate: new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate cost based on token usage and model
   */
  private calculateCost(usage: {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
  }, _model: string): number {
    // Claude Sonnet 4.5 pricing (per million tokens)
    const pricing = {
      input: 3.00,
      output: 15.00,
      cacheWrite: 3.75,
      cacheRead: 0.30
    };

    const cost = (
      (usage.input / 1_000_000) * pricing.input +
      (usage.output / 1_000_000) * pricing.output +
      (usage.cacheWrite / 1_000_000) * pricing.cacheWrite +
      (usage.cacheRead / 1_000_000) * pricing.cacheRead
    );

    return Math.round(cost * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get next weekly reset date
   */
  private getNextWeeklyReset(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (daysUntilMonday || 7));
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }

  /**
   * Get project directory path
   */
  getSessionDirectory(): string {
    return this.sessionDir;
  }
}
