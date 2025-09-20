/**
 * Agent Interface Contracts for Claude Code Optimizer Dashboard
 * Defines contracts for intelligent project analysis, risk assessment, and session planning
 */

// Core complexity analysis interfaces
export interface ComplexityMetrics {
  overall: number; // 1-10 scale overall complexity score
  codebase: CodebaseComplexity;
  dependencies: DependencyComplexity;
  architecture: ArchitectureComplexity;
  testing: TestingComplexity;
  documentation: DocumentationComplexity;
}

export interface CodebaseComplexity {
  score: number; // 1-10
  fileCount: number;
  linesOfCode: number;
  cyclomaticComplexity: number;
  duplicateCodePercentage: number;
  languageCount: number;
  factors: ComplexityFactor[];
}

export interface DependencyComplexity {
  score: number; // 1-10
  totalDependencies: number;
  outdatedDependencies: number;
  vulnerabilities: SecurityVulnerability[];
  dependencyDepth: number;
  factors: ComplexityFactor[];
}

export interface ArchitectureComplexity {
  score: number; // 1-10
  maintainabilityIndex: number;
  technicalDebtHours: number;
  couplingScore: number;
  cohesionScore: number;
  factors: ComplexityFactor[];
}

export interface TestingComplexity {
  score: number; // 1-10
  coveragePercentage: number;
  testFileCount: number;
  testQualityScore: number;
  factors: ComplexityFactor[];
}

export interface DocumentationComplexity {
  score: number; // 1-10
  completenessPercentage: number;
  readmeQuality: number;
  apiDocumentationScore: number;
  factors: ComplexityFactor[];
}

export interface ComplexityFactor {
  name: string;
  impact: number; // -5 to +5 impact on complexity
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityVulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  package: string;
  description: string;
  fixAvailable: boolean;
}

// Risk assessment interfaces
export interface RiskAssessment {
  overall: number; // 0-100 overall risk percentage
  quotaRisk: QuotaRisk;
  timeRisk: TimeRisk;
  complexityRisk: ComplexityRisk;
  mitigationStrategies: MitigationStrategy[];
}

export interface QuotaRisk {
  probability: number; // 0-100 probability of exceeding quota
  currentUsage: QuotaUsage;
  projectedUsage: QuotaUsage;
  timeToLimit: number; // minutes until hitting 90% quota
  recommendations: string[];
}

export interface QuotaUsage {
  sonnet: {
    used: number; // hours
    limit: number; // hours
    percentage: number;
  };
  opus: {
    used: number; // hours
    limit: number; // hours
    percentage: number;
  };
}

export interface TimeRisk {
  probability: number; // 0-100 probability of time overrun
  estimatedDuration: number; // minutes
  confidence: number; // 0-100 confidence in estimate
  bufferTime: number; // minutes recommended buffer
  factors: RiskFactor[];
}

export interface ComplexityRisk {
  probability: number; // 0-100 probability of complexity issues
  riskFactors: RiskFactor[];
  impactAreas: string[];
}

export interface RiskFactor {
  name: string;
  probability: number; // 0-100
  impact: number; // 1-10
  description: string;
}

export interface MitigationStrategy {
  riskType: 'quota' | 'time' | 'complexity';
  strategy: string;
  impact: number; // 1-10 effectiveness
  effort: number; // 1-10 implementation effort
  priority: 'low' | 'medium' | 'high';
}

// Session planning interfaces
export interface SessionPlan {
  totalEstimatedTime: number; // minutes
  modelAllocation: ModelAllocation;
  sessionSequence: PlannedSession[];
  tokenBudget: TokenBudget;
  recommendations: string[];
  confidence: number; // 0-100
}

export interface ModelAllocation {
  sonnet: {
    estimatedTime: number; // minutes
    percentage: number;
    tasks: string[];
  };
  opus: {
    estimatedTime: number; // minutes
    percentage: number;
    tasks: string[];
  };
}

