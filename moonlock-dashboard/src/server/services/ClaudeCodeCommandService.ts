import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { WebSocketManager } from './WebSocketManager.js';
import { JsonDatabaseManager } from './JsonDatabaseManager.js';

export interface SlashCommand {
  command: string;
  args?: string[];
  description: string;
  category: 'built-in' | 'custom' | 'mcp';
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  timestamp: number;
  sessionId?: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  command?: string;
  output?: string;
  error?: string;
  timestamp?: number;
  duration?: number;
}

export interface PlanModeSession {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  autoExecute: boolean;
}

export class ClaudeCodeCommandService extends EventEmitter {
  private db: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private planSessions: Map<string, PlanModeSession> = new Map();
  private commandHistory: CommandResult[] = [];
  private availableCommands: SlashCommand[] = [];

  constructor(db: JsonDatabaseManager, wsManager: WebSocketManager) {
    super();
    this.db = db;
    this.wsManager = wsManager;
    this.initializeBuiltInCommands();
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing Claude Code Command Service...');
    
    await this.discoverAvailableCommands();
    await this.loadCommandHistory();
    
    console.log(`✅ Claude Code Command Service initialized with ${this.availableCommands.length} commands`);
  }

  private initializeBuiltInCommands(): void {
    this.availableCommands = [
      { command: '/help', description: 'Show help information', category: 'built-in' },
      { command: '/config', description: 'View/modify configuration', category: 'built-in' },
      { command: '/model', description: 'Select AI model', category: 'built-in' },
      { command: '/add-dir', args: ['path'], description: 'Add working directory', category: 'built-in' },
      { command: '/clear', description: 'Clear conversation history', category: 'built-in' },
      { command: '/review', description: 'Request code review', category: 'built-in' },
      { command: '/agents', description: 'Manage AI subagents', category: 'built-in' },
      { command: '/bug', description: 'Report issues to Anthropic', category: 'built-in' }
    ];
  }

  private async discoverAvailableCommands(): Promise<void> {
    try {
      const result = await this.executeCommand('/help', [], 'system');
      if (result.success) {
        this.parseHelpOutput(result.output);
      }
    } catch (error) {
      console.warn('⚠️ Could not discover Claude Code commands:', error);
    }
  }

  private parseHelpOutput(output: string): void {
    const lines = output.split('\n');
    const commands: SlashCommand[] = [];
    
    for (const line of lines) {
      const commandMatch = line.match(/^\s*\/(\w+)(?:\s+(.+?))?\s*-\s*(.+)$/);
      if (commandMatch) {
        const [, command, args, description] = commandMatch;
        commands.push({
          command: `/${command}`,
          args: args ? args.split(/\s+/) : undefined,
          description: description.trim(),
          category: 'built-in'
        });
      }
    }
    
    if (commands.length > 0) {
      this.availableCommands = commands;
    }
  }

