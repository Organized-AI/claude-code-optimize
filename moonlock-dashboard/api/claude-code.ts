const { readdir, readFile, stat } = require('fs/promises');
const { join } = require('path');
const { homedir } = require('os');

// @ts-ignore
interface ClaudeMessage {
  sessionId: string;
  timestamp: string;
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

// Unified Claude Code API endpoint
module.exports = async function handler(req, res) {
  const { endpoint } = req.query;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  switch (endpoint) {
    case 'live-status':
      return handleLiveStatus(req, res);
    case 'precision-metrics':
      return handlePrecisionMetrics(req, res);
    case 'budget-progress':
      return handleBudgetProgress(req, res);
    case 'events':
      return handleEvents(req, res);
    default:
      return res.status(404).json({ error: 'Endpoint not found' });
  }
}

// Get active Claude Code sessions by monitoring JSONL files
async function getActiveClaudeCodeSessions() {
  try {
    const claudeDir = join(homedir(), '.claude', 'projects');
    const projectDirs = await readdir(claudeDir);
    const activeSessions = [];
    
    for (const projectDir of projectDirs) {
      const projectPath = join(claudeDir, projectDir);
      const files = await readdir(projectPath);
      
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = join(projectPath, file);
          const stats = await stat(filePath);
          
          // Consider session active if modified within last 5 minutes (300 seconds)
          const lastModified = stats.mtime.getTime();
          const isActive = (Date.now() - lastModified) < 300000;
          
          if (isActive) {
            // Parse the JSONL file to get token data
            const sessionData = await parseJSONLSession(filePath);
            if (sessionData) {
              activeSessions.push({
                sessionId: sessionData.sessionId,
                projectPath: projectDir,
                lastActivity: lastModified,
                startTime: sessionData.startTime,
                totalInputTokens: sessionData.totalInputTokens,
                totalOutputTokens: sessionData.totalOutputTokens,
                cacheReadTokens: sessionData.cacheReadTokens,
                cacheCreationTokens: sessionData.cacheCreationTokens,
                filePath
              });
            }
          }
        }
      }
    }
    
    return activeSessions;
  } catch (error) {
    console.error('Error scanning Claude Code sessions:', error);
    return [];
  }
}

// Parse JSONL file to extract session data and token usage
async function parseJSONLSession(filePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return null;
    
    let sessionId = '';
    let startTime = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;
    
    // Parse each line to accumulate token usage
    for (const line of lines) {
      try {
        const entry: ClaudeMessage = JSON.parse(line);
        
        if (!sessionId && entry.sessionId) {
          sessionId = entry.sessionId;
        }
        
        if (!startTime && entry.timestamp) {
          startTime = new Date(entry.timestamp).getTime();
        }
        
        if (entry.message?.usage) {
          const usage = entry.message.usage;
          totalInputTokens += usage.input_tokens || 0;
          totalOutputTokens += usage.output_tokens || 0;
          cacheReadTokens += usage.cache_read_input_tokens || 0;
          cacheCreationTokens += usage.cache_creation_input_tokens || 0;
        }
      } catch (lineError) {
        // Skip invalid JSON lines
        continue;
      }
    }
    
    return {
      sessionId,
      startTime,
      totalInputTokens,
      totalOutputTokens,
      cacheReadTokens,
      cacheCreationTokens
    };
  } catch (error) {
    console.error('Error parsing JSONL file:', filePath, error);
    return null;
  }
}

async function handleLiveStatus(req, res) {
  const activeSessions = await getActiveClaudeCodeSessions();
  const hasActiveSession = activeSessions.length > 0;
  
  if (hasActiveSession) {
    // Return the most recently active session
    const activeSession = activeSessions.sort((a, b) => b.lastActivity - a.lastActivity)[0];
    
    return res.status(200).json({
      hasActiveSession: true,
      isRealTimeActive: (Date.now() - activeSession.lastActivity) < 30000, // Active if modified < 30s ago
      activeSession: {
        sessionId: activeSession.sessionId,
        startTime: activeSession.startTime,
        status: 'active',
        tokensUsed: activeSession.totalInputTokens + activeSession.totalOutputTokens,
        tokenBudget: 200000 // 5-hour budget
      },
      lastActivity: activeSession.lastActivity
    });
  } else {
    return res.status(200).json({
      hasActiveSession: false,
      isRealTimeActive: false,
      activeSession: null,
      lastActivity: null
    });
  }
}

async function handlePrecisionMetrics(req, res) {
  const activeSessions = await getActiveClaudeCodeSessions();
  
  if (activeSessions.length > 0) {
    const activeSession = activeSessions.sort((a, b) => b.lastActivity - a.lastActivity)[0];
    
    const totalInputTokens = activeSession.totalInputTokens + activeSession.cacheCreationTokens;
    const totalTokens = totalInputTokens + activeSession.totalOutputTokens;
    const efficiency = totalInputTokens > 0 ? (activeSession.cacheReadTokens / totalInputTokens) * 100 : 0;
    
    // Calculate rate per minute based on session duration
    const sessionDuration = Date.now() - activeSession.startTime;
    const ratePerMin = sessionDuration > 0 ? (totalTokens / sessionDuration) * 60000 : 0;
    
    // Sonnet 4 pricing: $3/M input, $15/M output
    const costEstimate = (totalInputTokens * 0.003 / 1000) + (activeSession.totalOutputTokens * 0.015 / 1000);
    
    return res.status(200).json({
      inputTokens: activeSession.totalInputTokens,
      outputTokens: activeSession.totalOutputTokens,
      cacheReadTokens: activeSession.cacheReadTokens,
      cacheCreationTokens: activeSession.cacheCreationTokens,
      totalTokens: totalTokens,
      efficiency: Math.round(efficiency * 10) / 10, // Round to 1 decimal
      ratePerMin: Math.round(ratePerMin),
      costEstimate: Math.round(costEstimate * 10000) / 10000, // Round to 4 decimals
      lastUpdate: Date.now()
    });
  } else {
    // No active session
    return res.status(200).json({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      totalTokens: 0,
      efficiency: 0,
      ratePerMin: 0,
      costEstimate: 0,
      lastUpdate: Date.now()
    });
  }
}