export interface PlannedSession {
  id: string;
  name: string;
  model: 'sonnet' | 'opus';
  estimatedDuration: number; // minutes
  estimatedTokens: number;
  tasks: string[];
  dependencies: string[]; // IDs of sessions that must complete first
  priority: number; // 1-10
}

export interface TokenBudget {
  total: number;
  sonnet: number;
  opus: number;
  buffer: number; // safety buffer
  breakdown: TokenBreakdown[];
}

export interface TokenBreakdown {
  category: string;
  estimatedTokens: number;
  confidence: number; // 0-100
}

// Historical insights interfaces
export interface HistoricalInsights {
  similarProjects: SimilarProject[];
  successPrediction: SuccessPrediction;
  optimizations: OptimizationRecommendation[];
  trends: ProjectTrend[];
}

export interface SimilarProject {
  id: string;
  name: string;
  similarity: number; // 0-100
  complexity: number; // 1-10
  actualDuration: number; // minutes
  tokensUsed: number;
  success: boolean;
  lessons: string[];
}

export interface SuccessPrediction {
  probability: number; // 0-100
  confidence: number; // 0-100
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  weight: number; // 0-1
  contribution: number; // -100 to +100
  description: string;
}

export interface OptimizationRecommendation {
  type: 'model_allocation' | 'session_sequencing' | 'time_management' | 'complexity_reduction';
  recommendation: string;
  expectedImprovement: number; // percentage improvement
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ProjectTrend {
  period: string;
  metric: string;
  value: number;
  change: number; // percentage change
  trend: 'improving' | 'stable' | 'declining';
}

// Main ProjectAnalyzer interface
export interface ProjectAnalyzer {
  // Core analysis methods
  analyzeComplexity(projectPath: string, options?: AnalysisOptions): Promise<ComplexityMetrics>;
  assessRisk(complexity: ComplexityMetrics, currentQuotas: QuotaUsage): Promise<RiskAssessment>;
  planSessions(complexity: ComplexityMetrics, risk: RiskAssessment): Promise<SessionPlan>;
  getHistoricalInsights(complexity: ComplexityMetrics): Promise<HistoricalInsights>;
  
  // Utility methods
  predictOutcome(plan: SessionPlan, insights: HistoricalInsights): Promise<SuccessPrediction>;
  optimizeAllocation(plan: SessionPlan, constraints: AllocationConstraints): Promise<SessionPlan>;
  validatePlan(plan: SessionPlan, quotas: QuotaUsage): Promise<ValidationResult>;
  
  // Learning methods
  recordOutcome(sessionId: string, outcome: SessionOutcome): Promise<void>;
  updateModels(outcomes: SessionOutcome[]): Promise<void>;
  getRecommendations(context: ProjectContext): Promise<OptimizationRecommendation[]>;
}

export interface AnalysisOptions {
  includeTests?: boolean;
  includeDocs?: boolean;
  includeNodeModules?: boolean;
  maxDepth?: number;
  customPatterns?: string[];
}

export interface AllocationConstraints {
  maxSonnetTime?: number; // minutes
  maxOpusTime?: number; // minutes
  quotaBuffer?: number; // percentage to keep as buffer
  preferredModel?: 'sonnet' | 'opus';
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

export interface SessionOutcome {
  sessionId: string;
  plannedDuration: number;
  actualDuration: number;
  plannedTokens: number;
  actualTokens: number;
  model: 'sonnet' | 'opus';
  success: boolean;
  complexity: number;
  tasks: string[];
  issues: string[];
  learnings: string[];
}

export interface ProjectContext {
  projectType: string;
  complexity: ComplexityMetrics;
  currentQuotas: QuotaUsage;
  timeConstraints?: {
    deadline?: number; // timestamp
    availableHours?: number;
  };
  preferences?: {
    model?: 'sonnet' | 'opus';
    riskTolerance?: 'low' | 'medium' | 'high';
  };
}

// Storage and persistence interfaces
export interface StorageAPI {
  // Session storage
  saveSession(session: SessionData): Promise<void>;
  getSession(sessionId: string): Promise<SessionData | null>;
  getAllSessions(filter?: SessionFilter): Promise<SessionData[]>;
  deleteSession(sessionId: string): Promise<void>;
  updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void>;
  
