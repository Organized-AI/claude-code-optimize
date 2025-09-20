#!/usr/bin/env python3
"""
Dashboard Real Data Injector
Replaces mock data in moonlock-dashboard with real session data
"""

import json
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path

def get_real_session_data():
    """Get current real session data from our tracker database"""
    db_path = "../claude_usage.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get active sessions
        cursor.execute('''
            SELECT * FROM real_sessions 
            WHERE is_active = TRUE 
            ORDER BY start_time DESC
        ''')
        
        columns = [description[0] for description in cursor.description]
        active_sessions = []
        
        for row in cursor.fetchall():
            session_dict = dict(zip(columns, row))
            
            # Calculate duration
            if session_dict['start_time']:
                start_time = datetime.fromisoformat(session_dict['start_time'])
                session_dict['duration_minutes'] = (datetime.now() - start_time).total_seconds() / 60
                session_dict['remaining_time'] = max(0, (300 - session_dict['duration_minutes']) * 60 * 1000)  # ms
            
            # Parse JSON fields
            if session_dict['models_used']:
                try:
                    session_dict['models_used'] = json.loads(session_dict['models_used'])
                except:
                    session_dict['models_used'] = []
                    
            if session_dict['metadata']:
                try:
                    session_dict['metadata'] = json.loads(session_dict['metadata'])
                except:
                    session_dict['metadata'] = {}
            
            active_sessions.append(session_dict)
        
        # Get current 5-hour block
        cursor.execute('''
            SELECT * FROM five_hour_blocks 
            WHERE is_complete = FALSE 
            ORDER BY start_time DESC 
            LIMIT 1
        ''')
        
        current_block = cursor.fetchone()
        current_block_info = None
        
        if current_block:
            columns = [description[0] for description in cursor.description]
            block_dict = dict(zip(columns, current_block))
            
            start_time = datetime.fromisoformat(block_dict['start_time'])
            elapsed_minutes = (datetime.now() - start_time).total_seconds() / 60
            remaining_minutes = max(0, 300 - elapsed_minutes)
            
            current_block_info = {
                "id": block_dict['id'],
                "elapsed_minutes": elapsed_minutes,
                "remaining_minutes": remaining_minutes,
                "sessions": block_dict['total_sessions'] or 0,
                "tokens": block_dict['total_tokens'] or 0,
                "progress_percent": (elapsed_minutes / 300) * 100
            }
        
        conn.close()
        
        # Format data for dashboard consumption
        if active_sessions:
            primary_session = active_sessions[0]
            
            real_data = {
                "isActive": True,
                "activeSessionId": primary_session['id'],
                "sessionType": primary_session['session_type'],
                "remainingTime": int(primary_session.get('remaining_time', 0)),
                "conversationContext": f"Real {primary_session['session_type']} session",
                "currentWindow": {
                    "projectId": primary_session.get('project_path', 'N/A'),
                    "status": "active",
                    "tokenUsage": {
                        "totalTokens": primary_session.get('estimated_tokens', 0),
                        "inputTokens": int((primary_session.get('estimated_tokens', 0)) * 0.6),
                        "outputTokens": int((primary_session.get('estimated_tokens', 0)) * 0.4)
                    },
                    "efficiency": min(100, max(0, 85 + (primary_session.get('total_messages', 0) * 2))),
                    "costEstimate": (primary_session.get('estimated_tokens', 0) * 0.000003),  # Rough cost estimate
                    "timeActive": primary_session.get('duration_minutes', 0),
                    "models_used": primary_session.get('models_used', []),
                    "process_id": primary_session.get('process_id')
                },
                "currentBlock": current_block_info,
                "totalActiveSessions": len(active_sessions),
                "lastUpdated": datetime.now().isoformat()
            }
        else:
            real_data = {
                "isActive": False,
                "activeSessionId": None,
                "sessionType": None,
                "remainingTime": 0,
                "conversationContext": "No active Claude sessions",
                "currentWindow": None,
                "currentBlock": current_block_info,
                "totalActiveSessions": 0,
                "lastUpdated": datetime.now().isoformat()
            }
        
        return real_data
        
    except Exception as e:
        print(f"Error getting real session data: {e}")
        return None

def create_real_data_api_endpoints():
    """Create API endpoint files that return real data instead of mock data"""
    
    # API endpoints directory
    api_dir = Path("../moonlock-dashboard/api/claude-code")
    api_dir.mkdir(parents=True, exist_ok=True)
    
    # Live status endpoint with real data
    live_status_js = '''
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
'''
    
    with open(api_dir / "live-status.js", "w") as f:
        f.write(live_status_js)
    
    print(f"✅ Created real data API endpoint: {api_dir / 'live-status.js'}")

