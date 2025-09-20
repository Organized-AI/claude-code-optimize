import { 
  SessionData, 
  SessionContext, 
  SessionFilter, 
  SearchQuery,
  CheckpointData,
  ConversationEntry
} from '../../contracts/AgentInterfaces.js';
import { DatabaseManager } from './DatabaseManager.js';
import { Session } from '../../shared/types/index.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session-specific storage management service
 * Handles persistent storage for sessions, contexts, and conversation history
 */
export class SessionStorageService {
  private dbManager: DatabaseManager;
  private db: any; // Direct database reference for better performance
  private dataPath: string;
  private contextPath: string;

  constructor(dbManager: DatabaseManager, dataPath: string) {
    this.dbManager = dbManager;
    this.db = (dbManager as any).db; // Get direct database reference
    this.dataPath = dataPath;
    this.contextPath = join(dataPath, 'session-contexts');

    // Ensure context directory exists
    if (!existsSync(this.contextPath)) {
      mkdirSync(this.contextPath, { recursive: true });
    }

    this.initializeExtendedSchema();
  }

  private initializeExtendedSchema(): void {
    // Extend the existing database schema for enhanced session data
    this.db.exec(`
      -- Extended session data table
      CREATE TABLE IF NOT EXISTS session_data (
        id TEXT PRIMARY KEY,
        name TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
        model TEXT NOT NULL CHECK(model IN ('sonnet', 'opus')),
        tokens_used INTEGER DEFAULT 0,
        token_budget INTEGER,
        complexity_score REAL,
        risk_score REAL,
        tags TEXT, -- JSON array
        metadata TEXT, -- JSON object
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Checkpoints with enhanced data
      CREATE TABLE IF NOT EXISTS session_checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phase TEXT NOT NULL,
        prompt_count INTEGER NOT NULL,
        tokens_used INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        context_snapshot TEXT, -- JSON object
        metadata TEXT, -- JSON object
        FOREIGN KEY (session_id) REFERENCES session_data (id) ON DELETE CASCADE
      );

      -- Conversation history
      CREATE TABLE IF NOT EXISTS conversation_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tokens INTEGER NOT NULL,
        metadata TEXT, -- JSON object
        FOREIGN KEY (session_id) REFERENCES session_data (id) ON DELETE CASCADE
      );

      -- Performance and optimization indexes
      CREATE INDEX IF NOT EXISTS idx_session_data_status ON session_data (status);
      CREATE INDEX IF NOT EXISTS idx_session_data_model ON session_data (model);
      CREATE INDEX IF NOT EXISTS idx_session_data_created_at ON session_data (created_at);
      CREATE INDEX IF NOT EXISTS idx_session_data_tags ON session_data (tags);
      CREATE INDEX IF NOT EXISTS idx_session_checkpoints_session_id ON session_checkpoints (session_id);
      CREATE INDEX IF NOT EXISTS idx_session_checkpoints_timestamp ON session_checkpoints (timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversation_session_id ON conversation_history (session_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_timestamp ON conversation_history (timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversation_role ON conversation_history (role);

      -- Full-text search support for session content
      CREATE VIRTUAL TABLE IF NOT EXISTS session_search USING fts5(
        session_id, name, content, tags, 
        content='session_data', 
        prefix='2 3 4'
      );

      -- Triggers to maintain search index
      CREATE TRIGGER IF NOT EXISTS session_search_insert AFTER INSERT ON session_data BEGIN
        INSERT INTO session_search(session_id, name, content, tags) 
        VALUES (new.id, new.name, new.metadata, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS session_search_update AFTER UPDATE ON session_data BEGIN
        DELETE FROM session_search WHERE session_id = old.id;
        INSERT INTO session_search(session_id, name, content, tags) 
        VALUES (new.id, new.name, new.metadata, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS session_search_delete AFTER DELETE ON session_data BEGIN
        DELETE FROM session_search WHERE session_id = old.id;
      END;
    `);
  }

  async saveSession(session: SessionData): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO session_data (
        id, name, start_time, end_time, duration, status, model,
        tokens_used, token_budget, complexity_score, risk_score,
        tags, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.name || null,
      session.startTime,
      session.endTime || null,
      session.duration,
      session.status,
      session.model,
      session.tokensUsed,
      session.tokenBudget || null,
      session.complexity?.overall || null,
      session.riskAssessment?.overall || null,
      JSON.stringify(session.metadata.tags || []),
      JSON.stringify(session.metadata),
      session.createdAt,
      session.updatedAt
    );

    // Save checkpoints
    if (session.checkpoints && session.checkpoints.length > 0) {
      await this.saveCheckpoints(session.id, session.checkpoints);
    }

