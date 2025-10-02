import { WebSocketServer } from './websocket-server.js';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function launchDashboard() {
  console.log('🚀 Starting dashboard MVP...\n');

  // 1. Start WebSocket server
  const wsServer = new WebSocketServer(3001);
  await wsServer.start();

  // 2. Send mock data every 2 seconds
  let tokens = 0;
  setInterval(() => {
    tokens += 500;

    wsServer.broadcast({
      type: 'session:tokens',
      data: {
        current: tokens,
        total: 200000,
        percent: (tokens / 200000) * 100
      },
      timestamp: new Date()
    });

    console.log(`📊 Broadcast: ${tokens} tokens (${Math.round((tokens / 200000) * 100)}%)`);
  }, 2000);

  // 3. Open dashboard
  const dashboardPath = path.join(__dirname, '../../dashboard.html');
  console.log(`\n✅ Server running on ws://localhost:3001`);
  console.log(`📊 Opening dashboard: ${dashboardPath}\n`);
  console.log('   You should see numbers updating in your browser\n');
  console.log('   Press Ctrl+C to stop\n');

  await open(dashboardPath);
}

launchDashboard().catch(console.error);
