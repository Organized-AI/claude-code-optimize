/**
 * Hook Activity Hook
 * 
 * Manages real-time hook activity data fetching and WebSocket updates
 * for monitoring Claude Code hooks, rule2hook integration, and automation.
 */

import { useState, useEffect, useCallback } from 'react';

export interface HookLogEntry {
  id: string;
  hookName: string;
  event: 'created' | 'executed' | 'modified' | 'disabled' | 'enabled';
  status: 'success' | 'failure' | 'blocked' | 'pending';
  source: 'rule2hook' | 'manual' | 'system' | 'claude-code';
  timestamp: number;
  duration?: number;
  command?: string;
  error?: string;
}

export interface HookActivityFeed {
  recentActivity: HookLogEntry[];
  summary: {
    totalHooks: number;
    activeHooks: number;
    recentExecutions: number;
    successRate: number;
    averageExecutionTime: number;
  };
  categories: Record<string, number>;
  sources: Record<string, number>;
}

interface HookActivityState {
  data: HookActivityFeed | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://dashboard.organizedai.vip/api' 
  : 'http://localhost:3002/api';

export const useHookActivity = (refreshInterval: number = 30000) => {
  const [state, setState] = useState<HookActivityState>({
    data: null,
    loading: true,
    error: null,
    lastUpdate: 0,
    connectionStatus: 'disconnected'
  });

  // Fetch hook activity data
  const fetchHookActivity = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`${API_BASE}/health/hook-activity-feed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch hook activity');
      }

      setState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        error: null,
        lastUpdate: Date.now(),
        connectionStatus: 'connected'
      }));

    } catch (error) {
      console.error('❌ Failed to fetch hook activity:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionStatus: 'error'
      }));
    }
  }, []);

  // Fetch hook logs (lighter endpoint for frequent updates)
  const fetchHookLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health/hook-logs?limit=20`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && state.data) {
          setState(prev => ({
            ...prev,
            data: prev.data ? {
              ...prev.data,
              recentActivity: result.data.logs,
            } : null,
            lastUpdate: Date.now(),
            connectionStatus: 'connected'
          }));
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch hook logs:', error);
    }
  }, [state.data]);

  // Initialize and set up polling
  useEffect(() => {
    // Initial fetch
    fetchHookActivity();

    // Set up polling for updates
    const pollInterval = setInterval(() => {
      fetchHookLogs();
    }, refreshInterval);

    // Set up periodic full refresh
    const refreshInterval2 = setInterval(() => {
      fetchHookActivity();
    }, refreshInterval * 4); // Full refresh every 2 minutes

    return () => {
      clearInterval(pollInterval);
      clearInterval(refreshInterval2);
    };
  }, [fetchHookActivity, fetchHookLogs, refreshInterval]);

  // WebSocket connection for real-time hook updates
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
          console.log('🔌 Hook activity WebSocket connected');
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'hook-log-update') {
              // Add new log entry to recent activity
              setState(prev => ({
                ...prev,
                data: prev.data ? {
                  ...prev.data,
                  recentActivity: [message.data, ...prev.data.recentActivity.slice(0, 19)]
                } : null,
                lastUpdate: Date.now(),
                connectionStatus: 'connected'
              }));
            } else if (message.type === 'hook-activity-update') {
              // Refresh full activity feed
              fetchHookActivity();
            }
          } catch (error) {
            console.error('❌ WebSocket message parse error:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 Hook activity WebSocket disconnected');
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.error('❌ Hook activity WebSocket error:', error);
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
  }, [fetchHookActivity]);

  // Helper methods
  const getLogsByEvent = useCallback((event: HookLogEntry['event']) => {
    return state.data?.recentActivity.filter(log => log.event === event) || [];
  }, [state.data]);

  const getLogsBySource = useCallback((source: HookLogEntry['source']) => {
    return state.data?.recentActivity.filter(log => log.source === source) || [];
  }, [state.data]);

  const getLogsByStatus = useCallback((status: HookLogEntry['status']) => {
    return state.data?.recentActivity.filter(log => log.status === status) || [];
  }, [state.data]);

  const retry = useCallback(() => {
    fetchHookActivity();
  }, [fetchHookActivity]);

  return {
    // State
    data: state.data,
    logs: state.data?.recentActivity || [],
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus,

    // Computed values
    totalHooks: state.data?.summary.totalHooks || 0,
    activeHooks: state.data?.summary.activeHooks || 0,
    recentExecutions: state.data?.summary.recentExecutions || 0,
    successRate: state.data?.summary.successRate || 100,
    averageExecutionTime: state.data?.summary.averageExecutionTime || 0,
    categories: state.data?.categories || {},
    sources: state.data?.sources || {},

    // Status indicators
    hasHooks: (state.data?.summary.totalHooks || 0) > 0,
    hasRecentActivity: (state.data?.recentActivity?.length || 0) > 0,
    isHealthy: state.connectionStatus === 'connected' && !state.error,

    // Helper methods
    getLogsByEvent,
    getLogsBySource,
    getLogsByStatus,
    retry,

    // Status indicators
    isConnected: state.connectionStatus === 'connected',
    hasError: !!state.error,
    
    // Formatting helpers
    formatEventTime: (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    },

    formatDuration: (duration?: number) => {
      if (!duration) return 'N/A';
      if (duration < 1000) return `${duration}ms`;
      if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
      return `${(duration / 60000).toFixed(1)}m`;
    }
  };
};