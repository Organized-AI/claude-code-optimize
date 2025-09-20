/**
 * TodoListAgent: Intelligent task generation and prioritization system
 * Creates comprehensive task lists for Claude Code Optimizer implementation
 */

import { BaseAgent } from './BaseAgent'
import { 
  Task, 
  ProjectConfig, 
  Constraints, 
  AgentCapability,
  WeeklyQuota 
} from './types'

export class TodoListAgent extends BaseAgent {
  private taskTemplates: Map<string, Partial<Task>[]> = new Map()
  private projectAnalysis: any = null

  async initialize(): Promise<void> {
    this.log('info', 'Initializing TodoListAgent...')
    
    // Register capabilities
    this.registerCapability({
      name: 'task-generation',
      description: 'Generate comprehensive task lists for projects',
      tokenCost: 50,
      estimatedDuration: 120000, // 2 minutes
      requirements: ['project-config'],
      outputType: 'task-list'
    })

    this.registerCapability({
      name: 'task-prioritization',
      description: 'Prioritize tasks based on constraints and dependencies',
      tokenCost: 30,
      estimatedDuration: 60000, // 1 minute
      requirements: ['task-list', 'constraints'],
      outputType: 'prioritized-task-list'
    })

    this.registerCapability({
      name: 'task-optimization',
      description: 'Optimize task allocation for maximum efficiency',
      tokenCost: 40,
      estimatedDuration: 90000, // 1.5 minutes
      requirements: ['task-list', 'agent-capabilities'],
      outputType: 'optimized-task-plan'
    })

    // Load task templates
    await this.loadTaskTemplates()
    
    this.log('info', 'TodoListAgent initialized successfully')
  }

