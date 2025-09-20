// Session type definitions for Claude Code Optimizer Dashboard

export interface SessionConfig {
  projectPath: string;
  sessionType: 'planning' | 'implementation' | 'testing' | 'optimization';
  tokenBudget: number;
  model: 'claude-sonnet-4' | 'claude-opus-4';
  maxDuration: number; // in minutes (300 = 5 hours max)
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Session {
  id: string;
  project: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'error' | 'planning';
  startTime: Date;
  endTime?: Date;
  duration: string; // formatted string like "4h 23m"
  tokensUsed: number;
  tokenBudget: number;
  efficiency: number; // percentage
  model: string;
  sessionType: SessionConfig['sessionType'];
  deliverables: string[];
  contextNotes?: string;
  handoffNotes?: string;
  errors?: string[];
}

export interface SessionStatus {
  id: string;
  isActive: boolean;
  currentTask?: string;
  progress: number; // 0-100
  tokensUsed: number;
  timeElapsed: number; // in minutes
  estimatedTimeRemaining: number; // in minutes
  currentModel: string;
  lastActivity: Date;
}

export interface SessionPlan {
  sessions: SessionConfig[];
  totalEstimatedHours: number;
  totalEstimatedTokens: number;
  modelDistribution: {
    sonnet: number; // hours
    opus: number; // hours
  };
  riskFactors: string[];
  recommendations: string[];
}
