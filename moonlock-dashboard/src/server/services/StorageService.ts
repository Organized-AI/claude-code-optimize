import { 
  StorageAPI, 
  SessionData, 
  SessionContext, 
  DetailedQuotaUsage, 
  QuotaHistoryEntry, 
  QuotaAnalytics, 
  AppState, 
  UserPreferences,
  AnalyticsEvent,
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsReport,
  BackupManifest,
  IntegrityReport,
  SearchQuery,
  AnalyticsSearchQuery,
  ExportResult,
  ImportData,
  ImportResult,
  SessionFilter,
  DataFilter,
  QuotaPeriod,
  ReportType,
  ExportFormat
} from '../../contracts/AgentInterfaces.js';
import { SessionStorageService } from './SessionStorageService.js';
import { QuotaStorageService } from './QuotaStorageService.js';
import { BackupService } from './BackupService.js';
import { AnalyticsService } from './AnalyticsService.js';
import { DatabaseManager } from './DatabaseManager.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Core data persistence engine implementing the StorageAPI interface
 * Acts as the central coordinator for all storage operations
 */
export class StorageService implements StorageAPI {
  private sessionStorage: SessionStorageService;
  private quotaStorage: QuotaStorageService;
  private backupService: BackupService;
  private analyticsService: AnalyticsService;
  private dbManager: DatabaseManager;
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || join(process.cwd(), 'data');
    
