import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenMonitor } from '../src/server/services/TokenMonitor';
import { DatabaseManager } from '../src/server/services/DatabaseManager';
import { WebSocketManager } from '../src/server/services/WebSocketManager';

// Mock dependencies
vi.mock('../src/server/services/DatabaseManager');
vi.mock('../src/server/services/WebSocketManager');

describe('TokenMonitor', () => {
  let tokenMonitor: TokenMonitor;
  let mockDb: vi.Mocked<DatabaseManager>;
  let mockWsManager: vi.Mocked<WebSocketManager>;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockDb = {
      recordTokenUsage: vi.fn(),
      getTokenUsageHistory: vi.fn(),
      getSession: vi.fn(),
    } as any;
    
    mockWsManager = {
      sendToSession: vi.fn(),
      broadcast: vi.fn(),
    } as any;
    
    tokenMonitor = new TokenMonitor(mockDb, mockWsManager);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    tokenMonitor.shutdown();
  });

  describe('Token Usage Recording', () => {
    it('should record token usage and update totals', async () => {
      const sessionId = 'test-session';
      
      await tokenMonitor.recordTokenUsage(sessionId, 100, 'test-operation');
      
      expect(tokenMonitor.getSessionTotal(sessionId)).toBe(100);
      expect(mockWsManager.sendToSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'token_update',
          sessionId,
          tokensUsed: 100,
          totalUsed: 100,
        })
      );
    });

    it('should accumulate token usage correctly', async () => {
      const sessionId = 'test-session';
      
      await tokenMonitor.recordTokenUsage(sessionId, 100, 'operation-1');
      await tokenMonitor.recordTokenUsage(sessionId, 50, 'operation-2');
      await tokenMonitor.recordTokenUsage(sessionId, 25, 'operation-3');
      
      expect(tokenMonitor.getSessionTotal(sessionId)).toBe(175);
    });

    it('should batch token usage records for database efficiency', async () => {
      const sessionId = 'test-session';
      
      // Record multiple usage events quickly
      for (let i = 0; i < 5; i++) {
        await tokenMonitor.recordTokenUsage(sessionId, 10, `operation-${i}`);
      }
      
      // Should not hit database yet (batching)
      expect(mockDb.recordTokenUsage).not.toHaveBeenCalled();
      
      // Advance time to trigger batch processing
      vi.advanceTimersByTime(150);
      
      // Should have processed the batch
      expect(mockDb.recordTokenUsage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Usage Analytics', () => {
    beforeEach(() => {
      // Mock session data
      mockDb.getSession.mockResolvedValue({
        id: 'test-session',
        startTime: Date.now() - 300000, // 5 minutes ago
        duration: 3600000, // 1 hour
        status: 'active',
        tokensUsed: 0,
        createdAt: Date.now() - 300000,
        updatedAt: Date.now(),
      } as any);
      
      // Mock usage history
      mockDb.getTokenUsageHistory.mockResolvedValue([
        {
          id: '1',
          sessionId: 'test-session',
          tokensUsed: 50,
          operation: 'op1',
          timestamp: Date.now() - 240000, // 4 min ago
          cumulativeTotal: 50,
        },
        {
          id: '2',
          sessionId: 'test-session',
          tokensUsed: 75,
          operation: 'op2',
          timestamp: Date.now() - 120000, // 2 min ago
          cumulativeTotal: 125,
        },
        {
          id: '3',
          sessionId: 'test-session',
          tokensUsed: 25,
          operation: 'op3',
          timestamp: Date.now() - 60000, // 1 min ago
          cumulativeTotal: 150,
        },
      ]);
    });

    it('should calculate current usage statistics', async () => {
      // Set up session total
      tokenMonitor['sessionTotals'].set('test-session', 150);
      
      const usage = await tokenMonitor.getCurrentUsage('test-session');
      
      expect(usage.totalUsed).toBe(150);
      expect(usage.averagePerMinute).toBeGreaterThan(0);
      expect(usage.projectedTotal).toBeGreaterThanOrEqual(150);
    });

    it('should generate usage projections with confidence scores', async () => {
      tokenMonitor['sessionTotals'].set('test-session', 150);
      
      const projection = await tokenMonitor.generateUsageProjection('test-session');
      
      expect(projection).toMatchObject({
        currentRate: expect.any(Number),
        projectedTotal: expect.any(Number),
        timeToLimit: expect.any(Number),
        confidence: expect.any(Number),
      });
      
      expect(projection.confidence).toBeGreaterThanOrEqual(0);
      expect(projection.confidence).toBeLessThanOrEqual(1);
    });

    it('should provide low confidence for insufficient data', async () => {
      mockDb.getTokenUsageHistory.mockResolvedValue([]);
      
      const projection = await tokenMonitor.generateUsageProjection('test-session');
      
      expect(projection.confidence).toBe(0);
      expect(projection.currentRate).toBe(0);
    });
  });

  describe('Alert System', () => {
    beforeEach(() => {
      mockDb.getSession.mockResolvedValue({
        id: 'test-session',
        startTime: Date.now() - 300000,
        duration: 3600000,
        tokenBudget: 1000,
        status: 'active',
        tokensUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
    });

    it('should generate warning alerts at 80% budget usage', async () => {
      tokenMonitor['sessionTotals'].set('test-session', 800); // 80% of 1000
      
      const alerts = await tokenMonitor.checkAlerts('test-session');
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('warning');
      expect(alerts[0].message).toContain('80.0%');
    });

    it('should generate error alerts at 95% budget usage', async () => {
      tokenMonitor['sessionTotals'].set('test-session', 950); // 95% of 1000
      
      const alerts = await tokenMonitor.checkAlerts('test-session');
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('error');
      expect(alerts[0].message).toContain('95.0%');
    });

    it('should alert for projected budget overrun', async () => {
      tokenMonitor['sessionTotals'].set('test-session', 500);
      
      // Mock projection that exceeds budget
      vi.spyOn(tokenMonitor, 'generateUsageProjection').mockResolvedValue({
        currentRate: 10,
        projectedTotal: 1200, // 120% of budget
        timeToLimit: 50,
        confidence: 0.8,
      });
      
      const alerts = await tokenMonitor.checkAlerts('test-session');
      
      expect(alerts.some(alert => alert.message.includes('exceed token budget'))).toBe(true);
    });

    it('should not generate alerts for sessions without budget', async () => {
      mockDb.getSession.mockResolvedValue({
        id: 'test-session',
        startTime: Date.now() - 300000,
        duration: 3600000,
        tokenBudget: undefined, // No budget set
        status: 'active',
        tokensUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
      
      tokenMonitor['sessionTotals'].set('test-session', 10000);
      
      const alerts = await tokenMonitor.checkAlerts('test-session');
      
      // Should only have rate-based alerts, not budget alerts
      const budgetAlerts = alerts.filter(alert => 
        alert.message.includes('budget') || alert.message.includes('%')
      );
      expect(budgetAlerts).toHaveLength(0);
    });
  });

  describe('Session Management', () => {
    it('should track multiple sessions independently', async () => {
      await tokenMonitor.recordTokenUsage('session-1', 100, 'op1');
      await tokenMonitor.recordTokenUsage('session-2', 200, 'op2');
      
      expect(tokenMonitor.getSessionTotal('session-1')).toBe(100);
      expect(tokenMonitor.getSessionTotal('session-2')).toBe(200);
    });

    it('should clean up session data on removal', () => {
      const sessionId = 'test-session';
      
      tokenMonitor['sessionTotals'].set(sessionId, 100);
      tokenMonitor['tokenBuffer'].set(sessionId, []);
      
      tokenMonitor.removeSession(sessionId);
      
      expect(tokenMonitor.getSessionTotal(sessionId)).toBe(0);
      expect(tokenMonitor['tokenBuffer'].has(sessionId)).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.recordTokenUsage.mockRejectedValue(new Error('Database error'));
      
      // Should not throw
      await expect(
        tokenMonitor.recordTokenUsage('test-session', 100, 'test')
      ).resolves.not.toThrow();
    });

    it('should handle WebSocket send failures gracefully', async () => {
      mockWsManager.sendToSession.mockImplementation(() => {
        throw new Error('WebSocket error');
      });
      
      // Should not throw
      await expect(
        tokenMonitor.recordTokenUsage('test-session', 100, 'test')
      ).resolves.not.toThrow();
    });

    it('should handle zero or negative token usage', async () => {
      await tokenMonitor.recordTokenUsage('test-session', 0, 'zero-test');
      await tokenMonitor.recordTokenUsage('test-session', -10, 'negative-test');
      
      // Should still function (implementation detail - might filter these out)
      expect(tokenMonitor.getSessionTotal('test-session')).toBeGreaterThanOrEqual(0);
    });
  });
});