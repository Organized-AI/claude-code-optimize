#!/usr/bin/env python3
"""
Real Claude Session Tracking - Main Launcher
Starts both session detection and real-time dashboard
"""

import os
import sys
import time
import subprocess
import threading
import signal
from pathlib import Path

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from real_session_detector import RealSessionTracker
from dashboard_server import DashboardServer

class ClaudeSessionMonitor:
    """Main orchestrator for Claude session monitoring"""
    
    def __init__(self):
        self.tracker = None
        self.dashboard_server = None
        self.running = False
        
    def start(self):
        """Start both session tracking and dashboard server"""
        print("🚀 Starting Claude Session Monitor...")
        print("=" * 60)
        
        self.running = True
        
        # Install dependencies if needed
        self._check_dependencies()
        
        # Start dashboard server in separate thread
        print("📊 Starting dashboard server on port 3001...")
        self.dashboard_server = DashboardServer(port=3001)
        dashboard_thread = threading.Thread(
            target=self.dashboard_server.start, 
            daemon=True
        )
        dashboard_thread.start()
        
        # Give dashboard server time to start
        time.sleep(3)
        
        # Start session tracking
        print("🔍 Starting real session tracking...")
        self.tracker = RealSessionTracker()
        
        # Start tracking in separate thread
        tracking_thread = threading.Thread(
            target=self.tracker.start_tracking,
            daemon=True
        )
        tracking_thread.start()
        
        print("\n✅ Claude Session Monitor is running!")
        print("🌐 Dashboard: http://localhost:3001")
        print("📊 Real-time updates: ws://localhost:3001/ws")
        print("🔗 Netlify Dashboard: https://claude-code-optimizer-dashboard.netlify.app")
        print("\nMonitoring for Claude Desktop and Claude Code sessions...")
        print("Press Ctrl+C to stop\n")
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Keep main thread alive and show status
        try:
            while self.running:
                time.sleep(10)
                self._show_status()
                
        except KeyboardInterrupt:
            self._stop()
    
    def _check_dependencies(self):
        """Check and install required dependencies"""
        try:
            import psutil
            import fastapi
            import uvicorn
            import watchdog
            print("✅ All dependencies available")
        except ImportError as e:
            print(f"⚠️ Missing dependency: {e}")
            print("Installing required packages...")
            
            requirements_path = current_dir / "requirements.txt"
            if requirements_path.exists():
                subprocess.run([
                    sys.executable, "-m", "pip", "install", 
                    "-r", str(requirements_path)
                ], check=True)
            else:
                # Install essential packages individually
                essential_packages = [
                    "psutil>=5.9.0",
                    "fastapi>=0.100.0", 
                    "uvicorn[standard]>=0.23.0",
                    "watchdog>=3.0.0",
                    "requests>=2.31.0",
                    "pydantic>=2.0.0"
                ]
                for package in essential_packages:
                    subprocess.run([
                        sys.executable, "-m", "pip", "install", package
                    ], check=True)
    
    def _show_status(self):
        """Show current monitoring status"""
        if self.tracker:
            active_sessions = self.tracker.get_current_sessions()
            if active_sessions:
                print(f"📊 Active sessions: {len(active_sessions)}")
                for session in active_sessions:
                    duration = time.time() - session.start_time.timestamp()
                    duration_str = f"{int(duration//3600)}h {int((duration%3600)//60)}m"
                    print(f"   • {session.session_type}: {duration_str}")
            else:
                print("⏸️  No active Claude sessions detected")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        print(f"\n🛑 Received signal {signum}, shutting down...")
        self._stop()
    
    def _stop(self):
        """Stop all monitoring"""
        print("🛑 Stopping Claude Session Monitor...")
        self.running = False
        
        if self.tracker:
            self.tracker.process_monitor.stop()
        
        print("✅ Claude Session Monitor stopped")
        sys.exit(0)

