import React, { useEffect, useState } from 'react';
import { TokenPrediction, OptimalSchedule } from '../../../shared/types';
import { useDataController } from '../hooks/useDataController';
import { TrendingUp, AlertTriangle, Clock, Target } from 'lucide-react';

export const PredictiveAnalytics: React.FC = () => {
  const { session } = useDataController();
  const [prediction, setPrediction] = useState<TokenPrediction | null>(null);
  const [schedule, setSchedule] = useState<OptimalSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchPredictions = async () => {
      try {
        setLoading(true);
        const [predictionRes, scheduleRes] = await Promise.all([
          fetch(`/api/predictions/sessions/${session.id}/prediction`),
          fetch(`/api/predictions/sessions/${session.id}/schedule`)
        ]);

        if (!predictionRes.ok || !scheduleRes.ok) {
          throw new Error('Failed to fetch predictions');
        }

        const predictionData = await predictionRes.json();
        const scheduleData = await scheduleRes.json();

        setPrediction(predictionData);
        setSchedule(scheduleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  if (loading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-6 bg-dark-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-dark-700 rounded"></div>
          <div className="h-4 bg-dark-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metric-card">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-dark-400';
    }
  };

  return (
    <div className="metric-card">
      <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-moonlock-400" />
        Predictive Analytics
      </h3>

      {prediction && (
        <div className="space-y-4">
          {/* Predicted Usage */}
          <div className="bg-dark-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400 text-sm">Predicted Usage (Next Hour)</span>
              <span className="text-xs text-dark-500">
                {Math.round(prediction.confidence * 100)}% confidence
              </span>
            </div>
            <div className="text-2xl font-bold text-dark-100">
              {prediction.predictedUsage.toLocaleString()} tokens
            </div>
            {session.tokenBudget && (
              <div className="mt-2">
                <div className="text-xs text-dark-400 mb-1">
                  Time to Limit: {formatTime(prediction.timeToLimit)}
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-moonlock-500 to-moonlock-400"
                    style={{ 
                      width: `${Math.min(100, (session.tokensUsed / session.tokenBudget) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Risk Assessment */}
          <div className="bg-dark-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className={`w-4 h-4 mr-2 ${getRiskColor(prediction.riskLevel)}`} />
                <span className="text-dark-300 text-sm">Risk Level</span>
              </div>
              <span className={`font-semibold ${getRiskColor(prediction.riskLevel)}`}>
                {prediction.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Recommendations */}
          {prediction.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-dark-300">Recommendations</h4>
              {prediction.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className="flex items-start space-x-2 text-sm text-dark-400 bg-dark-800 rounded p-2"
                >
                  <Target className="w-3 h-3 mt-0.5 flex-shrink-0 text-moonlock-400" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}

          {/* Optimal Break Points */}
          {prediction.optimalBreakPoints.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-dark-300 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Suggested Break Times
              </h4>
              <div className="flex flex-wrap gap-2">
                {prediction.optimalBreakPoints.slice(0, 3).map((breakTime, index) => {
                  const timeUntilBreak = breakTime - Date.now();
                  if (timeUntilBreak > 0) {
                    return (
                      <div 
                        key={index}
                        className="bg-dark-800 rounded px-3 py-1 text-xs text-dark-300"
                      >
                        in {formatTime(timeUntilBreak)}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {schedule && (
        <div className="mt-4 pt-4 border-t border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-dark-400">Productivity Score</div>
              <div className="text-lg font-semibold text-dark-200">
                {Math.round(schedule.productivityScore)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-400">Burnout Risk</div>
              <div className="text-lg font-semibold text-dark-200">
                {Math.round(schedule.burnoutRisk)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};