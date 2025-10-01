/**
 * Log Monitor
 * Monitors Claude Code log files for session activity
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';

export interface LogEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: 'external' | 'internal';
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  type: 'user' | 'assistant';
  message: Message;
  uuid: string;
  timestamp: string;
  requestId?: string;
  toolUseResult?: ToolResult;
}

export interface Message {
  id?: string;
  type?: string;
  role: 'user' | 'assistant';
  model?: string;
  content: ContentBlock[] | string;
  usage?: Usage;
  stop_reason?: string | null;
  stop_sequence?: string | null;
}

export interface ContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  tool_use_id?: string;
  content?: string;
}

export interface Usage {
  input_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens: number;
  cache_creation?: {
    ephemeral_5m_input_tokens: number;
    ephemeral_1h_input_tokens: number;
  };
  service_tier?: string;
}

export interface ToolResult {
  type?: string;
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  isImage?: boolean;
  file?: {
    filePath: string;
    content: string;
    numLines: number;
    totalLines: number;
  };
}

export interface SessionMetrics {
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  estimatedCost: number;
  toolCalls: number;
  objectivesCompleted: string[];
  messageCount: number;
  startTime: Date;
  lastUpdate: Date;
}

/**
 * Token costs per million tokens
 */
const TOKEN_COSTS = {
  'opus': { input: 15.00, output: 75.00 },
  'sonnet': { input: 3.00, output: 15.00 },
  'haiku': { input: 0.80, output: 4.00 }
} as const;

export class LogMonitor extends EventEmitter {
  private tailProcess: ChildProcess | null = null;
  private logPath: string;
  private metrics: SessionMetrics;
  private isMonitoring = false;
  private model: 'sonnet' | 'opus' | 'haiku';

  constructor(logPath: string, model: 'sonnet' | 'opus' | 'haiku' = 'sonnet') {
    super();
    this.logPath = logPath;
    this.model = model;
    this.metrics = {
      tokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      estimatedCost: 0,
      toolCalls: 0,
      objectivesCompleted: [],
      messageCount: 0,
      startTime: new Date(),
      lastUpdate: new Date()
    };
  }

