import React from 'react';

export const SessionHistory: React.FC = () => {
  // Mock data for session history
  const sessions = [
    {
      id: '1',
      name: 'Moonlock Dashboard Development',
      startTime: Date.now() - 3600000,
      duration: 3600000,
      tokensUsed: 8750,
      tokenBudget: 10000,
      status: 'completed' as const,
    },
    {
      id: '2', 
      name: 'API Integration Testing',
      startTime: Date.now() - 7200000,
      duration: 1800000,
      tokensUsed: 2340,
      tokenBudget: 5000,
      status: 'completed' as const,
    },
    {
      id: '3',
      name: 'Documentation Review',
      startTime: Date.now() - 86400000,
      duration: 2700000,
      tokensUsed: 1850,
      tokenBudget: 3000,
      status: 'completed' as const,
    },
  ];

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getUsagePercentage = (used: number, budget: number) => {
    return budget > 0 ? Math.round((used / budget) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-dark-200">
          Session History
        </h2>
        <div className="text-sm text-dark-400">
          {sessions.length} sessions completed
        </div>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => {
          const usagePercentage = getUsagePercentage(session.tokensUsed, session.tokenBudget);
          
          return (
            <div
              key={session.id}
              className="metric-card p-6 space-y-4"
            >
              {/* Session Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-dark-200">
                    {session.name}
                  </h3>
                  <p className="text-sm text-dark-400 mt-1">
                    {formatDate(session.startTime)} • {formatDuration(session.duration)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium status-${session.status}`}>
                    {session.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Token Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Token Usage</span>
                  <span className="font-mono text-dark-300">
                    {session.tokensUsed.toLocaleString()} / {session.tokenBudget.toLocaleString()}
                  </span>
                </div>
                
                <div className="progress-bar h-2">
                  <div 
                    className={`progress-fill ${
                      usagePercentage > 90 
                        ? 'bg-red-500' 
                        : usagePercentage > 80 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, usagePercentage)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-dark-500">
                  <span>0%</span>
                  <span className="font-mono">{usagePercentage}%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-700">
                <div className="text-center">
                  <p className="text-xs text-dark-400 uppercase tracking-wide">Efficiency</p>
                  <p className="text-lg font-mono font-semibold text-moonlock-400">
                    {100 - usagePercentage}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-dark-400 uppercase tracking-wide">Rate</p>
                  <p className="text-lg font-mono font-semibold text-green-400">
                    {Math.round(session.tokensUsed / (session.duration / 60000))}/min
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-dark-400 uppercase tracking-wide">Saved</p>
                  <p className="text-lg font-mono font-semibold text-blue-400">
                    {session.tokenBudget - session.tokensUsed}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="metric-card p-6">
        <h3 className="font-semibold text-dark-200 mb-4">
          Historical Summary
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">Total Sessions</p>
            <p className="text-2xl font-mono font-semibold text-moonlock-400">
              {sessions.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">Total Tokens</p>
            <p className="text-2xl font-mono font-semibold text-green-400">
              {sessions.reduce((sum, s) => sum + s.tokensUsed, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">Avg Duration</p>
            <p className="text-2xl font-mono font-semibold text-blue-400">
              {formatDuration(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-dark-400 uppercase tracking-wide mb-1">Avg Efficiency</p>
            <p className="text-2xl font-mono font-semibold text-purple-400">
              {Math.round(sessions.reduce((sum, s) => sum + (100 - getUsagePercentage(s.tokensUsed, s.tokenBudget)), 0) / sessions.length)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};