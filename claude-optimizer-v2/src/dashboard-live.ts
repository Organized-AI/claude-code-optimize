import { WebSocketServer } from './websocket-server.js';
import { QuotaTracker } from './quota-tracker.js';
import { ContextTracker } from './context-tracker.js';
import { SessionJSONLParser } from './parsers/session-jsonl-parser.js';
import { SessionHistoryService } from './services/session-history.js';
import open from 'open';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect current Claude Code session ID
 */
function getCurrentSessionId(): string | null {
  const home = process.env.HOME || '';
  const cwd = process.cwd();

  // Extract project name from working directory
  const projectMatch = cwd.match(/Claude Code Optimizer/);
  if (!projectMatch) return null;

  // Find the session directory for this project
  const projectsDir = path.join(home, '.claude/projects');
  if (!fs.existsSync(projectsDir)) return null;

  // Look for project directory containing our working directory path
  const dirs = fs.readdirSync(projectsDir);
  for (const dir of dirs) {
    if (dir.includes('Claude-Code-Optimizer')) {
      const sessionDir = path.join(projectsDir, dir);

      // Get most recent .jsonl file
      const files = fs.readdirSync(sessionDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(sessionDir, f)).mtime
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());

      if (files.length > 0) {
        return files[0].name.replace('.jsonl', '');
      }
    }
  }

  return null;
}

async function launchLiveDashboard() {
  console.log('🚀 Starting live dashboard...\n');

  // 1. Initialize components
  const wsServer = new WebSocketServer(3001);
  const quotaTracker = new QuotaTracker();
  const contextTracker = new ContextTracker();
  const parser = new SessionJSONLParser();
  const historyService = new SessionHistoryService();

  await wsServer.start();

  // 2. Function to broadcast current state
  async function broadcastCurrentState() {
    // Get quota status
    const quotaStatus = quotaTracker.getStatus();

    // Get context status
    const contextUsage = await contextTracker.estimateCurrentContext();

    // Get current session data from JSONL parser
    const currentSession = parser.getCurrentSession();
    const sessionId = currentSession?.sessionId || getCurrentSessionId();

    // Get actual Claude process PID
    const claudePid = await getClaudePid();

    // Send session metadata with real data
    if (currentSession) {
      wsServer.broadcast({
        type: 'session:message',
        data: {
          messageType: 'session-metadata',
          sessionId: currentSession.sessionId,
          pid: claudePid,
          projectName: currentSession.projectName,
          startTime: currentSession.startTime.toISOString()
        },
        timestamp: new Date()
      });

      // Send REAL token breakdown from JSONL
      wsServer.broadcast({
        type: 'session:message',
        data: {
          messageType: 'token-breakdown',
          inputTokens: currentSession.tokens.input,
          outputTokens: currentSession.tokens.output,
          cacheTokens: currentSession.tokens.cacheRead,
          cacheCreationTokens: currentSession.tokens.cacheCreation,
          totalTokens: currentSession.tokens.total,
          efficiency: currentSession.metrics.efficiency,
          rate: currentSession.metrics.tokensPerMinute,
          cost: currentSession.metrics.cost
        },
        timestamp: new Date()
      });
    } else if (sessionId) {
      // Fallback to basic session info if parser fails
      wsServer.broadcast({
        type: 'session:message',
        data: {
          messageType: 'session-metadata',
          sessionId: sessionId,
          pid: process.pid,
          projectName: 'Claude Code Optimizer',
          startTime: new Date().toISOString()
        },
        timestamp: new Date()
      });
    }

    // Send quota update
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'quota:update',
        used: quotaStatus.used,
        limit: quotaStatus.limit,
        percent: quotaStatus.percent,
        resetTime: quotaStatus.resetTime
      },
      timestamp: new Date()
    });

    // Send context update
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'context:update',
        used: contextUsage.totalTokens,
        limit: 180000,
        percent: contextUsage.percentUsed,
        status: contextUsage.status
      },
      timestamp: new Date()
    });

    // Send as session:tokens for the hero section (context usage)
    wsServer.broadcast({
      type: 'session:tokens',
      data: {
        current: contextUsage.totalTokens,
        total: 180000,
        percent: contextUsage.percentUsed,
        status: contextUsage.status
      },
      timestamp: new Date()
    });

    // Send session history data (for History tab)
    const analytics = historyService.getAnalytics(7);
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'session-analytics',
        totalSessions: analytics.totalSessions,
        totalTokens: analytics.totalTokens,
        avgSessionTime: analytics.avgSessionTime,
        avgEfficiency: analytics.avgEfficiency,
        totalCost: analytics.totalCost
      },
      timestamp: new Date()
    });

    // Send usage trends (for chart)
    const trends = historyService.getUsageTrends(7);
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'usage-trends',
        trends: trends
      },
      timestamp: new Date()
    });

    // Send weekly quota status
    const weeklyQuota = historyService.getWeeklyQuota();
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'weekly-quota',
        sonnet: weeklyQuota.sonnet,
        opus: weeklyQuota.opus,
        resetDate: weeklyQuota.resetDate,
        sessionsRemaining: weeklyQuota.sessionsRemaining
      },
      timestamp: new Date()
    });

    // Send project phases
    const phases = historyService.getProjectPhases();
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'project-phases',
        architecture: phases.architecture,
        implementation: phases.implementation,
        testing: phases.testing
      },
      timestamp: new Date()
    });

    // Send session history list (last 10 sessions)
    const recentSessions = historyService.getAllSessions(30).slice(0, 10);
    const formattedSessions = recentSessions.map(s => historyService.formatSessionForHistory(s));
    wsServer.broadcast({
      type: 'session:message',
      data: {
        messageType: 'session-history',
        sessions: formattedSessions
      },
      timestamp: new Date()
    });

    return { quotaStatus, contextUsage, sessionId, currentSession };
  }

  // 3. Broadcast initial state
  const initial = await broadcastCurrentState();
  console.log(`\n✅ Live dashboard running`);
  if (initial.sessionId) {
    console.log(`   Session: ${initial.sessionId.substring(0, 8)}... (PID: ${process.pid})`);
  }
  if (initial.currentSession) {
    console.log(`   Total Tokens: ${initial.currentSession.tokens.total.toLocaleString()}`);
    console.log(`   Efficiency: ${initial.currentSession.metrics.efficiency}% cache hit rate`);
  }
  console.log(`   Context: ${initial.contextUsage.totalTokens.toLocaleString()} / 180,000 tokens (${initial.contextUsage.percentUsed.toFixed(1)}%)`);
  console.log(`   Quota: ${initial.quotaStatus.used.toLocaleString()} / ${initial.quotaStatus.limit.toLocaleString()} tokens (${initial.quotaStatus.percent.toFixed(1)}%)`);
  console.log(`   Status: ${initial.contextUsage.status.toUpperCase()}\n`);

  // 4. Update every 5 seconds
  setInterval(async () => {
    const state = await broadcastCurrentState();
    console.log(`📊 Update - Context: ${state.contextUsage.totalTokens.toLocaleString()} | Quota: ${state.quotaStatus.used.toLocaleString()}`);
  }, 5000);

  // 5. Open dashboard (FIXED: Use dashboard-new.html)
  const dashboardPath = path.join(__dirname, '../../dashboard-new.html');
  console.log(`   Opening browser...\n`);
  console.log('   Press Ctrl+C to stop\n');

  await open(dashboardPath);
}

launchLiveDashboard().catch(console.error);