    // Ensure data directory exists
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true });
    }

    // Initialize database manager
    this.dbManager = new DatabaseManager(join(this.dataPath, 'moonlock.db'));

    // Initialize specialized services
    this.sessionStorage = new SessionStorageService(this.dbManager, this.dataPath);
    this.quotaStorage = new QuotaStorageService(this.dbManager, this.dataPath);
    this.backupService = new BackupService(this.dataPath);
    this.analyticsService = new AnalyticsService(this.dbManager, this.dataPath);
  }

  // Session storage methods
  async saveSession(session: SessionData): Promise<void> {
    return this.sessionStorage.saveSession(session);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.sessionStorage.getSession(sessionId);
  }

  async getAllSessions(filter?: SessionFilter): Promise<SessionData[]> {
    return this.sessionStorage.getAllSessions(filter);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.sessionStorage.deleteSession(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    return this.sessionStorage.updateSession(sessionId, updates);
  }

  // Session context methods
  async saveSessionContext(sessionId: string, context: SessionContext): Promise<void> {
    return this.sessionStorage.saveSessionContext(sessionId, context);
  }

  async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    return this.sessionStorage.getSessionContext(sessionId);
  }

  async deleteSessionContext(sessionId: string): Promise<void> {
    return this.sessionStorage.deleteSessionContext(sessionId);
  }

  // Quota tracking methods
  async saveQuotaUsage(usage: DetailedQuotaUsage): Promise<void> {
    return this.quotaStorage.saveQuotaUsage(usage);
  }

  async getQuotaUsage(period?: QuotaPeriod): Promise<DetailedQuotaUsage> {
    return this.quotaStorage.getQuotaUsage(period);
  }

  async getQuotaHistory(period: QuotaPeriod): Promise<QuotaHistoryEntry[]> {
    return this.quotaStorage.getQuotaHistory(period);
  }

  async getQuotaAnalytics(): Promise<QuotaAnalytics> {
    return this.quotaStorage.getQuotaAnalytics();
  }

  // Application state methods
  async saveAppState(state: AppState): Promise<void> {
    const filePath = join(this.dataPath, 'app-state.json');
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(state, null, 2));
  }

  async getAppState(): Promise<AppState | null> {
    const filePath = join(this.dataPath, 'app-state.json');
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    const filePath = join(this.dataPath, 'user-preferences.json');
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(preferences, null, 2));
  }

  async getUserPreferences(): Promise<UserPreferences> {
    const filePath = join(this.dataPath, 'user-preferences.json');
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return default preferences
      return {
        defaultModel: 'sonnet',
        defaultSessionDuration: 120, // 2 hours
        autoSave: true,
        autoBackup: true,
        backupFrequency: 24, // daily
        maxStoredSessions: 1000,
        dataRetention: 90, // 90 days
        exportFormat: 'json',
        timezone: 'UTC',
        language: 'en',
        analytics: {
          collectUsage: true,
          shareAnonymous: false,
          detailedLogging: true
        }
      };
    }
  }

  // Analytics methods
  async saveAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    return this.analyticsService.saveEvent(event);
  }

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    return this.analyticsService.getAnalytics(query);
  }

  async generateReport(type: ReportType, period: QuotaPeriod): Promise<AnalyticsReport> {
    return this.analyticsService.generateReport(type, period);
  }

  // Backup and recovery methods
  async createBackup(): Promise<BackupManifest> {
    const manifest = await this.backupService.createBackup();
    
    // Log the backup creation
    await this.saveAnalyticsEvent({
      id: `backup_${Date.now()}`,
      type: 'system_event',
      timestamp: Date.now(),
      data: { backupId: manifest.id, size: manifest.size },
      tags: ['backup', 'system']
    });

    return manifest;
  }

  async restoreBackup(backupId: string): Promise<void> {
    await this.backupService.restoreBackup(backupId);
    
    // Log the restore operation
    await this.saveAnalyticsEvent({
      id: `restore_${Date.now()}`,
      type: 'system_event',
      timestamp: Date.now(),
      data: { backupId },
      tags: ['restore', 'system']
    });
  }

  async listBackups(): Promise<BackupManifest[]> {
    return this.backupService.listBackups();
  }

  async deleteBackup(backupId: string): Promise<void> {
    await this.backupService.deleteBackup(backupId);
  }

  async validateDataIntegrity(): Promise<IntegrityReport> {
    return this.backupService.validateDataIntegrity();
  }

  // Search methods
  async searchSessions(query: SearchQuery): Promise<SessionData[]> {
    return this.sessionStorage.searchSessions(query);
  }

  async searchAnalytics(query: AnalyticsSearchQuery): Promise<AnalyticsEvent[]> {
    return this.analyticsService.searchEvents(query);
  }

  // Export and import methods
  async exportData(format: ExportFormat, filter?: DataFilter): Promise<ExportResult> {
    const timestamp = Date.now();
    const data: any = {};

    // Collect data based on filter
    if (!filter || filter.includeSessions !== false) {
      data.sessions = await this.getAllSessions();
    }

    if (!filter || filter.includeQuotaData !== false) {
      data.quotaData = await this.getQuotaHistory('month');
    }

    if (!filter || filter.includeAnalytics !== false) {
      const analyticsQuery: AnalyticsQuery = {
        timeRange: filter?.dateRange || { start: 0, end: timestamp }
      };
      const analyticsResult = await this.getAnalytics(analyticsQuery);
      data.analytics = analyticsResult.events;
    }

    if (!filter || filter.includeAppState !== false) {
      data.appState = await this.getAppState();
      data.userPreferences = await this.getUserPreferences();
    }

    // Add metadata
    data.metadata = {
      exportedAt: timestamp,
      version: '1.0.0',
      format,
      filter
    };

    let exportedData: string | Buffer;
    let filename: string;

    switch (format) {
      case 'json':
        exportedData = JSON.stringify(data, null, 2);
        filename = `moonlock-export-${timestamp}.json`;
        break;
      case 'csv':
        // Convert sessions to CSV format
        exportedData = this.convertToCSV(data.sessions || []);
        filename = `moonlock-sessions-${timestamp}.csv`;
        break;
      default:
        throw new Error(`Export format ${format} not yet implemented`);
    }

    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(exportedData).digest('hex');

    return {
      format,
      data: exportedData,
      filename,
      size: Buffer.byteLength(exportedData),
      checksum,
      metadata: data.metadata
    };
  }

  async importData(importData: ImportData): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: {
        sessions: 0,
        quotaData: 0,
        analyticsEvents: 0,
        appState: false,
        userPreferences: false
      },
      errors: [],
      warnings: [],
      duplicatesSkipped: 0
    };

    try {
      let data: any;

      if (importData.format === 'json') {
        data = JSON.parse(importData.data.toString());
      } else {
        throw new Error(`Import format ${importData.format} not yet implemented`);
      }

      // Import sessions
      if (data.sessions && Array.isArray(data.sessions)) {
        for (const session of data.sessions) {
          try {
            const existing = await this.getSession(session.id);
            if (existing && importData.options?.skipDuplicates) {
              result.duplicatesSkipped++;
              continue;
            }
            await this.saveSession(session);
            result.imported.sessions++;
          } catch (error) {
            result.errors.push(`Failed to import session ${session.id}: ${error}`);
          }
        }
      }

      // Import app state
      if (data.appState) {
        try {
          await this.saveAppState(data.appState);
          result.imported.appState = true;
        } catch (error) {
          result.errors.push(`Failed to import app state: ${error}`);
        }
      }

      // Import user preferences
      if (data.userPreferences) {
        try {
          await this.saveUserPreferences(data.userPreferences);
          result.imported.userPreferences = true;
        } catch (error) {
          result.errors.push(`Failed to import user preferences: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
    }

    return result;
  }

  // Utility methods
  private convertToCSV(sessions: SessionData[]): string {
    if (sessions.length === 0) return '';

    const headers = [
      'id', 'name', 'startTime', 'endTime', 'duration', 'status', 
      'model', 'tokensUsed', 'tokenBudget', 'createdAt', 'updatedAt'
    ];

    const rows = sessions.map(session => [
      session.id,
      session.name || '',
      new Date(session.startTime).toISOString(),
      session.endTime ? new Date(session.endTime).toISOString() : '',
      session.duration,
      session.status,
      session.model,
      session.tokensUsed,
      session.tokenBudget || '',
      new Date(session.createdAt).toISOString(),
      new Date(session.updatedAt).toISOString()
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    const preferences = await this.getUserPreferences();
    const retentionPeriod = preferences.dataRetention * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const cutoffTime = Date.now() - retentionPeriod;

    // Clean up old sessions
    const oldSessions = await this.getAllSessions({
      dateRange: { start: 0, end: cutoffTime }
    });

    for (const session of oldSessions) {
      await this.deleteSession(session.id);
    }

    // Clean up old analytics events
    await this.analyticsService.cleanup(cutoffTime);

    // Clean up old backups
    await this.backupService.cleanup();
  }

  async shutdown(): Promise<void> {
    // Perform final cleanup
    await this.cleanup();
    
    // Close database connections
    this.dbManager.close();
  }
}