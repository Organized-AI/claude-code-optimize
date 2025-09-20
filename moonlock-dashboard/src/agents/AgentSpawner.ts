/**
 * AgentSpawner: Master orchestration system for agent lifecycle management
 * Handles creation, coordination, and optimization of all agents in the system
 */

import { EventEmitter } from 'events'
import { BaseAgent } from './BaseAgent'
import { 
  AgentConfig, 
  AgentType, 
  Task, 
  AgentWorkPlan, 
  SubAgentConfig,
  SystemHealth,
  AgentPerformanceMetrics
} from './types'

// Import specialized agents
import { TodoListAgent } from './TodoListAgent'
import { SessionMonitorAgent } from './SessionMonitorAgent'
import { TokenTrackerAgent } from './TokenTrackerAgent'
import { QuotaManagerAgent } from './QuotaManagerAgent'
import { ClaudeHooksAgent } from './ClaudeHooksAgent'
import { CalendarSyncAgent } from './CalendarSyncAgent'
import { DataCollectorAgent } from './DataCollectorAgent'
import { TestOrchestratorAgent } from './TestOrchestratorAgent'
import { DeploymentManagerAgent } from './DeploymentManagerAgent'

export class AgentSpawner extends EventEmitter {
  private agentRegistry = new Map<string, BaseAgent>()
  private agentTypes = new Map<AgentType, typeof BaseAgent>()
  private taskQueue: Task[] = []
  private workPlan: AgentWorkPlan | null = null
  private isActive: boolean = false
  private maxConcurrentAgents: number = 10
  private systemLoad: { cpu: number; memory: number; disk: number } = { cpu: 0, memory: 0, disk: 0 }

  constructor() {
    super()
    this.registerAgentTypes()
    this.setupEventHandlers()
  }

  /**
   * Initialize the agent spawner and register all agent types
   */
  private registerAgentTypes(): void {
    this.agentTypes.set('todo-generator', TodoListAgent)
    this.agentTypes.set('session-monitor', SessionMonitorAgent)
    this.agentTypes.set('token-tracker', TokenTrackerAgent)
    this.agentTypes.set('quota-manager', QuotaManagerAgent)
    this.agentTypes.set('claude-hooks', ClaudeHooksAgent)
    this.agentTypes.set('calendar-sync', CalendarSyncAgent)
    this.agentTypes.set('data-collector', DataCollectorAgent)
    this.agentTypes.set('test-orchestrator', TestOrchestratorAgent)
    this.agentTypes.set('deployment-manager', DeploymentManagerAgent)
  }

  /**
   * Setup event handlers for agent coordination
   */
  private setupEventHandlers(): void {
    this.on('agent-spawned', this.handleAgentSpawned.bind(this))
    this.on('agent-completed', this.handleAgentCompleted.bind(this))
    this.on('agent-failed', this.handleAgentFailed.bind(this))
    this.on('task-distributed', this.handleTaskDistributed.bind(this))
  }

  /**
   * Start the agent spawner system
   */
  async start(): Promise<void> {
    try {
      this.isActive = true
      this.log('info', 'AgentSpawner starting up...')
      
      // Start system monitoring
      this.startSystemMonitoring()
      
      // Spawn initial core agents
      await this.spawnCoreAgents()
      
      this.log('info', 'AgentSpawner started successfully')
      this.emit('spawner-started')
    } catch (error) {
      this.log('error', 'Failed to start AgentSpawner', error)
      throw error
    }
  }

  /**
   * Stop the agent spawner and all agents
   */
  async stop(): Promise<void> {
    try {
      this.isActive = false
      this.log('info', 'AgentSpawner shutting down...')
      
      // Stop all agents gracefully
      const shutdownPromises = Array.from(this.agentRegistry.values()).map(
        agent => agent.stop()
      )
      await Promise.all(shutdownPromises)
      
      this.agentRegistry.clear()
      this.taskQueue = []
      
      this.log('info', 'AgentSpawner stopped successfully')
      this.emit('spawner-stopped')
    } catch (error) {
      this.log('error', 'Error during AgentSpawner shutdown', error)
      throw error
    }
  }

  /**
   * Spawn a new agent with the specified configuration
   */
  async spawnAgent(type: AgentType, config: Partial<AgentConfig>): Promise<BaseAgent> {
    if (!this.isActive) {
      throw new Error('AgentSpawner is not active')
    }

    if (this.agentRegistry.size >= this.maxConcurrentAgents) {
      throw new Error('Maximum concurrent agents reached')
    }

    const AgentClass = this.agentTypes.get(type)
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`)
    }

    // Create complete agent configuration
    const fullConfig: AgentConfig = {
      id: config.id || this.generateAgentId(type),
      type,
      name: config.name || `${type}-agent`,
      capabilities: config.capabilities || [],
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      tokenBudget: config.tokenBudget || 1000,
      priority: config.priority || 1,
      parentAgentId: config.parentAgentId,
      specializations: config.specializations || []
    }

    try {
      // Instantiate and start the agent
      const agent = new AgentClass(fullConfig) as BaseAgent
      await agent.start()
      
      // Register the agent
      this.agentRegistry.set(fullConfig.id, agent)
      
      // Setup agent event forwarding
      this.setupAgentEventForwarding(agent)
      
      this.log('info', `Spawned agent: ${type}:${fullConfig.id}`)
      this.emit('agent-spawned', { agentId: fullConfig.id, type })
      
      return agent
    } catch (error) {
      this.log('error', `Failed to spawn agent ${type}:${fullConfig.id}`, error)
      throw error
    }
  }

  /**
   * Create multiple sub-agents for a parent agent
   */
  async createSubAgents(parentAgent: BaseAgent, tasks: Task[]): Promise<BaseAgent[]> {
    const subAgentConfigs = this.planSubAgentDistribution(parentAgent, tasks)
    
    const subAgents = await Promise.all(
      subAgentConfigs.map(config => this.spawnSubAgent(config))
    )
    
    this.log('info', `Created ${subAgents.length} sub-agents for ${parentAgent.id}`)
    return subAgents
  }

  /**
   * Spawn a specialized sub-agent
   */
  private async spawnSubAgent(config: SubAgentConfig): Promise<BaseAgent> {
    const agent = await this.spawnAgent(config.type, config)
    
    // Assign delegated tasks
    for (const task of config.delegatedTasks) {
      await agent.assignTask(task)
    }
    
    return agent
  }

  /**
   * Intelligent work distribution across agents
   */
  distributeWork(tasks: Task[]): AgentWorkPlan {
    const plan: AgentWorkPlan = {
      immediate: [],
      background: [],
      scheduled: [],
      totalTokens: 0,
      estimatedDuration: 0,
      criticalPath: []
    }

    // Sort tasks by priority and dependencies
    const sortedTasks = this.prioritizeTasks(tasks)
    
    for (const task of sortedTasks) {
      plan.totalTokens += task.tokens
      plan.estimatedDuration += task.estimatedDuration
      
      if (task.priority === 'high' && !task.scheduledTime) {
        plan.immediate.push(task)
      } else if (task.scheduledTime) {
        plan.scheduled.push(task)
      } else {
        plan.background.push(task)
      }
    }

    // Determine critical path
    plan.criticalPath = this.calculateCriticalPath(sortedTasks)
    
    this.workPlan = plan
    this.emit('task-distributed', plan)
    
    return plan
  }

  /**
   * Execute the work plan using optimal agent allocation
   */
  async executeWorkPlan(plan: AgentWorkPlan): Promise<void> {
    try {
      this.log('info', 'Executing work plan', {
        immediate: plan.immediate.length,
        background: plan.background.length,
        scheduled: plan.scheduled.length
      })

      // Execute immediate tasks in parallel
      const immediatePromises = plan.immediate.map(task => 
        this.assignTaskToOptimalAgent(task)
      )
      
      // Execute background tasks with lower priority
      const backgroundPromises = plan.background.map(task =>
        this.assignTaskToOptimalAgent(task)
      )
      
      // Schedule future tasks
      this.scheduleDelayedTasks(plan.scheduled)
      
      // Wait for immediate tasks to complete
      await Promise.all(immediatePromises)
      
      // Wait for background tasks
      await Promise.all(backgroundPromises)
      
      this.log('info', 'Work plan execution completed')
      this.emit('work-plan-completed', plan)
      
    } catch (error) {
      this.log('error', 'Work plan execution failed', error)
      this.emit('work-plan-failed', { plan, error })
      throw error
    }
  }

  /**
   * Find the most suitable agent for a specific task
   */
  private async assignTaskToOptimalAgent(task: Task): Promise<any> {
    const suitableAgents = this.findSuitableAgents(task)
    
    if (suitableAgents.length === 0) {
      // No suitable agent exists, spawn one
      const agentType = this.determineRequiredAgentType(task)
      const newAgent = await this.spawnAgent(agentType, {
        tokenBudget: task.tokens * 2 // Give some buffer
      })
      return await newAgent.assignTask(task)
    }
    
    // Select the best agent based on current load and capabilities
    const optimalAgent = this.selectOptimalAgent(suitableAgents, task)
    return await optimalAgent.assignTask(task)
  }

  /**
   * Find agents that can handle a specific task
   */
  private findSuitableAgents(task: Task): BaseAgent[] {
    return Array.from(this.agentRegistry.values()).filter(agent => {
      return (
        agent.active &&
        agent.activeTasks.length < agent.tokenBudget &&
        this.agentCanHandleTask(agent, task)
      )
    })
  }

  /**
   * Determine if an agent can handle a specific task
   */
  private agentCanHandleTask(agent: BaseAgent, task: Task): boolean {
    const capabilities = agent.getCapabilities()
    const taskRequirements = task.tags || []
    
    return taskRequirements.some(requirement =>
      capabilities.some(cap => cap.name.includes(requirement))
    )
  }

  /**
   * Select the optimal agent from suitable candidates
   */
  private selectOptimalAgent(agents: BaseAgent[], task: Task): BaseAgent {
    return agents.reduce((best, current) => {
      const bestScore = this.calculateAgentScore(best, task)
      const currentScore = this.calculateAgentScore(current, task)
      return currentScore > bestScore ? current : best
    })
  }

  /**
   * Calculate agent suitability score for a task
   */
  private calculateAgentScore(agent: BaseAgent, task: Task): number {
    const status = agent.getStatus()
    const loadScore = (status.maxConcurrentTasks - status.activeTasks) / status.maxConcurrentTasks
    const performanceScore = status.performance.successRate * status.performance.tokenEfficiency
    const availabilityScore = agent.tokenBudget > task.tokens ? 1 : 0.5
    
    return (loadScore * 0.4) + (performanceScore * 0.4) + (availabilityScore * 0.2)
  }

  /**
   * Get comprehensive system health status
   */
  getSystemHealth(): SystemHealth {
    const agents = Array.from(this.agentRegistry.values())
    const agentMetrics = agents.map(agent => agent.getStatus().performance)
    
    const overallHealth = this.calculateOverallHealth(agents)
    const activeConnections = agents.filter(agent => agent.active).length
    const totalErrors = agentMetrics.reduce((sum, metrics) => sum + metrics.errorRate, 0)
    const errorRate = totalErrors / Math.max(agentMetrics.length, 1)
    
    return {
      timestamp: new Date(),
      overall: overallHealth,
      agents: agentMetrics,
      systemLoad: this.systemLoad,
      activeConnections,
      errorRate
    }
  }

  /**
   * Spawn essential core agents on startup
   */
  private async spawnCoreAgents(): Promise<void> {
    const coreAgents = [
      { type: 'session-monitor' as AgentType, tokenBudget: 500 },
      { type: 'token-tracker' as AgentType, tokenBudget: 300 },
      { type: 'quota-manager' as AgentType, tokenBudget: 200 },
      { type: 'data-collector' as AgentType, tokenBudget: 400 }
    ]
    
    for (const agentConfig of coreAgents) {
      await this.spawnAgent(agentConfig.type, agentConfig)
    }
  }

  // Event handlers
  private handleAgentSpawned(data: { agentId: string; type: AgentType }): void {
    this.log('info', `Agent spawned: ${data.type}:${data.agentId}`)
  }

  private handleAgentCompleted(data: { agentId: string }): void {
    this.log('info', `Agent completed: ${data.agentId}`)
  }

  private handleAgentFailed(data: { agentId: string; error: any }): void {
    this.log('error', `Agent failed: ${data.agentId}`, data.error)
  }

  private handleTaskDistributed(plan: AgentWorkPlan): void {
    this.log('info', 'Task distribution completed', {
      totalTasks: plan.immediate.length + plan.background.length + plan.scheduled.length,
      totalTokens: plan.totalTokens
    })
  }

  // Utility methods
  private generateAgentId(type: AgentType): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${type}_${timestamp}_${random}`
  }

