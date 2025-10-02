import { describe, it, expect } from 'vitest';
import { TokenEstimator, TASK_ESTIMATES, COMPLEXITY_FACTORS } from '../src/token-estimator.js';
import { SessionPlan } from '../src/session-plan-parser.js';

describe('TokenEstimator', () => {
  const estimator = new TokenEstimator();

  describe('Task Baseline Estimates', () => {
    it('should have baseline estimates for all task types', () => {
      expect(TASK_ESTIMATES.planning).toBeDefined();
      expect(TASK_ESTIMATES.implementation).toBeDefined();
      expect(TASK_ESTIMATES.refactoring).toBeDefined();
      expect(TASK_ESTIMATES.testing).toBeDefined();
      expect(TASK_ESTIMATES.debugging).toBeDefined();
      expect(TASK_ESTIMATES.polish).toBeDefined();
    });

    it('should have realistic token rates', () => {
      expect(TASK_ESTIMATES.implementation.tokensPerHour).toBe(45000);
      expect(TASK_ESTIMATES.testing.tokensPerHour).toBe(30000);
      expect(TASK_ESTIMATES.planning.tokensPerHour).toBe(20000);
    });
  });

  describe('Complexity Factors', () => {
    it('should have multipliers for project size', () => {
      expect(COMPLEXITY_FACTORS.projectSize.small).toBe(0.8);
      expect(COMPLEXITY_FACTORS.projectSize.medium).toBe(1.0);
      expect(COMPLEXITY_FACTORS.projectSize.large).toBe(1.3);
    });

    it('should have multipliers for tech stack familiarity', () => {
      expect(COMPLEXITY_FACTORS.techStack.familiar).toBe(0.9);
      expect(COMPLEXITY_FACTORS.techStack.learning).toBe(1.2);
      expect(COMPLEXITY_FACTORS.techStack.new).toBe(1.5);
    });
  });

  describe('Session Estimation', () => {
    it('should estimate a simple session plan', () => {
      const mockPlan: SessionPlan = {
        sessionId: 'test-session',
        filePath: '/test/plan.md',
        title: 'Test Session',
        phases: [
          {
            number: 1,
            name: 'Implementation',
            description: 'Build feature',
            estimatedHours: 2,
            objectives: []
          }
        ],
        prerequisites: [],
        objectives: []
      };

      const estimate = estimator.estimateSession(mockPlan);

      expect(estimate.sessionId).toBe('test-session');
      expect(estimate.phases).toHaveLength(1);
      expect(estimate.totalTokens.mid).toBeGreaterThan(0);
    });

    it('should calculate low/mid/high ranges', () => {
      const mockPlan: SessionPlan = {
        sessionId: 'test-session',
        filePath: '/test/plan.md',
        title: 'Test Session',
        phases: [
          {
            number: 1,
            name: 'Testing',
            description: 'Write tests',
            estimatedHours: 1,
            objectives: []
          }
        ],
        prerequisites: [],
        objectives: []
      };

      const estimate = estimator.estimateSession(mockPlan);

      expect(estimate.totalTokens.low).toBeLessThan(estimate.totalTokens.mid);
      expect(estimate.totalTokens.mid).toBeLessThan(estimate.totalTokens.high);
    });

    it('should check quota fit', () => {
      const mockPlan: SessionPlan = {
        sessionId: 'small-session',
        filePath: '/test/plan.md',
        title: 'Small Session',
        phases: [
          {
            number: 1,
            name: 'Polish',
            description: 'Documentation',
            estimatedHours: 0.5,
            objectives: []
          }
        ],
        prerequisites: [],
        objectives: []
      };

      const estimate = estimator.estimateSession(mockPlan);

      expect(estimate.quotaCheck.fitsProQuota).toBe(true);
      expect(estimate.quotaCheck.percentageOfQuota).toBeLessThan(100);
    });
  });

  describe('Variance Calculation', () => {
    it('should calculate variance correctly', () => {
      const variance = estimator.calculateVariance(50000, 55000);

      expect(variance.estimated).toBe(50000);
      expect(variance.actual).toBe(55000);
      expect(variance.difference).toBe(5000);
      expect(variance.percentDifference).toBe(10);
    });

    it('should rate excellent for < 5% variance', () => {
      const variance = estimator.calculateVariance(100000, 102000);
      expect(variance.rating).toBe('excellent');
    });

    it('should rate very-good for < 10% variance', () => {
      const variance = estimator.calculateVariance(100000, 108000);
      expect(variance.rating).toBe('very-good');
    });

    it('should rate good for < 20% variance', () => {
      const variance = estimator.calculateVariance(100000, 115000);
      expect(variance.rating).toBe('good');
    });
  });
});
