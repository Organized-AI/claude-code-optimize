// src/client/src/services/SessionLogger.ts

export interface Prompt {
  timestamp: string;
  text: string;
  tokens: number;
}

export interface Session {
  id: string;
  project: string;
  model: 'sonnet' | 'opus';
  startTime: string;
  endTime?: string;
  prompts: Prompt[];
  status: 'active' | 'completed';
}

export interface WeeklyStats {
  sonnet: {
    sessions: number;
    hours: number;
    prompts: number;
  };
  opus: {
    sessions: number;
    hours: number;
    prompts: number;
  };
}

export class SessionLogger {
  private readonly STORAGE_KEY = 'claude-code-sessions';
  
  // Start a new session
  startSession(project: string, model: 'sonnet' | 'opus' = 'sonnet'): string {
    const session: Session = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      project,
      model,
      startTime: new Date().toISOString(),
      prompts: [],
      status: 'active'
    };
    
    this.saveSession(session);
    
    // Also set as current active session
    localStorage.setItem('claude-active-session', session.id);
    
    return session.id;
  }
  
  // Log a prompt with token counting
  logPrompt(sessionId: string, promptText: string): void {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (session && session.status === 'active') {
      const prompt: Prompt = {
        timestamp: new Date().toISOString(),
        text: promptText,
        tokens: this.estimateTokens(promptText)
      };
      
      session.prompts.push(prompt);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      
      // Log for debugging
      console.log(`Logged prompt: ${prompt.tokens} tokens`);
    }
  }
  
  // End session and calculate duration
  endSession(sessionId: string): void {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (session) {
      session.status = 'completed';
      session.endTime = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      
      // Clear active session
      if (localStorage.getItem('claude-active-session') === sessionId) {
        localStorage.removeItem('claude-active-session');
      }
      
      // Log session summary
      const duration = this.calculateDuration(session);
      const totalTokens = session.prompts.reduce((sum, p) => sum + p.tokens, 0);
      console.log(`Session ended: ${duration}, ${totalTokens} total tokens`);
    }
  }
  
  // Get all sessions
  getSessions(): Session[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  // Get active session if any
  getActiveSession(): Session | null {
    const activeId = localStorage.getItem('claude-active-session');
    if (!activeId) return null;
    
    const sessions = this.getSessions();
    return sessions.find(s => s.id === activeId && s.status === 'active') || null;
  }
  
  // Get weekly statistics
  getWeeklyStats(): WeeklyStats {
    const sessions = this.getSessions();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekSessions = sessions.filter(s => 
      new Date(s.startTime) > weekAgo
    );
    
    const stats: WeeklyStats = {
      sonnet: {
        sessions: 0,
        hours: 0,
        prompts: 0
      },
      opus: {
        sessions: 0,
        hours: 0,
        prompts: 0
      }
    };
    
    // Calculate stats for each model
    weekSessions.forEach(session => {
      const hours = session.endTime 
        ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60)
        : 0;
        
      const prompts = session.prompts.length;
      const modelStats = stats[session.model];
      
      modelStats.sessions++;
      modelStats.hours += hours;
      modelStats.prompts += prompts;
    });
    
    // Round hours to 1 decimal place
    stats.sonnet.hours = Math.round(stats.sonnet.hours * 10) / 10;
    stats.opus.hours = Math.round(stats.opus.hours * 10) / 10;
    
    return stats;
  }
  
  // Calculate session duration string
  calculateDuration(session: Session): string {
    if (!session.endTime) {
      const now = new Date();
      const start = new Date(session.startTime);
      const diff = now.getTime() - start.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
  
  // Delete a session
  deleteSession(sessionId: string): void {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }
  
  // Clear all sessions (use with caution)
  clearAllSessions(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('claude-active-session');
  }
  
  // Export sessions as JSON
  exportSessions(): string {
    const sessions = this.getSessions();
    return JSON.stringify(sessions, null, 2);
  }
  
  // Import sessions from JSON
  importSessions(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData);
      if (Array.isArray(imported)) {
        const existing = this.getSessions();
        const merged = [...existing, ...imported];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (error) {
      console.error('Failed to import sessions:', error);
      throw new Error('Invalid session data format');
    }
  }
  
  // Estimate tokens (more accurate than simple division)
  private estimateTokens(text: string): number {
    // More accurate token estimation based on Claude's tokenization
    // Average: ~1 token per 4 characters for English text
    // Adjust for code (more tokens due to symbols)
    
    const baseTokens = Math.ceil(text.length / 4);
    
    // Code detection - increase token count for code
    const codeIndicators = ['{', '}', '(', ')', ';', 'function', 'const', 'let', 'var', '=>'];
    const codeScore = codeIndicators.reduce((score, indicator) => {
      return score + (text.split(indicator).length - 1);
    }, 0);
    
    const codeMultiplier = 1 + Math.min(codeScore / 100, 0.3); // Up to 30% more tokens for code
    
    return Math.ceil(baseTokens * codeMultiplier);
  }
  
  // Save session to storage
  private saveSession(session: Session): void {
    const sessions = this.getSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }
}
