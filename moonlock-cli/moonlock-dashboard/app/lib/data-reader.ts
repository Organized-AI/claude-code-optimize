import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Session, TokenUsage, Config, ActiveSession } from '@/app/types';

// Get the Moonlock data directory
const getMoonlockDir = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, '.moonlock');
};

// Read all sessions from the file system
export async function getSessions(): Promise<Session[]> {
  try {
    const moonlockDir = getMoonlockDir();
    const sessionsDir = path.join(moonlockDir, 'sessions');
    
    // Check if sessions directory exists
    try {
      await fs.access(sessionsDir);
    } catch {
      return [];
    }

    const files = await fs.readdir(sessionsDir);
    const sessions: Session[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(sessionsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const session = JSON.parse(content);
          sessions.push(session);
        } catch (error) {
          console.error(`Error reading session file ${file}:`, error);
        }
      }
    }

    // Sort by lastUsed date, most recent first
    sessions.sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    return sessions;
  } catch (error) {
    console.error('Error reading sessions:', error);
    return [];
  }
}

// Read token usage data
export async function getTokenUsage(sessionId?: string): Promise<TokenUsage[]> {
  try {
    const moonlockDir = getMoonlockDir();
    const tokensDir = path.join(moonlockDir, 'tokens');
    
    // Check if tokens directory exists
    try {
      await fs.access(tokensDir);
    } catch {
      return [];
    }

    const files = await fs.readdir(tokensDir);
    const tokenUsage: TokenUsage[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        // If sessionId is provided, only read that session's tokens
        if (sessionId && !file.includes(sessionId)) {
          continue;
        }

        try {
          const filePath = path.join(tokensDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const usage = JSON.parse(content);
          
          // Handle both single usage and array of usages
          if (Array.isArray(usage)) {
            tokenUsage.push(...usage);
          } else {
            tokenUsage.push(usage);
          }
        } catch (error) {
          console.error(`Error reading token file ${file}:`, error);
        }
      }
    }

    // Sort by timestamp, most recent first
    tokenUsage.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return tokenUsage;
  } catch (error) {
    console.error('Error reading token usage:', error);
    return [];
  }
}

// Read the configuration
export async function getConfig(): Promise<Config | null> {
  try {
    const moonlockDir = getMoonlockDir();
    const configPath = path.join(moonlockDir, 'config.json');
    
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
}

// Read the active session
export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    const moonlockDir = getMoonlockDir();
    const activeSessionPath = path.join(moonlockDir, 'active-session');
    
    const content = await fs.readFile(activeSessionPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // No active session is normal
    return null;
  }
}

// Get session by ID
export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const moonlockDir = getMoonlockDir();
    const sessionPath = path.join(moonlockDir, 'sessions', `${sessionId}.json`);
    
    const content = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading session ${sessionId}:`, error);
    return null;
  }
}

// Calculate aggregated statistics
export async function getStatistics() {
  const sessions = await getSessions();
  const tokenUsage = await getTokenUsage();
  
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const totalTokens = tokenUsage.reduce((sum, usage) => sum + usage.total, 0);
  
  // Calculate today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayUsage = tokenUsage.filter(usage => 
    new Date(usage.timestamp) >= today
  ).reduce((sum, usage) => sum + usage.total, 0);
  
  // Calculate this month's usage
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthlyUsage = tokenUsage.filter(usage => 
    new Date(usage.timestamp) >= thisMonth
  ).reduce((sum, usage) => sum + usage.total, 0);
  
  // Group by provider
  const providerUsage = tokenUsage.reduce((acc, usage) => {
    const provider = usage.provider || 'unknown';
    if (!acc[provider]) {
      acc[provider] = { input: 0, output: 0, total: 0 };
    }
    acc[provider].input += usage.input;
    acc[provider].output += usage.output;
    acc[provider].total += usage.total;
    return acc;
  }, {} as Record<string, { input: number; output: number; total: number }>);
  
  return {
    totalSessions,
    activeSessions,
    totalTokens,
    todayUsage,
    monthlyUsage,
    providerUsage,
  };
}