  // Session context and state
  saveSessionContext(sessionId: string, context: SessionContext): Promise<void>;
  getSessionContext(sessionId: string): Promise<SessionContext | null>;
  deleteSessionContext(sessionId: string): Promise<void>;
  
  // Quota tracking
  saveQuotaUsage(usage: DetailedQuotaUsage): Promise<void>;
  getQuotaUsage(period?: QuotaPeriod): Promise<DetailedQuotaUsage>;
  getQuotaHistory(period: QuotaPeriod): Promise<QuotaHistoryEntry[]>;
  getQuotaAnalytics(): Promise<QuotaAnalytics>;
  
  // Application state
  saveAppState(state: AppState): Promise<void>;
  getAppState(): Promise<AppState | null>;
  saveUserPreferences(preferences: UserPreferences): Promise<void>;
  getUserPreferences(): Promise<UserPreferences>;
  
  // Analytics and insights
  saveAnalyticsEvent(event: AnalyticsEvent): Promise<void>;
  getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;
  generateReport(type: ReportType, period: QuotaPeriod): Promise<AnalyticsReport>;
  
  // Backup and recovery
  createBackup(): Promise<BackupManifest>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(): Promise<BackupManifest[]>;
  deleteBackup(backupId: string): Promise<void>;
  validateDataIntegrity(): Promise<IntegrityReport>;
  
  // Search and filtering
  searchSessions(query: SearchQuery): Promise<SessionData[]>;
  searchAnalytics(query: AnalyticsSearchQuery): Promise<AnalyticsEvent[]>;
  
