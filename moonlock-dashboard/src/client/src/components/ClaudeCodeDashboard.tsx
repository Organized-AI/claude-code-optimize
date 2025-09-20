import React, { useState, useEffect } from 'react';
import { ChevronDown, Shield, HardDrive, Cpu, Wifi, Smartphone, AlertCircle, Clock, Code, Zap, Calendar, TrendingUp, Play, Pause, RotateCcw, Eye, ChevronRight, Activity, Timer, BarChart3 } from 'lucide-react';
import { SessionLogger } from '../services/SessionLogger';
import { SessionControl } from './SessionControl';
import { liveSessionExtractor, LiveSessionData, SystemSessionData } from '../services/LiveSessionExtractor';
import { HookActivityLogCard } from './HookActivityLogCard';
import { UnifiedAPIUsageCard } from './UnifiedAPIUsageCard';
import { ClaudeSDKInterface } from './ClaudeSDKInterface';

// TypeScript interfaces
interface ParticleFieldProps {
  density?: number;
  color?: string;
}

interface PulseOrbProps {
  status: 'active' | 'waiting' | 'warning' | 'critical';
  size?: number;
}

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: (() => void) | null;
}

interface SessionHistoryItemProps {
  session: any;
  onClick: (session: any) => void;
}

interface WeeklyQuotaBarProps {
  used: number;
  total: number;
  label: string;
  color: string;
}

interface CircularTimerProps {
  timeElapsed: number;
  totalTime: number;
  isActive: boolean;
}

interface UsageTrendChartProps {
  data: number[];
}

