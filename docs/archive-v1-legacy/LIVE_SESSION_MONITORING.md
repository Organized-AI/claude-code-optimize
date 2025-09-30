# 🔴 Claude Code Live Session Monitoring

This system provides real-time monitoring of Claude Code sessions with a live dashboard that displays **"LIVE SESSION ACTIVE"** whenever Claude Code is running.

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `src/usage_tracker/session_monitor.py` | **MAIN FILE** - Detects Claude Code session activity |
| `src/dashboard/live_dashboard.py` | Streamlit dashboard that shows live status |
| `dashboard_state/current_session.json` | State file for real-time updates |
| `launch_dashboard.sh` | Quick launcher for the dashboard |

## 🚀 Quick Start

### 1. Launch the Dashboard
```bash
# Start the live monitoring dashboard
./launch_dashboard.sh
```
This opens a browser at `http://localhost:8501` with the live session monitor.

### 2. Run Claude Code with Monitoring
```bash
# Use the session monitor wrapper
python src/usage_tracker/session_monitor.py ask "Help me debug this code"

# Or with any Claude Code command
python src/usage_tracker/session_monitor.py --help
python src/usage_tracker/session_monitor.py codebase analyze
```

### 3. Watch the Magic ✨
- Dashboard will instantly show **"🔴 LIVE SESSION ACTIVE"** 
- Real-time metrics update as Claude Code runs
- Cost, turns, duration all tracked live
- Session automatically marked inactive when complete

## 🔧 How It Works

### Session Detection
The `session_monitor.py` file wraps Claude Code commands and:

1. **Starts monitoring** when `claude-code` command is executed
2. **Parses JSON output** using the `--json-log` flag
3. **Extracts metrics** (`total_cost_usd`, `duration_ms`, `num_turns`)
4. **Updates dashboard** in real-time via state file
5. **Cleans up** when session ends

### Dashboard Updates
The dashboard polls the state file every 2 seconds and:

- Shows **"LIVE SESSION ACTIVE"** with pulsing red animation
- Displays real-time cost, turns, and duration
- Updates session efficiency metrics
- Automatically switches to inactive when session ends

## 🧪 Testing

Run the test to verify everything works:
```bash
python test_session_monitoring.py
```

This simulates a full session lifecycle and verifies:
- ✅ Session status updates
- ✅ Metrics tracking  
- ✅ State file creation
- ✅ Dashboard data flow

## 📊 Dashboard Features

### Active Session Display
- 🔴 **Pulsing "LIVE SESSION ACTIVE" indicator**
- Real-time cost tracking ($ USD)
- Turn count with delta indicators
- Session duration timer
- Command being executed
- Efficiency calculations

### Inactive Session Display  
- ⚫ "No Active Session" indicator
- Last session summary
- Instructions for starting monitoring
- Historical session data

## 🔌 Integration with Your Existing System

### Calendar Integration
To integrate with your Google Calendar system:

```python
from src.usage_tracker.session_monitor import ClaudeCodeSessionMonitor

def calendar_callback(session_data):
    """Called when session status changes"""
    if session_data["status"] == "ACTIVE":
        # Update calendar block to "IN PROGRESS"
        update_calendar_block_status("ACTIVE")
    elif session_data["status"] == "COMPLETED":
        # Mark calendar block as complete with metrics
        complete_calendar_block(session_data["data"])

# Create monitor with calendar callback
monitor = ClaudeCodeSessionMonitor(dashboard_callback=calendar_callback)
```

### API Endpoints
Add these endpoints to your FastAPI backend:

```python
@app.get("/api/current-session")
async def get_current_session():
    monitor = ClaudeCodeSessionMonitor()
    return monitor.get_current_status()

@app.post("/api/session/webhook")
async def session_webhook(data: dict):
    # Handle session updates from monitor
    pass
```

## 🎛️ Configuration

### Environment Variables
```bash
# Optional: Customize state file location
export CLAUDE_SESSION_STATE_FILE="custom/path/session.json"

# Optional: Dashboard refresh interval (seconds)
export DASHBOARD_REFRESH_INTERVAL=1
```

### CLI Arguments
```bash
# Monitor specific project
python src/usage_tracker/session_monitor.py codebase --project-path /path/to/project

# Custom session type
python src/usage_tracker/session_monitor.py ask "question" --session-type debugging

# Verbose monitoring
python src/usage_tracker/session_monitor.py --verbose ask "question"
```

## 🚨 Troubleshooting

### Dashboard Not Updating
1. Check state file exists: `ls -la dashboard_state/current_session.json`
2. Verify permissions: `chmod 755 dashboard_state/`
3. Check dashboard logs for errors

### Session Not Detected
1. Ensure using the wrapper: `python src/usage_tracker/session_monitor.py`
2. Verify Claude Code installed: `claude-code --version`  
3. Check `--json-log` flag is supported

### Real-time Updates Missing
1. Verify dashboard refresh interval (default: 2 seconds)
2. Check browser console for errors
3. Ensure state file is writable

## 🔮 Next Steps

### Phase 2 Integration
Once this is working, integrate with:

1. **Google Calendar API** - Auto-create coding blocks
2. **Budget Management** - Weekly limit tracking
3. **Project Analysis** - Smart session scheduling  
4. **Team Coordination** - Multi-user monitoring

### Advanced Features
- WebSocket real-time updates (no polling)
- Session recording and replay
- Performance analytics and optimization
- Integration with VS Code extension

## 📞 Support

If you encounter issues:

1. Run the test script: `python test_session_monitoring.py`
2. Check state file: `cat dashboard_state/current_session.json`
3. Verify Claude Code works: `claude-code --help`
4. Check dashboard logs in terminal

**The exact file that triggers "LIVE SESSION ACTIVE" is `src/usage_tracker/session_monitor.py` in the `_monitor_session_output()` method.** 🎯