  // Export and import
  exportData(format: ExportFormat, filter?: DataFilter): Promise<ExportResult>;
  importData(data: ImportData): Promise<ImportResult>;
}

export interface SessionData {
  id: string;
  name?: string;
  startTime: number;
  endTime?: number;
  duration: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  model: 'sonnet' | 'opus';
  tokensUsed: number;
  tokenBudget?: number;
  complexity?: ComplexityMetrics;
  riskAssessment?: RiskAssessment;
  sessionPlan?: SessionPlan;
  checkpoints: CheckpointData[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface SessionContext {
  sessionId: string;
  projectPath?: string;
  workingDirectory?: string;
  openFiles: string[];
  recentCommands: string[];
  environmentVariables: Record<string, string>;
  activeTools: string[];
  conversationHistory: ConversationEntry[];
  currentTask?: string;
  progress: number; // 0-100
  notes: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokens: number;
  metadata?: Record<string, any>;
}

export interface CheckpointData {
  id: string;
  sessionId: string;
  name: string;
  phase: string;
  promptCount: number;
  tokensUsed: number;
  timestamp: number;
  context: SessionContext;
  metadata: Record<string, any>;
}

export interface DetailedQuotaUsage {
  period: QuotaPeriod;
  startTime: number;
  endTime: number;
  sonnet: ModelQuotaUsage;
  opus: ModelQuotaUsage;
  totalSessions: number;
  averageSessionDuration: number;
  peakUsageHours: number[];
  efficiency: QuotaEfficiency;
  updatedAt: number;
}

export interface ModelQuotaUsage {
  used: number; // hours
  limit: number; // hours
  percentage: number;
  sessions: number;
  averageTokensPerHour: number;
  peakUsage: number;
  trends: UsageTrend[];
}

export interface UsageTrend {
  timestamp: number;
  value: number;
  change: number; // percentage change from previous
}

export interface QuotaEfficiency {
  tokensPerHour: number;
  sessionsPerHour: number;
  completionRate: number; // percentage of successful sessions
  averageComplexityHandled: number;
  wastedQuota: number; // unused allocated time
}

export interface QuotaHistoryEntry {
  timestamp: number;
  sonnetUsage: number;
  opusUsage: number;
  sessionCount: number;
  efficiency: number;
}

export interface QuotaAnalytics {
  currentPeriod: DetailedQuotaUsage;
  projectedUsage: QuotaProjection;
  recommendations: QuotaRecommendation[];
  alerts: QuotaAlert[];
  trends: QuotaTrend[];
  benchmarks: QuotaBenchmark[];
}

export interface QuotaProjection {
  model: 'sonnet' | 'opus';
  projectedUsage: number;
  confidence: number;
  timeToLimit: number; // minutes
  basedOnSessions: number;
}

export interface QuotaRecommendation {
  type: 'optimization' | 'allocation' | 'timing' | 'model_switch';
  message: string;
  impact: number; // estimated percentage improvement
  priority: 'low' | 'medium' | 'high';
  actionRequired: boolean;
}

export interface QuotaAlert {
  type: 'approaching_limit' | 'efficiency_drop' | 'unusual_usage' | 'quota_exceeded';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
}

export interface QuotaTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number; // percentage change
  period: QuotaPeriod;
  significance: 'low' | 'medium' | 'high';
}

export interface QuotaBenchmark {
  metric: string;
  value: number;
  percentile: number; // compared to historical data
  category: 'excellent' | 'good' | 'average' | 'poor';
}

export interface AppState {
  currentSession?: string;
  activeModel: 'sonnet' | 'opus';
  dashboardLayout: DashboardLayout;
  filters: FilterSettings;
  sorting: SortSettings;
  notifications: NotificationSettings;
  theme: 'light' | 'dark' | 'auto';
  lastActive: number;
  version: string;
}

export interface DashboardLayout {
  panels: PanelConfig[];
  grid: GridConfig;
  sidebarWidth: number;
  collapsed: string[];
}

export interface PanelConfig {
  id: string;
  type: string;
  visible: boolean;
  position: { x: number; y: number; w: number; h: number };
  settings: Record<string, any>;
}

export interface GridConfig {
  cols: number;
  rows: number;
  gap: number;
  padding: number;
}

export interface FilterSettings {
  status: string[];
  model: string[];
  dateRange: { start: number; end: number };
  complexity: { min: number; max: number };
  tags: string[];
}

export interface SortSettings {
  field: string;
  direction: 'asc' | 'desc';
  secondary?: { field: string; direction: 'asc' | 'desc' };
}

export interface NotificationSettings {
  quotaWarnings: boolean;
  sessionAlerts: boolean;
  efficiency: boolean;
  backupReminders: boolean;
  thresholds: {
    quotaWarning: number; // percentage
    lowEfficiency: number; // percentage
    longSession: number; // minutes
  };
}

export interface UserPreferences {
  defaultModel: 'sonnet' | 'opus';
  defaultSessionDuration: number; // minutes
  autoSave: boolean;
  autoBackup: boolean;
  backupFrequency: number; // hours
  maxStoredSessions: number;
  dataRetention: number; // days
  exportFormat: ExportFormat;
  timezone: string;
  language: string;
  analytics: {
    collectUsage: boolean;
    shareAnonymous: boolean;
    detailedLogging: boolean;
  };
}

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  sessionId?: string;
  timestamp: number;
  data: Record<string, any>;
  tags: string[];
  userId?: string;
}

export interface AnalyticsQuery {
  eventTypes?: AnalyticsEventType[];
  sessionIds?: string[];
  timeRange: { start: number; end: number };
  filters?: Record<string, any>;
  groupBy?: string[];
  metrics?: string[];
  limit?: number;
  offset?: number;
}

export interface AnalyticsResult {
  events: AnalyticsEvent[];
  aggregations: Record<string, number>;
  trends: AnalyticsTrend[];
  insights: AnalyticsInsight[];
  totalCount: number;
}

export interface AnalyticsTrend {
  metric: string;
  values: { timestamp: number; value: number }[];
  trend: 'up' | 'down' | 'stable';
  correlation?: number;
}

export interface AnalyticsInsight {
  type: 'pattern' | 'anomaly' | 'correlation' | 'prediction';
  message: string;
  confidence: number;
  data: Record<string, any>;
  actionable: boolean;
}

export interface AnalyticsReport {
  id: string;
  type: ReportType;
  period: QuotaPeriod;
  generatedAt: number;
  data: {
    summary: ReportSummary;
    sections: ReportSection[];
    charts: ChartData[];
    recommendations: string[];
  };
}

export interface ReportSummary {
  totalSessions: number;
  totalTokens: number;
  averageEfficiency: number;
  topPerformingModel: 'sonnet' | 'opus';
  mostComplexProject: string;
  keyInsights: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  charts?: string[];
  tables?: TableData[];
  insights?: string[];
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  data: any[];
  config: Record<string, any>;
}

export interface TableData {
  headers: string[];
  rows: any[][];
  pagination?: { page: number; total: number; size: number };
}

export interface BackupManifest {
  id: string;
  timestamp: number;
  version: string;
  size: number;
  checksum: string;
  contents: BackupContent[];
  metadata: {
    sessionsCount: number;
    quotaDataSize: number;
    analyticsEventsCount: number;
    appStateSize: number;
  };
}

export interface BackupContent {
  type: 'sessions' | 'quota' | 'analytics' | 'app_state' | 'user_preferences';
  count: number;
  size: number;
  checksum: string;
}

export interface IntegrityReport {
  status: 'healthy' | 'warning' | 'error';
  timestamp: number;
  checks: IntegrityCheck[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  recommendations: string[];
}

export interface IntegrityCheck {
  name: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}

export interface SearchQuery {
  text?: string;
  filters?: {
    status?: string[];
    model?: string[];
    dateRange?: { start: number; end: number };
    complexity?: { min?: number; max?: number };
    tags?: string[];
  };
  sort?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface AnalyticsSearchQuery {
  eventTypes?: AnalyticsEventType[];
  timeRange: { start: number; end: number };
  text?: string;
  sessionIds?: string[];
  limit?: number;
  offset?: number;
}

export interface ExportResult {
  format: ExportFormat;
  data: string | Buffer;
  filename: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
}

export interface ImportData {
  format: ExportFormat;
  data: string | Buffer;
  metadata?: Record<string, any>;
  options?: {
    merge?: boolean;
    skipDuplicates?: boolean;
    validateIntegrity?: boolean;
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    sessions: number;
    quotaData: number;
    analyticsEvents: number;
    appState: boolean;
    userPreferences: boolean;
  };
  errors: string[];
  warnings: string[];
  duplicatesSkipped: number;
}

export interface SessionFilter {
  status?: string[];
  model?: string[];
  dateRange?: { start: number; end: number };
  complexity?: { min?: number; max?: number };
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface DataFilter {
  includeAnalytics?: boolean;
  includeSessions?: boolean;
  includeQuotaData?: boolean;
  includeAppState?: boolean;
  dateRange?: { start: number; end: number };
}

export type QuotaPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ReportType = 'usage' | 'efficiency' | 'trends' | 'insights' | 'performance';
export type ExportFormat = 'json' | 'csv' | 'excel' | 'pdf';
export type AnalyticsEventType = 
  | 'session_start' | 'session_end' | 'session_pause' | 'session_resume'
  | 'checkpoint_created' | 'token_usage' | 'quota_warning' | 'error'
  | 'user_action' | 'system_event' | 'performance_metric';

// Testing and Validation API interfaces
export interface TestingAPI {
  // Quota protection validation
  validateQuotaProtection(scenarios: QuotaTestScenario[]): Promise<QuotaValidationResult>;
  testQuotaLimits(model: 'sonnet' | 'opus', testCases: QuotaLimitTest[]): Promise<QuotaLimitResult[]>;
  simulateQuotaExhaustion(model: 'sonnet' | 'opus', approachRate: number): Promise<QuotaExhaustionResult>;
  
