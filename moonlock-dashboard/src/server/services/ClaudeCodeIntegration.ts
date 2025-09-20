import { promises as fs } from 'fs';
import { join } from 'path';
import { SessionManager } from './SessionManager.js';
import { TokenMonitor } from './TokenMonitor.js';
import { JsonDatabaseManager } from './JsonDatabaseManager.js';

interface SessionState {
  promptsUsed: number;
  phase: string;
  status?: string;
  timestamp: number;
}

export class ClaudeCodeIntegration {
  private sessionManager: SessionManager;
  private tokenMonitor: TokenMonitor;
  private db: JsonDatabaseManager;
  private watchInterval: NodeJS.Timeout | null = null;
  private currentSession: string | null = null;
  
  constructor(sessionManager: SessionManager, tokenMonitor: TokenMonitor, db: JsonDatabaseManager) {
    this.sessionManager = sessionManager;
    this.tokenMonitor = tokenMonitor;
    this.db = db;
  }
  
  async initialize(): Promise<void> {
    console.log('🔗 Initializing Claude Code integration...');
    
    // Check if we're in a Claude Code session
    const sessionData = await this.detectClaudeCodeSession();
    
    if (sessionData) {
      console.log('✅ Claude Code session detected - creating Moonlock session');
      await this.createMoonlockSession(sessionData);
      this.startMonitoring();
    } else {
      console.log('ℹ️ No active Claude Code session detected');
    }
  }
  
  private async detectClaudeCodeSession(): Promise<SessionState | null> {
    try {
      // Look for .session_state file indicating active Claude Code session
      const sessionFilePath = join(process.cwd(), '.session_state');
      
      try {
        const content = await fs.readFile(sessionFilePath, 'utf-8');
        const lines = content.trim().split('\n');
        
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          const match = lastLine.match(/PROMPTS_USED:\s*(\d+)\s*\|\s*PHASE:\s*(.+?)(?:\s*\|\s*(.+))?$/);
          
          if (match) {
            const [, promptsUsed, phase, status] = match;
            
            return {
              promptsUsed: parseInt(promptsUsed, 10),
              phase: phase.trim(),
              status: status?.trim(),
              timestamp: Date.now(),
            };
          }
        }
      } catch (error) {
        // File doesn't exist, not in a Claude Code session
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting Claude Code session:', error);
      return null;
    }
  }
  
  private async createMoonlockSession(sessionData: SessionState): Promise<void> {
    try {
      // Create a 5-hour session for the Moonlock Dashboard build
      const session = await this.sessionManager.createSession({
        name: `Moonlock Dashboard Build - ${sessionData.phase}`,
        duration: 5 * 60 * 60 * 1000, // 5 hours
        tokenBudget: 10000, // Estimate based on typical Claude usage
      });
      
      this.currentSession = session.id;
      
      // Record initial token usage based on prompts used
      const estimatedTokensPerPrompt = 150; // Conservative estimate
      const initialTokens = sessionData.promptsUsed * estimatedTokensPerPrompt;
      
      await this.tokenMonitor.recordTokenUsage(
        session.id,
        initialTokens,
        `Claude Code Session - ${sessionData.promptsUsed} prompts used`
      );
      
      // Add checkpoint for current phase
      await this.sessionManager.addCheckpoint(session.id, {
        phase: sessionData.phase,
        promptCount: sessionData.promptsUsed,
        metadata: {
          sessionType: 'claude-code',
          status: sessionData.status,
          integration: 'auto-detected',
        },
      });
      
      console.log(`✅ Created Moonlock session: ${session.id}`);
      console.log(`📊 Initial token estimate: ${initialTokens} tokens`);
      console.log(`🎯 Phase: ${sessionData.phase}`);
      
    } catch (error) {
      console.error('Error creating Moonlock session:', error);
    }
  }
  
  private startMonitoring(): void {
    // Monitor for changes every 10 seconds
    this.watchInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, 10000);
    
    console.log('👀 Started monitoring Claude Code session for updates');
  }
  
  private async checkForUpdates(): Promise<void> {
    if (!this.currentSession) return;
    
    try {
      const newSessionData = await this.detectClaudeCodeSession();
      
      if (newSessionData) {
        // Check if we have new prompts
        const session = await this.sessionManager.getSession(this.currentSession);
        if (!session) return;
        
        const lastCheckpoint = (await this.db.getCheckpoints(this.currentSession))
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        const lastPromptCount = lastCheckpoint?.promptCount || 0;
        
        if (newSessionData.promptsUsed > lastPromptCount) {
          const newPrompts = newSessionData.promptsUsed - lastPromptCount;
          const estimatedTokensPerPrompt = 150;
          const newTokens = newPrompts * estimatedTokensPerPrompt;
          
          // Record new token usage
          await this.tokenMonitor.recordTokenUsage(
            this.currentSession,
            newTokens,
            `Claude Code Update - ${newPrompts} new prompts`
          );
          
          // Add new checkpoint if phase changed
          if (lastCheckpoint?.phase !== newSessionData.phase) {
            await this.sessionManager.addCheckpoint(this.currentSession, {
              phase: newSessionData.phase,
              promptCount: newSessionData.promptsUsed,
              metadata: {
                sessionType: 'claude-code',
                status: newSessionData.status,
                integration: 'auto-updated',
                promptsAdded: newPrompts,
              },
            });
            
            console.log(`🔄 Updated session - Phase: ${newSessionData.phase}, New prompts: ${newPrompts}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for Claude Code updates:', error);
    }
  }
  
  async getCurrentSessionInfo(): Promise<{
    isActive: boolean;
    sessionId?: string;
    promptsUsed?: number;
    phase?: string;
    tokensUsed?: number;
  }> {
    if (!this.currentSession) {
      return { isActive: false };
    }
    
    const session = await this.sessionManager.getSession(this.currentSession);
    const sessionData = await this.detectClaudeCodeSession();
    
    return {
      isActive: true,
      sessionId: this.currentSession,
      promptsUsed: sessionData?.promptsUsed,
      phase: sessionData?.phase,
      tokensUsed: session?.tokensUsed,
    };
  }
  
  shutdown(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    
    console.log('🔌 Claude Code integration stopped');
  }
}