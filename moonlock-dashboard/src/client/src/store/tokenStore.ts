import { create } from 'zustand';
import { TokenUsage, UsageProjection } from '../../../shared/types';

interface TokenState {
  totalUsed: number;
  currentRate: number;
  projectedTotal: number;
  averagePerMinute: number;
  confidence: number;
  usageHistory: TokenUsage[];
  alerts: Array<{ level: 'warning' | 'error'; message: string }>;
  
  // Actions
  updateTokenUsage: (tokensUsed: number, totalUsed: number, projectedTotal?: number) => void;
  setUsageHistory: (history: TokenUsage[]) => void;
  setProjection: (projection: UsageProjection) => void;
  setAlerts: (alerts: Array<{ level: 'warning' | 'error'; message: string }>) => void;
  recordTokenUsage: (sessionId: string, tokensUsed: number, operation: string) => Promise<void>;
}

export const useTokenStore = create<TokenState>((set, get) => ({
  totalUsed: 0,
  currentRate: 0,
  projectedTotal: 0,
  averagePerMinute: 0,
  confidence: 0,
  usageHistory: [],
  alerts: [],

  updateTokenUsage: (tokensUsed, totalUsed, projectedTotal = 0) => {
    set({ 
      totalUsed, 
      projectedTotal: projectedTotal || totalUsed,
    });
    
    // Update current rate based on recent usage
    const { usageHistory } = get();
    if (usageHistory.length > 1) {
      const recent = usageHistory.slice(-5);
      const duration = recent[recent.length - 1].timestamp - recent[0].timestamp;
      const totalTokens = recent.reduce((sum, usage) => sum + usage.tokensUsed, 0);
      const rate = duration > 0 ? (totalTokens / duration) * 60000 : 0; // tokens per minute
      set({ currentRate: rate });
    }
  },

  setUsageHistory: (history) => {
    set({ usageHistory: history });
    
    // Calculate average rate
    if (history.length > 1) {
      const duration = history[history.length - 1].timestamp - history[0].timestamp;
      const totalTokens = history.reduce((sum, usage) => sum + usage.tokensUsed, 0);
      const averagePerMinute = duration > 0 ? (totalTokens / duration) * 60000 : 0;
      set({ averagePerMinute });
    }
  },

  setProjection: (projection) => {
    set({
      currentRate: projection.currentRate,
      projectedTotal: projection.projectedTotal,
      confidence: projection.confidence,
    });
  },

  setAlerts: (alerts) => set({ alerts }),

  recordTokenUsage: async (sessionId, tokensUsed, operation) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokensUsed, operation }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record token usage');
      }
    } catch (error) {
      console.error('Failed to record token usage:', error);
    }
  },
}));