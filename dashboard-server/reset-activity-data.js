#!/usr/bin/env node

// Daily/Weekly Activity Data Reset Script for Claude Code Optimizer
// Cleans old data and resets counters for fresh session tracking

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'claude-monitor.db');

console.log('🧹 Starting Claude Monitor data reset...');

// Configuration
const RESET_MODE = process.argv[2] || 'daily'; // 'daily' or 'weekly'
const KEEP_HOURS = RESET_MODE === 'weekly' ? 24 * 7 : 24; // Keep 24 hours for daily, 7 days for weekly

console.log(`📅 Reset mode: ${RESET_MODE.toUpperCase()} (keeping last ${KEEP_HOURS} hours)`);

const db = new sqlite3.Database(DB_PATH);

async function resetActivityData() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('📊 Analyzing current data...');
            
            // Get current stats
            db.get(
                `SELECT 
                    COUNT(*) as total_activities,
                    MIN(timestamp) as oldest_activity,
                    MAX(timestamp) as newest_activity,
                    COUNT(DISTINCT source) as unique_sources,
                    COUNT(DISTINCT DATE(timestamp)) as unique_days
                FROM activity`,
                (err, stats) => {
                    if (err) {
                        console.error('❌ Error getting stats:', err);
                        return reject(err);
                    }
                    
                    console.log('📈 Current Database Stats:');
                    console.log(`   Total Activities: ${stats.total_activities}`);
                    console.log(`   Date Range: ${stats.oldest_activity} → ${stats.newest_activity}`);
                    console.log(`   Unique Sources: ${stats.unique_sources}`);
                    console.log(`   Days of Data: ${stats.unique_days}`);
                    
                    // Calculate cutoff time
                    const cutoffTime = new Date();
                    cutoffTime.setHours(cutoffTime.getHours() - KEEP_HOURS);
                    const cutoffISO = cutoffTime.toISOString();
                    
                    console.log(`🗑️  Removing data older than: ${cutoffISO}`);
                    
                    // Count activities to be deleted
                    db.get(
                        `SELECT COUNT(*) as to_delete FROM activity WHERE timestamp < ?`,
                        [cutoffISO],
                        (err, deleteCount) => {
                            if (err) {
                                console.error('❌ Error counting old activities:', err);
                                return reject(err);
                            }
                            
                            console.log(`🗑️  Activities to delete: ${deleteCount.to_delete}`);
                            console.log(`✅ Activities to keep: ${stats.total_activities - deleteCount.to_delete}`);
                            
                            if (deleteCount.to_delete === 0) {
                                console.log('🎉 No old data to clean! Database is already optimized.');
                                return resolve();
                            }
                            
                            // Start transaction for safe cleanup
                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('❌ Error starting transaction:', err);
                                    return reject(err);
                                }
                                
                                // Delete old activity data
                                db.run(
                                    `DELETE FROM activity WHERE timestamp < ?`,
                                    [cutoffISO],
                                    function(err) {
                                        if (err) {
                                            console.error('❌ Error deleting old activities:', err);
                                            db.run('ROLLBACK');
                                            return reject(err);
                                        }
                                        
                                        console.log(`✅ Deleted ${this.changes} old activities`);
                                        
                                        // Delete old metrics
                                        db.run(
                                            `DELETE FROM metrics WHERE timestamp < ?`,
                                            [cutoffISO],
                                            function(err) {
                                                if (err) {
                                                    console.error('❌ Error deleting old metrics:', err);
                                                    db.run('ROLLBACK');
                                                    return reject(err);
                                                }
                                                
                                                console.log(`✅ Deleted ${this.changes} old metrics`);
                                                
                                                // Clean up orphaned sessions
                                                db.run(
                                                    `DELETE FROM sessions WHERE last_activity < ?`,
                                                    [cutoffISO],
                                                    function(err) {
                                                        if (err) {
                                                            console.error('❌ Error cleaning sessions:', err);
                                                            db.run('ROLLBACK');
                                                            return reject(err);
                                                        }
                                                        
                                                        console.log(`✅ Cleaned ${this.changes} old sessions`);
                                                        
                                                        // Vacuum database to reclaim space
                                                        db.run('VACUUM', (err) => {
                                                            if (err) {
                                                                console.error('❌ Error vacuuming database:', err);
                                                                db.run('ROLLBACK');
                                                                return reject(err);
                                                            }
                                                            
                                                            console.log('✅ Database optimized (VACUUM completed)');
                                                            
                                                            // Commit transaction
                                                            db.run('COMMIT', (err) => {
                                                                if (err) {
                                                                    console.error('❌ Error committing transaction:', err);
                                                                    return reject(err);
                                                                }
                                                                
                                                                console.log('✅ Data reset completed successfully');
                                                                resolve();
                                                            });
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            });
                        }
                    );
                }
            );
        });
    });
}

async function resetSessionCounters() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Resetting session counters...');
        
        // Add a fresh session reset marker
        const resetMarker = {
            source: 'system',
            type: 'session_reset',
            timestamp: new Date().toISOString(),
            data: JSON.stringify({
                resetMode: RESET_MODE,
                keepHours: KEEP_HOURS,
                resetAt: new Date().toISOString()
            })
        };
        
        db.run(
            `INSERT INTO activity (source, type, timestamp, data) VALUES (?, ?, ?, ?)`,
            [resetMarker.source, resetMarker.type, resetMarker.timestamp, resetMarker.data],
            function(err) {
                if (err) {
                    console.error('❌ Error adding reset marker:', err);
                    return reject(err);
                }
                
                console.log('✅ Session reset marker added');
                resolve();
            }
        );
    });
}

async function showFinalStats() {
    return new Promise((resolve, reject) => {
        console.log('📊 Final Database Stats:');
        
        db.get(
            `SELECT 
                COUNT(*) as total_activities,
                MIN(timestamp) as oldest_activity,
                MAX(timestamp) as newest_activity,
                COUNT(DISTINCT source) as unique_sources
            FROM activity`,
            (err, stats) => {
                if (err) {
                    console.error('❌ Error getting final stats:', err);
                    return reject(err);
                }
                
                console.log(`   Total Activities: ${stats.total_activities}`);
                console.log(`   Date Range: ${stats.oldest_activity} → ${stats.newest_activity}`);
                console.log(`   Unique Sources: ${stats.unique_sources}`);
                
                // Get database file size
                const dbStats = fs.statSync(DB_PATH);
                const dbSizeMB = (dbStats.size / 1024 / 1024).toFixed(2);
                console.log(`   Database Size: ${dbSizeMB} MB`);
                
                resolve();
            }
        );
    });
}

async function main() {
    try {
        await resetActivityData();
        await resetSessionCounters();
        await showFinalStats();
        
        console.log('🎉 Claude Monitor reset completed successfully!');
        console.log('🚀 Ready to restart server with clean data');
        
    } catch (error) {
        console.error('❌ Reset failed:', error);
        process.exit(1);
        
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('📪 Database connection closed');
            }
        });
    }
}

// Run the reset
main();
