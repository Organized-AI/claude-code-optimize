import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../types';
import { StorageService } from './storage';

export class SessionService {
  private storage: StorageService;
  
  constructor() {
    this.storage = new StorageService();
  }
  
  async startSession(metadata?: { project?: string; description?: string; tags?: string[] }): Promise<Session> {
    // End any existing active session
    const currentSession = await this.getCurrentSession();
    if (currentSession) {
      await this.endSession(currentSession.id);
    }
    
    const session: Session = {
      id: uuidv4(),
      startTime: new Date(),
      tokensUsed: 0,
      status: 'active',
      metadata
    };
    
    await this.storage.saveSession(session);
    await this.storage.setActiveSession(session.id);
    
    return session;
  }
  
  async endSession(sessionId: string): Promise<Session | null> {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    session.endTime = new Date();
    session.status = 'completed';
    
    await this.storage.saveSession(session);
    await this.storage.clearActiveSession();
    
    return session;
  }
  
  async getCurrentSession(): Promise<Session | null> {
    const activeSessionId = await this.storage.getActiveSessionId();
    if (!activeSessionId) return null;
    
    const session = await this.storage.getSession(activeSessionId);
    if (!session) {
      // Clean up stale reference
      await this.storage.clearActiveSession();
      return null;
    }
    
    return session;
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    return this.storage.getSession(sessionId);
  }
  
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const sessions = await this.storage.getAllSessions();
    
    // Sort by start time (newest first)
    sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    return sessions.slice(0, limit);
  }
  
  async updateSessionTokens(sessionId: string, tokensUsed: number): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    session.tokensUsed += tokensUsed;
    await this.storage.saveSession(session);
  }
  
  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<Session[]> {
    const sessions = await this.storage.getAllSessions();
    
    return sessions.filter(session => {
      const sessionDate = session.startTime;
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }
  
  async getSessionsByProject(projectName: string): Promise<Session[]> {
    const sessions = await this.storage.getAllSessions();
    
    return sessions.filter(session => 
      session.metadata?.project?.toLowerCase().includes(projectName.toLowerCase())
    );
  }
  
  async deleteSession(sessionId: string): Promise<boolean> {
    const session = await this.storage.getSession(sessionId);
    if (!session) return false;
    
    // If it's the active session, clear the active session reference
    const activeSessionId = await this.storage.getActiveSessionId();
    if (activeSessionId === sessionId) {
      await this.storage.clearActiveSession();
    }
    
    return this.storage.deleteSession(sessionId);
  }
  
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    averageSessionLength: number;
    averageTokensPerSession: number;
  }> {
    const sessions = await this.storage.getAllSessions();
    
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    
    const completedSessions = sessions.filter(s => s.endTime);
    const totalDuration = completedSessions.reduce((sum, s) => {
      if (s.endTime) {
        return sum + (s.endTime.getTime() - s.startTime.getTime());
      }
      return sum;
    }, 0);
    
    const averageSessionLength = completedSessions.length > 0 
      ? totalDuration / completedSessions.length 
      : 0;
    
    const averageTokensPerSession = sessions.length > 0 
      ? totalTokens / sessions.length 
      : 0;
    
    return {
      totalSessions: sessions.length,
      activeSessions,
      totalTokens,
      averageSessionLength,
      averageTokensPerSession
    };
  }
  
  async interruptSession(sessionId: string, reason?: string): Promise<Session | null> {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    session.endTime = new Date();
    session.status = 'interrupted';
    
    if (reason && session.metadata) {
      session.metadata.interruptReason = reason;
    }
    
    await this.storage.saveSession(session);
    await this.storage.clearActiveSession();
    
    return session;
  }
  
  async exportSessions(filePath?: string): Promise<string> {
    const sessions = await this.storage.getAllSessions();
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      sessions: sessions
    };
    
    const exportPath = filePath || path.join(
      await this.storage.getDataDir(),
      `sessions-export-${new Date().toISOString().split('T')[0]}.json`
    );
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    return exportPath;
  }
  
  async importSessions(filePath: string, merge: boolean = true): Promise<number> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    if (!importData.sessions || !Array.isArray(importData.sessions)) {
      throw new Error('Invalid export file format');
    }
    
    let importedCount = 0;
    
    for (const sessionData of importData.sessions) {
      // Convert string dates back to Date objects
      const session: Session = {
        ...sessionData,
        startTime: new Date(sessionData.startTime),
        endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined
      };
      
      // Check if session already exists when merging
      if (merge) {
        const existing = await this.storage.getSession(session.id);
        if (existing) continue;
      }
      
      await this.storage.saveSession(session);
      importedCount++;
    }
    
    return importedCount;
  }
}