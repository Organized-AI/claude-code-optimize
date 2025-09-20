/**
 * Unified API Usage Hook
 * 
 * Manages combined real-time usage tracking for both Anthropic and OpenRouter APIs
 * with comprehensive comparison, cost optimization, and performance monitoring.
 */

import { useState, useEffect, useCallback } from 'react';

export interface UnifiedAPIUsageMetrics {
  providers: {
    anthropic: {
      available: boolean;
      dailyRequests: number;
      totalTokens: number;
      dailyCost: number;
      avgResponseTime: number;
      successRate: number;
      rateLimitPercent: number;
      modelDistribution: { [key: string]: any };
    } | null;
    openrouter: {
      available: boolean;
      dailyRequests: number;
      totalTokens: number;
      dailyCost: number;
      avgResponseTime: number;
      successRate: number;
      rateLimitPercent: number;
      modelDistribution: { [key: string]: any };
      providerBreakdown: { [key: string]: any };
      creditBalance?: number;
    } | null;
  };
  combined: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    successRate: number;
    costBreakdown: {
      anthropic: { daily: number; weekly: number; monthly: number };
      openrouter: { daily: number; weekly: number; monthly: number };
    };
  };
  comparison: {
    costEfficiency: {
      winner: 'anthropic' | 'openrouter' | 'tie';
      difference: number;
      recommendation: string;
    };
    performance: {
      winner: 'anthropic' | 'openrouter' | 'tie';
      difference: number;
      recommendation: string;
    };
    reliability: {
      winner: 'anthropic' | 'openrouter' | 'tie';
      difference: number;
      recommendation: string;
    };
  };
  alerts: Array<{
    type: 'budget' | 'rate' | 'quota' | 'efficiency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    provider: 'anthropic' | 'openrouter' | 'combined';
    timestamp: number;
  }>;
}

