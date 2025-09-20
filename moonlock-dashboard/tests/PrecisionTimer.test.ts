import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrecisionTimer } from '../src/server/utils/PrecisionTimer';

// Mock performance.now()
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
  },
});

describe('PrecisionTimer', () => {
  let timer: PrecisionTimer;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdate = vi.fn();
    mockComplete = vi.fn();
    timer = new PrecisionTimer(5000); // 5 second timer
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Timer Operations', () => {
    it('should initialize with idle status', () => {
      expect(timer.getStatus()).toBe('idle');
      expect(timer.getElapsed()).toBe(0);
      expect(timer.getRemaining()).toBe(5000);
    });

    it('should start timer and update status', () => {
      timer.start(mockUpdate, mockComplete);
      expect(timer.getStatus()).toBe('running');
    });

    it('should pause and resume correctly', () => {
      timer.start(mockUpdate, mockComplete);
      
      // Advance time and pause
      vi.advanceTimersByTime(2000);
      timer.pause();
      
      expect(timer.getStatus()).toBe('paused');
      expect(timer.getElapsed()).toBeCloseTo(2000, -2);
      
      // Resume
      timer.start(mockUpdate, mockComplete);
      expect(timer.getStatus()).toBe('running');
    });

    it('should complete when duration is reached', () => {
      timer.start(mockUpdate, mockComplete);
      
      // Advance past completion
      vi.advanceTimersByTime(6000);
      
      expect(mockComplete).toHaveBeenCalled();
      expect(timer.getStatus()).toBe('completed');
    });
  });

  describe('Precision and Accuracy', () => {
    it('should maintain accuracy over long periods', () => {
      const longTimer = new PrecisionTimer(300000); // 5 minutes
      longTimer.start(mockUpdate, mockComplete);
      
      // Simulate 4 minutes
      vi.advanceTimersByTime(240000);
      
      const elapsed = longTimer.getElapsed();
      const remaining = longTimer.getRemaining();
      
      expect(elapsed).toBeCloseTo(240000, -2);
      expect(remaining).toBeCloseTo(60000, -2);
      expect(elapsed + remaining).toBeCloseTo(300000, -2);
    });

    it('should handle multiple pause/resume cycles', () => {
      timer.start(mockUpdate, mockComplete);
      
      // Run for 1s, pause for 2s, resume for 1s
      vi.advanceTimersByTime(1000);
      timer.pause();
      
      vi.advanceTimersByTime(2000); // This shouldn't count
      timer.start(mockUpdate, mockComplete);
      
      vi.advanceTimersByTime(1000);
      
      expect(timer.getElapsed()).toBeCloseTo(2000, -2);
      expect(timer.getRemaining()).toBeCloseTo(3000, -2);
    });
  });

  describe('Update Callbacks', () => {
    it('should call update callback at regular intervals', () => {
      timer.start(mockUpdate, mockComplete);
      
      // Advance by multiple intervals
      vi.advanceTimersByTime(3000);
      
      expect(mockUpdate).toHaveBeenCalledTimes(3);
      expect(mockUpdate).toHaveBeenLastCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should provide accurate elapsed and remaining times', () => {
      timer.start(mockUpdate, mockComplete);
      
      vi.advanceTimersByTime(2000);
      
      const lastCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1];
      const [elapsed, remaining] = lastCall;
      
      expect(elapsed).toBeCloseTo(2000, -2);
      expect(remaining).toBeCloseTo(3000, -2);
    });
  });

  describe('Static Helper Methods', () => {
    it('should format time correctly', () => {
      expect(PrecisionTimer.formatTime(0)).toBe('0:00');
      expect(PrecisionTimer.formatTime(30000)).toBe('0:30');
      expect(PrecisionTimer.formatTime(90000)).toBe('1:30');
      expect(PrecisionTimer.formatTime(3661000)).toBe('1:01:01');
    });

    it('should parse time strings correctly', () => {
      expect(PrecisionTimer.parseTimeString('1:30')).toBe(90000);
      expect(PrecisionTimer.parseTimeString('2:05:30')).toBe(7530000);
    });

    it('should throw error for invalid time format', () => {
      expect(() => PrecisionTimer.parseTimeString('invalid')).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      const zeroTimer = new PrecisionTimer(0);
      zeroTimer.start(mockUpdate, mockComplete);
      
      expect(mockComplete).toHaveBeenCalled();
      expect(zeroTimer.getStatus()).toBe('completed');
    });

    it('should handle negative duration gracefully', () => {
      const negativeTimer = new PrecisionTimer(-1000);
      negativeTimer.start(mockUpdate, mockComplete);
      
      expect(mockComplete).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      timer.start(mockUpdate, mockComplete);
      const status1 = timer.getStatus();
      
      timer.start(mockUpdate, mockComplete); // Should be ignored
      const status2 = timer.getStatus();
      
      expect(status1).toBe('running');
      expect(status2).toBe('running');
    });
  });
});