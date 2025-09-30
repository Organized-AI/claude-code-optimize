# 🔧 CORRECTED Claude Code Session Detection

## ❌ What I Got Wrong Initially

My initial implementation tried to:
- Wrap the `claude-code` CLI with `--json-log`
- Parse stdout for session metrics
- Detect sessions by monitoring CLI process

## ✅ How Claude Code ACTUALLY Works

Based on research of tools like `ccusage` and `claude-code-log`:

### Session Storage
- Sessions stored in `~/.claude/projects/[project-hash]/[session-id].jsonl`
- Each line = one JSON message/event
- File continuously appended during session

### Active Session Detection
```python
def is_session_active(jsonl_file):
    # Check if file modified in last 30 seconds
    last_modified = jsonl_file.stat().st_mtime
    return (time.time() - last_modified) < 30
```

### Real-time Metrics
```python
# Parse JSONL file for current metrics
with open(jsonl_file, 'r') as f:
    for line in f:
        message = json.loads(line.strip())
        
        # Extract token usage
        if "usage" in message:
            tokens = message["usage"]["input_tokens"]
            
        # Extract cost
        if "total_cost_usd" in message:
            cost = message["total_cost_usd"]
```

### Session Completion
- File stops being modified for 30+ seconds
- Use watchdog to monitor file system events
- Parse final messages for session summary

## 🚀 Corrected Implementation

Replace the previous `session_monitor.py` with the corrected JSONL-based monitor that:

1. **Monitors `~/.claude/projects/` directory** using filesystem events
2. **Detects new sessions** when `.jsonl` files are created  
3. **Tracks real-time updates** as files are modified
4. **Detects completion** when files stop being modified
5. **Extracts accurate metrics** from actual Claude Code JSONL format

## 📊 REAL Available Metrics

From research of existing tools:

### Session Identification
- `session_id` - Unique identifier
- `project_hash` - Project directory hash
- `working_directory` - Where session ran

### Usage Metrics  
- `total_input_tokens` - Input tokens consumed
- `total_output_tokens` - Output tokens generated
- `message_count` - Total conversation messages
- `tool_use_count` - Number of tool executions

### Cost Tracking
- `total_cost_usd` - Cumulative cost in USD
- `model_used` - Claude model (sonnet, opus, haiku)

### Timeline
- `session_start_time` - When session began
- `last_message_time` - Most recent activity
- Session active = file modified < 30 seconds ago

## 🔄 Dashboard Integration

The corrected monitor:
- ✅ Detects sessions when JSONL files are created/modified
- ✅ Updates dashboard in real-time as metrics change  
- ✅ Accurately detects session completion
- ✅ Uses actual Claude Code data format
- ✅ Compatible with existing tools like ccusage

This replaces the incorrect CLI wrapper approach!