interface UnifiedAPIState {
  data: UnifiedAPIUsageMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://dashboard.organizedai.vip/api' 
  : 'http://localhost:3002/api';

export const useUnifiedAPIUsage = (refreshInterval: number = 15000) => {
  const [state, setState] = useState<UnifiedAPIState>({
    data: null,
    loading: true,
    error: null,
    lastUpdate: 0,
    connectionStatus: 'disconnected'
  });

  // Fetch comprehensive usage statistics
  const fetchUnifiedUsageStats = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch comprehensive stats that include both providers
      const response = await fetch(`${API_BASE}/anthropic/comprehensive-stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch unified usage stats');
      }

      const comprehensiveStats = result.data;
      
      // Transform to unified format
      const unifiedMetrics = transformToUnifiedMetrics(comprehensiveStats);

      setState(prev => ({
        ...prev,
        data: unifiedMetrics,
        loading: false,
        error: null,
        lastUpdate: Date.now(),
        connectionStatus: 'connected'
      }));

    } catch (error) {
      console.error('❌ Failed to fetch unified usage stats:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionStatus: 'error'
      }));
    }
  }, []);

  // Get multi-provider comparison
  const fetchProviderComparison = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/openrouter/multi-provider-comparison`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setState(prev => ({
            ...prev,
            data: prev.data ? {
              ...prev.data,
              comparison: generateComparison(result.data),
              lastUpdate: Date.now()
            } : null,
            connectionStatus: 'connected'
          }));
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch provider comparison:', error);
    }
  }, []);

  // Send unified prompt to best provider
  const sendUnifiedPrompt = useCallback(async (
    prompt: string, 
    preferredProvider?: 'anthropic' | 'openrouter',
    model?: string
  ) => {
    try {
      if (!state.data) {
        throw new Error('Usage data not available');
      }

      // Auto-select best provider if not specified
      let targetProvider = preferredProvider;
      if (!targetProvider) {
        targetProvider = state.data.comparison.costEfficiency.winner === 'tie' ? 
          'anthropic' : state.data.comparison.costEfficiency.winner;
      }

      // Fallback to available provider
      if (targetProvider === 'anthropic' && !state.data.providers.anthropic?.available) {
        targetProvider = 'openrouter';
      } else if (targetProvider === 'openrouter' && !state.data.providers.openrouter?.available) {
        targetProvider = 'anthropic';
      }

      const endpoint = targetProvider === 'anthropic' ? 
        `${API_BASE}/anthropic/direct-prompt` : 
        `${API_BASE}/openrouter/direct-prompt`;

      const body = targetProvider === 'anthropic' ? {
        prompt,
        model: model || 'claude-3-5-sonnet-20241022'
      } : {
        prompt,
        model: model || 'anthropic/claude-3.5-sonnet'
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to send unified prompt');
      }

      // Refresh stats after API call
      setTimeout(fetchUnifiedUsageStats, 1000);

      return {
        ...result.data,
        provider: targetProvider
      };
    } catch (error) {
      console.error('❌ Failed to send unified prompt:', error);
      throw error;
    }
  }, [state.data, fetchUnifiedUsageStats]);

  // Initialize and set up polling
  useEffect(() => {
    // Initial fetch
    fetchUnifiedUsageStats();

    // Set up polling
    const unifiedInterval = setInterval(fetchUnifiedUsageStats, refreshInterval);
    const comparisonInterval = setInterval(fetchProviderComparison, refreshInterval * 2);

    return () => {
      clearInterval(unifiedInterval);
      clearInterval(comparisonInterval);
    };
  }, [fetchUnifiedUsageStats, fetchProviderComparison, refreshInterval]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = process.env.NODE_ENV === 'production'
      ? 'wss://dashboard.organizedai.vip/ws'
      : 'ws://localhost:3002/ws';

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 Unified API WebSocket connected');
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'anthropic-api-update' || message.type === 'openrouter-api-update') {
              // Refresh data when either provider updates
              setTimeout(fetchUnifiedUsageStats, 500);
            }
          } catch (error) {
            console.error('❌ WebSocket message parse error:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 Unified API WebSocket disconnected');
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.error('❌ Unified API WebSocket error:', error);
          setState(prev => ({ ...prev, connectionStatus: 'error' }));
        };

      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setState(prev => ({ ...prev, connectionStatus: 'error' }));
        
        // Retry connection after 10 seconds
        reconnectTimeout = setTimeout(connect, 10000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [fetchUnifiedUsageStats]);

  const retry = useCallback(() => {
    fetchUnifiedUsageStats();
    fetchProviderComparison();
  }, [fetchUnifiedUsageStats, fetchProviderComparison]);

  return {
    // State
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus,

    // Computed values
    isConnected: state.connectionStatus === 'connected',
    hasError: !!state.error,
    hasMultipleProviders: state.data ? 
      !!(state.data.providers.anthropic?.available && state.data.providers.openrouter?.available) : false,
    recommendedProvider: state.data?.comparison.costEfficiency.winner || 'anthropic',
    totalDailyCost: state.data?.combined.totalCost || 0,
    totalDailyRequests: state.data?.combined.totalRequests || 0,

    // Actions
    sendUnifiedPrompt,
    retry,

    // Formatting helpers
    formatCost: (amount: number) => `$${amount.toFixed(4)}`,
    formatTokens: (tokens: number) => tokens.toLocaleString(),
    formatResponseTime: (ms: number) => `${Math.round(ms)}ms`,
    getProviderRecommendation: () => {
      if (!state.data?.comparison) return 'Insufficient data for recommendation';
      
      const cost = state.data.comparison.costEfficiency;
      const perf = state.data.comparison.performance;
      
      if (cost.winner === perf.winner && cost.winner !== 'tie') {
        return `${cost.winner} is recommended for both cost and performance`;
      } else if (cost.winner !== 'tie' && perf.winner !== 'tie') {
        return `${cost.winner} is more cost-effective, ${perf.winner} is faster`;
      } else {
        return 'Both providers are performing similarly - consider load balancing';
      }
    }
  };
};

