import { useState, useEffect } from 'react';

export interface UnifiedUsageMetrics {
  overview: {
    totalSessions: number;
    totalEstimatedTokens: number;
    combinedDailyUsage: number;
    activeApplications: string[];
    totalEstimatedCost: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  breakdown: {
    claudeCode: {
      sessions: number;
      totalTokens: number;
      averageSessionDuration: number;
      dailyUsage: number;
      status: 'active' | 'inactive';
      lastActivity: string;
    };
    claudeDesktop: {
      sessions: number;
      estimatedTokens: number;
      totalDuration: number;
      dailyUsage: number;
      status: 'active' | 'inactive';
      lastActivity: string;
      version: string;
    };
  };
  timeline: Array<{
    timestamp: number;
    application: string;
    event: string;
    data?: any;
  }>;
  insights: {
    mostUsedApp: string;
    peakUsageHours: number[];
    averageSessionsPerDay: number;
    tokenUsageDistribution: Record<string, number>;
  };
}

export const useMultiAppMetrics = () => {
  const [metrics, setMetrics] = useState<UnifiedUsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add timeout protection (2 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('/api/multi-app/metrics', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Multi-app metrics request timed out, using fallback');
        // Use fallback metrics on timeout
        setMetrics(null);
        setError('Request timed out');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch multi-app metrics');
        console.error('Error fetching multi-app metrics:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics
  };
};