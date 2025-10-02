#!/usr/bin/env node

/**
 * Dashboard Connectivity & Data Flow Tests
 * Tests WebSocket connection, event broadcasting, and data flow
 */

import { WebSocketServer } from './dist/websocket-server.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const io = require('socket.io-client');

// ANSI colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(emoji, message, color = 'reset') {
  console.log(`${emoji} ${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, testName) {
  if (condition) {
    testResults.passed++;
    testResults.tests.push({ name: testName, passed: true });
    log('✅', `PASS: ${testName}`, 'green');
  } else {
    testResults.failed++;
    testResults.tests.push({ name: testName, passed: false });
    log('❌', `FAIL: ${testName}`, 'red');
  }
}

// Test Suite
async function runTests() {
  header('Dashboard Connectivity & Data Flow Tests');

  // Test 1: Server Startup
  log('🚀', 'Starting WebSocket server...', 'blue');
  const server = new WebSocketServer(3002); // Use different port for testing

  try {
    await server.start();
    assert(true, 'Server starts successfully');
  } catch (error) {
    assert(false, 'Server starts successfully');
    console.error(error);
    return;
  }

  // Wait a moment for server to stabilize
  await sleep(500);

  // Test 2: Client Connection
  log('🔌', 'Testing client connection...', 'blue');
  const client = io('http://localhost:3002', {
    transports: ['websocket'],
    reconnection: false
  });

  const connectionTest = new Promise((resolve) => {
    client.on('connect', () => {
      assert(true, 'Client connects to WebSocket server');
      resolve(true);
    });

    client.on('connect_error', (error) => {
      assert(false, 'Client connects to WebSocket server');
      console.error('Connection error:', error);
      resolve(false);
    });

    setTimeout(() => {
      if (!client.connected) {
        assert(false, 'Client connects to WebSocket server');
        resolve(false);
      }
    }, 3000);
  });

  await connectionTest;
  await sleep(500);

  // Test 3: Event Broadcasting - Session Start
  log('📡', 'Testing session:start event broadcast...', 'blue');
  const sessionStartTest = new Promise((resolve) => {
    client.on('session:start', (data) => {
      assert(data.data && data.data.sessionId, 'Receives session:start event');
      assert(data.timestamp !== undefined, 'Event includes timestamp');
      resolve(true);
    });

    server.broadcast({
      type: 'session:start',
      data: {
        sessionId: 'test-session-123',
        model: 'claude-sonnet-4-20250514',
        cwd: '/test/path'
      }
    });

    setTimeout(() => resolve(false), 2000);
  });

  await sessionStartTest;
  await sleep(300);

  // Test 4: Event Broadcasting - Token Update
  log('📊', 'Testing session:tokens event broadcast...', 'blue');
  const tokenUpdateTest = new Promise((resolve) => {
    client.on('session:tokens', (data) => {
      assert(data.data && data.data.totalTokens === 150000, 'Receives session:tokens event with correct data');
      resolve(true);
    });

    server.broadcast({
      type: 'session:tokens',
      data: {
        totalTokens: 150000,
        contextTokens: 45000,
        quotaTokens: 150000
      }
    });

    setTimeout(() => resolve(false), 2000);
  });

  await tokenUpdateTest;
  await sleep(300);

  // Test 5: Event Broadcasting - Quota Update
  log('⏱️', 'Testing quota:update event broadcast...', 'blue');
  const quotaUpdateTest = new Promise((resolve) => {
    client.on('quota:update', (data) => {
      assert(data.data && data.data.fiveHourTokens === 280000, 'Receives quota:update event');
      assert(data.data.weeklyTokens === 2800000, 'Quota data includes weekly tokens');
      resolve(true);
    });

    server.broadcast({
      type: 'quota:update',
      data: {
        fiveHourTokens: 280000,
        fiveHourRemaining: '1h 25m',
        weeklyTokens: 2800000,
        weeklyDaysRemaining: '4 days'
      }
    });

    setTimeout(() => resolve(false), 2000);
  });

  await quotaUpdateTest;
  await sleep(300);

  // Test 6: Event Broadcasting - Context Update
  log('🧠', 'Testing context:update event broadcast...', 'blue');
  const contextUpdateTest = new Promise((resolve) => {
    client.on('context:update', (data) => {
      assert(data.data && data.data.hitRate !== undefined, 'Receives context:update event');
      resolve(true);
    });

    server.broadcast({
      type: 'context:update',
      data: {
        hitRate: 15.5,
        totalTokens: 95000,
        percentUsed: 52.8
      }
    });

    setTimeout(() => resolve(false), 2000);
  });

  await contextUpdateTest;
  await sleep(300);

  // Test 7: Multiple Event Sequence
  log('🔄', 'Testing rapid event sequence...', 'blue');
  const eventsReceived = [];

  client.on('test:event1', () => eventsReceived.push(1));
  client.on('test:event2', () => eventsReceived.push(2));
  client.on('test:event3', () => eventsReceived.push(3));

  server.broadcast({ type: 'test:event1', data: {} });
  server.broadcast({ type: 'test:event2', data: {} });
  server.broadcast({ type: 'test:event3', data: {} });

  await sleep(1000);
  assert(eventsReceived.length === 3, 'Handles rapid event sequence');
  assert(eventsReceived[0] === 1 && eventsReceived[2] === 3, 'Events arrive in correct order');

  // Test 8: Client Disconnect and Reconnect
  log('🔌', 'Testing client disconnect handling...', 'blue');
  client.disconnect();
  await sleep(500);
  assert(!client.connected, 'Client disconnects cleanly');

  // Test 9: Server Health Check
  log('💚', 'Testing health endpoint...', 'blue');
  try {
    const response = await fetch('http://localhost:3002/health');
    const health = await response.json();
    assert(health.status === 'healthy', 'Health endpoint returns healthy status');
    assert(typeof health.clients === 'number', 'Health endpoint includes client count');
    assert(health.timestamp !== undefined, 'Health endpoint includes timestamp');
  } catch (error) {
    assert(false, 'Health endpoint is accessible');
    console.error('Health check error:', error);
  }

  // Test 10: Server Shutdown
  log('📴', 'Testing graceful server shutdown...', 'blue');
  try {
    await server.stop();
    assert(true, 'Server shuts down gracefully');
  } catch (error) {
    assert(false, 'Server shuts down gracefully');
    console.error('Shutdown error:', error);
  }

  // Final Results
  header('Test Results Summary');

  console.log(`${colors.bold}Total Tests:${colors.reset} ${testResults.passed + testResults.failed}`);
  console.log(`${colors.green}${colors.bold}✅ Passed:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}${colors.bold}❌ Failed:${colors.reset} ${testResults.failed}`);

  const passRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`${colors.cyan}${colors.bold}Pass Rate:${colors.reset} ${passRate}%\n`);

  if (testResults.failed > 0) {
    console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  ❌ ${t.name}`));
    console.log('');
  }

  const exitCode = testResults.failed > 0 ? 1 : 0;

  if (exitCode === 0) {
    log('🎉', 'All tests passed! Dashboard is ready for production.', 'green');
  } else {
    log('⚠️', 'Some tests failed. Please review the results above.', 'yellow');
  }

  process.exit(exitCode);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