def generate_real_data_json():
    """Generate a JSON file with current real session data"""
    real_data = get_real_session_data()
    
    if real_data:
        output_file = Path("../moonlock-dashboard/real-session-data.json")
        
        with open(output_file, "w") as f:
            json.dump(real_data, f, indent=2)
        
        print(f"✅ Real session data written to: {output_file}")
        print(f"📊 Active sessions: {real_data['totalActiveSessions']}")
        
        if real_data['isActive']:
            session = real_data['currentWindow']
            print(f"🎯 Active session ID: {real_data['activeSessionId'][:8]}...")
            print(f"💾 Project: {session['projectId']}")
            print(f"🔢 Tokens: {session['tokenUsage']['totalTokens']:,}")
            print(f"⚡ Efficiency: {session['efficiency']:.1f}%")
            print(f"💰 Cost: ${session['costEstimate']:.4f}")
        else:
            print("⏸️  No active Claude sessions detected")
        
        return real_data
    else:
        print("❌ Could not retrieve real session data")
        return None

def create_dashboard_update_script():
    """Create a script to continuously update dashboard with real data"""
    
    update_script = '''#!/usr/bin/env python3
"""
Real-time Dashboard Data Updater
Continuously updates moonlock dashboard with real session data
"""

import json
import time
from pathlib import Path
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from session_tracker.update_dashboard_with_real_data import get_real_session_data

def update_dashboard_continuously():
    """Continuously update dashboard with real data"""
    print("🔄 Starting real-time dashboard data updater...")
    print("📊 Updates every 10 seconds")
    print("Press Ctrl+C to stop")
    
    while True:
        try:
            real_data = get_real_session_data()
            
            if real_data:
                # Write to JSON file for dashboard consumption
                output_file = Path("../moonlock-dashboard/real-session-data.json")
                with open(output_file, "w") as f:
                    json.dump(real_data, f, indent=2)
                
                # Print current status
                if real_data['isActive']:
                    session_id = real_data['activeSessionId'][:8]
                    tokens = real_data['currentWindow']['tokenUsage']['totalTokens']
                    efficiency = real_data['currentWindow']['efficiency']
                    print(f"📡 {time.strftime('%H:%M:%S')} - Session {session_id}: {tokens:,} tokens, {efficiency:.1f}% efficiency")
                else:
                    print(f"📡 {time.strftime('%H:%M:%S')} - No active sessions")
            
            time.sleep(10)  # Update every 10 seconds
            
        except KeyboardInterrupt:
            print("\\n🛑 Stopping dashboard updater...")
            break
        except Exception as e:
            print(f"⚠️ Error updating dashboard: {e}")
            time.sleep(10)

if __name__ == "__main__":
    update_dashboard_continuously()
'''
    
    script_path = Path("../moonlock-dashboard/update_with_real_data.py")
    with open(script_path, "w") as f:
        f.write(update_script)
    
    # Make executable
    import stat
    script_path.chmod(script_path.stat().st_mode | stat.S_IEXEC)
    
    print(f"✅ Created dashboard updater script: {script_path}")

def main():
    """Main function"""
    print("🎯 Dashboard Real Data Injector")
    print("=" * 50)
    
    # Generate current real data
    print("📊 Generating real session data...")
    real_data = generate_real_data_json()
    
    if real_data:
        print("\\n🔧 Creating API endpoints...")
        create_real_data_api_endpoints()
        
        print("\\n🔄 Creating continuous updater...")
        create_dashboard_update_script()
        
        print("\\n✅ Dashboard integration complete!")
        print("\\n🎯 Next steps:")
        print("1. Open the real data dashboard:")
        print("   file:///Users/jordaaan/Library/Mobile%20Documents/com~apple~CloudDocs/BHT%20Promo%20iCloud/Organized%20AI/Windsurf/Claude%20Code%20Optimizer/moonlock-dashboard/real-data-bridge.html")
        print("\\n2. Start continuous updates:")
        print("   cd ../moonlock-dashboard && python3 update_with_real_data.py")
        print("\\n3. The dashboard will show REAL session IDs instead of 'sess_example_12345'!")
    else:
        print("❌ Could not generate real data - make sure session tracker database exists")

if __name__ == "__main__":
    main()
