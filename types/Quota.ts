// Weekly quota management type definitions for Claude Code Optimizer

export interface QuotaStatus {
  weekStart: Date;
  weekEnd: Date;
  sonnet: ModelQuota;
  opus: ModelQuota;
  totalCost: number;
  projectedCost: number;
  lastUpdated: Date;
}

export interface ModelQuota {
  used: number; // hours used
  total: number; // total weekly limit
  remaining: number; // hours remaining
  percentage: number; // percentage used
  projectedUsage: number; // estimated usage for rest of week
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface QuotaPrediction {
  sessionPlan: SessionConfig[];
  totalHoursNeeded: number;
  sonnetHours: number;
  opusHours: number;
  feasible: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alternatives?: SessionConfig[];
  recommendations: string[];
  costEstimate: CostEstimate;
}

export interface CostEstimate {
  sonnetCost: number;
  opusCost: number;
  totalCost: number;
  currency: string;
  confidence: number; // 0-100
}

export interface QuotaAlert {
  type: 'warning' | 'critical' | 'exceeded';
  model: 'sonnet' | 'opus' | 'both';
  threshold: number; // percentage threshold triggered
  message: string;
  recommendations: string[];
  timestamp: Date;
  acknowledged: boolean;
}

export interface UsageHistory {
  date: Date;
  sonnetHours: number;
  opusHours: number;
  sessionsCount: number;
  efficiency: number; // average efficiency for the day
  cost: number;
}

export interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date;
  totalSessions: number;
  totalHours: number;
  totalCost: number;
  averageEfficiency: number;
  modelBreakdown: {
    sonnet: ModelUsageStats;
    opus: ModelUsageStats;
  };
  dailyUsage: UsageHistory[];
  topProjects: ProjectUsageStats[];
  improvements: ImprovementSuggestion[];
}

export interface ModelUsageStats {
  hours: number;
  sessions: number;
  averageSessionLength: number;
  efficiency: number;
  cost: number;
  percentage: number; // of total usage
}

export interface ProjectUsageStats {
  project: string;
  hours: number;
  sessions: number;
  cost: number;
  efficiency: number;
  status: 'completed' | 'in-progress' | 'paused';
}

export interface ImprovementSuggestion {
  category: 'efficiency' | 'cost' | 'planning' | 'workflow';
  impact: 'low' | 'medium' | 'high';
  description: string;
  actionItems: string[];
  estimatedSavings?: {
    hours?: number;
    cost?: number;
    efficiency?: number;
  };
}

export interface QuotaOptimization {
  originalPlan: SessionConfig[];
  optimizedPlan: SessionConfig[];
  hoursSaved: number;
  costSaved: number;
  efficiencyGain: number;
  tradeoffs: string[];
  confidence: number; // 0-100
}

export interface EmergencyProtocol {
  trigger: 'quota_exceeded' | 'quota_critical' | 'api_failure' | 'session_timeout';
  actions: EmergencyAction[];
  fallbackProviders: FallbackProvider[];
  contextPreservation: ContextPreservationStrategy;
}

export interface EmergencyAction {
  priority: number;
  description: string;
  automated: boolean;
  requiresConfirmation: boolean;
  estimatedTime: number; // minutes
}

export interface FallbackProvider {
  name: string;
  available: boolean;
  costMultiplier: number;
  capabilities: string[];
  setupRequired: boolean;
}

export interface ContextPreservationStrategy {
  method: 'session_export' | 'state_snapshot' | 'context_compression';
  preservationRate: number; // 0-100
  resumeTime: number; // minutes to resume
  lossFactors: string[];
}
