// MASTER ORCHESTRATION - API Contracts for Sub-Agent Coordination
// Session 1: Enhanced Dashboard with SDK Integration & Parallel Architecture

import { Session, SessionConfig, SessionStatus, SessionPlan } from '../types/Session';
import { QuotaStatus, QuotaPrediction, QuotaAlert } from '../types/Quota';
import { Project } from '../types/Project';

// =============================================================================
// UI/DASHBOARD SPECIALIST INTERFACE
// =============================================================================
export interface DashboardAPI {
  // State Management
  setDashboardState(state: DashboardState): void;
  updateSessionData(session: Session): void;
  updateQuotaStatus(quota: QuotaStatus): void;
  
  // User Actions
  onStartSession(config: SessionConfig): Promise<void>;
  onPlanProject(projectPath: string): Promise<void>;
  onScheduleSession(plan: SessionPlan): Promise<void>;
  onPauseSession(sessionId: string): Promise<void>;
  onResumeSession(sessionId: string): Promise<void>;
  
  // Real-time Updates
  subscribeToSessionUpdates(callback: (status: SessionStatus) => void): () => void;
  subscribeToQuotaUpdates(callback: (quota: QuotaStatus) => void): () => void;
}

export interface DashboardState {
  mode: 'waiting' | 'active' | 'planning' | 'error';
  currentSession?: Session;
  quotaStatus: QuotaStatus;
  recentSessions: Session[];
  alerts: QuotaAlert[];
  systemStatus: 'ready' | 'busy' | 'error' | 'maintenance';
  lastUpdate: Date;
}

// =============================================================================
// SDK INTEGRATION ENGINEER INTERFACE  
// =============================================================================
export interface ClaudeCodeAPI {
  // Session Management
  startSession(config: SessionConfig): Promise<Session>;
  getSessionStatus(sessionId: string): Promise<SessionStatus>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  stopSession(sessionId: string): Promise<Session>;
  
  // Monitoring
  monitorSession(sessionId: string): AsyncGenerator<SessionStatus>;
  getQuotaStatus(): Promise<QuotaStatus>;
  
  // Project Operations
  analyzeProject(projectPath: string): Promise<ProjectAnalysis>;
  generateSessionPlan(analysis: ProjectAnalysis): Promise<SessionPlan>;
  
  // Health & Diagnostics
  healthCheck(): Promise<HealthStatus>;
  getSystemCapabilities(): Promise<SystemCapabilities>;
}

export interface ProjectAnalysis {
  complexity: number; // 1-10 scale
  estimatedHours: number;
  estimatedTokens: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  fileAnalysis: FileAnalysis;
  dependencyAnalysis: DependencyAnalysis;
}

export interface HealthStatus {
  available: boolean;
  responseTime: number; // ms
  quotaAvailable: boolean;
  lastError?: string;
  capabilities: string[];
}

export interface SystemCapabilities {
  models: string[];
  maxSessionDuration: number; // minutes
  quotaLimits: QuotaStatus;
  features: string[];
}

// =============================================================================
// PROJECT ANALYSIS ARCHITECT INTERFACE
// =============================================================================
export interface ProjectAnalyzer {
  // Complexity Analysis
  analyzeComplexity(projectPath: string): Promise<ComplexityScore>;
  generateRiskAssessment(project: Project): Promise<RiskAssessment>;
  
  // Planning & Optimization
  createSessionPlan(analysis: ProjectAnalysis): Promise<SessionPlan>;
  optimizeModelAllocation(complexity: number, quota: QuotaStatus): Promise<ModelAllocation>;
  predictSessionOutcomes(plan: SessionPlan): Promise<SessionPrediction>;
  
  // Intelligence & Learning
  learnFromSession(session: Session): Promise<void>;
  getHistoricalInsights(projectType: string): Promise<HistoricalInsights>;
}

export interface ComplexityScore {
  overall: number; // 1-10
  factors: {
    codebase: number;
    dependencies: number;
    architecture: number;
    testing: number;
    documentation: number;
  };
  breakdown: ComplexityBreakdown;
  confidence: number; // 0-100
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  risks: RiskFactor[];
  mitigations: Mitigation[];
  quotaRisk: number; // 0-100
  timeRisk: number; // 0-100
}

