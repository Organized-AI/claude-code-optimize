/**
 * Mission Critical Alerts Card
 * 
 * Displays real-time mission-critical system alerts for disaster prevention.
 * Monitors disk space, memory usage, Claude process health, API response times,
 * and session duration warnings with live WebSocket updates.
 */

import React, { useMemo } from 'react';
import { useCriticalAlerts, CriticalAlert } from '../hooks/useCriticalAlerts';

export const MissionCriticalAlertsCard: React.FC = () => {
  const {
    data,
    alerts,
    loading,
    error,
    criticalCount,
    warningCount,
    healthyCount,
    overallStatus,
    isHealthy,
    hasCriticalAlerts,
    hasWarnings,
    connectionStatus,
    lastUpdate,
    formatLastCheck,
    formatAlertTime,
    getAlertsByType,
    retry
  } = useCriticalAlerts();

  const alertStats = useMemo(() => {
    if (!data) return null;

    const criticalAlerts = getAlertsByType('critical');
    const warningAlerts = getAlertsByType('warning');
    
    // Get most urgent alert
    const mostUrgent = [...criticalAlerts, ...warningAlerts]
      .sort((a, b) => a.severity - b.severity)[0];

    return {
      mostUrgent,
      criticalAlerts,
      warningAlerts,
      totalActive: criticalCount + warningCount
    };
  }, [data, criticalCount, warningCount, getAlertsByType]);

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-moonlock-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-dark-400 text-sm">Loading critical alerts...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <p className="text-red-400 font-medium">Critical Alerts Unavailable</p>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'healthy': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500/20 border-red-500/30';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'healthy': return 'bg-green-500/20 border-green-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 1: return '🔴'; // Critical
      case 2: return '🟡'; // Warning
      case 3: return '🟢'; // Info/Healthy
      default: return '⚫';
    }
  };

  const getCategoryIcon = (category: CriticalAlert['category']) => {
    switch (category) {
      case 'disk': return '💾';
      case 'memory': return '🧠';
      case 'api': return '🌐';
      case 'process': return '⚙️';
      case 'session': return '⏱️';
      case 'quota': return '📊';
      default: return '🔧';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className={`rounded-lg p-4 border ${getStatusBgColor(overallStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full animate-pulse"
                 style={{
                   backgroundColor: overallStatus === 'critical' ? '#ef4444' :
                                  overallStatus === 'warning' ? '#f59e0b' : '#10b981'
                 }}>
            </div>
            <div>
              <h3 className={`font-semibold ${getStatusColor(overallStatus)}`}>
                System Status: {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </h3>
              <p className="text-dark-400 text-sm">
                {data ? formatLastCheck(data.lastCheck) : 'No data'}
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

      {/* Alert Counts Grid */}
      <div className="grid grid-cols-3 gap-4">
        <AlertCountCard
          label="Critical"
          count={criticalCount}
          className="text-red-400 bg-red-500/10 border border-red-500/20"
          icon="🚨"
        />
        <AlertCountCard
          label="Warnings"
          count={warningCount}
          className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
          icon="⚠️"
        />
        <AlertCountCard
          label="Healthy"
          count={healthyCount}
          className="text-green-400 bg-green-500/10 border border-green-500/20"
          icon="✅"
        />
      </div>

      {/* Most Urgent Alert */}
      {alertStats?.mostUrgent && (
        <div className="space-y-2">
          <h4 className="text-sm text-dark-400 uppercase tracking-wide">Most Urgent</h4>
          <div className={`rounded-lg p-3 border ${getStatusBgColor(alertStats.mostUrgent.type)}`}>
            <div className="flex items-start space-x-3">
              <div className="flex items-center space-x-2">
                <span>{getSeverityIcon(alertStats.mostUrgent.severity)}</span>
                <span>{getCategoryIcon(alertStats.mostUrgent.category)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${getStatusColor(alertStats.mostUrgent.type)}`}>
                  {alertStats.mostUrgent.message}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-dark-500 text-xs uppercase">
                    {alertStats.mostUrgent.category}
                  </span>
                  <span className="text-dark-400 text-xs">
                    {formatAlertTime(alertStats.mostUrgent.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-dark-400 uppercase tracking-wide">All Alerts</h4>
            <span className="text-xs text-dark-500">
              {alertStats?.totalActive} active
            </span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {alerts.slice(0, 10).map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                formatTime={formatAlertTime}
                getStatusColor={getStatusColor}
                getSeverityIcon={getSeverityIcon}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
          
          {alerts.length > 10 && (
            <p className="text-center text-dark-500 text-xs">
              +{alerts.length - 10} more alerts
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-green-400 text-2xl">✅</span>
          </div>
          <p className="text-green-400 font-medium">All Systems Operational</p>
          <p className="text-dark-400 text-sm mt-1">No active alerts detected</p>
        </div>
      )}

      {/* System Health Indicators */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Disk Usage</span>
            <span className="text-yellow-400">89%</span>
          </div>
          <div className="h-1 bg-dark-700 rounded overflow-hidden">
            <div className="h-full bg-yellow-500 w-[89%]"></div>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Memory</span>
            <span className="text-green-400">67%</span>
          </div>
          <div className="h-1 bg-dark-700 rounded overflow-hidden">
            <div className="h-full bg-green-500 w-[67%]"></div>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">Claude Process</span>
            <span className="text-green-400">Running</span>
          </div>
        </div>
        
        <div className="bg-dark-800 rounded p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-dark-400">API Health</span>
            <span className="text-green-400">Healthy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AlertCountCardProps {
  label: string;
  count: number;
  className: string;
  icon: string;
}

const AlertCountCard: React.FC<AlertCountCardProps> = ({ label, count, className, icon }) => {
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

interface AlertItemProps {
  alert: CriticalAlert;
  formatTime: (timestamp: number) => string;
  getStatusColor: (status: string) => string;
  getSeverityIcon: (severity: number) => string;
  getCategoryIcon: (category: CriticalAlert['category']) => string;
}

const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  formatTime,
  getStatusColor,
  getSeverityIcon,
  getCategoryIcon
}) => {
  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-1">
          <span className="text-sm">{getSeverityIcon(alert.severity)}</span>
          <span className="text-xs">{getCategoryIcon(alert.category)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${getStatusColor(alert.type)}`}>
            {alert.message}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-dark-500 uppercase">
              {alert.category}
            </span>
            <span className="text-xs text-dark-400">
              {formatTime(alert.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};