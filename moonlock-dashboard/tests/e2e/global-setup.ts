/**
 * Global E2E Test Setup
 * Configures test environment and prepares test data
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // Create test directories
  const testDirs = [
    './test-reports',
    './test-results',
    './test-data',
    './test-screenshots'
  ];

  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });

  // Create test data files
  const testData = {
    mockSessions: [
      {
        id: 'session-1',
        project: 'Test Project Alpha',
        timeElapsed: 1800, // 30 minutes
        totalTime: 7200, // 2 hours
        tokensUsed: 1250,
        efficiency: 75
      },
      {
        id: 'session-2',
        project: 'Dashboard Enhancement',
        timeElapsed: 3600, // 1 hour
        totalTime: 10800, // 3 hours
        tokensUsed: 2100,
        efficiency: 82
      }
    ],
    mockQuotas: {
      sonnet: { used: 380, total: 432 },
      opus: { used: 28, total: 36 }
    }
  };

  fs.writeFileSync(
    './test-data/mock-data.json', 
    JSON.stringify(testData, null, 2)
  );

  console.log('✓ Test data files created');

  // Optional: Start additional test services here
  // For example, a mock API server or database

  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;