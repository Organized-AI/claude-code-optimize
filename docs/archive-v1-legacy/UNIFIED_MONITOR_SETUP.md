# Claude Unified Monitoring System - Setup Documentation

## ✅ Successfully Implemented: August 11, 2025

### Overview
Complete unified monitoring system for tracking both Claude Code (CLI) and Claude Desktop (App) usage in real-time, feeding data to the Claude Code Optimizer dashboard.

---

## 📦 What Was Created

### Core Monitoring Scripts
Located in `/monitors/` directory:

1. **unified-claude-monitor.sh** ⭐ (Primary - Advanced)
   - Real-time file system monitoring using fswatch
   - Instant detection of new sessions and messages
   - Three parallel monitoring threads
   - Full message content streaming from Claude Code
   - Activity detection for Claude Desktop

2. **simple-monitor.sh** (Fallback - Basic)
   - No dependencies required
   - Polling-based monitoring (5-second intervals)
   - Works with default macOS bash
   - Lightweight resource usage

3. **test-monitor.sh** (Diagnostic)
   - Verifies system setup
   - Checks data directories
   - Tests dependencies
   - Reports monitoring readiness

### Documentation Files
- **UNIFIED_MONITOR_OPTIONS.md** - Comparison of all implementation approaches
- **UNIFIED_MONITOR_SETUP.md** - This file (setup documentation)

---

## 🔍 What Gets Monitored

### Claude Code (CLI)
- **Location**: `~/.claude/projects/**/*.jsonl`
- **Data Format**: JSONL (JSON Lines)
- **Captured Data**:
  - Every user message
  - Every assistant response
  - Tool invocations and results
  - Token usage metrics
  - Session metadata
  - Timestamps for all events

### Claude Desktop (App)
- **Location**: `~/Library/Application Support/Claude/`
- **Data Format**: LevelDB (binary database)
- **Captured Data**:
  - Activity timestamps
  - Database file changes
  - Session activity indicators
  - Process running status

---

## 🚀 Quick Start Guide

### Prerequisites Check
```bash
# Verify fswatch is installed
fswatch --version
# Output: fswatch 1.18.3

# Check Claude data directories
ls ~/.claude/projects/                    # Claude Code sessions
ls ~/Library/Application\ Support/Claude/  # Claude Desktop data
```

### Start Monitoring
```bash
# Navigate to project
cd "/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

# Run advanced monitor (recommended)
./monitors/unified-claude-monitor.sh

# OR run simple monitor (no dependencies)
./monitors/simple-monitor.sh
```

### Verify Operation
```bash
# Run test script
./monitors/test-monitor.sh

# Check logs
tail -f ~/.claude/monitor/unified.log
```

---

## 📊 Data Flow Architecture

```
Claude Code (CLI)          Claude Desktop (App)
       ↓                           ↓
   JSONL Files              LevelDB Database
       ↓                           ↓
   fswatch/poll              fswatch/poll
       ↓                           ↓
    Monitor Script ←→ Process Monitor
           ↓
    JSON Payloads
           ↓
    Dashboard API
    (localhost:3001)
           ↓
    Claude Code Optimizer
```

---

## 🔧 Technical Details

### Dependencies
- **fswatch 1.18.3** - Installed via Homebrew
  - Location: `/opt/homebrew/bin/fswatch`
  - Used for: Real-time file system monitoring
  - Install: `brew install fswatch`

### Data Locations
| Application | Data Path | Format | Access |
|------------|-----------|--------|---------|
| Claude Code | `~/.claude/projects/` | JSONL | Direct read |
| Claude Desktop | `~/Library/Application Support/Claude/IndexedDB/` | LevelDB | Activity detection |
| Monitor Logs | `~/.claude/monitor/` | Text | Direct read |
| Monitor State | `~/.claude/monitor/state.txt` | Key-value | Direct read |

### API Endpoints
- **Dashboard**: `http://localhost:3001/api/activity`
- **Method**: POST
- **Content-Type**: `application/json`
- **Payload Structure**:
```json
{
  "source": "claude-code|claude-desktop|system",
  "type": "message|activity|process",
  "timestamp": "ISO 8601 format",
  "data": {
    // Variable based on source/type
  }
}
```

---

## 📈 Metrics Captured

### Claude Code Metrics
- Total sessions
- Messages per session
- Token usage (input/output/cache)
- Tool usage frequency
- Session duration
- Active project paths

### Claude Desktop Metrics
- Activity frequency
- Database size changes
- Session count
- Last activity timestamp

