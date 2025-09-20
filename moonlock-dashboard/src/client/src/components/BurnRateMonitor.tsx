import React, { useEffect, useState, useRef } from 'react';
import { BurnRateMetrics, BurnRateAlert } from '../../../shared/types';
import { useDataController } from '../hooks/useDataController';
import { useWebSocket } from '../hooks/useWebSocket';
import { Flame, TrendingUp, TrendingDown, Activity, AlertCircle, X } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const BurnRateMonitor: React.FC = () => {
  const { session } = useDataController();
  const { lastMessage } = useWebSocket();
  const [metrics, setMetrics] = useState<BurnRateMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ timestamp: number; rate: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!session) return;

    const startMonitoring = async () => {
      try {
        // Start monitoring
        await fetch(`/api/burnrate/sessions/${session.id}/monitor/start`, { method: 'POST' });
        setIsMonitoring(true);
        
        // Fetch initial metrics
        await fetchMetrics();
        await fetchHistoricalData();
      } catch (error) {
        console.error('Error starting monitoring:', error);
      } finally {
        setLoading(false);
      }
    };

    startMonitoring();

    return () => {
      // Stop monitoring on unmount
      if (session) {
        fetch(`/api/burnrate/sessions/${session.id}/monitor/stop`, { method: 'POST' })
          .catch(console.error);
      }
    };
  }, [session]);

  useEffect(() => {
    // Handle WebSocket updates
    if (lastMessage?.type === 'burn_rate_update' && lastMessage.data?.sessionId === session?.id) {
      setMetrics(lastMessage.data.metrics);
      
      // Add to historical data
      setHistoricalData(prev => {
        const newData = [...prev, {
          timestamp: Date.now(),
          rate: lastMessage.data.metrics.currentRate
        }];
        // Keep last 50 data points
        return newData.slice(-50);
      });
    }
  }, [lastMessage, session]);

  const fetchMetrics = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/burnrate/sessions/${session.id}/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchHistoricalData = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(
        `/api/burnrate/sessions/${session.id}/metrics/history?start=${Date.now() - 30 * 60 * 1000}`
      );
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/burnrate/alerts/${alertId}/acknowledge`, { method: 'POST' });
      
      // Update local state
      if (metrics) {
        setMetrics({
          ...metrics,
          alerts: metrics.alerts.filter(a => a.id !== alertId)
        });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-400" />;
      default:
        return <Activity className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      default: return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
    }
  };

  const chartData = {
    labels: historicalData.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Token Burn Rate',
        data: historicalData.map(d => d.rate),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgb(30, 30, 30)',
        titleColor: 'rgb(200, 200, 200)',
        bodyColor: 'rgb(180, 180, 180)',
        borderColor: 'rgb(60, 60, 60)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgb(120, 120, 120)',
          callback: function(value: any) {
            return value + ' t/m';
          }
        }
      }
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-6 bg-dark-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-32 bg-dark-700 rounded"></div>
          <div className="h-20 bg-dark-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card">
      <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
        <Flame className="w-5 h-5 mr-2 text-moonlock-400" />
        Token Burn Rate Monitor
        {isMonitoring && (
          <span className="ml-2 text-xs text-green-400 flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
            Live
          </span>
        )}
      </h3>

      {metrics && (
        <div className="space-y-4">
          {/* Current Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-800 rounded-lg p-3">
              <div className="text-xs text-dark-400 mb-1">Current Rate</div>
              <div className="text-xl font-bold text-dark-100 flex items-center">
                {Math.round(metrics.currentRate)} t/m
                {getTrendIcon(metrics.trend)}
              </div>
            </div>
            <div className="bg-dark-800 rounded-lg p-3">
              <div className="text-xs text-dark-400 mb-1">Average Rate</div>
              <div className="text-xl font-bold text-dark-100">
                {Math.round(metrics.averageRate)} t/m
              </div>
            </div>
          </div>

          {/* Burn Rate Chart */}
          <div className="bg-dark-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-dark-300 mb-3">Rate History</h4>
            <div className="h-32">
              <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-dark-800 rounded-lg p-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-dark-400">Peak Rate</div>
              <div className="text-sm font-semibold text-dark-200">
                {Math.round(metrics.peakRate)} t/m
              </div>
            </div>
            <div>
              <div className="text-xs text-dark-400">Volatility</div>
              <div className="text-sm font-semibold text-dark-200">
                {metrics.volatility.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-dark-400">Trend</div>
              <div className="text-sm font-semibold text-dark-200 capitalize">
                {metrics.trend}
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          {metrics.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-dark-300 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1 text-yellow-400" />
                Active Alerts ({metrics.alerts.length})
              </h4>
              {metrics.alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`rounded-lg p-3 border flex items-start justify-between ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      {alert.type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-xs opacity-90">
                      {alert.message}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                    title="Acknowledge alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Control Panel */}
          <div className="pt-3 border-t border-dark-700 flex items-center justify-between">
            <div className="text-xs text-dark-400">
              Monitoring started {new Date(session.startTime).toLocaleTimeString()}
            </div>
            <button
              onClick={() => fetchMetrics()}
              className="text-xs text-moonlock-400 hover:text-moonlock-300"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};