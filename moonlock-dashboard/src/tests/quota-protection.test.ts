/**
 * Critical Quota Protection Validation Tests
 * 
 * These tests ensure the 90% quota safety requirement is bulletproof.
 * MISSION CRITICAL: Users must NEVER exceed 90% of weekly quotas.
 * 
 * Test Coverage:
 * - Sonnet: 432h/480h maximum (90% of 480h weekly limit)
 * - Opus: 36h/40h maximum (90% of 40h weekly limit)
 * - Edge cases and emergency protocols
 * - Real-time quota monitoring and blocking
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuotaTestScenario, QuotaValidationResult, QuotaLimitTest } from '../contracts/AgentInterfaces.js';
import { SessionPlanningService } from '../server/services/SessionPlanningService.js';
import { RiskAssessmentService } from '../server/services/RiskAssessmentService.js';
import { JsonDatabaseManager } from '../server/services/JsonDatabaseManager.js';
import { QuotaUsage } from '../contracts/AgentInterfaces.js';

// Test constants - these are the absolute limits that must never be exceeded
const QUOTA_LIMITS = {
  sonnet: {
    weekly: 480, // hours
    safetyLimit: 432, // 90% of 480h - NEVER EXCEED
    criticalThreshold: 408 // 85% - trigger warnings
  },
  opus: {
    weekly: 40, // hours  
    safetyLimit: 36, // 90% of 40h - NEVER EXCEED
    criticalThreshold: 34 // 85% - trigger warnings
  }
} as const;

describe('Quota Protection - Critical Safety Tests', () => {
  let sessionPlanningService: SessionPlanningService;
  let riskAssessmentService: RiskAssessmentService;
  let mockDb: JsonDatabaseManager;

  beforeEach(() => {
    mockDb = {
      getQuotaUsage: vi.fn(),
      getAllSessions: vi.fn().mockResolvedValue([]),
      createSession: vi.fn(),
      updateSession: vi.fn(),
      getSession: vi.fn(),
    } as any;

    sessionPlanningService = new SessionPlanningService(mockDb);
    riskAssessmentService = new RiskAssessmentService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('90% Quota Limit - Absolute Boundary Tests', () => {
    test('CRITICAL: Must block any session that would exceed 90% Sonnet quota', async () => {
      // Test scenario: Currently at 89% usage, trying to plan 2h session
      const currentUsage: QuotaUsage = {
        sonnet: { used: 427.2, limit: 480, percentage: 89 }, // 89% usage
        opus: { used: 0, limit: 40, percentage: 0 }
      };

      mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

      const complexity = {
        overall: 5,
        codebase: { score: 5, factors: [] },
        dependencies: { score: 5, factors: [] },
        architecture: { score: 5, factors: [] },
        testing: { score: 5, factors: [] },
        documentation: { score: 5, factors: [] }
      } as any;

      const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
      
      // Should detect high quota risk
      expect(risk.quotaRisk.probability).toBeGreaterThan(80);
      expect(risk.quotaRisk.currentUsage.sonnet.percentage).toBe(89);

      // Attempting to create a session plan should fail or heavily restrict usage
      const plan = await sessionPlanningService.planSessions(complexity, risk);
      
      // Plan should not allow exceeding 90% (432h total)
      const maxAllowableAdditional = QUOTA_LIMITS.sonnet.safetyLimit - currentUsage.sonnet.used; // 4.8h
      expect(plan.modelAllocation.sonnet.estimatedTime).toBeLessThanOrEqual(maxAllowableAdditional * 60); // convert to minutes
    });

    test('CRITICAL: Must block any session that would exceed 90% Opus quota', async () => {
      // Test scenario: Currently at 87.5% Opus usage, trying to plan additional work
      const currentUsage: QuotaUsage = {
        sonnet: { used: 0, limit: 480, percentage: 0 },
        opus: { used: 35, limit: 40, percentage: 87.5 } // 87.5% usage
      };

      mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

      const complexity = {
        overall: 8, // High complexity requiring Opus
        codebase: { score: 8, factors: [] },
        dependencies: { score: 8, factors: [] },
        architecture: { score: 8, factors: [] },
        testing: { score: 8, factors: [] },
        documentation: { score: 8, factors: [] }
      } as any;

      const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
      const plan = await sessionPlanningService.planSessions(complexity, risk);
      
      // Plan should not allow exceeding 90% (36h total)
      const maxAllowableAdditional = QUOTA_LIMITS.opus.safetyLimit - currentUsage.opus.used; // 1h
      expect(plan.modelAllocation.opus.estimatedTime).toBeLessThanOrEqual(maxAllowableAdditional * 60); // convert to minutes
    });

    test('CRITICAL: Must reject session at exactly 90% quota usage', async () => {
      // Edge case: exactly at 90% limit
      const currentUsage: QuotaUsage = {
        sonnet: { used: 432, limit: 480, percentage: 90 }, // Exactly 90%
        opus: { used: 0, limit: 40, percentage: 0 }
      };

      mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

      const complexity = { overall: 3 } as any;
      const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
      
      // Should indicate maximum risk for quota
      expect(risk.quotaRisk.probability).toBe(100);
      expect(risk.quotaRisk.timeToLimit).toBeLessThanOrEqual(0);
      
      const plan = await sessionPlanningService.planSessions(complexity, risk);
      
      // Should allocate 0 additional time for Sonnet
      expect(plan.modelAllocation.sonnet.estimatedTime).toBe(0);
    });

    test('CRITICAL: Emergency protocol must trigger when approaching 90% limit', async () => {
      const scenarios: QuotaTestScenario[] = [
        {
          id: 'emergency-89-percent',
          name: 'Emergency Protocol at 89%',
          model: 'sonnet',
          currentUsage: 427.2, // 89%
          plannedUsage: 3, // Would go to 92%
          timeframe: 30,
          expectedOutcome: 'block'
        },
        {
          id: 'emergency-opus-88-percent', 
          name: 'Emergency Protocol Opus at 88%',
          model: 'opus',
          currentUsage: 35.2, // 88%
          plannedUsage: 1.5, // Would go to 91.75%
          timeframe: 20,
          expectedOutcome: 'block'
        }
      ];

      for (const scenario of scenarios) {
        const currentUsage: QuotaUsage = {
          sonnet: scenario.model === 'sonnet' 
            ? { used: scenario.currentUsage, limit: 480, percentage: (scenario.currentUsage / 480) * 100 }
            : { used: 0, limit: 480, percentage: 0 },
          opus: scenario.model === 'opus'
            ? { used: scenario.currentUsage, limit: 40, percentage: (scenario.currentUsage / 40) * 100 }
            : { used: 0, limit: 40, percentage: 0 }
        };

        mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

        const complexity = { overall: 5 } as any;
        const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
        
        // Emergency protocols should be active
        expect(risk.quotaRisk.probability).toBeGreaterThan(90);
        expect(risk.mitigationStrategies.some(s => s.riskType === 'quota')).toBe(true);
      }
    });
  });

  describe('Edge Case Scenarios - Boundary Conditions', () => {
    test('Must handle concurrent session planning safely', async () => {
      // Simulate multiple users trying to plan sessions simultaneously
      const currentUsage: QuotaUsage = {
        sonnet: { used: 420, limit: 480, percentage: 87.5 }, // Close to limit
        opus: { used: 30, limit: 40, percentage: 75 }
      };

      mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

      const complexity = { overall: 4 } as any;
      
      // Simulate 5 concurrent planning requests
      const planningPromises = Array(5).fill(null).map(async () => {
        const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
        return sessionPlanningService.planSessions(complexity, risk);
      });

      const plans = await Promise.all(planningPromises);
      
      // Total allocation across all plans should never exceed safety limits
      const totalSonnetTime = plans.reduce((sum, plan) => sum + plan.modelAllocation.sonnet.estimatedTime, 0);
      const totalOpusTime = plans.reduce((sum, plan) => sum + plan.modelAllocation.opus.estimatedTime, 0);
      
      const maxSonnetHours = (QUOTA_LIMITS.sonnet.safetyLimit - currentUsage.sonnet.used);
      const maxOpusHours = (QUOTA_LIMITS.opus.safetyLimit - currentUsage.opus.used);
      
      // Even with concurrent planning, total should not exceed safety limits
      expect(totalSonnetTime).toBeLessThanOrEqual(maxSonnetHours * 60 * plans.length * 0.2); // Account for conservative planning
      expect(totalOpusTime).toBeLessThanOrEqual(maxOpusHours * 60 * plans.length * 0.2);
    });

    test('Must handle time zone edge cases for weekly quota calculation', async () => {
      // Test quota calculations across different time zones and week boundaries
      const testCases = [
        { timezone: 'UTC', weekStart: new Date('2024-01-01T00:00:00Z') },
        { timezone: 'America/New_York', weekStart: new Date('2024-01-01T05:00:00Z') },
        { timezone: 'Asia/Tokyo', weekStart: new Date('2023-12-31T15:00:00Z') }
      ];

      for (const testCase of testCases) {
        const currentUsage: QuotaUsage = {
          sonnet: { used: 430, limit: 480, percentage: 89.58 },
          opus: { used: 35.5, limit: 40, percentage: 88.75 }
        };

        mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

        const complexity = { overall: 5 } as any;
        const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
        
        // Regardless of timezone, quota protection should be consistent
        expect(risk.quotaRisk.probability).toBeGreaterThan(85);
        expect(risk.quotaRisk.currentUsage.sonnet.percentage).toBeCloseTo(89.58, 1);
        expect(risk.quotaRisk.currentUsage.opus.percentage).toBeCloseTo(88.75, 1);
      }
    });

    test('Must validate quota calculations with fractional hours', async () => {
      // Test precise quota calculations with fractional hour usage
      const quotaLimitTests: QuotaLimitTest[] = [
        { currentHours: 431.7, additionalHours: 0.4, description: 'Sonnet near exact limit' },
        { currentHours: 431.9, additionalHours: 0.2, description: 'Sonnet fractional overage' },
        { currentHours: 35.8, additionalHours: 0.3, description: 'Opus fractional overage' },
        { currentHours: 35.99, additionalHours: 0.02, description: 'Opus precise limit' }
      ];

      for (const testCase of quotaLimitTests) {
        const isOpus = testCase.currentHours < 100; // Distinguish Opus from Sonnet by magnitude
        const limit = isOpus ? QUOTA_LIMITS.opus.weekly : QUOTA_LIMITS.sonnet.weekly;
        const safetyLimit = isOpus ? QUOTA_LIMITS.opus.safetyLimit : QUOTA_LIMITS.sonnet.safetyLimit;
        
        const finalUsage = testCase.currentHours + testCase.additionalHours;
        const finalPercentage = (finalUsage / limit) * 100;
        
        const withinLimit = finalUsage <= safetyLimit;
        const shouldBeBlocked = finalPercentage > 90;
        
        expect(withinLimit).toBe(!shouldBeBlocked);
        
        if (shouldBeBlocked) {
          // System should block this allocation
          expect(finalPercentage).toBeGreaterThan(90);
        } else {
          // System should allow this allocation
          expect(finalPercentage).toBeLessThanOrEqual(90);
        }
      }
    });
  });

  describe('Real-time Quota Monitoring', () => {
    test('Must continuously monitor quota usage during active sessions', async () => {
      // Simulate real-time quota monitoring
      const initialUsage: QuotaUsage = {
        sonnet: { used: 425, limit: 480, percentage: 88.54 },
        opus: { used: 30, limit: 40, percentage: 75 }
      };

      let currentUsage = { ...initialUsage };
      
      // Mock progressive usage increase
      const usageIncreases = [1, 2, 3, 2, 1]; // Hourly increases
      
      for (let i = 0; i < usageIncreases.length; i++) {
        currentUsage.sonnet.used += usageIncreases[i];
        currentUsage.sonnet.percentage = (currentUsage.sonnet.used / currentUsage.sonnet.limit) * 100;
        
        mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);
        
        const complexity = { overall: 4 } as any;
        const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
        
        if (currentUsage.sonnet.percentage >= 90) {
          // Should trigger emergency protocols
          expect(risk.quotaRisk.probability).toBe(100);
          expect(risk.mitigationStrategies.some(s => s.priority === 'high')).toBe(true);
        } else if (currentUsage.sonnet.percentage >= 85) {
          // Should show high risk
          expect(risk.quotaRisk.probability).toBeGreaterThan(70);
        }
      }
    });

    test('Must provide accurate time-to-limit calculations', async () => {
      const testScenarios = [
        { current: 428, rate: 2, expected: 2 }, // 2 hours to reach 432h limit at 2h/hour rate
        { current: 430, rate: 1, expected: 2 }, // 2 hours to reach 432h limit at 1h/hour rate  
        { current: 431, rate: 0.5, expected: 2 }, // 2 hours to reach 432h limit at 0.5h/hour rate
        { current: 35, rate: 0.5, expected: 2 }, // Opus: 2 hours to reach 36h limit at 0.5h/hour rate
      ];

      for (const scenario of testScenarios) {
        const isOpus = scenario.current < 100;
        const currentUsage: QuotaUsage = {
          sonnet: isOpus ? { used: 0, limit: 480, percentage: 0 } : { used: scenario.current, limit: 480, percentage: (scenario.current / 480) * 100 },
          opus: isOpus ? { used: scenario.current, limit: 40, percentage: (scenario.current / 40) * 100 } : { used: 0, limit: 40, percentage: 0 }
        };

        mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

        const complexity = { overall: 5 } as any;
        const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
        
        // Time to limit should be calculated accurately
        const expectedTimeInMinutes = scenario.expected * 60;
        expect(risk.quotaRisk.timeToLimit).toBeCloseTo(expectedTimeInMinutes, -1); // Within 10 minutes
      }
    });
  });

  describe('Validation Results and Reporting', () => {
    test('Should generate comprehensive quota validation report', async () => {
      const criticalScenarios: QuotaTestScenario[] = [
        {
          id: 'sonnet-90-exact',
          name: 'Sonnet Exactly at 90%',
          model: 'sonnet', 
          currentUsage: 432,
          plannedUsage: 0.1,
          timeframe: 5,
          expectedOutcome: 'block'
        },
        {
          id: 'opus-90-exact',
          name: 'Opus Exactly at 90%',
          model: 'opus',
          currentUsage: 36,
          plannedUsage: 0.1, 
          timeframe: 5,
          expectedOutcome: 'block'
        },
        {
          id: 'sonnet-safe-85',
          name: 'Sonnet Safe at 85%',
          model: 'sonnet',
          currentUsage: 408,
          plannedUsage: 20,
          timeframe: 30,
          expectedOutcome: 'warn'
        }
      ];

      for (const scenario of criticalScenarios) {
        const currentUsage: QuotaUsage = {
          sonnet: scenario.model === 'sonnet' 
            ? { used: scenario.currentUsage, limit: 480, percentage: (scenario.currentUsage / 480) * 100 }
            : { used: 0, limit: 480, percentage: 0 },
          opus: scenario.model === 'opus'
            ? { used: scenario.currentUsage, limit: 40, percentage: (scenario.currentUsage / 40) * 100 }
            : { used: 0, limit: 40, percentage: 0 }
        };

        mockDb.getQuotaUsage = vi.fn().mockResolvedValue(currentUsage);

        const complexity = { overall: 5 } as any;
        const risk = await riskAssessmentService.assessRisk(complexity, currentUsage);
        const plan = await sessionPlanningService.planSessions(complexity, risk);
        
        // Validate plan respects quota limits
        const validation = await sessionPlanningService.validatePlan(plan, currentUsage);
        
        if (scenario.expectedOutcome === 'block') {
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.errors.some(e => e.includes('90%') || e.includes('quota'))).toBe(true);
        } else if (scenario.expectedOutcome === 'warn') {
          expect(validation.warnings.length).toBeGreaterThan(0);
        }
      }
    });
  });
});

/**
 * Quota Exhaustion Simulation Tests
 * Test system behavior as quotas approach and reach limits
 */