  /**
   * Start monitoring log file
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('  ⚠️  Log monitor already running');
      return;
    }

    // Verify log file exists
    try {
      await fs.access(this.logPath);
    } catch {
      throw new Error(`Log file does not exist: ${this.logPath}`);
    }

    console.log(`  📋 Monitoring logs: ${this.logPath}`);

    // Use tail -f to follow log file
    this.tailProcess = spawn('tail', [
      '-f',      // Follow mode
      '-n', '0'  // Start from end (skip existing lines)
      , this.logPath
    ]);

    this.tailProcess.stdout?.on('data', (data) => {
      this.processLogChunk(data.toString());
    });

    this.tailProcess.stderr?.on('data', (data) => {
      console.error('  ❌ Log monitor error:', data.toString());
    });

    this.tailProcess.on('close', (code) => {
      this.isMonitoring = false;
      this.emit('monitoring-stopped', { code });
      console.log(`\n  📋 Log monitoring stopped (exit code: ${code})\n`);
    });

    this.tailProcess.on('error', (error) => {
      console.error('  ❌ Tail process error:', error);
      this.emit('monitoring-error', error);
    });

    this.isMonitoring = true;
    this.emit('monitoring-started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.tailProcess) {
      this.tailProcess.kill('SIGTERM');
      this.tailProcess = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Process chunk of log data
   */
  private processLogChunk(chunk: string): void {
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        this.processLogEntry(entry);
      } catch (error) {
        // Not valid JSON, might be plain text output
        this.emit('log-text', line);
      }
    }
  }

  /**
   * Process individual log entry
   */
  private processLogEntry(entry: LogEntry): void {
    this.metrics.lastUpdate = new Date();
    this.metrics.messageCount++;

    this.emit('log-entry', entry);

    // Process based on entry type
    if (entry.type === 'assistant') {
      this.processAssistantMessage(entry);
    } else if (entry.type === 'user') {
      this.processUserMessage(entry);
    }
  }

  /**
   * Process assistant message
   */
  private processAssistantMessage(entry: LogEntry): void {
    const message = entry.message;

    // Track token usage
    if (message.usage) {
      this.updateTokenMetrics(message.usage);
    }

    // Process message content
    const contentArray = Array.isArray(message.content)
      ? message.content
      : [{ type: 'text', text: message.content } as ContentBlock];

    for (const block of contentArray) {
      if (block.type === 'text' && block.text) {
        this.processTextContent(block.text);
      } else if (block.type === 'tool_use') {
        this.processToolUse(block);
      }
    }
  }

  /**
   * Process user message (mainly for tool results)
   */
  private processUserMessage(entry: LogEntry): void {
    if (entry.toolUseResult) {
      this.emit('tool-result', entry.toolUseResult);
    }
  }

  /**
   * Process text content for objective completion markers
   */
  private processTextContent(text: string): void {
    // Emit general text output
    this.emit('assistant-message', text);

    // Check for objective completion markers
    const completionPatterns = [
      /✓\s*(?:Completed|Done|Finished):\s*(.+)/gi,
      /✅\s*(?:Completed|Done|Finished):\s*(.+)/gi
    ];

    for (const pattern of completionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const objective = match[1].trim();

        // Avoid duplicates
        if (!this.metrics.objectivesCompleted.includes(objective)) {
          this.metrics.objectivesCompleted.push(objective);
          this.emit('objective-complete', objective);
          console.log(`  ✅ Objective completed: ${objective}`);
        }
      }
    }
  }

  /**
   * Process tool use
   */
  private processToolUse(toolUse: ContentBlock): void {
    this.metrics.toolCalls++;

    const toolName = toolUse.name || 'Unknown';
    this.emit('tool-use', {
      name: toolName,
      input: toolUse.input,
      id: toolUse.id
    });

    // Could log specific tool types if needed
    // console.log(`  🔧 Tool: ${toolName}`);
  }

  /**
   * Update token metrics from usage data
   */
  private updateTokenMetrics(usage: Usage): void {
    const inputTokens = usage.input_tokens + (usage.cache_creation_input_tokens || 0);
    const outputTokens = usage.output_tokens;
    const cacheTokens = usage.cache_read_input_tokens || 0;

    this.metrics.inputTokens += inputTokens;
    this.metrics.outputTokens += outputTokens;
    this.metrics.cacheTokens += cacheTokens;
    this.metrics.tokensUsed = this.metrics.inputTokens + this.metrics.outputTokens + this.metrics.cacheTokens;

    // Calculate cost
    this.metrics.estimatedCost = this.calculateCost();

    // Emit token update
    this.emit('token-update', {
      total: this.metrics.tokensUsed,
      input: this.metrics.inputTokens,
      output: this.metrics.outputTokens,
      cache: this.metrics.cacheTokens,
      cost: this.metrics.estimatedCost
    });
  }

  /**
   * Calculate estimated cost
   */
  private calculateCost(): number {
    const costs = TOKEN_COSTS[this.model];

    // Input cost (includes cache creation)
    const inputCost = (this.metrics.inputTokens / 1_000_000) * costs.input;

    // Output cost
    const outputCost = (this.metrics.outputTokens / 1_000_000) * costs.output;

    // Cache reads are typically 90% cheaper
    const cacheReadCost = (this.metrics.cacheTokens / 1_000_000) * costs.input * 0.1;

    return inputCost + outputCost + cacheReadCost;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Read entire log file (for completed sessions)
   */
  async readFullLog(): Promise<LogEntry[]> {
    const content = await fs.readFile(this.logPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const entries: LogEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip invalid lines
      }
    }

    return entries;
  }

  /**
   * Analyze completed session from log file
   */
  async analyzeCompletedSession(): Promise<SessionMetrics> {
    const entries = await this.readFullLog();

    // Reset metrics
    this.metrics = {
      tokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      estimatedCost: 0,
      toolCalls: 0,
      objectivesCompleted: [],
      messageCount: entries.length,
      startTime: new Date(entries[0]?.timestamp || Date.now()),
      lastUpdate: new Date(entries[entries.length - 1]?.timestamp || Date.now())
    };

    // Process all entries
    for (const entry of entries) {
      if (entry.type === 'assistant') {
        const message = entry.message;

        if (message.usage) {
          this.updateTokenMetrics(message.usage);
        }

        const contentArray = Array.isArray(message.content)
          ? message.content
          : [{ type: 'text', text: message.content } as ContentBlock];

        for (const block of contentArray) {
          if (block.type === 'text' && block.text) {
            this.processTextContent(block.text);
          } else if (block.type === 'tool_use') {
            this.metrics.toolCalls++;
          }
        }
      }
    }

    return this.getMetrics();
  }
}
