/**
 * ClaudeHooksAgent: Clean Code Hooks Integration Agent
 * Manages Claude Code hooks.json integration for seamless session management
 */

import { BaseAgent } from './BaseAgent'
import { Task, SessionInfo } from './types'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

interface HookConfig {
  command: string
  args: string[]
  timeout?: number
  env?: Record<string, string>
  cwd?: string
}

interface HooksConfiguration {
  session_start?: HookConfig
  session_end?: HookConfig
  code_quality_check?: HookConfig
  token_threshold_warning?: HookConfig
  quota_warning?: HookConfig
  performance_monitor?: HookConfig
  error_handler?: HookConfig
}

interface HookExecution {
  hookName: string
  timestamp: Date
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  success: boolean
}

export class ClaudeHooksAgent extends BaseAgent {
  private hooksPath: string
  private scriptsPath: string
  private hookExecutions: HookExecution[] = []
  private activeHooks: Set<string> = new Set()

  constructor(config: any) {
    super(config)
    this.hooksPath = path.join(os.homedir(), '.claude', 'hooks.json')
    this.scriptsPath = path.join(os.homedir(), '.claude', 'optimizer-hooks')
  }

  async initialize(): Promise<void> {
    this.log('info', 'Initializing ClaudeHooksAgent...')

    // Register capabilities
    this.registerCapability({
      name: 'hooks-setup',
      description: 'Setup Claude Code hooks.json configuration',
      tokenCost: 20,
      estimatedDuration: 120000, // 2 minutes
      requirements: ['file-system-access'],
      outputType: 'hooks-configuration'
    })

    this.registerCapability({
      name: 'hook-script-creation',
      description: 'Create custom hook scripts for various events',
      tokenCost: 15,
      estimatedDuration: 90000, // 1.5 minutes
      requirements: ['javascript-execution'],
      outputType: 'hook-scripts'
    })

    this.registerCapability({
      name: 'session-monitoring',
      description: 'Monitor Claude Code sessions via hooks',
      tokenCost: 10,
      estimatedDuration: 5000, // 5 seconds
      requirements: ['hooks-configuration'],
      outputType: 'session-events'
    })

    // Create hooks directory
    await this.ensureDirectoriesExist()
    
    // Setup default hooks if they don't exist
    await this.setupDefaultHooksIfMissing()

    this.log('info', 'ClaudeHooksAgent initialized successfully')
  }

