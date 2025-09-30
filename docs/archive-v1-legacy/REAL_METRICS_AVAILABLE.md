# 📊 REAL Claude Code Metrics Available

Based on analysis of actual JSONL files in your ~/.claude/projects/ directory.

## Session Identification
- `sessionId` - UUID like "e52c7c95-5e37-4e7b-b06a-d353c38c8040"
- `cwd` - Working directory where session ran
- `version` - Claude Code version (e.g., "1.0.69")
- `timestamp` - ISO timestamp for each message

## Real-time Usage Metrics
From `message.usage` in assistant responses:
- `input_tokens` - Direct input tokens
- `cache_creation_input_tokens` - New cache creation
- `cache_read_input_tokens` - Cache hits (HUGE cost savings!)
- `output_tokens` - Generated tokens
- `service_tier` - "standard" or other tiers

## Message Types for Counting
- `type: "user"` - User prompts
- `type: "assistant"` - Claude responses  
- `message.content[].type: "tool_use"` - Tool executions
- `tool_use_id` - Track individual tool calls

## Session Timeline
- First message timestamp = session start
- Last message timestamp = session end (if no recent activity)
- `parentUuid` - Links messages in conversation chain
- File modification time = activity detection

## Model Information
- `message.model` - "claude-sonnet-4-20250514"
- `requestId` - Individual API request tracking

## Dashboard Implementation
```python
# CORRECT detection method
def is_session_active(jsonl_file):
    return (time.time() - jsonl_file.stat().st_mtime) < 30

def get_session_metrics(jsonl_file):
    total_input_tokens = 0
    total_cache_tokens = 0
    total_output_tokens = 0
    
    with open(jsonl_file) as f:
        for line in f:
            msg = json.loads(line)
            if msg.get("type") == "assistant":
                usage = msg.get("message", {}).get("usage", {})
                total_input_tokens += usage.get("input_tokens", 0)
                total_cache_tokens += usage.get("cache_read_input_tokens", 0)
                total_output_tokens += usage.get("output_tokens", 0)
    
    return {
        "input_tokens": total_input_tokens,
        "cache_tokens": total_cache_tokens,
        "output_tokens": total_output_tokens
    }
```

## Dashboard Status Logic
```python
# For "LIVE SESSION ACTIVE" display:
active_sessions = []
for project_dir in Path("~/.claude/projects").iterdir():
    for jsonl_file in project_dir.glob("*.jsonl"):
        if (time.time() - jsonl_file.stat().st_mtime) < 30:
            active_sessions.append({
                "session_id": jsonl_file.stem[:8],
                "last_activity": jsonl_file.stat().st_mtime,
                "metrics": get_session_metrics(jsonl_file)
            })

status = "🔴 LIVE SESSION ACTIVE" if active_sessions else "⚫ No Active Sessions"
```
