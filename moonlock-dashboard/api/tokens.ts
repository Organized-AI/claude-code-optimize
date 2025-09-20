import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock token usage data
const tokenData = {
  daily: {
    used: 45678,
    limit: 100000,
    percentage: 45.68
  },
  weekly: {
    used: 234567,
    limit: 500000,
    percentage: 46.91
  },
  monthly: {
    used: 890123,
    limit: 2000000,
    percentage: 44.51
  },
  history: [
    { date: '2025-08-01', tokens: 42000 },
    { date: '2025-08-02', tokens: 38500 },
    { date: '2025-08-03', tokens: 45200 },
    { date: '2025-08-04', tokens: 51300 },
    { date: '2025-08-05', tokens: 45678 }
  ]
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if this is the usage endpoint
  const { usage } = req.query;
  
  if (req.method === 'GET') {
    return res.status(200).json(tokenData);
  }

  if (req.method === 'POST' && usage) {
    // Handle token usage updates
    const { tokens } = req.body;
    
    // Update token data (in a real app, this would update a database)
    if (tokens) {
      tokenData.daily.used += tokens;
      tokenData.weekly.used += tokens;
      tokenData.monthly.used += tokens;
      
      // Recalculate percentages
      tokenData.daily.percentage = (tokenData.daily.used / tokenData.daily.limit) * 100;
      tokenData.weekly.percentage = (tokenData.weekly.used / tokenData.weekly.limit) * 100;
      tokenData.monthly.percentage = (tokenData.monthly.used / tokenData.monthly.limit) * 100;
      
      // Add to history
      const today = new Date().toISOString().split('T')[0];
      const existingEntry = tokenData.history.find(h => h.date === today);
      if (existingEntry) {
        existingEntry.tokens += tokens;
      } else {
        tokenData.history.push({ date: today, tokens });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Token usage updated',
      updatedTokens: tokens,
      totalDaily: tokenData.daily.used
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}