import { 
  AppState, 
  UserPreferences, 
  SessionData, 
  SessionContext,
  ExportFormat,
  ImportData,
  ImportResult,
  ExportResult
} from '../../../contracts/AgentInterfaces.js';

/**
 * Client-side local storage service for the Claude Code Optimizer Dashboard
 * Provides browser localStorage integration with fallback and caching capabilities
 */

export class LocalStorageService {
  private prefix: string = 'claude-code-optimizer-';
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes cache TTL
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(prefix?: string) {
    if (prefix) {
      this.prefix = prefix;
    }
    
    this.initializeService();
  }

  private initializeService(): void {
    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage is not available, using in-memory fallback');
    }

    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), 60000); // Cleanup every minute
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================================================
  // BASIC STORAGE OPERATIONS
  // ============================================================================

  /**
   * Store data in localStorage with optional caching
   */
  setItem<T>(key: string, value: T, useCache: boolean = true): void {
    const storageKey = this.getKey(key);
    const serializedValue = JSON.stringify({
      data: value,
      timestamp: Date.now(),
      version: '1.0.0'
    });

    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.setItem(storageKey, serializedValue);
      }
      
      if (useCache) {
        this.cache.set(key, { data: value, timestamp: Date.now() });
      }
    } catch (error) {
      console.error(`Failed to store item ${key}:`, error);
      // Fallback to cache only
      if (useCache) {
        this.cache.set(key, { data: value, timestamp: Date.now() });
      }
    }
  }

  /**
   * Retrieve data from localStorage with cache fallback
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const storageKey = this.getKey(key);

    try {
      if (this.isLocalStorageAvailable()) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const data = parsed.data !== undefined ? parsed.data : parsed; // Handle both new and old formats
          
          // Update cache
          this.cache.set(key, { data, timestamp: Date.now() });
          return data;
        }
      }
    } catch (error) {
      console.error(`Failed to retrieve item ${key}:`, error);
    }

    return defaultValue || null;
  }

  /**
   * Remove item from localStorage and cache
   */
  removeItem(key: string): void {
    const storageKey = this.getKey(key);
    
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(storageKey);
      }
      this.cache.delete(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    try {
      if (this.isLocalStorageAvailable()) {
        // Remove only our prefixed items
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      this.cache.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  // ============================================================================
  // APPLICATION STATE MANAGEMENT
  // ============================================================================

  /**
   * Save application state
   */
  saveAppState(state: AppState): void {
    this.setItem('app-state', state);
  }

  /**
   * Get application state
   */
  getAppState(): AppState | null {
    return this.getItem<AppState>('app-state');
  }

  /**
   * Save user preferences
   */
  saveUserPreferences(preferences: UserPreferences): void {
    this.setItem('user-preferences', preferences);
  }

  /**
   * Get user preferences with defaults
   */
  getUserPreferences(): UserPreferences {
    return this.getItem<UserPreferences>('user-preferences', {
      defaultModel: 'sonnet',
      defaultSessionDuration: 120,
      autoSave: true,
      autoBackup: true,
      backupFrequency: 24,
      maxStoredSessions: 100,
      dataRetention: 30,
      exportFormat: 'json',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language.split('-')[0],
      analytics: {
        collectUsage: true,
        shareAnonymous: false,
        detailedLogging: false
      }
    })!;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Save session data temporarily (for offline access)
   */
  saveSession(session: SessionData): void {
    const sessions = this.getStoredSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    // Limit stored sessions based on user preferences
    const preferences = this.getUserPreferences();
    if (sessions.length > preferences.maxStoredSessions) {
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      sessions.splice(preferences.maxStoredSessions);
    }
    
    this.setItem('sessions', sessions);
  }

  /**
   * Get all stored sessions
   */
  getStoredSessions(): SessionData[] {
    return this.getItem<SessionData[]>('sessions', [])!;
  }

  /**
   * Get a specific session
   */
  getStoredSession(sessionId: string): SessionData | null {
    const sessions = this.getStoredSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Remove a stored session
   */
  removeStoredSession(sessionId: string): void {
    const sessions = this.getStoredSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    this.setItem('sessions', filtered);
  }

  /**
   * Save session context for offline access
   */
  saveSessionContext(sessionId: string, context: SessionContext): void {
    this.setItem(`session-context-${sessionId}`, context);
  }

  /**
   * Get session context
   */
  getSessionContext(sessionId: string): SessionContext | null {
    return this.getItem<SessionContext>(`session-context-${sessionId}`);
  }

  /**
   * Remove session context
   */
  removeSessionContext(sessionId: string): void {
    this.removeItem(`session-context-${sessionId}`);
  }

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  /**
   * Save search history
   */
  saveSearchHistory(query: string): void {
    const history = this.getSearchHistory();
    
    // Remove if already exists
    const filtered = history.filter(h => h.query !== query);
    
    // Add to beginning
    filtered.unshift({
      query,
      timestamp: Date.now(),
      count: (history.find(h => h.query === query)?.count || 0) + 1
    });
    
    // Limit to 20 items
    const limited = filtered.slice(0, 20);
    
    this.setItem('search-history', limited);
  }

  /**
   * Get search history
   */
  getSearchHistory(): Array<{ query: string; timestamp: number; count: number }> {
    return this.getItem('search-history', [])!;
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.removeItem('search-history');
  }

  /**
   * Save frequently used filters
   */
  saveFilter(name: string, filter: any): void {
    const filters = this.getSavedFilters();
    filters[name] = {
      ...filter,
      savedAt: Date.now(),
      usageCount: (filters[name]?.usageCount || 0) + 1
    };
    this.setItem('saved-filters', filters);
  }

  /**
   * Get saved filters
   */
  getSavedFilters(): Record<string, any> {
    return this.getItem('saved-filters', {})!;
  }

  /**
   * Remove saved filter
   */
  removeSavedFilter(name: string): void {
    const filters = this.getSavedFilters();
    delete filters[name];
    this.setItem('saved-filters', filters);
  }

  // ============================================================================
  // OFFLINE SUPPORT
  // ============================================================================

  /**
   * Queue operations for when online
   */
  queueOfflineOperation(operation: {
    type: string;
    endpoint: string;
    data: any;
    timestamp: number;
  }): void {
    const queue = this.getOfflineQueue();
    queue.push(operation);
    this.setItem('offline-queue', queue);
  }

  /**
   * Get offline operation queue
   */
  getOfflineQueue(): Array<{
    type: string;
    endpoint: string;
    data: any;
    timestamp: number;
  }> {
    return this.getItem('offline-queue', [])!;
  }

  /**
   * Clear offline queue (after successful sync)
   */
  clearOfflineQueue(): void {
    this.removeItem('offline-queue');
  }

  /**
   * Mark data as dirty (needs sync)
   */
  markDirty(key: string): void {
    const dirtyKeys = this.getDirtyKeys();
    if (!dirtyKeys.includes(key)) {
      dirtyKeys.push(key);
      this.setItem('dirty-keys', dirtyKeys);
    }
  }

  /**
   * Get dirty keys that need sync
   */
  getDirtyKeys(): string[] {
    return this.getItem('dirty-keys', [])!;
  }

  /**
   * Mark key as clean (synced)
   */
  markClean(key: string): void {
    const dirtyKeys = this.getDirtyKeys();
    const filtered = dirtyKeys.filter(k => k !== key);
    this.setItem('dirty-keys', filtered);
  }

  // ============================================================================
  // DATA EXPORT/IMPORT
  // ============================================================================

  /**
   * Export all local data
   */
  exportData(format: ExportFormat = 'json'): ExportResult {
    const data: any = {};
    
    // Export app state
    const appState = this.getAppState();
    if (appState) data.appState = appState;
    
    // Export user preferences
    data.userPreferences = this.getUserPreferences();
    
    // Export sessions
    data.sessions = this.getStoredSessions();
    
    // Export search history
    data.searchHistory = this.getSearchHistory();
    
    // Export saved filters
    data.savedFilters = this.getSavedFilters();
    
    // Export offline queue
    data.offlineQueue = this.getOfflineQueue();
    
    // Add metadata
    data.metadata = {
      exportedAt: Date.now(),
      version: '1.0.0',
      userAgent: navigator.userAgent,
      format
    };

    let exportedData: string | ArrayBuffer;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        exportedData = JSON.stringify(data, null, 2);
        filename = `claude-optimizer-export-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      default:
        throw new Error(`Export format ${format} not supported`);
    }

    // Calculate checksum (simple hash)
    const checksum = this.calculateChecksum(exportedData);

    return {
      format,
      data: exportedData,
      filename,
      size: new Blob([exportedData]).size,
      checksum,
      metadata: data.metadata
    };
  }

  /**
   * Import data into local storage
   */
  importData(importData: ImportData): ImportResult {
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
        data = typeof importData.data === 'string' 
          ? JSON.parse(importData.data) 
          : importData.data;
      } else {
        throw new Error(`Import format ${importData.format} not supported`);
      }

      // Import app state
      if (data.appState) {
        this.saveAppState(data.appState);
        result.imported.appState = true;
      }

      // Import user preferences
      if (data.userPreferences) {
        this.saveUserPreferences(data.userPreferences);
        result.imported.userPreferences = true;
      }

      // Import sessions
      if (data.sessions && Array.isArray(data.sessions)) {
        const existingSessions = this.getStoredSessions();
        const existingIds = new Set(existingSessions.map(s => s.id));

        for (const session of data.sessions) {
          if (existingIds.has(session.id) && importData.options?.skipDuplicates) {
            result.duplicatesSkipped++;
          } else {
            this.saveSession(session);
            result.imported.sessions++;
          }
        }
      }

      // Import search history
      if (data.searchHistory && Array.isArray(data.searchHistory)) {
        for (const item of data.searchHistory) {
          // Merge with existing history
          this.saveSearchHistory(item.query);
        }
      }

      // Import saved filters
      if (data.savedFilters && typeof data.savedFilters === 'object') {
        Object.entries(data.savedFilters).forEach(([name, filter]) => {
          this.saveFilter(name, filter);
        });
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
    }

    return result;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    used: number;
    available: number;
    itemCount: number;
    cacheSize: number;
  } {
    let used = 0;
    let itemCount = 0;

    if (this.isLocalStorageAvailable()) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          used += (key.length + (value?.length || 0)) * 2; // Rough byte estimate
          itemCount++;
        }
      }
    }

    return {
      used,
      available: this.isLocalStorageAvailable() ? 5 * 1024 * 1024 - used : 0, // Estimate 5MB limit
      itemCount,
      cacheSize: this.cache.size
    };
  }

  /**
   * Cleanup old data based on retention settings
   */
  cleanup(): void {
    const preferences = this.getUserPreferences();
    const retentionMs = preferences.dataRetention * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;

    // Clean up old sessions
    const sessions = this.getStoredSessions();
    const recentSessions = sessions.filter(s => s.updatedAt > cutoffTime);
    this.setItem('sessions', recentSessions);

    // Clean up old search history
    const searchHistory = this.getSearchHistory();
    const recentSearches = searchHistory.filter(s => s.timestamp > cutoffTime);
    this.setItem('search-history', recentSearches);

    // Clean up cache
    this.cleanupCache();
  }

  /**
   * Get all keys with prefix
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    
    if (this.isLocalStorageAvailable()) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.replace(this.prefix, ''));
        }
      }
    }

    // Add cache keys
    for (const key of this.cache.keys()) {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    }

    return keys.sort();
  }

  /**
   * Simple checksum calculation
   */
  private calculateChecksum(data: string | ArrayBuffer): string {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Download data as file
   */
  downloadAsFile(data: string | ArrayBuffer, filename: string, mimeType: string = 'application/octet-stream'): void {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
export const localStorageService = new LocalStorageService();