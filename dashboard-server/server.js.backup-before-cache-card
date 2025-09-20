// Claude Monitor Dashboard Server
// Receives monitoring data from the unified-claude-monitor.sh script

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'claude-monitor.db');

// Supabase configuration
const supabaseUrl = 'https://rdsfgdtsbyioqilatvxu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkc2ZnZHRzYnlpb3FpbGF0dnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODU1NDYsImV4cCI6MjA3MDI2MTU0Nn0.g7CEVYwJsz2cLP5GnHrl5uTpkHpdUOmisqXm0QPhqKk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH);

// Create tables if they don't exist
db.serialize(() => {
    // Activity table for all events
    db.run(`
        CREATE TABLE IF NOT EXISTS activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Metrics table for aggregated data
    db.run(`
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            source TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sessions table for Claude Code sessions
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            project TEXT,
            started_at DATETIME,
            last_activity DATETIME,
            message_count INTEGER DEFAULT 0,
            token_count INTEGER DEFAULT 0
        )
    `);
});

// Store active WebSocket connections
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);
    
    // Send current stats to new client
    sendCurrentStats(ws);
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Send current stats to a client
async function sendCurrentStats(ws) {
    const stats = await getStats();
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'stats',
            data: stats
        }));
    }
}

// Get statistics from database
function getStats() {
    return new Promise((resolve, reject) => {
        const stats = {
            totalActivities: 0,
            recentActivities: [],
            sessionCount: 0,
            todayActivities: 0,
            sources: {}
        };
        
        // Get total activities
        db.get('SELECT COUNT(*) as count FROM activity', (err, row) => {
            if (err) return reject(err);
            stats.totalActivities = row.count;
            
            // Get today's activities
            db.get(`
                SELECT COUNT(*) as count FROM activity 
                WHERE date(timestamp) = date('now')
            `, (err, row) => {
                if (err) return reject(err);
                stats.todayActivities = row.count;
                
                // Get recent activities
                db.all(`
                    SELECT * FROM activity 
                    ORDER BY timestamp DESC 
                    LIMIT 10
                `, (err, rows) => {
                    if (err) return reject(err);
                    stats.recentActivities = rows;
                    
                    // Get activity by source
                    db.all(`
                        SELECT source, COUNT(*) as count 
                        FROM activity 
                        GROUP BY source
                    `, (err, rows) => {
                        if (err) return reject(err);
                        rows.forEach(row => {
                            stats.sources[row.source] = row.count;
                        });
                        
                        resolve(stats);
                    });
                });
            });
        });
    });
}

// API Routes

// Receive activity data from monitors
app.post('/api/activity', (req, res) => {
    const { source, type, timestamp, data } = req.body;
    
    console.log(`[${source}] ${type} at ${timestamp}`);
    
    // Store in database
    db.run(
        'INSERT INTO activity (source, type, timestamp, data) VALUES (?, ?, ?, ?)',
        [source, type, timestamp || new Date().toISOString(), JSON.stringify(data)],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Broadcast to WebSocket clients
            broadcast({
                type: 'activity',
                activity: {
                    id: this.lastID,
                    source,
                    type,
                    timestamp,
                    data
                }
            });
            
            res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Activity recorded'
            });
        }
    );
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Get recent activities
app.get('/api/activities', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    db.all(
        'SELECT * FROM activity ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Parse JSON data field
            rows.forEach(row => {
                try {
                    row.data = JSON.parse(row.data);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
            });
            
            res.json(rows);
        }
    );
});

// Get metrics
app.get('/api/metrics', (req, res) => {
    const since = req.query.since || new Date(Date.now() - 24*60*60*1000).toISOString();
    
    db.all(
        'SELECT * FROM metrics WHERE timestamp > ? ORDER BY timestamp DESC',
        [since],
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(rows);
        }
    );
});

// Claude Code sessions endpoint
app.get('/api/claude-sessions', (req, res) => {
    const query = `
        SELECT 
            json_extract(data, '$.sessionId') as session_id,
            MIN(timestamp) as start_time,
            MAX(timestamp) as last_activity,
            COUNT(*) as message_count,
            COALESCE(SUM(json_extract(data, '$.message.usage.input_tokens')), 0) as input_tokens,
            COALESCE(SUM(json_extract(data, '$.message.usage.output_tokens')), 0) as output_tokens,
            COALESCE(SUM(json_extract(data, '$.message.usage.cache_creation_input_tokens')), 0) as cache_creation_tokens,
            COALESCE(SUM(json_extract(data, '$.message.usage.cache_read_input_tokens')), 0) as cache_read_tokens
        FROM activity 
        WHERE source = 'claude-code' 
            AND json_extract(data, '$.sessionId') IS NOT NULL
        GROUP BY json_extract(data, '$.sessionId')
        ORDER BY MAX(timestamp) DESC
        LIMIT 10
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error fetching Claude sessions:', err);
            return res.status(500).json({ error: 'Failed to fetch sessions' });
        }
        
        const sessions = rows.map(row => {
            const startTime = new Date(row.start_time).getTime();
            const lastActivity = new Date(row.last_activity).getTime();
            const sessionDuration = Date.now() - startTime;
            const fiveHourWindow = 5 * 60 * 60 * 1000; // 5 hours in ms
            const remainingTime = Math.max(0, fiveHourWindow - sessionDuration);
            
            const totalTokens = (row.input_tokens || 0) + (row.output_tokens || 0) + 
                              (row.cache_creation_tokens || 0);
            const totalInputTokens = (row.input_tokens || 0) + (row.cache_creation_tokens || 0);
            const efficiency = totalInputTokens > 0 ? ((row.cache_read_tokens || 0) / totalInputTokens) * 100 : 0;
            
            // Sonnet 4 pricing: $3/M input, $15/M output
            const costEstimate = (totalInputTokens * 0.003 / 1000) + ((row.output_tokens || 0) * 0.015 / 1000);
            
            // Calculate Claude Code limits usage (assuming Pro plan as default)
            const limits = {
                pro: { messages: 45, prompts: { min: 10, max: 40 } },
                max5x: { messages: 225, prompts: { min: 50, max: 200 } },
                max20x: { messages: 900, prompts: { min: 200, max: 800 } }
            };
            
            // Determine likely plan based on usage patterns (heuristic)
            let estimatedPlan = 'pro';
            if (row.message_count > 45) {
                estimatedPlan = row.message_count > 225 ? 'max20x' : 'max5x';
            }
            
            const planLimits = limits[estimatedPlan];
            const messageUsagePercent = Math.round((row.message_count / planLimits.messages) * 100);
            const promptUsagePercent = Math.round((row.message_count / planLimits.prompts.max) * 100);
            
            // Quota status
            let quotaStatus = 'healthy';
            if (messageUsagePercent > 90) quotaStatus = 'critical';
            else if (messageUsagePercent > 75) quotaStatus = 'warning';
            else if (messageUsagePercent > 50) quotaStatus = 'moderate';
            
            return {
                sessionId: row.session_id,
                startTime: startTime,
                lastActivity: lastActivity,
                isActive: (Date.now() - lastActivity) < 300000, // Active if < 5 minutes ago
                isRealTimeActive: (Date.now() - lastActivity) < 30000, // Real-time if < 30 seconds ago
                messageCount: row.message_count || 0,
                tokens: {
                    input: row.input_tokens || 0,
                    output: row.output_tokens || 0,
                    cacheCreation: row.cache_creation_tokens || 0,
                    cacheRead: row.cache_read_tokens || 0,
                    total: totalTokens,
                    efficiency: Math.round(efficiency * 10) / 10
                },
                timing: {
                    sessionDuration: sessionDuration,
                    remainingTime: remainingTime,
                    percentage: Math.min((sessionDuration / fiveHourWindow) * 100, 100)
                },
                cost: {
                    estimate: Math.round(costEstimate * 10000) / 10000,
                    ratePerMin: sessionDuration > 0 ? Math.round((totalTokens / sessionDuration) * 60000) : 0
                },
                quota: {
                    plan: estimatedPlan,
                    messageUsage: {
                        used: row.message_count || 0,
                        limit: planLimits.messages,
                        percentage: messageUsagePercent
                    },
                    promptUsage: {
                        used: row.message_count || 0,
                        minLimit: planLimits.prompts.min,
                        maxLimit: planLimits.prompts.max,
                        percentage: promptUsagePercent
                    },
                    status: quotaStatus
                }
            };
        });
        
        res.json(sessions);
    });
});

