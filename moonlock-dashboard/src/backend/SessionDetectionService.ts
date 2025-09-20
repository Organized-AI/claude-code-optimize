/**
 * SessionDetectionService: Multi-strategy Claude Code session detection
 * Implements comprehensive detection mechanisms for active coding sessions
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import { SessionInfo, DetectionStrategy } from '../agents/types'

const execAsync = promisify(exec)

export class SessionDetectionService extends EventEmitter {
  private detectionStrategies: DetectionStrategy[] = []
  private isActive: boolean = false
  private currentSession: SessionInfo | null = null
  private detectionInterval: NodeJS.Timeout | null = null
  private sessionHistory: SessionInfo[] = []

  constructor() {
    super()
    this.initializeDetectionStrategies()
  }

  /**
   * Initialize all detection strategies
   */
  private initializeDetectionStrategies(): void {
    this.detectionStrategies = [
      new FileSystemDetectionStrategy(),
      new ProcessDetectionStrategy(),
      new HooksDetectionStrategy(),
      new LogParsingStrategy(),
      new SocketDetectionStrategy()
    ]

    // Sort by priority (higher priority first)
    this.detectionStrategies.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Start session detection monitoring
   */
  async startDetection(intervalMs: number = 5000): Promise<void> {
    if (this.isActive) {
      throw new Error('Detection is already active')
    }

    this.isActive = true
    console.log('[SessionDetection] Starting session detection...')

    // Initial detection
    await this.runDetectionCycle()

    // Setup periodic detection
    this.detectionInterval = setInterval(async () => {
      await this.runDetectionCycle()
    }, intervalMs)

    this.emit('detection-started')
  }

  /**
   * Stop session detection monitoring
   */
  async stopDetection(): Promise<void> {
    this.isActive = false
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = null
    }

    console.log('[SessionDetection] Stopped session detection')
    this.emit('detection-stopped')
  }

  /**
   * Detect Claude Code session using all available strategies
   */
  async detectClaudeCodeSession(): Promise<SessionInfo | null> {
    console.log('[SessionDetection] Running session detection...')

    for (const strategy of this.detectionStrategies) {
      try {
        if (await strategy.canDetect()) {
          const session = await strategy.detect()
          if (session) {
            console.log(`[SessionDetection] Session detected via ${strategy.name}`)
            return await this.enrichSessionData(session)
          }
        }
      } catch (error) {
        console.warn(`[SessionDetection] Strategy ${strategy.name} failed:`, error)
        continue
      }
    }

    return null
  }

  /**
   * Enrich session data with additional context and metrics
   */
  private async enrichSessionData(session: SessionInfo): Promise<SessionInfo> {
    try {
      // Add token counting
      const tokenCount = await this.countTokensFromLogs(session.id)
      
      // Detect model being used
      const model = await this.detectModelFromUsage(session.id)
      
      // Extract project context
      const projectContext = await this.extractProjectContext(session.workingDirectory)
      
      // Get file list
      const files = await this.getSessionFiles(session.workingDirectory)
      
      // Get command history
      const commands = await this.getRecentCommands(session.id)

      const enrichedSession: SessionInfo = {
        ...session,
        tokenCount,
        model,
        files,
        commands,
        metadata: {
          ...session.metadata,
          projectContext,
          lastActivity: new Date(),
          detectionMethod: 'multi-strategy',
          enrichedAt: new Date()
        }
      }

      return enrichedSession
    } catch (error) {
      console.warn('[SessionDetection] Failed to enrich session data:', error)
      return session
    }
  }

  /**
   * Run a single detection cycle
   */
  private async runDetectionCycle(): Promise<void> {
    try {
      const detectedSession = await this.detectClaudeCodeSession()

      if (detectedSession && !this.currentSession) {
        // New session started
        this.currentSession = detectedSession
        this.sessionHistory.push(detectedSession)
        console.log(`[SessionDetection] New session started: ${detectedSession.id}`)
        this.emit('session-started', detectedSession)
        
      } else if (detectedSession && this.currentSession && detectedSession.id !== this.currentSession.id) {
        // Session changed
        this.currentSession.endTime = new Date()
        this.currentSession.status = 'completed'
        this.emit('session-ended', this.currentSession)
        
        this.currentSession = detectedSession
        this.sessionHistory.push(detectedSession)
        console.log(`[SessionDetection] Session changed: ${detectedSession.id}`)
        this.emit('session-started', detectedSession)
        
      } else if (detectedSession && this.currentSession) {
        // Update existing session
        this.currentSession = { ...this.currentSession, ...detectedSession }
        this.emit('session-updated', this.currentSession)
        
      } else if (!detectedSession && this.currentSession) {
        // Session ended
        this.currentSession.endTime = new Date()
        this.currentSession.status = 'completed'
        console.log(`[SessionDetection] Session ended: ${this.currentSession.id}`)
        this.emit('session-ended', this.currentSession)
        this.currentSession = null
      }
      
    } catch (error) {
      console.error('[SessionDetection] Detection cycle failed:', error)
      this.emit('detection-error', error)
    }
  }

  /**
   * Count tokens from session logs
   */
  private async countTokensFromLogs(sessionId: string): Promise<number> {
    try {
      // Look for Claude Code log files
      const logPaths = [
        path.join(os.homedir(), '.claude', 'logs'),
        path.join(os.homedir(), '.config', 'claude', 'logs'),
        '/tmp/claude-logs'
      ]

      for (const logPath of logPaths) {
        try {
          const logFiles = await fs.readdir(logPath)
          const sessionLogFile = logFiles.find(file => file.includes(sessionId))
          
          if (sessionLogFile) {
            const logContent = await fs.readFile(path.join(logPath, sessionLogFile), 'utf-8')
            return this.parseTokensFromLogContent(logContent)
          }
        } catch (error) {
          // Log directory doesn't exist or is inaccessible
          continue
        }
      }

      return 0
    } catch (error) {
      console.warn('[SessionDetection] Failed to count tokens from logs:', error)
      return 0
    }
  }

  /**
   * Parse token count from log content
   */
  private parseTokensFromLogContent(logContent: string): number {
    // Look for token usage patterns in logs
    const tokenPatterns = [
      /tokens?[:\s]+(\d+)/gi,
      /usage[:\s]+(\d+)\s*tokens?/gi,
      /consumed[:\s]+(\d+)/gi
    ]

    let totalTokens = 0
    for (const pattern of tokenPatterns) {
      const matches = logContent.match(pattern)
      if (matches) {
        for (const match of matches) {
          const tokenCount = parseInt(match.match(/\d+/)?.[0] || '0')
          totalTokens += tokenCount
        }
      }
    }

    return totalTokens
  }

  /**
   * Detect which model is being used in the session
   */
  private async detectModelFromUsage(sessionId: string): Promise<'sonnet' | 'opus'> {
    try {
      // Check recent API calls or logs for model indicators
      const logContent = await this.getSessionLogContent(sessionId)
      
      if (logContent.toLowerCase().includes('opus') || logContent.includes('claude-3-opus')) {
        return 'opus'
      } else if (logContent.toLowerCase().includes('sonnet') || logContent.includes('claude-3-sonnet')) {
        return 'sonnet'
      }

      // Default to sonnet (more commonly used)
      return 'sonnet'
    } catch (error) {
      console.warn('[SessionDetection] Failed to detect model:', error)
      return 'sonnet'
    }
  }

  /**
   * Extract project context from working directory
   */
  private async extractProjectContext(workingDir: string): Promise<any> {
    try {
      const context: any = {
        directory: workingDir,
        projectName: path.basename(workingDir),
        gitRepository: null,
        packageManager: null,
        framework: null,
        technologies: []
      }

      // Check for git repository
      try {
        await fs.access(path.join(workingDir, '.git'))
        const { stdout } = await execAsync('git remote get-url origin', { cwd: workingDir })
        context.gitRepository = stdout.trim()
      } catch (error) {
        // Not a git repository
      }

      // Check for package.json
      try {
        const packageJsonPath = path.join(workingDir, 'package.json')
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)
        
        context.projectName = packageJson.name || context.projectName
        context.packageManager = 'npm'
        
        // Detect technologies from dependencies
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        }
        
        const techStack = this.detectTechnologies(allDeps)
        context.technologies = techStack
        context.framework = this.detectFramework(allDeps)
        
      } catch (error) {
        // No package.json found
      }

      // Check for other project files
      const projectFiles = await fs.readdir(workingDir)
      
      if (projectFiles.includes('Cargo.toml')) {
        context.packageManager = 'cargo'
        context.technologies.push('rust')
      }
      
      if (projectFiles.includes('requirements.txt') || projectFiles.includes('pyproject.toml')) {
        context.packageManager = 'pip'
        context.technologies.push('python')
      }

      return context
    } catch (error) {
      console.warn('[SessionDetection] Failed to extract project context:', error)
      return {
        directory: workingDir,
        projectName: path.basename(workingDir),
        error: error.message
      }
    }
  }

  /**
   * Detect technologies from package dependencies
   */
  private detectTechnologies(dependencies: Record<string, string>): string[] {
    const technologies: string[] = []
    const depNames = Object.keys(dependencies)

    const techMap = {
      react: ['react'],
      vue: ['vue'],
      angular: ['@angular/core'],
      typescript: ['typescript'],
      javascript: ['babel', 'webpack'],
      node: ['express', 'fastify', 'koa'],
      electron: ['electron'],
      next: ['next'],
      tailwind: ['tailwindcss'],
      vite: ['vite'],
      jest: ['jest'],
      playwright: ['playwright'],
      vitest: ['vitest']
    }

    for (const [tech, indicators] of Object.entries(techMap)) {
      if (indicators.some(indicator => depNames.some(dep => dep.includes(indicator)))) {
        technologies.push(tech)
      }
    }

    return technologies
  }

  /**
   * Detect primary framework from dependencies
   */
  private detectFramework(dependencies: Record<string, string>): string | null {
    const depNames = Object.keys(dependencies)

    if (depNames.includes('react')) return 'react'
    if (depNames.includes('vue')) return 'vue'
    if (depNames.includes('@angular/core')) return 'angular'
    if (depNames.includes('svelte')) return 'svelte'
    if (depNames.includes('express')) return 'express'
    if (depNames.includes('next')) return 'next'
    if (depNames.includes('nuxt')) return 'nuxt'

    return null
  }

  /**
   * Get session-related files
   */
  private async getSessionFiles(workingDir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(workingDir, { withFileTypes: true })
      return files
        .filter(file => file.isFile())
        .map(file => file.name)
        .slice(0, 20) // Limit to first 20 files
    } catch (error) {
      console.warn('[SessionDetection] Failed to get session files:', error)
      return []
    }
  }

  /**
   * Get recent commands executed in the session
   */
  private async getRecentCommands(sessionId: string): Promise<string[]> {
    try {
      // Try to get commands from shell history
      const historyFile = path.join(os.homedir(), '.bash_history')
      const history = await fs.readFile(historyFile, 'utf-8')
      const lines = history.split('\n')
      
      // Get last 10 commands
      return lines.slice(-10).filter(line => line.trim().length > 0)
    } catch (error) {
      console.warn('[SessionDetection] Failed to get recent commands:', error)
      return []
    }
  }

  /**
   * Get session log content
   */
  private async getSessionLogContent(sessionId: string): Promise<string> {
    const logPaths = [
      path.join(os.homedir(), '.claude', 'logs'),
      path.join(os.homedir(), '.config', 'claude', 'logs')
    ]

    for (const logPath of logPaths) {
      try {
        const logFiles = await fs.readdir(logPath)
        const sessionLogFile = logFiles.find(file => file.includes(sessionId))
        
        if (sessionLogFile) {
          return await fs.readFile(path.join(logPath, sessionLogFile), 'utf-8')
        }
      } catch (error) {
        continue
      }
    }

    return ''
  }

  // Getters
  get activeSession(): SessionInfo | null {
    return this.currentSession
  }

  get isDetectionActive(): boolean {
    return this.isActive
  }

  get sessionCount(): number {
    return this.sessionHistory.length
  }

  get recentSessions(): SessionInfo[] {
    return this.sessionHistory.slice(-10)
  }
}

