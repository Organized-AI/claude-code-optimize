// Enhanced Rate Limiting API for Claude Monitor Dashboard
const CLAUDE_LIMITS = {
    SESSION_DURATION: 5 * 60 * 60 * 1000, // 5 hours
    WEEKLY_TOKEN_LIMIT: 10000,
    HOURLY_REQUEST_LIMIT: 100,
    DAILY_UPLOAD_LIMIT: 50
};

function addRateLimitEndpoints(app, db) {
    // Enhanced rate limiting analytics
    app.get('/api/rate-limits', async (req, res) => {
        try {
            const now = new Date();
            const fiveHoursAgo = new Date(now - CLAUDE_LIMITS.SESSION_DURATION);
            const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

            // Get current session data
            const currentSessionQuery = `
                SELECT 
                    session_id,
                    MIN(timestamp) as session_start,
                    MAX(timestamp) as last_activity,
                    COUNT(*) as message_count,
                    SUM(tokens_used) as total_tokens,
                    AVG(efficiency) as avg_efficiency
                FROM activity 
                WHERE timestamp >= ? 
                AND session_id IS NOT NULL
                GROUP BY session_id
                ORDER BY session_start DESC
            `;

            db.all(currentSessionQuery, [fiveHoursAgo.toISOString()], (err, currentSessions) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                // Get weekly usage
                const weeklyUsageQuery = `
                    SELECT 
                        SUM(tokens_used) as weekly_tokens,
                        COUNT(*) as weekly_activities,
                        COUNT(DISTINCT session_id) as unique_sessions,
                        AVG(efficiency) as avg_weekly_efficiency
                    FROM activity 
                    WHERE timestamp >= ?
                `;

                db.get(weeklyUsageQuery, [oneWeekAgo.toISOString()], (err, weeklyUsage) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    // Get hourly pattern
                    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
                    const hourlyPatternQuery = `
                        SELECT 
                            strftime('%H', timestamp) as hour,
                            COUNT(*) as activity_count,
                            SUM(tokens_used) as hourly_tokens,
                            AVG(efficiency) as hourly_efficiency
                        FROM activity 
                        WHERE timestamp >= ?
                        GROUP BY strftime('%H', timestamp)
                        ORDER BY hour
                    `;

                    db.all(hourlyPatternQuery, [oneDayAgo.toISOString()], (err, hourlyPattern) => {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }

                        // Generate warnings
                        const warnings = [];
                        
                        // Session warnings
                        currentSessions.forEach(session => {
                            const sessionStart = new Date(session.session_start);
                            const timeRemaining = CLAUDE_LIMITS.SESSION_DURATION - (now - sessionStart);
                            
                            if (timeRemaining < 30 * 60 * 1000) {
                                warnings.push({
                                    type: 'session_ending',
                                    severity: 'high',
                                    message: `Session ending in ${Math.round(timeRemaining / 60000)} minutes`
                                });
                            }
                        });

                        // Weekly usage warnings
                        const weeklyPercent = (weeklyUsage.weekly_tokens / CLAUDE_LIMITS.WEEKLY_TOKEN_LIMIT) * 100;
                        if (weeklyPercent > 75) {
                            warnings.push({
                                type: 'weekly_usage',
                                severity: weeklyPercent > 90 ? 'high' : 'medium',
                                message: `Weekly usage at ${weeklyPercent.toFixed(1)}%`
                            });
                        }

                        res.json({
                            current_sessions: currentSessions,
                            weekly_usage: weeklyUsage,
                            hourly_pattern: hourlyPattern,
                            warnings: warnings,
                            limits: CLAUDE_LIMITS
                        });
                    });
                });
            });

        } catch (error) {
            console.error('Rate limits API error:', error);
            res.status(500).json({ error: 'Failed to fetch rate limit data' });
        }
    });

    // Session analytics endpoint
    app.get('/api/session-analytics', (req, res) => {
        try {
            const now = new Date();
            const fiveHoursAgo = new Date(now - CLAUDE_LIMITS.SESSION_DURATION);
            
            const query = `
                SELECT 
                    session_id,
                    project_name,
                    source,
                    MIN(timestamp) as session_start,
                    MAX(timestamp) as last_activity,
                    COUNT(*) as message_count,
                    SUM(tokens_used) as total_tokens,
                    AVG(efficiency) as avg_efficiency,
                    (julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 24 * 60 as duration_minutes
                FROM activity 
                WHERE timestamp >= ? 
                AND session_id IS NOT NULL
                GROUP BY session_id, project_name, source
                ORDER BY session_start DESC
            `;

            db.all(query, [fiveHoursAgo.toISOString()], (err, sessions) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch session analytics' });
                }
                res.json({ sessions });
            });
        } catch (error) {
            console.error('Session analytics error:', error);
            res.status(500).json({ error: 'Failed to fetch session analytics' });
        }
    });

    // Usage predictions endpoint
    app.get('/api/usage-predictions', (req, res) => {
        try {
            const timeframe = req.query.timeframe || '24h';
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

            const query = `
                SELECT 
                    timestamp,
                    tokens_used,
                    efficiency,
                    source,
                    strftime('%H', timestamp) as hour
                FROM activity 
                WHERE timestamp >= ?
                AND tokens_used > 0
                ORDER BY timestamp ASC
            `;

            db.all(query, [oneDayAgo.toISOString()], (err, data) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to generate predictions' });
                }

                // Simple prediction based on recent average
                const recentData = data.slice(-10);
                const avgTokens = recentData.reduce((sum, d) => sum + (d.tokens_used || 0), 0) / Math.max(recentData.length, 1);
                
                const predictions = {
                    composite: {
                        predicted_tokens_next_hour: Math.round(avgTokens * 6) // Rough estimate
                    }
                };

                const recommendations = [
                    {
                        title: 'Usage Pattern',
                        description: 'Based on recent activity patterns'
                    }
                ];

                res.json({
                    timeframe: timeframe,
                    data_points: data.length,
                    predictions: { predictions },
                    recommendations: recommendations,
                    confidence_score: data.length > 5 ? 0.7 : 0.3
                });
            });

        } catch (error) {
            console.error('Usage predictions error:', error);
            res.status(500).json({ error: 'Failed to generate predictions' });
        }
    });
}

module.exports = { addRateLimitEndpoints, CLAUDE_LIMITS };
