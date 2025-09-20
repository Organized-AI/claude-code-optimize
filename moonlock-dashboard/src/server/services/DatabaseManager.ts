import Database from 'better-sqlite3';
import { Session, TokenUsage, Checkpoint } from '../../shared/types/index.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export class DatabaseManager {
  private db: Database.Database;
  
  constructor(dbPath?: string) {
    const defaultPath = join(process.cwd(), 'data');
    
    if (!existsSync(defaultPath)) {
      mkdirSync(defaultPath, { recursive: true });
    }
    
    const fullPath = dbPath || join(defaultPath, 'moonlock.db');
    this.db = new Database(fullPath);
    
    this.initializeSchema();
  }
  
  private initializeSchema(): void {
    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000000');
    this.db.pragma('temp_store = memory');
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER NOT NULL,
        token_budget INTEGER,
        tokens_used INTEGER DEFAULT 0,
        status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS token_usage (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        operation TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        cumulative_total INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        prompt_count INTEGER NOT NULL,
        tokens_used INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT, -- JSON string for additional data
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      );
      
      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at);
      CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage (session_id);
      CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage (timestamp);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_session_id ON checkpoints (session_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints (timestamp);
    `);
  }
  
  // Session operations
  async createSession(session: Session): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, name, start_time, end_time, duration, token_budget, 
        tokens_used, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      session.id,
      session.name || null,
      session.startTime,
      session.endTime || null,
      session.duration,
      session.tokenBudget || null,
      session.tokensUsed,
      session.status,
      session.createdAt,
      session.updatedAt
    );
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(sessionId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      tokenBudget: row.token_budget,
      tokensUsed: row.tokens_used,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  
  async updateSession(session: Session): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE sessions SET
        name = ?, end_time = ?, tokens_used = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      session.name || null,
      session.endTime || null,
      session.tokensUsed,
      session.status,
      Date.now(),
      session.id
    );
  }
  
  async getAllSessions(limit = 50, offset = 0): Promise<Session[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset) as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      tokenBudget: row.token_budget,
      tokensUsed: row.tokens_used,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  
  // Token usage operations
  async recordTokenUsage(tokenUsage: TokenUsage): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO token_usage (
        id, session_id, tokens_used, operation, timestamp, cumulative_total
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      tokenUsage.id,
      tokenUsage.sessionId,
      tokenUsage.tokensUsed,
      tokenUsage.operation,
      tokenUsage.timestamp,
      tokenUsage.cumulativeTotal
    );
    
    // Update session total
    const updateStmt = this.db.prepare(`
      UPDATE sessions SET tokens_used = ?, updated_at = ? WHERE id = ?
    `);
    
    updateStmt.run(tokenUsage.cumulativeTotal, Date.now(), tokenUsage.sessionId);
  }
  
  async getTokenUsageHistory(sessionId: string): Promise<TokenUsage[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM token_usage 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(sessionId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      tokensUsed: row.tokens_used,
      operation: row.operation,
      timestamp: row.timestamp,
      cumulativeTotal: row.cumulative_total,
    }));
  }
  
  // Checkpoint operations
  async createCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (
        id, session_id, phase, prompt_count, tokens_used, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      checkpoint.id,
      checkpoint.sessionId,
      checkpoint.phase,
      checkpoint.promptCount,
      checkpoint.tokensUsed,
      checkpoint.timestamp,
      checkpoint.metadata ? JSON.stringify(checkpoint.metadata) : null
    );
  }
  
  async getCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM checkpoints 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(sessionId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      phase: row.phase,
      promptCount: row.prompt_count,
      tokensUsed: row.tokens_used,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }
  
  // Analytics operations
  async getUsageAnalytics(period: 'hour' | 'day' | 'week' | 'month'): Promise<{
    totalSessions: number;
    totalTokens: number;
    averageSessionDuration: number;
    peakUsageHours: number[];
  }> {
    const now = Date.now();
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = now - periodMs[period];
    
    // Get basic stats
    const statsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(tokens_used) as total_tokens,
        AVG(duration) as avg_duration
      FROM sessions 
      WHERE created_at >= ?
    `);
    
    const stats = statsStmt.get(startTime) as any;
    
    // Get peak usage hours
    const peakStmt = this.db.prepare(`
      SELECT 
        strftime('%H', datetime(timestamp / 1000, 'unixepoch')) as hour,
        SUM(tokens_used) as total_tokens
      FROM token_usage 
      WHERE timestamp >= ? 
      GROUP BY hour 
      ORDER BY total_tokens DESC 
      LIMIT 5
    `);
    
    const peakHours = peakStmt.all(startTime) as any[];
    
    return {
      totalSessions: stats.total_sessions || 0,
      totalTokens: stats.total_tokens || 0,
      averageSessionDuration: stats.avg_duration || 0,
      peakUsageHours: peakHours.map(row => parseInt(row.hour, 10)),
    };
  }
  
  async exportData(): Promise<{
    sessions: Session[];
    tokenUsage: TokenUsage[];
    checkpoints: Checkpoint[];
  }> {
    const sessions = await this.getAllSessions(1000);
    
    const tokenUsageStmt = this.db.prepare('SELECT * FROM token_usage ORDER BY timestamp ASC');
    const tokenUsageRows = tokenUsageStmt.all() as any[];
    
    const checkpointsStmt = this.db.prepare('SELECT * FROM checkpoints ORDER BY timestamp ASC');
    const checkpointRows = checkpointsStmt.all() as any[];
    
    return {
      sessions,
      tokenUsage: tokenUsageRows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        tokensUsed: row.tokens_used,
        operation: row.operation,
        timestamp: row.timestamp,
        cumulativeTotal: row.cumulative_total,
      })),
      checkpoints: checkpointRows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        phase: row.phase,
        promptCount: row.prompt_count,
        tokensUsed: row.tokens_used,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      })),
    };
  }
  
  close(): void {
    this.db.close();
  }
}