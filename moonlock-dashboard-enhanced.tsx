import React, { useState, useEffect } from 'react';
import { ChevronDown, Shield, HardDrive, Cpu, Wifi, Smartphone, AlertCircle, Clock, Code, Zap, Calendar, TrendingUp, Play, Pause, RotateCcw, Eye, ChevronRight, Activity } from 'lucide-react';

// React-Bits inspired components
const ParticleField = ({ density = 20, color = '#60A5FA' }) => {
  const particles = Array.from({ length: density }, (_, i) => (
    <div
      key={i}
      className="absolute rounded-full animate-float"
      style={{
        width: Math.random() * 4 + 'px',
        height: Math.random() * 4 + 'px',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        backgroundColor: color,
        opacity: Math.random() * 0.5 + 0.2,
        animationDelay: Math.random() * 5 + 's',
        animationDuration: Math.random() * 10 + 10 + 's'
      }}
    />
  ));

  return <div className="absolute inset-0 overflow-hidden">{particles}</div>;
};

const PulseOrb = ({ status, size = 80 }) => {
  const colors = {
    active: 'from-green-400 to-emerald-600',
    waiting: 'from-blue-400 to-indigo-600',
    warning: 'from-yellow-400 to-orange-600',
    critical: 'from-red-400 to-rose-600'
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors[status]} animate-pulse`} />
      <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${colors[status]} opacity-80`} />
      <div className="absolute inset-0 rounded-full backdrop-blur-sm bg-white/10" />
    </div>
  );
};

const AnimatedNumber = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayValue(prev => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.1) return value;
        return prev + diff * 0.1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{Math.round(displayValue)}{suffix}</span>;
};