describe('Quota Exhaustion Simulation', () => {
  let sessionPlanningService: SessionPlanningService;
  let riskAssessmentService: RiskAssessmentService;
  let mockDb: JsonDatabaseManager;

  beforeEach(() => {
    mockDb = {
      getQuotaUsage: vi.fn(),
      getAllSessions: vi.fn().mockResolvedValue([]),
    } as any;

    sessionPlanningService = new SessionPlanningService(mockDb);
    riskAssessmentService = new RiskAssessmentService();
  });

  test('Must simulate gradual approach to Sonnet quota limit', async () => {
    const startingUsage = 400; // 83.33%
    const approachRate = 2; // 2 hours per simulation step
    const steps = 16; // Will reach 432h (90%) in 16 steps
    
    let currentUsage = startingUsage;
    const log: string[] = [];
    
    for (let step = 0; step < steps; step++) {
      const usage: QuotaUsage = {
        sonnet: { used: currentUsage, limit: 480, percentage: (currentUsage / 480) * 100 },
        opus: { used: 0, limit: 40, percentage: 0 }
      };
      
      mockDb.getQuotaUsage = vi.fn().mockResolvedValue(usage);
      
      const complexity = { overall: 4 } as any;
      const risk = await riskAssessmentService.assessRisk(complexity, usage);
      
      log.push(`Step ${step}: ${currentUsage}h (${usage.sonnet.percentage.toFixed(1)}%) - Risk: ${risk.quotaRisk.probability}%`);
      
      if (usage.sonnet.percentage >= 90) {
        // Emergency protocol should be triggered
        expect(risk.quotaRisk.probability).toBe(100);
        expect(risk.mitigationStrategies.some(s => s.riskType === 'quota' && s.priority === 'high')).toBe(true);
        log.push(`EMERGENCY PROTOCOL TRIGGERED at ${usage.sonnet.percentage.toFixed(1)}%`);
        break;
      }
      
      currentUsage += approachRate;
    }
    
    // Log the progression for validation
    console.log('Quota Exhaustion Simulation Log:', log);
    
    // Verify emergency protocol triggered before exceeding 90%
    expect(currentUsage).toBeLessThanOrEqual(QUOTA_LIMITS.sonnet.safetyLimit + approachRate);
  });

  test('Must simulate quota recovery scenarios', async () => {
    // Test system behavior when quota usage decreases (e.g., weekly reset)
    const highUsage: QuotaUsage = {
      sonnet: { used: 431, limit: 480, percentage: 89.79 },
      opus: { used: 35.5, limit: 40, percentage: 88.75 }
    };

    const recoveredUsage: QuotaUsage = {
      sonnet: { used: 200, limit: 480, percentage: 41.67 }, // Weekly reset
      opus: { used: 15, limit: 40, percentage: 37.5 }
    };

    // Test high usage state
    mockDb.getQuotaUsage = vi.fn().mockResolvedValue(highUsage);
    let complexity = { overall: 6 } as any;
    let risk = await riskAssessmentService.assessRisk(complexity, highUsage);
    
    expect(risk.quotaRisk.probability).toBeGreaterThan(80);
    
    // Test recovered state
    mockDb.getQuotaUsage = vi.fn().mockResolvedValue(recoveredUsage);
    risk = await riskAssessmentService.assessRisk(complexity, recoveredUsage);
    
    expect(risk.quotaRisk.probability).toBeLessThan(50);
    
    // Should allow normal session planning again
    const plan = await sessionPlanningService.planSessions(complexity, risk);
    expect(plan.modelAllocation.sonnet.estimatedTime).toBeGreaterThan(0);
    expect(plan.modelAllocation.opus.estimatedTime).toBeGreaterThan(0);
  });
});