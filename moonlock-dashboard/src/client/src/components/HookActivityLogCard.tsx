/**
 * Hook Activity Log Card
 * 
 * Displays real-time Claude Code hook activities including:
 * - Rule2hook generated hooks
 * - Manual hook creation and execution
 * - Hook performance metrics and statistics
 * - Live WebSocket updates for hook events
 */

import React, { useMemo } from 'react';
import { useHookActivity, HookLogEntry } from '../hooks/useHookActivity';

export const HookActivityLogCard: React.FC = () => {
  const {
    data,
    logs,
    loading,
    error,
    totalHooks,
    activeHooks,
    recentExecutions,
    successRate,
    averageExecutionTime,
    categories,
    sources,
    hasHooks,
    hasRecentActivity,
    isHealthy,
    connectionStatus,
    lastUpdate,
    formatEventTime,
    formatDuration,
    getLogsByEvent,
    getLogsBySource,
    getLogsByStatus,
    retry
  } = useHookActivity();

  const activityStats = useMemo(() => {
    if (!data) return null;

    const createdHooks = getLogsByEvent('created');
    const executedHooks = getLogsByEvent('executed');
    const rule2hookHooks = getLogsBySource('rule2hook');
    const successfulExecutions = getLogsByStatus('success');
    const failedExecutions = getLogsByStatus('failure');
    
    // Get most recent activity
    const mostRecentActivity = logs[0];

    return {
      mostRecentActivity,
      createdHooks,
      executedHooks,
      rule2hookHooks,
      successfulExecutions,
      failedExecutions,
      totalActivity: logs.length
    };
  }, [data, logs, getLogsByEvent, getLogsBySource, getLogsByStatus]);

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-moonlock-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-dark-400 text-sm">Loading hook activity...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-xl">🪝</span>
          </div>
          <div className="space-y-2">
            <p className="text-red-400 font-medium">Hook Activity Unavailable</p>
            <p className="text-dark-400 text-sm">{error}</p>
            <button
              onClick={retry}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getEventIcon = (event: HookLogEntry['event']) => {
    switch (event) {
      case 'created': return '✨';
      case 'executed': return '⚡';
      case 'modified': return '🔧';
      case 'disabled': return '🚫';
      case 'enabled': return '✅';
      default: return '📝';
    }
  };

  const getStatusColor = (status: HookLogEntry['status']) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failure': return 'text-red-400';
      case 'blocked': return 'text-yellow-400';
      case 'pending': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status: HookLogEntry['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500/20 border-green-500/30';
      case 'failure': return 'bg-red-500/20 border-red-500/30';
      case 'blocked': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'pending': return 'bg-blue-500/20 border-blue-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getSourceIcon = (source: HookLogEntry['source']) => {
    switch (source) {
      case 'rule2hook': return '🤖';
      case 'manual': return '👤';
      case 'system': return '⚙️';
      case 'claude-code': return '🧠';
      default: return '📋';
    }
  };

  const getSourceColor = (source: HookLogEntry['source']) => {
    switch (source) {
      case 'rule2hook': return 'text-purple-400';
      case 'manual': return 'text-blue-400';
      case 'system': return 'text-yellow-400';
      case 'claude-code': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Status */}
      <div className={`rounded-lg p-4 border ${isHealthy ? 'bg-moonlock-500/20 border-moonlock-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full animate-pulse"
                 style={{
                   backgroundColor: isHealthy ? '#8b5cf6' : '#ef4444'
                 }}>
            </div>
            <div>
              <h3 className={`font-semibold ${isHealthy ? 'text-moonlock-400' : 'text-red-400'}`}>
                Hook Activity: {isHealthy ? 'Active' : 'Error'}
              </h3>
              <p className="text-dark-400 text-sm">
                {hasRecentActivity ? `${logs.length} recent activities` : 'No recent activity'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1 text-sm">
              <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
                {connectionStatus === 'connected' ? '🟢' : '🔴'}
              </span>
              <span className="text-dark-400">
                {connectionStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hook Statistics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Hooks"
          count={totalHooks}
          className="text-purple-400 bg-purple-500/10 border border-purple-500/20"
          icon="🪝"
        />
        <StatCard
          label="Active"
          count={activeHooks}
          className="text-green-400 bg-green-500/10 border border-green-500/20"
          icon="✅"
        />
        <StatCard
          label="Executions"
          count={recentExecutions}
          className="text-blue-400 bg-blue-500/10 border border-blue-500/20"
          icon="⚡"
        />
      </div>

      {/* Most Recent Activity */}
      {activityStats?.mostRecentActivity && (
        <div className="space-y-2">
          <h4 className="text-sm text-dark-400 uppercase tracking-wide">Most Recent</h4>
          <div className={`rounded-lg p-3 border ${getStatusBgColor(activityStats.mostRecentActivity.status)}`}>
            <div className="flex items-start space-x-3">
              <div className="flex items-center space-x-2">
                <span>{getEventIcon(activityStats.mostRecentActivity.event)}</span>
                <span>{getSourceIcon(activityStats.mostRecentActivity.source)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${getStatusColor(activityStats.mostRecentActivity.status)}`}>
                  {activityStats.mostRecentActivity.hookName} - {activityStats.mostRecentActivity.event}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${getSourceColor(activityStats.mostRecentActivity.source)}`}>
                    {activityStats.mostRecentActivity.source}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-dark-400">
                    {activityStats.mostRecentActivity.duration && (
                      <span>{formatDuration(activityStats.mostRecentActivity.duration)}</span>
                    )}
                    <span>{formatEventTime(activityStats.mostRecentActivity.timestamp)}</span>
                  </div>
                </div>
                {activityStats.mostRecentActivity.command && (
                  <div className="mt-2 text-xs text-dark-500 font-mono bg-dark-800 rounded px-2 py-1">
                    {activityStats.mostRecentActivity.command}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {hasRecentActivity ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-dark-400 uppercase tracking-wide">Recent Activity</h4>
            <span className="text-xs text-dark-500">
              {logs.length} activities
            </span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {logs.slice(0, 10).map((log) => (
              <ActivityItem
                key={log.id}
                log={log}
                formatTime={formatEventTime}
                formatDuration={formatDuration}
                getStatusColor={getStatusColor}
                getSourceColor={getSourceColor}
                getEventIcon={getEventIcon}
                getSourceIcon={getSourceIcon}
              />
            ))}
          </div>
          
          {logs.length > 10 && (
            <p className="text-center text-dark-500 text-xs">
              +{logs.length - 10} more activities
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-moonlock-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-moonlock-400 text-2xl">🪝</span>
          </div>
          <p className="text-moonlock-400 font-medium">No Hook Activity Yet</p>
          <p className="text-dark-400 text-sm mt-1">
            {hasHooks ? 'Hooks are ready but no recent activity' : 'Create hooks with /project:rule2hook to get started'}
          </p>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Success Rate</span>
            <span className={successRate >= 90 ? 'text-green-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}>
              {successRate.toFixed(0)}%
            </span>
          </div>
          <div className="h-1 bg-dark-700 rounded overflow-hidden">
            <div 
              className={`h-full ${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${successRate}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Avg Duration</span>
            <span className="text-blue-400">{formatDuration(averageExecutionTime)}</span>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Rule2Hook</span>
            <span className="text-purple-400">{sources.rule2hook || 0}</span>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Manual</span>
            <span className="text-blue-400">{sources.manual || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  count: number;
  className: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, count, className, icon }) => {
  return (
    <div className={`rounded-lg p-3 ${className}`}>
      <div className="text-center">
        <div className="text-lg mb-1">{icon}</div>
        <p className="text-2xl font-mono font-bold">{count}</p>
        <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      </div>
    </div>
  );
};

interface ActivityItemProps {
  log: HookLogEntry;
  formatTime: (timestamp: number) => string;
  formatDuration: (duration?: number) => string;
  getStatusColor: (status: HookLogEntry['status']) => string;
  getSourceColor: (source: HookLogEntry['source']) => string;
  getEventIcon: (event: HookLogEntry['event']) => string;
  getSourceIcon: (source: HookLogEntry['source']) => string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  log,
  formatTime,
  formatDuration,
  getStatusColor,
  getSourceColor,
  getEventIcon,
  getSourceIcon
}) => {
  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-1">
          <span className="text-sm">{getEventIcon(log.event)}</span>
          <span className="text-xs">{getSourceIcon(log.source)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${getStatusColor(log.status)}`}>
            {log.hookName} - {log.event}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${getSourceColor(log.source)}`}>
              {log.source}
            </span>
            <div className="flex items-center space-x-2 text-xs text-dark-400">
              {log.duration && <span>{formatDuration(log.duration)}</span>}
              <span>{formatTime(log.timestamp)}</span>
            </div>
          </div>
          {log.command && (
            <div className="mt-1 text-xs text-dark-500 font-mono bg-dark-900 rounded px-2 py-1 truncate">
              {log.command}
            </div>
          )}
          {log.error && (
            <div className="mt-1 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
              {log.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};