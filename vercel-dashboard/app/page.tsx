'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, Shield, HardDrive, Cpu, Wifi, Activity, 
  Terminal, Monitor, Clock, BarChart, TrendingUp, Zap
} from 'lucide-react';

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
    idle: 'from-yellow-400 to-orange-600',
    offline: 'from-gray-400 to-gray-600'
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

const GlassCard = ({ children, className = '', glow = false }) => {
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

const MetricCard = ({ icon: Icon, label, value, unit, color, progress }) => {
  return (
    <GlassCard className="p-6 group hover:scale-105 transition-transform">
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${color}`} />
        <span className="text-2xl font-bold text-white">
          <AnimatedNumber value={value} suffix={unit} />
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${color.replace('text-', 'from-')} to-transparent transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </GlassCard>
  );
};

const ActivityItem = ({ source, type, timestamp, data }) => {
  const icons = {
    'claude-code': '📝',
    'claude-desktop': '🖥️',
    'system': '⚙️'
  };

  const colors = {
    'claude-code': 'text-green-400',
    'claude-desktop': 'text-orange-400',
    'system': 'text-blue-400'
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icons[source] || '📊'}</span>
        <div>
          <span className={`text-sm font-medium ${colors[source] || 'text-gray-300'}`}>
            {source.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
          <p className="text-xs text-gray-400">{type}</p>
        </div>
      </div>
      <span className="text-xs text-gray-400">{formatTime(timestamp)}</span>
    </div>
  );
};

export default function ClaudeMonitorDashboard() {
  const [systemStatus, setSystemStatus] = useState('active');
  const [stats, setStats] = useState({
    totalActivities: 0,
    todayActivities: 0,
    claudeCodeCount: 0,
    claudeDesktopCount: 0,
    recentActivities: []
  });
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch initial stats
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    connectWebSocket();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      
      // Determine system status based on activity
      if (data.todayActivities > 0) {
        setSystemStatus('active');
      } else {
        setSystemStatus('idle');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setSystemStatus('offline');
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');
    
    ws.onopen = () => {
      setWsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_activity') {
        // Update stats with new activity
        setStats(prev => ({
          ...prev,
          totalActivities: prev.totalActivities + 1,
          todayActivities: prev.todayActivities + 1,
          recentActivities: [message.activity, ...prev.recentActivities.slice(0, 4)]
        }));
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 text-white overflow-hidden relative">
      <ParticleField density={30} color="#60A5FA" />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <PulseOrb status={systemStatus} size={80} />
            <div>
              <h1 className="text-3xl font-bold">Claude Monitor</h1>
              <p className="text-sm text-gray-300">
                Status: {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              <AnimatedNumber value={stats.totalActivities} />
            </p>
            <p className="text-sm text-gray-400">Total Activities</p>
          </div>
        </div>

        {/* Protection Status */}
        <GlassCard className="p-4" glow>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="font-medium">Claude Activity Monitor</span>
            </div>
            <span className="text-green-400 text-sm">✓ Active</span>
          </div>
          <p className="text-sm text-gray-300">Real-time monitoring enabled</p>
          <p className="text-xs text-gray-400 mt-1">
            Today's activities: {stats.todayActivities}
          </p>
        </GlassCard>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Terminal}
            label="Claude Code"
            value={stats.claudeCodeCount}
            unit=""
            color="text-green-400"
            progress={(stats.claudeCodeCount / Math.max(stats.totalActivities, 1)) * 100}
          />
          <MetricCard
            icon={Monitor}
            label="Claude Desktop"
            value={stats.claudeDesktopCount}
            unit=""
            color="text-orange-400"
            progress={(stats.claudeDesktopCount / Math.max(stats.totalActivities, 1)) * 100}
          />
          <MetricCard
            icon={Activity}
            label="Today's Activity"
            value={stats.todayActivities}
            unit=""
            color="text-blue-400"
            progress={Math.min((stats.todayActivities / 100) * 100, 100)}
          />
          <MetricCard
            icon={TrendingUp}
            label="Activity Rate"
            value={Math.round((stats.todayActivities / 24) * 10) / 10}
            unit="/hr"
            color="text-purple-400"
            progress={Math.min((stats.todayActivities / 24 / 10) * 100, 100)}
          />
        </div>

        {/* Live Activity Feed and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <GlassCard className="p-6">
            <h3 className="font-medium mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Live Activity Feed
              </span>
              <span className="text-xs text-gray-400">Real-time</span>
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activities</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Session Stats */}
          <GlassCard className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-blue-400" />
              Session Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-300">Active Sessions</span>
                <span className="font-bold">
                  {stats.recentActivities.filter(a => 
                    new Date(a.timestamp) > new Date(Date.now() - 3600000)
                  ).length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-300">Messages/Hour</span>
                <span className="font-bold">
                  {Math.round((stats.todayActivities / new Date().getHours()) * 10) / 10}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-300">Most Active</span>
                <span className="font-bold text-green-400">
                  {stats.claudeCodeCount > stats.claudeDesktopCount ? 'Claude Code' : 'Claude Desktop'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-300">Uptime</span>
                <span className="font-bold text-green-400">
                  {wsConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* System Health */}
        <GlassCard className="p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Monitoring Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold mb-1">
                {wsConnected ? '✅' : '❌'}
              </p>
              <p className="text-sm text-gray-400">WebSocket</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold mb-1">
                {stats.totalActivities > 0 ? '✅' : '⏳'}
              </p>
              <p className="text-sm text-gray-400">Database</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold mb-1">
                {systemStatus === 'active' ? '✅' : systemStatus === 'idle' ? '💤' : '❌'}
              </p>
              <p className="text-sm text-gray-400">Monitor</p>
            </div>
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
