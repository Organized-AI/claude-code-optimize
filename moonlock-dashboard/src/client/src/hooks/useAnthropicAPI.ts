/**
 * Anthropic API Usage Hook
 * 
 * Manages real-time Anthropic API usage tracking, cost monitoring,
 * and comprehensive statistics with WebSocket updates.
 */

import { useState, useEffect, useCallback } from 'react';

export interface APIUsageMetrics {
  dailyRequestCount: number;
  dailyRequestLimit: number;
  tokenConsumption: {
    input: number;
    output: number;
    cache: number;
    total: number;
  };
  costEstimate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  responseTimeStats: {
    average: number;
    peak: number;
    current: number;
  };
  rateLimitStatus: {
    requestsRemaining: number;
    resetTime: string;
    percentUsed: number;
  };
  modelUsageDistribution: {
    sonnet: { requests: number; tokens: number; cost: number };
    opus: { requests: number; tokens: number; cost: number };
  };
  successRate: {
    successful: number;
    failed: number;
    percentage: number;
  };
}

export interface APIHealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  issues: string[];
}

export interface ComprehensiveUsageStats {
  sessionUsage: {
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    averageTokensPerSession: number;
  };
  apiUsage: APIUsageMetrics;
  costProjections: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  efficiency: {
    tokensPerMinute: number;
    costPerToken: number;
    utilizationRate: number;
  };
  alerts: Array<{
    type: 'budget' | 'rate' | 'quota' | 'efficiency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
  }>;
}

interface AnthropicAPIState {
  usageMetrics: APIUsageMetrics | null;
  healthStatus: APIHealthCheck | null;
  comprehensiveStats: ComprehensiveUsageStats | null;
  serviceAvailable: boolean;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://dashboard.organizedai.vip/api' 
  : 'http://localhost:3002/api';

export const useAnthropicAPI = (refreshInterval: number = 10000) => {
  const [state, setState] = useState<AnthropicAPIState>({
    usageMetrics: null,
    healthStatus: null,
    comprehensiveStats: null,
    serviceAvailable: false,
    loading: true,
    error: null,
    lastUpdate: 0,
    connectionStatus: 'disconnected'
  });

  // Check service availability
  const checkServiceStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/anthropic/status`);
      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        serviceAvailable: result.data?.serviceAvailable || false,
        error: result.data?.serviceAvailable ? null : 'Anthropic API service not available'
      }));

      return result.data?.serviceAvailable || false;
    } catch (error) {
      setState(prev => ({
        ...prev,
        serviceAvailable: false,
        error: 'Failed to check service status'
      }));
      return false;
    }
  }, []);

  // Fetch usage statistics
  const fetchUsageStats = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const isAvailable = await checkServiceStatus();
      if (!isAvailable) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const response = await fetch(`${API_BASE}/anthropic/usage-stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch usage stats');
      }

      setState(prev => ({
        ...prev,
        usageMetrics: result.data.usage,
        healthStatus: result.data.health,
        loading: false,
        error: null,
        lastUpdate: Date.now(),
        connectionStatus: 'connected'
      }));

    } catch (error) {
      console.error('❌ Failed to fetch usage stats:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionStatus: 'error'
      }));
    }
  }, [checkServiceStatus]);

  // Fetch comprehensive statistics
  const fetchComprehensiveStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/anthropic/comprehensive-stats`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setState(prev => ({
            ...prev,
            comprehensiveStats: result.data,
            lastUpdate: Date.now(),
            connectionStatus: 'connected'
          }));
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch comprehensive stats:', error);
    }
  }, []);

  // Perform health check
  const performHealthCheck = useCallback(async () => {
    try {
      if (!state.serviceAvailable) return null;

      const response = await fetch(`${API_BASE}/anthropic/health-check`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setState(prev => ({
            ...prev,
            healthStatus: result.data,
            lastUpdate: Date.now()
          }));
          return result.data;
        }
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
    return null;
  }, [state.serviceAvailable]);

  // Send direct prompt to Claude API
  const sendDirectPrompt = useCallback(async (prompt: string, model?: string) => {
    try {
      if (!state.serviceAvailable) {
        throw new Error('Anthropic API service not available');
      }

      const response = await fetch(`${API_BASE}/anthropic/direct-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: model || 'claude-3-5-sonnet-20241022',
          maxTokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to send prompt');
      }

      // Refresh stats after API call
      setTimeout(fetchUsageStats, 1000);

      return result.data;
    } catch (error) {
      console.error('❌ Failed to send direct prompt:', error);
      throw error;
    }
  }, [state.serviceAvailable, fetchUsageStats]);

  // Initialize and set up polling
  useEffect(() => {
    // Initial fetch
    fetchUsageStats();
    fetchComprehensiveStats();

    // Set up polling
    const usageInterval = setInterval(fetchUsageStats, refreshInterval);
    const comprehensiveInterval = setInterval(fetchComprehensiveStats, refreshInterval * 2);

    return () => {
      clearInterval(usageInterval);
      clearInterval(comprehensiveInterval);
    };
  }, [fetchUsageStats, fetchComprehensiveStats, refreshInterval]);

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
          console.log('🔌 Anthropic API WebSocket connected');
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'anthropic-api-update') {
              setState(prev => ({
                ...prev,
                usageMetrics: message.data.metrics,
                lastUpdate: Date.now(),
                connectionStatus: 'connected'
              }));
            } else if (message.type === 'api-health-update') {
              setState(prev => ({
                ...prev,
                healthStatus: message.data,
                lastUpdate: Date.now(),
                connectionStatus: 'connected'
              }));
            }
          } catch (error) {
            console.error('❌ WebSocket message parse error:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 Anthropic API WebSocket disconnected');
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.error('❌ Anthropic API WebSocket error:', error);
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
  }, []);

  const retry = useCallback(() => {
    fetchUsageStats();
    fetchComprehensiveStats();
  }, [fetchUsageStats, fetchComprehensiveStats]);

  return {
    // State
    usageMetrics: state.usageMetrics,
    healthStatus: state.healthStatus,
    comprehensiveStats: state.comprehensiveStats,
    serviceAvailable: state.serviceAvailable,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus,

    // Computed values
    isHealthy: state.healthStatus?.status === 'healthy',
    isConnected: state.connectionStatus === 'connected',
    hasError: !!state.error,
    dailyUsagePercent: state.usageMetrics ? 
      (state.usageMetrics.dailyRequestCount / state.usageMetrics.dailyRequestLimit) * 100 : 0,
    rateLimitPercent: state.usageMetrics?.rateLimitStatus.percentUsed || 0,
    costPerRequest: state.usageMetrics ? 
      state.usageMetrics.costEstimate.daily / Math.max(1, state.usageMetrics.dailyRequestCount) : 0,

    // Actions
    sendDirectPrompt,
    performHealthCheck,
    retry,

    // Formatting helpers
    formatCost: (amount: number) => `$${amount.toFixed(4)}`,
    formatTokens: (tokens: number) => tokens.toLocaleString(),
    formatResponseTime: (ms: number) => `${Math.round(ms)}ms`,
    formatUptime: (ms: number) => {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  };
};