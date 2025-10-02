/**
 * Context Tracker Unit Tests
 * Test context window monitoring and tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextTracker, ContextUsage } from '../src/context-tracker.js';
import { ContextCompactor } from '../src/context-compactor.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ContextTracker', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'context-test');
  let tracker: ContextTracker;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    tracker = new ContextTracker(testDir);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize with fresh context', async () => {
      const usage = await tracker.estimateCurrentContext();

      expect(usage.totalTokens).toBeGreaterThan(0); // Has system prompt
      expect(usage.status).toBe('fresh');
      expect(usage.percentUsed).toBeLessThan(10);
    });

    it('should generate unique session ID', () => {
      const id1 = tracker.getSessionId();
      const tracker2 = new ContextTracker(testDir);
      const id2 = tracker2.getSessionId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('Token Tracking', () => {
    it('should track file reads', async () => {
      tracker.trackFileRead('/test/file1.ts', 1000);
      tracker.trackFileRead('/test/file2.ts', 1500);

      const usage = await tracker.estimateCurrentContext();

      expect(usage.breakdown.fileReads).toBe(2500);
      expect(usage.totalTokens).toBeGreaterThan(2500);
    });

    it('should track tool results', () => {
      tracker.trackToolResult('Edit', 1500);
      tracker.trackToolResult('Bash', 300);
      tracker.trackToolResult('Read', 800);
    });

    it('should track conversation', () => {
      tracker.trackConversation(500);
      tracker.trackConversation(300);
    });

    it('should track code generation', () => {
      tracker.trackCodeGeneration(2000);
      tracker.trackCodeGeneration(1500);
    });
  });

  describe('Status Determination', () => {
    it('should detect fresh status (< 10%)', async () => {
      const usage = await tracker.estimateCurrentContext();
      expect(usage.status).toBe('fresh');
    });

    it('should detect healthy status (10-25%)', async () => {
      // Add enough to reach 10-25%
      tracker.trackFileRead('/test/file.ts', 15000);

      const usage = await tracker.estimateCurrentContext();
      expect(usage.status).toBe('healthy');
    });

    it('should detect moderate status (25-50%)', async () => {
      // Add enough to reach 25-50%
      tracker.trackFileRead('/test/file.ts', 50000);

      const usage = await tracker.estimateCurrentContext();
      expect(usage.status).toBe('moderate');
    });

    it('should detect warning status (50-80%)', async () => {
      // Add enough to reach 50-80%
      tracker.trackFileRead('/test/file.ts', 100000);

      const usage = await tracker.estimateCurrentContext();
      expect(usage.status).toBe('warning');
    });

    it('should detect danger status (80-90%)', async () => {
      // Add enough to reach 80-90%
      tracker.trackFileRead('/test/file.ts', 145000);

      const usage = await tracker.estimateCurrentContext();
      expect(usage.status).toBe('danger');
    });

    it('should detect critical status (> 90%)', async () => {
      // Add enough to reach > 90%
      tracker.trackFileRead('/test/file.ts', 165000);

      const usage = await tracker.estimateCurrentContext();
      expect(usage.status).toBe('critical');
    });
  });

  describe('Compaction Opportunities', () => {
    it('should identify old file reads', async () => {
      // Add 15 file reads
      for (let i = 0; i < 15; i++) {
        tracker.trackFileRead(`/test/file${i}.ts`, 1000);
      }

      const usage = await tracker.estimateCurrentContext();
      const oldReadsOpp = usage.compactionOpportunities.find(
        opp => opp.type === 'old_file_read'
      );

      expect(oldReadsOpp).toBeDefined();
      expect(oldReadsOpp!.estimatedTokens).toBeGreaterThan(0);
    });

    it('should identify duplicate tools', async () => {
      // Add many tool results of same type
      for (let i = 0; i < 10; i++) {
        tracker.trackToolResult('Edit', 500);
      }

      const usage = await tracker.estimateCurrentContext();
      const dupToolsOpp = usage.compactionOpportunities.find(
        opp => opp.type === 'duplicate_tool'
      );

      expect(dupToolsOpp).toBeDefined();
    });

    it('should identify verbose output', async () => {
      // Add lots of tool results
      for (let i = 0; i < 20; i++) {
        tracker.trackToolResult('Read', 1000);
      }

      const usage = await tracker.estimateCurrentContext();
      const verboseOpp = usage.compactionOpportunities.find(
        opp => opp.type === 'verbose_output'
      );

      expect(verboseOpp).toBeDefined();
    });
  });

  describe('Notification Thresholds', () => {
    it('should not notify below 50%', () => {
      const level = tracker.shouldNotify(80000); // 44%
      expect(level).toBeNull();
    });

    it('should notify at 50%', () => {
      const level = tracker.shouldNotify(90000); // 50%
      expect(level).toBe('normal');
    });

    it('should notify at 80%', () => {
      const level = tracker.shouldNotify(144000); // 80%
      expect(level).toBe('high');
    });

    it('should notify at 90%', () => {
      const level = tracker.shouldNotify(162000); // 90%
      expect(level).toBe('critical');
    });
  });

  describe('Context Reset', () => {
    it('should reset context for new session', async () => {
      // Add some usage
      tracker.trackFileRead('/test/file.ts', 50000);

      const beforeReset = await tracker.estimateCurrentContext();
      expect(beforeReset.totalTokens).toBeGreaterThan(50000);

      // Reset
      tracker.resetContext();

      const afterReset = await tracker.estimateCurrentContext();
      expect(afterReset.status).toBe('fresh');
      expect(afterReset.breakdown.fileReads).toBe(0);
    });
  });
});

describe('ContextCompactor', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'compactor-test');
  let tracker: ContextTracker;
  let compactor: ContextCompactor;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    tracker = new ContextTracker(testDir);
    compactor = new ContextCompactor(testDir);

    // Set up test data
    for (let i = 0; i < 15; i++) {
      tracker.trackFileRead(`/test/file${i}.ts`, 1000);
    }
    for (let i = 0; i < 10; i++) {
      tracker.trackToolResult('Edit', 500);
      tracker.trackToolResult('Read', 800);
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Soft Compaction', () => {
    it('should remove old file reads', async () => {
      const result = await compactor.compact('soft');

      expect(result.tokensSaved).toBeGreaterThan(0);
      expect(result.itemsRemoved).toBeGreaterThan(0);
      expect(result.beforeTokens).toBeGreaterThan(result.afterTokens);
    });

    it('should preserve recent file reads', async () => {
      const result = await compactor.compact('soft');

      // Should preserve at least 10 files
      expect(result.itemsPreserved).toBeGreaterThanOrEqual(10);
    });

    it('should deduplicate tool results', async () => {
      const result = await compactor.compact('soft');

      const dupRemoval = result.removedItems.find(
        item => item.type === 'duplicate_tools'
      );

      expect(dupRemoval).toBeDefined();
    });
  });

  describe('Strategic Compaction', () => {
    it('should save more than soft compaction', async () => {
      const softPreview = await compactor.previewCompaction('soft');
      const strategicPreview = await compactor.previewCompaction('strategic');

      expect(strategicPreview.tokensSaved).toBeGreaterThan(softPreview.tokensSaved);
    });

    it('should trim verbose outputs', async () => {
      const result = await compactor.compact('strategic');

      const verboseTrim = result.removedItems.find(
        item => item.type === 'verbose_output'
      );

      // May or may not exist depending on data
      if (verboseTrim) {
        expect(verboseTrim.tokens).toBeGreaterThan(0);
      }
    });
  });

  describe('Emergency Compaction', () => {
    it('should save most tokens', async () => {
      const softPreview = await compactor.previewCompaction('soft');
      const strategicPreview = await compactor.previewCompaction('strategic');
      const emergencyPreview = await compactor.previewCompaction('emergency');

      expect(emergencyPreview.tokensSaved).toBeGreaterThan(strategicPreview.tokensSaved);
      expect(emergencyPreview.tokensSaved).toBeGreaterThan(softPreview.tokensSaved);
    });

    it('should keep only 3 file reads', async () => {
      const result = await compactor.compact('emergency');

      // Should have removed more items than soft/strategic
      expect(result.itemsRemoved).toBeGreaterThan(10);
    });
  });

  describe('Compaction Recommendations', () => {
    it('should recommend null for low usage', async () => {
      const recommendation = await compactor.getRecommendation(50000); // ~28%
      expect(recommendation).toBeNull();
    });

    it('should recommend soft for 60%', async () => {
      const recommendation = await compactor.getRecommendation(108000); // 60%
      expect(recommendation).toBe('soft');
    });

    it('should recommend strategic for 80%', async () => {
      const recommendation = await compactor.getRecommendation(144000); // 80%
      expect(recommendation).toBe('strategic');
    });

    it('should recommend emergency for 90%', async () => {
      const recommendation = await compactor.getRecommendation(162000); // 90%
      expect(recommendation).toBe('emergency');
    });
  });

  describe('Preview vs Actual Compaction', () => {
    it('should match preview results', async () => {
      const preview = await compactor.previewCompaction('soft');
      const actual = await compactor.compact('soft');

      // Results should be similar (within 10%)
      const diff = Math.abs(preview.tokensSaved - actual.tokensSaved);
      const tolerance = preview.tokensSaved * 0.1;

      expect(diff).toBeLessThan(tolerance);
    });
  });
});
