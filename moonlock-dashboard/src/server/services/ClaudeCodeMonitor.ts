/**
 * Claude Code Monitor
 * 
 * Real-time monitoring of ~/.claude/projects/ directory for JSONL session files
 * Extracts precision token metrics and session activity with <2s latency
 * Supports multi-session tracking and 5-hour window management
 */

import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

export interface ClaudeMessage {
  id: string;
  type: 'human' | 'assistant';
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  model?: string;
  timestamp: number;
}

export interface SessionWindow {
  sessionId: string;
  projectId: string;
  startTime: number;
  endTime: number; // startTime + 5 hours
  status: 'active' | 'expired' | 'completed';
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    totalTokens: number;
  };
  costEstimate: number;
  messages: ClaudeMessage[];
  lastActivity: number;
  efficiency: number; // cache_read_tokens / total_input_tokens
  conversationContext?: string;
}

export interface LiveSessionStatus {
  isActive: boolean;
  activeSessionId: string | null;
  activeSince: number | null;
  currentWindow: SessionWindow | null;
  remainingTime: number; // milliseconds remaining in 5-hour window
  conversationContext: string;
  lastMessage: ClaudeMessage | null;
}

export class ClaudeCodeMonitor extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private activeWindows: Map<string, SessionWindow> = new Map();
  private projectsPath: string;
  private isMonitoring: boolean = false;
  private lastActivityCheck: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  
  // Token pricing (approximate rates)
  private static readonly TOKEN_COSTS = {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'default': { input: 0.003, output: 0.015 }
  };

  constructor() {
    super();
    this.projectsPath = path.join(os.homedir(), '.claude', 'projects');
    
    // Check if Claude projects directory exists
    if (!fs.existsSync(this.projectsPath)) {
      console.warn(`Claude projects directory not found: ${this.projectsPath}`);
      // Try alternative paths for Claude Code
      const altPaths = [
        path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'projects'),
        path.join(os.homedir(), '.config', 'claude', 'projects'),
        path.join(os.homedir(), '.claude-code', 'projects'), // Claude Code specific
        path.join(os.homedir(), 'Documents', '.claude', 'projects')
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          this.projectsPath = altPath;
          console.log(`Found Claude projects at: ${altPath}`);
          break;
        }
      }
    }
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Claude Code Monitor already running');
      return;
    }

    try {
      // Ensure projects directory exists
      if (!fs.existsSync(this.projectsPath)) {
        console.warn(`Creating Claude projects directory: ${this.projectsPath}`);
        fs.mkdirSync(this.projectsPath, { recursive: true });
      }

      // Initialize file watcher
      this.watcher = chokidar.watch(
        path.join(this.projectsPath, '**/*.jsonl'),
        {
          persistent: true,
          ignoreInitial: false,
          usePolling: false,
          interval: 100, // Fast polling for real-time updates
          binaryInterval: 300,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
          }
        }
      );

      // Set up event listeners
      this.watcher
        .on('add', this.handleFileAdd.bind(this))
        .on('change', this.handleFileChange.bind(this))
        .on('unlink', this.handleFileDelete.bind(this))
        .on('error', this.handleWatcherError.bind(this));

      // Start activity monitoring
      this.activityCheckInterval = setInterval(() => {
        this.checkSessionActivity();
      }, 1000); // Check every second

      this.isMonitoring = true;
      console.log(`🔍 Claude Code Monitor started - watching: ${this.projectsPath}`);
      
      // Initial scan of existing files
      await this.scanExistingFiles();
      
      this.emit('monitoring-started', { path: this.projectsPath });
      
    } catch (error) {
      console.error('Failed to start Claude Code Monitor:', error);
      throw error;
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    this.isMonitoring = false;
    console.log('🛑 Claude Code Monitor stopped');
    
    this.emit('monitoring-stopped');
  }

  private async scanExistingFiles(): Promise<void> {
    try {
      if (!fs.existsSync(this.projectsPath)) {
        console.log('⚠️ Claude Code projects directory does not exist yet');
        return;
      }
      
      const projects = fs.readdirSync(this.projectsPath);
      let activeSessionsFound = 0;
      
      for (const projectDir of projects) {
        const projectPath = path.join(this.projectsPath, projectDir);
        if (!fs.statSync(projectPath).isDirectory()) continue;

        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
        
        for (const file of files) {
          const filePath = path.join(projectPath, file);
          const stats = fs.statSync(filePath);
          
          // Check if file was modified recently (within last hour)
          const isRecent = (Date.now() - stats.mtimeMs) < (60 * 60 * 1000);
          
          if (isRecent) {
            await this.processSessionFile(filePath);
            activeSessionsFound++;
          }
        }
      }
      
      console.log(`📁 Scanned Claude Code projects: ${activeSessionsFound} recent sessions found`);
      
      if (activeSessionsFound > 0) {
        this.emit('claude-code-sessions-detected', { 
          count: activeSessionsFound,
          timestamp: Date.now() 
        });
      }
    } catch (error) {
      console.error('Error scanning existing files:', error);
    }
  }

  private async handleFileAdd(filePath: string): Promise<void> {
    console.log(`📂 New session file detected: ${filePath}`);
    await this.processSessionFile(filePath);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    console.log(`📝 Session file updated: ${filePath}`);
    await this.processSessionFile(filePath);
  }

  private handleFileDelete(filePath: string): void {
    const sessionId = this.getSessionIdFromPath(filePath);
    if (sessionId && this.activeWindows.has(sessionId)) {
      const window = this.activeWindows.get(sessionId)!;
      window.status = 'completed';
      this.activeWindows.delete(sessionId);
      
      console.log(`🗑️ Session file deleted: ${sessionId}`);
      this.emit('session-ended', { sessionId, window });
    }
  }

  private handleWatcherError(error: Error): void {
    console.error('File watcher error:', error);
    this.emit('error', error);
  }

  private async processSessionFile(filePath: string): Promise<void> {
    try {
      const sessionId = this.getSessionIdFromPath(filePath);
      const projectId = this.getProjectIdFromPath(filePath);
      
      if (!sessionId || !projectId) {
        console.warn(`Invalid session file path: ${filePath}`);
        return;
      }

      // Read and parse JSONL file
      const messages = await this.parseJsonlFile(filePath);
      if (messages.length === 0) return;

      // Get or create session window
      let window = this.activeWindows.get(sessionId);
      const now = Date.now();

      if (!window) {
        // Create new 5-hour window
        const startTime = messages[0].timestamp;
        window = {
          sessionId,
          projectId,
          startTime,
          endTime: startTime + (5 * 60 * 60 * 1000), // 5 hours
          status: 'active',
          tokenUsage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            totalTokens: 0
          },
          costEstimate: 0,
          messages: [],
          lastActivity: now,
          efficiency: 0,
          conversationContext: ''
        };
        
        this.activeWindows.set(sessionId, window);
        console.log(`🆕 New 5-hour session window: ${sessionId}`);
      }

      // Update window with new messages
      window.messages = messages;
      window.lastActivity = now;
      
      // Calculate token usage
      this.calculateTokenUsage(window);
      
      // Calculate efficiency
      this.calculateEfficiency(window);
      
      // Update conversation context
      this.updateConversationContext(window);
      
      // Check if window has expired
      if (now > window.endTime) {
        window.status = 'expired';
        console.log(`⏰ Session window expired: ${sessionId}`);
      } else {
        window.status = 'active';
      }

      // Emit events
      this.emit('session-updated', {
        sessionId,
        window,
        isNew: messages.length === 1
      });

      // Emit live session status
      this.emitLiveSessionStatus();
      
    } catch (error) {
      console.error(`Error processing session file ${filePath}:`, error);
    }
  }

  private async parseJsonlFile(filePath: string): Promise<ClaudeMessage[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const messages: ClaudeMessage[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          // Convert Claude format to our format
          const message: ClaudeMessage = {
            id: data.id || `msg-${Date.now()}-${Math.random()}`,
            type: data.role || data.type || 'human',
            content: this.extractContent(data.content),
            timestamp: data.timestamp || Date.now(),
            model: data.model,
            usage: data.usage
          };

          messages.push(message);
        } catch (parseError) {
          console.warn(`Error parsing JSONL line: ${line.substring(0, 100)}...`);
        }
      }

      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error(`Error reading JSONL file ${filePath}:`, error);
      return [];
    }
  }

  private extractContent(content: any): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map(item => typeof item === 'string' ? item : item.text || '')
        .join(' ');
    }
    if (content && content.text) return content.text;
    return JSON.stringify(content);
  }

  private calculateTokenUsage(window: SessionWindow): void {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;

    for (const message of window.messages) {
      if (message.usage) {
        inputTokens += message.usage.input_tokens || 0;
        outputTokens += message.usage.output_tokens || 0;
        cacheReadTokens += message.usage.cache_read_input_tokens || 0;
        cacheCreationTokens += message.usage.cache_creation_input_tokens || 0;
      }
    }

    window.tokenUsage = {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
      totalTokens: inputTokens + outputTokens
    };

    // Calculate cost estimate
    const model = window.messages[window.messages.length - 1]?.model || 'claude-3.5-sonnet';
    const costs = (ClaudeCodeMonitor.TOKEN_COSTS as any)[model] || ClaudeCodeMonitor.TOKEN_COSTS.default;
    
    window.costEstimate = 
      (inputTokens / 1000) * costs.input +
      (outputTokens / 1000) * costs.output;
  }

  private calculateEfficiency(window: SessionWindow): void {
    const { inputTokens, cacheReadTokens } = window.tokenUsage;
    window.efficiency = inputTokens > 0 ? (cacheReadTokens / inputTokens) * 100 : 0;
  }

  private updateConversationContext(window: SessionWindow): void {
    // Extract context from recent messages
    const recentMessages = window.messages.slice(-3); // Last 3 messages
    const contexts: string[] = [];

    for (const message of recentMessages) {
      if (message.type === 'human') {
        // Extract first few words for context
        const words = message.content.split(' ').slice(0, 8).join(' ');
        contexts.push(words);
      }
    }

    window.conversationContext = contexts.join(' → ') || 'No recent activity';
  }

  private checkSessionActivity(): void {
    const now = Date.now();
    const activeThreshold = 30 * 1000; // 30 seconds
    const idleThreshold = 5 * 60 * 1000; // 5 minutes for idle
    
    // Also check for Claude Code process
    this.checkClaudeCodeProcess();

    for (const [sessionId, window] of this.activeWindows) {
      const timeSinceActivity = now - window.lastActivity;
      const isRecent = timeSinceActivity < activeThreshold;
      const isIdle = timeSinceActivity > idleThreshold;
      
      // Update status based on activity
      if (window.status === 'active') {
        if (isIdle || now > window.endTime) {
          window.status = 'expired';
          this.emit('session-expired', { sessionId, window });
          console.log(`🔴 Claude Code session ${sessionId} expired (idle or timeout)`);
        } else if (!isRecent) {
          // Session is still within window but idle
          this.emit('session-idle', { sessionId, window, idleTime: timeSinceActivity });
        }
      }
    }
    
    // Check if we have any truly active sessions
    const activeSessions = Array.from(this.activeWindows.values()).filter(
      w => w.status === 'active' && (now - w.lastActivity) < activeThreshold
    );
    
    if (activeSessions.length > 0) {
      this.emit('claude-code-active', {
        sessionCount: activeSessions.length,
        sessions: activeSessions.map(s => s.sessionId)
      });
    }

    // Emit updated live session status
    this.emitLiveSessionStatus();
  }
  
  private async checkClaudeCodeProcess(): Promise<void> {
    try {
      // Check if Claude Code process is running
      const { exec } = require('child_process');
      exec('pgrep -f "claude.*code" || pgrep -f "Claude Code" || ps aux | grep -i "claude.*code" | grep -v grep', 
        (error: any, stdout: string) => {
          const isRunning = !error && stdout.trim().length > 0;
          if (isRunning) {
            this.emit('claude-code-process-active', { timestamp: Date.now() });
          }
        }
      );
    } catch (error) {
      // Silently fail - process check is supplementary
    }
  }

  private emitLiveSessionStatus(): void {
    const now = Date.now();
    const activeThreshold = 30 * 1000; // 30 seconds
    
    // Find most recently active session
    let activeWindow: SessionWindow | null = null;
    let mostRecent = 0;

    for (const window of this.activeWindows.values()) {
      if (window.status === 'active' && window.lastActivity > mostRecent) {
        mostRecent = window.lastActivity;
        activeWindow = window;
      }
    }

    const isActive = activeWindow && (now - activeWindow.lastActivity) < activeThreshold;
    
    const status: LiveSessionStatus = {
      isActive: !!isActive,
      activeSessionId: activeWindow?.sessionId || null,
      activeSince: activeWindow?.lastActivity || null,
      currentWindow: activeWindow,
      remainingTime: activeWindow ? Math.max(0, activeWindow.endTime - now) : 0,
      conversationContext: activeWindow?.conversationContext || 'No active conversation',
      lastMessage: activeWindow?.messages[activeWindow.messages.length - 1] || null
    };

    this.emit('live-status', status);
  }

  private getSessionIdFromPath(filePath: string): string | null {
    const fileName = path.basename(filePath, '.jsonl');
    return fileName || null;
  }

  private getProjectIdFromPath(filePath: string): string | null {
    const parts = filePath.split(path.sep);
    const projectsIndex = parts.findIndex(part => part === 'projects');
    return projectsIndex >= 0 && parts[projectsIndex + 1] ? parts[projectsIndex + 1] : null;
  }

  // Public API methods
  getCurrentLiveStatus(): LiveSessionStatus {
    const now = Date.now();
    const activeThreshold = 30 * 1000;
    
    let activeWindow: SessionWindow | null = null;
    let mostRecent = 0;

    for (const window of this.activeWindows.values()) {
      if (window.status === 'active' && window.lastActivity > mostRecent) {
        mostRecent = window.lastActivity;
        activeWindow = window;
      }
    }

    const isActive = activeWindow && (now - activeWindow.lastActivity) < activeThreshold;
    
    return {
      isActive: !!isActive,
      activeSessionId: activeWindow?.sessionId || null,
      activeSince: activeWindow?.lastActivity || null,
      currentWindow: activeWindow,
      remainingTime: activeWindow ? Math.max(0, activeWindow.endTime - now) : 0,
      conversationContext: activeWindow?.conversationContext || 'No active conversation',
      lastMessage: activeWindow?.messages[activeWindow.messages.length - 1] || null
    };
  }

  getAllSessionWindows(): SessionWindow[] {
    return Array.from(this.activeWindows.values());
  }

  getActiveSessionWindows(): SessionWindow[] {
    return Array.from(this.activeWindows.values()).filter(w => w.status === 'active');
  }

  getSessionWindow(sessionId: string): SessionWindow | null {
    return this.activeWindows.get(sessionId) || null;
  }

  getPrecisionTokenMetrics(): {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
    efficiency: number;
    costEstimate: number;
    ratePerMin: number;
  } {
    const activeWindows = this.getActiveSessionWindows();
    
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCost = 0;
    let totalDuration = 0;

    for (const window of activeWindows) {
      totalInput += window.tokenUsage.inputTokens;
      totalOutput += window.tokenUsage.outputTokens;
      totalCacheRead += window.tokenUsage.cacheReadTokens;
      totalCost += window.costEstimate;
      
      const duration = Date.now() - window.startTime;
      totalDuration += duration;
    }

    const totalTokens = totalInput + totalOutput;
    const efficiency = totalInput > 0 ? (totalCacheRead / totalInput) * 100 : 0;
    const ratePerMin = totalDuration > 0 ? (totalTokens / (totalDuration / 60000)) : 0;

    return {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheReadTokens: totalCacheRead,
      totalTokens,
      efficiency,
      costEstimate: totalCost,
      ratePerMin
    };
  }

  getBudgetProgress(): {
    current: number;
    limit: number;
    percentage: number;
    exhaustionTime: number | null;
    savingsFromCache: number;
  } {
    const metrics = this.getPrecisionTokenMetrics();
    const limit = 750000; // 5-hour limit
    const percentage = (metrics.totalTokens / limit) * 100;
    
    // Calculate cache savings (what would have been spent without cache)
    const activeWindows = this.getActiveSessionWindows();
    let wouldBeInputTokens = 0;
    
    for (const window of activeWindows) {
      wouldBeInputTokens += window.tokenUsage.inputTokens + window.tokenUsage.cacheReadTokens;
    }
    
    const savingsFromCache = wouldBeInputTokens - metrics.inputTokens;
    
    // Calculate exhaustion time based on current rate
    let exhaustionTime: number | null = null;
    if (metrics.ratePerMin > 0) {
      const remainingTokens = limit - metrics.totalTokens;
      const remainingMinutes = remainingTokens / metrics.ratePerMin;
      exhaustionTime = Date.now() + (remainingMinutes * 60 * 1000);
    }

    return {
      current: metrics.totalTokens,
      limit,
      percentage,
      exhaustionTime,
      savingsFromCache
    };
  }

  shutdown(): void {
    console.log('🔄 Shutting down Claude Code Monitor...');
    this.stopMonitoring();
    this.activeWindows.clear();
    this.removeAllListeners();
  }
}