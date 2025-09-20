import React, { useState } from 'react';
import { SessionTimer } from './SessionTimer';
import { TokenMetrics } from './TokenMetrics';
import { PhaseProgress } from './PhaseProgress';
import { AlertPanel } from './AlertPanel';
import { SessionControls } from './SessionControls';
import { TokenChart } from './TokenChart';
import { SessionHistory } from './SessionHistory';
import { DashboardErrorBoundary } from './ErrorBoundary';
import { useDataController } from '../hooks/useDataController';
import { PredictiveAnalytics } from './PredictiveAnalytics';
import { SessionTemplates } from './SessionTemplates';
import { CalendarIntegration } from './CalendarIntegration';
import { BurnRateMonitor } from './BurnRateMonitor';
import { NotificationsPanel } from './NotificationsPanel';
import { HooksNotificationIntegration } from './HooksNotificationIntegration';

export const Dashboard: React.FC = () => {
  const { session, isLoading } = useDataController();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 moonlock-gradient rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold moonlock-text-gradient">
              Moonlock Dashboard
            </h1>
            <p className="text-dark-400 text-sm">
              AI Session Monitoring & Token Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              activeTab === 'current'
                ? 'bg-moonlock-600 text-white'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              activeTab === 'history'
                ? 'bg-moonlock-600 text-white'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
            }`}
          >
            History
          </button>
        </div>
      </header>

      {activeTab === 'current' ? (
        <DashboardErrorBoundary>
          <CurrentSessionView />
        </DashboardErrorBoundary>
      ) : (
        <DashboardErrorBoundary>
          <SessionHistory />
        </DashboardErrorBoundary>
      )}
    </div>
  );
};

const CurrentSessionView: React.FC = () => {
  const { session, isLoading, ui, connection, state } = useDataController();

  // Show disconnected state clearly
  if (connection.status === 'disconnected' || connection.status === 'error') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-red-300">
            Dashboard Disconnected
          </h3>
          <p className="text-dark-400 max-w-md">
            {connection.status === 'error' 
              ? 'Connection error. The dashboard will automatically reconnect when the service is available.'
              : 'Lost connection to the monitoring service. Attempting to reconnect...'}
          </p>
          <div className="mt-6 p-4 bg-dark-800 rounded-lg border border-dark-700">
            <h4 className="font-medium text-dark-300 mb-2">Connection Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-dark-500">Status:</span>
                <span className="text-red-400 font-mono">{connection.status.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-500">Quality:</span>
                <span className="text-dark-400 font-mono">{connection.quality}</span>
              </div>
              {connection.lastUpdate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-dark-500">Last Update:</span>
                  <span className="text-dark-400 font-mono">
                    {new Date(connection.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="animate-pulse text-dark-500 text-sm">
            Reconnecting...
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 moonlock-gradient rounded-full flex items-center justify-center mx-auto animate-pulse-slow">
            <span className="text-white text-2xl">🔍</span>
          </div>
          <h3 className="text-xl font-semibold text-dark-200">
            Detecting Claude Code Session...
          </h3>
          <p className="text-dark-400 max-w-md">
            Scanning for active Claude Code sessions and initializing monitoring.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto border-2 border-dark-600">
            <span className="text-dark-400 text-2xl">💤</span>
          </div>
          <h3 className="text-xl font-semibold text-dark-200">
            No Claude Code Session Detected
          </h3>
          <p className="text-dark-400 max-w-md">
            The Moonlock Dashboard automatically detects active Claude Code sessions. 
            Start Claude Code with a project to begin monitoring.
          </p>
          <div className="mt-6 p-4 bg-dark-800 rounded-lg border border-dark-700">
            <h4 className="font-medium text-dark-300 mb-2">Auto-Detection Active</h4>
            <p className="text-sm text-dark-500">
              Monitoring for:
            </p>
            <ul className="text-sm text-dark-400 mt-2 space-y-1">
              <li>• Claude Code session files</li>
              <li>• Active project tracking</li>
              <li>• Token usage patterns</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Session Status with Connection Indicator */}
      <div className={`border rounded-lg p-4 ${
        connection.status === 'connected' 
          ? 'bg-green-500/10 border-green-500/20' 
          : 'bg-yellow-500/10 border-yellow-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full animate-pulse-slow ${
              connection.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <div>
              <h3 className={`font-semibold ${
                connection.status === 'connected' ? 'text-green-300' : 'text-yellow-300'
              }`}>
                Claude Code Session {connection.status === 'connected' ? 'Active' : 'Connecting'}
              </h3>
              <p className={`text-sm ${
                connection.status === 'connected' ? 'text-green-400/80' : 'text-yellow-400/80'
              }`}>
                Automatically tracking: {session.name || `Session ${session.id.slice(0, 8)}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-dark-400">Connection</div>
            <div className={`text-xs font-mono ${
              connection.quality === 'excellent' ? 'text-green-400' :
              connection.quality === 'good' ? 'text-yellow-400' :
              connection.quality === 'poor' ? 'text-orange-400' :
              'text-red-400'
            }`}>
              {connection.quality.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Live Claude Code Session Status */}
      {state.claudeCode?.liveStatus.hasActiveSession && (
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <div>
                <h3 className="font-semibold text-red-300 flex items-center">
                  🔴 LIVE SESSION ACTIVE
                  {state.claudeCode.isRealTimeActive && (
                    <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                      REAL-TIME
                    </span>
                  )}
                </h3>
                <p className="text-red-400/80 text-sm">
                  Session: {state.claudeCode.liveStatus.activeSessionId?.slice(-8) || 'Unknown'}
                  {state.claudeCode.liveStatus.lastActivity && (
                    <span className="ml-2">
                      • Last activity: {Math.round((Date.now() - state.claudeCode.liveStatus.lastActivity) / 1000)}s ago
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-red-400/60">Live Token Rate</div>
              <div className="text-lg font-mono font-bold text-red-300">
                {Math.round(state.claudeCode.precisionMetrics.ratePerMin)}/min
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Panel */}
      <AlertPanel />

      {/* Live Hooks Notifications Panel */}
      <DashboardErrorBoundary>
        <HooksNotificationIntegration />
      </DashboardErrorBoundary>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Section */}
        <div className="lg:col-span-1">
          <div className="metric-card h-full flex flex-col">
            <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
              <div className="w-2 h-2 bg-moonlock-500 rounded-full mr-3 animate-pulse-slow" />
              Session Timer
            </h3>
            <div className="flex-1 flex items-center justify-center">
              <SessionTimer />
            </div>
          </div>
        </div>

        {/* Token Metrics */}
        <div className="lg:col-span-2">
          <div className="metric-card h-full">
            <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3" />
              Token Usage
            </h3>
            <TokenMetrics />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase Progress */}
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
            Phase Progress
          </h3>
          <PhaseProgress />
        </div>

        {/* Token Chart */}
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
            Usage Trend
          </h3>
          <TokenChart />
        </div>
      </div>

      {/* Enhancement Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Predictive Analytics */}
        <DashboardErrorBoundary>
          <PredictiveAnalytics />
        </DashboardErrorBoundary>

        {/* Session Templates */}
        <DashboardErrorBoundary>
          <SessionTemplates />
        </DashboardErrorBoundary>

        {/* Calendar Integration */}
        <DashboardErrorBoundary>
          <CalendarIntegration />
        </DashboardErrorBoundary>

        {/* Burn Rate Monitor */}
        <DashboardErrorBoundary>
          <BurnRateMonitor />
        </DashboardErrorBoundary>
      </div>

      {/* Session Details */}
      <div className="metric-card">
        <h3 className="text-lg font-semibold text-dark-200 mb-4">
          Session Details
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-dark-400">Session ID</span>
            <p className="font-mono text-moonlock-400 truncate">
              {session.id}
            </p>
          </div>
          <div>
            <span className="text-dark-400">Started</span>
            <p className="text-dark-200">
              {new Date(session.startTime).toLocaleTimeString()}
            </p>
          </div>
          <div>
            <span className="text-dark-400">Duration</span>
            <p className="text-dark-200">
              {Math.round(session.duration / 1000 / 60)} minutes
            </p>
          </div>
          <div>
            <span className="text-dark-400">Status</span>
            <p className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium status-${session.status}`}>
              {session.status.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 skeleton" />
          <div className="space-y-2">
            <div className="w-48 h-6 skeleton" />
            <div className="w-32 h-4 skeleton" />
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="w-24 h-8 skeleton" />
          <div className="w-20 h-8 skeleton" />
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-48 skeleton" />
        <div className="lg:col-span-2 h-48 skeleton" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 skeleton" />
        <div className="h-64 skeleton" />
      </div>
    </div>
  );
};