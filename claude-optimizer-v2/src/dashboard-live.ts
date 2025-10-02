import { WebSocketServer } from './websocket-server.js';
import { QuotaTracker } from './quota-tracker.js';
import { ContextTracker } from './context-tracker.js';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function launchLiveDashboard() {
  console.log('🚀 Starting live dashboard...\n');

  // 1. Initialize components
  const wsServer = new WebSocketServer(3001);
  const quotaTracker = new QuotaTracker();
  const contextTracker = new ContextTracker();

  await wsServer.start();

  // 2. Function to broadcast current state
  async function broadcastCurrentState() {
    // Get quota status
    const quotaStatus = quotaTracker.getStatus();

    // Get context status
    const contextUsage = await contextTracker.estimateCurrentContext();

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

    return { quotaStatus, contextUsage };
  }

  // 3. Broadcast initial state
  const initial = await broadcastCurrentState();
  console.log(`\n✅ Live dashboard running`);
  console.log(`   Context: ${initial.contextUsage.totalTokens.toLocaleString()} / 180,000 tokens (${initial.contextUsage.percentUsed.toFixed(1)}%)`);
  console.log(`   Quota: ${initial.quotaStatus.used.toLocaleString()} / ${initial.quotaStatus.limit.toLocaleString()} tokens (${initial.quotaStatus.percent.toFixed(1)}%)`);
  console.log(`   Status: ${initial.contextUsage.status.toUpperCase()}\n`);

  // 4. Update every 5 seconds
  setInterval(async () => {
    const state = await broadcastCurrentState();
    console.log(`📊 Update - Context: ${state.contextUsage.totalTokens.toLocaleString()} | Quota: ${state.quotaStatus.used.toLocaleString()}`);
  }, 5000);

  // 5. Open dashboard
  const dashboardPath = path.join(__dirname, '../../dashboard.html');
  console.log(`   Opening browser...\n`);
  console.log('   Press Ctrl+C to stop\n');

  await open(dashboardPath);
}

launchLiveDashboard().catch(console.error);
