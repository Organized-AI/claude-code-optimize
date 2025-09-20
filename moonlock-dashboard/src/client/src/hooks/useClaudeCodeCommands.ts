import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export interface SlashCommand {
  command: string;
  args?: string[];
  description: string;
  category: 'built-in' | 'custom' | 'mcp';
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  timestamp: number;
  sessionId?: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  command?: string;
  output?: string;
  error?: string;
  timestamp?: number;
  duration?: number;
}

export interface PlanModeSession {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  autoExecute: boolean;
}

export interface CommandStreamData {
  type: 'stdout' | 'stderr';
  data: string;
  processId: string;
  sessionId?: string;
}

export function useClaudeCodeCommands() {
  const [availableCommands, setAvailableCommands] = useState<SlashCommand[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  const [activePlanSessions, setActivePlanSessions] = useState<PlanModeSession[]>([]);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandStreamData, setCommandStreamData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected, sendMessage } = useWebSocket();
  const commandSubscriptions = useRef<Set<string>>(new Set());

  // Subscribe to command streams on mount
  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'subscribe_commands' }); // Subscribe to all command streams
      loadAvailableCommands();
      loadCommandHistory();
      loadPlanSessions();
    }
  }, [isConnected]);

  // Handle WebSocket messages
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'claude-command-stream':
            handleCommandStream(message.data);
            break;
            
          case 'claude-command-result':
            handleCommandResult(message.data);
            break;
            
          case 'plan-mode-update':
            handlePlanModeUpdate(message.data);
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    if (isConnected) {
      // This is a simplified approach - in a real implementation, 
      // you'd need to access the WebSocket instance from useWebSocket
      window.addEventListener('message', handleWebSocketMessage);
    }

    return () => {
      window.removeEventListener('message', handleWebSocketMessage);
    };
  }, [isConnected]);

  const handleCommandStream = useCallback((data: CommandStreamData) => {
    setCommandStreamData(prev => ({
      ...prev,
      [data.processId]: (prev[data.processId] || '') + data.data
    }));
  }, []);

  const handleCommandResult = useCallback((result: CommandResult) => {
    setCommandHistory(prev => [result, ...prev].slice(0, 100)); // Keep last 100 commands
    setIsExecutingCommand(false);
    setError(result.success ? null : result.error || 'Command failed');
    
    // Clear stream data for this command
    setCommandStreamData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.includes(result.command)) {
          delete updated[key];
        }
      });
      return updated;
    });
  }, []);

  const handlePlanModeUpdate = useCallback((data: any) => {
    switch (data.type) {
      case 'session-created':
      case 'session-started':
      case 'session-completed':
      case 'session-cancelled':
        setActivePlanSessions(prev => {
          const updated = prev.filter(s => s.id !== data.session.id);
          if (data.session.status !== 'completed' && data.session.status !== 'cancelled') {
            updated.push(data.session);
          }
          return updated;
        });
        break;
        
      case 'step-started':
      case 'step-completed':
        setActivePlanSessions(prev => 
          prev.map(session => 
            session.id === data.session.id ? data.session : session
          )
        );
        break;
    }
  }, []);

  const loadAvailableCommands = useCallback(async () => {
    try {
      const response = await fetch('/api/claude/commands');
      if (response.ok) {
        const commands = await response.json();
        setAvailableCommands(commands);
      }
    } catch (error) {
      console.error('Failed to load available commands:', error);
    }
  }, []);

  const loadCommandHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/claude/commands/history');
      if (response.ok) {
        const history = await response.json();
        setCommandHistory(history);
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }, []);

  const loadPlanSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/claude/plan-sessions');
      if (response.ok) {
        const sessions = await response.json();
        setActivePlanSessions(sessions.filter((s: PlanModeSession) => 
          s.status === 'pending' || s.status === 'in_progress'
        ));
      }
    } catch (error) {
      console.error('Failed to load plan sessions:', error);
    }
  }, []);

  const executeCommand = useCallback(async (
    command: string, 
    args: string[] = [], 
    sessionId?: string
  ): Promise<CommandResult> => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }

    setIsExecutingCommand(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claude/commands/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          args,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Command execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setIsExecutingCommand(false);
      throw error;
    }
  }, [isConnected]);

  const createPlanModeSession = useCallback(async (
    title: string,
    description: string,
    steps: string[],
    autoExecute: boolean = false,
    sessionId?: string
  ): Promise<PlanModeSession> => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }

    try {
      const response = await fetch('/api/claude/plan-mode/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          steps,
          autoExecute,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Plan mode session creation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    }
  }, [isConnected]);

  const executePlanModeSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/claude/plan-mode/${sessionId}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Plan mode execution failed: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const cancelPlanModeSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/claude/plan-mode/${sessionId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Plan mode cancellation failed: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const subscribeToCommandStream = useCallback((processId: string) => {
    if (isConnected && !commandSubscriptions.current.has(processId)) {
      sendMessage({ type: 'subscribe_commands', processId });
      commandSubscriptions.current.add(processId);
    }
  }, [isConnected, sendMessage]);

  const unsubscribeFromCommandStream = useCallback((processId: string) => {
    if (isConnected && commandSubscriptions.current.has(processId)) {
      sendMessage({ type: 'unsubscribe_commands', processId });
      commandSubscriptions.current.delete(processId);
    }
  }, [isConnected, sendMessage]);

  const subscribeToPlanSession = useCallback((planSessionId: string) => {
    if (isConnected) {
      sendMessage({ type: 'subscribe_plan', planSessionId });
    }
  }, [isConnected, sendMessage]);

  const unsubscribeFromPlanSession = useCallback((planSessionId: string) => {
    if (isConnected) {
      sendMessage({ type: 'unsubscribe_plan', planSessionId });
    }
  }, [isConnected, sendMessage]);

  const getCommandSuggestions = useCallback((input: string): SlashCommand[] => {
    const query = input.toLowerCase();
    return availableCommands.filter(cmd => 
      cmd.command.toLowerCase().includes(query) || 
      cmd.description.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [availableCommands]);

  const formatCommandOutput = useCallback((output: string): string => {
    // Basic formatting for command output
    return output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();
  }, []);

  const clearCommandHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    availableCommands,
    commandHistory,
    activePlanSessions,
    isExecutingCommand,
    commandStreamData,
    error,
    isConnected,

    // Actions
    executeCommand,
    createPlanModeSession,
    executePlanModeSession,
    cancelPlanModeSession,
    subscribeToCommandStream,
    unsubscribeFromCommandStream,
    subscribeToPlanSession,
    unsubscribeFromPlanSession,
    
    // Utilities
    getCommandSuggestions,
    formatCommandOutput,
    clearCommandHistory,
    clearError,
    
    // Refresh functions
    loadAvailableCommands,
    loadCommandHistory,
    loadPlanSessions,
  };
}