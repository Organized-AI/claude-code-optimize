'use client';

/**
 * SessionMetrics Component
 * Displays real-time session metrics (tokens, cost, tools)
 */

import type { SessionMetrics as ISessionMetrics } from '@/types/session';

interface SessionMetricsProps {
  metrics: ISessionMetrics | undefined;
  model: string;
}

export function SessionMetrics({ metrics, model }: SessionMetricsProps) {
  if (!metrics) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        No metrics available yet
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString();
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatDuration = (start: Date, end: Date) => {
    const ms = end.getTime() - start.getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Token Usage */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="text-sm font-medium text-gray-600 mb-1">Total Tokens</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatNumber(metrics.tokensUsed)}
        </div>
        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Input:</span>
            <span className="font-medium">{formatNumber(metrics.inputTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span>Output:</span>
            <span className="font-medium">{formatNumber(metrics.outputTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span>Cache:</span>
            <span className="font-medium text-green-600">{formatNumber(metrics.cacheTokens)}</span>
          </div>
        </div>
      </div>

      {/* Estimated Cost */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="text-sm font-medium text-gray-600 mb-1">Estimated Cost</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatCost(metrics.estimatedCost)}
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="font-medium">{model}</span>
          </div>
        </div>
      </div>

      {/* Tool Calls */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <div className="text-sm font-medium text-gray-600 mb-1">Tool Calls</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatNumber(metrics.toolCalls)}
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Messages:</span>
            <span className="font-medium">{formatNumber(metrics.messageCount)}</span>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
        <div className="text-sm font-medium text-gray-600 mb-1">Duration</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatDuration(new Date(metrics.startTime), new Date(metrics.lastUpdate))}
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Objectives:</span>
            <span className="font-medium">{metrics.objectivesCompleted.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
