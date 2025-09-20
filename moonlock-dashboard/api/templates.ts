import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
  maxDuration: 5,
};

// Session templates for quick starts
const templates = [
  {
    id: 'quick-fix',
    name: 'Quick Fix',
    description: 'Short session for bug fixes and minor adjustments',
    tokenBudget: 10000,
    duration: 30,
    icon: '🔧',
    color: 'blue',
  },
  {
    id: 'feature-dev',
    name: 'Feature Development',
    description: 'Standard feature implementation session',
    tokenBudget: 50000,
    duration: 120,
    icon: '✨',
    color: 'purple',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review and refactor existing code',
    tokenBudget: 25000,
    duration: 60,
    icon: '👀',
    color: 'green',
  },
  {
    id: 'exploration',
    name: 'Exploration',
    description: 'Research and experimentation session',
    tokenBudget: 75000,
    duration: 180,
    icon: '🔬',
    color: 'orange',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Write or update project documentation',
    tokenBudget: 15000,
    duration: 45,
    icon: '📝',
    color: 'teal',
  },
  {
    id: 'testing',
    name: 'Testing & QA',
    description: 'Write tests and perform quality assurance',
    tokenBudget: 30000,
    duration: 90,
    icon: '🧪',
    color: 'red',
  },
];

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
    // Add cache headers for performance
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    return res.status(200).json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
}