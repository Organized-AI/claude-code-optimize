const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Initialize connection
const db = new sqlite3.Database('./claude-monitor.db');

class SimpleAnalytics {
    // Generate basic report with current schema
    generateReport() {
        console.log('\n📊 CLAUDE MONITOR ANALYTICS REPORT');
        console.log('='*50);
        
        this.getBasicStats();
        setTimeout(() => this.getActivityBreakdown(), 1000);
        setTimeout(() => this.getDailyActivity(), 2000);
        setTimeout(() => this.getHourlyPatterns(), 3000);
        setTimeout(() => this.close(), 4000);
    }

    getBasicStats() {
        const query = `
            SELECT 
                COUNT(*) as total_activities,
                COUNT(DISTINCT date(timestamp)) as active_days,
                COUNT(DISTINCT source) as unique_sources,
                MIN(timestamp) as first_activity,
                MAX(timestamp) as last_activity
            FROM activity;
        `;
        
        db.get(query, (err, row) => {
            if (err) {
                console.error('Error getting basic stats:', err);
                return;
            }
            
            console.log('\n📈 OVERVIEW STATISTICS:');
            console.log(`Total Activities: ${row.total_activities.toLocaleString()}`);
            console.log(`Active Days: ${row.active_days}`);
            console.log(`Data Sources: ${row.unique_sources}`);
            console.log(`Date Range: ${row.first_activity} to ${row.last_activity}`);
            
            // Calculate days active
            const firstDate = new Date(row.first_activity);
            const lastDate = new Date(row.last_activity);
            const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
            console.log(`Activity Frequency: ${(row.total_activities / totalDays).toFixed(1)} activities/day`);
        });
    }

    getActivityBreakdown() {
        const query = `
            SELECT 
                source,
                type,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM activity), 2) as percentage
            FROM activity 
            GROUP BY source, type
            ORDER BY count DESC;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting breakdown:', err);
                return;
            }
            
            console.log('\n🔍 ACTIVITY BREAKDOWN:');
            rows.forEach(row => {
                console.log(`${row.source} | ${row.type}: ${row.count.toLocaleString()} (${row.percentage}%)`);
            });
        });
    }

    getDailyActivity() {
        const query = `
            SELECT 
                date(timestamp) as day,
                source,
                COUNT(*) as activities
            FROM activity 
            WHERE timestamp > datetime('now', '-7 days')
            GROUP BY date(timestamp), source
            ORDER BY day DESC, source;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting daily activity:', err);
                return;
            }
            
            console.log('\n📅 7-DAY ACTIVITY SUMMARY:');
            let currentDay = '';
            rows.forEach(row => {
                if (row.day !== currentDay) {
                    if (currentDay) console.log('');
                    console.log(`${row.day}:`);
                    currentDay = row.day;
                }
                console.log(`  ${row.source}: ${row.activities} activities`);
            });
        });
    }

    getHourlyPatterns() {
        const query = `
            SELECT 
                strftime('%H', timestamp) as hour,
                COUNT(*) as activity_count,
                COUNT(DISTINCT date(timestamp)) as days_active
            FROM activity 
            WHERE timestamp > datetime('now', '-7 days')
            GROUP BY hour
            HAVING activity_count > 5
            ORDER BY activity_count DESC 
            LIMIT 10;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error getting hourly patterns:', err);
                return;
            }
            
            console.log('\n⏰ PEAK ACTIVITY HOURS (Last 7 Days):');
            rows.forEach((row, index) => {
                const avgPerDay = (row.activity_count / row.days_active).toFixed(1);
                console.log(`${index + 1}. ${row.hour}:00 - ${row.activity_count} total (${avgPerDay}/day avg)`);
            });
        });
    }

    // Export current data
    exportToCSV() {
        const query = `
            SELECT 
                timestamp,
                source,
                type,
                data
            FROM activity 
            ORDER BY timestamp DESC;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Export error:', err);
                return;
            }
            
            const csvHeader = 'timestamp,source,type,data\n';
            const csvData = rows.map(row => 
                `"${row.timestamp}","${row.source}","${row.type}","${(row.data || '').replace(/"/g, '""')}"`
            ).join('\n');
            
            const filename = `claude-monitor-basic-export-${new Date().toISOString().split('T')[0]}.csv`;
            fs.writeFileSync(filename, csvHeader + csvData);
            console.log(`✅ Exported ${rows.length} records to ${filename}`);
        });
    }

    // Analyze Claude activity patterns
    analyzeClaudeActivity() {
        const query = `
            SELECT 
                source,
                data,
                timestamp
            FROM activity 
            WHERE (source = 'claude-code' OR source = 'claude-desktop')
            AND data LIKE '%pid%'
            ORDER BY timestamp DESC
            LIMIT 20;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error analyzing Claude activity:', err);
                return;
            }
            
            console.log('\n🔍 RECENT CLAUDE ACTIVITY:');
            rows.forEach(row => {
                try {
                    const data = JSON.parse(row.data);
                    console.log(`${row.timestamp} | ${row.source} | PID: ${data.pid} | Status: ${data.status}`);
                } catch (e) {
                    console.log(`${row.timestamp} | ${row.source} | ${row.data}`);
                }
            });
        });
    }

    close() {
        db.close();
    }
}

// CLI interface
const analytics = new SimpleAnalytics();

const command = process.argv[2];
switch (command) {
    case 'report':
        analytics.generateReport();
        break;
    case 'export':
        analytics.exportToCSV();
        analytics.close();
        break;
    case 'claude':
        analytics.analyzeClaudeActivity();
        analytics.close();
        break;
    default:
        console.log('📊 Claude Monitor Simple Analytics');
        console.log('Usage:');
        console.log('  node simple-analytics.js report  - Generate analytics report');
        console.log('  node simple-analytics.js export  - Export data to CSV');
        console.log('  node simple-analytics.js claude  - Analyze Claude activity');
        analytics.close();
}