  async execute(task: Task): Promise<any> {
    this.log('info', `Executing task: ${task.name}`)
    
    try {
      switch (task.name) {
        case 'generate-initial-tasks':
          return await this.generateInitialTasks(task.metadata?.projectConfig)
        case 'prioritize-tasks':
          return await this.prioritizeTasks(task.metadata?.tasks, task.metadata?.constraints)
        case 'optimize-task-allocation':
          return await this.optimizeTaskAllocation(task.metadata?.tasks, task.metadata?.agents)
        case 'create-project-roadmap':
          return await this.createProjectRoadmap(task.metadata?.projectConfig)
        case 'generate-daily-tasks':
          return await this.generateDailyTasks(task.metadata?.workPlan)
        default:
          throw new Error(`Unknown task: ${task.name}`)
      }
    } catch (error) {
      this.log('error', `Task execution failed: ${task.name}`, error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down TodoListAgent...')
    // Cleanup resources
    this.taskTemplates.clear()
    this.projectAnalysis = null
  }

  /**
   * Generate comprehensive initial task list for Claude Code Optimizer
   */
  async generateInitialTasks(projectConfig?: ProjectConfig): Promise<Task[]> {
    this.log('info', 'Generating initial tasks for Claude Code Optimizer')
    
    const config = projectConfig || this.getDefaultProjectConfig()
    
    const baseTasks: Task[] = [
      // Phase 0: Infrastructure Tasks (Day 1-2)
      {
        id: 'setup-electron',
        name: 'Initialize Electron Application',
        description: 'Setup Electron framework for desktop application',
        priority: 'high',
        tokens: 15,
        estimatedDuration: 60,
        dependencies: [],
        status: 'pending',
        tags: ['infrastructure', 'electron', 'setup'],
        metadata: {
          phase: 0,
          complexity: 'medium',
          agentType: 'deployment-manager'
        }
      },
      {
        id: 'setup-database',
        name: 'Configure SQLite Database',
        description: 'Setup SQLite database for session and token tracking',
        priority: 'high',
        tokens: 10,
        estimatedDuration: 45,
        dependencies: ['setup-electron'],
        status: 'pending',
        tags: ['database', 'sqlite', 'infrastructure'],
        metadata: {
          phase: 0,
          complexity: 'simple',
          agentType: 'data-collector'
        }
      },
      {
        id: 'setup-testing-framework',
        name: 'Configure Jest Testing Framework',
        description: 'Setup comprehensive testing infrastructure',
        priority: 'high',
        tokens: 12,
        estimatedDuration: 30,
        dependencies: ['setup-electron'],
        status: 'pending',
        tags: ['testing', 'jest', 'quality'],
        metadata: {
          phase: 0,
          complexity: 'simple',
          agentType: 'test-orchestrator'
        }
      },

      // Phase 1: Core Agent Tasks (Day 3-5)
      {
        id: 'session-monitor-agent',
        name: 'Build Session Monitor Agent',
        description: 'Create agent for real-time Claude Code session detection',
        priority: 'high',
        tokens: 25,
        estimatedDuration: 120,
        dependencies: ['setup-database'],
        status: 'pending',
        tags: ['agent', 'session-monitoring', 'core'],
        metadata: {
          phase: 1,
          complexity: 'complex',
          agentType: 'session-monitor'
        }
      },
      {
        id: 'token-tracker-agent',
        name: 'Build Token Tracking Agent',
        description: 'Create agent for precise token counting and usage tracking',
        priority: 'high',
        tokens: 20,
        estimatedDuration: 90,
        dependencies: ['session-monitor-agent'],
        status: 'pending',
        tags: ['agent', 'token-tracking', 'core'],
        metadata: {
          phase: 1,
          complexity: 'complex',
          agentType: 'token-tracker'
        }
      },
      {
        id: 'quota-manager-agent',
        name: 'Build Quota Management Agent',
        description: 'Create agent for weekly quota monitoring and optimization',
        priority: 'high',
        tokens: 18,
        estimatedDuration: 75,
        dependencies: ['token-tracker-agent'],
        status: 'pending',
        tags: ['agent', 'quota-management', 'optimization'],
        metadata: {
          phase: 1,
          complexity: 'medium',
          agentType: 'quota-manager'
        }
      },
      {
        id: 'claude-hooks-agent',
        name: 'Build Claude Hooks Integration Agent',
        description: 'Create agent for Claude Code hooks.json integration',
        priority: 'high',
        tokens: 15,
        estimatedDuration: 60,
        dependencies: ['setup-database'],
        status: 'pending',
        tags: ['agent', 'claude-integration', 'hooks'],
        metadata: {
          phase: 1,
          complexity: 'medium',
          agentType: 'claude-hooks'
        }
      },

      // Phase 2: Integration & Services (Day 6-7)
      {
        id: 'calendar-integration',
        name: 'Implement Calendar Sync Service',
        description: 'Build Google Calendar and Apple Calendar integration',
        priority: 'medium',
        tokens: 20,
        estimatedDuration: 100,
        dependencies: ['quota-manager-agent'],
        status: 'pending',
        tags: ['integration', 'calendar', 'scheduling'],
        metadata: {
          phase: 2,
          complexity: 'complex',
          agentType: 'calendar-sync'
        }
      },
      {
        id: 'backend-api',
        name: 'Build Backend API Layer',
        description: 'Create REST API and WebSocket server for dashboard',
        priority: 'high',
        tokens: 22,
        estimatedDuration: 110,
        dependencies: ['token-tracker-agent', 'session-monitor-agent'],
        status: 'pending',
        tags: ['api', 'backend', 'websocket'],
        metadata: {
          phase: 2,
          complexity: 'complex',
          agentType: 'deployment-manager'
        }
      },
      {
        id: 'real-time-sync',
        name: 'Implement Real-time Data Synchronization',
        description: 'Build WebSocket-based real-time updates',
        priority: 'medium',
        tokens: 16,
        estimatedDuration: 80,
        dependencies: ['backend-api'],
        status: 'pending',
        tags: ['real-time', 'websocket', 'sync'],
        metadata: {
          phase: 2,
          complexity: 'medium',
          agentType: 'data-collector'
        }
      },

      // Phase 3: Web Deployment (Day 8-9)
      {
        id: 'web-dashboard-enhancement',
        name: 'Enhance Web Dashboard',
        description: 'Upgrade dashboard with real-time backend integration',
        priority: 'medium',
        tokens: 18,
        estimatedDuration: 90,
        dependencies: ['backend-api', 'real-time-sync'],
        status: 'pending',
        tags: ['frontend', 'dashboard', 'enhancement'],
        metadata: {
          phase: 3,
          complexity: 'medium',
          agentType: 'deployment-manager'
        }
      },
      {
        id: 'production-deployment',
        name: 'Deploy to organizedai.vip',
        description: 'Deploy dashboard to production at dashboard.organizedai.vip',
        priority: 'medium',
        tokens: 15,
        estimatedDuration: 60,
        dependencies: ['web-dashboard-enhancement'],
        status: 'pending',
        tags: ['deployment', 'production', 'organizedai'],
        metadata: {
          phase: 3,
          complexity: 'simple',
          agentType: 'deployment-manager'
        }
      },

      // Phase 4: Testing & Quality Assurance (Continuous)
      {
        id: 'comprehensive-testing',
        name: 'Implement Comprehensive Testing Suite',
        description: 'Build unit, integration, and E2E tests',
        priority: 'high',
        tokens: 25,
        estimatedDuration: 120,
        dependencies: ['session-monitor-agent', 'token-tracker-agent'],
        status: 'pending',
        tags: ['testing', 'quality', 'automation'],
        metadata: {
          phase: 4,
          complexity: 'complex',
          agentType: 'test-orchestrator'
        }
      },
      {
        id: 'performance-optimization',
        name: 'Optimize System Performance',
        description: 'Optimize agent performance and resource usage',
        priority: 'medium',
        tokens: 20,
        estimatedDuration: 90,
        dependencies: ['comprehensive-testing'],
        status: 'pending',
        tags: ['performance', 'optimization', 'monitoring'],
        metadata: {
          phase: 4,
          complexity: 'medium',
          agentType: 'test-orchestrator'
        }
      }
    ]

    // Add technology-specific tasks based on project config
    const techTasks = this.generateTechnologySpecificTasks(config)
    
    // Combine and enrich tasks
    const allTasks = [...baseTasks, ...techTasks]
    const enrichedTasks = await this.enrichTasksWithDependencies(allTasks)
    
    this.log('info', `Generated ${enrichedTasks.length} initial tasks`)
    return enrichedTasks
  }

  /**
   * Prioritize tasks based on constraints and dependencies
   */
  async prioritizeTasks(tasks: Task[], constraints: Constraints): Promise<Task[]> {
    this.log('info', `Prioritizing ${tasks.length} tasks`)
    
    return tasks.sort((a, b) => {
      const scoreA = this.calculateTaskScore(a, constraints)
      const scoreB = this.calculateTaskScore(b, constraints)
      return scoreB - scoreA
    })
  }

  /**
   * Calculate task priority score based on multiple factors
   */
  private calculateTaskScore(task: Task, constraints: Constraints): number {
    let score = 0
    
    // Base priority score
    const priorityScores = { high: 100, medium: 50, low: 25 }
    score += priorityScores[task.priority]
    
    // Dependency factor (fewer dependencies = higher score)
    const dependencyPenalty = (task.dependencies?.length || 0) * 10
    score -= dependencyPenalty
    
    // Token efficiency (lower token cost = higher score for early tasks)
    const tokenScore = Math.max(0, 50 - task.tokens)
    score += tokenScore * 0.5
    
    // Duration factor (shorter tasks get slight priority)
    const durationScore = Math.max(0, 120 - task.estimatedDuration)
    score += durationScore * 0.3
    
    // Phase factor (earlier phases get priority)
    const phase = task.metadata?.phase || 0
    const phaseScore = Math.max(0, 10 - phase * 2)
    score += phaseScore
    
    // Quota constraint factor
    if (constraints.weeklyQuotaLimits) {
      const quotaUtilization = this.calculateQuotaUtilization(constraints.weeklyQuotaLimits)
      if (quotaUtilization > 0.8) {
        // Prefer lower token tasks when quota is tight
        score += (50 - task.tokens) * 0.8
      }
    }
    
    return score
  }

  /**
   * Generate technology-specific tasks based on project configuration
   */
  private generateTechnologySpecificTasks(config: ProjectConfig): Task[] {
    const tasks: Task[] = []
    
    if (config.technologies.includes('typescript')) {
      tasks.push({
        id: 'typescript-config',
        name: 'Configure TypeScript',
        description: 'Setup TypeScript configuration and type definitions',
        priority: 'medium',
        tokens: 8,
        estimatedDuration: 30,
        dependencies: ['setup-electron'],
        status: 'pending',
        tags: ['typescript', 'configuration'],
        metadata: { phase: 0, complexity: 'simple' }
      })
    }
    
    if (config.technologies.includes('react')) {
      tasks.push({
        id: 'react-optimization',
        name: 'Optimize React Components',
        description: 'Enhance React components for better performance',
        priority: 'medium',
        tokens: 15,
        estimatedDuration: 60,
        dependencies: ['web-dashboard-enhancement'],
        status: 'pending',
        tags: ['react', 'optimization'],
        metadata: { phase: 3, complexity: 'medium' }
      })
    }
    
    if (config.technologies.includes('websocket')) {
      tasks.push({
        id: 'websocket-security',
        name: 'Implement WebSocket Security',
        description: 'Add authentication and rate limiting for WebSocket connections',
        priority: 'high',
        tokens: 12,
        estimatedDuration: 45,
        dependencies: ['real-time-sync'],
        status: 'pending',
        tags: ['websocket', 'security'],
        metadata: { phase: 2, complexity: 'medium' }
      })
    }
    
    return tasks
  }

  /**
   * Enrich tasks with intelligent dependency analysis
   */
  private async enrichTasksWithDependencies(tasks: Task[]): Promise<Task[]> {
    // Build dependency graph
    const taskMap = new Map(tasks.map(task => [task.id, task]))
    
    for (const task of tasks) {
      // Add implicit dependencies based on task types
      const implicitDeps = this.findImplicitDependencies(task, tasks)
      task.dependencies = [...(task.dependencies || []), ...implicitDeps]
      
      // Validate dependencies exist
      task.dependencies = task.dependencies.filter(depId => taskMap.has(depId))
      
      // Add estimated completion time
      task.metadata = {
        ...task.metadata,
        estimatedCompletion: this.calculateEstimatedCompletion(task, taskMap)
      }
    }
    
    return tasks
  }

  /**
   * Find implicit dependencies between tasks
   */
  private findImplicitDependencies(task: Task, allTasks: Task[]): string[] {
    const dependencies: string[] = []
    
    // Agent tasks depend on infrastructure
    if (task.tags?.includes('agent') && !task.dependencies?.includes('setup-database')) {
      const dbTask = allTasks.find(t => t.id === 'setup-database')
      if (dbTask) dependencies.push('setup-database')
    }
    
    // Testing tasks depend on the features they test
    if (task.tags?.includes('testing')) {
      const relatedTasks = allTasks.filter(t => 
        t.tags?.some(tag => task.name.toLowerCase().includes(tag))
      )
      dependencies.push(...relatedTasks.map(t => t.id))
    }
    
    // Deployment tasks depend on completed features
    if (task.tags?.includes('deployment')) {
      const featureTasks = allTasks.filter(t => 
        t.tags?.includes('agent') || t.tags?.includes('api')
      )
      dependencies.push(...featureTasks.map(t => t.id))
    }
    
    return dependencies
  }

  /**
   * Calculate estimated completion time for a task
   */
  private calculateEstimatedCompletion(task: Task, taskMap: Map<string, Task>): Date {
    const now = new Date()
    
    // Calculate dependency chain duration
    const depChainDuration = this.calculateDependencyChainDuration(task, taskMap, new Set())
    
    // Add task duration
    const totalDuration = depChainDuration + task.estimatedDuration
    
    return new Date(now.getTime() + totalDuration * 60 * 1000) // Convert minutes to milliseconds
  }

  /**
   * Calculate the total duration of the dependency chain
   */
  private calculateDependencyChainDuration(
    task: Task, 
    taskMap: Map<string, Task>, 
    visited: Set<string>
  ): number {
    if (visited.has(task.id)) return 0 // Avoid circular dependencies
    visited.add(task.id)
    
    if (!task.dependencies || task.dependencies.length === 0) {
      return 0
    }
    
    let maxDuration = 0
    for (const depId of task.dependencies) {
      const depTask = taskMap.get(depId)
      if (depTask) {
        const depDuration = this.calculateDependencyChainDuration(depTask, taskMap, new Set(visited))
        const totalDepDuration = depDuration + depTask.estimatedDuration
        maxDuration = Math.max(maxDuration, totalDepDuration)
      }
    }
    
    return maxDuration
  }

  /**
   * Generate daily task recommendations
   */
  async generateDailyTasks(workPlan: any): Promise<Task[]> {
    const dailyTasks: Task[] = []
    const today = new Date()
    
    // Add monitoring tasks
    dailyTasks.push({
      id: 'daily-quota-check',
      name: 'Check Weekly Quota Status',
      description: 'Review current quota utilization and adjust plans',
      priority: 'high',
      tokens: 5,
      estimatedDuration: 10,
      dependencies: [],
      status: 'pending',
      scheduledTime: new Date(today.setHours(9, 0, 0, 0)),
      tags: ['daily', 'monitoring', 'quota']
    })
    
    dailyTasks.push({
      id: 'daily-performance-review',
      name: 'Review Agent Performance',
      description: 'Analyze agent performance metrics and optimize',
      priority: 'medium',
      tokens: 8,
      estimatedDuration: 15,
      dependencies: [],
      status: 'pending',
      scheduledTime: new Date(today.setHours(17, 0, 0, 0)),
      tags: ['daily', 'performance', 'optimization']
    })
    
    return dailyTasks
  }

  /**
   * Create comprehensive project roadmap
   */
  async createProjectRoadmap(config: ProjectConfig): Promise<any> {
    const tasks = await this.generateInitialTasks(config)
    const phases = this.groupTasksByPhase(tasks)
    
    return {
      projectName: config.name,
      totalTasks: tasks.length,
      totalTokens: tasks.reduce((sum, task) => sum + task.tokens, 0),
      estimatedDuration: tasks.reduce((sum, task) => sum + task.estimatedDuration, 0),
      phases,
      criticalPath: this.findCriticalPath(tasks),
      milestones: this.generateMilestones(phases)
    }
  }

  /**
   * Optimize task allocation for maximum efficiency
   */
  async optimizeTaskAllocation(tasks: Task[], agents: any[]): Promise<any> {
    const optimization = {
      parallelTasks: this.findParallelizableTasks(tasks),
      agentAssignments: this.optimizeAgentAssignments(tasks, agents),
      tokenUtilization: this.calculateOptimalTokenUtilization(tasks),
      timelineOptimization: this.optimizeTimeline(tasks)
    }
    
    return optimization
  }

  // Utility methods
  private loadTaskTemplates(): Promise<void> {
    // Load predefined task templates
    this.taskTemplates.set('web-app', [
      { name: 'Setup Frontend Framework', tokens: 10, estimatedDuration: 45 },
      { name: 'Configure Build System', tokens: 8, estimatedDuration: 30 },
      { name: 'Setup State Management', tokens: 12, estimatedDuration: 60 }
    ])
    
    this.taskTemplates.set('api', [
      { name: 'Design API Schema', tokens: 15, estimatedDuration: 90 },
      { name: 'Implement Endpoints', tokens: 20, estimatedDuration: 120 },
      { name: 'Add Authentication', tokens: 18, estimatedDuration: 90 }
    ])
    
    return Promise.resolve()
  }

  private getDefaultProjectConfig(): ProjectConfig {
    return {
      name: 'Claude Code Optimizer Dashboard',
      type: 'web-app',
      complexity: 'complex',
      technologies: ['typescript', 'react', 'electron', 'websocket', 'sqlite'],
      estimatedTokens: 500,
      priority: 'high'
    }
  }

  private calculateQuotaUtilization(quota: WeeklyQuota): number {
    const sonnetUtilization = quota.sonnet.used / quota.sonnet.total
    const opusUtilization = quota.opus.used / quota.opus.total
    return Math.max(sonnetUtilization, opusUtilization)
  }

  private groupTasksByPhase(tasks: Task[]): any {
    const phases: { [key: number]: Task[] } = {}
    
    tasks.forEach(task => {
      const phase = task.metadata?.phase || 0
      if (!phases[phase]) phases[phase] = []
      phases[phase].push(task)
    })
    
    return phases
  }

  private findCriticalPath(tasks: Task[]): Task[] {
    // Simplified critical path - tasks with most dependencies
    return tasks
      .filter(task => (task.dependencies?.length || 0) > 0)
      .sort((a, b) => (b.dependencies?.length || 0) - (a.dependencies?.length || 0))
      .slice(0, 5)
  }

  private generateMilestones(phases: any): any[] {
    return Object.keys(phases).map(phase => ({
      phase: parseInt(phase),
      name: `Phase ${phase} Complete`,
      tasks: phases[phase].length,
      estimatedCompletion: new Date(Date.now() + parseInt(phase) * 7 * 24 * 60 * 60 * 1000)
    }))
  }

  private findParallelizableTasks(tasks: Task[]): Task[][] {
    // Group tasks that can be executed in parallel
    const parallelGroups: Task[][] = []
    const processed = new Set<string>()
    
    tasks.forEach(task => {
      if (processed.has(task.id)) return
      
      const parallelTasks = tasks.filter(t => 
        !processed.has(t.id) &&
        !this.hasTaskDependency(task, t) &&
        !this.hasTaskDependency(t, task)
      )
      
      if (parallelTasks.length > 1) {
        parallelGroups.push(parallelTasks)
        parallelTasks.forEach(t => processed.add(t.id))
      }
    })
    
    return parallelGroups
  }

  private hasTaskDependency(taskA: Task, taskB: Task): boolean {
    return taskA.dependencies?.includes(taskB.id) || 
           taskB.dependencies?.includes(taskA.id) || 
           false
  }

  private optimizeAgentAssignments(tasks: Task[], agents: any[]): any {
    // Simplified assignment optimization
    return tasks.map(task => ({
      taskId: task.id,
      recommendedAgent: task.metadata?.agentType || 'general',
      confidence: 0.8
    }))
  }

  private calculateOptimalTokenUtilization(tasks: Task[]): any {
    const totalTokens = tasks.reduce((sum, task) => sum + task.tokens, 0)
    const highPriorityTokens = tasks
      .filter(task => task.priority === 'high')
      .reduce((sum, task) => sum + task.tokens, 0)
    
    return {
      totalTokens,
      highPriorityTokens,
      utilizationStrategy: 'front-loaded',
      recommendedBatchSize: Math.ceil(totalTokens / 10)
    }
  }

  private optimizeTimeline(tasks: Task[]): any {
    const sortedTasks = tasks.sort((a, b) => {
      const aDeps = a.dependencies?.length || 0
      const bDeps = b.dependencies?.length || 0
      return aDeps - bDeps
    })
    
    return {
      optimizedOrder: sortedTasks.map(task => task.id),
      estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      criticalMilestones: sortedTasks.slice(0, 3).map(task => ({
        taskId: task.id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }))
    }
  }
}