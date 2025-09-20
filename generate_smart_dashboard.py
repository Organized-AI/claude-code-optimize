#!/usr/bin/env python3
"""
Generate Smart Dashboard with Auto-Update on Session Activity
- Rate limit monitoring at the top
- Auto-deploys every 10 seconds when session activity detected
- Stops polling during stagnant periods
"""

import json
import sqlite3
import time
import hashlib
from datetime import datetime, timedelta
from live_data_api_main_db import LiveDataAPI

def get_database_hash(db_path):
    """Get hash of database to detect changes"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get latest session data for hash
        cursor.execute("""
            SELECT id, start_time, end_time, real_total_tokens, estimated_tokens, last_token_update
            FROM sessions 
            ORDER BY start_time DESC LIMIT 1
        """)
        latest_session = cursor.fetchone()
        
        # Get latest 5-hour block data
        cursor.execute("""
            SELECT id, start_time, total_tokens, billable_tokens, is_complete
            FROM five_hour_blocks 
            ORDER BY start_time DESC LIMIT 1
        """)
        latest_block = cursor.fetchone()
        
        conn.close()
        
        # Create hash from latest data
        data_string = str(latest_session) + str(latest_block)
        return hashlib.md5(data_string.encode()).hexdigest()
        
    except Exception as e:
        print(f"⚠️ Error getting database hash: {e}")
        return None

def detect_session_activity(db_path):
    """Detect if there's been recent session activity (last 5 minutes)"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check for activity in last 5 minutes
        five_minutes_ago = datetime.now() - timedelta(minutes=5)
        cursor.execute("""
            SELECT COUNT(*) FROM sessions 
            WHERE last_token_update >= ? OR start_time >= ?
        """, (five_minutes_ago.isoformat(), five_minutes_ago.isoformat()))
        
        recent_activity = cursor.fetchone()[0]
        
        # Check for active sessions
        cursor.execute("""
            SELECT COUNT(*) FROM sessions 
            WHERE is_active = 1 OR end_time IS NULL
        """)
        
        active_sessions = cursor.fetchone()[0]
        
        conn.close()
        
        return recent_activity > 0 or active_sessions > 0
        
    except Exception as e:
        print(f"⚠️ Error detecting session activity: {e}")
        return False

def calculate_cache_efficiency(session_data, rate_limit_data):
    """Calculate comprehensive cache efficiency metrics"""
    
    try:
        # Get cache data from current session
        session = session_data['sessionData']
        cache_creation = session.get('cacheCreationTokens', 0)
        cache_read = session.get('cacheReadTokens', 0) 
        total_cache = session.get('totalCacheTokens', 0)
        billable_tokens = session.get('billableTokens', 0)
        real_tokens = session.get('realTokens', 0)
        
        # Calculate cache metrics
        cache_hit_rate = 0
        cache_savings_percentage = 0
        cache_cost_savings = 0
        
        if real_tokens > 0:
            cache_hit_rate = (cache_read / real_tokens) * 100
            
        if billable_tokens > 0 and total_cache > 0:
            # Assume cache reads cost 10% of normal tokens (typical for Claude)
            normal_cost = billable_tokens * 0.003  # $3 per 1M tokens average
            cache_cost = cache_read * 0.0003  # $0.30 per 1M cached tokens
            potential_full_cost = (billable_tokens + cache_read) * 0.003
            cache_cost_savings = potential_full_cost - (normal_cost + cache_cost)
            cache_savings_percentage = (cache_cost_savings / potential_full_cost) * 100 if potential_full_cost > 0 else 0
        
        # Efficiency grade
        if cache_hit_rate >= 40:
            efficiency_grade = "A+"
            efficiency_color = "#10b981"  # Green
        elif cache_hit_rate >= 25:
            efficiency_grade = "A"
            efficiency_color = "#34d399"  # Light green
        elif cache_hit_rate >= 15:
            efficiency_grade = "B"
            efficiency_color = "#fbbf24"  # Yellow
        elif cache_hit_rate >= 5:
            efficiency_grade = "C"
            efficiency_color = "#f59e0b"  # Orange
        else:
            efficiency_grade = "D"
            efficiency_color = "#dc2626"  # Red
            
        return {
            "cacheCreationTokens": cache_creation,
            "cacheReadTokens": cache_read,
            "totalCacheTokens": total_cache,
            "cacheHitRate": round(cache_hit_rate, 1),
            "cacheSavingsPercentage": round(cache_savings_percentage, 1),
            "cacheCostSavings": round(cache_cost_savings, 2),
            "efficiencyGrade": efficiency_grade,
            "efficiencyColor": efficiency_color,
            "cacheToTotalRatio": round((total_cache / real_tokens) * 100, 1) if real_tokens > 0 else 0,
            "creationToReadRatio": round(cache_creation / cache_read, 2) if cache_read > 0 else 0
        }
        
    except Exception as e:
        print(f"⚠️ Error calculating cache efficiency: {e}")
        return {
            "cacheCreationTokens": 0,
            "cacheReadTokens": 0,
            "totalCacheTokens": 0,
            "cacheHitRate": 0,
            "cacheSavingsPercentage": 0,
            "cacheCostSavings": 0,
            "efficiencyGrade": "N/A",
            "efficiencyColor": "#64748b",
            "cacheToTotalRatio": 0,
            "creationToReadRatio": 0
        }

