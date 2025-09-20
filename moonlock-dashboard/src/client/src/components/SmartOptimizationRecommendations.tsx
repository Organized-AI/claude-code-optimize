import React from 'react';
import { TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'optimization' | 'warning' | 'tip';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action?: string;
}

export const SmartOptimizationRecommendations: React.FC = () => {
  const recommendations: Recommendation[] = [
    {
      id: '1',
      type: 'optimization',
      title: 'Cache Optimization Available',
      description: 'Enable prompt caching to reduce token usage by up to 40%',
      impact: 'high',
      action: 'Enable Caching'
    },
    {
      id: '2',
      type: 'warning',
      title: 'High Token Usage Detected',
      description: 'Current session is consuming tokens 25% above average',
      impact: 'medium'
    },
    {
      id: '3',
      type: 'tip',
      title: 'Session Window Optimization',
      description: 'Consider batching similar tasks to maximize the 5-hour window',
      impact: 'low'
    }
  ];

  const getIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'optimization':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
    }
  };

  const getImpactColor = (impact: Recommendation['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Smart Optimization Recommendations</h3>
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            {getIcon(rec.type)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                <span className={`text-xs px-2 py-1 rounded ${getImpactColor(rec.impact)}`}>
                  {rec.impact.toUpperCase()} IMPACT
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
              {rec.action && (
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  {rec.action} ’
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartOptimizationRecommendations;