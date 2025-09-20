export interface Session {
  id: string;
  startTime: Date;
  endTime?: Date;
  tokensUsed: number;
  status: 'active' | 'completed' | 'interrupted';
  metadata?: {
    project?: string;
    description?: string;
    tags?: string[];
    interruptReason?: string;
  };
}

export interface TokenUsage {
  sessionId: string;
  timestamp: Date;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
  model?: string;
}

export interface Config {
  apiEndpoint?: string;
  apiKey?: string;
  quotaLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  tracking: {
    enabled: boolean;
    autoStart: boolean;
    saveHistory: boolean;
    maxHistoryItems: number;
  };
  notifications: {
    quotaWarnings: boolean;
    sessionReminders: boolean;
    dailySummary: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    verbose: boolean;
    showProgress: boolean;
  };
}

export interface QuotaStatus {
  current: number;
  limit: number;
  resetTime: Date;
  warningThreshold: number;
}

export interface CommandOptions {
  [key: string]: any;
}