  // System integration testing
  runIntegrationTests(testSuite: IntegrationTestSuite): Promise<IntegrationTestResult>;
  validateSystemIntegrity(): Promise<SystemIntegrityReport>;
  testWebSocketConnections(): Promise<WebSocketTestResult>;
  validateDataConsistency(): Promise<DataConsistencyReport>;
  
  // Performance testing
  runLoadTests(config: LoadTestConfig): Promise<LoadTestResult>;
  benchmarkPerformance(scenarios: PerformanceScenario[]): Promise<PerformanceBenchmark>;
  monitorMemoryUsage(duration: number): Promise<MemoryUsageReport>;
  testConcurrentSessions(sessionCount: number): Promise<ConcurrencyTestResult>;
  
  // Data integrity validation
  validateDataIntegrity(): Promise<DataIntegrityReport>;
  testBackupRestore(): Promise<BackupRestoreTestResult>;
  validateSessionPersistence(): Promise<SessionPersistenceReport>;
  testDatabaseConsistency(): Promise<DatabaseConsistencyReport>;
  
  // Health monitoring
  getSystemHealth(): Promise<SystemHealthReport>;
  runHealthChecks(checks: HealthCheck[]): Promise<HealthCheckResult[]>;
  monitorSystemMetrics(duration: number): Promise<SystemMetricsReport>;
  detectAnomalies(timeRange: { start: number; end: number }): Promise<AnomalyReport>;
  
  // Test automation
  scheduleTestRun(schedule: TestSchedule): Promise<void>;
  getTestHistory(filter?: TestHistoryFilter): Promise<TestExecution[]>;
  generateTestReport(testRun: string): Promise<TestReport>;
  
  // Emergency protocols
  testEmergencyProtocols(): Promise<EmergencyProtocolResult>;
  simulateSystemFailure(failureType: SystemFailureType): Promise<FailureSimulationResult>;
  validateRecoveryProcedures(): Promise<RecoveryValidationResult>;
}

// Testing interface types
export interface QuotaTestScenario {
  id: string;
  name: string;
  model: 'sonnet' | 'opus';
  currentUsage: number; // hours
  plannedUsage: number; // hours
  timeframe: number; // minutes
  expectedOutcome: 'allow' | 'block' | 'warn';
}

export interface QuotaValidationResult {
  totalTests: number;
  passed: number;
  failed: number;
  scenarios: {
    id: string;
    passed: boolean;
    actualOutcome: 'allow' | 'block' | 'warn';
    expectedOutcome: 'allow' | 'block' | 'warn';
    details: string;
  }[];
  summary: string;
  criticalFailures: string[];
}

export interface QuotaLimitTest {
  currentHours: number;
  additionalHours: number;
  description: string;
}

export interface QuotaLimitResult {
  test: QuotaLimitTest;
  withinLimit: boolean;
  finalPercentage: number;
  blocked: boolean;
  message: string;
}

export interface QuotaExhaustionResult {
  model: 'sonnet' | 'opus';
  startingUsage: number;
  finalUsage: number;
  timeToBlock: number;
  emergencyProtocolTriggered: boolean;
  blockingThreshold: number;
  logs: string[];
}

export interface IntegrationTestSuite {
  name: string;
  tests: IntegrationTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface IntegrationTest {
  name: string;
  description: string;
  test: () => Promise<TestResult>;
  timeout?: number;
  critical?: boolean;
}

export interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
  details?: any;
}

export interface IntegrationTestResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  summary: string;
}

export interface SystemIntegrityReport {
  timestamp: number;
  overall: 'healthy' | 'degraded' | 'critical';
  components: ComponentStatus[];
  dependencies: DependencyStatus[];
  recommendations: string[];
}

export interface ComponentStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'failed';
  message: string;
  metrics?: Record<string, number>;
}

export interface DependencyStatus {
  name: string;
  version: string;
  status: 'available' | 'unavailable' | 'degraded';
  responseTime?: number;
}

export interface WebSocketTestResult {
  connectionsTested: number;
  successful: number;
  failed: number;
  averageLatency: number;
  connectionDetails: {
    clientId: string;
    connected: boolean;
    latency: number;
    error?: string;
  }[];
}

export interface DataConsistencyReport {
  timestamp: number;
  consistencyScore: number; // 0-100
  issues: DataInconsistency[];
  validatedRecords: number;
  corruptedRecords: number;
  recommendations: string[];
}

export interface DataInconsistency {
  type: 'missing_reference' | 'data_mismatch' | 'orphaned_record' | 'invalid_format';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  repairSuggestion?: string;
}

export interface LoadTestConfig {
  name: string;
  targetRPS: number; // requests per second
  duration: number; // seconds
  rampUpTime: number; // seconds
  endpoints: LoadTestEndpoint[];
  concurrentUsers: number;
}

export interface LoadTestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number; // relative frequency
  payload?: any;
}

export interface LoadTestResult {
  configName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  errors: LoadTestError[];
  resourceUsage: ResourceUsage;
}

export interface LoadTestError {
  endpoint: string;
  error: string;
  count: number;
  percentage: number;
}

export interface ResourceUsage {
  cpu: number; // percentage
  memory: number; // MB
  disk: number; // MB
  network: number; // bytes/sec
}

export interface PerformanceScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<PerformanceMetrics>;
  cleanup?: () => Promise<void>;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseQueries: number;
  networkRequests: number;
  custom?: Record<string, number>;
}

export interface PerformanceBenchmark {
  scenarios: {
    name: string;
    metrics: PerformanceMetrics;
    rating: 'excellent' | 'good' | 'acceptable' | 'poor';
    baseline?: PerformanceMetrics;
  }[];
  summary: {
    overallRating: 'excellent' | 'good' | 'acceptable' | 'poor';
    recommendations: string[];
    regressions: string[];
    improvements: string[];
  };
}

export interface MemoryUsageReport {
  duration: number;
  samples: MemorySample[];
  peak: number;
  average: number;
  leaks: MemoryLeak[];
  recommendations: string[];
}

export interface MemorySample {
  timestamp: number;
  used: number;
  total: number;
  heapUsed: number;
  external: number;
}

export interface MemoryLeak {
  component: string;
  severity: 'low' | 'medium' | 'high';
  growthRate: number; // bytes/minute
  description: string;
}

export interface ConcurrencyTestResult {
  targetSessions: number;
  actualSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageSessionDuration: number;
  resourceContention: boolean;
  bottlenecks: string[];
  recommendations: string[];
}

export interface DataIntegrityReport {
  timestamp: number;
  score: number; // 0-100
  validatedTables: string[];
  issues: DataIntegrityIssue[];
  recommendations: string[];
  autoRepaired: number;
  manualRepairRequired: number;
}

export interface DataIntegrityIssue {
  table: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  autoRepairable: boolean;
  repairScript?: string;
}

export interface BackupRestoreTestResult {
  backupCreated: boolean;
  backupSize: number;
  backupTime: number;
  restoreSuccessful: boolean;
  restoreTime: number;
  dataIntegrityAfterRestore: number; // 0-100
  issues: string[];
}

export interface SessionPersistenceReport {
  totalSessions: number;
  persistedSessions: number;
  lostSessions: number;
  corruptedSessions: number;
  recoveredSessions: number;
  persistenceRate: number; // percentage
  issues: SessionPersistenceIssue[];
}

export interface SessionPersistenceIssue {
  sessionId: string;
  issue: 'data_loss' | 'corruption' | 'orphaned_data' | 'inconsistent_state';
  severity: 'low' | 'medium' | 'high';
  recoverable: boolean;
  description: string;
}

export interface DatabaseConsistencyReport {
  timestamp: number;
  tables: TableConsistency[];
  foreignKeyViolations: number;
  orphanedRecords: number;
  duplicateKeys: number;
  consistencyScore: number; // 0-100
  repairActions: RepairAction[];
}

export interface TableConsistency {
  name: string;
  recordCount: number;
  validRecords: number;
  invalidRecords: number;
  issues: string[];
}

export interface RepairAction {
  action: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  autoExecutable: boolean;
  sql?: string;
}

export interface SystemHealthReport {
  timestamp: number;
  overall: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  services: ServiceHealth[];
  resources: ResourceHealth;
  alerts: HealthAlert[];
  recommendations: string[];
}

export interface ServiceHealth {
  name: string;
  status: 'running' | 'degraded' | 'stopped' | 'error';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastError?: string;
}

export interface ResourceHealth {
  cpu: {
    usage: number;
    temperature?: number;
    status: 'normal' | 'high' | 'critical';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    status: 'normal' | 'high' | 'critical';
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    status: 'normal' | 'high' | 'critical';
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  };
}

export interface HealthAlert {
  type: 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface HealthCheck {
  name: string;
  description: string;
  execute: () => Promise<HealthCheckResult>;
  critical: boolean;
  timeout: number;
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration: number;
  details?: any;
}

export interface SystemMetricsReport {
  duration: number;
  samples: SystemMetricsSample[];
  averages: SystemMetricsAverage;
  peaks: SystemMetricsPeak;
  trends: MetricTrend[];
}

export interface SystemMetricsSample {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeConnections: number;
  requestsPerSecond: number;
}

export interface SystemMetricsAverage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
}

export interface SystemMetricsPeak {
  cpu: { value: number; timestamp: number };
  memory: { value: number; timestamp: number };
  disk: { value: number; timestamp: number };
  network: { value: number; timestamp: number };
}

export interface MetricTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  significance: 'low' | 'medium' | 'high';
}

