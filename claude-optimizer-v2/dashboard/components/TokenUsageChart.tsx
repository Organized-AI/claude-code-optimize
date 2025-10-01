'use client';

/**
 * TokenUsageChart Component
 * Visualizes token distribution with a bar chart
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SessionMetrics } from '@/types/session';

interface TokenUsageChartProps {
  metrics: SessionMetrics | undefined;
}

export function TokenUsageChart({ metrics }: TokenUsageChartProps) {
  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage</h3>
        <div className="text-center text-gray-500 py-16">
          No token data available yet
        </div>
      </div>
    );
  }

  const data = [
    {
      name: 'Input',
      tokens: metrics.inputTokens,
      fill: '#3b82f6' // blue-500
    },
    {
      name: 'Output',
      tokens: metrics.outputTokens,
      fill: '#8b5cf6' // purple-500
    },
    {
      name: 'Cache',
      tokens: metrics.cacheTokens,
      fill: '#10b981' // green-500
    }
  ];

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Distribution</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value: number) => [formatNumber(value), 'Tokens']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem'
            }}
          />
          <Legend />
          <Bar dataKey="tokens" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Input</div>
            <div className="text-lg font-semibold text-blue-600">
              {formatNumber(metrics.inputTokens)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Output</div>
            <div className="text-lg font-semibold text-purple-600">
              {formatNumber(metrics.outputTokens)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Cache (90% off)</div>
            <div className="text-lg font-semibold text-green-600">
              {formatNumber(metrics.cacheTokens)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
