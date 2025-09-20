import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';

interface APIUsageData {
  provider: string;
  model: string;
  tokensUsed: number;
  tokensLimit: number;
  costEstimate: number;
  efficiency: number;
}

export const UnifiedAPIUsageCard: React.FC = () => {
  const [usageData, setUsageData] = useState<APIUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        // Fetch from Claude Code precision metrics
        const response = await fetch('/api/claude-code?endpoint=precision-metrics');
        if (response.ok) {
          const data = await response.json();
          setUsageData([
            {
              provider: 'Claude Code',
              model: 'Claude 3.5 Sonnet',
              tokensUsed: data.totalTokens || 0,
              tokensLimit: 1000000,
              costEstimate: data.costEstimate || 0,
              efficiency: data.efficiency || 0
            }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch API usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
    const interval = setInterval(fetchUsageData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const totalTokensUsed = usageData.reduce((sum, data) => sum + data.tokensUsed, 0);
  const totalCost = usageData.reduce((sum, data) => sum + data.costEstimate, 0);
  const averageEfficiency = usageData.length > 0 
    ? usageData.reduce((sum, data) => sum + data.efficiency, 0) / usageData.length 
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Unified API Usage</h3>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {(totalTokensUsed / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500">Total Tokens</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            ${totalCost.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Est. Cost</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {(averageEfficiency * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">Efficiency</p>
        </div>
      </div>

      <div className="space-y-2">
        {usageData.map((data, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-medium text-sm">{data.provider}</p>
                <p className="text-xs text-gray-500">{data.model}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{(data.tokensUsed / 1000).toFixed(1)}K tokens</p>
                <p className="text-xs text-gray-500">${data.costEstimate.toFixed(2)}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(data.tokensUsed / data.tokensLimit) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((data.tokensUsed / data.tokensLimit) * 100).toFixed(1)}% of limit
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnifiedAPIUsageCard;