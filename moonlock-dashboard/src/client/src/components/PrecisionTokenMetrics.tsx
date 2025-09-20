/**
 * Precision Token Metrics Component
 * 
 * Displays token metrics matching the exact specification:
 * - INPUT TOKENS / OUTPUT TOKENS (large numbers)
 * - CACHE TOKENS READ (highlighted)
 * - EFFICIENCY % / RATE per min
 * - 5-Hour Block Budget progress bar with 518,890 / 750,000 format
 * - Budget exhaustion prediction and session cost with cache savings
 */

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDataController } from '../hooks/useDataController';

interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  efficiency: number;
  costEstimate: number;
  ratePerMin: number;
}

interface BudgetProgress {
  current: number;
  limit: number;
  percentage: number;
  exhaustionTime: number | null;
  savingsFromCache: number;
}

export const PrecisionTokenMetrics: React.FC = () => {
  const { isConnected } = useWebSocket();
  const { state } = useDataController();
  
  // Use real-time data from DataController when available, fallback to API calls
  const [metrics, setMetrics] = useState<TokenMetrics>({
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    efficiency: 0,
    costEstimate: 0,
    ratePerMin: 0
  });
  
  const [budget, setBudget] = useState<BudgetProgress>({
    current: 0,
    limit: 750000,
    percentage: 0,
    exhaustionTime: null,
    savingsFromCache: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update metrics from DataController when Claude Code data is available
  useEffect(() => {
    if (state.claudeCode && state.connection.status === 'connected') {
      const claudeCodeMetrics = state.claudeCode.precisionMetrics;
      
      setMetrics({
        inputTokens: claudeCodeMetrics.inputTokens,
        outputTokens: claudeCodeMetrics.outputTokens,
        cacheReadTokens: claudeCodeMetrics.cacheReadTokens,
        totalTokens: claudeCodeMetrics.totalTokens,
        efficiency: claudeCodeMetrics.efficiency,
        ratePerMin: claudeCodeMetrics.ratePerMin,
        costEstimate: claudeCodeMetrics.costEstimate
      });
      
      // Update budget based on session data
      if (state.session) {
        setBudget(prev => ({
          ...prev,
          current: state.session?.tokensUsed || 0,
          percentage: ((state.session?.tokensUsed || 0) / prev.limit) * 100
        }));
      }
      
      setLoading(false);
      setError(null);
    }
  }, [state]);

  useEffect(() => {
    fetchMetrics();
    
    // Set up real-time updates every second
    const interval = setInterval(() => {
      if (isConnected) {
        fetchMetrics();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const fetchMetrics = async () => {
    try {
      setError(null);
      
      // Fetch precision token metrics
      const metricsResponse = await fetch('/api/claude-code?endpoint=precision-metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }
      
      // Fetch budget progress
      const budgetResponse = await fetch('/api/claude-code?endpoint=budget-progress');
      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        setBudget(budgetData);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch token metrics');
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff <= 0) return 'Now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 95) return 'text-red-400';
    if (percentage >= 80) return 'text-yellow-400';
    if (percentage >= 60) return 'text-blue-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-dark-700 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="h-16 bg-dark-700 rounded"></div>
            <div className="h-16 bg-dark-700 rounded"></div>
          </div>
          <div className="h-4 bg-dark-700 rounded mb-2"></div>
          <div className="h-8 bg-dark-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-800 rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <p className="text-red-400 font-medium">Token Metrics Unavailable</p>
            <p className="text-dark-400 text-sm">{error}</p>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Precision Token Metrics</h3>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      </div>

      {/* Main Token Display */}
      <div className="grid grid-cols-2 gap-6">
        {/* Input / Output Tokens */}
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">INPUT TOKENS</p>
            <p className="text-4xl font-mono font-bold text-blue-400">
              {formatNumber(metrics.inputTokens)}
            </p>
          </div>
          <div className="text-center border-t border-dark-700 pt-3">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">OUTPUT TOKENS</p>
            <p className="text-4xl font-mono font-bold text-purple-400">
              {formatNumber(metrics.outputTokens)}
            </p>
          </div>
        </div>

        {/* Cache Tokens and Efficiency */}
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">CACHE TOKENS READ</p>
            <p className="text-4xl font-mono font-bold text-moonlock-400 animate-pulse-slow">
              {formatNumber(metrics.cacheReadTokens)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-dark-700 pt-3">
            <div className="text-center">
              <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">EFFICIENCY %</p>
              <p className="text-2xl font-mono font-bold text-green-400">
                {metrics.efficiency.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">RATE/MIN</p>
              <p className="text-2xl font-mono font-bold text-yellow-400">
                {Math.round(metrics.ratePerMin)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Hour Budget Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-dark-300">5-Hour Block Budget</h4>
          <span className={`text-sm font-mono ${getPercentageColor(budget.percentage)}`}>
            {budget.percentage.toFixed(1)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-dark-700 rounded-full h-4">
            <div 
              className={`h-4 rounded-full transition-all duration-300 ${getProgressBarColor(budget.percentage)}`}
              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-white drop-shadow-lg">
              {formatNumber(budget.current)} / {formatNumber(budget.limit)}
            </span>
          </div>
        </div>

        {/* Budget Details */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-dark-400">Remaining</p>
            <p className="font-mono text-white">
              {formatNumber(budget.limit - budget.current)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-dark-400">Exhaustion</p>
            <p className={`font-mono ${budget.exhaustionTime && budget.exhaustionTime < Date.now() + (60 * 60 * 1000) ? 'text-red-400' : 'text-white'}`}>
              {formatTime(budget.exhaustionTime)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-dark-400">Cache Savings</p>
            <p className="font-mono text-green-400">
              {formatNumber(budget.savingsFromCache)}
            </p>
          </div>
        </div>
      </div>

      {/* Session Cost Summary */}
      <div className="border-t border-dark-700 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">SESSION COST</p>
            <p className="text-xl font-mono font-bold text-green-400">
              ${metrics.costEstimate.toFixed(4)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">WITH CACHE SAVINGS</p>
            <p className="text-xl font-mono font-bold text-emerald-400">
              -${((budget.savingsFromCache / 1000) * 0.003).toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex justify-between items-center text-xs text-dark-400">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            metrics.ratePerMin > 1000 ? 'bg-red-500 animate-pulse' : 
            metrics.ratePerMin > 500 ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
          <span>Rate: {metrics.ratePerMin > 1000 ? 'High' : metrics.ratePerMin > 500 ? 'Medium' : 'Normal'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            budget.percentage > 90 ? 'bg-red-500 animate-pulse' : 
            budget.percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
          <span>Budget: {budget.percentage > 90 ? 'Critical' : budget.percentage > 75 ? 'Warning' : 'Good'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            metrics.efficiency > 30 ? 'bg-green-500' : 
            metrics.efficiency > 15 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span>Cache: {metrics.efficiency > 30 ? 'Excellent' : metrics.efficiency > 15 ? 'Good' : 'Poor'}</span>
        </div>
      </div>
    </div>
  );
};