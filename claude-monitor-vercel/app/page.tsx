'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, Database, Terminal, Monitor, 
  MessageSquare, Clock, TrendingUp, Zap,
  CheckCircle, AlertCircle, WifiOff
} from 'lucide-react';

// Types for our data
interface Activity {
  id: number;
  source: string;
  type: string;
  timestamp: string;
  data: any;
}

interface Stats {
  totalActivities: number;
  todayActivities: number;
  sessionCount: number;
  sources: {
    'claude-code'?: number;
    'claude-desktop'?: number;
    'system'?: number;
  };
  recentActivities: Activity[];
}

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

const PulseOrb = ({ status, size = 80 }: { status: 'connected' | 'disconnected' | 'connecting'; size?: number }) => {
  const colors = {
    connected: 'from-green-400 to-emerald-600',
    connecting: 'from-yellow-400 to-orange-600',
    disconnected: 'from-red-400 to-rose-600'
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors[status]} animate-pulse`} />
      <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${colors[status]} opacity-80`} />
      <div className="absolute inset-0 rounded-full backdrop-blur-sm bg-white/10" />
    </div>
  );
};

const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
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

const GlassCard = ({ 
  children, 
  className = '', 
  glow = false 
}: { 
  children: React.ReactNode; 
  className?: string; 
  glow?: boolean 
}) => {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/5 backdrop-blur-xl
      border border-white/10
      ${glow ? 'shadow-2xl shadow-blue-500/20' : ''}
      ${className}
    `}>
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  color, 
  progress 
}: {
  icon: any;
  label: string;
  value: number;
  unit?: string;
  color: string;
  progress?: number;
}) => {
  return (
    <GlassCard className="p-6 group hover:scale-105 transition-transform">
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${color}`} />
        <span className="text-2xl font-bold text-white">
          <AnimatedNumber value={value} suffix={unit} />
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      {progress !== undefined && (
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${color.replace('text-', 'from-')} to-transparent transition-all duration-500`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </GlassCard>
  );
};

const ActivityItem = ({ activity }: { activity: Activity }) => {
  const getIcon = () => {
    switch (activity.source) {
      case 'claude-code': return <Terminal className="w-5 h-5" />;
      case 'claude-desktop': return <Monitor className="w-5 h-5" />;
      case 'system': return <Zap className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getColor = () => {
    switch (activity.source) {
      case 'claude-code': return 'text-green-400 bg-green-400/20';
      case 'claude-desktop': return 'text-orange-400 bg-orange-400/20';
      case 'system': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatSource = (source: string) => {
    return source.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className={`p-2 rounded-lg ${getColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{formatSource(activity.source)}</span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-400">{activity.type}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
      </div>
    </div>
  );
};

export default function ClaudeMonitorDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalActivities: 0,
    todayActivities: 0,
    sessionCount: 0,
    sources: {},
    recentActivities: []
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // API URL - adjust for production
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

  // Fetch initial stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setActivities(data.recentActivities || []);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [API_URL]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'new_activity') {
          setActivities(prev => [message.activity, ...prev].slice(0, 20));
          
          // Update stats
          setStats(prev => ({
            ...prev,
            totalActivities: prev.totalActivities + 1,
            todayActivities: prev.todayActivities + 1,
            sources: {
              ...prev.sources,
              [message.activity.source]: (prev.sources[message.activity.source as keyof typeof prev.sources] || 0) + 1
            }
          }));
        } else if (message.type === 'stats') {
          setStats(message.data);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      setWsConnection(ws);
      return ws;
    };

    const ws = connectWebSocket();
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [WS_URL]);

  const getHealthStatus = () => {
    if (connectionStatus === 'disconnected') return 'Disconnected';
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (stats.todayActivities > 100) return 'Very Active';
    if (stats.todayActivities > 50) return 'Active';
    if (stats.todayActivities > 10) return 'Normal';
    return 'Idle';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-hidden relative">
      <ParticleField density={30} color="#60A5FA" />
      
      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PulseOrb status={connectionStatus} size={60} />
            <div>
              <h1 className="text-3xl font-bold">Claude Monitor</h1>
              <p className="text-sm text-gray-300">Status: {getHealthStatus()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : connectionStatus === 'connecting' ? (
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm">
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Protection Status */}
        <GlassCard className="p-4" glow>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              <span className="font-medium">Real-time Monitoring Active</span>
            </div>
            <span className="text-green-400 text-sm">✓ Monitoring</span>
          </div>
          <p className="text-sm text-gray-300">Tracking Claude Code & Claude Desktop</p>
          <p className="text-xs text-gray-400 mt-1">
            Last activity: {activities[0] ? new Date(activities[0].timestamp).toLocaleString() : 'No recent activity'}
          </p>
        </GlassCard>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={TrendingUp}
            label="Total Activities"
            value={stats.totalActivities}
            unit=""
            color="text-purple-400"
            progress={Math.min(100, (stats.totalActivities / 1000) * 100)}
          />
          <MetricCard
            icon={Clock}
            label="Today's Activities"
            value={stats.todayActivities}
            unit=""
            color="text-blue-400"
            progress={Math.min(100, (stats.todayActivities / 200) * 100)}
          />
          <MetricCard
            icon={Terminal}
            label="Claude Code"
            value={stats.sources['claude-code'] || 0}
            unit=""
            color="text-green-400"
            progress={stats.totalActivities > 0 ? ((stats.sources['claude-code'] || 0) / stats.totalActivities) * 100 : 0}
          />
          <MetricCard
            icon={Monitor}
            label="Claude Desktop"
            value={stats.sources['claude-desktop'] || 0}
            unit=""
            color="text-orange-400"
            progress={stats.totalActivities > 0 ? ((stats.sources['claude-desktop'] || 0) / stats.totalActivities) * 100 : 0}
          />
        </div>

        {/* Activity Feed and Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <GlassCard className="p-4 h-[500px] overflow-hidden">
              <h3 className="font-medium mb-4 flex items-center justify-between">
                Live Activity Feed
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </h3>
              <div className="space-y-2 overflow-y-auto h-[430px] pr-2">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activities yet</p>
                    <p className="text-sm mt-2">Activities will appear here in real-time</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* System Stats */}
          <div className="space-y-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Database className="w-6 h-6 text-blue-400" />
                <span className="text-lg font-bold">
                  <AnimatedNumber value={stats.sessionCount} />
                </span>
              </div>
              <p className="text-sm text-gray-400">Active Sessions</p>
            </GlassCard>

            <GlassCard className="p-4">
              <h4 className="font-medium mb-3">Activity Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Claude Code</span>
                  <span className="text-sm font-medium">{stats.sources['claude-code'] || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Claude Desktop</span>
                  <span className="text-sm font-medium">{stats.sources['claude-desktop'] || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">System</span>
                  <span className="text-sm font-medium">{stats.sources['system'] || 0}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-blue-500/30 bg-blue-500/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Monitor Status</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    {connectionStatus === 'connected' 
                      ? 'All systems operational'
                      : connectionStatus === 'connecting'
                      ? 'Establishing connection...'
                      : 'Connection lost. Retrying...'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
