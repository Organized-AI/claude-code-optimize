/**
 * Core Agent System Types
 * Defines the foundational types for the Claude Code Optimizer agent infrastructure
 */

export interface Task {
  id: string
  name: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  tokens: number
  estimatedDuration: number // minutes
  dependencies?: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  scheduledTime?: Date
  completedTime?: Date
  tags?: string[]
  metadata?: Record<string, any>
}

export interface AgentConfig {
  id: string
  type: AgentType
  name: string
  capabilities: string[]
  maxConcurrentTasks: number
  tokenBudget: number
  priority: number
  parentAgentId?: string
  specializations?: string[]
}

export type AgentType = 
  | 'master'
  | 'todo-generator'
  | 'session-monitor'
  | 'token-tracker'
  | 'quota-manager'
  | 'claude-hooks'
  | 'calendar-sync'
  | 'data-collector'
  | 'test-orchestrator'
  | 'deployment-manager'

export interface AgentWorkPlan {
  immediate: Task[]
  background: Task[]
  scheduled: Task[]
  totalTokens: number
  estimatedDuration: number
  criticalPath: Task[]
}

export interface SessionInfo {
  id: string
  startTime: Date
  endTime?: Date
  workingDirectory: string
  projectName: string
  model: 'sonnet' | 'opus'
  tokenCount: number
  promptCount: number
  status: 'active' | 'completed' | 'failed'
  files: string[]
  commands: string[]
  metadata: Record<string, any>
}

export interface TokenMetrics {
  totalTokens: number
  promptCount: number
  averageTokensPerPrompt: number
  efficiency: number // percentage
  projectedTotal: number
  remainingBudget: number
  costEstimate: number
}

export interface WeeklyQuota {
  sonnet: {
    used: number
    total: number
    remaining: number
    sessionsRemaining: number
  }
  opus: {
    used: number
    total: number
    remaining: number
    sessionsRemaining: number
  }
  weekStart: Date
  weekEnd: Date
}

export interface ProjectConfig {
  name: string
  type: 'web-app' | 'api' | 'library' | 'cli' | 'mobile'
  complexity: 'simple' | 'medium' | 'complex'
  technologies: string[]
  estimatedTokens: number
  deadline?: Date
  priority: 'high' | 'medium' | 'low'
}

export interface Constraints {
  maxTokensPerSession: number
  maxSessionDuration: number // minutes
  availableTimeSlots: TimeSlot[]
  weeklyQuotaLimits: WeeklyQuota
  modelPreferences: {
    sonnet: number // percentage
    opus: number // percentage
  }
}

export interface TimeSlot {
  start: Date
  end: Date
  duration: number // minutes
  type: 'coding' | 'planning' | 'testing' | 'review'
  availability: 'free' | 'busy' | 'tentative'
}

export interface AgentMessage {
  id: string
  from: string
  to: string
  type: 'task' | 'result' | 'status' | 'error'
  timestamp: Date
  payload: any
  priority: 'high' | 'medium' | 'low'
}

export interface AgentCapability {
  name: string
  description: string
  tokenCost: number
  estimatedDuration: number
  requirements: string[]
  outputType: string
}

export interface SubAgentConfig extends AgentConfig {
  parentAgentId: string
  delegatedTasks: Task[]
  reportingInterval: number // milliseconds
  autonomyLevel: 'low' | 'medium' | 'high'
}

export interface DetectionStrategy {
  name: string
  priority: number
  detect(): Promise<SessionInfo | null>
  canDetect(): Promise<boolean>
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  start: Date
  end: Date
  location?: string
  attendees?: string[]
  reminders: number[] // minutes before
  type: 'coding' | 'planning' | 'testing' | 'meeting'
  metadata?: Record<string, any>
}

export interface Schedule {
  id: string
  week: Date
  codingBlocks: TimeSlot[]
  planningBlocks: TimeSlot[]
  testingBlocks: TimeSlot[]
  bufferTime: number
  totalAllocatedTime: number
  efficiency: number
}

export interface TestResults {
  suiteName: string
  timestamp: Date
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: number
  details: TestDetail[]
}

export interface TestDetail {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  assertions?: number
}

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production'
  domain: string
  ssl: boolean
  cdn?: string
  monitoring?: string
  database?: string
  scaling?: {
    min: number
    max: number
    target: number
  }
}

export interface AgentPerformanceMetrics {
  agentId: string
  tasksCompleted: number
  averageTaskDuration: number
  successRate: number
  tokenEfficiency: number
  uptime: number
  errorRate: number
  lastActive: Date
}

export interface SystemHealth {
  timestamp: Date
  overall: 'healthy' | 'degraded' | 'critical'
  agents: AgentPerformanceMetrics[]
  systemLoad: {
    cpu: number
    memory: number
    disk: number
  }
  activeConnections: number
  errorRate: number
}