/**
 * Anthropic API Usage Card
 * 
 * Displays comprehensive real-time Anthropic API usage statistics including:
 * - Token consumption and cost tracking
 * - Rate limit monitoring
 * - Model usage distribution
 * - Response time analytics
 * - Success rate monitoring
 */

import React, { useMemo } from 'react';
import { useAnthropicAPI } from '../hooks/useAnthropicAPI';

export const AnthropicAPIUsageCard: React.FC = () => {
  const {
    usageMetrics,
    healthStatus,
    comprehensiveStats,
    serviceAvailable,
    loading,
    error,
    connectionStatus,
    isHealthy,
    dailyUsagePercent,
    rateLimitPercent,
    costPerRequest,
    formatCost,
    formatTokens,
    formatResponseTime,
    formatUptime,
    retry
  } = useAnthropicAPI();

  const apiStats = useMemo(() => {
    if (!usageMetrics) return null;

    const totalModelRequests = usageMetrics.modelUsageDistribution.sonnet.requests + 
                              usageMetrics.modelUsageDistribution.opus.requests;

    const sonnetPercent = totalModelRequests > 0 ? 
      (usageMetrics.modelUsageDistribution.sonnet.requests / totalModelRequests) * 100 : 0;
    
    const opusPercent = totalModelRequests > 0 ? 
      (usageMetrics.modelUsageDistribution.opus.requests / totalModelRequests) * 100 : 0;

    return {
      totalModelRequests,
      sonnetPercent,
      opusPercent,
      avgTokensPerRequest: usageMetrics.dailyRequestCount > 0 ? 
        usageMetrics.tokenConsumption.total / usageMetrics.dailyRequestCount : 0,
      costEfficiency: usageMetrics.tokenConsumption.total > 0 ? 
        usageMetrics.costEstimate.daily / usageMetrics.tokenConsumption.total * 1000 : 0 // cost per 1k tokens
    };
  }, [usageMetrics]);

  if (!serviceAvailable) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-gray-400 text-xl">🤖</span>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400 font-medium">Anthropic API Not Available</p>
            <p className="text-dark-400 text-sm">Service requires CLAUDE_API_KEY configuration</p>
            <button
              onClick={retry}
              className="px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors text-sm"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !usageMetrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-moonlock-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-dark-400 text-sm">Loading API usage data...</p>
        </div>
      </div>
    );
  }

  if (error && !usageMetrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <p className="text-red-400 font-medium">API Data Unavailable</p>
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

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-400';
    if (percent >= 75) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6">
      {/* API Health Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full animate-pulse"
               style={{
                 backgroundColor: isHealthy ? '#10b981' : 
                               healthStatus?.status === 'degraded' ? '#f59e0b' : '#ef4444'
               }}>
          </div>
          <div>
            <h3 className={`font-semibold ${getHealthColor(healthStatus?.status)}`}>
              API Status: {healthStatus?.status || 'Unknown'}
            </h3>
            <p className="text-dark-400 text-sm">
              {healthStatus ? formatResponseTime(healthStatus.responseTime) : 'No data'}
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

      {/* Usage Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Daily Requests"
          value={usageMetrics ? usageMetrics.dailyRequestCount.toString() : '0'}
          subtitle={`${dailyUsagePercent.toFixed(1)}% of limit`}
          className={getUsageColor(dailyUsagePercent)}
        />
        <MetricCard
          label="Total Tokens"
          value={usageMetrics ? formatTokens(usageMetrics.tokenConsumption.total) : '0'}
          subtitle="Input + Output"
          className="text-blue-400"
        />
        <MetricCard
          label="Daily Cost"
          value={usageMetrics ? formatCost(usageMetrics.costEstimate.daily) : '$0.00'}
          subtitle="Current spend"
          className="text-yellow-400"
        />
        <MetricCard
          label="Success Rate"
          value={usageMetrics ? `${usageMetrics.successRate.percentage.toFixed(1)}%` : '0%'}
          subtitle={usageMetrics ? `${usageMetrics.successRate.failed} failures` : 'No data'}
          className={usageMetrics && usageMetrics.successRate.percentage >= 95 ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* Rate Limit Progress */}
      {usageMetrics && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-400">Rate Limit Usage</span>
            <span className={`font-mono ${getUsageColor(rateLimitPercent)}`}>
              {usageMetrics.dailyRequestCount} / {usageMetrics.dailyRequestLimit}
            </span>
          </div>
          
          <div className="progress-bar h-3">
            <div 
              className={`progress-fill ${
                rateLimitPercent >= 90 ? 'bg-red-500' : 
                rateLimitPercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, rateLimitPercent)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-dark-500">
            <span>0</span>
            <span className="font-mono">
              {rateLimitPercent.toFixed(1)}%
            </span>
            <span>{usageMetrics.dailyRequestLimit.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Token Breakdown */}
      {usageMetrics && (
        <div className="space-y-3">
          <h4 className="text-sm text-dark-400 uppercase tracking-wide">Token Breakdown</h4>
          <div className="grid grid-cols-3 gap-3">
            <TokenTypeCard
              label="Input"
              value={formatTokens(usageMetrics.tokenConsumption.input)}
              className="text-blue-400 bg-blue-500/10"
            />
            <TokenTypeCard
              label="Output"
              value={formatTokens(usageMetrics.tokenConsumption.output)}
              className="text-green-400 bg-green-500/10"
            />
            <TokenTypeCard
              label="Cache"
              value={formatTokens(usageMetrics.tokenConsumption.cache)}
              className="text-purple-400 bg-purple-500/10"
            />
          </div>
        </div>
      )}

      {/* Model Usage Distribution */}
      {usageMetrics && apiStats && (
        <div className="space-y-3">
          <h4 className="text-sm text-dark-400 uppercase tracking-wide">Model Usage</h4>
          <div className="space-y-2">
            <ModelUsageBar
              label="Claude 3.5 Sonnet"
              requests={usageMetrics.modelUsageDistribution.sonnet.requests}
              cost={usageMetrics.modelUsageDistribution.sonnet.cost}
              percentage={apiStats.sonnetPercent}
              color="bg-moonlock-500"
            />
            <ModelUsageBar
              label="Claude 3 Opus"
              requests={usageMetrics.modelUsageDistribution.opus.requests}
              cost={usageMetrics.modelUsageDistribution.opus.cost}
              percentage={apiStats.opusPercent}
              color="bg-purple-500"
            />
          </div>
        </div>
      )}

      {/* Cost Projections */}
      {usageMetrics && (
        <div className="space-y-3">
          <h4 className="text-sm text-dark-400 uppercase tracking-wide">Cost Projections</h4>
          <div className="grid grid-cols-3 gap-3">
            <CostProjectionCard
              label="Weekly"
              value={formatCost(usageMetrics.costEstimate.weekly)}
              className="text-green-400"
            />
            <CostProjectionCard
              label="Monthly"
              value={formatCost(usageMetrics.costEstimate.monthly)}
              className="text-yellow-400"
            />
            <CostProjectionCard
              label="Per Request"
              value={formatCost(costPerRequest)}
              className="text-blue-400"
            />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {usageMetrics && healthStatus && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-dark-800 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Avg Response Time</span>
              <span className="text-blue-400">{formatResponseTime(usageMetrics.responseTimeStats.average)}</span>
            </div>
          </div>
          
          <div className="bg-dark-800 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Peak Response</span>
              <span className="text-yellow-400">{formatResponseTime(usageMetrics.responseTimeStats.peak)}</span>
            </div>
          </div>
          
          <div className="bg-dark-800 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">API Uptime</span>
              <span className="text-green-400">{formatUptime(healthStatus.uptime)}</span>
            </div>
          </div>
          
          <div className="bg-dark-800 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Efficiency</span>
              <span className="text-purple-400">
                {apiStats ? formatCost(apiStats.costEfficiency) : '$0.00'}/1k tokens
              </span>
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
  subtitle?: string;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtitle, className = 'text-dark-200' }) => {
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

interface TokenTypeCardProps {
  label: string;
  value: string;
  className: string;
}

const TokenTypeCard: React.FC<TokenTypeCardProps> = ({ label, value, className }) => {
  return (
    <div className={`rounded-lg p-3 border border-dark-700 ${className}`}>
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide mb-1 opacity-80">{label}</p>
        <p className="text-lg font-mono font-semibold">{value}</p>
      </div>
    </div>
  );
};

interface ModelUsageBarProps {
  label: string;
  requests: number;
  cost: number;
  percentage: number;
  color: string;
}

const ModelUsageBar: React.FC<ModelUsageBarProps> = ({ label, requests, cost, percentage, color }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-dark-300">{label}</span>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-dark-400">{requests} requests</span>
          <span className="text-dark-400">${cost.toFixed(4)}</span>
        </div>
      </div>
      <div className="progress-bar h-2">
        <div 
          className={`progress-fill ${color}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <div className="text-right text-xs text-dark-500">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
};

interface CostProjectionCardProps {
  label: string;
  value: string;
  className: string;
}

const CostProjectionCard: React.FC<CostProjectionCardProps> = ({ label, value, className }) => {
  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-700 text-center">
      <p className="text-xs uppercase tracking-wide text-dark-400 mb-1">{label}</p>
      <p className={`text-lg font-mono font-semibold ${className}`}>{value}</p>
    </div>
  );
};