// Helper functions
function transformToUnifiedMetrics(comprehensiveStats: any): UnifiedAPIUsageMetrics {
  const anthropic = comprehensiveStats.apiUsage.anthropic;
  const openrouter = comprehensiveStats.apiUsage.openrouter;
  const combined = comprehensiveStats.apiUsage.combined;

  return {
    providers: {
      anthropic: anthropic ? {
        available: true,
        dailyRequests: anthropic.dailyRequestCount,
        totalTokens: anthropic.tokenConsumption.total,
        dailyCost: anthropic.costEstimate.daily,
        avgResponseTime: anthropic.responseTimeStats.average,
        successRate: anthropic.successRate.percentage,
        rateLimitPercent: anthropic.rateLimitStatus.percentUsed,
        modelDistribution: anthropic.modelUsageDistribution
      } : null,
      openrouter: openrouter ? {
        available: true,
        dailyRequests: openrouter.dailyRequestCount,
        totalTokens: openrouter.tokenConsumption.total,
        dailyCost: openrouter.costEstimate.daily,
        avgResponseTime: openrouter.responseTimeStats.average,
        successRate: openrouter.successRate.percentage,
        rateLimitPercent: openrouter.rateLimitStatus.percentUsed,
        modelDistribution: openrouter.modelUsageDistribution,
        providerBreakdown: openrouter.providerStats
      } : null
    },
    combined: {
      totalRequests: combined.totalRequests,
      totalTokens: combined.totalTokens,
      totalCost: combined.totalCost,
      averageResponseTime: combined.averageResponseTime,
      successRate: combined.successRate,
      costBreakdown: comprehensiveStats.costProjections.breakdown
    },
    comparison: generateBasicComparison(anthropic, openrouter),
    alerts: comprehensiveStats.alerts.map((alert: any) => ({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      provider: alert.provider || 'combined',
      timestamp: alert.timestamp
    }))
  };
}

function generateBasicComparison(anthropic: any, openrouter: any): any {
  if (!anthropic || !openrouter) {
    return {
      costEfficiency: { winner: 'tie', difference: 0, recommendation: 'Insufficient data' },
      performance: { winner: 'tie', difference: 0, recommendation: 'Insufficient data' },
      reliability: { winner: 'tie', difference: 0, recommendation: 'Insufficient data' }
    };
  }

  const costDiff = Math.abs(anthropic.costEstimate.daily - openrouter.costEstimate.daily);
  const perfDiff = Math.abs(anthropic.responseTimeStats.average - openrouter.responseTimeStats.average);
  const reliabilityDiff = Math.abs(anthropic.successRate.percentage - openrouter.successRate.percentage);

  return {
    costEfficiency: {
      winner: anthropic.costEstimate.daily < openrouter.costEstimate.daily ? 'anthropic' : 
              openrouter.costEstimate.daily < anthropic.costEstimate.daily ? 'openrouter' : 'tie',
      difference: costDiff,
      recommendation: costDiff > 0.01 ? 
        `${anthropic.costEstimate.daily < openrouter.costEstimate.daily ? 'Anthropic' : 'OpenRouter'} is more cost-effective` :
        'Both providers have similar costs'
    },
    performance: {
      winner: anthropic.responseTimeStats.average < openrouter.responseTimeStats.average ? 'anthropic' :
              openrouter.responseTimeStats.average < anthropic.responseTimeStats.average ? 'openrouter' : 'tie',
      difference: perfDiff,
      recommendation: perfDiff > 100 ?
        `${anthropic.responseTimeStats.average < openrouter.responseTimeStats.average ? 'Anthropic' : 'OpenRouter'} is faster` :
        'Both providers have similar response times'
    },
    reliability: {
      winner: anthropic.successRate.percentage > openrouter.successRate.percentage ? 'anthropic' :
              openrouter.successRate.percentage > anthropic.successRate.percentage ? 'openrouter' : 'tie',
      difference: reliabilityDiff,
      recommendation: reliabilityDiff > 1 ?
        `${anthropic.successRate.percentage > openrouter.successRate.percentage ? 'Anthropic' : 'OpenRouter'} is more reliable` :
        'Both providers have similar reliability'
    }
  };
}

function generateComparison(comparisonData: any): any {
  // This would use the actual comparison data from the API
  return comparisonData.efficiency || generateBasicComparison(
    comparisonData.providers.anthropic,
    comparisonData.providers.openrouter
  );
}