import { Session, TokenUsage } from '../../shared/types/index.js';
import { SessionManager } from './SessionManager.js';
import { JsonDatabaseManager as DatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';

/**
 * Extended SessionManager with additional methods for the new enhancements
 */
export class ExtendedSessionManager extends SessionManager {
  private db: DatabaseManager;
  
  constructor(db: DatabaseManager, wsManager: WebSocketManager) {
    super(db, wsManager);
    this.db = db;
  }
  
  async getAllSessions(): Promise<Session[]> {
    return await this.db.getAllSessions();
  }
  
  async getTokenHistory(sessionId: string): Promise<TokenUsage[]> {
    return await this.db.getTokenHistory(sessionId);
  }
  
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    
    const updatedSession: Session = {
      ...session,
      ...updates,
      id: session.id, // Prevent ID change
      updatedAt: Date.now()
    };
    
    await this.db.updateSession(sessionId, updatedSession);
    return updatedSession;
  }
}