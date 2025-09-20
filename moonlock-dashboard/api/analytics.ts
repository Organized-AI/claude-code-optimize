import type { VercelRequest, VercelResponse } from '@vercel/node';

const analyticsData = {
  sessionMetrics: {
    totalSessions: 42,
    averageDuration: 3600000, // 1 hour in ms
    successRate: 92.5,
    activeProjects: 8
  },
  tokenEfficiency: {
    averagePerSession: 8500,
    trend: 'improving',
    savingsThisWeek: 12000
  },
  performanceMetrics: {
    averageResponseTime: 245, // ms
    uptime: 99.9,
    errorRate: 0.3
  },
  weeklyStats: [
    { day: 'Mon', sessions: 8, tokens: 68000 },
    { day: 'Tue', sessions: 6, tokens: 51000 },
    { day: 'Wed', sessions: 7, tokens: 59500 },
    { day: 'Thu', sessions: 5, tokens: 42500 },
    { day: 'Fri', sessions: 9, tokens: 76500 },
    { day: 'Sat', sessions: 4, tokens: 34000 },
    { day: 'Sun', sessions: 3, tokens: 25500 }
  ]
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json(analyticsData);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}