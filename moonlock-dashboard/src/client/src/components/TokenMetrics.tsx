import React, { useMemo } from 'react';
import { useDataController } from '../hooks/useDataController';
import { useMultiAppMetrics } from '../hooks/useMultiAppMetrics';

export const TokenMetrics: React.FC = () => {
  const { session, tokenUsage } = useDataController();
  const { metrics: multiAppMetrics, isLoading: multiAppLoading, error: multiAppError } = useMultiAppMetrics();

  const metrics = useMemo(() => {
    if (!session) {
      return {
        usagePercentage: 0,
        projectedPercentage: 0,
        rateDisplay: '0.0',
        efficiencyScore: 0,
        timeToLimit: null,
      };
    }

    const budget = session.tokenBudget || 0;
    const used = tokenUsage.used || 0;
    const projected = tokenUsage.projected || 0;
    const usagePercentage = budget > 0 ? (used / budget) * 100 : 0;
    const projectedPercentage = budget > 0 ? (projected / budget) * 100 : 0;
    
    // Estimate current rate based on session duration and tokens used
    const elapsedMinutes = (Date.now() - session.startTime) / (1000 * 60);
    const currentRate = elapsedMinutes > 0 ? used / elapsedMinutes : 0;
    const rateDisplay = currentRate < 10 ? currentRate.toFixed(1) : Math.round(currentRate).toString();
    
    // Calculate efficiency score (simplified)
    const efficiencyScore = budget > 0 ? Math.max(0, Math.min(100, 100 - usagePercentage)) : 50;

    // Calculate time to token limit
    let timeToLimit = null;
    if (budget > 0 && currentRate > 0) {
      const remaining = budget - used;
      if (remaining > 0) {
        timeToLimit = remaining / currentRate; // minutes
      }
    }

    return {
      usagePercentage,
      projectedPercentage,
      rateDisplay,
      efficiencyScore,
      timeToLimit,
      currentRate,
    };
  }, [session, tokenUsage]);

  // Improved loading state handling - show session data even if multi-app is loading
  if (!session && !tokenUsage.used) {
    return (
      <div className="text-center text-dark-400 py-8">
        <p>Loading session data...</p>
      </div>
    );
  }

  const isOverBudget = session.tokenBudget && tokenUsage.used > session.tokenBudget;
  const isNearLimit = session.tokenBudget && metrics.usagePercentage > 80;

  return (
    <div className="space-y-6">
      {/* Multi-App Overview - Show only if loaded successfully */}
      {multiAppMetrics && !multiAppError && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white">Multi-App Usage</h3>
            <div className="flex gap-2">
              {multiAppMetrics.overview.activeApplications.map(app => (
                <span key={app} className="px-2 py-1 text-xs bg-moonlock-600 text-moonlock-100 rounded">
                  {app === 'claude-code' ? 'Claude Code' : 'Claude Desktop'}
                </span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Sessions"
              value={multiAppMetrics.overview.totalSessions.toString()}
              className="text-moonlock-400"
              subtitle="All Apps"
            />
            <MetricCard
              label="Combined Tokens"
              value={multiAppMetrics.overview.totalEstimatedTokens.toLocaleString()}
              className="text-blue-400"
              subtitle="Estimated"
            />
            <MetricCard
              label="Daily Usage"
              value={multiAppMetrics.overview.combinedDailyUsage.toLocaleString()}
              className="text-green-400"
              subtitle="Today"
            />
            <MetricCard
              label="Most Used"
              value={multiAppMetrics.insights.mostUsedApp === 'claude-code' ? 'Code' : 'Desktop'}
              className="text-purple-400"
              subtitle="Primary App"
            />
          </div>
          
          {/* App Breakdown */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {/* Claude Code */}
            <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">Claude Code</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  multiAppMetrics.breakdown.claudeCode.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {multiAppMetrics.breakdown.claudeCode.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-dark-400">Sessions</p>
                  <p className="font-mono text-white">{multiAppMetrics.breakdown.claudeCode.sessions}</p>
                </div>
                <div>
                  <p className="text-dark-400">Tokens</p>
                  <p className="font-mono text-blue-400">{multiAppMetrics.breakdown.claudeCode.totalTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-dark-400">Daily Usage</p>
                  <p className="font-mono text-green-400">{multiAppMetrics.breakdown.claudeCode.dailyUsage.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-dark-400">Avg Duration</p>
                  <p className="font-mono text-yellow-400">{Math.round(multiAppMetrics.breakdown.claudeCode.averageSessionDuration / 60000)}m</p>
                </div>
              </div>
            </div>
            
            {/* Claude Desktop */}
            <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">Claude Desktop</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  multiAppMetrics.breakdown.claudeDesktop.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {multiAppMetrics.breakdown.claudeDesktop.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-dark-400">Sessions</p>
                  <p className="font-mono text-white">{multiAppMetrics.breakdown.claudeDesktop.sessions}</p>
                </div>
                <div>
                  <p className="text-dark-400">Est. Tokens</p>
                  <p className="font-mono text-blue-400">{multiAppMetrics.breakdown.claudeDesktop.estimatedTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-dark-400">Daily Usage</p>
                  <p className="font-mono text-green-400">{multiAppMetrics.breakdown.claudeDesktop.dailyUsage.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-dark-400">Version</p>
                  <p className="font-mono text-purple-400 text-xs">{multiAppMetrics.breakdown.claudeDesktop.version}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Session Details */}
      {session && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Current Session (Claude Code)</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Tokens Used"
              value={tokenUsage.used.toLocaleString()}
              className={isOverBudget ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-moonlock-400'}
            />
            <MetricCard
              label="Current Rate"
              value={`${metrics.rateDisplay}/min`}
              className="text-green-400"
            />
            <MetricCard
              label="Projected Total"
              value={tokenUsage.projected.toLocaleString()}
              className={metrics.projectedPercentage > 100 ? 'text-yellow-400' : 'text-blue-400'}
              subtitle="Estimated"
            />
            <MetricCard
              label="Efficiency"
              value={`${Math.round(metrics.efficiencyScore)}%`}
              className={
                metrics.efficiencyScore > 70 ? 'text-green-400' :
                metrics.efficiencyScore > 40 ? 'text-yellow-400' : 'text-red-400'
              }
            />
          </div>
          
          {/* Budget Progress */}
          {session.tokenBudget && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Budget Usage</span>
                <span className={`font-mono ${
                  isOverBudget ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-dark-300'
                }`}>
                  {tokenUsage.used.toLocaleString()} / {session.tokenBudget.toLocaleString()}
                </span>
              </div>
              
              <div className="progress-bar h-3">
                <div 
                  className={`progress-fill ${
                    isOverBudget 
                      ? 'bg-red-500' 
                      : isNearLimit 
                        ? 'bg-yellow-500' 
                        : 'bg-moonlock-500'
                  }`}
                  style={{ width: `${Math.min(100, metrics.usagePercentage)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-dark-500">
                <span>0</span>
                <span className="font-mono">
                  {metrics.usagePercentage.toFixed(1)}%
                </span>
                <span>{session.tokenBudget.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Projected Usage */}
          {tokenUsage.projected > tokenUsage.used && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Projected Usage</span>
                <span className={`font-mono ${
                  metrics.projectedPercentage > 100 ? 'text-yellow-400' : 'text-dark-300'
                }`}>
                  {tokenUsage.projected.toLocaleString()}
                  {session.tokenBudget && ` (${metrics.projectedPercentage.toFixed(1)}%)`}
                </span>
              </div>
              
              {session.tokenBudget && (
                <div className="progress-bar h-2">
                  <div 
                    className={`progress-fill ${
                      metrics.projectedPercentage > 100 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, metrics.projectedPercentage)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Time Estimates */}
          {metrics.timeToLimit && metrics.timeToLimit > 0 && (
            <div className="bg-dark-800 rounded-lg p-3 border border-dark-700 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Time to Token Limit</span>
                <span className={`font-mono ${
                  metrics.timeToLimit < 30 ? 'text-red-400' : 
                  metrics.timeToLimit < 60 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {formatTimeToLimit(metrics.timeToLimit)}
                </span>
              </div>
            </div>
          )}

          {/* Rate History Sparkline */}
          <div className="space-y-2 mt-4">
            <span className="text-sm text-dark-400">Usage Rate Trend</span>
            <div className="h-8 bg-dark-800 rounded flex items-end space-x-1 px-2">
              {/* Placeholder for mini chart - would be replaced with actual sparkline */}
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-moonlock-500 opacity-60 rounded-sm"
                  style={{ 
                    height: `${Math.random() * 100}%`,
                    minHeight: '2px'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  className?: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, className = 'text-dark-200', subtitle }) => {
  return (
    <div className="text-center">
      <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-mono font-semibold ${className}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-dark-500 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};

function formatTimeToLimit(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days}d ${remainingHours}h`;
}