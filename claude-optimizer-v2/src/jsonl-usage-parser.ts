/**
 * JSONL Usage Parser
 * Parses Claude Code native JSONL session files to extract usage metrics
 * Matches the data shown in `/usage` command
 */

import fs from 'fs';
import path from 'path';

export interface SessionUsage {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // milliseconds
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  messageCount: number;
  model: string;
}

export interface WeeklyUsage {
  sonnet: {
    used: number; // hours
    limit: number; // hours
    percentage: number;
  };
  opus: {
    used: number; // hours
    limit: number; // hours
    percentage: number;
  };
  totalSessions: number;
  weekStart: Date;
  weekEnd: Date;
}

export class JSONLUsageParser {
  private projectsDir: string;

  constructor() {
    const home = process.env.HOME || '';
    this.projectsDir = path.join(home, '.claude/projects');
  }

  /**
   * Get all JSONL session files
   */
  private getAllSessionFiles(): string[] {
    if (!fs.existsSync(this.projectsDir)) {
      return [];
    }

    const sessionFiles: string[] = [];
    const projectDirs = fs.readdirSync(this.projectsDir);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(this.projectsDir, projectDir);
      if (!fs.statSync(projectPath).isDirectory()) continue;

      const files = fs.readdirSync(projectPath)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => path.join(projectPath, f));

      sessionFiles.push(...files);
    }

    return sessionFiles;
  }

  /**
   * Parse a single JSONL file to extract usage
   */
  private parseSessionFile(filePath: string): SessionUsage | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());

      if (lines.length === 0) return null;

      let inputTokens = 0;
      let outputTokens = 0;
      let cacheCreationTokens = 0;
      let cacheReadTokens = 0;
      let messageCount = 0;
      let startTime: Date | null = null;
      let endTime: Date | null = null;
      let model = 'unknown';

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Track timestamps
          if (entry.timestamp) {
            const timestamp = new Date(entry.timestamp);
            if (!startTime || timestamp < startTime) startTime = timestamp;
            if (!endTime || timestamp > endTime) endTime = timestamp;
          }

          // Track model
          if (entry.model) {
            model = entry.model;
          }

          // Count messages
          if (entry.type === 'message') {
            messageCount++;
          }

          // Extract token usage from usage blocks
          if (entry.usage) {
            inputTokens += entry.usage.input_tokens || 0;
            outputTokens += entry.usage.output_tokens || 0;
            cacheCreationTokens += entry.usage.cache_creation_input_tokens || 0;
            cacheReadTokens += entry.usage.cache_read_input_tokens || 0;
          }

          // Also check for messageOutput usage
          if (entry.type === 'messageOutput' && entry.data?.usage) {
            inputTokens += entry.data.usage.input_tokens || 0;
            outputTokens += entry.data.usage.output_tokens || 0;
            cacheCreationTokens += entry.data.usage.cache_creation_input_tokens || 0;
            cacheReadTokens += entry.data.usage.cache_read_input_tokens || 0;
          }
        } catch (err) {
          // Skip invalid JSON lines
          continue;
        }
      }

      if (!startTime) return null;

      const sessionId = path.basename(filePath, '.jsonl');
      const duration = endTime ? endTime.getTime() - startTime.getTime() : 0;
      const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

      return {
        sessionId,
        startTime,
        endTime: endTime || undefined,
        duration,
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
        totalTokens,
        messageCount,
        model
      };
    } catch (error) {
      console.error(`Error parsing session file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get current session usage (most recent session)
   */
  getCurrentSessionUsage(): SessionUsage | null {
    const sessionFiles = this.getAllSessionFiles();
    if (sessionFiles.length === 0) return null;

    // Sort by modification time (most recent first)
    const sortedFiles = sessionFiles
      .map(f => ({
        path: f,
        mtime: fs.statSync(f).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Parse most recent session
    return this.parseSessionFile(sortedFiles[0].path);
  }

  /**
   * Get current week usage (all sessions from this week)
   */
  getCurrentWeekUsage(): WeeklyUsage {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const sessionFiles = this.getAllSessionFiles();
    const weeklySessions: SessionUsage[] = [];

    for (const file of sessionFiles) {
      const usage = this.parseSessionFile(file);
      if (!usage) continue;

      // Check if session is in current week
      if (usage.startTime >= weekStart && usage.startTime < weekEnd) {
        weeklySessions.push(usage);
      }
    }

    // Calculate usage by model
    let sonnetHours = 0;
    let opusHours = 0;

    for (const session of weeklySessions) {
      const hours = session.duration / (1000 * 60 * 60);

      if (session.model.toLowerCase().includes('opus')) {
        opusHours += hours;
      } else if (session.model.toLowerCase().includes('sonnet')) {
        sonnetHours += hours;
      }
    }

    // Weekly limits (from Claude Code documentation)
    const sonnetLimit = 432; // hours per week
    const opusLimit = 36; // hours per week

    return {
      sonnet: {
        used: Math.round(sonnetHours * 10) / 10,
        limit: sonnetLimit,
        percentage: Math.round((sonnetHours / sonnetLimit) * 100)
      },
      opus: {
        used: Math.round(opusHours * 10) / 10,
        limit: opusLimit,
        percentage: Math.round((opusHours / opusLimit) * 100)
      },
      totalSessions: weeklySessions.length,
      weekStart,
      weekEnd
    };
  }

  /**
   * Get all sessions sorted by date
   */
  getAllSessions(): SessionUsage[] {
    const sessionFiles = this.getAllSessionFiles();
    const sessions: SessionUsage[] = [];

    for (const file of sessionFiles) {
      const usage = this.parseSessionFile(file);
      if (usage) {
        sessions.push(usage);
      }
    }

    // Sort by start time (newest first)
    return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get usage summary matching `/usage` command output
   */
  getUsageSummary(): {
    currentSession: SessionUsage | null;
    currentWeek: WeeklyUsage;
    allSessions: SessionUsage[];
  } {
    return {
      currentSession: this.getCurrentSessionUsage(),
      currentWeek: this.getCurrentWeekUsage(),
      allSessions: this.getAllSessions()
    };
  }

  /**
   * Format duration to match Claude's format (e.g., "2h 30m")
   */
  static formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Calculate when the 5-hour block resets
   */
  static getBlockResetTime(sessionStart: Date): Date {
    const reset = new Date(sessionStart);
    reset.setHours(reset.getHours() + 5);
    return reset;
  }

  /**
   * Calculate percentage of 5-hour block used
   */
  static getBlockUsagePercent(sessionStart: Date): number {
    const now = new Date();
    const blockDuration = 5 * 60 * 60 * 1000; // 5 hours in ms
    const elapsed = now.getTime() - sessionStart.getTime();
    return Math.min(Math.round((elapsed / blockDuration) * 100), 100);
  }
}

// Export singleton instance
export const jsonlUsageParser = new JSONLUsageParser();
