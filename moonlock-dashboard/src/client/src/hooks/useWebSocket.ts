import { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import { WebSocketMessage } from '../../../shared/types';
import { useSessionStore } from '../store/sessionStore';
import { useTokenStore } from '../store/tokenStore';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  setSocket: (socket: WebSocket | null) => void;
  setConnected: (connected: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
}

const useWebSocketStore = create<WebSocketState>((set) => ({
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  
  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ isConnected: connected }),
  incrementReconnectAttempts: () => set((state) => ({ 
    reconnectAttempts: state.reconnectAttempts + 1 
  })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
}));

export const useWebSocket = () => {
  const {
    socket,
    isConnected,
    reconnectAttempts,
    maxReconnectAttempts,
    setSocket,
    setConnected,
    incrementReconnectAttempts,
    resetReconnectAttempts,
  } = useWebSocketStore();
  
  const { updateTimer, setCurrentSession } = useSessionStore();
  const { updateTokenUsage, setAlerts } = useTokenStore();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'timer_update':
          updateTimer(message.elapsed, message.remaining);
          // Update session status if changed
          if (message.status) {
            setCurrentSession(prev => prev ? { ...prev, status: message.status } : null);
          }
          break;
          
        case 'token_update':
          updateTokenUsage(
            message.tokensUsed,
            message.totalUsed,
            message.projectedTotal
          );
          break;
          
        case 'checkpoint':
          // Handle checkpoint reached
          console.log('Checkpoint reached:', message.phase);
          break;
          
        case 'alert':
          setAlerts([{ level: message.level, message: message.message }]);
          break;
          
        default:
          console.log('Unknown WebSocket message:', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [updateTimer, updateTokenUsage, setAlerts, setCurrentSession]);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }, [socket]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setSocket(newSocket);
        setConnected(true);
        resetReconnectAttempts();
        startHeartbeat();
      };

      newSocket.onmessage = handleMessage;

      newSocket.onclose = () => {
        console.log('WebSocket disconnected');
        setSocket(null);
        setConnected(false);
        stopHeartbeat();
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            incrementReconnectAttempts();
            connectWebSocket();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnected(false);
    }
  }, [
    socket,
    reconnectAttempts,
    maxReconnectAttempts,
    handleMessage,
    setSocket,
    setConnected,
    resetReconnectAttempts,
    incrementReconnectAttempts,
    startHeartbeat,
    stopHeartbeat,
  ]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    stopHeartbeat();
    
    if (socket) {
      socket.close(1000, 'Client disconnecting');
      setSocket(null);
      setConnected(false);
    }
  }, [socket, setSocket, setConnected, stopHeartbeat]);

  const subscribeToSession = useCallback((sessionId: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'subscribe',
        sessionId,
      }));
    }
  }, [socket]);

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'unsubscribe',
        sessionId,
      }));
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  return {
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
    subscribeToSession,
    unsubscribeFromSession,
    reconnectAttempts,
    maxReconnectAttempts,
  };
};