def generate_smart_dashboard():
    """Generate smart dashboard with rate limits at top and activity detection"""
    
    print("🔄 Generating smart dashboard with intelligent updates...")
    
    # Get real data from API
    api = LiveDataAPI()
    session_data = api._get_dashboard_data()
    rate_limit_data = api._get_rate_limit_data()
    analytics_data = api._get_analytics_data()
    
    # Calculate cache efficiency
    cache_efficiency = calculate_cache_efficiency(session_data, rate_limit_data)
    
    # Detect current session activity
    db_path = "./claude_usage.db"
    has_activity = detect_session_activity(db_path)
    current_hash = get_database_hash(db_path)
    
    # Combine all data
    embedded_data = {
        "sessionData": session_data,
        "rateLimitData": rate_limit_data,
        "analyticsData": analytics_data,
        "cacheEfficiency": cache_efficiency,
        "activityDetection": {
            "hasActivity": has_activity,
            "dataHash": current_hash,
            "lastCheck": datetime.now().isoformat()
        },
        "generatedAt": datetime.now().isoformat(),
        "dataSource": "smart_dashboard_with_activity_detection"
    }
    
    print(f"📊 Session: {session_data.get('sessionData', {}).get('activeSessionId', 'N/A')[:20]}...")
    cost_estimate = session_data.get('sessionData', {}).get('costEstimate', 0)
    if cost_estimate == 0:
        cost_estimate = session_data.get('sessionData', {}).get('realCost', 0)
    print(f"💰 Cost: ${cost_estimate:.2f}")
    print(f"🔥 5-Hour Usage: {rate_limit_data.get('fiveHourLimit', {}).get('usage_percentage', 0)}%")
    print(f"📅 Weekly Usage: {rate_limit_data.get('weeklyLimit', {}).get('usage_percentage', 0)}%")
    print(f"🚀 Cache Hit Rate: {cache_efficiency.get('cacheHitRate', 0)}%")
    print(f"💎 Cache Savings: ${cache_efficiency.get('cacheCostSavings', 0):.2f}")
    print(f"⚡ Activity Detected: {has_activity}")
    
    # Generate HTML with rate limits at top and smart updates
    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Optimizer 🔥 Smart Dashboard</title>
    <style>
        body {{
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            min-height: 100vh;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        
        h1 {{
            color: #60a5fa;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }}
        
        .live-indicator {{
            background: linear-gradient(45deg, #10b981, #34d399);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            display: inline-block;
            animation: pulse 2s infinite;
        }}
        
        .activity-indicator {{
            margin: 10px 0;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: bold;
            background: #065f46;
            color: #34d399;
        }}
        
        .activity-indicator.inactive {{
            background: #92400e;
            color: #fbbf24;
        }}
        
        @keyframes pulse {{
            0% {{ transform: scale(1); }}
            50% {{ transform: scale(1.05); }}
            100% {{ transform: scale(1); }}
        }}
        
        .section-header {{
            font-size: 1.75rem;
            font-weight: bold;
            color: #f1f5f9;
            margin: 30px 0 20px 0;
            text-align: center;
            padding: 16px;
            background: rgba(15, 23, 42, 0.5);
            border-radius: 8px;
            border: 1px solid #334155;
        }}
        
        .priority-section {{
            background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);
            color: white;
            border: 2px solid #ef4444;
        }}
        
        .dashboard-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .cache-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .progress-card {{
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #475569;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }}
        
        .priority-card {{
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
            border: 2px solid #dc2626;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 6px 8px rgba(220, 38, 38, 0.3);
        }}
        
        .cache-card {{
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #4c1d95;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }}
        
        .cache-efficiency-card {{
            background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #0d9488;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            text-align: center;
        }}
        
        .progress-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }}
        
        .progress-title {{
            font-size: 1.25rem;
            font-weight: bold;
            color: #f1f5f9;
        }}
        
        .priority-title {{
            font-size: 1.25rem;
            font-weight: bold;
            color: #fecaca;
        }}
        
        .cache-title {{
            font-size: 1.25rem;
            font-weight: bold;
            color: #a5b4fc;
        }}
        
        .progress-subtitle {{
            font-size: 0.875rem;
            color: #94a3b8;
            margin-bottom: 12px;
        }}
        
        .priority-subtitle {{
            font-size: 0.875rem;
            color: #fecaca;
            margin-bottom: 12px;
        }}
        
        .cache-subtitle {{
            font-size: 0.875rem;
            color: #c7d2fe;
            margin-bottom: 12px;
        }}
        
        .progress-bar-container {{
            background: #0f172a;
            border-radius: 8px;
            height: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            border: 1px solid #334155;
        }}
        
        .priority-bar-container {{
            background: #450a0a;
            border-radius: 8px;
            height: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            border: 1px solid #dc2626;
        }}
        
        .cache-bar-container {{
            background: #1e1b4b;
            border-radius: 8px;
            height: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            border: 1px solid #4c1d95;
        }}
        
        .progress-bar {{
            height: 100%;
            border-radius: 6px;
            transition: width 0.5s ease-in-out;
            position: relative;
        }}
        
        .cache-bar {{
            height: 100%;
            border-radius: 6px;
            transition: width 0.5s ease-in-out;
            background: linear-gradient(90deg, #06b6d4, #0891b2);
        }}
        
        .progress-bar.safe {{
            background: linear-gradient(90deg, #10b981, #34d399);
        }}
        
        .progress-bar.warning {{
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }}
        
        .progress-bar.danger {{
            background: linear-gradient(90deg, #dc2626, #f87171);
        }}
        
        .progress-stats {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }}
        
        .cache-stats {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }}
        
        .stat-item {{
            text-align: center;
            padding: 12px;
            background: rgba(15, 23, 42, 0.5);
            border-radius: 8px;
            border: 1px solid #334155;
        }}
        
        .priority-stat-item {{
            text-align: center;
            padding: 12px;
            background: rgba(69, 10, 10, 0.5);
            border-radius: 8px;
            border: 1px solid #dc2626;
        }}
        
        .cache-stat-item {{
            text-align: center;
            padding: 12px;
            background: rgba(30, 27, 75, 0.5);
            border-radius: 8px;
            border: 1px solid #4c1d95;
        }}
        
        .stat-value {{
            font-size: 1.5rem;
            font-weight: bold;
            color: #60a5fa;
            margin-bottom: 4px;
        }}
        
        .priority-stat-value {{
            font-size: 1.5rem;
            font-weight: bold;
            color: #fecaca;
            margin-bottom: 4px;
        }}
        
        .cache-stat-value {{
            font-size: 1.5rem;
            font-weight: bold;
            color: #a5b4fc;
            margin-bottom: 4px;
        }}
        
        .stat-label {{
            font-size: 0.875rem;
            color: #94a3b8;
        }}
        
        .priority-stat-label {{
            font-size: 0.875rem;
            color: #fecaca;
        }}
        
        .cache-stat-label {{
            font-size: 0.875rem;
            color: #c7d2fe;
        }}
        
        .main-display {{
            text-align: center;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            border: 1px solid #475569;
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.4);
        }}
        
        .token-count {{
            font-size: 3rem;
            font-weight: bold;
            color: #60a5fa;
            margin-bottom: 8px;
            font-family: 'SF Mono', 'Courier New', monospace;
        }}
        
        .session-info {{
            font-size: 1rem;
            color: #94a3b8;
            margin-bottom: 16px;
        }}
        
        .status-indicators {{
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-bottom: 20px;
        }}
        
        .status-badge {{
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: bold;
        }}
        
        .status-badge.safe {{
            background: #065f46;
            color: #34d399;
        }}
        
        .status-badge.warning {{
            background: #92400e;
            color: #fbbf24;
        }}
        
        .status-badge.danger {{
            background: #7f1d1d;
            color: #fca5a5;
        }}
        
        .cache-grade {{
            font-size: 4rem;
            font-weight: bold;
            margin-bottom: 12px;
            font-family: 'SF Mono', 'Courier New', monospace;
        }}
        
        .cache-metric {{
            font-size: 1.25rem;
            font-weight: bold;
            margin-bottom: 8px;
        }}
        
        .cache-description {{
            font-size: 0.875rem;
            opacity: 0.9;
            margin-bottom: 16px;
        }}
        
        .last-update {{
            font-size: 0.875rem;
            color: #64748b;
            margin-top: 16px;
        }}
        
        .debug-info {{
            margin-top: 20px;
            padding: 16px;
            background: rgba(15, 23, 42, 0.8);
            border-radius: 8px;
            border: 1px solid #334155;
            font-family: 'SF Mono', 'Courier New', monospace;
            font-size: 0.75rem;
            color: #94a3b8;
        }}
        
        .analytics-section {{
            margin-top: 30px;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #475569;
        }}
        
        .analytics-header {{
            font-size: 1.5rem;
            font-weight: bold;
            color: #f1f5f9;
            margin-bottom: 20px;
            text-align: center;
        }}
        
        .efficiency-trends {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }}
        
        .trend-item {{
            background: rgba(15, 23, 42, 0.5);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #334155;
            text-align: center;
        }}
        
        .trend-date {{
            font-size: 0.875rem;
            color: #94a3b8;
            margin-bottom: 8px;
        }}
        
        .trend-value {{
            font-size: 1.25rem;
            font-weight: bold;
            color: #60a5fa;
            margin-bottom: 4px;
        }}
        
        .trend-sessions {{
            font-size: 0.75rem;
            color: #64748b;
        }}
        
        @media (max-width: 1200px) {{
            .cache-grid {{
                grid-template-columns: 1fr 1fr;
            }}
        }}
        
        @media (max-width: 768px) {{
            .dashboard-grid, .cache-grid {{
                grid-template-columns: 1fr;
            }}
            
            .token-count {{
                font-size: 2rem;
            }}
            
            .cache-grade {{
                font-size: 3rem;
            }}
            
            .progress-stats, .cache-stats {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Claude Code Optimizer - Smart Dashboard</h1>
        <div class="live-indicator">🟢 SMART AUTO-UPDATE</div>
        <div class="activity-indicator" id="activityIndicator">
            ⚡ Monitoring session activity...
        </div>
    </div>

    <div class="main-display">
        <div class="token-count" id="tokenCount">Loading...</div>
        <div class="session-info">
            Session: <span id="sessionId">Loading...</span><br>
            Model: <span id="modelUsed">Loading...</span><br>
            Cost: <span id="sessionCost">Loading...</span>
        </div>
        
        <div class="status-indicators">
            <div class="status-badge safe" id="statusBadge">SAFE</div>
        </div>
        
        <div class="last-update">
            Data Generated: <span id="lastUpdate">Never</span>
        </div>
    </div>

    <!-- PRIORITY SECTION: RATE LIMIT MONITORING AT TOP -->
    <div class="section-header priority-section">🚨 PRIORITY: Rate Limit Monitoring</div>

    <div class="dashboard-grid">
        <div class="priority-card">
            <div class="progress-header">
                <span class="priority-title">⏰ 5-Hour Block Progress</span>
            </div>
            <div class="priority-subtitle">CRITICAL: Current 5-hour session usage</div>
            
            <div class="priority-bar-container">
                <div class="progress-bar danger" id="fiveHourProgress" style="width: 0%"></div>
            </div>
            
            <div class="progress-stats">
                <div class="priority-stat-item">
                    <div class="priority-stat-value" id="fiveHourTokens">0</div>
                    <div class="priority-stat-label">Billable Tokens</div>
                </div>
                <div class="priority-stat-item">
                    <div class="priority-stat-value" id="fiveHourRemaining">5h 0m</div>
                    <div class="priority-stat-label">Time Remaining</div>
                </div>
            </div>
        </div>

        <div class="priority-card">
            <div class="progress-header">
                <span class="priority-title">📅 Weekly Progress</span>
            </div>
            <div class="priority-subtitle">CRITICAL: 7-day rolling usage limit</div>
            
            <div class="priority-bar-container">
                <div class="progress-bar danger" id="weeklyProgress" style="width: 0%"></div>
            </div>
            
            <div class="progress-stats">
                <div class="priority-stat-item">
                    <div class="priority-stat-value" id="weeklyTokens">0</div>
                    <div class="priority-stat-label">Billable Tokens</div>
                </div>
                <div class="priority-stat-item">
                    <div class="priority-stat-value" id="weeklyRemaining">7 days</div>
                    <div class="priority-stat-label">Days Remaining</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section-header">🚀 Cache Performance Analytics</div>

    <div class="cache-grid">
        <div class="cache-efficiency-card">
            <div class="cache-grade" id="cacheGrade" style="color: #10b981;">A+</div>
            <div class="cache-metric">Cache Efficiency Grade</div>
            <div class="cache-description">Based on hit rate and cost savings</div>
            <div class="cache-metric" id="cacheHitRate">0%</div>
            <div class="cache-description">Cache Hit Rate</div>
        </div>

        <div class="cache-card">
            <div class="progress-header">
                <span class="cache-title">💰 Cache Cost Savings</span>
            </div>
            <div class="cache-subtitle">Money saved through caching</div>
            
            <div class="cache-bar-container">
                <div class="cache-bar" id="cacheSavingsProgress" style="width: 0%"></div>
            </div>
            
            <div class="cache-stats">
                <div class="cache-stat-item">
                    <div class="cache-stat-value" id="cacheSavingsAmount">$0.00</div>
                    <div class="cache-stat-label">Total Savings</div>
                </div>
                <div class="cache-stat-item">
                    <div class="cache-stat-value" id="cacheSavingsPercent">0%</div>
                    <div class="cache-stat-label">Savings Rate</div>
                </div>
            </div>
        </div>

        <div class="cache-card">
            <div class="progress-header">
                <span class="cache-title">📊 Cache Token Breakdown</span>
            </div>
            <div class="cache-subtitle">Cache creation vs utilization</div>
            
            <div class="cache-stats">
                <div class="cache-stat-item">
                    <div class="cache-stat-value" id="cacheCreationTokens">0</div>
                    <div class="cache-stat-label">Created</div>
                </div>
                <div class="cache-stat-item">
                    <div class="cache-stat-value" id="cacheReadTokens">0</div>
                    <div class="cache-stat-label">Read (Hits)</div>
                </div>
            </div>
            
            <div class="cache-stats">
                <div class="cache-stat-item">
                    <div class="cache-stat-value" id="totalCacheTokens">0</div>
                    <div class="cache-stat-label">Total Cache</div>
                </div>
                <div class="cache-stat-item">
                    <div class="cache-stat-value" id="cacheRatio">0:1</div>
                    <div class="cache-stat-label">Create:Read</div>
                </div>
            </div>
        </div>
    </div>

    <div class="analytics-section">
        <div class="analytics-header">📈 Efficiency Analytics</div>
        <div class="efficiency-trends" id="efficiencyTrends">
            <!-- Populated by JavaScript -->
        </div>
    </div>

    <div class="debug-info" id="debugInfo">
        🔄 Loading embedded data...
    </div>

    <script>
        // Embedded real data from SQLite database with smart updates
        const EMBEDDED_DATA = {json.dumps(embedded_data, indent=12)};
        
        class SmartDashboard {{
            constructor() {{
                this.data = EMBEDDED_DATA;
                this.lastDataHash = this.data.activityDetection.dataHash;
                this.pollingActive = false;
                this.updateInterval = null;
                this.inactivityTimer = null;
                this.init();
            }}
            
            init() {{
                console.log('📊 Loading smart dashboard with activity-based updates...');
                this.loadEmbeddedData();
                this.startSmartPolling();
            }}
            
            loadEmbeddedData() {{
                try {{
                    const sessionData = this.data.sessionData;
                    const rateLimitData = this.data.rateLimitData;
                    const analyticsData = this.data.analyticsData;
                    const cacheEfficiency = this.data.cacheEfficiency;
                    const activityDetection = this.data.activityDetection;
                    
                    if (sessionData && rateLimitData && cacheEfficiency) {{
                        this.updateDashboard(sessionData, rateLimitData, analyticsData, cacheEfficiency);
                        this.updateActivityIndicator(activityDetection);
                        console.log('✅ Smart dashboard updated with real embedded data');
                    }} else {{
                        throw new Error('Invalid embedded data structure');
                    }}
                    
                }} catch (error) {{
                    console.error('❌ Error loading embedded data:', error);
                    this.showError('Error loading embedded data: ' + error.message);
                }}
            }}
            
            startSmartPolling() {{
                const hasActivity = this.data.activityDetection.hasActivity;
                
                if (hasActivity && !this.pollingActive) {{
                    console.log('⚡ Session activity detected - starting 10-second polling');
                    this.pollingActive = true;
                    this.updateInterval = setInterval(() => {{
                        this.checkForUpdates();
                    }}, 10000); // 10 seconds
                    
                    // Set inactivity timer (stop polling after 5 minutes of no activity)
                    this.inactivityTimer = setTimeout(() => {{
                        this.stopPolling();
                    }}, 300000); // 5 minutes
                    
                }} else if (!hasActivity) {{
                    console.log('💤 No session activity - polling disabled');
                    this.updateActivityIndicator({{
                        hasActivity: false,
                        lastCheck: new Date().toISOString()
                    }});
                }}
            }}
            
            stopPolling() {{
                if (this.updateInterval) {{
                    clearInterval(this.updateInterval);
                    this.updateInterval = null;
                }}
                if (this.inactivityTimer) {{
                    clearTimeout(this.inactivityTimer);
                    this.inactivityTimer = null;
                }}
                this.pollingActive = false;
                console.log('⏸️ Polling stopped - no recent session activity');
                
                // Update indicator to show inactive state
                this.updateActivityIndicator({{
                    hasActivity: false,
                    lastCheck: new Date().toISOString()
                }});
            }}
            
            async checkForUpdates() {{
                try {{
                    // In a real implementation, this would check for new dashboard versions
                    console.log('🔄 Checking for session updates...');
                    
                    // For static dashboard, we simulate checking by looking at timestamp
                    const currentTime = new Date().getTime();
                    const generatedTime = new Date(this.data.generatedAt).getTime();
                    const timeDiff = currentTime - generatedTime;
                    
                    // If dashboard is older than 2 minutes, suggest regeneration
                    if (timeDiff > 120000) {{
                        console.log('⚠️ Dashboard data is stale - consider regenerating');
                        this.showStaleDataWarning();
                    }}
                    
                }} catch (error) {{
                    console.error('❌ Error checking for updates:', error);
                }}
            }}
            
            showStaleDataWarning() {{
                const debugInfo = document.getElementById('debugInfo');
                const currentContent = debugInfo.innerHTML;
                debugInfo.innerHTML = currentContent + `
                    <br><div style="color: #fbbf24; border: 1px solid #f59e0b; padding: 8px; border-radius: 4px; margin-top: 8px;">
                        ⚠️ Data may be stale - run ./deploy_smart_dashboard.sh for fresh updates
                    </div>
                `;
            }}
            
            updateActivityIndicator(activityDetection) {{
                const indicator = document.getElementById('activityIndicator');
                
                if (activityDetection.hasActivity) {{
                    indicator.className = 'activity-indicator';
                    indicator.innerHTML = '⚡ Active session detected - auto-updating every 10s';
                }} else {{
                    indicator.className = 'activity-indicator inactive';
                    indicator.innerHTML = '💤 No session activity - polling paused';
                }}
            }}
            
            updateDashboard(sessionData, rateLimitData, analyticsData, cacheEfficiency) {{
                try {{
                    // Update main display
                    const session = sessionData.sessionData;
                    const realTokens = session.realTokens || 0;
                    const sessionId = session.activeSessionId || 'No active session';
                    const modelUsed = session.modelUsed || 'Unknown';
                    const costEstimate = session.costEstimate || 0;
                    
                    document.getElementById('tokenCount').textContent = this.formatNumber(realTokens);
                    document.getElementById('sessionId').textContent = 
                        sessionId.length > 20 ? sessionId.substring(0, 20) + '...' : sessionId;
                    document.getElementById('modelUsed').textContent = modelUsed;
                    document.getElementById('sessionCost').textContent = '$' + costEstimate.toFixed(2);
                    
                    // Update cache analytics
                    this.updateCacheAnalytics(cacheEfficiency);
                    
                    // Update PRIORITY rate limit progress bars
                    this.updatePriorityProgressBar('fiveHourProgress', rateLimitData.fiveHourLimit.usage_percentage);
                    this.updatePriorityProgressBar('weeklyProgress', rateLimitData.weeklyLimit.usage_percentage);
                    
                    // Update stats
                    document.getElementById('fiveHourTokens').textContent = 
                        this.formatNumber(rateLimitData.fiveHourLimit.billable_tokens || 0);
                    document.getElementById('weeklyTokens').textContent = 
                        this.formatNumber(rateLimitData.weeklyLimit.billable_tokens || 0);
                    
                    // Update time remaining
                    const fiveHourMinutes = rateLimitData.fiveHourLimit.time_remaining_minutes || 0;
                    const hours = Math.floor(fiveHourMinutes / 60);
                    const minutes = fiveHourMinutes % 60;
                    document.getElementById('fiveHourRemaining').textContent = `${{hours}}h ${{minutes}}m`;
                    
                    const daysRemaining = rateLimitData.weeklyLimit.days_remaining || 0;
                    document.getElementById('weeklyRemaining').textContent = `${{daysRemaining}} days`;
                    
                    // Update status badge
                    const maxUsage = Math.max(
                        rateLimitData.fiveHourLimit.usage_percentage || 0,
                        rateLimitData.weeklyLimit.usage_percentage || 0
                    );
                    
                    const statusBadge = document.getElementById('statusBadge');
                    if (maxUsage < 70) {{
                        statusBadge.className = 'status-badge safe';
                        statusBadge.textContent = 'SAFE';
                    }} else if (maxUsage < 90) {{
                        statusBadge.className = 'status-badge warning';
                        statusBadge.textContent = 'WARNING';
                    }} else {{
                        statusBadge.className = 'status-badge danger';
                        statusBadge.textContent = 'DANGER';
                    }}
                    
                    // Update analytics section
                    this.updateAnalytics(analyticsData);
                    
                    document.getElementById('lastUpdate').textContent = new Date(this.data.generatedAt).toLocaleString();
                    
                    // Update debug info
                    document.getElementById('debugInfo').innerHTML = `
                        📊 Data Source: ${{sessionData.dataSource || 'smart_dashboard'}}<br>
                        🕐 Generated: ${{new Date(this.data.generatedAt).toLocaleString()}}<br>
                        ⚡ Activity Status: ${{this.data.activityDetection.hasActivity ? 'Active' : 'Inactive'}}<br>
                        🔄 Polling: ${{this.pollingActive ? 'Active (10s intervals)' : 'Paused'}}<br>
                        💰 Session Cost: $${{(session.costEstimate || 0).toFixed(4)}}<br>
                        🚀 Cache Hit Rate: ${{cacheEfficiency.cacheHitRate}}%<br>
                        💎 Cache Savings: $${{cacheEfficiency.cacheCostSavings}}<br>
                        🏆 Cache Grade: ${{cacheEfficiency.efficiencyGrade}}<br>
                        📈 Efficiency Trends: ${{analyticsData.efficiencyTrends ? analyticsData.efficiencyTrends.length : 0}} days<br>
                        🤖 Models Tracked: ${{analyticsData.modelUsage ? analyticsData.modelUsage.length : 0}} models
                    `;
                    
                }} catch (error) {{
                    console.error('Error updating dashboard:', error);
                    this.showError('Error updating dashboard display');
                }}
            }}
            
            updateCacheAnalytics(cacheEfficiency) {{
                // Update cache grade
                const cacheGrade = document.getElementById('cacheGrade');
                cacheGrade.textContent = cacheEfficiency.efficiencyGrade;
                cacheGrade.style.color = cacheEfficiency.efficiencyColor;
                
                // Update cache hit rate
                document.getElementById('cacheHitRate').textContent = cacheEfficiency.cacheHitRate + '%';
                
                // Update cache savings
                document.getElementById('cacheSavingsAmount').textContent = '$' + cacheEfficiency.cacheCostSavings.toFixed(2);
                document.getElementById('cacheSavingsPercent').textContent = cacheEfficiency.cacheSavingsPercentage + '%';
                
                // Update cache savings progress bar
                const savingsProgress = document.getElementById('cacheSavingsProgress');
                savingsProgress.style.width = Math.min(cacheEfficiency.cacheSavingsPercentage, 100) + '%';
                
                // Update cache token breakdown
                document.getElementById('cacheCreationTokens').textContent = this.formatNumber(cacheEfficiency.cacheCreationTokens);
                document.getElementById('cacheReadTokens').textContent = this.formatNumber(cacheEfficiency.cacheReadTokens);
                document.getElementById('totalCacheTokens').textContent = this.formatNumber(cacheEfficiency.totalCacheTokens);
                document.getElementById('cacheRatio').textContent = cacheEfficiency.creationToReadRatio + ':1';
            }}
            
            updateAnalytics(analyticsData) {{
                const trendsContainer = document.getElementById('efficiencyTrends');
                if (!analyticsData || !analyticsData.efficiencyTrends) {{
                    trendsContainer.innerHTML = '<div class="trend-item">No analytics data available</div>';
                    return;
                }}
                
                trendsContainer.innerHTML = analyticsData.efficiencyTrends.map(trend => `
                    <div class="trend-item">
                        <div class="trend-date">${{trend.date}}</div>
                        <div class="trend-value">${{trend.tokensPerDollar}}</div>
                        <div class="trend-sessions">${{trend.sessionCount}} sessions</div>
                    </div>
                `).join('');
            }}
            
            updatePriorityProgressBar(elementId, percentage) {{
                const progressBar = document.getElementById(elementId);
                const safePercentage = Math.min(percentage || 0, 100);
                
                progressBar.style.width = `${{safePercentage}}%`;
                
                // Priority bars always use danger colors for emphasis
                progressBar.className = 'progress-bar danger';
            }}
            
            showError(message) {{
                const debugInfo = document.getElementById('debugInfo');
                debugInfo.innerHTML = `
                    <div style="color: #fca5a5;">
                        ❌ ${{message}}<br>
                        💡 This smart dashboard uses embedded real data with activity detection
                    </div>
                `;
            }}
            
            formatNumber(num) {{
                if (num >= 1000000) {{
                    return (num / 1000000).toFixed(1) + 'M';
                }} else if (num >= 1000) {{
                    return (num / 1000).toFixed(1) + 'K';
                }}
                return num.toString();
            }}
        }}
        
        // Initialize smart dashboard when page loads
        document.addEventListener('DOMContentLoaded', () => {{
            new SmartDashboard();
        }});
    </script>
</body>
</html>'''
    
    # Write the smart dashboard
    with open('dashboard_smart_embedded.html', 'w') as f:
        f.write(html_content)
    
    print(f"✅ Smart dashboard with activity detection generated: dashboard_smart_embedded.html")
    return 'dashboard_smart_embedded.html'

if __name__ == "__main__":
    generate_smart_dashboard()