async function handleBudgetProgress(req, res) {
  const activeSessions = await getActiveClaudeCodeSessions();
  
  if (activeSessions.length > 0) {
    const activeSession = activeSessions.sort((a, b) => b.lastActivity - a.lastActivity)[0];
    
    // Calculate 5-hour window progress
    const fiveHourWindow = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const sessionDuration = Date.now() - activeSession.startTime;
    const remainingTime = Math.max(0, fiveHourWindow - sessionDuration);
    const percentage = Math.min((sessionDuration / fiveHourWindow) * 100, 100);
    const totalTokens = activeSession.totalInputTokens + activeSession.totalOutputTokens + activeSession.cacheCreationTokens;
    
    return res.status(200).json({
      current: totalTokens,
      totalBudget: 200000, // 200k token budget for 5 hours
      percentage: Math.round(percentage * 10) / 10,
      remainingTime: remainingTime,
      elapsedTime: sessionDuration,
      projectedUsage: sessionDuration > 0 ? Math.round((totalTokens / sessionDuration) * fiveHourWindow) : 0
    });
  } else {
    // No active session
    return res.status(200).json({
      current: 0,
      totalBudget: 200000,
      percentage: 0,
      remainingTime: 5 * 60 * 60 * 1000, // Full 5 hours
      elapsedTime: 0,
      projectedUsage: 0
    });
  }
}

async function handleEvents(req, res) {
  // Server-Sent Events for real-time updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write('data: {"type":"connected","timestamp":' + Date.now() + ',"service":"claude-code-monitor"}\n\n');
  
  // Send periodic updates every 2 seconds
  let counter = 0;
  const interval = setInterval(async () => {
    counter++;
    
    // Close connection after 30 updates (1 minute) to avoid Vercel timeout
    if (counter > 30) {
      clearInterval(interval);
      res.write('data: {"type":"reconnect","message":"Reconnecting due to timeout","service":"claude-code-monitor"}\n\n');
      res.end();
      return;
    }
    
    try {
      const activeSessions = await getActiveClaudeCodeSessions();
      
      if (activeSessions.length > 0) {
        const activeSession = activeSessions.sort((a, b) => b.lastActivity - a.lastActivity)[0];
        
        // Send session update
        res.write(`data: ${JSON.stringify({
          type: 'claude_code_session',
          data: {
            hasActiveSession: true,
            sessionId: activeSession.sessionId,
            startTime: activeSession.startTime,
            status: 'active',
            tokensUsed: activeSession.totalInputTokens + activeSession.totalOutputTokens,
            tokenBudget: 200000,
            isRealTimeActive: (Date.now() - activeSession.lastActivity) < 30000,
            lastActivity: activeSession.lastActivity
          }
        })}\n\n`);
        
        // Send metrics update
        const totalInputTokens = activeSession.totalInputTokens + activeSession.cacheCreationTokens;
        const totalTokens = totalInputTokens + activeSession.totalOutputTokens;
        const efficiency = totalInputTokens > 0 ? (activeSession.cacheReadTokens / totalInputTokens) * 100 : 0;
        
        res.write(`data: ${JSON.stringify({
          type: 'claude_code_metrics',
          data: {
            inputTokens: activeSession.totalInputTokens,
            outputTokens: activeSession.totalOutputTokens,
            cacheReadTokens: activeSession.cacheReadTokens,
            cacheCreationTokens: activeSession.cacheCreationTokens,
            totalTokens: totalTokens,
            efficiency: Math.round(efficiency * 10) / 10,
            ratePerMin: Math.round((totalTokens / (Date.now() - activeSession.startTime)) * 60000),
            costEstimate: Math.round(((totalInputTokens * 0.003 / 1000) + (activeSession.totalOutputTokens * 0.015 / 1000)) * 10000) / 10000
          }
        })}\n\n`);
        
        // Send budget update
        const fiveHourWindow = 5 * 60 * 60 * 1000;
        const sessionDuration = Date.now() - activeSession.startTime;
        const remainingTime = Math.max(0, fiveHourWindow - sessionDuration);
        
        res.write(`data: ${JSON.stringify({
          type: 'claude_code_budget',
          data: {
            remainingTime: remainingTime,
            elapsedTime: sessionDuration
          }
        })}\n\n`);
        
        // Send status update
        res.write(`data: ${JSON.stringify({
          type: 'claude_code_status',
          data: {
            isRealTimeActive: (Date.now() - activeSession.lastActivity) < 30000,
            hasActiveSession: true,
            lastActivity: activeSession.lastActivity
          }
        })}\n\n`);
      } else {
        // No active session
        res.write(`data: ${JSON.stringify({
          type: 'claude_code_status',
          data: {
            isRealTimeActive: false,
            hasActiveSession: false,
            lastActivity: null
          }
        })}\n\n`);
      }
      
      // Send heartbeat
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now(),
        service: 'claude-code-monitor'
      })}\n\n`);
      
    } catch (error) {
      console.error('Error sending Claude Code SSE update:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Failed to fetch Claude Code session data',
        service: 'claude-code-monitor'
      })}\n\n`);
    }
  }, 2000); // Update every 2 seconds
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
}