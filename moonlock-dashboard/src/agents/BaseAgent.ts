/**
 * BaseAgent: Foundational agent class for the Claude Code Optimizer system
 * Provides core functionality that all specialized agents inherit
 */

import { EventEmitter } from 'events'
import { 
  AgentConfig, 
  AgentType, 
  Task, 
  AgentMessage, 
  AgentCapability,
  AgentPerformanceMetrics 
} from './types'

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig
  protected isActive: boolean = false
  protected tasks: Map<string, Task> = new Map()
  protected capabilities: Map<string, AgentCapability> = new Map()
  protected performance: AgentPerformanceMetrics
  protected heartbeatInterval: NodeJS.Timeout | null = null
  protected messageQueue: AgentMessage[] = []

  constructor(config: AgentConfig) {
    super()
    this.config = config
    this.performance = {
      agentId: config.id,
      tasksCompleted: 0,
      averageTaskDuration: 0,
      successRate: 0,
      tokenEfficiency: 0,
      uptime: 0,
      errorRate: 0,
      lastActive: new Date()
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract async initialize(): Promise<void>
  abstract async execute(task: Task): Promise<any>
  abstract async shutdown(): Promise<void>

  // Core agent lifecycle methods
  async start(): Promise<void> {
    try {
      await this.initialize()
      this.isActive = true
      this.startHeartbeat()
      this.emit('agent-started', { agentId: this.config.id })
      
      console.log(`[${this.config.type}:${this.config.id}] Agent started successfully`)
    } catch (error) {
      this.emit('agent-error', { agentId: this.config.id, error })
      throw new Error(`Failed to start agent ${this.config.id}: ${error}`)
    }
  }

  async stop(): Promise<void> {
    try {
      this.isActive = false
      this.stopHeartbeat()
      await this.shutdown()
      this.emit('agent-stopped', { agentId: this.config.id })
      
      console.log(`[${this.config.type}:${this.config.id}] Agent stopped successfully`)
    } catch (error) {
      this.emit('agent-error', { agentId: this.config.id, error })
      throw new Error(`Failed to stop agent ${this.config.id}: ${error}`)
    }
  }

  // Task management
  async assignTask(task: Task): Promise<void> {
    if (this.tasks.size >= this.config.maxConcurrentTasks) {
      throw new Error(`Agent ${this.config.id} has reached maximum concurrent tasks`)
    }

    task.status = 'in_progress'
    this.tasks.set(task.id, task)
    this.emit('task-assigned', { agentId: this.config.id, taskId: task.id })

    try {
      const startTime = Date.now()
      const result = await this.execute(task)
      const duration = Date.now() - startTime

      task.status = 'completed'
      task.completedTime = new Date()
      this.tasks.delete(task.id)

      this.updatePerformanceMetrics(task, duration, true)
      this.emit('task-completed', { 
        agentId: this.config.id, 
        taskId: task.id, 
        result, 
        duration 
      })

      return result
    } catch (error) {
      task.status = 'failed'
      this.tasks.delete(task.id)
      
      this.updatePerformanceMetrics(task, 0, false)
      this.emit('task-failed', { 
        agentId: this.config.id, 
        taskId: task.id, 
        error 
      })

      throw error
    }
  }

  // Message handling
  async sendMessage(to: string, type: AgentMessage['type'], payload: any, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: this.config.id,
      to,
      type,
      timestamp: new Date(),
      payload,
      priority
    }

    this.emit('message-sent', message)
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    this.messageQueue.push(message)
    this.emit('message-received', message)
    
    // Process message based on type
    switch (message.type) {
      case 'task':
        await this.assignTask(message.payload as Task)
        break
      case 'status':
        await this.handleStatusRequest(message)
        break
      case 'error':
        await this.handleError(message)
        break
      default:
        await this.handleCustomMessage(message)
    }
  }

  // Capability management
  registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability)
    this.emit('capability-registered', { 
      agentId: this.config.id, 
      capability: capability.name 
    })
  }

  hasCapability(capabilityName: string): boolean {
    return this.capabilities.has(capabilityName)
  }

  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values())
  }

  // Status and health monitoring
  getStatus(): any {
    return {
      id: this.config.id,
      type: this.config.type,
      isActive: this.isActive,
      activeTasks: this.tasks.size,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      queueLength: this.messageQueue.length,
      performance: this.performance,
      capabilities: Array.from(this.capabilities.keys()),
      uptime: this.calculateUptime(),
      lastActivity: this.performance.lastActive
    }
  }

  getHealth(): 'healthy' | 'degraded' | 'critical' {
    if (!this.isActive) return 'critical'
    if (this.performance.errorRate > 0.1) return 'degraded'
    if (this.performance.successRate < 0.8) return 'degraded'
    return 'healthy'
  }

  // Performance tracking
  private updatePerformanceMetrics(task: Task, duration: number, success: boolean): void {
    this.performance.tasksCompleted++
    this.performance.lastActive = new Date()

    if (success) {
      // Update average task duration
      const totalDuration = this.performance.averageTaskDuration * (this.performance.tasksCompleted - 1) + duration
      this.performance.averageTaskDuration = totalDuration / this.performance.tasksCompleted

      // Update success rate
      const successfulTasks = Math.floor(this.performance.successRate * (this.performance.tasksCompleted - 1)) + 1
      this.performance.successRate = successfulTasks / this.performance.tasksCompleted

      // Update token efficiency
      if (task.tokens > 0) {
        const expectedTokens = task.tokens
        const actualTokens = task.metadata?.actualTokens || expectedTokens
        const efficiency = Math.min(expectedTokens / actualTokens, 1)
        
        this.performance.tokenEfficiency = (
          (this.performance.tokenEfficiency * (this.performance.tasksCompleted - 1) + efficiency) / 
          this.performance.tasksCompleted
        )
      }
    } else {
      // Update error rate
      const errors = Math.ceil(this.performance.errorRate * (this.performance.tasksCompleted - 1)) + 1
      this.performance.errorRate = errors / this.performance.tasksCompleted

      // Update success rate
      const successfulTasks = Math.floor(this.performance.successRate * (this.performance.tasksCompleted - 1))
      this.performance.successRate = successfulTasks / this.performance.tasksCompleted
    }
  }

  // Heartbeat and monitoring
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.emit('heartbeat', {
        agentId: this.config.id,
        timestamp: new Date(),
        status: this.getStatus(),
        health: this.getHealth()
      })
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private calculateUptime(): number {
    // Return uptime in milliseconds since agent started
    return Date.now() - this.performance.lastActive.getTime()
  }

  // Utility methods
  private generateMessageId(): string {
    return `msg_${this.config.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  protected async handleStatusRequest(message: AgentMessage): Promise<void> {
    await this.sendMessage(message.from, 'result', this.getStatus(), 'high')
  }

  protected async handleError(message: AgentMessage): Promise<void> {
    console.error(`[${this.config.type}:${this.config.id}] Received error:`, message.payload)
    this.emit('agent-error', { agentId: this.config.id, error: message.payload })
  }

  protected async handleCustomMessage(message: AgentMessage): Promise<void> {
    // Override in subclasses for custom message handling
    console.log(`[${this.config.type}:${this.config.id}] Received custom message:`, message)
  }

  // Logging and debugging
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.config.type}:${this.config.id}]`
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data || '')
        break
      case 'warn':
        console.warn(`${prefix} WARNING: ${message}`, data || '')
        break
      case 'error':
        console.error(`${prefix} ERROR: ${message}`, data || '')
        break
    }
  }

  // Getters
  get id(): string {
    return this.config.id
  }

  get type(): AgentType {
    return this.config.type
  }

  get name(): string {
    return this.config.name
  }

  get active(): boolean {
    return this.isActive
  }

  get tokenBudget(): number {
    return this.config.tokenBudget
  }

  get activeTasks(): Task[] {
    return Array.from(this.tasks.values())
  }
}