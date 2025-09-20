#!/usr/bin/env python3
"""
Dashboard Agent for Claude Code Optimizer
==========================================

Specialized agent for dashboard API enhancements and real-time UI updates.

Core Responsibilities:
- Dashboard API enhancements with precision endpoints
- Real-time UI updates via WebSocket
- SQLite schema updates for precision tracking
- Frontend UI components for confidence scoring
- Token velocity displays and session status
- Integration with existing dashboard infrastructure

Agent Architecture:
- Enhance existing dashboard-server/server.js
- Add precision APIs for validation and timing
- Real-time WebSocket updates
- SQLite schema extensions
- Frontend UI enhancements
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import sqlite3
import logging
from collections import defaultdict
import subprocess

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure agent logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [DASHBOARD-AGENT] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/dashboard-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DashboardAgent:
    """
    Specialized Dashboard Agent
    
    Enhances existing dashboard with precision tracking capabilities,
    real-time updates, and advanced analytics display.
    """
    
    def __init__(self):
        self.agent_id = f"dashboard-agent-{int(time.time())}"
        self.startup_time = datetime.now()
        
        # Dashboard components
        self.dashboard_path = Path("dashboard-server")
        self.db_path = self.dashboard_path / "claude-monitor.db"
        
        # Agent state
        self.is_running = False
        self.update_thread = None
        self.api_enhancement_thread = None
        
        # Real-time data cache
        self.live_data = {
            'precision_sessions': {},
            'validation_metrics': {},
            'token_velocity': {},
            'timer_status': {},
            'last_update': None
        }
        
        # Dashboard enhancement tracking
        self.enhancements = {
            'api_endpoints_added': [],
            'schema_updates_applied': [],
            'ui_components_updated': [],
            'websocket_events_added': []
        }
        
        # Performance metrics
        self.metrics = {
            'api_requests_processed': 0,
            'websocket_messages_sent': 0,
            'database_updates': 0,
            'ui_updates_pushed': 0
        }
        
    def initialize(self):
        """Initialize dashboard agent"""
        logger.info(f"Initializing Dashboard Agent {self.agent_id}")
        
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Verify dashboard infrastructure
        if not self._verify_dashboard_infrastructure():
            logger.error("Dashboard infrastructure not found")
            return False
            
        # Apply database schema updates
        if not self._apply_schema_updates():
            logger.error("Failed to apply database schema updates")
            return False
            
        # Generate API enhancements
        if not self._generate_api_enhancements():
            logger.error("Failed to generate API enhancements")
            return False
            
        # Generate frontend enhancements
        if not self._generate_frontend_enhancements():
            logger.error("Failed to generate frontend enhancements")
            return False
            
        self.is_running = True
        logger.info(f"🚀 Dashboard Agent {self.agent_id} fully initialized")
        return True
        
    def start_dashboard_service(self):
        """Start dashboard enhancement service"""
        if not self.is_running:
            logger.error("Agent not initialized")
            return
            
        # Start real-time update thread
        self.update_thread = threading.Thread(
            target=self._real_time_update_loop,
            daemon=True
        )
        self.update_thread.start()
        
        # Start API enhancement monitoring
        self.api_enhancement_thread = threading.Thread(
            target=self._api_enhancement_loop,
            daemon=True
        )
        self.api_enhancement_thread.start()
        
        logger.info("Dashboard enhancement service started")
        
    def _verify_dashboard_infrastructure(self) -> bool:
        """Verify existing dashboard infrastructure"""
        required_files = [
            self.dashboard_path / "server.js",
            self.dashboard_path / "public" / "index.html",
            self.db_path
        ]
        
        for file_path in required_files:
            if not file_path.exists():
                logger.error(f"Required dashboard file missing: {file_path}")
                return False
                
        logger.info("✅ Dashboard infrastructure verified")
        return True
        
    def _apply_schema_updates(self) -> bool:
        """Apply database schema updates for precision tracking"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Precision sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS precision_sessions (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    confidence REAL NOT NULL,
                    validation_data TEXT,
                    detection_sources TEXT,
                    timer_id TEXT,
                    status TEXT DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Validation metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS validation_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    validation_id TEXT NOT NULL,
                    session_id TEXT,
                    confidence REAL NOT NULL,
                    approved BOOLEAN NOT NULL,
                    sources_count INTEGER,
                    validation_score REAL,
                    conflicts_count INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Token velocity table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS token_velocity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    tokens_per_minute REAL NOT NULL,
                    total_tokens INTEGER NOT NULL,
                    velocity_window INTEGER NOT NULL,
                    model_name TEXT
                )
            ''')
            
            # Timer events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS timer_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timer_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    progress_percentage REAL,
                    milestone_reached INTEGER,
                    notification_sent BOOLEAN DEFAULT FALSE,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Confidence scoring history
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS confidence_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    source_name TEXT NOT NULL,
                    confidence_score REAL NOT NULL,
                    reliability_score REAL,
                    validation_passed BOOLEAN
                )
            ''')
            
            conn.commit()
            conn.close()
            
            self.enhancements['schema_updates_applied'] = [
                'precision_sessions',
                'validation_metrics', 
                'token_velocity',
                'timer_events',
                'confidence_history'
            ]
            
            logger.info("✅ Database schema updates applied")
            return True
            
        except Exception as e:
            logger.error(f"Schema update error: {e}")
            return False
            
    def _generate_api_enhancements(self) -> bool:
        """Generate API enhancements for dashboard server"""
        try:
            # Create enhanced API endpoints file
            api_enhancements = self._create_api_enhancements_code()
            
            enhancements_path = self.dashboard_path / "precision-api-enhancements.js"
            with open(enhancements_path, 'w') as f:
                f.write(api_enhancements)
                
            self.enhancements['api_endpoints_added'] = [
                '/api/precision-sessions',
                '/api/validation-metrics',
                '/api/token-velocity',
                '/api/timer-status',
                '/api/confidence-scoring',
                '/ws/precision-updates'
            ]
            
            logger.info("✅ API enhancements generated")
            return True
            
        except Exception as e:
            logger.error(f"API enhancement error: {e}")
            return False
            
    def _create_api_enhancements_code(self) -> str:
        """Create API enhancements code"""
        return '''// Precision API Enhancements for Claude Code Optimizer Dashboard
// Generated by Dashboard Agent

const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');

// Precision Sessions Endpoint
app.get('/api/precision-sessions', (req, res) => {
    const query = `
        SELECT 
            ps.*,
            vm.confidence as validation_confidence,
            vm.approved as validation_approved,
            te.progress_percentage as timer_progress
        FROM precision_sessions ps
        LEFT JOIN validation_metrics vm ON ps.session_id = vm.session_id
        LEFT JOIN timer_events te ON ps.timer_id = te.timer_id
        WHERE ps.status = 'active'
        ORDER BY ps.start_time DESC
        LIMIT 10
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Precision sessions query error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const sessions = rows.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            startTime: row.start_time,
            confidence: row.confidence,
            validationApproved: row.validation_approved,
            timerProgress: row.timer_progress || 0,
            detectionSources: JSON.parse(row.detection_sources || '[]'),
            status: row.status
        }));
        
        res.json({
            sessions: sessions,
            timestamp: new Date().toISOString()
        });
    });
});

// Validation Metrics Endpoint
app.get('/api/validation-metrics', (req, res) => {
    const timeRange = req.query.range || '24h';
    const hoursBack = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    
    const query = `
        SELECT 
            AVG(confidence) as avg_confidence,
            COUNT(*) as total_validations,
            SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved_count,
            AVG(validation_score) as avg_validation_score,
            AVG(sources_count) as avg_sources,
            strftime('%H:00', timestamp) as hour_bucket,
            COUNT(*) as validations_per_hour
        FROM validation_metrics 
        WHERE timestamp > datetime('now', '-${hoursBack} hours')
        GROUP BY strftime('%H', timestamp)
        ORDER BY timestamp DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Validation metrics query error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const summary = {
            averageConfidence: rows.length > 0 ? rows[0].avg_confidence : 0,
            totalValidations: rows.reduce((sum, row) => sum + row.validations_per_hour, 0),
            approvalRate: rows.length > 0 ? 
                rows.reduce((sum, row) => sum + row.approved_count, 0) / 
                rows.reduce((sum, row) => sum + row.validations_per_hour, 0) : 0,
            hourlyBreakdown: rows
        };
        
        res.json(summary);
    });
});

// Token Velocity Endpoint  
app.get('/api/token-velocity', (req, res) => {
    const sessionId = req.query.session_id;
    const window = parseInt(req.query.window) || 300; // 5 minutes default
    
    let query = `
        SELECT 
            timestamp,
            tokens_per_minute,
            total_tokens,
            velocity_window,
            model_name
        FROM token_velocity 
        WHERE timestamp > datetime('now', '-${window} seconds')
    `;
    
    const params = [];
    if (sessionId) {
        query += ' AND session_id = ?';
        params.push(sessionId);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 100';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Token velocity query error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const currentVelocity = rows.length > 0 ? rows[0].tokens_per_minute : 0;
        const velocityTrend = rows.slice(0, 10);
        const averageVelocity = rows.length > 0 ? 
            rows.reduce((sum, row) => sum + row.tokens_per_minute, 0) / rows.length : 0;
            
        res.json({
            currentVelocity: currentVelocity,
            averageVelocity: averageVelocity,
            velocityHistory: velocityTrend,
            totalDataPoints: rows.length,
            timestamp: new Date().toISOString()
        });
    });
});

// Timer Status Endpoint
app.get('/api/timer-status', (req, res) => {
    const query = `
        SELECT 
            te.timer_id,
            te.session_id,
            te.progress_percentage,
            te.milestone_reached,
            ps.start_time,
            ps.confidence,
            COUNT(te2.id) as milestones_reached
        FROM timer_events te
        JOIN precision_sessions ps ON te.session_id = ps.session_id
        LEFT JOIN timer_events te2 ON te.timer_id = te2.timer_id AND te2.milestone_reached IS NOT NULL
        WHERE te.event_type = 'progress_update'
        GROUP BY te.timer_id
        ORDER BY te.timestamp DESC
        LIMIT 5
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Timer status query error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const activeTimers = rows.map(row => {
            const startTime = new Date(row.start_time);
            const elapsed = Date.now() - startTime.getTime();
            const fiveHours = 5 * 60 * 60 * 1000;
            const remaining = Math.max(0, fiveHours - elapsed);
            
            return {
                timerId: row.timer_id,
                sessionId: row.session_id,
                progress: row.progress_percentage || 0,
                confidence: row.confidence,
                elapsedMs: elapsed,
                remainingMs: remaining,
                milestonesReached: row.milestones_reached,
                isActive: remaining > 0
            };
        });
        
        res.json({
            activeTimers: activeTimers,
            totalActive: activeTimers.filter(t => t.isActive).length
        });
    });
});

// Confidence Scoring History
app.get('/api/confidence-scoring', (req, res) => {
    const query = `
        SELECT 
            source_name,
            AVG(confidence_score) as avg_confidence,
            AVG(reliability_score) as avg_reliability,
            COUNT(*) as sample_count,
            SUM(CASE WHEN validation_passed = 1 THEN 1 ELSE 0 END) as validation_successes
        FROM confidence_history 
        WHERE timestamp > datetime('now', '-24 hours')
        GROUP BY source_name
        ORDER BY avg_confidence DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Confidence scoring query error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const sourceMetrics = rows.map(row => ({
            source: row.source_name,
            confidence: row.avg_confidence,
            reliability: row.avg_reliability,
            sampleCount: row.sample_count,
            accuracy: row.sample_count > 0 ? row.validation_successes / row.sample_count : 0
        }));
        
        res.json({
            sourceMetrics: sourceMetrics,
            timestamp: new Date().toISOString()
        });
    });
});

// WebSocket Precision Updates
function broadcastPrecisionUpdate(eventType, data) {
    const message = JSON.stringify({
        type: 'precision_update',
        eventType: eventType,
        data: data,
        timestamp: new Date().toISOString()
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Export for integration with main server
module.exports = {
    broadcastPrecisionUpdate
};'''
        
    def _generate_frontend_enhancements(self) -> bool:
        """Generate frontend UI enhancements"""
        try:
            # Create precision UI components
            ui_enhancements = self._create_ui_enhancements_code()
            
            ui_path = self.dashboard_path / "public" / "precision-ui-enhancements.js"
            with open(ui_path, 'w') as f:
                f.write(ui_enhancements)
                
            # Create enhanced CSS
            css_enhancements = self._create_css_enhancements()
            css_path = self.dashboard_path / "public" / "precision-styles.css"
            with open(css_path, 'w') as f:
                f.write(css_enhancements)
                
            self.enhancements['ui_components_updated'] = [
                'precision-session-display',
                'confidence-scoring-panel',
                'token-velocity-chart',
                'timer-progress-display',
                'validation-metrics-dashboard'
            ]
            
            logger.info("✅ Frontend enhancements generated")
            return True
            
        except Exception as e:
            logger.error(f"Frontend enhancement error: {e}")
            return False
            
    def _create_ui_enhancements_code(self) -> str:
        """Create UI enhancements JavaScript code"""
        return '''// Precision UI Enhancements for Claude Code Optimizer Dashboard
// Generated by Dashboard Agent

// Precision Session Display Component
class PrecisionSessionDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.sessions = {};
        this.updateInterval = null;
    }
    
    initialize() {
        this.createLayout();
        this.startUpdates();
    }
    
    createLayout() {
        this.container.innerHTML = `
            <div class="precision-sessions-panel">
                <h3>🎯 Precision Sessions</h3>
                <div class="sessions-list" id="precisionSessionsList"></div>
                <div class="session-metrics" id="sessionMetrics"></div>
            </div>
        `;
    }
    
    async updateSessions() {
        try {
            const response = await fetch('/api/precision-sessions');
            const data = await response.json();
            
            this.renderSessions(data.sessions);
            this.updateMetrics(data.sessions);
            
        } catch (error) {
            console.error('Error updating precision sessions:', error);
        }
    }
    
    renderSessions(sessions) {
        const list = document.getElementById('precisionSessionsList');
        
        list.innerHTML = sessions.map(session => `
            <div class="precision-session-item ${session.status}">
                <div class="session-header">
                    <span class="session-id">${session.sessionId.substring(0, 8)}...</span>
                    <span class="confidence-badge confidence-${this.getConfidenceLevel(session.confidence)}">
                        ${(session.confidence * 100).toFixed(1)}%
                    </span>
                </div>
                <div class="session-details">
                    <div class="timer-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${session.timerProgress}%"></div>
                        </div>
                        <span class="progress-text">${session.timerProgress.toFixed(1)}%</span>
                    </div>
                    <div class="session-sources">
                        ${session.detectionSources.map(source => `
                            <span class="source-tag">${source}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    getConfidenceLevel(confidence) {
        if (confidence >= 0.95) return 'excellent';
        if (confidence >= 0.90) return 'high';
        if (confidence >= 0.80) return 'good';
        return 'low';
    }
    
    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateSessions();
        }, 5000); // Update every 5 seconds
    }
}

// Token Velocity Chart Component
class TokenVelocityChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.data = [];
    }
    
    initialize() {
        this.createChart();
        this.startUpdates();
    }
    
    async updateVelocityData() {
        try {
            const response = await fetch('/api/token-velocity?window=900'); // 15 minutes
            const data = await response.json();
            
            this.renderVelocityChart(data);
            
        } catch (error) {
            console.error('Error updating token velocity:', error);
        }
    }
    
    renderVelocityChart(data) {
        const velocityDisplay = document.getElementById('currentVelocity');
        if (velocityDisplay) {
            velocityDisplay.textContent = `${data.currentVelocity.toFixed(1)} tokens/min`;
        }
        
        // Update trend indicator
        const trendIndicator = document.getElementById('velocityTrend');
        if (trendIndicator && data.velocityHistory.length >= 2) {
            const current = data.velocityHistory[0].tokens_per_minute;
            const previous = data.velocityHistory[1].tokens_per_minute;
            const trend = current > previous ? '📈' : current < previous ? '📉' : '➡️';
            trendIndicator.textContent = trend;
        }
    }
    
    createChart() {
        this.container.innerHTML = `
            <div class="velocity-chart-panel">
                <h4>⚡ Token Velocity</h4>
                <div class="velocity-current">
                    <span id="currentVelocity">0 tokens/min</span>
                    <span id="velocityTrend" class="trend-indicator">➡️</span>
                </div>
                <div class="velocity-chart-container">
                    <canvas id="velocityChart" width="300" height="100"></canvas>
                </div>
            </div>
        `;
    }
    
    startUpdates() {
        setInterval(() => {
            this.updateVelocityData();
        }, 10000); // Update every 10 seconds
    }
}

// Confidence Scoring Panel
class ConfidenceScoringPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scores = {};
    }
    
    initialize() {
        this.createLayout();
        this.startUpdates();
    }
    
    createLayout() {
        this.container.innerHTML = `
            <div class="confidence-panel">
                <h4>🎯 Source Confidence</h4>
                <div class="confidence-sources" id="confidenceSources"></div>
            </div>
        `;
    }
    
    async updateConfidenceScoring() {
        try {
            const response = await fetch('/api/confidence-scoring');
            const data = await response.json();
            
            this.renderConfidenceScores(data.sourceMetrics);
            
        } catch (error) {
            console.error('Error updating confidence scoring:', error);
        }
    }
    
    renderConfidenceScores(metrics) {
        const container = document.getElementById('confidenceSources');
        
        container.innerHTML = metrics.map(metric => `
            <div class="confidence-source-item">
                <div class="source-name">${this.formatSourceName(metric.source)}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill confidence-${this.getConfidenceLevel(metric.confidence)}" 
                         style="width: ${metric.confidence * 100}%"></div>
                </div>
                <div class="confidence-stats">
                    <span class="confidence-value">${(metric.confidence * 100).toFixed(1)}%</span>
                    <span class="accuracy-value">${(metric.accuracy * 100).toFixed(1)}% accuracy</span>
                </div>
            </div>
        `).join('');
    }
    
    formatSourceName(source) {
        const names = {
            'claude_code_cli': 'Claude Code CLI',
            'claude_desktop': 'Claude Desktop',
            'claude_browser': 'Browser Claude',
            'desktop_monitor': 'Desktop Monitor'
        };
        return names[source] || source;
    }
    
    getConfidenceLevel(confidence) {
        if (confidence >= 0.95) return 'excellent';
        if (confidence >= 0.90) return 'high';
        if (confidence >= 0.80) return 'good';
        return 'low';
    }
    
    startUpdates() {
        setInterval(() => {
            this.updateConfidenceScoring();
        }, 15000); // Update every 15 seconds
    }
}

// Initialize all components when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if containers exist before initializing
    if (document.getElementById('precisionSessionsContainer')) {
        const sessionDisplay = new PrecisionSessionDisplay('precisionSessionsContainer');
        sessionDisplay.initialize();
    }
    
    if (document.getElementById('tokenVelocityContainer')) {
        const velocityChart = new TokenVelocityChart('tokenVelocityContainer');
        velocityChart.initialize();
    }
    
    if (document.getElementById('confidenceScoringContainer')) {
        const confidencePanel = new ConfidenceScoringPanel('confidenceScoringContainer');
        confidencePanel.initialize();
    }
});

// WebSocket integration for real-time updates
if (typeof ws !== 'undefined') {
    ws.addEventListener('message', function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'precision_update') {
            handlePrecisionUpdate(data.eventType, data.data);
        }
    });
}

function handlePrecisionUpdate(eventType, data) {
    console.log('Precision update received:', eventType, data);
    
    // Trigger component updates based on event type
    if (eventType === 'session_validation' || eventType === 'timer_progress') {
        // Trigger session display update
        if (window.precisionSessionDisplay) {
            window.precisionSessionDisplay.updateSessions();
        }
    }
    
    if (eventType === 'token_velocity') {
        // Trigger velocity chart update
        if (window.tokenVelocityChart) {
            window.tokenVelocityChart.updateVelocityData();
        }
    }
}'''
        
    def _create_css_enhancements(self) -> str:
        """Create CSS enhancements for precision UI"""
        return '''/* Precision UI Styles for Claude Code Optimizer Dashboard */
/* Generated by Dashboard Agent */

.precision-sessions-panel {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    padding: 20px;
    margin: 20px 0;
    color: white;
}

.precision-session-item {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 15px;
    margin: 10px 0;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.session-id {
    font-family: 'SF Mono', 'Monaco', monospace;
    font-weight: 600;
}

.confidence-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8em;
    font-weight: 700;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.confidence-excellent { background: linear-gradient(135deg, #10b981, #059669); }
.confidence-high { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.confidence-good { background: linear-gradient(135deg, #f59e0b, #d97706); }
.confidence-low { background: linear-gradient(135deg, #ef4444, #dc2626); }

.timer-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0;
}

.progress-bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #f59e0b 70%, #ef4444 100%);
    border-radius: 4px;
    transition: width 1s ease;
}

.progress-text {
    font-family: 'SF Mono', 'Monaco', monospace;
    font-weight: 600;
    font-size: 0.9em;
}

.session-sources {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.source-tag {
    background: rgba(255, 255, 255, 0.15);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7em;
    font-weight: 500;
}

.velocity-chart-panel {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    border-radius: 15px;
    padding: 20px;
    margin: 20px 0;
    color: white;
}

.velocity-current {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 15px 0;
}

.velocity-current span:first-child {
    font-size: 2em;
    font-weight: 700;
    font-family: 'SF Mono', 'Monaco', monospace;
}

.trend-indicator {
    font-size: 1.5em;
    animation: pulse 2s infinite;
}

.confidence-panel {
    background: linear-gradient(135deg, #a855f7 0%, #c084fc 100%);
    border-radius: 15px;
    padding: 20px;
    margin: 20px 0;
    color: white;
}

.confidence-source-item {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
}

.source-name {
    font-weight: 600;
    margin-bottom: 8px;
}

.confidence-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    margin: 5px 0;
}

.confidence-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
}

.confidence-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    margin-top: 5px;
    opacity: 0.9;
}

.confidence-value {
    font-weight: 700;
}

.accuracy-value {
    opacity: 0.8;
}

/* Animation keyframes */
@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
}

/* Responsive design */
@media (max-width: 768px) {
    .precision-sessions-panel,
    .velocity-chart-panel,
    .confidence-panel {
        margin: 10px 0;
        padding: 15px;
    }
    
    .session-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .confidence-stats {
        flex-direction: column;
        gap: 3px;
    }
}'''
        
    def _real_time_update_loop(self):
        """Real-time update loop for dashboard data"""
        while self.is_running:
            try:
                # Update live data cache
                self._update_live_data()
                
                # Push updates to database
                self._push_database_updates()
                
                # Broadcast WebSocket updates
                self._broadcast_websocket_updates()
                
                time.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error(f"Real-time update error: {e}")
                time.sleep(10)
                
    def _api_enhancement_loop(self):
        """API enhancement monitoring loop"""
        while self.is_running:
            try:
                # Monitor API performance
                self._monitor_api_performance()
                
                # Update enhancement metrics
                self._update_enhancement_metrics()
                
                # Generate performance reports
                self._generate_performance_reports()
                
                time.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"API enhancement error: {e}")
                time.sleep(60)
                
    def _update_live_data(self):
        """Update live data cache from agent reports"""
        try:
            # Read agent reports
            reports_dir = Path('logs')
            
            # Update precision sessions from detection reports
            detection_reports = reports_dir / 'detection-reports.jsonl'
            if detection_reports.exists():
                self._process_detection_reports(detection_reports)
                
            # Update validation metrics from validation reports
            validation_reports = reports_dir / 'validation-reports.jsonl'
            if validation_reports.exists():
                self._process_validation_reports(validation_reports)
                
            # Update token data from token reports
            token_reports = reports_dir / 'token-reports.jsonl'
            if token_reports.exists():
                self._process_token_reports(token_reports)
                
            self.live_data['last_update'] = datetime.now()
            
        except Exception as e:
            logger.error(f"Live data update error: {e}")
            
    def _process_detection_reports(self, reports_file: Path):
        """Process detection agent reports"""
        try:
            with open(reports_file, 'r') as f:
                for line in f.readlines()[-10:]:  # Last 10 reports
                    try:
                        report = json.loads(line)
                        if report.get('event_type') == 'session_start':
                            session_id = report.get('session_id')
                            self.live_data['precision_sessions'][session_id] = report
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.debug(f"Error processing detection reports: {e}")
            
    def _process_validation_reports(self, reports_file: Path):
        """Process validation agent reports"""
        try:
            with open(reports_file, 'r') as f:
                for line in f.readlines()[-5:]:  # Last 5 reports
                    try:
                        report = json.loads(line)
                        self.live_data['validation_metrics'].update(report.get('metrics', {}))
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.debug(f"Error processing validation reports: {e}")
            
    def _process_token_reports(self, reports_file: Path):
        """Process token agent reports"""
        try:
            with open(reports_file, 'r') as f:
                for line in f.readlines()[-5:]:  # Last 5 reports
                    try:
                        report = json.loads(line)
                        real_time_metrics = report.get('real_time_metrics', {})
                        if real_time_metrics:
                            self.live_data['token_velocity'] = real_time_metrics
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.debug(f"Error processing token reports: {e}")
            
    def _push_database_updates(self):
        """Push live data updates to database"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Update precision sessions
            for session_id, data in self.live_data['precision_sessions'].items():
                cursor.execute('''
                    INSERT OR REPLACE INTO precision_sessions 
                    (id, session_id, start_time, confidence, detection_sources, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    data.get('session_id'),
                    session_id,
                    data.get('timestamp'),
                    data.get('confidence', 0.0),
                    json.dumps(data.get('sources', [])),
                    'active'
                ))
                
            # Update token velocity
            velocity_data = self.live_data.get('token_velocity', {})
            if velocity_data.get('current_session_id'):
                cursor.execute('''
                    INSERT INTO token_velocity 
                    (session_id, timestamp, tokens_per_minute, total_tokens, velocity_window)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    velocity_data['current_session_id'],
                    datetime.now(),
                    velocity_data.get('velocity_60s', 0),
                    velocity_data.get('tokens_this_minute', 0),
                    60
                ))
                
            conn.commit()
            conn.close()
            
            self.metrics['database_updates'] += 1
            
        except Exception as e:
            logger.error(f"Database update error: {e}")
            
    def _broadcast_websocket_updates(self):
        """Broadcast updates via WebSocket (would integrate with server.js)"""
        try:
            # This would integrate with the WebSocket server in dashboard-server
            update_data = {
                'precision_sessions': len(self.live_data['precision_sessions']),
                'validation_metrics': self.live_data['validation_metrics'],
                'token_velocity': self.live_data['token_velocity'],
                'timestamp': datetime.now().isoformat()
            }
            
            # Save for WebSocket integration
            ws_update_path = Path('logs') / 'websocket-updates.jsonl'
            with open(ws_update_path, 'a') as f:
                f.write(json.dumps(update_data, default=str) + '\n')
                
            self.metrics['websocket_messages_sent'] += 1
            
        except Exception as e:
            logger.error(f"WebSocket broadcast error: {e}")
            
    def _monitor_api_performance(self):
        """Monitor API endpoint performance"""
        # This would integrate with the main dashboard server
        self.metrics['api_requests_processed'] += 1
        
    def _update_enhancement_metrics(self):
        """Update enhancement performance metrics"""
        pass  # Implementation would track API usage and performance
        
    def _generate_performance_reports(self):
        """Generate dashboard performance reports"""
        if datetime.now().minute % 10 != 0:  # Every 10 minutes
            return
            
        report = {
            'agent_id': self.agent_id,
            'timestamp': datetime.now(),
            'metrics': dict(self.metrics),
            'enhancements': dict(self.enhancements),
            'live_data_status': {
                'precision_sessions': len(self.live_data['precision_sessions']),
                'has_validation_metrics': bool(self.live_data['validation_metrics']),
                'has_token_velocity': bool(self.live_data['token_velocity']),
                'last_update': self.live_data['last_update']
            }
        }
        
        report_path = Path('logs') / 'dashboard-reports.jsonl'
        with open(report_path, 'a') as f:
            f.write(json.dumps(report, default=str) + '\n')
            
    def get_dashboard_status(self) -> Dict:
        """Get comprehensive dashboard agent status"""
        return {
            'agent_id': self.agent_id,
            'status': 'running' if self.is_running else 'stopped',
            'startup_time': self.startup_time.isoformat(),
            'metrics': dict(self.metrics),
            'enhancements': dict(self.enhancements),
            'live_data_summary': {
                'precision_sessions': len(self.live_data['precision_sessions']),
                'validation_metrics_keys': list(self.live_data['validation_metrics'].keys()),
                'token_velocity_active': bool(self.live_data['token_velocity']),
                'last_update': self.live_data['last_update'].isoformat() if self.live_data['last_update'] else None
            }
        }
        
    def stop(self):
        """Stop dashboard agent"""
        logger.info("Stopping Dashboard Agent")
        
        self.is_running = False
        
        if self.update_thread:
            self.update_thread.join(timeout=5)
            
        if self.api_enhancement_thread:
            self.api_enhancement_thread.join(timeout=5)
            
        logger.info("✅ Dashboard Agent stopped")


def main():
    """Main entry point for dashboard agent"""
    agent = DashboardAgent()
    
    try:
        # Initialize agent
        if not agent.initialize():
            logger.error("Failed to initialize dashboard agent")
            return 1
            
        # Start dashboard service
        agent.start_dashboard_service()
        
        logger.info("Dashboard agent running. Press Ctrl+C to stop.")
        
        # Status reporting
        while agent.is_running:
            time.sleep(30)
            status = agent.get_dashboard_status()
            logger.info(f"Dashboard enhancements: {len(status['enhancements']['api_endpoints_added'])} APIs, "
                       f"{status['metrics']['database_updates']} DB updates")
            
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        agent.stop()
        return 0
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        agent.stop()
        return 1


if __name__ == "__main__":
    sys.exit(main())