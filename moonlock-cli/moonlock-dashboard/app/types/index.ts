// Types matching the CLI data structures

export interface Session {
  id: string;
  name: string;
  projectPath: string;
  model: string;
  provider: string;
  createdAt: string;
  lastUsed: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  status: 'active' | 'paused' | 'completed';
  metadata?: {
    language?: string;
    framework?: string;
    description?: string;
  };
}

export interface TokenUsage {
  sessionId: string;
  timestamp: string;
  input: number;
  output: number;
  total: number;
  model: string;
  provider: string;
  cost?: number;
}

export interface Config {
  defaultModel?: string;
  defaultProvider?: string;
  apiKeys?: {
    [key: string]: string;
  };
  quotaLimits?: {
    daily?: number;
    monthly?: number;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: boolean;
  };
}

export interface ActiveSession {
  sessionId: string;
  startedAt: string;
}