  async executeCommand(command: string, args: string[] = [], sessionId?: string): Promise<CommandResult> {
    const startTime = Date.now();
    const processId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔧 Executing command: ${command} ${args.join(' ')}`);
    
    try {
      const result = await this.runClaudeCodeCommand(command, args, processId, sessionId);
      const duration = Date.now() - startTime;
      
      const commandResult: CommandResult = {
        success: result.success,
        output: result.output,
        error: result.error,
        duration,
        command: `${command} ${args.join(' ')}`.trim(),
        timestamp: startTime,
        sessionId
      };
      
      this.commandHistory.push(commandResult);
      await this.saveCommandHistory();
      
      this.wsManager.broadcast('claude-command-result', {
        type: 'command-completed',
        result: commandResult,
        sessionId
      });
      
      this.emit('commandCompleted', commandResult);
      
      return commandResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const commandResult: CommandResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        command: `${command} ${args.join(' ')}`.trim(),
        timestamp: startTime,
        sessionId
      };
      
      this.commandHistory.push(commandResult);
      await this.saveCommandHistory();
      
      this.wsManager.broadcast('claude-command-result', {
        type: 'command-failed',
        result: commandResult,
        sessionId
      });
      
      this.emit('commandFailed', commandResult);
      
      return commandResult;
    }
  }

  private async runClaudeCodeCommand(
    command: string, 
    args: string[], 
    processId: string, 
    sessionId?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve, reject) => {
      const commandParts = command.startsWith('/') ? [command.slice(1)] : [command];
      const fullArgs = [...commandParts, ...args];
      
      const claudeProcess = spawn('claude', fullArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_SESSION_ID: sessionId || 'dashboard',
        }
      });
      
      this.runningProcesses.set(processId, claudeProcess);
      
      let stdout = '';
      let stderr = '';
      
      claudeProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        this.wsManager.broadcast('claude-command-stream', {
          type: 'stdout',
          data: chunk,
          processId,
          sessionId
        });
      });
      
      claudeProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        
        this.wsManager.broadcast('claude-command-stream', {
          type: 'stderr',
          data: chunk,
          processId,
          sessionId
        });
      });
      
      claudeProcess.on('close', (code) => {
        this.runningProcesses.delete(processId);
        
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, output: stdout, error: stderr });
        }
      });
      
      claudeProcess.on('error', (error) => {
        this.runningProcesses.delete(processId);
        reject(error);
      });
      
      setTimeout(() => {
        if (this.runningProcesses.has(processId)) {
          claudeProcess.kill('SIGTERM');
          this.runningProcesses.delete(processId);
          reject(new Error('Command timeout after 30 seconds'));
        }
      }, 30000);
    });
  }

  async createPlanModeSession(
    title: string, 
    description: string, 
    steps: Omit<PlanStep, 'id' | 'status' | 'timestamp'>[], 
    autoExecute: boolean = false
  ): Promise<PlanModeSession> {
    const sessionId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: PlanModeSession = {
      id: sessionId,
      title,
      description,
      steps: steps.map((step, index) => ({
        ...step,
        id: `step-${index + 1}`,
        status: 'pending' as const
      })),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      autoExecute
    };
    
    this.planSessions.set(sessionId, session);
    await this.savePlanSessions();
    
    this.wsManager.broadcast('plan-mode-update', {
      type: 'session-created',
      session
    });
    
    if (autoExecute) {
      await this.executePlanModeSession(sessionId);
    }
    
    return session;
  }

  async executePlanModeSession(sessionId: string): Promise<void> {
    const session = this.planSessions.get(sessionId);
    if (!session) {
      throw new Error(`Plan session not found: ${sessionId}`);
    }
    
    session.status = 'in_progress';
    session.updatedAt = Date.now();
    
    this.wsManager.broadcast('plan-mode-update', {
      type: 'session-started',
      session
    });
    
    try {
      for (const step of session.steps) {
        if (session.status === 'cancelled') {
          break;
        }
        
        step.status = 'in_progress';
        step.timestamp = Date.now();
        
        this.wsManager.broadcast('plan-mode-update', {
          type: 'step-started',
          session,
          step
        });
        
        if (step.command) {
          const startTime = Date.now();
          const result = await this.executeCommand(step.command, [], sessionId);
          step.duration = Date.now() - startTime;
          step.output = result.output;
          step.error = result.error;
          step.status = result.success ? 'completed' : 'failed';
        } else {
          step.status = 'completed';
        }
        
        this.wsManager.broadcast('plan-mode-update', {
          type: 'step-completed',
          session,
          step
        });
        
        if (step.status === 'failed' && !session.autoExecute) {
          session.status = 'failed';
          break;
        }
      }
      
      if (session.status !== 'cancelled' && session.status !== 'failed') {
        session.status = 'completed';
      }
      
    } catch (error) {
      session.status = 'failed';
      console.error('❌ Plan execution failed:', error);
    }
    
    session.updatedAt = Date.now();
    await this.savePlanSessions();
    
    this.wsManager.broadcast('plan-mode-update', {
      type: 'session-completed',
      session
    });
  }

  async cancelPlanModeSession(sessionId: string): Promise<void> {
    const session = this.planSessions.get(sessionId);
    if (!session) {
      throw new Error(`Plan session not found: ${sessionId}`);
    }
    
    session.status = 'cancelled';
    session.updatedAt = Date.now();
    
    for (const step of session.steps) {
      if (step.status === 'in_progress') {
        step.status = 'skipped';
      }
    }
    
    await this.savePlanSessions();
    
    this.wsManager.broadcast('plan-mode-update', {
      type: 'session-cancelled',
      session
    });
  }

  getAvailableCommands(): SlashCommand[] {
    return [...this.availableCommands];
  }

  getCommandHistory(limit?: number): CommandResult[] {
    return limit ? this.commandHistory.slice(-limit) : [...this.commandHistory];
  }

  getPlanModeSession(sessionId: string): PlanModeSession | undefined {
    return this.planSessions.get(sessionId);
  }

  getAllPlanModeSessions(): PlanModeSession[] {
    return Array.from(this.planSessions.values());
  }

  private async loadCommandHistory(): Promise<void> {
    try {
      const data = await this.db.readData();
      if (data.claudeCodeCommands?.history) {
        this.commandHistory = data.claudeCodeCommands.history;
      }
    } catch (error) {
      console.warn('⚠️ Could not load command history:', error);
    }
  }

  private async saveCommandHistory(): Promise<void> {
    try {
      const data = await this.db.readData();
      data.claudeCodeCommands = data.claudeCodeCommands || {};
      data.claudeCodeCommands.history = this.commandHistory.slice(-100); // Keep last 100 commands
      await this.db.writeData(data);
    } catch (error) {
      console.error('❌ Failed to save command history:', error);
    }
  }

  private async savePlanSessions(): Promise<void> {
    try {
      const data = await this.db.readData();
      data.claudeCodeCommands = data.claudeCodeCommands || {};
      data.claudeCodeCommands.planSessions = Array.from(this.planSessions.values());
      await this.db.writeData(data);
    } catch (error) {
      console.error('❌ Failed to save plan sessions:', error);
    }
  }

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Claude Code Command Service...');
    
    for (const [processId, process] of this.runningProcesses) {
      console.log(`🔄 Terminating process: ${processId}`);
      process.kill('SIGTERM');
    }
    
    this.runningProcesses.clear();
    
    for (const [sessionId, session] of this.planSessions) {
      if (session.status === 'in_progress') {
        await this.cancelPlanModeSession(sessionId);
      }
    }
    
    await this.saveCommandHistory();
    await this.savePlanSessions();
    
    console.log('✅ Claude Code Command Service shut down');
  }
}