#!/usr/bin/env python3
"""
Generate Dashboard with Fixed Data Source
Works with main claude_usage.db structure
"""

import json
import sqlite3
from datetime import datetime, timedelta

def get_session_data():
    """Get current session data from main database"""
    try:
        conn = sqlite3.connect('./claude_usage.db')
        cursor = conn.cursor()
        
        # Get most recent session
        cursor.execute("""
            SELECT 
                id, session_type, start_time, end_time,
                real_input_tokens, real_output_tokens, real_total_tokens,
                estimated_tokens, models_used, is_active, real_cost, estimated_cost
            FROM sessions 
            ORDER BY start_time DESC LIMIT 1
        """)
        session = cursor.fetchone()
        
        # Get totals
        cursor.execute("""
            SELECT 
                SUM(real_total_tokens) as total_real,
                SUM(estimated_tokens) as total_billable,
                SUM(real_cost) as total_cost,
                COUNT(*) as session_count
            FROM sessions
        """)
        totals = cursor.fetchone()
        
        conn.close()
        
        if session:
            return {
                "sessionData": {
                    "activeSessionId": session[0],
                    "sessionType": session[1],
                    "startTime": session[2],
                    "endTime": session[3],
                    "inputTokens": session[4] or 0,
                    "outputTokens": session[5] or 0,
                    "realTokens": session[6] or 0,
                    "billableTokens": session[7] or 0,
                    "modelUsed": session[8] or "Unknown",
                    "isActive": bool(session[9]),
                    "costEstimate": session[10] or session[11] or 0.0,
                    "cacheCreationTokens": 0,  # Not available in main DB
                    "cacheReadTokens": 0,      # Not available in main DB
                    "totalCacheTokens": 0,     # Not available in main DB
                    "globalTotals": {
                        "totalRealTokens": totals[0] or 0,
                        "totalBillableTokens": totals[1] or 0,
                        "totalCost": totals[2] or 0.0,
                        "totalSessions": totals[3] or 0
                    }
                },
                "lastUpdate": datetime.now().isoformat(),
                "dataSource": "main_database"
            }
        else:
            return {
                "sessionData": {
                    "activeSessionId": "No sessions found",
                    "realTokens": 0,
                    "billableTokens": 0,
                    "costEstimate": 0.0,
                    "isActive": False
                },
                "lastUpdate": datetime.now().isoformat(),
                "dataSource": "main_database"
            }
            
    except Exception as e:
        print(f"Error getting session data: {e}")
        return {
            "sessionData": {
                "activeSessionId": "Error loading data",
                "realTokens": 0,
                "billableTokens": 0,
                "costEstimate": 0.0,
                "isActive": False,
                "error": str(e)
            },
            "lastUpdate": datetime.now().isoformat(),
            "dataSource": "error"
        }

def get_rate_limit_data():
    """Get rate limit data"""
    try:
        conn = sqlite3.connect('./claude_usage.db')
        cursor = conn.cursor()
        
        # Get current 5-hour block
        cursor.execute("""
            SELECT * FROM five_hour_blocks 
            WHERE is_complete = 0
            ORDER BY start_time DESC LIMIT 1
        """)
        current_block = cursor.fetchone()
        
        # Get weekly totals
        week_ago = datetime.now() - timedelta(days=7)
        cursor.execute("""
            SELECT 
                SUM(real_total_tokens) as weekly_real,
                SUM(estimated_tokens) as weekly_billable,
                COUNT(*) as session_count
            FROM sessions
            WHERE start_time >= ?
        """, (week_ago.isoformat(),))
        weekly = cursor.fetchone()
        
        conn.close()
        
        # Calculate 5-hour data
        five_hour_data = {
            "usage_percentage": 0,
            "total_tokens": 0,
            "billable_tokens": 0,
            "time_remaining_minutes": 300,
            "limit_tokens": 200000,
            "is_complete": False
        }
        
        if current_block:
            # current_block columns: id, start_time, end_time, session_type, total_sessions, total_tokens, total_cost, efficiency_score, is_complete
            five_hour_data = {
                "usage_percentage": (current_block[5] / 200000 * 100) if current_block[5] else 0,
                "total_tokens": current_block[5] or 0,
                "billable_tokens": current_block[5] or 0,  # Using total_tokens as billable
                "time_remaining_minutes": 300,  # Default
                "limit_tokens": 200000,
                "is_complete": bool(current_block[8])
            }
        
        # Weekly data
        weekly_data = {
            "usage_percentage": (weekly[1] / 1000000 * 100) if weekly and weekly[1] else 0,
            "total_tokens": weekly[0] or 0 if weekly else 0,
            "billable_tokens": weekly[1] or 0 if weekly else 0,
            "total_sessions": weekly[2] or 0 if weekly else 0,
            "days_remaining": 7 - (datetime.now() - week_ago).days,
            "limit_tokens": 1000000
        }
        
        return {
            "fiveHourLimit": five_hour_data,
            "weeklyLimit": weekly_data
        }
        
    except Exception as e:
        print(f"Error getting rate limit data: {e}")
        return {
            "fiveHourLimit": {"usage_percentage": 0, "billable_tokens": 0},
            "weeklyLimit": {"usage_percentage": 0, "billable_tokens": 0}
        }

