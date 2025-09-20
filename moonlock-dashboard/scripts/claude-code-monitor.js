#!/usr/bin/env node

/**
 * Local Claude Code Session Monitor
 * 
 * Monitors ~/.claude/projects/*.jsonl files and pushes real-time data to the dashboard
 * This script runs on your local machine and bridges the gap between local JSONL files
 * and the deployed Vercel dashboard.
 */

const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const chokidar = require('chokidar');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rdsfgdtsbyioqilatvxu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const CLAUDE_PROJECTS_DIR = path.join(homedir(), '.claude', 'projects');
const DASHBOARD_URL = 'https://moonlock-dashboard-qr2vc5hz3-jordaaans-projects.vercel.app';
const UPDATE_INTERVAL = 2000; // 2 seconds
const SESSION_ACTIVE_THRESHOLD = 300000; // 5 minutes
const REALTIME_THRESHOLD = 30000; // 30 seconds

console.log('🚀 Claude Code Monitor Starting...');
console.log('📁 Monitoring directory:', CLAUDE_PROJECTS_DIR);
console.log('🌐 Dashboard URL:', DASHBOARD_URL);
console.log('☁️ Supabase URL:', supabaseUrl);

// Global state
let activeSessions = new Map();
let lastSessionData = null;

// Check if Claude projects directory exists
if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
  console.error('❌ Claude projects directory not found:', CLAUDE_PROJECTS_DIR);
  console.log('💡 Make sure Claude Code is installed and has been used at least once');
  process.exit(1);
}

/**
 * Parse a JSONL file to extract session data and token usage
 */
function parseJSONLSession(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
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
        const entry = JSON.parse(line);
        
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
    console.error('❌ Error parsing JSONL file:', filePath, error.message);
    return null;
  }
}

/**
 * Scan for active Claude Code sessions
 */
function scanActiveSessions() {
  const sessions = [];
  
  try {
    const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);
    
    for (const projectDir of projectDirs) {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
      
      if (!fs.statSync(projectPath).isDirectory()) continue;
      
      const files = fs.readdirSync(projectPath);
      
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = path.join(projectPath, file);
          const stats = fs.statSync(filePath);
          const lastModified = stats.mtime.getTime();
          
          // Consider session active if modified within threshold
          const isActive = (Date.now() - lastModified) < SESSION_ACTIVE_THRESHOLD;
          
          if (isActive) {
            const sessionData = parseJSONLSession(filePath);
            if (sessionData) {
              sessions.push({
                ...sessionData,
                projectPath: projectDir,
                lastActivity: lastModified,
                filePath,
                isRealTimeActive: (Date.now() - lastModified) < REALTIME_THRESHOLD
              });
            }
          }
        }
      }
    }
    
    return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
  } catch (error) {
    console.error('❌ Error scanning sessions:', error.message);
    return [];
  }
}

/**
 * Generate session metrics for dashboard
 */
function generateSessionData(sessions) {
  if (sessions.length === 0) {
    return {
      hasActiveSession: false,
      isRealTimeActive: false,
      activeSession: null,
      precisionMetrics: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalTokens: 0,
        efficiency: 0,
        ratePerMin: 0,
        costEstimate: 0
      },
      budgetProgress: {
        current: 0,
        totalBudget: 200000,
        percentage: 0,
        remainingTime: 5 * 60 * 60 * 1000,
        elapsedTime: 0
      }
    };
  }
  
  const activeSession = sessions[0]; // Most recent
  const totalInputTokens = activeSession.totalInputTokens + activeSession.cacheCreationTokens;
  const totalTokens = totalInputTokens + activeSession.totalOutputTokens;
  const efficiency = totalInputTokens > 0 ? (activeSession.cacheReadTokens / totalInputTokens) * 100 : 0;
  
  // Calculate rate per minute
  const sessionDuration = Date.now() - activeSession.startTime;
  const ratePerMin = sessionDuration > 0 ? (totalTokens / sessionDuration) * 60000 : 0;
  
  // Sonnet 4 pricing: $3/M input, $15/M output
  const costEstimate = (totalInputTokens * 0.003 / 1000) + (activeSession.totalOutputTokens * 0.015 / 1000);
  
  // 5-hour window progress
  const fiveHourWindow = 5 * 60 * 60 * 1000;
  const remainingTime = Math.max(0, fiveHourWindow - sessionDuration);
  const percentage = Math.min((sessionDuration / fiveHourWindow) * 100, 100);
  
  return {
    hasActiveSession: true,
    isRealTimeActive: activeSession.isRealTimeActive,
    activeSession: {
      sessionId: activeSession.sessionId,
      startTime: activeSession.startTime,
      status: 'active',
      tokensUsed: totalTokens,
      tokenBudget: 200000
    },
    lastActivity: activeSession.lastActivity,
    precisionMetrics: {
      inputTokens: activeSession.totalInputTokens,
      outputTokens: activeSession.totalOutputTokens,
      cacheReadTokens: activeSession.cacheReadTokens,
      cacheCreationTokens: activeSession.cacheCreationTokens,
      totalTokens: totalTokens,
      efficiency: Math.round(efficiency * 10) / 10,
      ratePerMin: Math.round(ratePerMin),
      costEstimate: Math.round(costEstimate * 10000) / 10000
    },
    budgetProgress: {
      current: totalTokens,
      totalBudget: 200000,
      percentage: Math.round(percentage * 10) / 10,
      remainingTime: remainingTime,
      elapsedTime: sessionDuration
    }
  };
}

/**
 * Main monitoring loop
 */
function monitorSessions() {
  const sessions = scanActiveSessions();
  const sessionData = generateSessionData(sessions);
  
  // Check if data has changed
  const dataChanged = JSON.stringify(sessionData) !== JSON.stringify(lastSessionData);
  
  if (dataChanged || !lastSessionData) {
    lastSessionData = sessionData;
    
    // Log current status
    if (sessionData.hasActiveSession) {
      const session = sessionData.activeSession;
      const metrics = sessionData.precisionMetrics;
      console.log(`🔴 LIVE SESSION: ${session.sessionId.slice(-8)}`);
      console.log(`📊 Tokens: ${metrics.inputTokens.toLocaleString()} IN / ${metrics.outputTokens.toLocaleString()} OUT`);
      console.log(`💎 Cache: ${metrics.cacheReadTokens.toLocaleString()} read (${metrics.efficiency}% efficiency)`);
      console.log(`⚡ Rate: ${metrics.ratePerMin} tokens/min | 💰 Cost: $${metrics.costEstimate}`);
      
      if (sessionData.isRealTimeActive) {
        console.log(`🔥 REAL-TIME ACTIVE (modified ${Math.round((Date.now() - sessionData.lastActivity) / 1000)}s ago)`);
      }
    } else {
      console.log('💤 No active Claude Code sessions detected');
    }
  }
  
  // Update global state for file watcher
  activeSessions.clear();
  sessions.forEach(session => {
    activeSessions.set(session.sessionId, session);
  });
  
  // Sync session data to Supabase
  if (sessionData.hasActiveSession) {
    syncSessionDataToSupabase(sessionData);
  }
}

/**
 * File system watcher for real-time updates
 */
function startFileWatcher() {
  console.log('👀 Starting file system watcher...');
  
  const watcher = chokidar.watch(path.join(CLAUDE_PROJECTS_DIR, '**/*.jsonl'), {
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', (filePath) => {
    console.log(`📝 File changed: ${path.basename(filePath)}`);
    monitorSessions();
  });
  
  watcher.on('add', (filePath) => {
    console.log(`📄 New file: ${path.basename(filePath)}`);
    monitorSessions();
  });
  
  watcher.on('error', (error) => {
    console.error('👀 Watcher error:', error.message);
  });
  
  return watcher;
}

/**
 * Start monitoring
 */
function start() {
  console.log('🎯 Performing initial session scan...');
  monitorSessions();
  
  console.log('⏰ Starting periodic monitoring...');
  setInterval(monitorSessions, UPDATE_INTERVAL);
  
  startFileWatcher();
  
  console.log('✅ Claude Code Monitor is running!');
  console.log('📺 Open dashboard:', DASHBOARD_URL);
  console.log('🛑 Press Ctrl+C to stop');
}

/**
 * Sync session data to Supabase
 */
async function syncSessionDataToSupabase(sessionData) {
  try {
    const { data, error } = await supabase
      .from('claude_sessions')
      .upsert({
        session_id: sessionData.activeSession.sessionId,
        start_time: new Date(sessionData.activeSession.startTime).toISOString(),
        tokens_used: sessionData.activeSession.tokensUsed,
        token_budget: sessionData.activeSession.tokenBudget,
        last_activity: new Date(sessionData.lastActivity).toISOString(),
        is_realtime_active: sessionData.isRealTimeActive,
        input_tokens: sessionData.precisionMetrics.inputTokens,
        output_tokens: sessionData.precisionMetrics.outputTokens,
        cache_read_tokens: sessionData.precisionMetrics.cacheReadTokens,
        cache_creation_tokens: sessionData.precisionMetrics.cacheCreationTokens,
        total_tokens: sessionData.precisionMetrics.totalTokens,
        efficiency: sessionData.precisionMetrics.efficiency,
        rate_per_min: sessionData.precisionMetrics.ratePerMin,
        cost_estimate: sessionData.precisionMetrics.costEstimate,
        budget_percentage: sessionData.budgetProgress.percentage,
        remaining_time: sessionData.budgetProgress.remainingTime,
        elapsed_time: sessionData.budgetProgress.elapsedTime,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });
    
    if (error) {
      console.error('❌ Error syncing to Supabase:', error.message);
    } else {
      console.log('☁️ Synced to cloud database');
    }
  } catch (error) {
    console.error('❌ Supabase sync error:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Claude Code Monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Claude Code Monitor...');
  process.exit(0);
});

// Start the monitor
start();