import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Session, TokenUsage, Config } from '../types';

export class StorageService {
  private dataDir: string;
  private configFile: string;
  private sessionsDir: string;
  private tokensDir: string;
  private activeSessionFile: string;
  
  constructor() {
    this.dataDir = path.join(os.homedir(), '.moonlock');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.sessionsDir = path.join(this.dataDir, 'sessions');
    this.tokensDir = path.join(this.dataDir, 'tokens');
    this.activeSessionFile = path.join(this.dataDir, 'active-session');
  }
  
  async init(): Promise<void> {
    // Create directories if they don't exist
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.mkdir(this.tokensDir, { recursive: true });
    
    // Initialize config if it doesn't exist
    if (!await this.fileExists(this.configFile)) {
      await this.saveConfig(this.getDefaultConfig());
    }
  }
  
  // Session storage methods
  async saveSession(session: Session): Promise<void> {
    await this.init();
    const sessionFile = path.join(this.sessionsDir, `${session.id}.json`);
    await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    await this.init();
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    
    if (!await this.fileExists(sessionFile)) {
      return null;
    }
    
    const content = await fs.readFile(sessionFile, 'utf-8');
    const sessionData = JSON.parse(content);
    
    // Convert string dates back to Date objects
    return {
      ...sessionData,
      startTime: new Date(sessionData.startTime),
      endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined
    };
  }
  
  async getAllSessions(): Promise<Session[]> {
    await this.init();
    
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions: Session[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.getSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }
      
      return sessions;
    } catch (error) {
      return [];
    }
  }
  
  async deleteSession(sessionId: string): Promise<boolean> {
    await this.init();
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    
    try {
      await fs.unlink(sessionFile);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async setActiveSession(sessionId: string): Promise<void> {
    await this.init();
    await fs.writeFile(this.activeSessionFile, sessionId);
  }
  
  async getActiveSessionId(): Promise<string | null> {
    await this.init();
    
    if (!await this.fileExists(this.activeSessionFile)) {
      return null;
    }
    
    try {
      const content = await fs.readFile(this.activeSessionFile, 'utf-8');
      return content.trim();
    } catch (error) {
      return null;
    }
  }
  
  async clearActiveSession(): Promise<void> {
    await this.init();
    
    try {
      await fs.unlink(this.activeSessionFile);
    } catch (error) {
      // File might not exist, which is fine
    }
  }
  
  // Token usage storage methods
  async saveTokenUsage(usage: TokenUsage): Promise<void> {
    await this.init();
    const date = usage.timestamp.toISOString().split('T')[0];
    const tokenFile = path.join(this.tokensDir, `${date}.json`);
    
    let usageData: TokenUsage[] = [];
    
    if (await this.fileExists(tokenFile)) {
      const content = await fs.readFile(tokenFile, 'utf-8');
      usageData = JSON.parse(content);
    }
    
    usageData.push(usage);
    await fs.writeFile(tokenFile, JSON.stringify(usageData, null, 2));
  }
  
  async getTokenUsageByDate(date: Date): Promise<TokenUsage[]> {
    await this.init();
    const dateStr = date.toISOString().split('T')[0];
    const tokenFile = path.join(this.tokensDir, `${dateStr}.json`);
    
    if (!await this.fileExists(tokenFile)) {
      return [];
    }
    
    const content = await fs.readFile(tokenFile, 'utf-8');
    const usageData = JSON.parse(content);
    
    // Convert string dates back to Date objects
    return usageData.map((usage: any) => ({
      ...usage,
      timestamp: new Date(usage.timestamp)
    }));
  }
  
  async getTokenUsageByDateRange(startDate: Date, endDate: Date): Promise<TokenUsage[]> {
    await this.init();
    const allUsage: TokenUsage[] = [];
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayUsage = await this.getTokenUsageByDate(currentDate);
      allUsage.push(...dayUsage);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return allUsage;
  }
  
  async deleteTokenUsage(beforeDate: Date): Promise<number> {
    await this.init();
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(this.tokensDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const dateStr = file.replace('.json', '');
          const fileDate = new Date(dateStr);
          
          if (fileDate < beforeDate) {
            await fs.unlink(path.join(this.tokensDir, file));
            deletedCount++;
          }
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return deletedCount;
  }
  
  // Configuration storage methods
  async saveConfig(config: Config): Promise<void> {
    await this.init();
    await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
  }
  
  async getConfig(): Promise<Config> {
    await this.init();
    
    if (!await this.fileExists(this.configFile)) {
      const defaultConfig = this.getDefaultConfig();
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
    
    const content = await fs.readFile(this.configFile, 'utf-8');
    const config = JSON.parse(content);
    
    // Merge with defaults to ensure all properties exist
    return this.mergeWithDefaults(config);
  }
  
  private getDefaultConfig(): Config {
    return {
      tracking: {
        enabled: true,
        autoStart: false,
        saveHistory: true,
        maxHistoryItems: 100
      },
      notifications: {
        quotaWarnings: true,
        sessionReminders: false,
        dailySummary: false
      },
      display: {
        theme: 'auto',
        verbose: false,
        showProgress: true
      }
    };
  }
  
  private mergeWithDefaults(config: Partial<Config>): Config {
    const defaults = this.getDefaultConfig();
    
    return {
      apiEndpoint: config.apiEndpoint,
      tracking: { ...defaults.tracking, ...config.tracking },
      notifications: { ...defaults.notifications, ...config.notifications },
      display: { ...defaults.display, ...config.display }
    };
  }
  
  // Utility methods
  async getDataDir(): Promise<string> {
    await this.init();
    return this.dataDir;
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async cleanup(olderThanDays: number = 30): Promise<{
    sessionsDeleted: number;
    tokenFilesDeleted: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let sessionsDeleted = 0;
    const tokenFilesDeleted = await this.deleteTokenUsage(cutoffDate);
    
    // Clean up old completed sessions
    const sessions = await this.getAllSessions();
    for (const session of sessions) {
      if (session.status === 'completed' && session.endTime && session.endTime < cutoffDate) {
        if (await this.deleteSession(session.id)) {
          sessionsDeleted++;
        }
      }
    }
    
    return { sessionsDeleted, tokenFilesDeleted };
  }
  
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalTokenFiles: number;
    diskUsage: number;
  }> {
    await this.init();
    
    const sessions = await this.getAllSessions();
    
    let totalTokenFiles = 0;
    let diskUsage = 0;
    
    try {
      const tokenFiles = await fs.readdir(this.tokensDir);
      totalTokenFiles = tokenFiles.filter(f => f.endsWith('.json')).length;
      
      // Calculate approximate disk usage
      const sessionFiles = await fs.readdir(this.sessionsDir);
      for (const file of sessionFiles) {
        const stats = await fs.stat(path.join(this.sessionsDir, file));
        diskUsage += stats.size;
      }
      
      for (const file of tokenFiles) {
        const stats = await fs.stat(path.join(this.tokensDir, file));
        diskUsage += stats.size;
      }
      
      // Add config file size
      if (await this.fileExists(this.configFile)) {
        const configStats = await fs.stat(this.configFile);
        diskUsage += configStats.size;
      }
      
    } catch (error) {
      // Ignore errors for stats calculation
    }
    
    return {
      totalSessions: sessions.length,
      totalTokenFiles,
      diskUsage
    };
  }
}