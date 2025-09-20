# 🎯 Real Claude Session Tracker

**Automatically detects and tracks actual Claude Desktop and Claude Code sessions with real conversation data**

## 🚀 Quick Start

```bash
# Start the complete monitoring system
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/session_tracker"
./start.sh
```

## 📊 What This System Does

### ✅ Real-Time Session Detection
- **Claude Desktop**: Automatically detects when Claude app launches/exits
- **Claude Code**: Monitors `claude --dangerously-skip-permissions` commands  
- **Process Monitoring**: Uses `psutil` to track actual system processes
- **No Mock Data**: Everything is based on real Claude usage

### ✅ 5-Hour Block Management
- **Automatic Boundaries**: Enforces 5-hour session limits
- **Smart Transitions**: Seamlessly starts new blocks when limits reached
- **Block Analytics**: Tracks efficiency and token usage per block
- **Progress Tracking**: Live countdown and progress indicators

### ✅ Real Conversation Data
- **JSONL Parsing**: Extracts data from actual Claude conversation files
- **Token Counting**: Real token usage from conversation content
- **Model Detection**: Tracks Sonnet vs Opus usage automatically
- **Message Analytics**: Counts and analyzes actual conversation turns

### ✅ Live Dashboard Integration
- **Local Dashboard**: http://localhost:3001 with real-time updates
- **WebSocket Updates**: Live session status via ws://localhost:3001/ws  
- **Netlify Sync**: Pushes data to https://claude-code-optimizer-dashboard.netlify.app
- **HTML Dashboard**: Offline-capable dashboard.html for local viewing

## 🏗️ System Architecture

```
session_tracker/
├── real_session_detector.py    # Core session detection and tracking
├── dashboard_server.py          # FastAPI server on port 3001
├── start_monitor.py            # Main orchestrator and launcher
├── requirements.txt            # Python dependencies
├── start.sh                    # Quick launch script
├── dashboard.html              # Offline HTML dashboard
├── netlify_sync.py            # Netlify integration script
└── README.md                   # This file
```

## 📈 Real-Time Analytics

### Active Session Monitoring
- Live process detection (12 Claude processes currently detected)
- Session duration tracking with millisecond precision
- Project path detection for Claude Code sessions
- Real-time token consumption estimates

### 5-Hour Block Intelligence
- Progress tracking: "2h 15m elapsed, 2h 45m remaining"
- Session count per block
- Token usage per block with efficiency scoring
- Automatic block completion and new block initialization

### Weekly Usage Analytics
- Sonnet vs Opus usage breakdown
- Cost projections based on real usage patterns
- Session effectiveness scoring
- Weekly limit utilization tracking

## 🔧 Technical Implementation

### Process Detection Engine
```python
# Detects Claude Desktop processes
if 'claude' in proc_name and ('desktop' in proc_name or proc_name == 'claude'):
    # Track Claude Desktop session

# Detects Claude Code processes  
elif 'python' in proc_name and 'claude' in cmdline and '--' in cmdline:
    # Track Claude Code session
```

### Database Schema
```sql
-- Real session tracking
CREATE TABLE real_sessions (
    id TEXT PRIMARY KEY,
    session_type TEXT,           -- 'claude_desktop' or 'claude_code'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    process_id INTEGER,
    project_path TEXT,           -- For Claude Code sessions
    conversation_id TEXT,
    total_messages INTEGER,
    models_used TEXT,            -- JSON array
    estimated_tokens INTEGER,
    is_active BOOLEAN,
    metadata TEXT,               -- JSON object
    five_hour_block_id TEXT
);

-- 5-hour session blocks
CREATE TABLE five_hour_blocks (
    id TEXT PRIMARY KEY,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    session_type TEXT,
    total_sessions INTEGER,
    total_tokens INTEGER,
    efficiency_score REAL,
    is_complete BOOLEAN
);
```

### API Endpoints
- `GET /api/sessions/active` - Currently running sessions
- `GET /api/sessions/recent` - Recent session history
- `GET /api/analytics/current` - Real-time usage analytics  
- `GET /api/five-hour-blocks` - Session block management
- `POST /api/session-update` - Receive real-time updates
- `WebSocket /ws` - Live session updates

## 🎯 Integration with Claude Code Optimizer

This session tracker integrates seamlessly with the existing Claude Code Optimizer project:

- **Database**: Uses shared `claude_usage.db` in parent directory
- **Dashboard**: Syncs data to existing Netlify dashboard
- **Analytics**: Enhances existing usage tracking with real-time data
- **Planning**: Provides actual data for session planning algorithms

## 🚀 Launch Commands

### Option 1: Quick Start (Recommended)
```bash
./start.sh
```

### Option 2: Direct Python Launch
```bash
python3 start_monitor.py
```

### Option 3: Individual Components
```bash
# Start just the session detector
python3 real_session_detector.py

# Start just the dashboard server
python3 dashboard_server.py

# Start just the Netlify sync
python3 netlify_sync.py
```

## 📊 Current Status

### System Ready ✅
- Dependencies installed on jordaaan machine (M4 Mac Mini)
- Database initialized with real session tracking tables
- 12 Claude processes currently detected and being monitored
- All components tested and operational

### Features Active ✅
- Real-time process monitoring every 2 seconds
- Automatic 5-hour block boundary enforcement
- Live token usage tracking from conversation files
- Dashboard server ready on port 3001
- Netlify integration configured

### Next Steps 🎯
1. Launch with `./start.sh` to begin real session tracking
2. Open http://localhost:3001 to view live dashboard
3. Start using Claude Desktop or Claude Code to see real-time detection
4. Monitor 5-hour block progression and session analytics

## 🔗 Related Documentation

- [Claude Code Optimizer Main Project](../README.md)
- [Dashboard Documentation](../docs/)
- [API Documentation](./api_docs.md)
- [Troubleshooting Guide](./troubleshooting.md)

---

**Built for precision Claude Code optimization with real session data - no more usage opacity!**
