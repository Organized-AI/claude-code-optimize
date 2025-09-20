/**
 * Global E2E Test Teardown
 * Cleans up test environment and archives results
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test environment cleanup...');

  // Archive test results if they exist
  const resultsDir = './test-results';
  const reportsDir = './test-reports';
  
  if (fs.existsSync(resultsDir)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `e2e-test-results-${timestamp}`;
    
    try {
      // Create archive directory
      const archiveDir = `./test-archives/${archiveName}`;
      if (!fs.existsSync('./test-archives')) {
        fs.mkdirSync('./test-archives', { recursive: true });
      }
      fs.mkdirSync(archiveDir, { recursive: true });

      // Copy test results
      if (fs.existsSync(resultsDir)) {
        fs.cpSync(resultsDir, `${archiveDir}/results`, { recursive: true });
      }
      
      if (fs.existsSync(reportsDir)) {
        fs.cpSync(reportsDir, `${archiveDir}/reports`, { recursive: true });
      }

      console.log(`✓ Test results archived to: ${archiveDir}`);
    } catch (error) {
      console.warn('⚠ Failed to archive test results:', error);
    }
  }

  // Clean up temporary test data (optional)
  const tempDirs = ['./test-data'];
  
  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✓ Cleaned up: ${dir}`);
      } catch (error) {
        console.warn(`⚠ Failed to clean up ${dir}:`, error);
      }
    }
  });

  // Optional: Stop additional test services here
  // For example, mock API servers or test databases

  console.log('✅ E2E test environment cleanup complete');
}

export default globalTeardown;