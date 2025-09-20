import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock session data for demonstration
const mockSessions = [
  {
    id: 'session-1',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: null,
    status: 'active',
    tokensUsed: 12543,
    model: 'claude-3-opus',
    projectName: 'Moonlock Dashboard',
    description: 'Real-time monitoring implementation'
  },
  {
    id: 'session-2',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    status: 'completed',
    tokensUsed: 8234,
    model: 'claude-3-sonnet',
    projectName: 'API Integration',
    description: 'Backend service setup'
  }
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract session ID from query for individual session operations
  const sessionId = req.query.id as string;

  if (req.method === 'GET') {
    if (sessionId) {
      // Get individual session
      const session = mockSessions.find(s => s.id === sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.status(200).json(session);
    }
    
    // Return all session data
    return res.status(200).json({
      sessions: mockSessions,
      currentSession: mockSessions.find(s => s.status === 'active'),
      totalTokensUsed: mockSessions.reduce((sum, s) => sum + s.tokensUsed, 0)
    });
  }

  if (req.method === 'POST') {
    // Handle session creation
    const newSession = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'active',
      tokensUsed: 0,
      model: req.body.model || 'claude-3-opus',
      projectName: req.body.projectName || 'New Project',
      description: req.body.description || ''
    };
    
    mockSessions.unshift(newSession);
    
    return res.status(201).json(newSession);
  }

  if (req.method === 'PATCH') {
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required for updates' });
    }
    
    // Handle session update
    const sessionIndex = mockSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Update session with provided data
    const updatedSession = {
      ...mockSessions[sessionIndex],
      ...req.body,
      id: sessionId // Prevent ID changes
    };
    
    if (req.body.status === 'completed' && !updatedSession.endTime) {
      updatedSession.endTime = new Date().toISOString();
    }
    
    mockSessions[sessionIndex] = updatedSession;
    
    return res.status(200).json(updatedSession);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}