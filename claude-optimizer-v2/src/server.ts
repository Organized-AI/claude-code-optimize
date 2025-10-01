#!/usr/bin/env node

/**
 * Server Entry Point
 * Starts WebSocket server for dashboard communication
 * Can be run standalone or integrated with calendar watcher
 */

import { WebSocketServer } from './websocket-server.js';

async function main() {
  console.log('🚀 Starting Claude Optimizer Server...\n');

  const server = new WebSocketServer(3001);

  try {
    await server.start();

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n📴 Shutting down server...');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep process alive
    console.log('  Server running. Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