export interface RiskFactor {
  type: 'quota' | 'complexity' | 'dependency' | 'time' | 'scope';
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: number; // 0-100
  mitigation?: string;
}

export interface ModelAllocation {
  sonnet: {
    hours: number;
    tasks: string[];
    reasoning: string;
  };
  opus: {
    hours: number;
    tasks: string[];
    reasoning: string;
  };
  optimization: string[];
}

// =============================================================================
// DATA PERSISTENCE SPECIALIST INTERFACE
// =============================================================================
export interface StorageAPI {
  // Session Management
  saveSession(session: Session): Promise<void>;
  loadSession(sessionId: string): Promise<Session | null>;
  getSessionHistory(): Promise<Session[]>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Quota Tracking
  saveQuotaUsage(usage: QuotaUsage): Promise<void>;
  getWeeklyUsage(): Promise<QuotaStatus>;
  getUsageHistory(days: number): Promise<UsageHistory[]>;
  
  // State Persistence
  saveAppState(state: AppState): Promise<void>;
  loadAppState(): Promise<AppState | null>;
  createBackup(): Promise<BackupInfo>;
  restoreFromBackup(backupId: string): Promise<void>;
  
  // Analytics & Insights
  getAnalytics(timeRange: TimeRange): Promise<AnalyticsData>;
  exportData(format: 'json' | 'csv' | 'xlsx'): Promise<ExportResult>;
}

export interface AppState {
  version: string;
  lastUpdate: Date;
  currentSession?: string;
  quotaStatus: QuotaStatus;
  preferences: UserPreferences;
  cacheData: CacheData;
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
  sessions: number;
  description?: string;
}

// =============================================================================
// TESTING & VALIDATION EXPERT INTERFACE
// =============================================================================
export interface TestingAPI {
  // Test Execution
  runUnitTests(): Promise<TestResults>;
  runIntegrationTests(): Promise<TestResults>;
  runPerformanceTests(): Promise<PerformanceResults>;
  
  // Validation
  validateQuotaProtection(): Promise<ValidationResult>;
  validateSessionFlow(): Promise<ValidationResult>;
  validateDataIntegrity(): Promise<ValidationResult>;
  
  // Monitoring & Alerts
  setupHealthChecks(): Promise<void>;
  monitorSystemHealth(): AsyncGenerator<HealthMetrics>;
  generateTestReport(): Promise<TestReport>;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // ms
  failures: TestFailure[];
  coverage: number; // percentage
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  recommendations: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// =============================================================================
// SHARED TYPES & UTILITIES
// =============================================================================
export interface TimeRange {
  start: Date;
  end: Date;
}

export interface FileAnalysis {
  totalFiles: number;
  codeFiles: number;
  testFiles: number;
  configFiles: number;
  largestFiles: FileInfo[];
  complexity: FileComplexity[];
}

export interface DependencyAnalysis {
  totalDependencies: number;
  directDependencies: number;
  devDependencies: number;
  vulnerabilities: Vulnerability[];
  outdated: OutdatedDependency[];
}

export interface ComplexityBreakdown {
  fileCount: number;
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // hours
}

export interface Mitigation {
  risk: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  estimatedEffort: number; // hours
  impact: string;
}

export interface SessionPrediction {
  successProbability: number; // 0-100
  estimatedDuration: number; // minutes
  quotaConsumption: QuotaPrediction;
  potentialIssues: string[];
  recommendations: string[];
}

export interface HistoricalInsights {
  averageComplexity: number;
  successRate: number;
  commonIssues: string[];
  bestPractices: string[];
  timePatterns: TimePattern[];
}

export interface QuotaUsage {
  timestamp: Date;
  sonnetHours: number;
  opusHours: number;
  cost: number;
  sessionId?: string;
}

export interface UsageHistory {
  date: Date;
  sessions: Session[];
  totalHours: number;
  totalCost: number;
  efficiency: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoBackup: boolean;
  defaultModel: 'sonnet' | 'opus';
  quotaWarningThreshold: number; // percentage
}

export interface CacheData {
  projectAnalyses: Map<string, ProjectAnalysis>;
  sessionTemplates: SessionConfig[];
  lastCleanup: Date;
}

export interface AnalyticsData {
  totalSessions: number;
  totalHours: number;
  averageEfficiency: number;
  costBreakdown: CostBreakdown;
  trendData: TrendData[];
  insights: string[];
}

export interface ExportResult {
  format: string;
  size: number;
  downloadUrl: string;
  expiresAt: Date;
}

export interface PerformanceResults {
  dashboardLoadTime: number; // ms
  apiResponseTime: number; // ms
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  recommendations: string[];
}

export interface TestFailure {
  test: string;
  error: string;
  stackTrace?: string;
  expected?: any;
  actual?: any;
}

export interface ValidationIssue {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  location?: string;
  fix?: string;
}

export interface HealthMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: boolean;
  apiHealth: boolean;
}

