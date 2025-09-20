import { promises as fs } from 'fs';
import { join } from 'path';
import { Session, TokenUsage, Checkpoint } from '../../shared/types/index.js';

interface DatabaseData {
  sessions: Session[];
  tokenUsage: TokenUsage[];
  checkpoints: Checkpoint[];
  version: string;
}

export class JsonDatabaseManager {
  private dbPath: string;
  private data: DatabaseData;
  private saveTimeout: NodeJS.Timeout | null = null;
  
  constructor(dbPath?: string) {
    const defaultPath = join(process.cwd(), 'data');
    this.dbPath = dbPath || join(defaultPath, 'moonlock.json');
    
    this.data = {
      sessions: [],
      tokenUsage: [],
      checkpoints: [],
      version: '1.0.0'
    };
    
    this.initializeDatabase();
  }
  
  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dir = join(this.dbPath, '..');
      await fs.mkdir(dir, { recursive: true });
      
      // Load existing data if available
      try {
        const content = await fs.readFile(this.dbPath, 'utf-8');
        this.data = JSON.parse(content);
      } catch (error) {
        // File doesn't exist or is invalid, use default data
        await this.saveToFile();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
  
  private async saveToFile(): Promise<void> {
    try {
      const content = JSON.stringify(this.data, null, 2);
      await fs.writeFile(this.dbPath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }
  
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveToFile();
      this.saveTimeout = null;
    }, 1000); // Debounced save after 1 second
  }
  
  // Session operations
  async createSession(session: Session): Promise<void> {
    this.data.sessions.push(session);
    this.scheduleSave();
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    return this.data.sessions.find(s => s.id === sessionId) || null;
  }
  
  async updateSession(session: Session): Promise<void> {
    const index = this.data.sessions.findIndex(s => s.id === session.id);
    if (index !== -1) {
      this.data.sessions[index] = { ...session, updatedAt: Date.now() };
      this.scheduleSave();
    }
  }
  
  async getAllSessions(limit = 50, offset = 0): Promise<Session[]> {
    return this.data.sessions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
  }
  
  // Token usage operations
  async recordTokenUsage(tokenUsage: TokenUsage): Promise<void> {
    this.data.tokenUsage.push(tokenUsage);
    
    // Update session total
    const session = this.data.sessions.find(s => s.id === tokenUsage.sessionId);
    if (session) {
      session.tokensUsed = tokenUsage.cumulativeTotal;
      session.updatedAt = Date.now();
    }
    
    this.scheduleSave();
  }
  
  async getTokenUsageHistory(sessionId: string): Promise<TokenUsage[]> {
    return this.data.tokenUsage
      .filter(usage => usage.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // Checkpoint operations
  async createCheckpoint(checkpoint: Checkpoint): Promise<void> {
    this.data.checkpoints.push(checkpoint);
    this.scheduleSave();
  }
  
  async getCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    return this.data.checkpoints
      .filter(cp => cp.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
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
    const recentSessions = this.data.sessions.filter(s => s.createdAt >= startTime);
    
    const totalSessions = recentSessions.length;
    const totalTokens = recentSessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    const averageSessionDuration = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + s.duration, 0) / recentSessions.length
      : 0;
    
    // Calculate peak usage hours (simplified)
    const hourlyUsage = new Map<number, number>();
    this.data.tokenUsage
      .filter(usage => usage.timestamp >= startTime)
      .forEach(usage => {
        const hour = new Date(usage.timestamp).getHours();
        hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + usage.tokensUsed);
      });
    
    const peakUsageHours = Array.from(hourlyUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour]) => hour);
    
    return {
      totalSessions,
      totalTokens,
      averageSessionDuration,
      peakUsageHours,
    };
  }
  
  async exportData(): Promise<{
    sessions: Session[];
    tokenUsage: TokenUsage[];
    checkpoints: Checkpoint[];
  }> {
    return {
      sessions: [...this.data.sessions],
      tokenUsage: [...this.data.tokenUsage],
      checkpoints: [...this.data.checkpoints],
    };
  }
  
  async importData(data: {
    sessions?: Session[];
    tokenUsage?: TokenUsage[];
    checkpoints?: Checkpoint[];
  }): Promise<void> {
    if (data.sessions) {
      this.data.sessions = data.sessions;
    }
    if (data.tokenUsage) {
      this.data.tokenUsage = data.tokenUsage;
    }
    if (data.checkpoints) {
      this.data.checkpoints = data.checkpoints;
    }
    
    await this.saveToFile();
  }
  
  close(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveToFile(); // Final save
    }
  }
}