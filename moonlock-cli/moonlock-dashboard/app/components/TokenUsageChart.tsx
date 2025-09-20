'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TokenUsage } from '@/app/types';

interface TokenUsageChartProps {
  sessionId?: string;
}

export function TokenUsageChart({ sessionId }: TokenUsageChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = sessionId 
          ? `/api/tokens?sessionId=${sessionId}`
          : '/api/tokens';
        const response = await fetch(url);
        const tokenUsage: TokenUsage[] = await response.json();

        // Group by date and aggregate
        const grouped = tokenUsage.reduce((acc, usage) => {
          const date = format(new Date(usage.timestamp), 'MMM dd');
          if (!acc[date]) {
            acc[date] = { date, input: 0, output: 0, total: 0 };
          }
          acc[date].input += usage.input;
          acc[date].output += usage.output;
          acc[date].total += usage.total;
          return acc;
        }, {} as Record<string, any>);

        const chartData = Object.values(grouped).slice(-7); // Last 7 days
        setData(chartData);
      } catch (error) {
        console.error('Error fetching token usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
            labelStyle={{ color: '#111827' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="input" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Input Tokens"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="output" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Output Tokens"
            dot={{ fill: '#10b981', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            name="Total"
            dot={{ fill: '#8b5cf6', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}