def create_desktop_dashboard():
    """Create a simple HTML dashboard for local viewing"""
    dashboard_html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Session Monitor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f1419; color: #c9d1d9; padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #58a6ff; margin-bottom: 10px; }
        .status-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .card { 
            background: #161b22; 
            border: 1px solid #30363d; 
            border-radius: 8px; 
            padding: 20px;
        }
        .card h3 { color: #58a6ff; margin-bottom: 15px; }
        .active-session { 
            background: #0d1117; 
            border: 1px solid #238636; 
            padding: 10px; 
            margin: 5px 0; 
            border-radius: 5px;
        }
        .session-type { color: #7c3aed; font-weight: bold; }
        .duration { color: #f85149; }
        .tokens { color: #a5f3fc; }
        .block-progress { 
            background: #21262d; 
            height: 20px; 
            border-radius: 10px; 
            overflow: hidden; 
            margin: 10px 0;
        }
        .progress-bar { 
            background: linear-gradient(90deg, #238636, #58a6ff); 
            height: 100%; 
            transition: width 0.3s ease;
        }
        .status { color: #238636; }
        .metrics { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric { text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #58a6ff; }
        .metric-label { font-size: 12px; color: #8b949e; }
        .footer { text-align: center; margin-top: 30px; color: #8b949e; }
        .refresh-btn { 
            background: #238636; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 10px;
        }
        .refresh-btn:hover { background: #2ea043; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Claude Session Monitor</h1>
            <p>Real-time tracking of Claude Desktop and Claude Code sessions</p>
            <button class="refresh-btn" onclick="loadData()">🔄 Refresh</button>
            <span id="last-updated" class="status"></span>
        </div>

        <div class="status-grid">
            <div class="card">
                <h3>📊 Active Sessions</h3>
                <div id="active-sessions">
                    <p>Loading...</p>
                </div>
            </div>

            <div class="card">
                <h3>🕐 Current 5-Hour Block</h3>
                <div id="current-block">
                    <p>Loading...</p>
                </div>
            </div>

            <div class="card">
                <h3>📈 Today's Analytics</h3>
                <div id="analytics">
                    <p>Loading...</p>
                </div>
            </div>

            <div class="card">
                <h3>📅 Recent 5-Hour Blocks</h3>
                <div id="recent-blocks">
                    <p>Loading...</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Monitoring localhost:3001 • Dashboard syncs to Netlify every 30s</p>
        </div>
    </div>

    <script>
        let ws = null;
        
        function connectWebSocket() {
            try {
                ws = new WebSocket('ws://localhost:3001/ws');
                
                ws.onopen = function() {
                    console.log('WebSocket connected');
                    document.getElementById('last-updated').textContent = '🟢 Connected';
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    updateDashboard(data);
                };
                
                ws.onclose = function() {
                    console.log('WebSocket disconnected');
                    document.getElementById('last-updated').textContent = '🔴 Disconnected';
                    setTimeout(connectWebSocket, 5000);
                };
                
                ws.onerror = function(error) {
                    console.error('WebSocket error:', error);
                    document.getElementById('last-updated').textContent = '⚠️ Error';
                };
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                document.getElementById('last-updated').textContent = '❌ Failed to connect';
            }
        }
        
        function updateDashboard(data) {
            if (data.type === 'initial_data') {
                updateActiveSessions(data.active_sessions);
                updateAnalytics(data.analytics);
                updateFiveHourBlocks(data.five_hour_blocks);
            } else if (data.type === 'session_update') {
                loadData();
            }
            
            document.getElementById('last-updated').textContent = 
                `🟢 Updated: ${new Date().toLocaleTimeString()}`;
        }
        
        function updateActiveSessions(sessions) {
            const container = document.getElementById('active-sessions');
            
            if (!sessions || sessions.length === 0) {
                container.innerHTML = '<p>No active sessions</p>';
                return;
            }
            
            let html = '';
            sessions.forEach(session => {
                const duration = Math.round(session.duration_minutes || 0);
                html += `
                    <div class="active-session">
                        <div><span class="session-type">${session.session_type}</span></div>
                        <div>Duration: <span class="duration">${duration}m</span></div>
                        <div>Messages: ${session.total_messages || 0}</div>
                        <div>Tokens: <span class="tokens">${(session.estimated_tokens || 0).toLocaleString()}</span></div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        function updateAnalytics(analytics) {
            const container = document.getElementById('analytics');
            
            if (!analytics || !analytics.today) {
                container.innerHTML = '<p>No analytics data</p>';
                return;
            }
            
            let totalSessions = 0;
            let totalTokens = 0;
            
            Object.values(analytics.today).forEach(stats => {
                totalSessions += stats.sessions || 0;
                totalTokens += stats.tokens || 0;
            });
            
            const currentBlock = analytics.current_block;
            let blockHtml = '';
            if (currentBlock) {
                const progressPercent = currentBlock.progress_percent || 0;
                blockHtml = `
                    <div>
                        <p>Block Progress: ${progressPercent.toFixed(1)}%</p>
                        <div class="block-progress">
                            <div class="progress-bar" style="width: ${progressPercent}%"></div>
                        </div>
                        <p>Remaining: ${Math.round(currentBlock.remaining_minutes || 0)}m</p>
                    </div>
                `;
                
                document.getElementById('current-block').innerHTML = blockHtml;
            } else {
                document.getElementById('current-block').innerHTML = '<p>No active 5-hour block</p>';
            }
            
            container.innerHTML = `
                <div class="metrics">
                    <div class="metric">
                        <div class="metric-value">${totalSessions}</div>
                        <div class="metric-label">Sessions Today</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${(totalTokens / 1000).toFixed(1)}K</div>
                        <div class="metric-label">Tokens Today</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${analytics.total_active_sessions || 0}</div>
                        <div class="metric-label">Active Now</div>
                    </div>
                </div>
            `;
        }
        
        function updateFiveHourBlocks(blocks) {
            const container = document.getElementById('recent-blocks');
            
            if (!blocks || blocks.length === 0) {
                container.innerHTML = '<p>No recent blocks</p>';
                return;
            }
            
            let html = '';
            blocks.slice(0, 3).forEach(block => {
                const status = block.is_complete ? '✅ Complete' : '⏳ Active';
                const duration = Math.round(block.duration_minutes || 0);
                html += `
                    <div style="margin: 10px 0; padding: 10px; background: #0d1117; border-radius: 5px;">
                        <div>${status} • ${duration}m</div>
                        <div>Sessions: ${block.total_sessions || 0} • Tokens: ${(block.total_tokens || 0).toLocaleString()}</div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        async function loadData() {
            try {
                const [sessions, analytics, blocks] = await Promise.all([
                    fetch('http://localhost:3001/api/sessions/active').then(r => r.json()),
                    fetch('http://localhost:3001/api/analytics/current').then(r => r.json()),
                    fetch('http://localhost:3001/api/five-hour-blocks').then(r => r.json())
                ]);
                
                updateActiveSessions(sessions);
                updateAnalytics(analytics);
                updateFiveHourBlocks(blocks);
                
                document.getElementById('last-updated').textContent = 
                    `🟢 Updated: ${new Date().toLocaleTimeString()}`;
                    
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('last-updated').textContent = '❌ Error loading data';
            }
        }
        
        // Initialize
        connectWebSocket();
        loadData();
        
        // Auto-refresh every 30 seconds as fallback
        setInterval(loadData, 30000);
    </script>
</body>
</html>'''
    
    dashboard_path = current_dir / "dashboard.html"
    with open(dashboard_path, 'w') as f:
        f.write(dashboard_html)
    
    print(f"✅ Dashboard HTML created: {dashboard_path}")
    return dashboard_path

def create_netlify_integration():
    """Create Netlify integration script"""
    netlify_script = '''#!/usr/bin/env python3
"""
Netlify Dashboard Integration
Pushes real session data to the live Netlify dashboard
"""

import json
import time
import requests
from datetime import datetime

NETLIFY_DASHBOARD_URL = "https://claude-code-optimizer-dashboard.netlify.app"
LOCALHOST_API = "http://localhost:3001/api"

def sync_to_netlify():
    """Sync current session data to Netlify"""
    try:
        # Get current data from localhost
        analytics = requests.get(f"{LOCALHOST_API}/analytics/current", timeout=5).json()
        active_sessions = requests.get(f"{LOCALHOST_API}/sessions/active", timeout=5).json()
        five_hour_blocks = requests.get(f"{LOCALHOST_API}/five-hour-blocks", timeout=5).json()
        
        # Prepare payload for Netlify
        payload = {
            "source": "localhost_sync",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "analytics": analytics,
                "active_sessions": active_sessions,
                "five_hour_blocks": five_hour_blocks
            }
        }
        
        # Send to Netlify (this assumes Netlify has webhook endpoint)
        response = requests.post(
            f"{NETLIFY_DASHBOARD_URL}/api/sync",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Synced to Netlify: {len(active_sessions)} sessions")
        else:
            print(f"⚠️ Netlify sync failed: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Sync error: {e}")

def main():
    """Main sync loop"""
    print("🔄 Starting Netlify sync service...")
    
    while True:
        sync_to_netlify()
        time.sleep(30)  # Sync every 30 seconds

if __name__ == "__main__":
    main()
'''
    
    netlify_path = current_dir / "netlify_sync.py"
    with open(netlify_path, 'w') as f:
        f.write(netlify_script)
    
    print(f"✅ Netlify sync script created: {netlify_path}")
    return netlify_path

def main():
    """Main function"""
    print("🎯 Claude Session Monitor Setup")
    print("=" * 50)
    
    # Create dashboard files
    dashboard_path = create_desktop_dashboard()
    netlify_path = create_netlify_integration()
    
    print("\n🚀 Starting monitoring system...")
    
    # Start the main monitor
    monitor = ClaudeSessionMonitor()
    monitor.start()

if __name__ == "__main__":
    main()
