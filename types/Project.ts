// Project analysis type definitions for Claude Code Optimizer

export interface ProjectAnalysis {
  projectPath: string;
  projectName: string;
  complexity: number; // 1-10 scale
  estimatedSessions: number;
  estimatedHours: number;
  recommendedApproach: SessionRecommendation[];
  dependencies: ProjectDependency[];
  riskFactors: RiskFactor[];
  codebaseMetrics: CodebaseMetrics;
  timestamp: Date;
}

export interface SessionRecommendation {
  sessionType: 'planning' | 'implementation' | 'testing' | 'optimization';
  estimatedHours: number;
  recommendedModel: 'claude-sonnet-4' | 'claude-opus-4';
  tokenBudget: number;
  priority: number; // 1-10, higher = more important
  description: string;
  prerequisites: string[];
  deliverables: string[];
}

export interface ProjectDependency {
  name: string;
  type: 'file' | 'package' | 'service' | 'external';
  status: 'available' | 'missing' | 'outdated' | 'unknown';
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface RiskFactor {
  category: 'technical' | 'timeline' | 'complexity' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
  impact: string;
}

export interface CodebaseMetrics {
  totalFiles: number;
  linesOfCode: number;
  languages: LanguageBreakdown[];
  testCoverage?: number;
  technicalDebt?: number; // 1-10 scale
  maintainabilityIndex?: number; // 1-100
  dependencies: DependencyInfo[];
}

export interface LanguageBreakdown {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development';
  outdated: boolean;
  vulnerabilities?: number;
}

export interface ProjectPlan {
  analysis: ProjectAnalysis;
  sessionPlan: SessionRecommendation[];
  timeline: ProjectTimeline;
  resourceAllocation: ResourceAllocation;
  calendarEvents?: CalendarEvent[];
}

export interface ProjectTimeline {
  startDate: Date;
  estimatedEndDate: Date;
  phases: TimelinePhase[];
  milestones: Milestone[];
}

export interface TimelinePhase {
  name: string;
  startDate: Date;
  endDate: Date;
  sessions: string[]; // session IDs
  status: 'planned' | 'in-progress' | 'completed' | 'blocked';
}

export interface Milestone {
  name: string;
  date: Date;
  description: string;
  dependencies: string[];
  status: 'pending' | 'completed' | 'at-risk';
}

export interface ResourceAllocation {
  totalHours: number;
  sonnetHours: number;
  opusHours: number;
  weeklyDistribution: WeeklyAllocation[];
  quotaImpact: QuotaImpact;
}

export interface WeeklyAllocation {
  week: string; // ISO week string
  sonnetHours: number;
  opusHours: number;
  sessions: number;
}

export interface QuotaImpact {
  sonnetPercentage: number; // % of weekly quota
  opusPercentage: number; // % of weekly quota
  feasible: boolean;
  recommendations: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  sessionId?: string;
  type: 'session' | 'prep' | 'review' | 'milestone';
  location?: string;
  attendees?: string[];
}
