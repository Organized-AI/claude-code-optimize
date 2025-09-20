/**
 * Hook Logging Service
 * 
 * Tracks and logs Claude Code hook activities including:
 * - Hook creation events from rule2hook framework
 * - Hook execution events (success/failure/duration)
 * - Hook modification history
 * - Performance metrics and analytics
 */

import { promises as fs } from 'fs';
import path from 'path';
import { JsonDatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { watch } from 'fs';

export interface HookLogEntry {
  id: string;
  hookId: string;
  hookName: string;
  event: 'created' | 'executed' | 'modified' | 'disabled' | 'enabled';
  status: 'success' | 'failure' | 'blocked' | 'pending';
  source: 'rule2hook' | 'manual' | 'system' | 'claude-code';
  command?: string;
  duration?: number;
  output?: string;
  error?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface HookDefinition {
  id: string;
  name: string;
  type: string;
  matcher?: string;
  command: string;
  enabled: boolean;
  createdAt: number;
  lastExecuted?: number;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  source: 'rule2hook' | 'manual';
}

export interface HookStats {
  totalHooks: number;
  activeHooks: number;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  hooksByType: Record<string, number>;
  hooksBySource: Record<string, number>;
  recentActivity: HookLogEntry[];
}

export class HookLoggingService {
  private database: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private hookFilePath: string;
  private logFilePath: string;
  private fileWatcher?: ReturnType<typeof watch>;
  private isWatching: boolean = false;

  constructor(database: JsonDatabaseManager, wsManager: WebSocketManager) {
    this.database = database;
    this.wsManager = wsManager;
    
    // Claude Code hooks file location
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.hookFilePath = path.join(homeDir, '.claude', 'hooks.json');
    this.logFilePath = path.join(process.cwd(), 'data', 'hook-logs.json');
  }

  /**
   * Initialize hook logging service
   */
  async initialize(): Promise<void> {
    try {
      // Ensure log file exists
      await this.ensureLogFile();
      
      // Start monitoring hooks file
      await this.startHookFileMonitoring();
      
      // Load existing hooks
      await this.syncExistingHooks();
      
      console.log('✅ Hook Logging Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Hook Logging Service:', error);
      throw error;
    }
  }

  /**
   * Ensure hook log file exists
   */
  private async ensureLogFile(): Promise<void> {
    try {
      const dataDir = path.dirname(this.logFilePath);
      await fs.mkdir(dataDir, { recursive: true });
      
      try {
        await fs.access(this.logFilePath);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(this.logFilePath, JSON.stringify({ logs: [], hooks: [] }, null, 2));
      }
    } catch (error) {
      console.error('❌ Failed to ensure log file:', error);
    }
  }

  /**
   * Start monitoring Claude Code hooks file for changes
   */
  private async startHookFileMonitoring(): Promise<void> {
    if (this.isWatching) return;

    try {
      // Check if hooks file exists
      const hooksDir = path.dirname(this.hookFilePath);
      await fs.mkdir(hooksDir, { recursive: true });
      
      try {
        await fs.access(this.hookFilePath);
      } catch {
        // Create empty hooks file if it doesn't exist
        await fs.writeFile(this.hookFilePath, JSON.stringify({ hooks: {} }, null, 2));
      }

      // Watch for changes to hooks file
      this.fileWatcher = watch(this.hookFilePath, { persistent: false }, async (eventType) => {
        if (eventType === 'change') {
          console.log('🔍 Detected hooks file change, processing...');
          await this.processHookFileChanges();
        }
      });

      this.isWatching = true;
      console.log('👀 Started monitoring Claude Code hooks file');
    } catch (error) {
      console.error('❌ Failed to start hook file monitoring:', error);
    }
  }

  /**
   * Process changes to hooks file
   */
  private async processHookFileChanges(): Promise<void> {
    try {
      const currentHooks = await this.readHooksFile();
      const existingHooks = await this.getStoredHooks();
      
      // Detect new hooks
      const newHooks = this.detectNewHooks(currentHooks, existingHooks);
      const modifiedHooks = this.detectModifiedHooks(currentHooks, existingHooks);
      const removedHooks = this.detectRemovedHooks(currentHooks, existingHooks);

      // Log hook events
      for (const hook of newHooks) {
        await this.logHookEvent({
          id: this.generateLogId(),
          hookId: hook.id,
          hookName: hook.name,
          event: 'created',
          status: 'success',
          source: this.detectHookSource(hook),
          command: hook.command,
          timestamp: Date.now(),
          metadata: { type: hook.type, matcher: hook.matcher }
        });
      }

      for (const hook of modifiedHooks) {
        await this.logHookEvent({
          id: this.generateLogId(),
          hookId: hook.id,
          hookName: hook.name,
          event: 'modified',
          status: 'success',
          source: 'manual',
          command: hook.command,
          timestamp: Date.now(),
          metadata: { type: hook.type, matcher: hook.matcher }
        });
      }

      for (const hook of removedHooks) {
        await this.logHookEvent({
          id: this.generateLogId(),
          hookId: hook.id,
          hookName: hook.name,
          event: 'disabled',
          status: 'success',
          source: 'manual',
          timestamp: Date.now()
        });
      }

      // Update stored hooks
      await this.updateStoredHooks(currentHooks);

      // Broadcast updates
      this.wsManager.broadcast('hook-activity-update', {
        newHooks: newHooks.length,
        modifiedHooks: modifiedHooks.length,
        removedHooks: removedHooks.length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Failed to process hook file changes:', error);
    }
  }

  /**
   * Read hooks from Claude Code hooks file
   */
  private async readHooksFile(): Promise<HookDefinition[]> {
    try {
      const content = await fs.readFile(this.hookFilePath, 'utf-8');
      const hooksData = JSON.parse(content);
      
      return this.parseHooksFromFile(hooksData);
    } catch (error) {
      console.error('❌ Failed to read hooks file:', error);
      return [];
    }
  }

  /**
   * Parse hooks from Claude Code format to our format
   */
  private parseHooksFromFile(hooksData: any): HookDefinition[] {
    const hooks: HookDefinition[] = [];
    
    if (!hooksData.hooks) return hooks;

    for (const [eventType, eventHooks] of Object.entries(hooksData.hooks)) {
      if (!Array.isArray(eventHooks)) continue;
      
      eventHooks.forEach((hookGroup: any, index: number) => {
        if (hookGroup.hooks && Array.isArray(hookGroup.hooks)) {
          hookGroup.hooks.forEach((hook: any, hookIndex: number) => {
            const hookId = `${eventType}_${index}_${hookIndex}`;
            const hookName = hook.name || `${eventType} Hook ${index + 1}`;
            
            hooks.push({
              id: hookId,
              name: hookName,
              type: eventType,
              matcher: hookGroup.matcher,
              command: hook.command || '',
              enabled: true,
              createdAt: Date.now(),
              executionCount: 0,
              successCount: 0,
              failureCount: 0,
              averageDuration: 0,
              source: this.detectHookSourceFromCommand(hook.command || '')
            });
          });
        }
      });
    }

    return hooks;
  }

  /**
   * Detect hook source based on command patterns
   */
  private detectHookSourceFromCommand(command: string): 'rule2hook' | 'manual' {
    // Simple heuristics to detect rule2hook generated hooks
    const rule2hookPatterns = [
      /^black\s+/,
      /^prettier\s+/,
      /^npm\s+(test|run|start)/,
      /^git\s+(status|add|commit)/
    ];

    return rule2hookPatterns.some(pattern => pattern.test(command.trim())) ? 'rule2hook' : 'manual';
  }

  /**
   * Log a hook event
   */
  async logHookEvent(entry: HookLogEntry): Promise<void> {
    try {
      const logData = await this.readLogFile();
      logData.logs.unshift(entry);
      
      // Keep only last 1000 entries
      if (logData.logs.length > 1000) {
        logData.logs = logData.logs.slice(0, 1000);
      }

      await fs.writeFile(this.logFilePath, JSON.stringify(logData, null, 2));
      
      // Broadcast real-time update
      this.wsManager.broadcast('hook-log-update', entry);
      
      console.log(`📝 Logged hook event: ${entry.hookName} - ${entry.event} (${entry.status})`);
    } catch (error) {
      console.error('❌ Failed to log hook event:', error);
    }
  }

  /**
   * Get recent hook logs
   */
  async getRecentLogs(limit: number = 50): Promise<HookLogEntry[]> {
    try {
      const logData = await this.readLogFile();
      return logData.logs.slice(0, limit);
    } catch (error) {
      console.error('❌ Failed to get recent logs:', error);
      return [];
    }
  }

  /**
   * Get hook statistics
   */
  async getHookStats(): Promise<HookStats> {
    try {
      const logData = await this.readLogFile();
      const hooks = logData.hooks || [];
      const logs = logData.logs || [];

      const recentLogs = logs.slice(0, 20);
      const executionLogs = logs.filter(log => log.event === 'executed');
      const successfulExecutions = executionLogs.filter(log => log.status === 'success');

      const hooksByType: Record<string, number> = {};
      const hooksBySource: Record<string, number> = {};

      hooks.forEach((hook: HookDefinition) => {
        hooksByType[hook.type] = (hooksByType[hook.type] || 0) + 1;
        hooksBySource[hook.source] = (hooksBySource[hook.source] || 0) + 1;
      });

      const totalExecutions = executionLogs.length;
      const successRate = totalExecutions > 0 ? (successfulExecutions.length / totalExecutions) * 100 : 100;
      
      const totalDuration = executionLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const averageExecutionTime = totalExecutions > 0 ? totalDuration / totalExecutions : 0;

      return {
        totalHooks: hooks.length,
        activeHooks: hooks.filter((h: HookDefinition) => h.enabled).length,
        totalExecutions,
        successRate,
        averageExecutionTime,
        hooksByType,
        hooksBySource,
        recentActivity: recentLogs
      };
    } catch (error) {
      console.error('❌ Failed to get hook stats:', error);
      return {
        totalHooks: 0,
        activeHooks: 0,
        totalExecutions: 0,
        successRate: 100,
        averageExecutionTime: 0,
        hooksByType: {},
        hooksBySource: {},
        recentActivity: []
      };
    }
  }

  /**
   * Get stored hooks
   */
  private async getStoredHooks(): Promise<HookDefinition[]> {
    try {
      const logData = await this.readLogFile();
      return logData.hooks || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Update stored hooks
   */
  private async updateStoredHooks(hooks: HookDefinition[]): Promise<void> {
    try {
      const logData = await this.readLogFile();
      logData.hooks = hooks;
      await fs.writeFile(this.logFilePath, JSON.stringify(logData, null, 2));
    } catch (error) {
      console.error('❌ Failed to update stored hooks:', error);
    }
  }

  /**
   * Read log file
   */
  private async readLogFile(): Promise<{ logs: HookLogEntry[], hooks: HookDefinition[] }> {
    try {
      const content = await fs.readFile(this.logFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { logs: [], hooks: [] };
    }
  }

  /**
   * Sync existing hooks on startup
   */
  private async syncExistingHooks(): Promise<void> {
    try {
      const currentHooks = await this.readHooksFile();
      await this.updateStoredHooks(currentHooks);
      console.log(`🔄 Synced ${currentHooks.length} existing hooks`);
    } catch (error) {
      console.error('❌ Failed to sync existing hooks:', error);
    }
  }

  /**
   * Detect new hooks
   */
  private detectNewHooks(current: HookDefinition[], existing: HookDefinition[]): HookDefinition[] {
    const existingIds = new Set(existing.map(h => h.id));
    return current.filter(h => !existingIds.has(h.id));
  }

  /**
   * Detect modified hooks
   */
  private detectModifiedHooks(current: HookDefinition[], existing: HookDefinition[]): HookDefinition[] {
    const existingMap = new Map(existing.map(h => [h.id, h]));
    return current.filter(h => {
      const existingHook = existingMap.get(h.id);
      return existingHook && (
        existingHook.command !== h.command ||
        existingHook.matcher !== h.matcher ||
        existingHook.enabled !== h.enabled
      );
    });
  }

  /**
   * Detect removed hooks
   */
  private detectRemovedHooks(current: HookDefinition[], existing: HookDefinition[]): HookDefinition[] {
    const currentIds = new Set(current.map(h => h.id));
    return existing.filter(h => !currentIds.has(h.id));
  }

  /**
   * Detect hook source
   */
  private detectHookSource(hook: HookDefinition): 'rule2hook' | 'manual' {
    return hook.source || this.detectHookSourceFromCommand(hook.command);
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record hook execution
   */
  async recordHookExecution(hookId: string, hookName: string, command: string, 
                           result: { success: boolean, duration: number, output?: string, error?: string }): Promise<void> {
    await this.logHookEvent({
      id: this.generateLogId(),
      hookId,
      hookName,
      event: 'executed',
      status: result.success ? 'success' : 'failure',
      source: 'claude-code',
      command,
      duration: result.duration,
      output: result.output,
      error: result.error,
      timestamp: Date.now()
    });
  }

  /**
   * Shutdown hook logging service
   */
  shutdown(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.isWatching = false;
      console.log('🔴 Hook Logging Service shut down');
    }
  }
}