export interface TestReport {
  summary: TestResults;
  coverage: CoverageReport;
  performance: PerformanceResults;
  recommendations: string[];
  generatedAt: Date;
}

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  uncoveredLines: string[];
}

export interface FileInfo {
  path: string;
  size: number;
  lines: number;
  language: string;
}

export interface FileComplexity {
  path: string;
  complexity: number;
  maintainability: number;
  issues: string[];
}

export interface Vulnerability {
  package: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  fixAvailable: boolean;
}

export interface OutdatedDependency {
  package: string;
  current: string;
  latest: string;
  type: 'major' | 'minor' | 'patch';
}

export interface TimePattern {
  period: string;
  averageDuration: number;
  successRate: number;
  commonTasks: string[];
}

export interface CostBreakdown {
  sonnet: number;
  opus: number;
  total: number;
  currency: string;
  breakdown: Array<{
    date: Date;
    amount: number;
    model: string;
  }>;
}

export interface TrendData {
  timestamp: Date;
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

// =============================================================================
// EMERGENCY PROTOCOLS & QUOTA PROTECTION
// =============================================================================
export interface EmergencyAPI {
  // Quota Protection
  enforceQuotaLimits(action: string, quotaStatus: QuotaStatus): Promise<QuotaEnforcement>;
  handleQuotaEmergency(alert: QuotaAlert): Promise<EmergencyResponse>;
  
  // Session Protection
  handleSessionTimeout(sessionId: string): Promise<void>;
  handleSessionError(sessionId: string, error: Error): Promise<void>;
  
  // System Recovery
  initiateEmergencyShutdown(): Promise<void>;
  preserveSessionContext(sessionId: string): Promise<ContextBackup>;
  restoreSessionContext(backupId: string): Promise<void>;
}

export interface QuotaEnforcement {
  allowed: boolean;
  reason?: string;
  alternatives?: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  safeguards: string[];
}

export interface EmergencyResponse {
  action: 'pause' | 'stop' | 'switch_provider' | 'defer';
  reason: string;
  contextPreserved: boolean;
  resumeInstructions?: string[];
  estimatedDowntime?: number; // minutes
}

export interface ContextBackup {
  id: string;
  sessionId: string;
  timestamp: Date;
  contextSize: number;
  preservationRate: number; // 0-100
  resumeComplexity: 'simple' | 'moderate' | 'complex';
}

// =============================================================================
// COORDINATION & SYNCHRONIZATION
// =============================================================================
export interface CoordinationAPI {
  // Agent Status
  registerAgent(agentId: string, capabilities: string[]): Promise<void>;
  reportStatus(agentId: string, status: AgentStatus): Promise<void>;
  getAgentStatuses(): Promise<Map<string, AgentStatus>>;
  
  // Synchronization Points
  waitForSyncPoint(point: string, timeout?: number): Promise<void>;
  signalSyncPoint(point: string, data?: any): Promise<void>;
  
  // Conflict Resolution
  reportConflict(conflict: AgentConflict): Promise<ConflictResolution>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
}

export interface AgentStatus {
  agentId: string;
  phase: 'initializing' | 'working' | 'blocked' | 'completed' | 'error';
  progress: number; // 0-100
  currentTask?: string;
  estimatedCompletion?: Date;
  dependencies: string[];
  outputs: string[];
  issues: string[];
}

export interface AgentConflict {
  conflictId: string;
  agentsInvolved: string[];
  resource: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedResolution?: string;
}

export interface ConflictResolution {
  resolution: 'agent_priority' | 'resource_sharing' | 'sequential_access' | 'coordinator_override';
  instructions: string[];
  affectedAgents: string[];
  implementationTime: number; // minutes
}

// Export all interfaces for sub-agent consumption
export * from '../types/Session';
export * from '../types/Quota';
export * from '../types/Project';