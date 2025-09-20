const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize connections
const db = new sqlite3.Database('./claude-monitor.db');

// Load Supabase credentials
const envPath = '../moonlock-dashboard/.env';
let supabaseKey = '';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    supabaseKey = envContent.match(/SUPABASE_KEY=(.+)/)?.[1] || '';
}

const supabase = supabaseKey ? createClient('https://rdsfgdtsbyioqilatvxu.supabase.co', supabaseKey) : null;

class ClaudeAnalytics {
    constructor() {
        this.initializeSchema();
    }

    // Enhance SQLite schema for better analytics
    initializeSchema() {
        console.log('🔧 Initializing enhanced schema...');
        
        const queries = [
            // Add analytics columns if they don't exist
            `ALTER TABLE activity ADD COLUMN session_id TEXT DEFAULT NULL;`,
            `ALTER TABLE activity ADD COLUMN tokens_used INTEGER DEFAULT 0;`,
            `ALTER TABLE activity ADD COLUMN cost_estimate REAL DEFAULT 0.0;`,
            `ALTER TABLE activity ADD COLUMN efficiency REAL DEFAULT 0.0;`,
            `ALTER TABLE activity ADD COLUMN project_name TEXT DEFAULT NULL;`,
            `ALTER TABLE activity ADD COLUMN machine_id TEXT DEFAULT '${require('os').hostname()}';`,
            
            // Create indexes for performance
            `CREATE INDEX IF NOT EXISTS idx_activity_session_id ON activity(session_id);`,
            `CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp);`,
            `CREATE INDEX IF NOT EXISTS idx_activity_source_type ON activity(source, type);`,
            `CREATE INDEX IF NOT EXISTS idx_activity_machine ON activity(machine_id);`,
            
            // Create analytics views
            `CREATE VIEW IF NOT EXISTS session_analytics AS
            SELECT 
                session_id,
                MIN(timestamp) as session_start,
                MAX(timestamp) as session_end,
                COUNT(*) as message_count,
                SUM(tokens_used) as total_tokens,
                AVG(efficiency) as avg_efficiency,
                SUM(cost_estimate) as total_cost,
                source,
                project_name,
                machine_id,
                (julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 24 * 60 as duration_minutes
            FROM activity 
            WHERE session_id IS NOT NULL
            GROUP BY session_id, source, project_name, machine_id;`,
            
            `CREATE VIEW IF NOT EXISTS daily_summary AS
            SELECT 
                date(timestamp) as day,
                source,
                machine_id,
                COUNT(*) as activities,
                COUNT(DISTINCT session_id) as unique_sessions,
                SUM(tokens_used) as total_tokens,
                AVG(efficiency) as avg_efficiency,
                SUM(cost_estimate) as total_cost
            FROM activity 
            GROUP BY date(timestamp), source, machine_id
            ORDER BY day DESC;`,
            
            `CREATE VIEW IF NOT EXISTS productivity_patterns AS
            SELECT 
                strftime('%w', timestamp) as day_of_week,
                strftime('%H', timestamp) as hour,
                COUNT(*) as activity_count,
                AVG(tokens_used) as avg_tokens,
                COUNT(DISTINCT session_id) as session_count
            FROM activity 
            WHERE timestamp > datetime('now', '-30 days')
            GROUP BY day_of_week, hour
            ORDER BY activity_count DESC;`
        ];

        queries.forEach(query => {
            db.run(query, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.log('Schema update:', err.message);
                }
            });
        });
    }

    // Generate comprehensive analytics report
    generateReport() {
        console.log('\n📊 CLAUDE MONITOR ANALYTICS REPORT');
        console.log('='*50);
        
        this.getOverviewStats();
        setTimeout(() => this.getSessionAnalytics(), 1000);
        setTimeout(() => this.getDailyTrends(), 2000);
        setTimeout(() => this.getProductivityPatterns(), 3000);
        if (supabase) setTimeout(() => this.compareWithCloud(), 4000);
    }

    getOverviewStats() {
        const query = `
            SELECT 
                COUNT(*) as total_activities,
                COUNT(DISTINCT date(timestamp)) as active_days,
                COUNT(DISTINCT session_id) as total_sessions,
                SUM(tokens_used) as total_tokens,
                SUM(cost_estimate) as total_cost,
                MIN(timestamp) as first_activity,
                MAX(timestamp) as last_activity
            FROM activity;
        `;
        
        db.get(query, (err, row) => {
            if (err) {
                console.error('Error getting overview:', err);
                return;
            }
            
            console.log('\n📈 OVERVIEW STATISTICS:');
            console.log(`Total Activities: ${row.total_activities.toLocaleString()}`);
            console.log(`Active Days: ${row.active_days}`);
            console.log(`Unique Sessions: ${row.total_sessions || 0}`);
            console.log(`Total Tokens: ${(row.total_tokens || 0).toLocaleString()}`);
            console.log(`Estimated Cost: $${(row.total_cost || 0).toFixed(4)}`);
            console.log(`Date Range: ${row.first_activity} to ${row.last_activity}`);
        });
    }

    getSessionAnalytics() {
        const query = `
            SELECT * FROM session_analytics 
            WHERE total_tokens > 0
            ORDER BY total_tokens DESC 
            LIMIT 10;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting sessions:', err);
                return;
            }
            
            console.log('\n🏆 TOP SESSIONS BY TOKEN USAGE:');
            if (rows.length === 0) {
                console.log('No session data available yet.');
                return;
            }
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.session_id}`);
                console.log(`   Duration: ${row.duration_minutes?.toFixed(1)} minutes`);
                console.log(`   Tokens: ${row.total_tokens?.toLocaleString()}`);
                console.log(`   Project: ${row.project_name || 'Unknown'}`);
                console.log(`   Machine: ${row.machine_id}`);
            });
        });
    }

    getDailyTrends() {
        const query = `
            SELECT * FROM daily_summary 
            WHERE day > date('now', '-7 days')
            ORDER BY day DESC;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting daily trends:', err);
                return;
            }
            
            console.log('\n📅 7-DAY ACTIVITY SUMMARY:');
            rows.forEach(row => {
                console.log(`${row.day} | ${row.source} | ${row.machine_id}`);
                console.log(`  Activities: ${row.activities}, Sessions: ${row.unique_sessions}, Tokens: ${row.total_tokens || 0}`);
            });
        });
    }

    getProductivityPatterns() {
        const query = `
            SELECT 
                day_of_week,
                hour,
                activity_count,
                session_count
            FROM productivity_patterns 
            ORDER BY activity_count DESC 
            LIMIT 10;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting patterns:', err);
                return;
            }
            
            console.log('\n⏰ PEAK PRODUCTIVITY HOURS:');
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            rows.forEach((row, index) => {
                const day = dayNames[row.day_of_week];
                console.log(`${index + 1}. ${day} ${row.hour}:00 - ${row.activity_count} activities, ${row.session_count} sessions`);
            });
        });
    }

    async compareWithCloud() {
        if (!supabase) {
            console.log('\n☁️ Supabase not configured for cloud comparison');
            return;
        }

        try {
            const { data: cloudSessions, error } = await supabase
                .from('claude_sessions')
                .select('*');

            if (error) {
                console.log('\n❌ Error fetching cloud data:', error.message);
                return;
            }

            console.log('\n☁️ CLOUD vs LOCAL COMPARISON:');
            console.log(`Cloud Sessions: ${cloudSessions?.length || 0}`);
            
            if (cloudSessions && cloudSessions.length > 0) {
                const totalCloudTokens = cloudSessions.reduce((sum, session) => sum + (session.total_tokens || 0), 0);
                const avgEfficiency = cloudSessions.reduce((sum, session) => sum + (session.efficiency || 0), 0) / cloudSessions.length;
                
                console.log(`Total Cloud Tokens: ${totalCloudTokens.toLocaleString()}`);
                console.log(`Average Efficiency: ${(avgEfficiency * 100).toFixed(1)}%`);
                
                // Show latest session
                const latest = cloudSessions.sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))[0];
                console.log(`Latest Session: ${latest.session_id} (${latest.last_activity})`);
            }
        } catch (error) {
            console.log('\n❌ Cloud comparison failed:', error.message);
        }
    }

    // Export data for external analysis
    exportToCSV() {
        const query = `
            SELECT 
                timestamp,
                source,
                type,
                session_id,
                tokens_used,
                efficiency,
                cost_estimate,
                project_name,
                machine_id,
                data
            FROM activity 
            WHERE timestamp > datetime('now', '-30 days')
            ORDER BY timestamp DESC;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Export error:', err);
                return;
            }
            
            const csvHeader = 'timestamp,source,type,session_id,tokens_used,efficiency,cost_estimate,project_name,machine_id,data\n';
            const csvData = rows.map(row => 
                `"${row.timestamp}","${row.source}","${row.type}","${row.session_id || ''}",${row.tokens_used || 0},${row.efficiency || 0},${row.cost_estimate || 0},"${row.project_name || ''}","${row.machine_id || ''}","${(row.data || '').replace(/"/g, '""')}"`
            ).join('\n');
            
            const filename = `claude-monitor-export-${new Date().toISOString().split('T')[0]}.csv`;
            fs.writeFileSync(filename, csvHeader + csvData);
            console.log(`\n✅ Exported ${rows.length} records to ${filename}`);
        });
    }

    // Sync with Supabase
    async syncToCloud() {
        if (!supabase) {
            console.log('❌ Supabase not configured for sync');
            return;
        }

        console.log('\n🔄 Starting sync to cloud...');
        
        // Get recent activities that might need syncing
        const query = `
            SELECT * FROM activity 
            WHERE timestamp > datetime('now', '-1 days')
            AND session_id IS NOT NULL
            ORDER BY timestamp DESC;
        `;
        
        db.all(query, async (err, rows) => {
            if (err) {
                console.error('Sync error:', err);
                return;
            }
            
            if (rows.length === 0) {
                console.log('No recent session data to sync');
                return;
            }
            
            // Group by session_id and create session summaries
            const sessionMap = {};
            rows.forEach(row => {
                if (!sessionMap[row.session_id]) {
                    sessionMap[row.session_id] = {
                        session_id: row.session_id,
                        start_time: row.timestamp,
                        last_activity: row.timestamp,
                        tokens_used: row.tokens_used || 0,
                        token_budget: 200000,
                        is_realtime_active: false,
                        input_tokens: Math.floor((row.tokens_used || 0) * 0.7),
                        output_tokens: Math.floor((row.tokens_used || 0) * 0.3),
                        cache_read_tokens: 0,
                        cache_creation_tokens: 0,
                        total_tokens: row.tokens_used || 0,
                        efficiency: row.efficiency || 0,
                        rate_per_min: 0,
                        cost_estimate: row.cost_estimate || 0,
                        budget_percentage: 0,
                        remaining_time: 0,
                        elapsed_time: 0
                    };
                } else {
                    // Update with latest activity
                    sessionMap[row.session_id].last_activity = row.timestamp;
                    sessionMap[row.session_id].tokens_used += row.tokens_used || 0;
                    sessionMap[row.session_id].total_tokens += row.tokens_used || 0;
                }
            });
            
            const sessions = Object.values(sessionMap);
            
            try {
                const { error } = await supabase
                    .from('claude_sessions')
                    .upsert(sessions);
                
                if (error) {
                    console.log('❌ Sync failed:', error.message);
                } else {
                    console.log(`✅ Synced ${sessions.length} sessions to cloud`);
                }
            } catch (error) {
                console.log('❌ Sync error:', error.message);
            }
        });
    }

    close() {
        db.close();
    }
}

// CLI interface
const analytics = new ClaudeAnalytics();

const command = process.argv[2];
switch (command) {
    case 'report':
        analytics.generateReport();
        setTimeout(() => analytics.close(), 5000);
        break;
    case 'export':
        analytics.exportToCSV();
        analytics.close();
        break;
    case 'sync':
        analytics.syncToCloud().then(() => analytics.close());
        break;
    default:
        console.log('📊 Claude Monitor Enhanced Analytics');
        console.log('Usage:');
        console.log('  node enhanced-analytics.js report  - Generate full analytics report');
        console.log('  node enhanced-analytics.js export  - Export data to CSV');
        console.log('  node enhanced-analytics.js sync    - Sync to cloud database');
        analytics.close();
}
