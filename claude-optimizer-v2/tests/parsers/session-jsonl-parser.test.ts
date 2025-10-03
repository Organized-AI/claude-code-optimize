import { describe, it, expect } from 'vitest';
import { SessionJSONLParser } from '../../src/parsers/session-jsonl-parser.js';

describe('SessionJSONLParser', () => {
  it('should initialize without errors', () => {
    const parser = new SessionJSONLParser();
    expect(parser).toBeDefined();
  });

  it('should get session directory path', () => {
    const parser = new SessionJSONLParser();
    const dir = parser.getSessionDirectory();
    expect(dir).toBeDefined();
    expect(typeof dir).toBe('string');
  });

  it('should get weekly usage', () => {
    const parser = new SessionJSONLParser();
    const quota = parser.getWeeklyUsage();

    expect(quota.sonnet).toBeDefined();
    expect(quota.opus).toBeDefined();
    expect(quota.sonnet.limit).toBe(432);
    expect(quota.opus.limit).toBe(36);
    expect(quota.resetDate).toBeInstanceOf(Date);
  });

  it('should get usage trends', () => {
    const parser = new SessionJSONLParser();
    const trends = parser.getUsageTrends(7);

    expect(Array.isArray(trends)).toBe(true);
    trends.forEach(trend => {
      expect(trend).toHaveProperty('date');
      expect(trend).toHaveProperty('tokens');
      expect(trend).toHaveProperty('sessions');
      expect(trend).toHaveProperty('formattedDate');
    });
  });

  it('should get recent sessions', () => {
    const parser = new SessionJSONLParser();
    const sessions = parser.getRecentSessions(7);

    expect(Array.isArray(sessions)).toBe(true);
    sessions.forEach(session => {
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('tokens');
      expect(session.tokens).toHaveProperty('input');
      expect(session.tokens).toHaveProperty('output');
      expect(session.tokens).toHaveProperty('total');
    });
  });
});