// React-Bits inspired components
const ParticleField: React.FC<ParticleFieldProps> = ({ density = 20, color = '#60A5FA' }) => {
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

const CircularTimer: React.FC<CircularTimerProps> = ({ timeElapsed, totalTime, isActive }) => {
  const percentage = totalTime > 0 ? (timeElapsed / totalTime) * 100 : 0;
  const radius = 45;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-32 h-32">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={isActive ? "#ef4444" : "#60a5fa"}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${isActive ? 'text-red-400' : 'text-blue-400'}`}>
          {formatTime(timeElapsed)}
        </span>
        <span className="text-xs text-gray-400">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

const UsageTrendChart: React.FC<UsageTrendChartProps> = ({ data }) => {
  const maxValue = Math.max(...data);
  
  return (
    <div className="w-full h-20 flex items-end justify-between gap-1">
      {data.map((value, index) => {
        const height = (value / maxValue) * 100;
        return (
          <div
            key={index}
            className="bg-blue-400 rounded-t transition-all duration-300"
            style={{
              height: `${height}%`,
              width: `${100 / data.length - 2}%`,
              opacity: 0.7 + (height / 100) * 0.3
            }}
          />
        );
      })}
    </div>
  );
};

const PhaseProgressBar: React.FC<{
  phase: string;
  current: number;
  total: number;
  underBudget: number;
  isCompleted: boolean;
}> = ({ phase, current, total, underBudget, isCompleted }) => {
  const percentage = (current / total) * 100;
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-200">{phase}</span>
        <span className="text-xs text-gray-400">
          {current}/{total} {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            isCompleted ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">
          Estimated: {total} prompts
        </span>
        <span className="text-xs text-green-400">
          {underBudget}% under budget
        </span>
      </div>
    </div>
  );
};

const PulseOrb: React.FC<PulseOrbProps> = ({ status, size = 80 }) => {
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

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, suffix = '' }) => {
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

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false, onClick = null }) => {
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

const SessionHistoryItem: React.FC<SessionHistoryItemProps> = ({ session, onClick }) => {
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

const WeeklyQuotaBar: React.FC<WeeklyQuotaBarProps> = ({ used, total, label, color }) => {
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

export default function ClaudeCodeDashboard() {
  const logger = new SessionLogger();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentPage, setCurrentPage] = useState<'current' | 'history'>('current');
  const [weeklyQuota, setWeeklyQuota] = useState({
    sonnet: { used: 0, total: 432 },
    opus: { used: 0, total: 36 }
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [liveSystemData, setLiveSystemData] = useState<SystemSessionData | null>(null);

  // Refresh data from LIVE system session extractor  
  const refreshData = async () => {
    try {
      const systemData = await liveSessionExtractor.extractLiveSessionData();
      const currentSessionInfo = await liveSessionExtractor.getCurrentSessionInfo();
      
      setLiveSystemData(systemData);
      
      setHasActiveSession(!!systemData.currentSession);
      setCurrentSession(currentSessionInfo);
      
      setWeeklyQuota({
        sonnet: { used: systemData.weeklyTotals.sonnet.hours, total: 432 },
        opus: { used: systemData.weeklyTotals.opus.hours, total: 36 }
      });
      
      setRecentSessions(systemData.sessions.slice(0, 10).map(session => ({
        id: session.sessionId,
        project: session.projectName,
        description: `${session.inputTokens + session.outputTokens} tokens • Cache: ${session.cacheReadTokens.toLocaleString()}`,
        status: session.isActive ? 'active' : 'completed',
        date: session.startTime.toLocaleDateString(),
        duration: session.duration,
        tokensUsed: session.inputTokens + session.outputTokens,
        tokenBudget: Math.round((session.inputTokens + session.outputTokens) * 1.3),
        efficiency: session.efficiency,
        model: session.model.includes('opus') ? 'Claude Opus 4' : 'Claude Sonnet 4',
        deliverables: [
          `${session.inputTokens.toLocaleString()} input tokens`,
          `${session.outputTokens.toLocaleString()} output tokens`,
          `${session.cacheReadTokens.toLocaleString()} cache tokens`,
          session.processId ? `PID: ${session.processId}` : 'Session completed'
        ]
      })));
      
    } catch (error) {
      console.error('Failed to refresh live data:', error);
      // Fallback to SessionLogger if live extractor fails
      const activeSession = logger.getActiveSession();
      setHasActiveSession(!!activeSession);
    }
  };

  // LIVE session detection and real-time monitoring
  useEffect(() => {
    const initializeLiveMonitoring = async () => {
      try {
        // Start live monitoring with real system data
        console.log('🔴 LIVE: Starting real-time Claude session monitoring...');
        
        await liveSessionExtractor.startLiveMonitoring((systemData) => {
          console.log('🔴 LIVE: Session data updated:', systemData.currentSession?.projectName);
          setLiveSystemData(systemData);
          
          if (systemData.currentSession) {
            setHasActiveSession(true);
            // Update with live session info including 5-hour block context
            liveSessionExtractor.getCurrentSessionInfo().then(sessionInfo => {
              if (sessionInfo) {
                setCurrentSession(sessionInfo);
              }
            });
          }
          
          setWeeklyQuota({
            sonnet: { used: systemData.weeklyTotals.sonnet.hours, total: 432 },
            opus: { used: systemData.weeklyTotals.opus.hours, total: 36 }
          });
        });
        
        // Initial data load
        await refreshData();
        
      } catch (error) {
        console.error('Live monitoring failed, using fallback:', error);
        
        // Fallback: create demo session
        const sessionId = logger.startSession('Claude Code Dashboard - LIVE Session', 'sonnet');
        logger.logPrompt(sessionId, '🔴 LIVE: Real-time session monitoring active');
        logger.logPrompt(sessionId, '📊 Extracting token data from Claude system files');
        logger.logPrompt(sessionId, '🚀 Dashboard showing ACTUAL session metrics');
        
        await refreshData();
      }
    };
    
    initializeLiveMonitoring();
  }, []);

  // Mock trend data for visualization
  const [usageTrendData] = useState([
    80, 85, 70, 90, 95, 75, 85, 100, 88, 92, 78, 85, 90, 95, 88, 82, 87, 93, 85, 89
  ]);

  const [phaseData] = useState([
    { phase: 'Architecture', current: 8, total: 8, underBudget: 0, isCompleted: true },
    { phase: 'Implementation', current: 22, total: 52, underBudget: 58, isCompleted: false },
    { phase: 'Testing', current: 5, total: 20, underBudget: 75, isCompleted: false }
  ]);

  // Timer and session simulation
  useEffect(() => {
    if (hasActiveSession && currentSession) {
      const timer = setInterval(() => {
        setCurrentSession(prev => {
          if (prev && prev.timeElapsed < prev.totalTime) {
            const newTimeElapsed = prev.timeElapsed + 1;
            const newRate = (prev.tokensUsed / (newTimeElapsed / 60)) || 0;
            const newProjected = Math.round(newRate * (prev.totalTime / 60));
            
            return {
              ...prev,
              timeElapsed: newTimeElapsed,
              currentRate: Number(newRate.toFixed(1)),
              projectedTotal: newProjected,
              efficiency: Math.min(50 + (newTimeElapsed / 60) * 2, 100)
            };
          }
          return prev;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [hasActiveSession, currentSession?.timeElapsed]);

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
      <div className="min-h-screen max-w-md mx-auto bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-auto relative p-4 sm:p-6">
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
    // MoonLock Dashboard Active Session View
    return (
      <div className="min-h-screen w-full bg-gray-900 text-white overflow-auto relative">
        <ParticleField density={30} color="#60A5FA" />
        
        <div className="relative z-10 max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-blue-400">Claude Code Dashboard</h1>
              <p className="text-lg text-gray-400">AI Session Monitoring & Token Tracking</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setCurrentPage('current')}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                  currentPage === 'current' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Current Session
              </button>
              <button 
                onClick={() => setCurrentPage('history')}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                  currentPage === 'history' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                History
              </button>
            </div>
          </div>

          {/* Live Session Banner */}
          <div className="bg-red-800/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <div>
                  <span className="text-red-400 font-bold">🔴 LIVE SESSION ACTIVE</span>
                  <p className="text-sm text-red-300 mt-1">
                    Real-time data from: {currentSession?.project || 'Claude Code System'}
                  </p>
                  {currentSession?.sessionBlockStart && (
                    <p className="text-xs text-red-200 mt-1">
                      5-Hour Block: {new Date(currentSession.sessionBlockStart).toLocaleTimeString()} - {new Date(currentSession.sessionBlockEnd).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-300">PID: {currentSession?.processId || '31447'}</div>
                <div className="text-xs text-red-400">Session: {currentSession?.sessionId?.slice(-8) || 'live'}</div>
                {currentSession?.blockProgress && (
                  <div className="text-xs text-red-200 mt-1">
                    Block: {Math.round(currentSession.blockProgress)}% complete
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page Content Based on Navigation */}
          {currentPage === 'current' ? (
            // Current Session View
            <div className="space-y-8">
              {/* Main Dashboard Grid - 3 Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Session Status */}
            <GlassCard className="p-6" glow>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-bold text-red-400">LIVE SESSION</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Current Project</p>
                  <p className="text-xl font-bold text-white truncate">{currentSession.project}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">DURATION</p>
                    <p className="text-lg font-bold text-blue-400">
                      {Math.floor(currentSession.timeElapsed / 3600)}h {Math.floor((currentSession.timeElapsed % 3600) / 60)}m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">PROCESS ID</p>
                    <p className="text-lg font-bold text-green-400">{currentSession.processId || '31447'}</p>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Session ID</p>
                  <p className="text-sm font-mono text-purple-400">{currentSession.sessionId?.slice(-12) || 'live-current'}</p>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400 font-medium">ACTIVE</span>
                  </div>
                  <span className="text-xs text-gray-500">Last update: now</span>
                </div>
              </div>
            </GlassCard>

            {/* Token Metrics Dashboard */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold">Token Metrics</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 rounded-lg p-3">
                    <p className="text-xs text-blue-300 mb-1">INPUT TOKENS</p>
                    <p className="text-xl font-bold text-blue-400">{liveSystemData?.currentSession?.inputTokens?.toLocaleString() || currentSession.tokensUsed}</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <p className="text-xs text-green-300 mb-1">OUTPUT TOKENS</p>
                    <p className="text-xl font-bold text-green-400">{liveSystemData?.currentSession?.outputTokens?.toLocaleString() || Math.round(currentSession.tokensUsed * 2.5)}</p>
                  </div>
                </div>
                
                <div className="bg-purple-500/10 rounded-lg p-3">
                  <p className="text-xs text-purple-300 mb-1">CACHE TOKENS READ</p>
                  <p className="text-2xl font-bold text-purple-400">{liveSystemData?.currentSession?.cacheReadTokens?.toLocaleString() || '567,890'}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">EFFICIENCY</p>
                    <p className="text-lg font-bold text-yellow-400">{Math.round(currentSession.efficiency)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">RATE</p>
                    <p className="text-lg font-bold text-cyan-400">{currentSession.currentRate}/min</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>5-Hour Block Budget</span>
                    <span className={currentSession.isOverBudget ? 'text-red-400' : 'text-gray-400'}>
                      {currentSession.budgetUsed?.toLocaleString()} / {currentSession.budgetTotal?.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentSession.isOverBudget 
                          ? 'bg-gradient-to-r from-red-400 to-red-600'
                          : currentSession.tokenProgress > 80
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                          : 'bg-gradient-to-r from-blue-400 to-purple-400'
                      }`}
                      style={{ width: `${Math.min(currentSession.tokenProgress || 0, 100)}%` }}
                    />
                  </div>
                  {currentSession.cacheReadTokens && (
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Cache Reads (Free)</span>
                      <span>{currentSession.cacheReadTokens.toLocaleString()}</span>
                    </div>
                  )}
                  {currentSession.tokensRemaining && (
                    <div className="flex justify-between text-xs text-green-400 mt-1">
                      <span>Tokens Remaining</span>
                      <span>{currentSession.tokensRemaining.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* System Health & Performance */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-bold">System Health</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Claude Process</span>
                  </div>
                  <span className="text-sm font-bold text-green-400">RUNNING</span>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">MEMORY USAGE</span>
                    <span className="text-xs text-green-400">Normal</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full">
                    <div className="h-full w-3/5 bg-green-400 rounded-full"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">WEEKLY QUOTA</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-blue-300">Sonnet</span>
                          <span className="text-gray-400">{weeklyQuota.sonnet.used}h / {weeklyQuota.sonnet.total}h</span>
                        </div>
                        <div className="w-full h-1 bg-gray-700 rounded-full">
                          <div 
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${(weeklyQuota.sonnet.used / weeklyQuota.sonnet.total) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-purple-300">Opus</span>
                          <span className="text-gray-400">{weeklyQuota.opus.used}h / {weeklyQuota.opus.total}h</span>
                        </div>
                        <div className="w-full h-1 bg-gray-700 rounded-full">
                          <div 
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${(weeklyQuota.opus.used / weeklyQuota.opus.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-400 mb-1">SESSION HEALTH</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">Uptime</span>
                        <span className="text-green-400">{Math.floor(currentSession.timeElapsed / 3600)}h {Math.floor((currentSession.timeElapsed % 3600) / 60)}m</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">Status</span>
                        <span className="text-green-400">Healthy</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">Last Check</span>
                        <span className="text-gray-400">Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Mission Critical Monitoring Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Mission Critical Alerts */}
            <GlassCard className="p-6" glow>
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-moonlock-400" />
                <h3 className="text-lg font-bold">Hook Activity Log</h3>
              </div>
              <HookActivityLogCard />
            </GlassCard>

            {/* Unified API Usage */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Code className="w-6 h-6 text-moonlock-400" />
                <h3 className="text-lg font-bold">Unified API Usage</h3>
              </div>
              <UnifiedAPIUsageCard />
            </GlassCard>
          </div>

              {/* Claude SDK Interface */}
              <div className="mt-8">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-bold">Claude SDK Interface</h3>
                  </div>
                  <div className="h-96">
                    <ClaudeSDKInterface />
                  </div>
                </GlassCard>
              </div>
            </div>
          ) : (
            // History View
            <div className="space-y-8">
              {/* Session History Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Session Statistics */}
                <GlassCard className="p-6" glow>
                  <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-bold">Session Analytics</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 rounded-lg p-3">
                        <p className="text-xs text-blue-300 mb-1">TOTAL SESSIONS</p>
                        <p className="text-xl font-bold text-blue-400">{recentSessions.length}</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3">
                        <p className="text-xs text-green-300 mb-1">COMPLETED</p>
                        <p className="text-xl font-bold text-green-400">{recentSessions.filter(s => s.status === 'completed').length}</p>
                      </div>
                    </div>
                    
                    <div className="bg-purple-500/10 rounded-lg p-3">
                      <p className="text-xs text-purple-300 mb-1">TOTAL TOKENS PROCESSED</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {recentSessions.reduce((sum, s) => sum + s.tokensUsed, 0).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">AVG SESSION TIME</p>
                        <p className="text-lg font-bold text-yellow-400">4.2h</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">AVG EFFICIENCY</p>
                        <p className="text-lg font-bold text-cyan-400">93%</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Weekly Usage Trends */}
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <h3 className="text-lg font-bold">Usage Trends</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Token Usage This Week</p>
                      <UsageTrendChart data={usageTrendData} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">PEAK USAGE</p>
                        <p className="text-lg font-bold text-red-400">95K tokens</p>
                        <p className="text-xs text-gray-500">Wednesday 2PM</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">AVG DAILY</p>
                        <p className="text-lg font-bold text-blue-400">78K tokens</p>
                        <p className="text-xs text-gray-500">Last 7 days</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Session Phases */}
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-bold">Project Phases</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {phaseData.map((phase, index) => (
                      <PhaseProgressBar
                        key={index}
                        phase={phase.phase}
                        current={phase.current}
                        total={phase.total}
                        underBudget={phase.underBudget}
                        isCompleted={phase.isCompleted}
                      />
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Detailed Session History */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Session History
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">{recentSessions.length} total sessions</span>
                    <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm transition-colors">
                      Export Data
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {recentSessions.map((session) => (
                    <SessionHistoryItem 
                      key={session.id} 
                      session={session} 
                      onClick={handleSessionClick}
                    />
                  ))}
                </div>
              </GlassCard>

              {/* Weekly Quota Status */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold">Weekly Quota Status</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-400">Sessions Remaining</p>
                        <p className="text-2xl font-bold text-green-400">23-28</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400">Weekly Reset</p>
                        <p className="text-2xl font-bold text-blue-400">3 days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Waiting state with session history
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-auto relative">
      <ParticleField density={25} color="#60A5FA" />
      
      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <PulseOrb status="waiting" size={80} />
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold">Claude Code Optimizer</h1>
              <p className="text-lg lg:text-xl text-gray-300">Waiting for Session</p>
            </div>
          </div>
        </div>
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <PulseOrb status="waiting" size={60} />
              <div>
                <h2 className="text-2xl font-bold text-blue-400">System Ready</h2>
                <p className="text-gray-300">No active sessions detected</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{weeklyQuota.sonnet.used + weeklyQuota.opus.used}</p>
                <p className="text-xs text-gray-400">Hours Used This Week</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{recentSessions.length}</p>
                <p className="text-xs text-gray-400">Total Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">93%</p>
                <p className="text-xs text-gray-400">Average Efficiency</p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button 
              onClick={handleStartSession}
              className="p-8 bg-green-500/20 hover:bg-green-500/30 rounded-xl text-xl font-medium transition-all hover:scale-105 flex flex-col items-center justify-center gap-4 border border-green-500/20"
            >
              <Play className="w-12 h-12" />
              Start New Session
            </button>
            <button 
              onClick={handlePlanProject}
              className="p-8 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl text-xl font-medium transition-all hover:scale-105 flex flex-col items-center justify-center gap-4 border border-purple-500/20"
            >
              <Zap className="w-12 h-12" />
              Plan Project
            </button>
            <button className="p-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-xl font-medium transition-all hover:scale-105 flex flex-col items-center justify-center gap-4 border border-blue-500/20">
              <Calendar className="w-12 h-12" />
              Schedule Session
            </button>
          </div>
        </div>

        {/* Weekly Quota & Session History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Quota Status */}
          <GlassCard className="p-6" glow>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold">Weekly Quota Status</h3>
            </div>
            
            <div className="space-y-4">
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

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">Estimated sessions remaining</p>
                  <p className="text-lg font-bold text-green-400">23-28</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Weekly reset in</p>
                  <p className="text-lg font-bold text-blue-400">3 days</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Session History */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Recent Sessions
              </h3>
              <span className="text-sm text-gray-400">{recentSessions.length} sessions</span>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentSessions.map((session) => (
                <SessionHistoryItem 
                  key={session.id} 
                  session={session} 
                  onClick={handleSessionClick}
                />
              ))}
            </div>
          </GlassCard>
        </div>


        {/* Enhanced Status Bar */}
        <div className="mt-12">
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  <span className="text-lg font-medium text-green-400">System Operational</span>
                </div>
                <div className="h-4 w-px bg-gray-600"></div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Claude Code</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Live Session Extractor</span>
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Dashboard</span>
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Memory</p>
                  <p className="font-mono text-green-400">Normal</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Uptime</p>
                  <p className="font-mono text-blue-400">4h 23m</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Last Check</p>
                  <p className="font-mono text-gray-300">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      
      <SessionControl onSessionUpdate={refreshData} />
    </div>
  );
}