def generate_dashboard_html(session_data, rate_limit_data):
    """Generate the dashboard HTML with embedded data"""
    
    html_template = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Optimizer - Live Dashboard</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        h1 {
            color: #60a5fa;
            margin-bottom: 10px;
        }
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #475569;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #60a5fa;
            margin: 10px 0;
        }
        .metric-label {
            color: #94a3b8;
            font-size: 0.875rem;
        }
        .progress-bar {
            background: #1e293b;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin: 15px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
            transition: width 0.3s ease;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: bold;
        }
        .status-active {
            background: #10b981;
            color: white;
        }
        .status-inactive {
            background: #6b7280;
            color: white;
        }
        .danger { background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%); }
        .warning { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); }
        .safe { background: linear-gradient(90deg, #10b981 0%, #34d399 100%); }
        .update-time {
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Claude Code Optimizer Dashboard</h1>
        <div id="status"></div>
    </div>
    
    <div class="dashboard-grid">
        <div class="card">
            <div class="metric-label">Current Session</div>
            <div class="metric-value" id="sessionId">Loading...</div>
            <div id="sessionStatus"></div>
        </div>
        
        <div class="card">
            <div class="metric-label">Real Tokens Used</div>
            <div class="metric-value" id="realTokens">0</div>
            <div class="metric-label">Billable: <span id="billableTokens">0</span></div>
        </div>
        
        <div class="card">
            <div class="metric-label">Weekly Usage</div>
            <div class="metric-value" id="weeklyUsage">0%</div>
            <div class="progress-bar">
                <div class="progress-fill" id="weeklyProgress" style="width: 0%"></div>
            </div>
        </div>
        
        <div class="card">
            <div class="metric-label">5-Hour Block</div>
            <div class="metric-value" id="blockUsage">0%</div>
            <div class="progress-bar">
                <div class="progress-fill" id="blockProgress" style="width: 0%"></div>
            </div>
        </div>
    </div>
    
    <div class="update-time" id="updateTime">Last updated: Never</div>
    
    <script>
        // Embedded data
        const EMBEDDED_DATA = {
            sessionData: ''' + json.dumps(session_data) + ''',
            rateLimitData: ''' + json.dumps(rate_limit_data) + '''
        };
        
        function updateDashboard() {
            const session = EMBEDDED_DATA.sessionData.sessionData;
            const limits = EMBEDDED_DATA.rateLimitData;
            
            // Update session info
            document.getElementById('sessionId').textContent = 
                session.activeSessionId ? session.activeSessionId.substring(0, 30) + '...' : 'No active session';
            
            // Update status
            const statusEl = document.getElementById('sessionStatus');
            if (session.isActive) {
                statusEl.innerHTML = '<span class="status-badge status-active">ACTIVE</span>';
            } else {
                statusEl.innerHTML = '<span class="status-badge status-inactive">INACTIVE</span>';
            }
            
            // Update tokens
            document.getElementById('realTokens').textContent = 
                (session.realTokens || 0).toLocaleString();
            document.getElementById('billableTokens').textContent = 
                (session.billableTokens || 0).toLocaleString();
            
            // Update weekly usage
            const weeklyPercentage = limits.weeklyLimit.usage_percentage || 0;
            document.getElementById('weeklyUsage').textContent = weeklyPercentage.toFixed(1) + '%';
            document.getElementById('weeklyProgress').style.width = weeklyPercentage + '%';
            
            // Color code weekly progress
            const weeklyBar = document.getElementById('weeklyProgress');
            if (weeklyPercentage >= 90) {
                weeklyBar.className = 'progress-fill danger';
            } else if (weeklyPercentage >= 70) {
                weeklyBar.className = 'progress-fill warning';
            } else {
                weeklyBar.className = 'progress-fill safe';
            }
            
            // Update 5-hour block
            const blockPercentage = limits.fiveHourLimit.usage_percentage || 0;
            document.getElementById('blockUsage').textContent = blockPercentage.toFixed(1) + '%';
            document.getElementById('blockProgress').style.width = blockPercentage + '%';
            
            // Color code block progress
            const blockBar = document.getElementById('blockProgress');
            if (blockPercentage >= 90) {
                blockBar.className = 'progress-fill danger';
            } else if (blockPercentage >= 70) {
                blockBar.className = 'progress-fill warning';
            } else {
                blockBar.className = 'progress-fill safe';
            }
            
            // Update time
            document.getElementById('updateTime').textContent = 
                'Last updated: ' + new Date(EMBEDDED_DATA.sessionData.lastUpdate).toLocaleString();
        }
        
        // Initialize dashboard
        updateDashboard();
    </script>
</body>
</html>'''
    
    return html_template

def main():
    """Generate the dashboard"""
    print("🔄 Generating dashboard with fixed data source...")
    
    # Get data
    session_data = get_session_data()
    rate_limit_data = get_rate_limit_data()
    
    # Generate HTML
    html = generate_dashboard_html(session_data, rate_limit_data)
    
    # Save to file
    with open('dashboard_fixed.html', 'w') as f:
        f.write(html)
    
    print("✅ Dashboard generated: dashboard_fixed.html")
    print(f"📊 Session: {session_data['sessionData']['activeSessionId']}")
    print(f"💰 Billable tokens: {session_data['sessionData']['billableTokens']:,}")
    print(f"📈 Weekly usage: {rate_limit_data['weeklyLimit']['usage_percentage']:.1f}%")

if __name__ == "__main__":
    main()