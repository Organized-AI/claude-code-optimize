import { create } from 'zustand';
import { Session } from '../../../shared/types';

interface SessionState {
  currentSession: Session | null;
  elapsed: number;
  remaining: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Actions
  setCurrentSession: (session: Session | null) => void;
  updateTimer: (elapsed: number, remaining: number) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  initializeSession: () => Promise<void>;
  startNewSession: (duration: number, tokenBudget?: number) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  elapsed: 0,
  remaining: 0,
  isLoading: false,
  isConnected: false,
  error: null,

  setCurrentSession: (session) => set({ currentSession: session }),
  updateTimer: (elapsed, remaining) => set({ elapsed, remaining }),
  setLoading: (loading) => set({ isLoading: loading }),
  setConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),

  initializeSession: async () => {
    set({ isLoading: true });
    try {
      // Check for Claude Code session
      const claudeCodeResponse = await fetch('/api/claude-code/status');
      if (claudeCodeResponse.ok) {
        const claudeCodeStatus = await claudeCodeResponse.json();
        
        if (claudeCodeStatus.isActive && claudeCodeStatus.sessionId) {
          // Get the auto-created session
          const sessionResponse = await fetch(`/api/sessions/${claudeCodeStatus.sessionId}`);
          if (sessionResponse.ok) {
            const session = await sessionResponse.json();
            set({ currentSession: session, isConnected: true });
          }
        } else {
          set({ currentSession: null });
        }
      } else {
        set({ currentSession: null });
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      set({ error: 'Failed to connect to server' });
    } finally {
      set({ isLoading: false });
    }
  },

  startNewSession: async (duration, tokenBudget) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, tokenBudget }),
      });
      
      if (!response.ok) throw new Error('Failed to start session');
      
      const session = await response.json();
      set({ currentSession: session, isConnected: true });
    } catch (error) {
      set({ error: 'Failed to start session' });
    } finally {
      set({ isLoading: false });
    }
  },

  pauseSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    try {
      await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
    } catch (error) {
      set({ error: 'Failed to pause session' });
    }
  },

  resumeSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    try {
      await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
    } catch (error) {
      set({ error: 'Failed to resume session' });
    }
  },

  completeSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    
    try {
      await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      
      set({ currentSession: null, elapsed: 0, remaining: 0 });
    } catch (error) {
      set({ error: 'Failed to complete session' });
    }
  },
}));