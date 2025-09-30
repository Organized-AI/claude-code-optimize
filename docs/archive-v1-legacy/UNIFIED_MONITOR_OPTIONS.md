# Unified Claude Monitor - Implementation Options

## Project: Claude Code Optimizer
**Location**: `/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer`

**Goal**: Track usage from both Claude Code (CLI) and Claude Desktop (App) in a single dashboard

---

## Option 1: Simple Unified Monitor ✅ **[SELECTED]**
*Lightweight bash script that watches both sources simultaneously*

### Overview
- **Complexity**: Low (30 minutes to implement)
- **Maintenance**: Minimal
- **Data Quality**: Good for activity, excellent for CLI
- **Resource Usage**: Very low

### Implementation

#### File: `unified-claude-monitor.sh`
```bash
#!/bin/bash
# Unified Claude Monitor - Tracks both CLI and Desktop usage
# Location: ~/Claude Code Optimizer/monitors/unified-claude-monitor.sh

# Configuration
DASHBOARD_HOST="localhost"
DASHBOARD_PORT="3001"
LOG_FILE="$HOME/.claude/monitor/unified.log"

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Unified Claude Monitor${NC}"
echo "================================================"
echo "Monitoring:"
echo "  • Claude Code (CLI) - Full message content"
echo "  • Claude Desktop    - Activity detection"
echo "================================================"

# Function to send data to dashboard
send_to_dashboard() {
    local source=$1
    local event_type=$2
    local data=$3
    
    curl -s -X POST "http://$DASHBOARD_HOST:$DASHBOARD_PORT/api/activity" \
        -H "Content-Type: application/json" \
        -d "{
            \"source\": \"$source\",
            \"type\": \"$event_type\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"data\": $data
        }" >> "$LOG_FILE" 2>&1
}

# Monitor 1: Claude Code (JSONL files)
monitor_claude_code() {
    echo -e "${BLUE}📝 Monitoring Claude Code...${NC}"
    
    # Watch for new JSONL files and tail existing ones
    fswatch -r "$HOME/.claude/projects" | while read event; do
        if [[ $event == *.jsonl ]]; then
            # New session detected
            session_id=$(basename "$event" .jsonl)
            echo -e "${GREEN}[Claude Code]${NC} New session: $session_id"
            
            # Tail the new file
            tail -F "$event" 2>/dev/null | while read line; do
                if [ ! -z "$line" ]; then
                    # Parse and send each message
                    echo -e "${GREEN}[Claude Code]${NC} New message"
                    send_to_dashboard "claude-code" "message" "$line"
                fi
            done &
        fi
    done
}

# Monitor 2: Claude Desktop (Activity detection)
monitor_claude_desktop() {
    echo -e "${YELLOW}🖥️  Monitoring Claude Desktop...${NC}"
    
    CLAUDE_DESKTOP="$HOME/Library/Application Support/Claude"
    
    # Watch IndexedDB and Local Storage for changes
    fswatch -r "$CLAUDE_DESKTOP/IndexedDB" "$CLAUDE_DESKTOP/Local Storage" \
            "$CLAUDE_DESKTOP/Session Storage" 2>/dev/null | while read event; do
        
        # Get file info
        if [ -f "$event" ]; then
            size=$(stat -f%z "$event" 2>/dev/null || echo "0")
            filename=$(basename "$event")
            
            # Only report significant changes (not every byte)
            if [[ $filename == *.ldb ]] || [[ $filename == *.log ]]; then
                echo -e "${YELLOW}[Claude Desktop]${NC} Activity detected: $filename ($size bytes)"
                
                send_to_dashboard "claude-desktop" "activity" "{
                    \"file\": \"$filename\",
                    \"size\": $size,
                    \"path\": \"$event\"
                }"
            fi
        fi
    done
}

# Monitor 3: System-wide Claude process monitoring
monitor_processes() {
    echo -e "${BLUE}⚙️  Monitoring Claude processes...${NC}"
    
    while true; do
        # Check if Claude Desktop is running
        if pgrep -x "Claude" > /dev/null; then
            send_to_dashboard "system" "process" "{
                \"app\": \"Claude Desktop\",
                \"status\": \"running\",
                \"pid\": $(pgrep -x "Claude")
            }"
        fi
        
        # Check if claude CLI is running
        if pgrep -f "claude" > /dev/null; then
            send_to_dashboard "system" "process" "{
                \"app\": \"Claude CLI\",
                \"status\": \"running\",
                \"pid\": $(pgrep -f "claude")
            }"
        fi
        
        sleep 60  # Check every minute
    done
}

# Start all monitors in background
monitor_claude_code &
PID1=$!
monitor_claude_desktop &
PID2=$!
monitor_processes &
PID3=$!

echo "================================================"
echo -e "${GREEN}✅ All monitors started${NC}"
echo "PIDs: Code=$PID1, Desktop=$PID2, Process=$PID3"
echo "Logs: $LOG_FILE"
echo "Dashboard: http://$DASHBOARD_HOST:$DASHBOARD_PORT"
echo "================================================"
echo "Press Ctrl+C to stop all monitors"

# Cleanup on exit
trap "kill $PID1 $PID2 $PID3 2>/dev/null; echo 'Monitors stopped'" EXIT

# Keep script running
wait
```