// Get specific session details
app.get('/api/claude-sessions/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    
    const query = `
        SELECT *
        FROM activity 
        WHERE source = 'claude-code' 
            AND json_extract(data, '$.sessionId') = ?
        ORDER BY timestamp ASC
    `;
    
    db.all(query, [sessionId], (err, rows) => {
        if (err) {
            console.error('Error fetching session details:', err);
            return res.status(500).json({ error: 'Failed to fetch session details' });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const activities = rows.map(row => {
            try {
                row.data = JSON.parse(row.data);
            } catch (e) {
                // Keep as string if not valid JSON
            }
            return row;
        });
        
        res.json({
            sessionId: sessionId,
            totalActivities: activities.length,
            activities: activities
        });
    });
});

// Health check endpoint
// Token metrics endpoint
app.get("/api/token-metrics", (req, res) => {

// Model usage breakdown endpoint
app.get("/api/model-usage", (req, res) => {
    const query = `
        SELECT 
            json_extract(data, "$.message.model") as model,
            COUNT(*) as message_count,
            COALESCE(SUM(json_extract(data, "$.message.usage.input_tokens")), 0) as input_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.output_tokens")), 0) as output_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_creation_input_tokens")), 0) as cache_creation,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_read_input_tokens")), 0) as cache_read
        FROM activity 
        WHERE source="claude-code" 
            AND type="message" 
            AND json_extract(data, "$.message.model") IS NOT NULL 
        GROUP BY model 
        ORDER BY message_count DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error("Error fetching model usage:", err);
            res.status(500).json({ error: "Failed to fetch model usage" });
            return;
        }
        
        const modelUsage = rows.map(row => ({
            model: row.model,
            messageCount: row.message_count,
            inputTokens: row.input_tokens || 0,
            outputTokens: row.output_tokens || 0,
            cacheCreation: row.cache_creation || 0,
            cacheRead: row.cache_read || 0,
            totalTokens: (row.input_tokens || 0) + (row.output_tokens || 0) + (row.cache_creation || 0) + (row.cache_read || 0)
        }));
        
        res.json({ models: modelUsage });
    });
});

// Model usage endpoint
app.get("/api/model-usage", (req, res) => {
    const query = `
        SELECT 
            json_extract(data, "$.message.model") as model,
            COUNT(*) as message_count,
            COALESCE(SUM(json_extract(data, "$.message.usage.input_tokens")), 0) as input_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.output_tokens")), 0) as output_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_creation_input_tokens")), 0) as cache_creation_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_read_input_tokens")), 0) as cache_read_tokens
        FROM activity 
        WHERE source="claude-code" 
            AND type="message" 
            AND json_extract(data, "$.message.model") IS NOT NULL
            AND json_extract(data, "$.message.usage") IS NOT NULL
        GROUP BY model 
        ORDER BY message_count DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error("Error fetching model usage:", err);
            res.status(500).json({ error: "Failed to fetch model usage" });
            return;
        }
        
        const modelUsage = rows.map(row => ({
            model: row.model,
            messageCount: row.message_count || 0,
            inputTokens: row.input_tokens || 0,
            outputTokens: row.output_tokens || 0,
            cacheCreationTokens: row.cache_creation_tokens || 0,
            cacheReadTokens: row.cache_read_tokens || 0,
            totalTokens: (row.input_tokens || 0) + (row.output_tokens || 0) + 
                        (row.cache_creation_tokens || 0) + (row.cache_read_tokens || 0)
        }));
        
        res.json({ models: modelUsage });
    });
});
    const query = `
        SELECT 
            COALESCE(SUM(json_extract(data, "$.message.usage.input_tokens")), 0) as input_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.output_tokens")), 0) as output_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_creation_input_tokens")), 0) as cache_creation_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_read_input_tokens")), 0) as cache_read_tokens,
            COUNT(*) as message_count
        FROM activity 
        WHERE source="claude-code" 
            AND type="message" 
            AND json_extract(data, "$.message.usage") IS NOT NULL
    `;
    
    db.get(query, (err, row) => {
        if (err) {
            console.error("Error fetching token metrics:", err);
            res.status(500).json({ error: "Failed to fetch token metrics" });
            return;
        }
        
        const total = (row.input_tokens || 0) + (row.output_tokens || 0) + 
                     (row.cache_creation_tokens || 0) + (row.cache_read_tokens || 0);
        
        res.json({
            total: total,
            input: row.input_tokens || 0,
            output: row.output_tokens || 0,
            cacheCreation: row.cache_creation_tokens || 0,
            cacheRead: row.cache_read_tokens || 0,
            messageCount: row.message_count || 0
        });
    });
});

// Sync session data to Supabase
app.post('/api/sync-to-supabase', async (req, res) => {
    try {
        // Get current Claude Code sessions
        const sessions = await getClaudeCodeSessions();
        
        let syncedCount = 0;
        const errors = [];
        
        for (const session of sessions) {
            try {
                const { data, error } = await supabase
                    .from('claude_sessions')
                    .upsert({
                        session_id: session.sessionId,
                        start_time: new Date(session.startTime).toISOString(),
                        last_activity: new Date(session.lastActivity).toISOString(),
                        is_active: session.isActive,
                        is_realtime_active: session.isRealTimeActive,
                        message_count: session.messageCount,
                        input_tokens: session.tokens.input,
                        output_tokens: session.tokens.output,
                        cache_creation_tokens: session.tokens.cacheCreation,
                        cache_read_tokens: session.tokens.cacheRead,
                        total_tokens: session.tokens.total,
                        efficiency: session.tokens.efficiency,
                        session_duration: session.timing.sessionDuration,
                        remaining_time: session.timing.remainingTime,
                        percentage: session.timing.percentage,
                        cost_estimate: session.cost.estimate,
                        rate_per_min: session.cost.ratePerMin,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'session_id'
                    });
                
                if (error) {
                    errors.push(`Session ${session.sessionId}: ${error.message}`);
                } else {
                    syncedCount++;
                }
            } catch (syncError) {
                errors.push(`Session ${session.sessionId}: ${syncError.message}`);
            }
        }
        
        res.json({
            success: true,
            syncedSessions: syncedCount,
            totalSessions: sessions.length,
            errors: errors,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Synced ${syncedCount}/${sessions.length} sessions to Supabase`);
        
    } catch (error) {
        console.error('Error syncing to Supabase:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to get Claude Code sessions in the right format
async function getClaudeCodeSessions() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                json_extract(data, '$.sessionId') as session_id,
                MIN(timestamp) as start_time,
                MAX(timestamp) as last_activity,
                COUNT(*) as message_count,
                COALESCE(SUM(json_extract(data, '$.message.usage.input_tokens')), 0) as input_tokens,
                COALESCE(SUM(json_extract(data, '$.message.usage.output_tokens')), 0) as output_tokens,
                COALESCE(SUM(json_extract(data, '$.message.usage.cache_creation_input_tokens')), 0) as cache_creation_tokens,
                COALESCE(SUM(json_extract(data, '$.message.usage.cache_read_input_tokens')), 0) as cache_read_tokens
            FROM activity 
            WHERE source = 'claude-code' 
                AND json_extract(data, '$.sessionId') IS NOT NULL
            GROUP BY json_extract(data, '$.sessionId')
            ORDER BY MAX(timestamp) DESC
            LIMIT 10
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                return reject(err);
            }
            
            const sessions = rows.map(row => {
                const startTime = new Date(row.start_time).getTime();
                const lastActivity = new Date(row.last_activity).getTime();
                const sessionDuration = Date.now() - startTime;
                const fiveHourWindow = 5 * 60 * 60 * 1000;
                const remainingTime = Math.max(0, fiveHourWindow - sessionDuration);
                
                const totalTokens = (row.input_tokens || 0) + (row.output_tokens || 0) + 
                                  (row.cache_creation_tokens || 0);
                const totalInputTokens = (row.input_tokens || 0) + (row.cache_creation_tokens || 0);
                const efficiency = totalInputTokens > 0 ? ((row.cache_read_tokens || 0) / totalInputTokens) * 100 : 0;
                
                const costEstimate = (totalInputTokens * 0.003 / 1000) + ((row.output_tokens || 0) * 0.015 / 1000);
                
                return {
                    sessionId: row.session_id,
                    startTime: startTime,
                    lastActivity: lastActivity,
                    isActive: (Date.now() - lastActivity) < 300000,
                    isRealTimeActive: (Date.now() - lastActivity) < 30000,
                    messageCount: row.message_count || 0,
                    tokens: {
                        input: row.input_tokens || 0,
                        output: row.output_tokens || 0,
                        cacheCreation: row.cache_creation_tokens || 0,
                        cacheRead: row.cache_read_tokens || 0,
                        total: totalTokens,
                        efficiency: Math.round(efficiency * 10) / 10
                    },
                    timing: {
                        sessionDuration: sessionDuration,
                        remainingTime: remainingTime,
                        percentage: Math.min((sessionDuration / fiveHourWindow) * 100, 100)
                    },
                    cost: {
                        estimate: Math.round(costEstimate * 10000) / 10000,
                        ratePerMin: sessionDuration > 0 ? Math.round((totalTokens / sessionDuration) * 60000) : 0
                    }
                };
            });
            
            resolve(sessions);
        });
    });
}

// Enhanced model usage endpoint with Claude Code limits integration
app.get("/api/model-usage", (req, res) => {
    const query = `
        SELECT 
            json_extract(data, "$.message.model") as model,
            COUNT(*) as message_count,
            COALESCE(SUM(json_extract(data, "$.message.usage.input_tokens")), 0) as input_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.output_tokens")), 0) as output_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_creation_input_tokens")), 0) as cache_creation_tokens,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_read_input_tokens")), 0) as cache_read_tokens,
            MIN(timestamp) as first_usage,
            MAX(timestamp) as last_usage
        FROM activity 
        WHERE source="claude-code" 
            AND type="message" 
            AND json_extract(data, "$.message.model") IS NOT NULL
            AND json_extract(data, "$.message.model") != "<synthetic>"
        GROUP BY json_extract(data, "$.message.model")
        ORDER BY message_count DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error("Error fetching model usage:", err);
            res.status(500).json({ error: "Failed to fetch model usage" });
            return;
        }
        
        const models = rows.map(row => {
            const totalTokens = (row.input_tokens || 0) + (row.output_tokens || 0) + (row.cache_creation_tokens || 0) + (row.cache_read_tokens || 0);
            const cacheTokens = (row.cache_creation_tokens || 0) + (row.cache_read_tokens || 0);
            
            // Calculate pricing based on model type
            let costPerInputToken, costPerOutputToken;
            if (row.model && row.model.includes('sonnet')) {
                costPerInputToken = 3 / 1000000; // $3 per M tokens
                costPerOutputToken = 15 / 1000000; // $15 per M tokens
            } else if (row.model && row.model.includes('opus')) {
                costPerInputToken = 15 / 1000000; // $15 per M tokens
                costPerOutputToken = 75 / 1000000; // $75 per M tokens
            } else {
                costPerInputToken = 3 / 1000000; // Default to Sonnet pricing
                costPerOutputToken = 15 / 1000000;
            }
            
            const costEstimate = ((row.input_tokens || 0) + (row.cache_creation_tokens || 0)) * costPerInputToken + (row.output_tokens || 0) * costPerOutputToken;
            
            return {
                model: row.model,
                messageCount: row.message_count,
                totalTokens: totalTokens,
                inputTokens: row.input_tokens || 0,
                outputTokens: row.output_tokens || 0,
                cacheCreationTokens: row.cache_creation_tokens || 0,
                cacheReadTokens: row.cache_read_tokens || 0,
                cacheTokens: cacheTokens,
                costEstimate: Math.round(costEstimate * 10000) / 10000,
                firstUsage: row.first_usage,
                lastUsage: row.last_usage,
                efficiency: row.input_tokens > 0 ? Math.round(((row.cache_read_tokens || 0) / ((row.input_tokens || 0) + (row.cache_creation_tokens || 0))) * 1000) / 10 : 0
            };
        });
        
        // Add Claude Code usage limits information
        const claudeCodeLimits = {
            pro: {
                messagesPerFiveHours: 45,
                promptsPerFiveHours: { min: 10, max: 40 },
                weeklyHours: { min: 40, max: 80, model: 'sonnet-4' }
            },
            max5x: {
                messagesPerFiveHours: 225,
                promptsPerFiveHours: { min: 50, max: 200 },
                weeklyHours: { sonnet: { min: 140, max: 280 }, opus: { min: 15, max: 35 } }
            },
            max20x: {
                messagesPerFiveHours: 900,
                promptsPerFiveHours: { min: 200, max: 800 },
                weeklyHours: { sonnet: { min: 240, max: 480 }, opus: { min: 24, max: 40 } }
            }
        };
        
        res.json({ 
            models,
            claudeCodeLimits,
            timestamp: new Date().toISOString()
        });
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connections: clients.size,
        database: DB_PATH
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   Claude Monitor Dashboard Server        ║
    ╠══════════════════════════════════════════╣
    ║   🚀 Server running on port ${PORT}         ║
    ║   📊 Dashboard: http://localhost:${PORT}    ║
    ║   🔌 WebSocket: ws://localhost:${PORT}      ║
    ║   💾 Database: ${path.basename(DB_PATH)}             ║
    ╚══════════════════════════════════════════╝
    
    API Endpoints:
    • POST /api/activity     - Receive monitor data
    • GET  /api/stats        - Get statistics
    • GET  /api/activities   - Get recent activities
    • GET  /api/metrics      - Get metrics
    • GET  /health           - Health check
    
    WebSocket events:
    • new_activity - Real-time activity updates
    • stats        - Statistics updates
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down dashboard server...');
    
    // Close WebSocket connections
    clients.forEach(client => client.close());
    
    // Close database
    db.close((err) => {
        if (err) console.error('Error closing database:', err);
        console.log('✅ Dashboard server stopped');
        process.exit(0);
    });
});

// Enhanced Rate Limiting Endpoints
const { addRateLimitEndpoints } = require('./enhanced-rate-limits');
addRateLimitEndpoints(app, db);