const GlassCard = ({ children, className = '', glow = false, onClick = null }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/5 backdrop-blur-xl
        border border-white/10
        ${glow ? 'shadow-2xl shadow-blue-500/20' : ''}
        ${onClick ? 'cursor-pointer hover:bg-white/10 transition-all' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const SessionHistoryItem = ({ session, onClick }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <Shield className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <GlassCard className="p-4 mb-3" onClick={() => onClick(session)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={getStatusColor(session.status)}>
              {getStatusIcon(session.status)}
            </div>
            <h4 className="font-medium text-sm">{session.project}</h4>
            <span className="text-xs text-gray-400">#{session.id}</span>
          </div>
          <p className="text-xs text-gray-300 mb-2">{session.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>⏱ {session.duration}</span>
            <span>🎯 {session.tokensUsed}/{session.tokenBudget} prompts</span>
            <span>📊 {session.efficiency}% efficient</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-gray-400">{session.date}</span>
          <ChevronRight className="w-3 h-3 text-gray-500" />
        </div>
      </div>
    </GlassCard>
  );
};

const WeeklyQuotaBar = ({ used, total, label, color }) => {
  const percentage = (used / total) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-xs text-gray-400">{used}h / {total}h</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">{percentage.toFixed(1)}% used</span>
        <span className="text-xs text-gray-500">{(total - used).toFixed(1)}h remaining</span>
      </div>
    </div>
  );
};

// API Configuration - tries localhost first, then Netlify fallback
const API_CONFIG = {
  localhost: 'http://localhost:3001/api',
  netlify: 'https://claude-code-optimizer-dashboard.netlify.app/.netlify/functions/session-sync',
  apiSecret: 'development-secret' // In production, use environment variable
};

// Connection Status Component
const ConnectionStatus = ({ status, lastSync }) => {
  const statusColors = {
    localhost: 'text-green-400',
    netlify: 'text-blue-400', 
    offline: 'text-red-400',
    connecting: 'text-yellow-400'
  };
  
  const statusIcons = {
    localhost: <Wifi className="w-4 h-4" />,
    netlify: <Wifi className="w-4 h-4" />,
    offline: <AlertCircle className="w-4 h-4" />,
    connecting: <Activity className="w-4 h-4 animate-spin" />
  };
  
  return (
    <div className={`flex items-center gap-2 ${statusColors[status]}`}>
      {statusIcons[status]}
      <span className="text-xs">
        {status === 'localhost' && 'Connected to localhost:3001'}
        {status === 'netlify' && 'Using Netlify sync'}
        {status === 'offline' && 'Using cached data'}
        {status === 'connecting' && 'Connecting...'}
      </span>
      {lastSync && (
        <span className="text-xs text-gray-400">({new Date(lastSync).toLocaleTimeString()})</span>
      )}
    </div>
  );
};

export default function ClaudeCodeDashboard() {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastSync, setLastSync] = useState(null);
  const [realSessions, setRealSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [fiveHourBlocks, setFiveHourBlocks] = useState([]);
  const [websocket, setWebsocket] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [weeklyQuota, setWeeklyQuota] = useState({
    sonnet: { used: 23.5, total: 480 },
    opus: { used: 2.1, total: 40 }
  });

  // Fallback mock session data
  const [mockSessions] = useState([
    {
      id: 'CCO-001',
      project: 'Moonlock Dashboard Enhancement',
      description: 'Session management and token optimization infrastructure',
      status: 'completed',
      date: '2 hours ago',
      duration: '4h 23m',
      tokensUsed: 87,
      tokenBudget: 95,
      efficiency: 92,
      model: 'Sonnet 4',
      deliverables: ['Session state management', 'Token utilization monitor', 'Testing suite']
    },
    {
      id: 'CCO-002', 
      project: 'Calendar Integration API',
      description: 'Google Calendar and iCal automation system',
      status: 'paused',
      date: 'Yesterday',
      duration: '3h 45m',
      tokensUsed: 63,
      tokenBudget: 80,
      efficiency: 89,
      model: 'Sonnet 4',
      deliverables: ['Calendar API setup', 'Event creation logic', 'Conflict detection']
    },
    {
      id: 'CCO-003',
      project: 'Sub-Agent Architecture',
      description: 'Specialized agent coordination and parallel processing',
      status: 'completed',
      date: '2 days ago', 
      duration: '5h 12m',
      tokensUsed: 112,
      tokenBudget: 120,
      efficiency: 94,
      model: 'Opus 4',
      deliverables: ['Agent framework', 'Message coordination', 'Performance monitoring']
    },
    {
      id: 'CCO-004',
      project: 'Weekly Optimization Protocol',
      description: 'Automated quota management and emergency protocols',
      status: 'completed',
      date: '3 days ago',
      duration: '2h 56m',
      tokensUsed: 45,
      tokenBudget: 60,
      efficiency: 88,
      model: 'Sonnet 4',
      deliverables: ['Quota tracking', 'Alert system', 'Emergency failover']
    }
  ]);

  // API Functions
  const fetchFromAPI = async (endpoint, useNetlify = false) => {
    const baseURL = useNetlify ? API_CONFIG.netlify : API_CONFIG.localhost;
    const headers = useNetlify ? {
      'Content-Type': 'application/json',
      'X-API-Key': API_CONFIG.apiSecret
    } : {};
    
    const response = await fetch(`${baseURL}${endpoint}`, {
      headers,
      timeout: useNetlify ? 10000 : 5000
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const syncToNetlify = async (data) => {
    try {
      await fetch(`${API_CONFIG.netlify}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_CONFIG.apiSecret
        },
        body: JSON.stringify({
          source: 'dashboard_manual_sync',
          timestamp: new Date().toISOString(),
          data
        })
      });
      console.log('✅ Synced to Netlify');
    } catch (error) {
      console.warn('⚠️ Netlify sync failed:', error.message);
    }
  };

  const fetchAllData = async (useNetlify = false) => {
    try {
      const [sessions, analyticsData, blocks] = await Promise.all([
        fetchFromAPI('/sessions/recent?limit=20', useNetlify),
        fetchFromAPI('/analytics/current', useNetlify),
        fetchFromAPI('/five-hour-blocks?limit=10', useNetlify)
      ]);
      
      setRealSessions(sessions || []);
      setAnalytics(analyticsData || {});
      setFiveHourBlocks(blocks || []);
      setConnectionStatus(useNetlify ? 'netlify' : 'localhost');
      setLastSync(new Date().toISOString());
      setRetryCount(0);
      
      // If connected to localhost, sync data to Netlify for caching
      if (!useNetlify) {
        syncToNetlify({ 
          recent_sessions: sessions, 
          analytics: analyticsData, 
          five_hour_blocks: blocks 
        });
      }
      
    } catch (error) {
      console.warn(`Failed to fetch from ${useNetlify ? 'Netlify' : 'localhost'}:`, error.message);
      throw error;
    }
  };

  const connectWebSocket = () => {
    if (websocket) websocket.close();
    
    try {
      const ws = new WebSocket('ws://localhost:3001/ws');
      
      ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        setConnectionStatus('localhost');
        setRetryCount(0);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'initial_data') {
            setRealSessions(data.recent_sessions || []);
            setAnalytics(data.analytics || {});
            setFiveHourBlocks(data.five_hour_blocks || []);
            setHasActiveSession((data.active_sessions || []).length > 0);
            setLastSync(data.server_time);
          } else if (data.type === 'session_update') {
            fetchAllData(false); // Refresh data on updates
          } else if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.warn('WebSocket message parse error:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting fallback');
        attemptConnection();
      };
      
      ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
      };
      
      setWebsocket(ws);
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
      attemptConnection();
    }
  };

  const attemptConnection = async () => {
    setConnectionStatus('connecting');
    
    try {
      // Try localhost first
      await fetchAllData(false);
      connectWebSocket();
    } catch (localhostError) {
      try {
        // Fallback to Netlify
        console.log('Localhost unavailable, trying Netlify...');
        await fetchAllData(true);
      } catch (netlifyError) {
        // Use mock data as last resort
        console.log('Both APIs unavailable, using mock data');
        setConnectionStatus('offline');
        setRealSessions(mockSessions);
        setRetryCount(prev => prev + 1);
      }
    }
  };

  // Initialize connection and set up refresh intervals
  useEffect(() => {
    attemptConnection();
    
    // Retry connection periodically if offline
    const retryInterval = setInterval(() => {
      if (connectionStatus === 'offline' || connectionStatus === 'connecting') {
        attemptConnection();
      }
    }, Math.min(5000 * Math.pow(1.5, retryCount), 60000)); // Exponential backoff, max 60s
    
    // Regular data refresh
    const refreshInterval = setInterval(() => {
      if (connectionStatus === 'localhost' && !websocket) {
        fetchAllData(false);
      } else if (connectionStatus === 'netlify') {
        fetchAllData(true);
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(retryInterval);
      clearInterval(refreshInterval);
      if (websocket) websocket.close();
    };
  }, [connectionStatus, retryCount]);

  // Transform real session data to match dashboard format
  const transformSessionData = (session) => {
    const duration = session.duration_minutes ? 
      `${Math.floor(session.duration_minutes / 60)}h ${Math.round(session.duration_minutes % 60)}m` : 
      'Unknown';
    
    return {
      id: session.id?.slice(0, 8) || 'Unknown',
      project: session.metadata?.project || session.session_type || 'Unknown Project',
      description: session.metadata?.description || `${session.session_type} session`,
      status: session.is_active ? 'active' : 'completed',
      date: session.start_time ? new Date(session.start_time).toLocaleString() : 'Unknown',
      duration,
      tokensUsed: session.estimated_tokens || 0,
      tokenBudget: 100, // Default budget
      efficiency: session.metadata?.efficiency || 85,
      model: (session.models_used && session.models_used[0]) || 'Claude',
      deliverables: session.metadata?.deliverables || ['Session completed']
    };
  };

  const getCurrentSessions = () => {
    if (realSessions.length > 0) {
      return realSessions.map(transformSessionData);
    }
    return mockSessions;
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
  };

  const handleBackToHistory = () => {
    setSelectedSession(null);
  };

  const handleStartSession = () => {
    // TODO: Integrate with Claude Code SDK
    console.log('Starting new Claude Code session...');
    // This will be implemented with SDK integration
  };

  const handlePlanProject = () => {
    // TODO: Integrate with project analyzer
    console.log('Planning new project...');
    // This will be implemented with project analysis
  };

  if (selectedSession) {
    return (
      <div className="w-[420px] h-[800px] bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-hidden relative">
        <ParticleField density={20} color="#60A5FA" />
        
        <div className="relative z-10 p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={handleBackToHistory}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Session Details</h1>
              <p className="text-sm text-gray-300">#{selectedSession.id}</p>
            </div>
          </div>

          <GlassCard className="p-4" glow>
            <h3 className="font-medium mb-2">{selectedSession.project}</h3>
            <p className="text-sm text-gray-300 mb-4">{selectedSession.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-sm font-medium">{selectedSession.duration}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Model</p>
                <p className="text-sm font-medium">{selectedSession.model}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Token Usage</p>
                <p className="text-sm font-medium">{selectedSession.tokensUsed}/{selectedSession.tokenBudget}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Efficiency</p>
                <p className="text-sm font-medium">{selectedSession.efficiency}%</p>
              </div>
            </div>

            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-500"
                style={{ width: `${(selectedSession.tokensUsed / selectedSession.tokenBudget) * 100}%` }}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h4 className="font-medium mb-3">Deliverables</h4>
            <div className="space-y-2">
              {selectedSession.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">{deliverable}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm transition-colors">
              Resume Session
            </button>
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
              View Context
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasActiveSession && currentSession) {
    // Active session view - would show real-time session data
    return (
      <div className="w-[420px] h-[800px] bg-gradient-to-br from-green-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-hidden relative">
        <ParticleField density={30} color="#10B981" />
        
        <div className="relative z-10 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PulseOrb status="active" size={60} />
              <div>
                <h1 className="text-xl font-bold">Active Session</h1>
                <p className="text-sm text-gray-300">{currentSession.project}</p>
              </div>
            </div>
          </div>
          {/* Active session content would go here */}
        </div>
      </div>
    );
  }

  // Waiting state with session history
  return (
    <div className="w-[420px] h-[800px] bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-hidden relative">
      <ParticleField density={25} color="#60A5FA" />
      
      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <PulseOrb status={hasActiveSession ? "active" : "waiting"} size={60} />
            <div>
              <h1 className="text-xl font-bold">
                {hasActiveSession ? "Active Session" : "Waiting for Session"}
              </h1>
              <p className="text-sm text-gray-300">Claude Code Optimizer</p>
            </div>
          </div>
        </div>
        
        {/* Connection Status */}
        <GlassCard className="p-3 mb-4">
          <ConnectionStatus status={connectionStatus} lastSync={lastSync} />
          {connectionStatus === 'offline' && retryCount > 0 && (
            <div className="text-xs text-gray-400 mt-2">
              Retry attempt {retryCount} - Check localhost:3001 is running
            </div>
          )}
        </GlassCard>

        {/* Weekly Quota Status */}
        <GlassCard className="p-4" glow>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Weekly Quota Status</span>
          </div>
          
          <WeeklyQuotaBar 
            used={weeklyQuota.sonnet.used}
            total={weeklyQuota.sonnet.total}
            label="Claude Sonnet 4"
            color="from-blue-400 to-blue-600"
          />
          
          <WeeklyQuotaBar 
            used={weeklyQuota.opus.used}
            total={weeklyQuota.opus.total}
            label="Claude Opus 4"  
            color="from-purple-400 to-purple-600"
          />

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400">
              Estimated sessions remaining: <span className="text-green-400 font-medium">23-28</span>
            </p>
          </div>
        </GlassCard>

        {/* Session History */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Sessions
            </h3>
            <span className="text-xs text-gray-400">{recentSessions.length} sessions</span>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {getCurrentSessions().map((session) => (
              <SessionHistoryItem 
                key={session.id} 
                session={session} 
                onClick={handleSessionClick}
              />
            ))}
          </div>
          
          {realSessions.length === 0 && connectionStatus !== 'offline' && (
            <div className="text-center py-4 text-gray-400">
              <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p>Loading session data...</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={handleStartSession}
            className="p-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
          <button 
            onClick={handlePlanProject}
            className="p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Plan
          </button>
          <button className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
        </div>

        {/* Status Bar */}
        <GlassCard className="p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">System Ready</span>
            </div>
            <span className="text-gray-400">Last check: {new Date().toLocaleTimeString()}</span>
          </div>
        </GlassCard>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-20px) translateX(10px);
          }
          66% {
            transform: translateY(10px) translateX(-10px);
          }
        }
      `}</style>
    </div>
  );
}
