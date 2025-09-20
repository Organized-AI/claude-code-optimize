import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
};

// Mock multi-app metrics data for production deployment
const generateMockMetrics = () => {
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  return {
    overview: {
      totalSessions: 12,
      totalEstimatedTokens: 45230,
      combinedDailyUsage: 18500,
      activeApplications: ['claude-code', 'claude-desktop'],
      totalEstimatedCost: {
        daily: 0.42,
        weekly: 2.94,
        monthly: 12.60,
      },
    },
    breakdown: {
      claudeCode: {
        sessions: 8,
        totalTokens: 32150,
        averageSessionDuration: 1800000, // 30 minutes
        dailyUsage: 12500,
        status: 'active' as const,
        lastActivity: new Date(now - 300000).toISOString(), // 5 minutes ago
      },
      claudeDesktop: {
        sessions: 4,
        estimatedTokens: 13080,
        totalDuration: 2400000, // 40 minutes
        dailyUsage: 6000,
        status: 'inactive' as const,
        lastActivity: new Date(hourAgo).toISOString(),
        version: '0.7.18',
      },
    },
    timeline: [
      {
        timestamp: now - 1800000,
        application: 'claude-code',
        event: 'session-started',
        data: { sessionId: 'mock-session-1' },
      },
      {
        timestamp: now - 900000,
        application: 'claude-desktop',
        event: 'session-ended',
        data: { sessionId: 'mock-session-2' },
      },
    ],
    insights: {
      mostUsedApp: 'claude-code',
      peakUsageHours: [10, 14, 16, 20],
      averageSessionsPerDay: 6,
      tokenUsageDistribution: {
        'claude-code': 71,
        'claude-desktop': 29,
      },
    },
  };
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, return mock data or cached metrics
    // This prevents timeout issues and provides instant response
    const metrics = generateMockMetrics();
    
    // Add cache headers for performance
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    
    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching multi-app metrics:', error);
    
    // Return graceful fallback data on error
    return res.status(200).json({
      overview: {
        totalSessions: 0,
        totalEstimatedTokens: 0,
        combinedDailyUsage: 0,
        activeApplications: [],
        totalEstimatedCost: {
          daily: 0,
          weekly: 0,
          monthly: 0,
        },
      },
      breakdown: {
        claudeCode: {
          sessions: 0,
          totalTokens: 0,
          averageSessionDuration: 0,
          dailyUsage: 0,
          status: 'inactive' as const,
          lastActivity: new Date().toISOString(),
        },
        claudeDesktop: {
          sessions: 0,
          estimatedTokens: 0,
          totalDuration: 0,
          dailyUsage: 0,
          status: 'inactive' as const,
          lastActivity: new Date().toISOString(),
          version: 'unknown',
        },
      },
      timeline: [],
      insights: {
        mostUsedApp: 'none',
        peakUsageHours: [],
        averageSessionsPerDay: 0,
        tokenUsageDistribution: {},
      },
    });
  }
}