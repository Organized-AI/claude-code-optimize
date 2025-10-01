/**
 * Session types for dashboard
 * Matches the types from the backend WebSocket server
 */

export interface SessionMetrics {
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  estimatedCost: number;
  toolCalls: number;
  objectivesCompleted: string[];
  messageCount: number;
  startTime: Date;
  lastUpdate: Date;
}

export interface SessionData {
  sessionId: string;
  projectName: string;
  phase: string;
  model: string;
  objectives: string[];
  startTime: Date;
  metrics?: SessionMetrics;
  status: 'active' | 'completed' | 'error';
}

export interface SessionObjective {
  objective: string;
  timestamp: Date;
}

export interface TokenUpdate {
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  estimatedCost: number;
}

export interface ToolUse {
  name: string;
  timestamp: Date;
}

export type SessionEvent =
  | { type: 'session:start'; data: Omit<SessionData, 'metrics' | 'status'>; timestamp: Date }
  | { type: 'session:objective'; data: SessionObjective; timestamp: Date }
  | { type: 'session:tokens'; data: TokenUpdate; timestamp: Date }
  | { type: 'session:tool'; data: ToolUse; timestamp: Date }
  | { type: 'session:complete'; data: { sessionId: string; metrics: SessionMetrics; completedAt: Date }; timestamp: Date }
  | { type: 'session:error'; data: { error: string }; timestamp: Date };