### System Metrics
- Process status (running/stopped)
- Process IDs
- Memory usage (optional)
- CPU usage (optional)

---

## 🛠️ Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| fswatch not found | Run `brew install fswatch` |
| Permission denied | Run `chmod +x monitors/*.sh` |
| Dashboard offline | Start dashboard server on port 3001 |
| No Claude data | Verify Claude has been used recently |
| Log file not created | Check permissions on `~/.claude/monitor/` |

### Debug Commands
```bash
# Check if monitors are running
ps aux | grep -E "monitor|fswatch"

# Test dashboard connectivity
curl -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify Claude processes
pgrep -x "Claude"  # Desktop app
pgrep -f "claude"  # CLI tool

# Check recent Claude activity
find ~/.claude/projects -name "*.jsonl" -mtime -1 | wc -l
```

---

## 🔄 Integration with Claude Code Optimizer

### Existing Infrastructure
The Claude Code Optimizer project already contains:
- `claude-code-session-monitor.py` - Python monitoring script
- `launch_dashboard.sh` - Dashboard launcher
- `moonlock-dashboard.tsx` - Dashboard UI components
- WebSocket infrastructure for real-time updates

### Integration Points
1. **Data Reception**: Dashboard receives POST requests at `/api/activity`
2. **WebSocket Broadcasting**: Real-time updates to connected clients
3. **State Management**: Metrics aggregation and persistence
4. **UI Updates**: Live dashboard visualization

---

## 📝 Configuration Options

### Environment Variables
```bash
# In monitor scripts
DASHBOARD_HOST="localhost"      # Dashboard server host
DASHBOARD_PORT="3001"           # Dashboard server port
POLL_INTERVAL=5                 # Seconds between polls (simple monitor)
LOG_FILE="$HOME/.claude/monitor/unified.log"
```

### Customization
- Modify polling intervals in `simple-monitor.sh`
- Adjust fswatch parameters in `unified-claude-monitor.sh`
- Change dashboard endpoint in script headers
- Add custom data fields to JSON payloads

---

## 🚦 Monitor Status Indicators

### Console Output Colors
- 🟢 **Green**: Claude Code activity
- 🟡 **Yellow**: Claude Desktop activity
- 🔵 **Blue**: System/process information
- ⚪ **White**: General status messages

### Log Entry Format
```
[timestamp] [source] [type] [data]
2025-08-11T15:30:45Z claude-code message {"session_id": "..."}
```

---

## 🔐 Security Considerations

1. **Local Only**: Monitors only track local file system activity
2. **No Content Storage**: Desktop monitoring detects activity, not content
3. **Configurable Endpoints**: Dashboard location can be customized
4. **Process Isolation**: Each monitor runs in separate process
5. **Graceful Shutdown**: Ctrl+C cleanly stops all monitors

---

## 📅 Implementation Timeline

- **August 11, 2025**: System designed and implemented
- **Components Created**: 4 monitoring scripts, 2 documentation files
- **Testing**: Verified on MacBook M1 Pro
- **Dependencies**: fswatch 1.18.3 installed
- **Data Sources**: Both Claude Code and Desktop verified
- **Integration**: Ready for dashboard connection

---

## 🎯 Next Steps

### Immediate
- [x] Install fswatch
- [x] Create monitoring scripts
- [x] Test system components
- [x] Document setup

### Future Enhancements
- [ ] Add LaunchAgent for auto-start on boot
- [ ] Implement log rotation
- [ ] Add compression for old logs
- [ ] Create dashboard UI components
- [ ] Add historical data analysis
- [ ] Implement alert thresholds
- [ ] Add export functionality

---

## 📚 Related Documentation

- [UNIFIED_MONITOR_OPTIONS.md](./UNIFIED_MONITOR_OPTIONS.md) - All implementation options
- [CLAUDE_CODE_USAGE_LIMIT_ANALYSIS.md](./CLAUDE_CODE_USAGE_LIMIT_ANALYSIS.md) - Usage tracking
- [README.md](./README.md) - Project overview

---

## 📞 Support

For issues or questions about the monitoring system:
1. Check troubleshooting section above
2. Review test script output: `./monitors/test-monitor.sh`
3. Check logs: `tail -f ~/.claude/monitor/unified.log`
4. Verify dependencies: `fswatch --version`

---

*Last Updated: August 11, 2025*
*Version: 1.0.0*
*Author: Claude Code Optimizer Team*