export interface AnomalyReport {
  timeRange: { start: number; end: number };
  anomalies: Anomaly[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  recommendations: string[];
}

export interface Anomaly {
  type: 'performance' | 'usage' | 'error_rate' | 'resource' | 'behavior';
  metric: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  expectedRange: { min: number; max: number };
  description: string;
  possibleCauses: string[];
}

export interface TestSchedule {
  name: string;
  cron: string;
  testSuite: string;
  enabled: boolean;
  notifications: string[];
}

export interface TestHistoryFilter {
  testSuite?: string;
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
  dateRange?: { start: number; end: number };
  limit?: number;
}

export interface TestExecution {
  id: string;
  testSuite: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results?: TestResult[];
  summary?: string;
  artifacts?: string[];
}

export interface TestReport {
  execution: TestExecution;
  summary: TestSummary;
  detailedResults: TestResult[];
  metrics: TestMetrics;
  recommendations: string[];
  artifacts: TestArtifact[];
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  successRate: number;
  coverage?: number;
}

export interface TestMetrics {
  performance: PerformanceMetrics;
  reliability: number;
  coverage: number;
  qualityScore: number;
}

export interface TestArtifact {
  name: string;
  type: 'log' | 'screenshot' | 'video' | 'data' | 'report';
  path: string;
  size: number;
  description?: string;
}

export interface EmergencyProtocolResult {
  protocols: EmergencyProtocol[];
  overallReadiness: number; // 0-100
  criticalIssues: string[];
  recommendations: string[];
}

export interface EmergencyProtocol {
  name: string;
  trigger: string;
  tested: boolean;
  successful: boolean;
  responseTime: number;
  issues: string[];
}

export type SystemFailureType = 
  | 'database_failure' 
  | 'network_partition' 
  | 'memory_exhaustion' 
  | 'cpu_overload'
  | 'disk_full'
  | 'service_crash'
  | 'quota_exceeded';

export interface FailureSimulationResult {
  failureType: SystemFailureType;
  simulationDuration: number;
  systemResponse: string;
  recoveryTime: number;
  dataLoss: boolean;
  serviceImpact: ServiceImpact[];
  automaticRecovery: boolean;
}

export interface ServiceImpact {
  service: string;
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'complete';
  downtime: number;
  affectedUsers: number;
}

export interface RecoveryValidationResult {
  procedures: RecoveryProcedure[];
  overallScore: number; // 0-100
  criticalGaps: string[];
  recommendations: string[];
}

export interface RecoveryProcedure {
  name: string;
  scenario: string;
  validated: boolean;
  effective: boolean;
  estimatedTime: number;
  actualTime: number;
  issues: string[];
}