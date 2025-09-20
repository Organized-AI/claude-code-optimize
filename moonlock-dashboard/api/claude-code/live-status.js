
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = async (req, res) => {
    try {
        const dbPath = path.join(process.cwd(), 'claude_usage.db');
        const db = new sqlite3.Database(dbPath);
        
        // Get real session data
        db.get(`
            SELECT * FROM real_sessions 
            WHERE is_active = TRUE 
            ORDER BY start_time DESC 
            LIMIT 1
        `, (err, session) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (session) {
                const startTime = new Date(session.start_time);
                const duration = Date.now() - startTime.getTime();
                const remaining = Math.max(0, (5 * 60 * 60 * 1000) - duration); // 5 hours in ms
                
                res.json({
                    isActive: true,
                    activeSessionId: session.id,
                    sessionType: session.session_type,
                    remainingTime: remaining,
                    conversationContext: `Real ${session.session_type} session`,
                    currentWindow: {
                        projectId: session.project_path || 'N/A',
                        status: 'active',
                        tokenUsage: {
                            totalTokens: session.estimated_tokens || 0,
                            inputTokens: Math.floor((session.estimated_tokens || 0) * 0.6),
                            outputTokens: Math.floor((session.estimated_tokens || 0) * 0.4)
                        },
                        efficiency: Math.min(100, Math.max(0, 85 + (session.total_messages * 2))),
                        costEstimate: (session.estimated_tokens || 0) * 0.000003,
                        timeActive: duration / (1000 * 60), // minutes
                        models_used: JSON.parse(session.models_used || '[]'),
                        process_id: session.process_id
                    }
                });
            } else {
                res.json({
                    isActive: false,
                    activeSessionId: null,
                    sessionType: null,
                    remainingTime: 0,
                    conversationContext: 'No active Claude sessions',
                    currentWindow: null
                });
            }
            
            db.close();
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