/**
 * Detection Strategy Implementations
 */

class FileSystemDetectionStrategy implements DetectionStrategy {
  name = 'FileSystem'
  priority = 3

  async canDetect(): Promise<boolean> {
    return true // Always available
  }

  async detect(): Promise<SessionInfo | null> {
    try {
      // Look for Claude Code indicator files
      const indicatorPaths = [
        path.join(os.homedir(), '.claude', 'active-session'),
        path.join(process.cwd(), '.claude-session'),
        '/tmp/claude-code-session'
      ]

      for (const indicatorPath of indicatorPaths) {
        try {
          const sessionData = await fs.readFile(indicatorPath, 'utf-8')
          const sessionInfo = JSON.parse(sessionData)
          
          return {
            id: sessionInfo.id || this.generateSessionId(),
            startTime: new Date(sessionInfo.startTime || Date.now()),
            workingDirectory: sessionInfo.workingDirectory || process.cwd(),
            projectName: sessionInfo.projectName || path.basename(process.cwd()),
            model: sessionInfo.model || 'sonnet',
            tokenCount: sessionInfo.tokenCount || 0,
            promptCount: sessionInfo.promptCount || 0,
            status: 'active',
            files: sessionInfo.files || [],
            commands: sessionInfo.commands || [],
            metadata: sessionInfo.metadata || {}
          }
        } catch (error) {
          continue
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

class ProcessDetectionStrategy implements DetectionStrategy {
  name = 'Process'
  priority = 4

  async canDetect(): Promise<boolean> {
    return process.platform !== 'browser' // Not available in browser
  }

  async detect(): Promise<SessionInfo | null> {
    try {
      // Look for Claude Code processes
      const { stdout } = await execAsync('ps aux | grep -i claude | grep -v grep')
      
      if (stdout.trim()) {
        const processes = stdout.trim().split('\n')
        const claudeProcess = processes.find(proc => 
          proc.includes('claude') && !proc.includes('grep')
        )

        if (claudeProcess) {
          const pid = claudeProcess.split(/\s+/)[1]
          const workingDir = await this.getProcessWorkingDirectory(pid)
          
          return {
            id: `proc_${pid}_${Date.now()}`,
            startTime: new Date(),
            workingDirectory: workingDir || process.cwd(),
            projectName: path.basename(workingDir || process.cwd()),
            model: 'sonnet',
            tokenCount: 0,
            promptCount: 0,
            status: 'active',
            files: [],
            commands: [],
            metadata: { detectionMethod: 'process', pid }
          }
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  private async getProcessWorkingDirectory(pid: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`lsof -p ${pid} | grep cwd`)
      const match = stdout.match(/\s+(\S+)$/)
      return match ? match[1] : null
    } catch (error) {
      return null
    }
  }
}

class HooksDetectionStrategy implements DetectionStrategy {
  name = 'Hooks'
  priority = 5

  async canDetect(): Promise<boolean> {
    const hooksPath = path.join(os.homedir(), '.claude', 'hooks.json')
    try {
      await fs.access(hooksPath)
      return true
    } catch (error) {
      return false
    }
  }

  async detect(): Promise<SessionInfo | null> {
    try {
      const hooksPath = path.join(os.homedir(), '.claude', 'hooks.json')
      const sessionStatePath = path.join(os.homedir(), '.claude', 'session-state.json')
      
      // Check if session state file exists (created by hooks)
      try {
        const sessionState = await fs.readFile(sessionStatePath, 'utf-8')
        const state = JSON.parse(sessionState)
        
        if (state.active) {
          return {
            id: state.sessionId || this.generateSessionId(),
            startTime: new Date(state.startTime),
            workingDirectory: state.workingDirectory || process.cwd(),
            projectName: state.projectName || 'Unknown Project',
            model: state.model || 'sonnet',
            tokenCount: state.tokenCount || 0,
            promptCount: state.promptCount || 0,
            status: 'active',
            files: state.files || [],
            commands: state.commands || [],
            metadata: { ...state.metadata, detectionMethod: 'hooks' }
          }
        }
      } catch (error) {
        // Session state file doesn't exist or is invalid
      }

      return null
    } catch (error) {
      return null
    }
  }

  private generateSessionId(): string {
    return `hooks_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

class LogParsingStrategy implements DetectionStrategy {
  name = 'LogParsing'
  priority = 2

  async canDetect(): Promise<boolean> {
    return true
  }

  async detect(): Promise<SessionInfo | null> {
    try {
      // Look for recent Claude Code log files
      const logPaths = [
        path.join(os.homedir(), '.claude', 'logs'),
        path.join(os.homedir(), '.config', 'claude', 'logs'),
        '/var/log/claude'
      ]

      for (const logPath of logPaths) {
        try {
          const logFiles = await fs.readdir(logPath)
          const recentLog = this.findMostRecentLog(logFiles)
          
          if (recentLog) {
            const logContent = await fs.readFile(path.join(logPath, recentLog), 'utf-8')
            const sessionInfo = this.parseSessionFromLog(logContent)
            
            if (sessionInfo) {
              return sessionInfo
            }
          }
        } catch (error) {
          continue
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  private findMostRecentLog(logFiles: string[]): string | null {
    const claudeLogFiles = logFiles.filter(file => 
      file.includes('claude') && 
      (file.endsWith('.log') || file.endsWith('.txt'))
    )

    if (claudeLogFiles.length === 0) return null

    // Sort by modification time (most recent first)
    return claudeLogFiles.sort().pop() || null
  }

  private parseSessionFromLog(logContent: string): SessionInfo | null {
    try {
      const lines = logContent.split('\n')
      const recentLines = lines.slice(-100) // Check last 100 lines

      // Look for session start indicators
      const sessionStartLine = recentLines.find(line => 
        line.includes('session') && 
        (line.includes('start') || line.includes('begin'))
      )

      if (sessionStartLine) {
        const sessionId = this.extractSessionId(sessionStartLine) || this.generateSessionId()
        const workingDir = this.extractWorkingDirectory(recentLines) || process.cwd()
        
        return {
          id: sessionId,
          startTime: new Date(),
          workingDirectory: workingDir,
          projectName: path.basename(workingDir),
          model: 'sonnet',
          tokenCount: this.extractTokenCount(recentLines),
          promptCount: this.extractPromptCount(recentLines),
          status: 'active',
          files: [],
          commands: [],
          metadata: { detectionMethod: 'log-parsing' }
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  private extractSessionId(line: string): string | null {
    const match = line.match(/session[:\s]+([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  private extractWorkingDirectory(lines: string[]): string | null {
    const dirLine = lines.find(line => 
      line.includes('working') && line.includes('directory')
    )
    
    if (dirLine) {
      const match = dirLine.match(/directory[:\s]+(.+)/)
      return match ? match[1].trim() : null
    }
    
    return null
  }

  private extractTokenCount(lines: string[]): number {
    let totalTokens = 0
    
    for (const line of lines) {
      const match = line.match(/tokens?[:\s]+(\d+)/)
      if (match) {
        totalTokens += parseInt(match[1])
      }
    }
    
    return totalTokens
  }

  private extractPromptCount(lines: string[]): number {
    return lines.filter(line => 
      line.includes('prompt') || line.includes('request')
    ).length
  }

  private generateSessionId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

class SocketDetectionStrategy implements DetectionStrategy {
  name = 'Socket'
  priority = 1

  async canDetect(): Promise<boolean> {
    return true
  }

  async detect(): Promise<SessionInfo | null> {
    try {
      // Look for Claude Code socket files
      const socketPaths = [
        '/tmp/claude-code.sock',
        path.join(os.homedir(), '.claude', 'claude-code.sock'),
        '/var/run/claude-code.sock'
      ]

      for (const socketPath of socketPaths) {
        try {
          await fs.access(socketPath)
          
          // Socket exists, try to connect and get session info
          const sessionInfo = await this.querySocketForSession(socketPath)
          if (sessionInfo) {
            return sessionInfo
          }
        } catch (error) {
          continue
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  private async querySocketForSession(socketPath: string): Promise<SessionInfo | null> {
    // In a real implementation, this would connect to the socket
    // and query for current session information
    
    // For now, return null as socket communication needs proper implementation
    return null
  }
}