    // Update legacy session table for backward compatibility
    const legacySession: Session = {
      id: session.id,
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      tokenBudget: session.tokenBudget,
      tokensUsed: session.tokensUsed,
      status: session.status === 'cancelled' ? 'completed' : session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    await this.dbManager.createSession(legacySession);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const stmt = this.db.prepare('SELECT * FROM session_data WHERE id = ?');
    const row = stmt.get(sessionId) as any;

    if (!row) return null;

    // Get checkpoints
    const checkpoints = await this.getCheckpoints(sessionId);

    // Get conversation history
    const conversationHistory = await this.getConversationHistory(sessionId);

    return {
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      status: row.status,
      model: row.model,
      tokensUsed: row.tokens_used,
      tokenBudget: row.token_budget,
      complexity: row.complexity_score ? { overall: row.complexity_score } as any : undefined,
      riskAssessment: row.risk_score ? { overall: row.risk_score } as any : undefined,
      checkpoints,
      metadata: {
        ...JSON.parse(row.metadata || '{}'),
        tags: JSON.parse(row.tags || '[]'),
        conversationHistory
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getAllSessions(filter?: SessionFilter): Promise<SessionData[]> {
    let query = 'SELECT * FROM session_data WHERE 1=1';
    const params: any[] = [];

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        query += ` AND status IN (${filter.status.map(() => '?').join(',')})`;
        params.push(...filter.status);
      }

      if (filter.model && filter.model.length > 0) {
        query += ` AND model IN (${filter.model.map(() => '?').join(',')})`;
        params.push(...filter.model);
      }

      if (filter.dateRange) {
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(filter.dateRange.start, filter.dateRange.end);
      }

      if (filter.complexity) {
        if (filter.complexity.min !== undefined) {
          query += ' AND complexity_score >= ?';
          params.push(filter.complexity.min);
        }
        if (filter.complexity.max !== undefined) {
          query += ' AND complexity_score <= ?';
          params.push(filter.complexity.max);
        }
      }

      if (filter.tags && filter.tags.length > 0) {
        // Use JSON search for tags
        const tagConditions = filter.tags.map(() => 'tags LIKE ?').join(' OR ');
        query += ` AND (${tagConditions})`;
        params.push(...filter.tags.map(tag => `%"${tag}"%`));
      }
    }

    query += ' ORDER BY created_at DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
      
      if (filter.offset) {
        query += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    // Convert rows to SessionData
    const sessions: SessionData[] = [];
    for (const row of rows) {
      const session = await this.getSession(row.id);
      if (session) sessions.push(session);
    }

    return sessions;
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated: SessionData = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveSession(updated);
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Delete from extended table (cascades to related tables)
    const stmt = this.db.prepare('DELETE FROM session_data WHERE id = ?');
    stmt.run(sessionId);

    // Delete from legacy table
    const legacyStmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    legacyStmt.run(sessionId);

    // Delete session context file
    await this.deleteSessionContext(sessionId);
  }

  async saveSessionContext(sessionId: string, context: SessionContext): Promise<void> {
    const contextFile = join(this.contextPath, `${sessionId}.json`);
    const fs = await import('fs/promises');
    
    const contextData = {
      ...context,
      updatedAt: Date.now()
    };

    await fs.writeFile(contextFile, JSON.stringify(contextData, null, 2));

    // Also save conversation history to database for better querying
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      await this.saveConversationHistory(sessionId, context.conversationHistory);
    }
  }

  async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    const contextFile = join(this.contextPath, `${sessionId}.json`);
    
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(contextFile, 'utf-8');
      const context = JSON.parse(data);
      
      // Merge with conversation history from database
      const conversationHistory = await this.getConversationHistory(sessionId);
      context.conversationHistory = conversationHistory;
      
      return context;
    } catch (error) {
      return null;
    }
  }

  async deleteSessionContext(sessionId: string): Promise<void> {
    const contextFile = join(this.contextPath, `${sessionId}.json`);
    
    try {
      const fs = await import('fs/promises');
      await fs.unlink(contextFile);
    } catch (error) {
      // File might not exist, which is fine
    }

    // Delete conversation history from database
    const stmt = this.db.prepare('DELETE FROM conversation_history WHERE session_id = ?');
    stmt.run(sessionId);
  }

  async searchSessions(query: SearchQuery): Promise<SessionData[]> {
    let sqlQuery = '';
    const params: any[] = [];

    if (query.text) {
      // Use full-text search
      sqlQuery = `
        SELECT DISTINCT sd.* FROM session_data sd
        JOIN session_search ss ON sd.id = ss.session_id
        WHERE session_search MATCH ?
      `;
      params.push(query.text);
    } else {
      sqlQuery = 'SELECT * FROM session_data WHERE 1=1';
    }

    // Apply filters
    if (query.filters) {
      if (query.filters.status && query.filters.status.length > 0) {
        sqlQuery += ` AND status IN (${query.filters.status.map(() => '?').join(',')})`;
        params.push(...query.filters.status);
      }

      if (query.filters.model && query.filters.model.length > 0) {
        sqlQuery += ` AND model IN (${query.filters.model.map(() => '?').join(',')})`;
        params.push(...query.filters.model);
      }

      if (query.filters.dateRange) {
        sqlQuery += ' AND created_at BETWEEN ? AND ?';
        params.push(query.filters.dateRange.start, query.filters.dateRange.end);
      }

      if (query.filters.complexity) {
        if (query.filters.complexity.min !== undefined) {
          sqlQuery += ' AND complexity_score >= ?';
          params.push(query.filters.complexity.min);
        }
        if (query.filters.complexity.max !== undefined) {
          sqlQuery += ' AND complexity_score <= ?';
          params.push(query.filters.complexity.max);
        }
      }

      if (query.filters.tags && query.filters.tags.length > 0) {
        const tagConditions = query.filters.tags.map(() => 'tags LIKE ?').join(' OR ');
        sqlQuery += ` AND (${tagConditions})`;
        params.push(...query.filters.tags.map(tag => `%"${tag}"%`));
      }
    }

    // Apply sorting
    if (query.sort) {
      const sortField = this.mapSortField(query.sort.field);
      sqlQuery += ` ORDER BY ${sortField} ${query.sort.direction.toUpperCase()}`;
    } else {
      sqlQuery += ' ORDER BY created_at DESC';
    }

    // Apply pagination
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

    // Convert to full SessionData objects
    const sessions: SessionData[] = [];
    for (const row of rows) {
      const session = await this.getSession(row.id);
      if (session) sessions.push(session);
    }

    return sessions;
  }

  private async saveCheckpoints(sessionId: string, checkpoints: CheckpointData[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO session_checkpoints (
        id, session_id, name, phase, prompt_count, tokens_used, 
        timestamp, context_snapshot, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const checkpoint of checkpoints) {
      stmt.run(
        checkpoint.id,
        sessionId,
        checkpoint.name,
        checkpoint.phase,
        checkpoint.promptCount,
        checkpoint.tokensUsed,
        checkpoint.timestamp,
        JSON.stringify(checkpoint.context),
        JSON.stringify(checkpoint.metadata)
      );
    }
  }

  private async getCheckpoints(sessionId: string): Promise<CheckpointData[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM session_checkpoints 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(sessionId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      name: row.name,
      phase: row.phase,
      promptCount: row.prompt_count,
      tokensUsed: row.tokens_used,
      timestamp: row.timestamp,
      context: JSON.parse(row.context_snapshot || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private async saveConversationHistory(sessionId: string, history: ConversationEntry[]): Promise<void> {
    // Clear existing history
    const deleteStmt = this.db.prepare('DELETE FROM conversation_history WHERE session_id = ?');
    deleteStmt.run(sessionId);

    // Insert new history
    const insertStmt = this.db.prepare(`
      INSERT INTO conversation_history (
        id, session_id, role, content, timestamp, tokens, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const entry of history) {
      insertStmt.run(
        entry.id,
        sessionId,
        entry.role,
        entry.content,
        entry.timestamp,
        entry.tokens,
        JSON.stringify(entry.metadata || {})
      );
    }
  }

  private async getConversationHistory(sessionId: string): Promise<ConversationEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_history 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(sessionId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      tokens: row.tokens,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'name': 'name',
      'created': 'created_at',
      'updated': 'updated_at',
      'startTime': 'start_time',
      'endTime': 'end_time',
      'duration': 'duration',
      'status': 'status',
      'model': 'model',
      'tokens': 'tokens_used',
      'complexity': 'complexity_score'
    };

    return fieldMap[field] || 'created_at';
  }

  // Maintenance and cleanup
  async getSessionStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    totalTokens: number;
    averageDuration: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(tokens_used) as total_tokens,
        AVG(duration) as avg_duration
      FROM session_data
    `);

    const stats = stmt.get() as any;
    
    return {
      total: stats.total || 0,
      active: stats.active || 0,
      completed: stats.completed || 0,
      totalTokens: stats.total_tokens || 0,
      averageDuration: stats.avg_duration || 0
    };
  }

  async cleanup(olderThan: number): Promise<void> {
    // Delete old session data
    const deleteStmt = this.db.prepare('DELETE FROM session_data WHERE created_at < ?');
    deleteStmt.run(olderThan);

    // Clean up orphaned context files
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(this.contextPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.getSession(sessionId);
          
          if (!session) {
            await fs.unlink(join(this.contextPath, file));
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clean up context files:', error);
    }
  }
}