import React from 'react';

export const TokenChart: React.FC = () => {
  // Generate sample data for the chart
  const dataPoints = Array.from({ length: 20 }, (_, i) => ({
    time: i * 5, // Every 5 minutes
    tokens: Math.floor(Math.random() * 100) + 50,
  }));

  const maxTokens = Math.max(...dataPoints.map(d => d.tokens));

  return (
    <div className="space-y-4">
      {/* Chart Area */}
      <div className="h-32 bg-dark-800 rounded-lg p-4 flex items-end space-x-1">
        {dataPoints.map((point, index) => (
          <div
            key={index}
            className="flex-1 bg-moonlock-500 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            style={{
              height: `${(point.tokens / maxTokens) * 100}%`,
              minHeight: '2px'
            }}
            title={`${point.time}min: ${point.tokens} tokens`}
          />
        ))}
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-between text-xs text-dark-500">
        <span>0 min</span>
        <span className="text-dark-400 font-medium">Token Usage Over Time</span>
        <span>100 min</span>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wide">Peak</p>
          <p className="text-lg font-mono font-semibold text-moonlock-400">
            {maxTokens}
          </p>
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wide">Avg</p>
          <p className="text-lg font-mono font-semibold text-green-400">
            {Math.round(dataPoints.reduce((sum, d) => sum + d.tokens, 0) / dataPoints.length)}
          </p>
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wide">Current</p>
          <p className="text-lg font-mono font-semibold text-blue-400">
            {dataPoints[dataPoints.length - 1]?.tokens || 0}
          </p>
        </div>
      </div>
    </div>
  );
};