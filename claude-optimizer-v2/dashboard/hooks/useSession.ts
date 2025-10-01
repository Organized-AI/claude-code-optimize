'use client';

/**
 * useSession Hook
 * Manages WebSocket connection and real-time session updates
 */

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SessionData, SessionEvent, SessionMetrics } from '@/types/session';

interface UseSessionReturn {
  session: SessionData | null;
  isConnected: boolean;
  error: string | null;
  recentObjectives: string[];
  recentTools: Array<{ name: string; timestamp: Date }>;
}

export function useSession(serverUrl: string = 'http://localhost:3001'): UseSessionReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [recentObjectives, setRecentObjectives] = useState<string[]>([]);
  const [recentTools, setRecentTools] = useState<Array<{ name: string; timestamp: Date }>>([]);

  useEffect(() => {
    // Initialize Socket.io connection
    const socketInstance = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    setSocket(socketInstance);

    // Connection handlers
    socketInstance.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(err.message || 'Connection error');
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [serverUrl]);

  // Session event handlers
  useEffect(() => {
    if (!socket) return;

    // Session start
    socket.on('session:start', (event: Extract<SessionEvent, { type: 'session:start' }>) => {
      console.log('📅 Session started:', event.data);
      setSession({
        ...event.data,
        startTime: new Date(event.data.startTime),
        status: 'active'
      });
      setRecentObjectives([]);
      setRecentTools([]);
    });

    // Objective completed
    socket.on('session:objective', (event: Extract<SessionEvent, { type: 'session:objective' }>) => {
      console.log('✅ Objective:', event.data.objective);
      setRecentObjectives(prev => [...prev, event.data.objective].slice(-10)); // Keep last 10

      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          metrics: prev.metrics ? {
            ...prev.metrics,
            objectivesCompleted: [...prev.metrics.objectivesCompleted, event.data.objective]
          } : undefined
        };
      });
    });

    // Token update
    socket.on('session:tokens', (event: Extract<SessionEvent, { type: 'session:tokens' }>) => {
      console.log('📊 Tokens:', event.data.tokensUsed);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          metrics: {
            ...(prev.metrics || {
              messageCount: 0,
              toolCalls: 0,
              objectivesCompleted: [],
              startTime: prev.startTime,
              lastUpdate: new Date()
            }),
            ...event.data,
            lastUpdate: new Date()
          }
        };
      });
    });

    // Tool usage
    socket.on('session:tool', (event: Extract<SessionEvent, { type: 'session:tool' }>) => {
      console.log('🔧 Tool:', event.data.name);
      setRecentTools(prev => [...prev, {
        name: event.data.name,
        timestamp: new Date(event.timestamp)
      }].slice(-10)); // Keep last 10

      setSession(prev => {
        if (!prev || !prev.metrics) return prev;
        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            toolCalls: prev.metrics.toolCalls + 1
          }
        };
      });
    });

    // Session complete
    socket.on('session:complete', (event: Extract<SessionEvent, { type: 'session:complete' }>) => {
      console.log('✅ Session completed:', event.data);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          metrics: {
            ...event.data.metrics,
            startTime: new Date(event.data.metrics.startTime),
            lastUpdate: new Date(event.data.metrics.lastUpdate)
          }
        };
      });
    });

    // Session error
    socket.on('session:error', (event: Extract<SessionEvent, { type: 'session:error' }>) => {
      console.error('❌ Session error:', event.data.error);
      setError(event.data.error);
      setSession(prev => prev ? { ...prev, status: 'error' } : null);
    });

    // Cleanup listeners
    return () => {
      socket.off('session:start');
      socket.off('session:objective');
      socket.off('session:tokens');
      socket.off('session:tool');
      socket.off('session:complete');
      socket.off('session:error');
    };
  }, [socket]);

  return {
    session,
    isConnected,
    error,
    recentObjectives,
    recentTools
  };
}
