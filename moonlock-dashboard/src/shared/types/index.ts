export interface Session {
  id: string;
  name?: string;
  startTime: number;
  endTime?: number;
  duration: number;
  tokenBudget?: number;
  tokensUsed: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface TokenUsage {
  id: string;
  sessionId: string;
  tokensUsed: number;
  operation: string;
  timestamp: number;
  cumulativeTotal: number;
}

export interface Checkpoint {
  id: string;
  sessionId: string;
  phase: string;
  promptCount: number;
  tokensUsed: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsTrend {
  timestamp: number;
  tokensUsed: number;
  sessionCount: number;
  averageDuration: number;
}

export interface UsageProjection {
  currentRate: number;
  projectedTotal: number;
  timeToLimit: number;
  confidence: number;
}

export interface ApiError {
  error: string;
  message: string;
  code: number;
  details?: any;
}

export type WebSocketMessage = 
  | TimerUpdateMessage
  | TokenUpdateMessage  
  | CheckpointMessage
  | AlertMessage
  | ConnectionMessage
  | SessionUpdateMessage
  | PingMessage
  | PongMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | PredictionUpdateMessage
  | BurnRateUpdateMessage
  | TemplateSelectedMessage
  | CalendarSyncMessage;

export interface TimerUpdateMessage {
  type: 'timer_update';
  sessionId: string;
  elapsed: number;
  remaining: number;
  status: 'active' | 'paused' | 'completed';
}

export interface TokenUpdateMessage {
  type: 'token_update';
  sessionId: string;
  tokensUsed: number;
  totalUsed: number;
  projectedTotal?: number;
}

export interface CheckpointMessage {
  type: 'checkpoint';
  sessionId: string;
  phase: string;
  promptCount: number;
  timestamp: number;
}

export interface AlertMessage {
  type: 'alert';
  sessionId: string;
  level: 'warning' | 'error';
  message: string;
}

export interface ConnectionMessage {
  type: 'connection';
  clientId: string;
  timestamp: number;
}

export interface SessionUpdateMessage {
  type: 'session_update';
  session: Session;
}

export interface PingMessage {
  type: 'ping';
  timestamp?: number;
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

export interface SubscribeMessage {
  type: 'subscribe';
  sessionId: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  sessionId: string;
}

// Enhancement 1: Predictive Analytics Types
export interface TokenPrediction {
  sessionId: string;
  predictedUsage: number;
  confidence: number;
  timeToLimit: number;
  optimalBreakPoints: number[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface OptimalSchedule {
  sessionId: string;
  suggestedBreaks: { time: number; duration: number }[];
  productivityScore: number;
  burnoutRisk: number;
}

// Enhancement 2: Session Templates Types
export interface SessionTemplate {
  id: string;
  name: string;
  type: 'heavy_refactoring' | 'feature_development' | 'bug_fixes' | 'documentation' | 'custom';
  tokenBudget: number;
  estimatedDuration: number;
  phases: SessionPhase[];
  customizable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SessionPhase {
  id: string;
  name: string;
  order: number;
  estimatedTokens: number;
  estimatedDuration: number;
  goals: string[];
  checkpoints: string[];
}

// Enhancement 3: Calendar Integration Types
export interface CalendarEvent {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  reminders: number[]; // minutes before event
  color: string;
  metadata: {
    tokenBudget: number;
    sessionType: string;
    estimatedTokens: number;
  };
}

export interface CalendarIntegration {
  provider: 'google' | 'ical' | 'outlook';
  isConnected: boolean;
  lastSync: number;
  syncEnabled: boolean;
  calendarId?: string;
}

// Enhancement 4: Token Burn Rate Monitor Types
export interface BurnRateMetrics {
  sessionId: string;
  currentRate: number; // tokens per minute
  averageRate: number;
  peakRate: number;
  volatility: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  alerts: BurnRateAlert[];
}

export interface BurnRateAlert {
  id: string;
  sessionId: string;
  type: 'spike' | 'sustained_high' | 'approaching_limit' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  metrics: {
    rate: number;
    threshold: number;
    duration?: number;
  };
}

// WebSocket Messages for new features
export interface PredictionUpdateMessage {
  type: 'prediction_update';
  sessionId: string;
  prediction: TokenPrediction;
}

export interface BurnRateUpdateMessage {
  type: 'burn_rate_update';
  sessionId: string;
  metrics: BurnRateMetrics;
}

export interface TemplateSelectedMessage {
  type: 'template_selected';
  sessionId: string;
  template: SessionTemplate;
}

export interface CalendarSyncMessage {
  type: 'calendar_sync';
  status: 'syncing' | 'completed' | 'error';
  message?: string;
}