  private setupAgentEventForwarding(agent: BaseAgent): void {
    agent.on('task-completed', (data) => this.emit('agent-task-completed', data))
    agent.on('task-failed', (data) => this.emit('agent-task-failed', data))
    agent.on('agent-error', (data) => this.emit('agent-error', data))
    agent.on('heartbeat', (data) => this.emit('agent-heartbeat', data))
  }

  private prioritizeTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      // Sort by priority first, then by dependencies
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      // Consider dependencies
      const aDeps = a.dependencies?.length || 0
      const bDeps = b.dependencies?.length || 0
      return aDeps - bDeps
    })
  }

  private calculateCriticalPath(tasks: Task[]): Task[] {
    // Simplified critical path calculation
    // In a full implementation, this would use proper CPM algorithm
    return tasks.filter(task => 
      task.priority === 'high' && 
      (task.dependencies?.length || 0) > 0
    ).slice(0, 5)
  }

  private scheduleDelayedTasks(tasks: Task[]): void {
    tasks.forEach(task => {
      if (task.scheduledTime) {
        const delay = task.scheduledTime.getTime() - Date.now()
        if (delay > 0) {
          setTimeout(() => {
            this.assignTaskToOptimalAgent(task)
          }, delay)
        }
      }
    })
  }

  private planSubAgentDistribution(parentAgent: BaseAgent, tasks: Task[]): SubAgentConfig[] {
    // Group tasks by type/capability required
    const taskGroups = this.groupTasksByCapability(tasks)
    
    return taskGroups.map((group, index) => ({
      ...parentAgent.getStatus(),
      id: `${parentAgent.id}_sub_${index}`,
      type: this.determineRequiredAgentType(group[0]),
      parentAgentId: parentAgent.id,
      delegatedTasks: group,
      reportingInterval: 5000,
      autonomyLevel: 'medium' as const,
      maxConcurrentTasks: Math.min(group.length, 3),
      tokenBudget: group.reduce((sum, task) => sum + task.tokens, 0)
    }))
  }

  private groupTasksByCapability(tasks: Task[]): Task[][] {
    const groups: { [key: string]: Task[] } = {}
    
    tasks.forEach(task => {
      const capability = task.tags?.[0] || 'general'
      if (!groups[capability]) {
        groups[capability] = []
      }
      groups[capability].push(task)
    })
    
    return Object.values(groups)
  }

  private determineRequiredAgentType(task: Task): AgentType {
    const taskName = task.name.toLowerCase()
    
    if (taskName.includes('session') || taskName.includes('monitor')) return 'session-monitor'
    if (taskName.includes('token') || taskName.includes('usage')) return 'token-tracker'
    if (taskName.includes('quota') || taskName.includes('limit')) return 'quota-manager'
    if (taskName.includes('calendar') || taskName.includes('schedule')) return 'calendar-sync'
    if (taskName.includes('hook') || taskName.includes('claude')) return 'claude-hooks'
    if (taskName.includes('test') || taskName.includes('quality')) return 'test-orchestrator'
    if (taskName.includes('deploy') || taskName.includes('production')) return 'deployment-manager'
    if (taskName.includes('data') || taskName.includes('collect')) return 'data-collector'
    
    return 'todo-generator' // Default fallback
  }

  private calculateOverallHealth(agents: BaseAgent[]): 'healthy' | 'degraded' | 'critical' {
    const healthScores = agents.map(agent => {
      const health = agent.getHealth()
      return health === 'healthy' ? 2 : health === 'degraded' ? 1 : 0
    })
    
    const averageHealth = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
    
    if (averageHealth >= 1.5) return 'healthy'
    if (averageHealth >= 0.5) return 'degraded'
    return 'critical'
  }

  private startSystemMonitoring(): void {
    setInterval(() => {
      // Update system load metrics
      this.updateSystemLoad()
      
      // Emit system health update
      this.emit('system-health-update', this.getSystemHealth())
    }, 10000) // Every 10 seconds
  }

  private updateSystemLoad(): void {
    // In a real implementation, this would use actual system monitoring
    this.systemLoad = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [AgentSpawner]`
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data ? JSON.stringify(data, null, 2) : '')
        break
      case 'warn':
        console.warn(`${prefix} WARNING: ${message}`, data ? JSON.stringify(data, null, 2) : '')
        break
      case 'error':
        console.error(`${prefix} ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '')
        break
    }
  }

  // Getters
  get activeAgentCount(): number {
    return Array.from(this.agentRegistry.values()).filter(agent => agent.active).length
  }

  get totalAgentCount(): number {
    return this.agentRegistry.size
  }

  get currentWorkPlan(): AgentWorkPlan | null {
    return this.workPlan
  }

  get active(): boolean {
    return this.isActive
  }
}