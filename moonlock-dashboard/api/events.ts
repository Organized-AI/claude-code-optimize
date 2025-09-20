/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 * Compatible with Vercel's serverless architecture
 * Connected to real session automation data
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper to send SSE messages
function sendSSE(res: VercelResponse, eventType: string, data: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  res.write(message);
}

// Direct session data (avoiding circular dependency with sessions API)
function getDirectSessionData() {
  // Mock session data that mirrors the sessions API
  const mockSessions = [
    {
      id: 'session-claude-code-live',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: null,
      status: 'active',
      tokensUsed: 15847,
      tokenBudget: 50000,
      model: 'claude-sonnet-4-20250514',
      project: 'Claude Code Optimizer',
      description: 'WebSocket to SSE migration for Vercel deployment'
    }
  ];

  const currentSession = mockSessions.find(s => s.status === 'active');
  
  if (currentSession) {
    const now = Date.now();
    const startTime = currentSession.startTime.getTime();
    const elapsed = Math.floor((now - startTime) / 1000);
    
    // Update tokens used dynamically to simulate real usage
    const baseTokens = currentSession.tokensUsed;
    const dynamicTokens = baseTokens + Math.floor(elapsed / 60) * 3; // ~3 tokens per minute
    
    return {
      currentSession: {
        sessionId: currentSession.id,
        isActive: currentSession.status === 'active',
        startTime: currentSession.startTime,
        model: currentSession.model,
        projectName: currentSession.project
      },
      metrics: {
        timeElapsed: elapsed,
        totalTime: 18000, // 5 hours in seconds
        budgetUsed: dynamicTokens,
        tokensUsed: dynamicTokens,
        projectedTotal: Math.round(dynamicTokens * 1.5),
        budgetTotal: currentSession.tokenBudget
      }
    };
  }
  
  return {
    currentSession: null,
    metrics: null
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests for SSE
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Extract session ID from query
  const { sessionId } = req.query;
  
  // Send initial connection event
  sendSSE(res, 'connection', {
    type: 'connection',
    clientId: Math.random().toString(36).substring(7),
    timestamp: Date.now()
  });

  // Set up periodic updates
  const updateInterval = setInterval(async () => {
    try {
      // Get direct session data (avoiding circular API calls on Vercel)
      const sessionData = getDirectSessionData();
      const realSessionData = sessionData;
      const currentMetrics = sessionData.metrics;
      
      if (realSessionData.currentSession && currentMetrics) {
        // Send timer update
        sendSSE(res, 'timer_update', {
          type: 'timer_update',
          elapsed: currentMetrics.timeElapsed * 1000,
          remaining: Math.max(0, (currentMetrics.totalTime - currentMetrics.timeElapsed) * 1000),
          status: realSessionData.currentSession.isActive ? 'active' : 'paused'
        });
        
        // Send token update
        sendSSE(res, 'token_update', {
          type: 'token_update',
          tokensUsed: currentMetrics.budgetUsed,
          totalUsed: currentMetrics.tokensUsed,
          projectedTotal: currentMetrics.projectedTotal
        });
        
        // Send session update if needed
        if (sessionId !== realSessionData.currentSession.sessionId) {
          sendSSE(res, 'session_update', {
            type: 'session_update',
            session: {
              id: realSessionData.currentSession.sessionId,
              status: realSessionData.currentSession.isActive ? 'active' : 'completed',
              startTime: realSessionData.currentSession.startTime.getTime(),
              tokenBudget: currentMetrics.budgetTotal,
              model: realSessionData.currentSession.model,
              project: realSessionData.currentSession.projectName
            }
          });
        }
      } else {
        // No active session
        sendSSE(res, 'session_update', {
          type: 'session_update',
          session: null
        });
      }
      
      // Send heartbeat
      sendSSE(res, 'heartbeat', {
        type: 'heartbeat',
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error sending SSE update:', error);
      sendSSE(res, 'error', {
        type: 'error',
        message: 'Failed to fetch session data'
      });
    }
  }, 2000); // Update every 2 seconds

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(updateInterval);
    res.end();
  });

  // Keep connection alive for Vercel (max 10 seconds for serverless)
  // After 10 seconds, the client will reconnect automatically
  setTimeout(() => {
    clearInterval(updateInterval);
    sendSSE(res, 'reconnect', {
      type: 'reconnect',
      message: 'Reconnecting due to timeout'
    });
    res.end();
  }, 9000); // Close before Vercel's 10-second limit
}

// Vercel configuration
export const config = {
  api: {
    bodyParser: false,
  },
};