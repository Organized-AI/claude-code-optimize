interface SessionData {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalCostUSD: number;
  duration: number;
  startTime: Date;
  isActive: boolean;
  model: 'sonnet' | 'opus';
}

export class FixedDataProcessor {
  /**
   * CORRECTED: Token calculation - was showing 156.6M instead of ~631k
   */
  static calculateCorrectTokenUsage(sessions: SessionData[]) {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheTokens = 0;
    let totalCostUSD = 0;

    sessions.forEach(session => {
      inputTokens += session.inputTokens || 0;
      outputTokens += session.outputTokens || 0;
      cacheTokens += session.cacheReadTokens || 0;
      totalCostUSD += session.totalCostUSD || 0;
    });

    const totalTokens = inputTokens + outputTokens; // CORRECT: Just add them!

    // Validate - if over 10M tokens in a day, something's wrong
    if (totalTokens > 10000000) {
      console.warn('🚨 Token calculation seems too high:', totalTokens);
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens,    // Should be ~631k, NOT 156.6M
      cacheTokens,
      totalCostUSD,
      formattedTotal: totalTokens >= 1000000 
        ? `${(totalTokens / 1000000).toFixed(1)}M`
        : `${(totalTokens / 1000).toFixed(0)}k`
    };
  }

  /**
   * Batch Claude Code activities instead of showing each individually
   */
  static batchClaudeCodeActivities(activities: any[]) {
    const claudeCodeActivities = activities.filter(a => 
      a.service === 'Claude Code' || a.toString().includes('Claude Code')
    );
    const otherActivities = activities.filter(a => 
      a.service !== 'Claude Code' && !a.toString().includes('Claude Code')
    );

    if (claudeCodeActivities.length === 0) {
      return activities;
    }

    // Create single batched entry
    const batchedEntry = {
      id: 'claude-code-batch',
      service: 'Claude Code',
      type: 'batch',
      count: claudeCodeActivities.length,
      summary: `${claudeCodeActivities.length} sessions • Combined activities`,
      lastActivity: new Date().toLocaleTimeString(),
      activities: claudeCodeActivities.map(a => a.activity || 'Session activity')
    };

    return [batchedEntry, ...otherActivities];
  }
}
