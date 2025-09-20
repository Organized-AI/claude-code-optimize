/**
 * Critical Alerts Hook
 * 
 * Manages real-time critical alert data fetching and WebSocket updates
 * for mission-critical system monitoring and disaster prevention.
 */

import { useState, useEffect, useCallback } from 'react';

export interface CriticalAlert {
  id: string;
  type: 'critical' | 'warning' | 'healthy';
  category: 'disk' | 'memory' | 'api' | 'process' | 'session' | 'quota';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  resolved: boolean;
  severity: 1 | 2 | 3; // 1 = critical, 2 = warning, 3 = info
}

export interface CriticalAlertsReport {
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  alerts: CriticalAlert[];
  overallStatus: 'critical' | 'warning' | 'healthy';
  lastCheck: string;
}

interface CriticalAlertsState {
  data: CriticalAlertsReport | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://dashboard.organizedai.vip/api' 
  : 'http://localhost:3002/api';

export const useCriticalAlerts = (refreshInterval: number = 30000) => {
  const [state, setState] = useState<CriticalAlertsState>({
    data: null,
    loading: true,
    error: null,
    lastUpdate: 0,
    connectionStatus: 'disconnected'
  });

  // Fetch critical alerts data
  const fetchCriticalAlerts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`${API_BASE}/health/critical-alerts`, {
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
        throw new Error(result.message || 'Failed to fetch critical alerts');
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
      console.error('❌ Failed to fetch critical alerts:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionStatus: 'error'
      }));
    }
  }, []);

  // Fetch live alerts (cached data)
  const fetchLiveAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health/live-alerts`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setState(prev => ({
            ...prev,
            data: prev.data ? {
              ...prev.data,
              alerts: result.data.alerts,
              lastCheck: result.data.lastUpdate
            } : null,
            lastUpdate: Date.now(),
            connectionStatus: 'connected'
          }));
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch live alerts:', error);
    }
  }, []);

  // Initialize and set up polling
  useEffect(() => {
    // Initial fetch
    fetchCriticalAlerts();

    // Set up polling for updates
    const pollInterval = setInterval(() => {
      fetchLiveAlerts();
    }, refreshInterval);

    // Set up periodic full refresh
    const refreshInterval2 = setInterval(() => {
      fetchCriticalAlerts();
    }, refreshInterval * 4); // Full refresh every 2 minutes

    return () => {
      clearInterval(pollInterval);
      clearInterval(refreshInterval2);
    };
  }, [fetchCriticalAlerts, fetchLiveAlerts, refreshInterval]);

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
          console.log('🔌 Critical alerts WebSocket connected');
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'critical-alerts-update') {
              setState(prev => ({
                ...prev,
                data: message.data,
                lastUpdate: Date.now(),
                connectionStatus: 'connected'
              }));
            }
          } catch (error) {
            console.error('❌ WebSocket message parse error:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 Critical alerts WebSocket disconnected');
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.error('❌ Critical alerts WebSocket error:', error);
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

  // Helper methods
  const getAlertsByType = useCallback((type: 'critical' | 'warning' | 'healthy') => {
    return state.data?.alerts.filter(alert => alert.type === type) || [];
  }, [state.data]);

  const getAlertsByCategory = useCallback((category: CriticalAlert['category']) => {
    return state.data?.alerts.filter(alert => alert.category === category) || [];
  }, [state.data]);

  const getHighestSeverityAlert = useCallback(() => {
    if (!state.data?.alerts.length) return null;
    
    return state.data.alerts.reduce((highest, current) => {
      return current.severity < highest.severity ? current : highest;
    });
  }, [state.data]);

  const retry = useCallback(() => {
    fetchCriticalAlerts();
  }, [fetchCriticalAlerts]);

  return {
    // State
    data: state.data,
    alerts: state.data?.alerts || [],
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus,

    // Computed values
    criticalCount: state.data?.criticalCount || 0,
    warningCount: state.data?.warningCount || 0,
    healthyCount: state.data?.healthyCount || 0,
    overallStatus: state.data?.overallStatus || 'healthy',
    isHealthy: state.data?.overallStatus === 'healthy',
    hasCriticalAlerts: (state.data?.criticalCount || 0) > 0,
    hasWarnings: (state.data?.warningCount || 0) > 0,

    // Helper methods
    getAlertsByType,
    getAlertsByCategory,
    getHighestSeverityAlert,
    retry,

    // Status indicators
    isConnected: state.connectionStatus === 'connected',
    hasError: !!state.error,
    
    // Formatting helpers
    formatLastCheck: (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    },

    formatAlertTime: (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      return date.toLocaleTimeString();
    }
  };
};