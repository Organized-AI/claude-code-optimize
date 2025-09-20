const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Initialize connection
const db = new sqlite3.Database('./claude-monitor.db');

class ClaudeSessionAnalyzer {
    constructor() {
        this.sessions = new Map();
        this.analyzeData();
    }

    analyzeData() {
        console.log('\n🔍 CLAUDE SESSION ANALYZER');
        console.log('='*40);
        
        this.parseClaudeCodeSessions();
        setTimeout(() => this.analyzeClaudeDesktopActivity(), 1000);
        setTimeout(() => this.generateSessionReport(), 2000);
        setTimeout(() => this.close(), 3000);
    }

    parseClaudeCodeSessions() {
        const query = `
            SELECT 
                timestamp,
                data
            FROM activity 
            WHERE source = 'claude-code' AND type = 'message'
            ORDER BY timestamp ASC;
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error parsing Claude Code sessions:', err);
                return;
            }
            
            console.log(`\n📊 Analyzing ${rows.length} Claude Code messages...`);
            
            rows.forEach(row => {
                try {
                    const data = JSON.parse(row.data);
                    const sessionId = data.parentUuid || 'standalone-message';
                    
                    if (!this.sessions.has(sessionId)) {
                        this.sessions.set(sessionId, {
                            sessionId: sessionId,
                            startTime: row.timestamp,
                            endTime: row.timestamp,
                            messageCount: 0,
                            cwd: data.cwd || 'unknown',
                            messages: []
                        });
                    }
                    
                    const session = this.sessions.get(sessionId);
                    session.endTime = row.timestamp;
                    session.messageCount++;
                    session.messages.push({
                        timestamp: row.timestamp,
                        content: data.content,
                        userType: data.userType,
                        isSidechain: data.isSidechain
                    });
                    
                } catch (e) {
                    console.log('Failed to parse message:', e.message);
                }
            });
            
            console.log(`✅ Identified ${this.sessions.size} Claude Code sessions`);
        });
    }

    analyzeClaudeDesktopActivity() {
        const query = `
            SELECT 
                COUNT(*) as activity_count,
                MIN(timestamp) as first_seen,
                MAX(timestamp) as last_seen
            FROM activity 
            WHERE source = 'claude-desktop';
        `;
        
        db.get(query, (err, row) => {
            if (err) {
                console.error('Error analyzing Claude Desktop:', err);
                return;
            }
            
            console.log('\n🖥️ CLAUDE DESKTOP ACTIVITY:');
            console.log(`Total Activities: ${row.activity_count}`);
            console.log(`First Seen: ${row.first_seen}`);
            console.log(`Last Seen: ${row.last_seen}`);
            
            // Get file types being monitored
            const fileQuery = `
                SELECT data FROM activity 
                WHERE source = 'claude-desktop' 
                ORDER BY timestamp DESC 
                LIMIT 10;
            `;
            
            db.all(fileQuery, (err, fileRows) => {
                if (err) return;
                
                const fileTypes = new Set();
                fileRows.forEach(fileRow => {
                    try {
                        const data = JSON.parse(fileRow.data);
                        if (data.file) {
                            const ext = data.file.split('.').pop();
                            fileTypes.add(ext);
                        }
                    } catch (e) {}
                });
                
                console.log(`File Types Monitored: ${Array.from(fileTypes).join(', ')}`);
            });
        });
    }

    generateSessionReport() {
        setTimeout(() => {
            console.log('\n📈 CLAUDE CODE SESSION ANALYSIS:');
            
            if (this.sessions.size === 0) {
                console.log('No sessions found.');
                return;
            }
            
            const sessions = Array.from(this.sessions.values());
            
            // Sort by message count
            sessions.sort((a, b) => b.messageCount - a.messageCount);
            
            console.log(`\n🏆 TOP SESSIONS BY MESSAGE COUNT:`);
            sessions.slice(0, 5).forEach((session, index) => {
                const duration = this.calculateDuration(session.startTime, session.endTime);
                console.log(`${index + 1}. Session: ${session.sessionId.substring(0, 8)}...`);
                console.log(`   Messages: ${session.messageCount}, Duration: ${duration}`);
                console.log(`   Working Directory: ${session.cwd.split('/').pop()}`);
                console.log(`   Time Range: ${session.startTime} to ${session.endTime}`);
            });
            
            // Session statistics
            const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
            const avgMessages = totalMessages / sessions.length;
            const longestSession = sessions.reduce((max, s) => 
                s.messageCount > max.messageCount ? s : max, sessions[0]);
            
            console.log('\n📊 SESSION STATISTICS:');
            console.log(`Total Sessions: ${sessions.length}`);
            console.log(`Total Messages: ${totalMessages}`);
            console.log(`Average Messages per Session: ${avgMessages.toFixed(1)}`);
            console.log(`Longest Session: ${longestSession.messageCount} messages`);
            
            // Working directory analysis
            const cwdCounts = {};
            sessions.forEach(session => {
                const dir = session.cwd.split('/').pop();
                cwdCounts[dir] = (cwdCounts[dir] || 0) + 1;
            });
            
            console.log('\n📁 PROJECTS WORKED ON:');
            Object.entries(cwdCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .forEach(([dir, count]) => {
                    console.log(`${dir}: ${count} sessions`);
                });
                
            // Time pattern analysis
            this.analyzeTimePatterns(sessions);
        }, 500);
    }

    analyzeTimePatterns(sessions) {
        console.log('\n⏰ SESSION TIME PATTERNS:');
        
        const hourCounts = {};
        sessions.forEach(session => {
            const hour = new Date(session.startTime).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        console.log('Sessions by Hour:');
        Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([hour, count]) => {
                console.log(`${hour}:00 - ${count} sessions`);
            });
    }

    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return '< 1 minute';
        if (diffMins < 60) return `${diffMins} minutes`;
        
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    }

    exportSessionData() {
        const sessions = Array.from(this.sessions.values());
        
        const csvHeader = 'session_id,start_time,end_time,message_count,duration_minutes,working_directory\n';
        const csvData = sessions.map(session => {
            const startTime = new Date(session.startTime);
            const endTime = new Date(session.endTime);
            const durationMins = (endTime - startTime) / (1000 * 60);
            
            return `"${session.sessionId}","${session.startTime}","${session.endTime}",${session.messageCount},${durationMins.toFixed(2)},"${session.cwd}"`;
        }).join('\n');
        
        const filename = `claude-sessions-${new Date().toISOString().split('T')[0]}.csv`;
        fs.writeFileSync(filename, csvHeader + csvData);
        console.log(`\n✅ Exported ${sessions.length} sessions to ${filename}`);
    }

    close() {
        db.close();
    }
}

// CLI interface
const command = process.argv[2];
if (command === 'export') {
    const analyzer = new ClaudeSessionAnalyzer();
    setTimeout(() => {
        analyzer.exportSessionData();
        analyzer.close();
    }, 2000);
} else {
    new ClaudeSessionAnalyzer();
}