### Installation Steps
```bash
# 1. Create monitors directory
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/Claude\ Code\ Optimizer/monitors

# 2. Copy script
cp unified-claude-monitor.sh [above directory]/

# 3. Make executable
chmod +x unified-claude-monitor.sh

# 4. Add to shell profile for easy access
echo 'alias claude-monitor="~/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/Claude\ Code\ Optimizer/monitors/unified-claude-monitor.sh"' >> ~/.zshrc

# 5. Start monitoring
claude-monitor
```

### Pros ✅
- Simple bash script, no dependencies
- Works immediately
- Low resource usage
- Easy to debug
- Can run in background or foreground

### Cons ❌
- Basic activity detection for Desktop (no message content)
- Requires fswatch (install with `brew install fswatch`)
- Manual start (unless using LaunchAgent)

---

## Option 2: Enhanced Python Monitor
*Upgrades your existing `claude-code-session-monitor.py` to handle both sources*

### Overview
- **Complexity**: Medium (2-3 hours to implement)
- **Maintenance**: Moderate
- **Data Quality**: Excellent for CLI, good for Desktop
- **Resource Usage**: Medium

### Implementation

#### File: `enhanced-claude-monitor.py`
```python
#!/usr/bin/env python3
"""
Enhanced Claude Monitor - Tracks both CLI and Desktop
Upgrades existing claude-code-session-monitor.py
"""

import os
import json
import time
import sqlite3
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import websocket

class UnifiedClaudeMonitor:
    def __init__(self, dashboard_url="ws://localhost:3001"):
        self.dashboard_url = dashboard_url
        self.ws = None
        
        # Paths
        self.claude_code_path = Path.home() / ".claude" / "projects"
        self.claude_desktop_path = Path.home() / "Library" / "Application Support" / "Claude"
        
        # Metrics
        self.metrics = {
            'claude_code': {
                'sessions': 0,
                'messages': 0,
                'tokens': 0
            },
            'claude_desktop': {
                'sessions': 0,
                'activity_count': 0,
                'last_activity': None
            }
        }
        
        # Active monitors
        self.active_tails = {}
        self.observers = []
    
    def start(self):
        """Start all monitoring threads"""
        print("🚀 Starting Enhanced Claude Monitor")
        
        # Connect to dashboard
        self.connect_dashboard()
        
        # Start monitors in threads
        threads = [
            threading.Thread(target=self.monitor_claude_code, daemon=True),
            threading.Thread(target=self.monitor_claude_desktop, daemon=True),
            threading.Thread(target=self.send_metrics_loop, daemon=True)
        ]
        
        for thread in threads:
            thread.start()
        
        print("✅ All monitors started")
        
        # Keep main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.cleanup()
    
    def monitor_claude_code(self):
        """Monitor Claude Code JSONL files"""
        class JSONLHandler(FileSystemEventHandler):
            def __init__(self, parent):
                self.parent = parent
            
            def on_created(self, event):
                if event.src_path.endswith('.jsonl'):
                    self.parent.tail_jsonl_file(event.src_path)
            
            def on_modified(self, event):
                if event.src_path.endswith('.jsonl'):
                    self.parent.process_jsonl_update(event.src_path)
        
        observer = Observer()
        observer.schedule(JSONLHandler(self), str(self.claude_code_path), recursive=True)
        observer.start()
        self.observers.append(observer)
        
        # Process existing files
        for jsonl_file in self.claude_code_path.rglob("*.jsonl"):
            self.tail_jsonl_file(str(jsonl_file))
    
    def monitor_claude_desktop(self):
        """Monitor Claude Desktop activity"""
        class DesktopHandler(FileSystemEventHandler):
            def __init__(self, parent):
                self.parent = parent
                self.last_event = {}
            
            def on_modified(self, event):
                # Debounce events (only report once per second per file)
                now = time.time()
                if event.src_path in self.last_event:
                    if now - self.last_event[event.src_path] < 1:
                        return
                
                self.last_event[event.src_path] = now
                
                if any(event.src_path.endswith(ext) for ext in ['.ldb', '.log']):
                    self.parent.process_desktop_activity(event.src_path)
        
        paths_to_watch = [
            self.claude_desktop_path / "IndexedDB",
            self.claude_desktop_path / "Local Storage",
            self.claude_desktop_path / "Session Storage"
        ]
        
        for path in paths_to_watch:
            if path.exists():
                observer = Observer()
                observer.schedule(DesktopHandler(self), str(path), recursive=True)
                observer.start()
                self.observers.append(observer)
    
    def tail_jsonl_file(self, filepath):
        """Tail a JSONL file for new messages"""
        if filepath in self.active_tails:
            return
        
        session_id = Path(filepath).stem
        self.active_tails[filepath] = {
            'session_id': session_id,
            'position': 0
        }
        
        print(f"📝 Monitoring Claude Code session: {session_id}")
        self.metrics['claude_code']['sessions'] += 1
    
    def process_jsonl_update(self, filepath):
        """Process new lines in JSONL file"""
        if filepath not in self.active_tails:
            self.tail_jsonl_file(filepath)
            return
        
        try:
            with open(filepath, 'r') as f:
                f.seek(self.active_tails[filepath]['position'])
                new_lines = f.readlines()
                self.active_tails[filepath]['position'] = f.tell()
            
            for line in new_lines:
                if line.strip():
                    data = json.loads(line)
                    self.process_claude_code_message(data)
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
    
    def process_claude_code_message(self, data):
        """Process a Claude Code message"""
        self.metrics['claude_code']['messages'] += 1
        
        # Extract token usage if available
        if 'message' in data and 'usage' in data.get('message', {}):
            usage = data['message']['usage']
            self.metrics['claude_code']['tokens'] += (
                usage.get('input_tokens', 0) + 
                usage.get('output_tokens', 0)
            )
        
        # Send to dashboard
        self.send_to_dashboard('claude_code', 'message', data)
    
    def process_desktop_activity(self, filepath):
        """Process Claude Desktop activity"""
        self.metrics['claude_desktop']['activity_count'] += 1
        self.metrics['claude_desktop']['last_activity'] = datetime.now().isoformat()
        
        file_stat = os.stat(filepath)
        activity_data = {
            'file': os.path.basename(filepath),
            'size': file_stat.st_size,
            'modified': datetime.fromtimestamp(file_stat.st_mtime).isoformat()
        }
        
        print(f"🖥️  Claude Desktop activity: {activity_data['file']}")
        self.send_to_dashboard('claude_desktop', 'activity', activity_data)
    
    def send_to_dashboard(self, source, event_type, data):
        """Send data to dashboard via WebSocket"""
        if self.ws and self.ws.connected:
            message = {
                'source': source,
                'type': event_type,
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            try:
                self.ws.send(json.dumps(message))
            except Exception as e:
                print(f"Failed to send to dashboard: {e}")
                self.connect_dashboard()
    
    def connect_dashboard(self):
        """Connect to dashboard WebSocket"""
        try:
            self.ws = websocket.WebSocket()
            self.ws.connect(self.dashboard_url)
            print(f"✅ Connected to dashboard at {self.dashboard_url}")
        except Exception as e:
            print(f"❌ Dashboard connection failed: {e}")
            self.ws = None
    
    def send_metrics_loop(self):
        """Send metrics every 10 seconds"""
        while True:
            time.sleep(10)
            self.send_to_dashboard('system', 'metrics', self.metrics)
            print(f"📊 Metrics: Code={self.metrics['claude_code']['messages']} msgs, "
                  f"Desktop={self.metrics['claude_desktop']['activity_count']} activities")
    
    def cleanup(self):
        """Cleanup on exit"""
        print("\n🛑 Stopping monitors...")
        for observer in self.observers:
            observer.stop()
            observer.join()
        if self.ws:
            self.ws.close()
        print("✅ Monitors stopped")

if __name__ == "__main__":
    monitor = UnifiedClaudeMonitor()
    monitor.start()
```

### Installation Steps
```bash
# 1. Install dependencies
pip install watchdog websocket-client

# 2. Copy to project
cp enhanced-claude-monitor.py [your project]/monitors/

# 3. Run
python3 enhanced-claude-monitor.py
```

### Pros ✅
- Builds on existing Python infrastructure
- Better error handling
- Structured data collection
- Database storage option available
- WebSocket connection management

### Cons ❌
- More complex than bash script
- Requires Python dependencies
- Higher memory usage
- More code to maintain

---

## Option 3: Lightweight Activity Watcher
*Minimal approach - just adds Desktop activity detection to existing setup*

### Overview
- **Complexity**: Very Low (10 minutes)
- **Maintenance**: None
- **Data Quality**: Basic activity only
- **Resource Usage**: Minimal

### Implementation

#### File: `claude-desktop-watcher.sh`
```bash
#!/bin/bash
# Lightweight Claude Desktop Activity Watcher
# Adds to existing monitoring without changes

DESKTOP_DIR="$HOME/Library/Application Support/Claude"
WEBHOOK="http://localhost:3001/api/desktop-activity"

echo "👀 Watching Claude Desktop for activity..."

# Just watch and ping
fswatch "$DESKTOP_DIR/IndexedDB" | while read event; do
    # Simple POST with timestamp
    curl -s -X POST "$WEBHOOK" \
         -H "Content-Type: application/json" \
         -d "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"active\": true}" &
    
    echo "✓ Activity at $(date '+%H:%M:%S')"
done
```

### Installation Steps
```bash
# 1. Save script
echo '[script content]' > ~/desktop-watcher.sh

# 2. Make executable
chmod +x ~/desktop-watcher.sh

# 3. Run alongside existing monitor
./desktop-watcher.sh &
```

### Pros ✅
- Dead simple
- No changes to existing code
- Can run independently
- 5 minute setup

### Cons ❌
- Very basic data (just timestamps)
- No integration with existing metrics
- Separate process to manage

---

## 📋 Decision Matrix

| Aspect | Option 1 (Unified Bash) | Option 2 (Enhanced Python) | Option 3 (Lightweight) |
|--------|-------------------------|---------------------------|----------------------|
| **Setup Time** | 30 minutes | 2-3 hours | 10 minutes |
| **Complexity** | Low | Medium | Very Low |
| **Data Quality** | Good | Excellent | Basic |
| **Maintenance** | Low | Medium | None |
| **Resource Usage** | Very Low | Medium | Minimal |
| **Integration** | New system | Enhances existing | Add-on |
| **Best For** | Starting fresh | Long-term solution | Quick fix |

---

## 🚀 Next Steps for Option 1 (Selected)

1. **Create the script** in your monitors folder
2. **Install fswatch**: `brew install fswatch`
3. **Test locally**: Run script and verify output
4. **Connect to dashboard**: Update dashboard endpoint
5. **Add auto-start**: Create LaunchAgent for boot startup
6. **Monitor performance**: Check CPU/memory usage

### Quick Start Commands
```bash
# One-line setup
cd "/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer" && \
mkdir -p monitors && \
curl -o monitors/unified-claude-monitor.sh [script-url] && \
chmod +x monitors/unified-claude-monitor.sh && \
./monitors/unified-claude-monitor.sh
```

---

## 📝 Notes

- **Option 1** is recommended for immediate implementation
- **Option 2** can be phase 2 after validating approach
- **Option 3** is backup if you just need something working NOW
- All options can coexist if needed

Ready to implement Option 1? The script is ready to copy and run!