  async execute(task: Task): Promise<any> {
    this.log('info', `Executing task: ${task.name}`)

    try {
      switch (task.name) {
        case 'setup-hooks':
          return await this.setupHooks()
        case 'create-hook-script':
          return await this.createHookScript(
            task.metadata?.hookName,
            task.metadata?.logic
          )
        case 'monitor-session-events':
          return await this.monitorSessionEvents()
        case 'validate-hooks':
          return await this.validateHooksConfiguration()
        case 'execute-hook':
          return await this.executeHook(
            task.metadata?.hookName,
            task.metadata?.context
          )
        default:
          throw new Error(`Unknown task: ${task.name}`)
      }
    } catch (error) {
      this.log('error', `Task execution failed: ${task.name}`, error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down ClaudeHooksAgent...')
    
    // Clear active hooks
    this.activeHooks.clear()
    
    // Save execution history
    await this.saveExecutionHistory()
  }

  /**
   * Setup comprehensive Claude Code hooks configuration
   */
  async setupHooks(): Promise<HooksConfiguration> {
    this.log('info', 'Setting up Claude Code hooks configuration')

    // Ensure scripts directory exists
    await fs.mkdir(this.scriptsPath, { recursive: true })

    // Create comprehensive hooks configuration
    const hooksConfig: HooksConfiguration = {
      session_start: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'session-start.js')],
        timeout: 10000,
        env: {
          OPTIMIZER_MODE: 'active',
          LOG_LEVEL: 'info'
        }
      },
      session_end: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'session-end.js')],
        timeout: 15000,
        env: {
          OPTIMIZER_MODE: 'active',
          LOG_LEVEL: 'info'
        }
      },
      code_quality_check: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'code-quality.js')],
        timeout: 30000,
        env: {
          QUALITY_THRESHOLD: '85',
          AUTO_FIX: 'false'
        }
      },
      token_threshold_warning: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'token-warning.js')],
        timeout: 5000,
        env: {
          WARNING_THRESHOLD: '8000',
          CRITICAL_THRESHOLD: '9500'
        }
      },
      quota_warning: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'quota-warning.js')],
        timeout: 5000,
        env: {
          QUOTA_WARNING_PERCENT: '80',
          QUOTA_CRITICAL_PERCENT: '95'
        }
      },
      performance_monitor: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'performance-monitor.js')],
        timeout: 10000,
        env: {
          MONITOR_INTERVAL: '5000',
          PERFORMANCE_THRESHOLD: '100'
        }
      },
      error_handler: {
        command: 'node',
        args: [path.join(this.scriptsPath, 'error-handler.js')],
        timeout: 10000,
        env: {
          ERROR_REPORTING: 'true',
          AUTO_RECOVERY: 'false'
        }
      }
    }

    // Write hooks configuration
    await fs.writeFile(
      this.hooksPath,
      JSON.stringify(hooksConfig, null, 2),
      'utf-8'
    )

    // Create all hook scripts
    await this.createAllHookScripts()

    this.log('info', 'Claude Code hooks setup completed')
    this.emit('hooks-configured', hooksConfig)

    return hooksConfig
  }

  /**
   * Create a specific hook script with custom logic
   */
  async createHookScript(hookName: string, logic: string): Promise<void> {
    if (!hookName || !logic) {
      throw new Error('Hook name and logic are required')
    }

    this.log('info', `Creating hook script: ${hookName}`)

    const scriptTemplate = `
#!/usr/bin/env node

/**
 * Claude Code Optimizer Hook: ${hookName}
 * Auto-generated hook script for Claude Code integration
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Hook configuration
const HOOK_NAME = '${hookName}';
const OPTIMIZER_DIR = path.join(os.homedir(), '.claude', 'optimizer');
const SESSION_STATE_FILE = path.join(OPTIMIZER_DIR, 'session-state.json');
const LOGS_DIR = path.join(OPTIMIZER_DIR, 'logs');

// Ensure directories exist
if (!fs.existsSync(OPTIMIZER_DIR)) {
  fs.mkdirSync(OPTIMIZER_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Logging utility
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    hook: HOOK_NAME,
    level,
    message,
    data
  };
  
  const logFile = path.join(LOGS_DIR, \`\${HOOK_NAME}-\${new Date().toISOString().split('T')[0]}.log\`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\\n');
  
  if (process.env.LOG_LEVEL !== 'silent') {
    console.log(\`[\${timestamp}] [\${HOOK_NAME}] \${level.toUpperCase()}: \${message}\`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
}

// Session state management
function getSessionState() {
  try {
    if (fs.existsSync(SESSION_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf-8'));
    }
  } catch (error) {
    log('warn', 'Failed to read session state', { error: error.message });
  }
  return {};
}

function updateSessionState(updates) {
  try {
    const currentState = getSessionState();
    const newState = { ...currentState, ...updates, lastUpdated: new Date().toISOString() };
    fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify(newState, null, 2));
    log('debug', 'Session state updated', updates);
  } catch (error) {
    log('error', 'Failed to update session state', { error: error.message });
  }
}

// Notification system
function sendNotification(type, title, message) {
  try {
    // Try to send system notification
    const { exec } = require('child_process');
    
    if (process.platform === 'darwin') {
      // macOS notification
      const script = \`display notification "\${message}" with title "\${title}"\`;
      exec(\`osascript -e '\${script}'\`);
    } else if (process.platform === 'linux') {
      // Linux notification
      exec(\`notify-send "\${title}" "\${message}"\`);
    } else if (process.platform === 'win32') {
      // Windows notification (if PowerShell available)
      const ps = \`New-BurntToastNotification -Text "\${title}", "\${message}"\`;
      exec(\`powershell -Command "\${ps}"\`);
    }
    
    log('info', 'Notification sent', { type, title, message });
  } catch (error) {
    log('warn', 'Failed to send notification', { error: error.message });
  }
}

// Main hook logic
async function main() {
  try {
    log('info', \`Hook \${HOOK_NAME} started\`);
    
    // Get context from command line arguments
    const context = process.argv[2] ? JSON.parse(process.argv[2]) : {};
    log('debug', 'Hook context received', context);
    
    // Hook-specific logic
    ${logic}
    
    log('info', \`Hook \${HOOK_NAME} completed successfully\`);
    process.exit(0);
    
  } catch (error) {
    log('error', \`Hook \${HOOK_NAME} failed\`, { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception in hook', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection in hook', { reason, promise });
  process.exit(1);
});

// Execute main function
main();
`

    const scriptPath = path.join(this.scriptsPath, `${hookName}.js`)
    await fs.writeFile(scriptPath, scriptTemplate, 'utf-8')
    
    // Make script executable
    await fs.chmod(scriptPath, 0o755)

    this.log('info', `Hook script created: ${scriptPath}`)
  }

  /**
   * Monitor session events through hooks
   */
  async monitorSessionEvents(): Promise<any> {
    this.log('info', 'Starting session event monitoring')

    const sessionStateFile = path.join(os.homedir(), '.claude', 'optimizer', 'session-state.json')
    
    try {
      // Check if session state file exists
      const sessionState = await this.readSessionState(sessionStateFile)
      
      return {
        active: sessionState.active || false,
        sessionId: sessionState.sessionId,
        startTime: sessionState.startTime,
        lastActivity: sessionState.lastActivity,
        tokenCount: sessionState.tokenCount || 0,
        promptCount: sessionState.promptCount || 0,
        events: await this.getRecentHookEvents()
      }
    } catch (error) {
      this.log('warn', 'No active session state found')
      return {
        active: false,
        events: []
      }
    }
  }

  /**
   * Execute a specific hook with context
   */
  async executeHook(hookName: string, context: any = {}): Promise<HookExecution> {
    this.log('info', `Executing hook: ${hookName}`)

    const startTime = Date.now()
    const execution: Partial<HookExecution> = {
      hookName,
      timestamp: new Date(),
      success: false
    }

    try {
      // Check if hook script exists
      const scriptPath = path.join(this.scriptsPath, `${hookName}.js`)
      
      try {
        await fs.access(scriptPath)
      } catch (error) {
        throw new Error(`Hook script not found: ${scriptPath}`)
      }

      // Execute hook script
      const { spawn } = require('child_process')
      const child = spawn('node', [scriptPath, JSON.stringify(context)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOOK_CONTEXT: JSON.stringify(context) }
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      // Wait for completion
      const exitCode = await new Promise<number>((resolve) => {
        child.on('close', resolve)
      })

      execution.exitCode = exitCode
      execution.stdout = stdout
      execution.stderr = stderr
      execution.duration = Date.now() - startTime
      execution.success = exitCode === 0

      if (execution.success) {
        this.log('info', `Hook ${hookName} executed successfully`)
      } else {
        this.log('error', `Hook ${hookName} failed with exit code ${exitCode}`)
      }

    } catch (error) {
      execution.exitCode = -1
      execution.stderr = error.message
      execution.duration = Date.now() - startTime
      execution.success = false
      
      this.log('error', `Hook execution failed: ${hookName}`, error)
    }

    const finalExecution = execution as HookExecution
    this.hookExecutions.push(finalExecution)
    
    this.emit('hook-executed', finalExecution)
    return finalExecution
  }

  /**
   * Validate hooks configuration
   */
  async validateHooksConfiguration(): Promise<any> {
    this.log('info', 'Validating hooks configuration')

    const validation = {
      configurationExists: false,
      validConfiguration: false,
      scriptsExist: false,
      hookCount: 0,
      issues: [] as string[],
      recommendations: [] as string[]
    }

    try {
      // Check if hooks.json exists
      await fs.access(this.hooksPath)
      validation.configurationExists = true

      // Read and validate configuration
      const configContent = await fs.readFile(this.hooksPath, 'utf-8')
      const config = JSON.parse(configContent)
      validation.validConfiguration = true
      validation.hookCount = Object.keys(config).length

      // Check if scripts exist
      const scriptsExist = await Promise.all(
        Object.values(config).map(async (hookConfig: any) => {
          if (hookConfig.command === 'node' && hookConfig.args?.[0]) {
            try {
              await fs.access(hookConfig.args[0])
              return true
            } catch (error) {
              validation.issues.push(`Script not found: ${hookConfig.args[0]}`)
              return false
            }
          }
          return true
        })
      )

      validation.scriptsExist = scriptsExist.every(exists => exists)

      // Generate recommendations
      if (validation.hookCount < 3) {
        validation.recommendations.push('Consider adding more hooks for comprehensive monitoring')
      }

      if (!validation.scriptsExist) {
        validation.recommendations.push('Run setup to create missing hook scripts')
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        validation.issues.push('hooks.json configuration file not found')
        validation.recommendations.push('Run setup-hooks to create configuration')
      } else {
        validation.issues.push(`Configuration validation failed: ${error.message}`)
      }
    }

    return validation
  }

  // Private helper methods

  private async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      path.dirname(this.hooksPath),
      this.scriptsPath,
      path.join(os.homedir(), '.claude', 'optimizer'),
      path.join(os.homedir(), '.claude', 'optimizer', 'logs')
    ]

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  private async setupDefaultHooksIfMissing(): Promise<void> {
    try {
      await fs.access(this.hooksPath)
      this.log('info', 'Hooks configuration already exists')
    } catch (error) {
      this.log('info', 'Setting up default hooks configuration')
      await this.setupHooks()
    }
  }

  private async createAllHookScripts(): Promise<void> {
    const hookScripts = [
      {
        name: 'session-start',
        logic: `
          // Session start hook logic
          updateSessionState({
            active: true,
            sessionId: context.sessionId || \`session_\${Date.now()}\`,
            startTime: new Date().toISOString(),
            workingDirectory: context.workingDirectory || process.cwd(),
            projectName: context.projectName || 'Unknown Project'
          });
          
          sendNotification('info', 'Claude Code Session Started', 'Optimizer monitoring active');
          log('info', 'Session started', context);
        `
      },
      {
        name: 'session-end',
        logic: `
          // Session end hook logic
          const sessionState = getSessionState();
          const duration = sessionState.startTime ? 
            Math.round((Date.now() - new Date(sessionState.startTime).getTime()) / 1000 / 60) : 0;
          
          updateSessionState({
            active: false,
            endTime: new Date().toISOString(),
            duration: duration
          });
          
          sendNotification('info', 'Claude Code Session Ended', \`Duration: \${duration} minutes\`);
          log('info', 'Session ended', { duration, ...context });
        `
      },
      {
        name: 'code-quality',
        logic: `
          // Code quality check logic
          const qualityThreshold = parseInt(process.env.QUALITY_THRESHOLD || '85');
          const codeQuality = context.quality || Math.floor(Math.random() * 100); // Mock quality score
          
          if (codeQuality < qualityThreshold) {
            sendNotification('warning', 'Code Quality Alert', \`Quality score: \${codeQuality}%\`);
            log('warn', 'Code quality below threshold', { quality: codeQuality, threshold: qualityThreshold });
          } else {
            log('info', 'Code quality check passed', { quality: codeQuality });
          }
        `
      },
      {
        name: 'token-warning',
        logic: `
          // Token usage warning logic
          const warningThreshold = parseInt(process.env.WARNING_THRESHOLD || '8000');
          const criticalThreshold = parseInt(process.env.CRITICAL_THRESHOLD || '9500');
          const tokenCount = context.tokenCount || 0;
          
          if (tokenCount >= criticalThreshold) {
            sendNotification('error', 'Critical Token Usage', \`\${tokenCount} tokens used!\`);
            log('error', 'Critical token usage reached', { tokenCount, threshold: criticalThreshold });
          } else if (tokenCount >= warningThreshold) {
            sendNotification('warning', 'High Token Usage', \`\${tokenCount} tokens used\`);
            log('warn', 'Warning token threshold reached', { tokenCount, threshold: warningThreshold });
          }
          
          updateSessionState({ tokenCount });
        `
      },
      {
        name: 'quota-warning',
        logic: `
          // Weekly quota warning logic
          const warningPercent = parseFloat(process.env.QUOTA_WARNING_PERCENT || '80');
          const criticalPercent = parseFloat(process.env.QUOTA_CRITICAL_PERCENT || '95');
          const quotaUsage = context.quotaUsage || 0; // Percentage
          
          if (quotaUsage >= criticalPercent) {
            sendNotification('error', 'Critical Quota Usage', \`\${quotaUsage.toFixed(1)}% of weekly quota used!\`);
            log('error', 'Critical quota usage', { quotaUsage, threshold: criticalPercent });
          } else if (quotaUsage >= warningPercent) {
            sendNotification('warning', 'High Quota Usage', \`\${quotaUsage.toFixed(1)}% of weekly quota used\`);
            log('warn', 'Quota warning threshold reached', { quotaUsage, threshold: warningPercent });
          }
        `
      },
      {
        name: 'performance-monitor',
        logic: `
          // Performance monitoring logic
          const performanceData = {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            timestamp: new Date().toISOString(),
            sessionId: context.sessionId
          };
          
          const memoryMB = performanceData.memoryUsage.heapUsed / 1024 / 1024;
          const threshold = parseInt(process.env.PERFORMANCE_THRESHOLD || '100');
          
          if (memoryMB > threshold) {
            sendNotification('warning', 'High Memory Usage', \`\${memoryMB.toFixed(1)}MB used\`);
            log('warn', 'High memory usage detected', performanceData);
          }
          
          log('debug', 'Performance monitoring', performanceData);
        `
      },
      {
        name: 'error-handler',
        logic: `
          // Error handling logic
          const error = context.error || {};
          const errorLevel = context.level || 'error';
          
          log(errorLevel, 'Claude Code error handled', error);
          
          if (error.critical) {
            sendNotification('error', 'Critical Error', error.message || 'Unknown error occurred');
          }
          
          // Save error for analysis
          const errorLog = {
            timestamp: new Date().toISOString(),
            error: error,
            context: context,
            sessionId: context.sessionId
          };
          
          const errorFile = path.join(LOGS_DIR, \`errors-\${new Date().toISOString().split('T')[0]}.log\`);
          fs.appendFileSync(errorFile, JSON.stringify(errorLog) + '\\n');
        `
      }
    ]

    for (const script of hookScripts) {
      await this.createHookScript(script.name, script.logic)
    }
  }

  private async readSessionState(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return {}
    }
  }

  private async getRecentHookEvents(): Promise<any[]> {
    const events: any[] = []
    
    try {
      const logsDir = path.join(os.homedir(), '.claude', 'optimizer', 'logs')
      const logFiles = await fs.readdir(logsDir)
      
      // Get recent log files
      const recentLogFiles = logFiles
        .filter(file => file.endsWith('.log'))
        .sort()
        .slice(-5) // Last 5 log files

      for (const logFile of recentLogFiles) {
        try {
          const logContent = await fs.readFile(path.join(logsDir, logFile), 'utf-8')
          const logLines = logContent.trim().split('\n')
          
          for (const line of logLines.slice(-10)) { // Last 10 entries per file
            try {
              const logEntry = JSON.parse(line)
              events.push(logEntry)
            } catch (error) {
              // Skip invalid JSON lines
            }
          }
        } catch (error) {
          // Skip unreadable log files
        }
      }
    } catch (error) {
      this.log('warn', 'Failed to read recent hook events', error)
    }

    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 20) // Return 20 most recent events
  }

  private async saveExecutionHistory(): Promise<void> {
    try {
      const historyFile = path.join(this.scriptsPath, 'execution-history.json')
      await fs.writeFile(
        historyFile,
        JSON.stringify(this.hookExecutions, null, 2),
        'utf-8'
      )
    } catch (error) {
      this.log('warn', 'Failed to save execution history', error)
    }
  }

  // Public getters
  get hooksConfigurationPath(): string {
    return this.hooksPath
  }

  get scriptsDirectory(): string {
    return this.scriptsPath
  }

  get executionHistory(): HookExecution[] {
    return [...this.hookExecutions]
  }

  get activeHookNames(): string[] {
    return Array.from(this.activeHooks)
  }
}