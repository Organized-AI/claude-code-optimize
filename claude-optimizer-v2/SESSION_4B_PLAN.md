# Session 4B Plan: macOS Automation Infrastructure

**Date**: 2025-10-01
**Status**: PLANNING
**Dependency**: Session 4A (Foundation) - Scheduler core & handoff system
**Platform**: macOS 15.6+ (Sequoia compatible)
**Target**: Automated session launching with launchd, AppleScript, and native notifications

---

## 🎯 Mission Statement

Build the macOS-specific automation layer that enables Claude Code sessions to launch automatically at scheduled times with full context, quota verification, and graceful error handling.

---

## 📋 Table of Contents

1. [Component Architecture](#component-architecture)
2. [File Structure](#file-structure)
3. [Implementation Phases](#implementation-phases)
4. [Token Estimates](#token-estimates)
5. [Security Considerations](#security-considerations)
6. [Testing Strategy](#testing-strategy)
7. [Risk Assessment](#risk-assessment)
8. [Fallback Mechanisms](#fallback-mechanisms)
9. [Dependencies](#dependencies)
10. [Success Criteria](#success-criteria)

---

## Component Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Session 4A Foundation                       │
│  • Scheduler Core (scheduling logic, handoff mgmt)          │
│  • Handoff System (context preservation)                    │
│  • QuotaTracker Integration (check-quota function)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               Session 4B: macOS Automation                   │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  1. launchd Integration (Scheduler)            │        │
│  │  • Create LaunchAgent plist                    │        │
│  │  • Load/unload jobs via launchctl              │        │
│  │  • Schedule sessions at specific times         │        │
│  └───────────────┬────────────────────────────────┘        │
│                  │                                           │
│                  ↓                                           │
│  ┌────────────────────────────────────────────────┐        │
│  │  2. Launch Script (launch-session.sh)          │        │
│  │  • Verify quota has reset                      │        │
│  │  • Load handoff context                        │        │
│  │  • Detect terminal (iTerm2 or Terminal.app)    │        │
│  │  • Execute AppleScript automation              │        │
│  └───────────────┬────────────────────────────────┘        │
│                  │                                           │
│                  ↓                                           │
│  ┌────────────────────────────────────────────────┐        │
│  │  3. AppleScript Automation                     │        │
│  │  • iTerm2 automation (preferred)               │        │
│  │  • Terminal.app fallback                       │        │
│  │  • Open new window/tab                         │        │
│  │  • Execute Claude Code with context            │        │
│  └───────────────┬────────────────────────────────┘        │
│                  │                                           │
│                  ↓                                           │
│  ┌────────────────────────────────────────────────┐        │
│  │  4. macOS Notification System                  │        │
│  │  • Pre-session alerts (5 mins before)          │        │
│  │  • Session start confirmation                  │        │
│  │  • Error notifications (quota not ready)       │        │
│  │  • Reschedule notifications                    │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. **launchd Integration** (`~/.claude/automation/schedule-session.sh`)

**Purpose**: Create and manage launchd jobs for time-based session scheduling.

**Responsibilities**:
- Generate LaunchAgent plist files dynamically
- Schedule sessions at specific times (e.g., 6:00 PM)
- Support one-time and recurring schedules
- Handle job loading/unloading
- Manage multiple scheduled sessions
- Clean up completed jobs

**Key Features**:
- Dynamic plist generation based on session parameters
- Unique job labels (com.claude.auto-session.{sessionId})
- StartCalendarInterval for time-based scheduling
- RunAtLoad=false for scheduled-only execution
- Graceful error handling if launchctl fails

**Input Parameters**:
```bash
schedule-session.sh \
  --handoff-file <path> \
  --agent-file <path> \
  --project-path <path> \
  --launch-time "HH:MM" \
  --session-id <id>
```

**Output**:
- LaunchAgent plist at `~/Library/LaunchAgents/com.claude.auto-session.{sessionId}.plist`
- Job loaded in launchd
- Pre-session notification scheduled
- Confirmation message

---

#### 2. **Launch Script** (`~/.claude/automation/launch-session.sh`)

**Purpose**: Execute the actual session launch with pre-flight checks and context loading.

**Responsibilities**:
- Verify quota has reset (call QuotaTracker)
- Load handoff context from markdown
- Detect available terminal application
- Build session prompt with context
- Execute AppleScript automation
- Send launch notification
- Log session start
- Handle errors gracefully

**Pre-flight Checks**:
1. **Quota Verification**:
   - Call `~/.claude/bin/check-quota.sh` (from Session 4A)
   - If quota < 30k remaining → reschedule +30 mins
   - Send notification about delay

2. **File Existence**:
   - Verify handoff file exists
   - Verify agent file exists
   - Verify project path exists

3. **Terminal Detection**:
   - Check if iTerm2 is installed and running
   - Fall back to Terminal.app if not
   - Verify terminal is not in fullscreen (optional)

**Error Handling**:
- Quota not ready → Reschedule session (+30 mins)
- Handoff file missing → Notify user, abort
- Agent file missing → Notify user, abort
- Terminal not available → Retry with fallback
- AppleScript error → Log and notify

**Logging**:
- All launches logged to `~/.claude/automation/session-log.txt`
- Include: timestamp, session ID, agent, status, errors

---

#### 3. **AppleScript Automation**

**Purpose**: Programmatically control terminal applications to launch Claude Code.

**iTerm2 Automation** (Preferred):
```applescript
tell application "iTerm"
    activate

    -- Option A: New window
    create window with default profile
    tell current session of current window
        write text "cd '/path/to/project'"
        write text "echo 'Starting Claude Code session...'"
        write text "cat /path/to/handoff.md | claude --agent /path/to/agent.md"
    end tell

    -- Option B: New tab in current window
    tell current window
        create tab with default profile
        tell current session
            write text "cd '/path/to/project'"
            write text "cat /path/to/handoff.md | claude --agent /path/to/agent.md"
        end tell
    end tell
end tell
```

**Terminal.app Fallback**:
```applescript
tell application "Terminal"
    activate

    -- New window
    do script "cd '/path/to/project' && cat /path/to/handoff.md | claude --agent /path/to/agent.md"

    -- Or new tab (macOS 10.15+)
    tell window 1
        do script "cd '/path/to/project' && cat /path/to/handoff.md | claude --agent /path/to/agent.md" in selected tab
    end tell
end tell
```

**Detection Logic**:
```bash
# Detect iTerm2
if [[ -d "/Applications/iTerm.app" ]] && pgrep -x "iTerm2" > /dev/null; then
    TERMINAL="iterm"
elif [[ -d "/Applications/Utilities/Terminal.app" ]]; then
    TERMINAL="terminal"
else
    echo "ERROR: No terminal application found"
    exit 1
fi
```

**Special Considerations**:
- **Path Escaping**: Single quotes for paths with spaces
- **Multi-line Commands**: Use `&&` to chain commands
- **Environment Variables**: May need to source `.zshrc` or `.bashrc`
- **Activation**: Ensure terminal comes to front (bring to front)
- **Focus Management**: Handle fullscreen mode gracefully

---

#### 4. **macOS Notification System**

**Purpose**: Provide visual/audio feedback at key automation points.

**Notification Types**:

1. **Pre-Session Alert** (5 mins before launch):
```bash
osascript -e 'display notification "Claude Code session starts in 5 minutes. Prepare to switch." with title "🤖 Session Starting Soon" subtitle "Session: Implementation Phase 2" sound name "Ping"'
```

2. **Launch Confirmation**:
```bash
osascript -e 'display notification "Session started! Check your terminal." with title "🚀 Claude Code Launched" subtitle "Agent: implementation-agent.md" sound name "Glass"'
```

3. **Quota Not Ready**:
```bash
osascript -e 'display notification "Quota not ready. Rescheduling for 30 minutes." with title "⏰ Session Delayed" subtitle "Current quota: 15k remaining" sound name "Basso"'
```

4. **Error Notification**:
```bash
osascript -e 'display notification "Failed to launch session. Check logs." with title "❌ Launch Failed" subtitle "Error: Handoff file not found" sound name "Basso"'
```

5. **Cancellation**:
```bash
osascript -e 'display notification "Scheduled session cancelled." with title "🛑 Session Cancelled" subtitle "Session ID: abc123" sound name "Purr"'
```

**Sound Options**:
- `Ping` - Normal alerts
- `Glass` - Success
- `Basso` - Errors/warnings
- `Purr` - Info
- `Tink` - Completion

**Notification Features**:
- **Title**: Bold main message
- **Subtitle**: Secondary context
- **Body**: Detailed message
- **Sound**: Audio feedback
- **Duration**: System default (5 seconds)

**Notification Center Integration**:
- Notifications appear in Notification Center
- Can be clicked to reveal details
- Notifications persist until dismissed
- Optional: Add action buttons (macOS 10.14+)

---

## File Structure

### Directory Layout

```
~/.claude/
├── automation/                          # Automation scripts (NEW)
│   ├── schedule-session.sh              # launchd plist creator & job loader
│   ├── launch-session.sh                # Pre-flight checks & AppleScript execution
│   ├── cancel-session.sh                # Cancel scheduled session
│   ├── list-scheduled.sh                # List all scheduled sessions
│   ├── check-quota.sh                   # Quota verification wrapper
│   ├── applescripts/                    # AppleScript templates
│   │   ├── launch-iterm.scpt            # iTerm2 launch script
│   │   ├── launch-terminal.scpt         # Terminal.app launch script
│   │   └── detect-terminal.sh           # Terminal detection helper
│   ├── notifications/                   # Notification helpers
│   │   ├── send-notification.sh         # Generic notification sender
│   │   └── notification-templates.json  # Predefined notification messages
│   └── logs/                            # Automation logs
│       ├── session-launches.log         # Launch history
│       ├── errors.log                   # Error log
│       └── reschedules.log              # Reschedule history
│
├── session-handoffs/                    # From Session 4A
│   ├── handoff-{sessionId}.md           # Session handoff files
│   └── active-handoff.md                # Symlink to current handoff
│
├── bin/                                 # Utility scripts
│   └── check-quota.sh                   # From Session 4A - Quota checker
│
└── quota-tracker.json                   # From existing QuotaTracker

~/Library/LaunchAgents/
├── com.claude.auto-session.{sessionId}.plist   # One-time session launch
└── com.claude.session-monitor.plist            # (Optional) Monitor daemon
```

### Script Details

#### `schedule-session.sh`
**Lines**: ~150
**Purpose**: Create launchd job for scheduled session launch
**Dependencies**: launchctl, osascript, jq (optional)
**Inputs**: handoff file, agent file, project path, launch time, session ID
**Outputs**: plist file, loaded launchd job, pre-session notification scheduled

#### `launch-session.sh`
**Lines**: ~200
**Purpose**: Execute session launch with checks
**Dependencies**: osascript, check-quota.sh, quota-tracker.ts
**Inputs**: handoff file, agent file, project path
**Outputs**: Claude Code session started, notifications sent, launch logged

#### `cancel-session.sh`
**Lines**: ~80
**Purpose**: Cancel scheduled session
**Dependencies**: launchctl
**Inputs**: session ID
**Outputs**: Job unloaded, plist deleted, notification sent

#### `list-scheduled.sh`
**Lines**: ~60
**Purpose**: List all scheduled sessions
**Dependencies**: launchctl, jq (optional)
**Outputs**: Formatted list of scheduled sessions with times

#### `check-quota.sh`
**Lines**: ~100
**Purpose**: Wrapper for QuotaTracker verification
**Dependencies**: node, quota-tracker.ts
**Outputs**: READY | NOT_READY | quota status JSON

#### `applescripts/launch-iterm.scpt`
**Lines**: ~50
**Purpose**: iTerm2 automation script
**Inputs**: project path, command to execute

#### `applescripts/launch-terminal.scpt`
**Lines**: ~40
**Purpose**: Terminal.app automation script
**Inputs**: project path, command to execute

#### `applescripts/detect-terminal.sh`
**Lines**: ~40
**Purpose**: Detect available terminal and return type
**Outputs**: iterm | terminal | none

#### `notifications/send-notification.sh`
**Lines**: ~80
**Purpose**: Send macOS notification with template support
**Inputs**: template name OR title/message/sound
**Dependencies**: osascript

---

## Implementation Phases

### Phase 1: Core Launch Infrastructure (Priority: HIGH)
**Estimated Tokens**: 25,000 (15-20 tool calls)
**Duration**: 45 minutes

**Components**:
1. Create `launch-session.sh`:
   - Pre-flight quota check
   - Load handoff context
   - Terminal detection
   - AppleScript execution
   - Error handling
   - Logging

2. Create AppleScript templates:
   - `launch-iterm.scpt`
   - `launch-terminal.scpt`
   - `detect-terminal.sh`

3. Create `check-quota.sh`:
   - Wrapper for QuotaTracker.canStartSession()
   - Return READY/NOT_READY status
   - Output quota details

**Testing**:
- Manual launch script execution
- Quota check verification
- Terminal detection with iTerm2/Terminal.app
- AppleScript execution with both terminals

**Deliverables**:
- ✅ `launch-session.sh` (working)
- ✅ `check-quota.sh` (working)
- ✅ `launch-iterm.scpt` (tested)
- ✅ `launch-terminal.scpt` (tested)
- ✅ `detect-terminal.sh` (working)

**Risks**:
- AppleScript permissions may require user approval
- Terminal automation may fail in fullscreen mode
- Environment variables may not load correctly

---

### Phase 2: launchd Scheduler (Priority: HIGH)
**Estimated Tokens**: 20,000 (12-15 tool calls)
**Duration**: 35 minutes

**Components**:
1. Create `schedule-session.sh`:
   - Generate LaunchAgent plist dynamically
   - Load job via launchctl
   - Schedule pre-session notification
   - Validate inputs
   - Error handling

2. Create plist template:
   - Dynamic values (time, paths, session ID)
   - Proper XML formatting
   - StartCalendarInterval configuration
   - RunAtLoad=false

3. Create `cancel-session.sh`:
   - Unload launchd job
   - Remove plist file
   - Send cancellation notification

4. Create `list-scheduled.sh`:
   - Query launchctl for claude jobs
   - Parse and format output
   - Show next run times

**Testing**:
- Schedule a test session (5 mins in future)
- Verify plist creation
- Verify launchctl load
- Wait for execution and verify launch
- Test cancellation
- Test listing scheduled sessions

**Deliverables**:
- ✅ `schedule-session.sh` (working)
- ✅ `cancel-session.sh` (working)
- ✅ `list-scheduled.sh` (working)
- ✅ LaunchAgent plist template
- ✅ Integration test passed

**Risks**:
- launchd permissions on macOS Sequoia (15.6)
- Plist validation errors
- Job may not fire at exact time (1-2 min variance)
- Multiple jobs may conflict

---

### Phase 3: Notification System (Priority: MEDIUM)
**Estimated Tokens**: 12,000 (8-10 tool calls)
**Duration**: 25 minutes

**Components**:
1. Create `send-notification.sh`:
   - Generic notification sender
   - Support for title, subtitle, message, sound
   - Template support (load from JSON)
   - Logging

2. Create `notification-templates.json`:
   - Pre-session alert
   - Launch confirmation
   - Quota not ready
   - Error notification
   - Cancellation

3. Integrate notifications:
   - Add to `schedule-session.sh` (pre-session alert)
   - Add to `launch-session.sh` (launch/error)
   - Add to `cancel-session.sh` (cancellation)

**Testing**:
- Test each notification type
- Verify sound playback
- Check Notification Center persistence
- Test template loading

**Deliverables**:
- ✅ `send-notification.sh` (working)
- ✅ `notification-templates.json`
- ✅ All scripts integrated with notifications
- ✅ Notification test suite passed

**Risks**:
- Notifications may be suppressed in Do Not Disturb
- Sound may not play if volume muted
- User may disable notifications for Terminal

---

### Phase 4: Quota Integration & Rescheduling (Priority: HIGH)
**Estimated Tokens**: 18,000 (10-12 tool calls)
**Duration**: 35 minutes

**Components**:
1. Enhance `launch-session.sh`:
   - Check quota before launch
   - If not ready, reschedule +30 mins
   - Call `schedule-session.sh` for rescheduling
   - Send delay notification
   - Log reschedule

2. Create `reschedule-session.sh`:
   - Cancel current job
   - Calculate new time (+30 mins or custom)
   - Schedule new job
   - Preserve handoff context
   - Notify user

3. Add quota status to notifications:
   - Include remaining tokens in messages
   - Show reset time in delay notifications

**Testing**:
- Simulate low quota scenario
- Verify rescheduling logic
- Test multiple reschedules
- Verify notification content
- Check logs

**Deliverables**:
- ✅ Enhanced `launch-session.sh` with rescheduling
- ✅ `reschedule-session.sh` (working)
- ✅ Quota-aware notifications
- ✅ Reschedule logs
- ✅ Integration test passed

**Risks**:
- Infinite reschedule loop if quota never resets
- Race condition if multiple sessions scheduled
- Reschedule may conflict with existing jobs

---

### Phase 5: Error Handling & Logging (Priority: MEDIUM)
**Estimated Tokens**: 15,000 (8-10 tool calls)
**Duration**: 30 minutes

**Components**:
1. Centralized error handling:
   - Common error functions
   - Exit codes for each error type
   - Error notification helper

2. Comprehensive logging:
   - `session-launches.log` - All launches (success/fail)
   - `errors.log` - Error details with stack traces
   - `reschedules.log` - Reschedule history
   - Log rotation (keep last 100 entries)

3. Debugging utilities:
   - `debug-mode.sh` - Enable verbose logging
   - Log viewer script
   - Log analysis script (stats, common errors)

**Testing**:
- Trigger each error scenario
- Verify error logging
- Check log rotation
- Test debug mode

**Deliverables**:
- ✅ Error handling functions
- ✅ Logging infrastructure
- ✅ Log rotation
- ✅ Debug mode
- ✅ Error scenarios tested

**Risks**:
- Logs may grow too large if not rotated
- Sensitive data (paths) may be logged
- Debug mode may impact performance

---

### Phase 6: Documentation & Testing (Priority: MEDIUM)
**Estimated Tokens**: 10,000 (5-7 tool calls)
**Duration**: 20 minutes

**Components**:
1. User documentation:
   - README for automation system
   - Usage examples
   - Troubleshooting guide
   - FAQ

2. Developer documentation:
   - Architecture overview
   - Script documentation
   - Extension points
   - API reference

3. Integration tests:
   - End-to-end test script
   - Test each component
   - Test error scenarios
   - Performance tests

**Testing**:
- Run full integration test
- Verify documentation accuracy
- Test all examples

**Deliverables**:
- ✅ `automation/README.md`
- ✅ `automation/TROUBLESHOOTING.md`
- ✅ Integration test suite
- ✅ All tests passing

---

## Token Estimates

### Phase-by-Phase Breakdown

| Phase | Components | Estimated Tokens | Tool Calls | Duration |
|-------|-----------|------------------|------------|----------|
| **Phase 1** | Launch infrastructure, AppleScript, quota check | 25,000 | 15-20 | 45 min |
| **Phase 2** | launchd scheduler, plist, cancel, list | 20,000 | 12-15 | 35 min |
| **Phase 3** | Notification system, templates, integration | 12,000 | 8-10 | 25 min |
| **Phase 4** | Quota integration, rescheduling | 18,000 | 10-12 | 35 min |
| **Phase 5** | Error handling, logging, debugging | 15,000 | 8-10 | 30 min |
| **Phase 6** | Documentation, testing | 10,000 | 5-7 | 20 min |
| **TOTAL** | **Session 4B Complete** | **100,000** | **58-74** | **~3 hours** |

### Token Usage Assumptions

**Per Tool Call**: ~1,000-2,000 tokens average
- Read operations: 800-1,500 tokens
- Write operations: 1,200-2,500 tokens
- Edit operations: 1,000-2,000 tokens
- Bash commands: 500-1,000 tokens

**Efficiency Factors**:
- Batching tool calls: 10% savings
- Caching previous reads: 15% savings
- Clear requirements: 20% savings

**Contingency**: +20% buffer for unexpected complexity (20,000 tokens)

**Total with Contingency**: **120,000 tokens**

### Session Planning

**Recommended Approach**:
- **Session 4B-1**: Phases 1-2 (45k tokens, 90 mins)
- **Session 4B-2**: Phases 3-4 (30k tokens, 60 mins)
- **Session 4B-3**: Phases 5-6 (25k tokens, 50 mins)

**Alternative (Aggressive)**:
- **Single Session**: All phases (120k tokens, 3 hours) - Only if quota > 150k available

---

## Security Considerations

### 1. File Permissions

**Automation Scripts**:
```bash
chmod 700 ~/.claude/automation/*.sh        # Owner execute only
chmod 600 ~/.claude/automation/logs/*.log  # Owner read/write only
```

**LaunchAgent Plists**:
```bash
chmod 644 ~/Library/LaunchAgents/com.claude.*.plist  # Standard LaunchAgent perms
```

**Handoff Files**:
```bash
chmod 600 ~/.claude/session-handoffs/*.md  # Owner read/write only
```

### 2. AppleScript Permissions

**Automation Access**:
- System Preferences → Security & Privacy → Privacy → Automation
- Allow Terminal/iTerm2 to control System Events
- Allow scripts to send notifications

**Full Disk Access** (if needed):
- System Preferences → Security & Privacy → Privacy → Full Disk Access
- Add Terminal.app or iTerm2 if accessing protected directories

**Notification Permissions**:
- System Preferences → Notifications → Terminal/iTerm2
- Ensure "Allow Notifications" is enabled

### 3. launchd Security

**Job Isolation**:
- Each session gets unique job label
- Jobs run as user (not system)
- No elevated privileges required

**plist Validation**:
- Validate XML before loading
- Check for malicious commands
- Sanitize user inputs

**Job Cleanup**:
- Unload jobs after execution
- Remove old plist files
- Prevent job accumulation

### 4. Input Sanitization

**Path Validation**:
```bash
# Validate paths before use
validate_path() {
    local path="$1"
    if [[ ! "$path" =~ ^[a-zA-Z0-9/_. -]+$ ]]; then
        echo "ERROR: Invalid path characters"
        exit 1
    fi
    if [[ ! -e "$path" ]]; then
        echo "ERROR: Path does not exist"
        exit 1
    fi
}
```

**Command Injection Prevention**:
```bash
# Use arrays for commands, not strings
cmd=("cd" "$project_path" "&&" "claude" "--agent" "$agent_file")

# Escape single quotes in paths
escaped_path="${path//\'/\'\\\'\'}"
```

### 5. Sensitive Data

**Logging**:
- Do NOT log handoff content (may contain sensitive code)
- Redact full paths if they contain usernames
- Use relative paths in logs when possible

**Notifications**:
- Do NOT include sensitive project details
- Keep messages generic
- Avoid exposing file paths

**Error Messages**:
- Sanitize error messages before displaying
- Log full details, show sanitized version to user

### 6. macOS Sandboxing

**Sandbox Considerations**:
- LaunchAgents run outside sandbox
- AppleScript may be sandboxed
- Terminal apps have sandbox exceptions

**Workarounds**:
- Use full paths (no relative paths)
- Source environment properly
- Test with sandbox restrictions

---

## Testing Strategy

### Unit Testing

#### 1. Script Unit Tests

**test-launch-session.sh**:
```bash
#!/bin/bash
# Test launch-session.sh in isolation

# Test 1: Quota check
test_quota_check() {
    # Mock quota checker
    echo "READY" > /tmp/quota-result
    result=$(~/.claude/automation/launch-session.sh --check-quota-only)
    assert_equals "$result" "READY"
}

# Test 2: Terminal detection
test_terminal_detection() {
    result=$(~/.claude/automation/applescripts/detect-terminal.sh)
    assert_in "$result" "iterm terminal"
}

# Test 3: Handoff loading
test_handoff_loading() {
    echo "# Test Handoff" > /tmp/test-handoff.md
    result=$(~/.claude/automation/launch-session.sh --load-handoff /tmp/test-handoff.md)
    assert_contains "$result" "Test Handoff"
}

# Run tests
run_tests test_quota_check test_terminal_detection test_handoff_loading
```

**test-schedule-session.sh**:
```bash
#!/bin/bash
# Test schedule-session.sh

# Test 1: Plist generation
test_plist_generation() {
    ~/.claude/automation/schedule-session.sh \
        --handoff-file /tmp/test.md \
        --agent-file /tmp/agent.md \
        --project-path /tmp/project \
        --launch-time "18:00" \
        --session-id test123 \
        --dry-run

    assert_file_exists ~/Library/LaunchAgents/com.claude.auto-session.test123.plist
}

# Test 2: Time parsing
test_time_parsing() {
    result=$(parse_time "18:00")
    assert_equals "$result" "18 0"
}

# Run tests
run_tests test_plist_generation test_time_parsing
```

#### 2. AppleScript Unit Tests

**test-applescript.sh**:
```bash
#!/bin/bash
# Test AppleScript execution

# Test 1: iTerm2 script
test_iterm_launch() {
    osascript ~/.claude/automation/applescripts/launch-iterm.scpt \
        "/tmp/test-project" \
        "echo 'test'"

    # Check if command executed
    sleep 2
    assert_iterm_has_text "test"
}

# Test 2: Terminal.app script
test_terminal_launch() {
    osascript ~/.claude/automation/applescripts/launch-terminal.scpt \
        "/tmp/test-project" \
        "echo 'test'"

    sleep 2
    assert_terminal_has_text "test"
}

# Run tests
run_tests test_iterm_launch test_terminal_launch
```

### Integration Testing

#### End-to-End Test

**test-e2e.sh**:
```bash
#!/bin/bash
# End-to-end automation test

echo "🧪 Starting E2E Automation Test"

# Setup
SESSION_ID="test-$(date +%s)"
HANDOFF_FILE="/tmp/test-handoff-$SESSION_ID.md"
AGENT_FILE="/tmp/test-agent.md"
PROJECT_PATH="/tmp/test-project"

# Create test files
mkdir -p "$PROJECT_PATH"
cat > "$HANDOFF_FILE" <<EOF
# Test Session Handoff
**Session ID**: $SESSION_ID

## Objectives
- Test automation system
- Verify launch
EOF

cat > "$AGENT_FILE" <<EOF
You are a test agent. Verify the automation system is working.
EOF

# Test 1: Schedule session (5 mins in future)
LAUNCH_TIME=$(date -v+5M +"%H:%M")
echo "📅 Scheduling session for $LAUNCH_TIME"

~/.claude/automation/schedule-session.sh \
    --handoff-file "$HANDOFF_FILE" \
    --agent-file "$AGENT_FILE" \
    --project-path "$PROJECT_PATH" \
    --launch-time "$LAUNCH_TIME" \
    --session-id "$SESSION_ID"

assert_success "Schedule failed"

# Test 2: Verify plist created
assert_file_exists ~/Library/LaunchAgents/com.claude.auto-session.$SESSION_ID.plist

# Test 3: Verify job loaded
launchctl list | grep "com.claude.auto-session.$SESSION_ID"
assert_success "Job not loaded"

# Test 4: List scheduled sessions
~/.claude/automation/list-scheduled.sh | grep "$SESSION_ID"
assert_success "Session not in list"

# Test 5: Wait for pre-session notification (at LAUNCH_TIME - 5 mins)
# (Manual verification)

# Test 6: Wait for session launch
echo "⏰ Waiting for session to launch at $LAUNCH_TIME..."
# (Manual verification - check terminal)

# Test 7: Verify launch log
sleep 10
grep "$SESSION_ID" ~/.claude/automation/logs/session-launches.log
assert_success "Launch not logged"

# Test 8: Cancel (if still scheduled)
~/.claude/automation/cancel-session.sh --session-id "$SESSION_ID"
assert_success "Cancel failed"

# Cleanup
rm -f "$HANDOFF_FILE" "$AGENT_FILE"
rm -rf "$PROJECT_PATH"

echo "✅ E2E Test Complete"
```

### Manual Testing Checklist

#### Pre-Launch Tests
- [ ] `check-quota.sh` returns correct status
- [ ] `detect-terminal.sh` detects iTerm2/Terminal.app
- [ ] Handoff file loads correctly
- [ ] Agent file exists and is valid
- [ ] Project path is valid directory

#### Scheduling Tests
- [ ] `schedule-session.sh` creates plist
- [ ] Plist has correct time (StartCalendarInterval)
- [ ] launchctl loads job successfully
- [ ] `list-scheduled.sh` shows scheduled session
- [ ] Pre-session notification scheduled

#### Launch Tests
- [ ] Pre-session notification fires 5 mins before
- [ ] Quota check passes at launch time
- [ ] Terminal opens automatically
- [ ] New window/tab created
- [ ] `cd` to project directory succeeds
- [ ] Claude Code launches with agent
- [ ] Handoff context loaded in prompt
- [ ] Launch notification fires
- [ ] Launch logged to session-launches.log

#### Error Scenario Tests
- [ ] Quota not ready → reschedule notification
- [ ] Handoff file missing → error notification
- [ ] Agent file missing → error notification
- [ ] Project path invalid → error notification
- [ ] Terminal not available → error notification
- [ ] AppleScript fails → error notification
- [ ] All errors logged to errors.log

#### Cancellation Tests
- [ ] `cancel-session.sh` unloads job
- [ ] Plist file deleted
- [ ] Cancellation notification fires
- [ ] Cancelled job not in `list-scheduled.sh`

#### Notification Tests
- [ ] Pre-session alert (Ping sound)
- [ ] Launch confirmation (Glass sound)
- [ ] Quota not ready (Basso sound)
- [ ] Error notification (Basso sound)
- [ ] Cancellation (Purr sound)
- [ ] Notifications appear in Notification Center

### Performance Tests

**Timing Tests**:
- Schedule 10 sessions, measure plist generation time (should be <1s each)
- Measure quota check time (should be <500ms)
- Measure terminal launch time (should be <2s)
- Measure AppleScript execution time (should be <3s)

**Stress Tests**:
- Schedule 50 sessions, verify all loaded
- Cancel 50 sessions, verify all unloaded
- Verify no memory leaks in long-running sessions

---

## Risk Assessment

### High-Risk Items

#### 1. AppleScript Permissions (HIGH)
**Risk**: User must approve automation permissions, which may fail silently.

**Mitigation**:
- Detect permission denial and show clear instructions
- Provide manual permission setup guide
- Test permission status before scheduling
- Fallback to manual launch if permissions denied

**Detection**:
```bash
# Check if automation permission granted
check_automation_permission() {
    osascript -e 'tell application "System Events" to return name' 2>&1
    if [[ $? -ne 0 ]]; then
        echo "ERROR: Automation permission not granted"
        show_permission_instructions
        exit 1
    fi
}
```

#### 2. launchd Job Timing Variance (MEDIUM)
**Risk**: launchd jobs may fire 1-2 minutes late, missing optimal quota reset.

**Mitigation**:
- Schedule jobs 1-2 minutes before desired time
- Add quota check buffer (wait up to 5 mins if not ready)
- Log actual vs scheduled time variance
- Notify user of delays

#### 3. Quota Race Condition (HIGH)
**Risk**: Multiple sessions scheduled at same time may conflict over quota.

**Mitigation**:
- Check for existing scheduled sessions before scheduling
- Add mutex lock file during launch
- Reschedule conflicting sessions +10 mins
- Show warning if multiple sessions scheduled

**Lock Implementation**:
```bash
# Acquire lock
acquire_lock() {
    local lockfile="/tmp/claude-launch.lock"
    if [[ -f "$lockfile" ]]; then
        local lock_age=$(($(date +%s) - $(stat -f %m "$lockfile")))
        if [[ $lock_age -lt 300 ]]; then  # 5 min timeout
            echo "ERROR: Another session is launching"
            exit 1
        else
            rm -f "$lockfile"  # Stale lock
        fi
    fi
    touch "$lockfile"
}

# Release lock
release_lock() {
    rm -f "/tmp/claude-launch.lock"
}
```

#### 4. Environment Variables Not Loaded (MEDIUM)
**Risk**: Terminal may not have proper PATH, causing `claude` command to fail.

**Mitigation**:
- Use full path to `claude` binary (detect with `which claude`)
- Source shell RC files explicitly in launch script
- Add fallback paths to search for `claude`
- Log environment in debug mode

**Solution**:
```bash
# Find Claude binary
find_claude() {
    local claude_path=$(which claude 2>/dev/null)
    if [[ -z "$claude_path" ]]; then
        # Try common locations
        for path in /usr/local/bin/claude ~/bin/claude ~/.local/bin/claude; do
            if [[ -x "$path" ]]; then
                claude_path="$path"
                break
            fi
        done
    fi

    if [[ -z "$claude_path" ]]; then
        echo "ERROR: Claude binary not found"
        exit 1
    fi

    echo "$claude_path"
}
```

### Medium-Risk Items

#### 5. Fullscreen Terminal (MEDIUM)
**Risk**: AppleScript may fail if terminal is in fullscreen mode.

**Mitigation**:
- Detect fullscreen and exit fullscreen programmatically
- Show notification to exit fullscreen
- Retry AppleScript after delay
- Document fullscreen limitation

#### 6. Terminal App Not Running (LOW)
**Risk**: iTerm2/Terminal.app may not be running when scheduled.

**Mitigation**:
- AppleScript automatically launches app if not running
- Add explicit `activate` command
- Verify app launched before sending commands
- Fallback to `open` command if AppleScript fails

#### 7. Log File Growth (LOW)
**Risk**: Logs may grow large over time, consuming disk space.

**Mitigation**:
- Implement log rotation (keep last 100 entries)
- Compress old logs
- Add cleanup script (delete logs >30 days)
- Document log management

#### 8. macOS Version Compatibility (LOW)
**Risk**: AppleScript syntax may differ between macOS versions.

**Mitigation**:
- Test on macOS 15.6 (Sequoia)
- Use conservative AppleScript syntax
- Check macOS version and warn if untested
- Provide version-specific scripts if needed

### Low-Risk Items

#### 9. Notification Suppression (LOW)
**Risk**: Do Not Disturb may suppress notifications.

**Mitigation**:
- Use critical alerts (requires permission)
- Log all notifications
- Show fallback message in terminal
- Document notification requirements

#### 10. Handoff File Corruption (LOW)
**Risk**: Handoff file may be corrupted or malformed.

**Mitigation**:
- Validate markdown syntax before loading
- Use checksums to detect corruption
- Keep backup of last handoff
- Show error if file invalid

---

## Fallback Mechanisms

### 1. Quota Not Ready
**Scenario**: Quota hasn't reset at scheduled time.

**Fallback**:
1. Send notification: "Quota not ready, rescheduling..."
2. Calculate new time: current + 30 minutes
3. Call `schedule-session.sh` with new time
4. Log reschedule to `reschedules.log`
5. Notify user of new time

**Max Retries**: 3 reschedules, then abort and notify

### 2. Terminal Not Available
**Scenario**: iTerm2 not found, Terminal.app not available.

**Fallback**:
1. Try iTerm2 first
2. If not found, try Terminal.app
3. If not found, send error notification
4. Log error with instructions
5. Provide manual launch command in notification

**Manual Launch Command**:
```bash
cd /path/to/project && cat /path/to/handoff.md | claude --agent /path/to/agent.md
```

### 3. AppleScript Permission Denied
**Scenario**: User hasn't granted automation permission.

**Fallback**:
1. Detect permission error
2. Send notification with instructions
3. Show dialog with steps to grant permission
4. Reschedule session +10 minutes
5. Retry up to 3 times

**Permission Instructions**:
```
System Preferences → Security & Privacy → Privacy → Automation
→ Enable Terminal/iTerm2 → System Events
```

### 4. Handoff File Missing
**Scenario**: Handoff file deleted or moved.

**Fallback**:
1. Send error notification
2. Check for backup handoff
3. If backup exists, use it
4. If no backup, abort and log error
5. Notify user to recreate handoff

### 5. Launch Script Failure
**Scenario**: Launch script crashes or exits with error.

**Fallback**:
1. Catch exit code in launchd job
2. Log error to errors.log
3. Send error notification with details
4. Do NOT reschedule (prevent infinite loop)
5. Require manual intervention

### 6. Multiple Sessions Conflict
**Scenario**: Two sessions scheduled at same time.

**Fallback**:
1. Detect conflict via lock file
2. Reschedule second session +10 minutes
3. Notify user of conflict
4. Log both session IDs
5. Allow manual override

### 7. launchd Job Not Firing
**Scenario**: launchd doesn't execute job at scheduled time.

**Fallback**:
1. Monitor job status (optional daemon)
2. If job missed, send notification
3. Allow manual execution: `launchctl start com.claude.auto-session.{id}`
4. Reschedule if within 10-minute window
5. Log missed execution

---

## Dependencies

### Session 4A (Foundation)
**Required Before Session 4B**:
- ✅ Scheduler Core (scheduling logic, session management)
- ✅ Handoff System (markdown files, context preservation)
- ✅ QuotaTracker Integration (canStartSession() API)
- ✅ `check-quota.sh` script (or TypeScript equivalent)
- ✅ Handoff directory structure (`~/.claude/session-handoffs/`)

**API Requirements**:
```typescript
// Session 4A must provide:
interface SchedulerCore {
  scheduleSession(config: SessionConfig): ScheduledSession;
  cancelSession(sessionId: string): void;
  listScheduledSessions(): ScheduledSession[];
}

interface QuotaTracker {
  canStartSession(estimatedTokens: number): {
    canStart: boolean;
    remaining: number;
    resetTime: Date;
    scheduleFor?: Date;
    message: string;
  };
}
```

### External Dependencies

**macOS Built-in Tools** (No installation required):
- `launchctl` - Job scheduler
- `osascript` - AppleScript execution
- `bash` (4.0+) - Shell scripting
- `date` - Time calculations
- `stat` - File metadata
- `pgrep` - Process detection

**Optional Tools**:
- `jq` - JSON parsing (for notification templates)
- `xmllint` - Plist validation (for safety)

**Application Dependencies**:
- iTerm2 (preferred) OR Terminal.app (fallback)
- Claude Code CLI (`claude` command available)

**Node.js Dependencies** (for QuotaTracker):
- Node.js 18+
- TypeScript
- `quota-tracker.ts` module

### Version Requirements

**macOS**: 15.6 (Sequoia) - Tested version
**Compatibility**: Likely works on macOS 10.15+ (Catalina)

**iTerm2**: Any version with AppleScript support (2.0+)
**Terminal.app**: macOS built-in (all versions)

**Bash**: 3.2+ (macOS default)
**Node.js**: 18+ (for QuotaTracker)

### Installation Requirements

**User Actions**:
1. Grant Automation permission (System Preferences)
2. Grant Notification permission (System Preferences)
3. Ensure `claude` command is in PATH
4. Install iTerm2 (optional, Terminal.app fallback)

**No sudo required**: All operations in user space

---

## Success Criteria

### Functional Requirements

#### Core Functionality
- [x] Schedule a session for specific time (HH:MM)
- [x] LaunchAgent plist created and loaded
- [x] Pre-session notification fires 5 mins before
- [x] Quota verified before launch
- [x] Terminal opens automatically (iTerm2 or Terminal.app)
- [x] Claude Code launches with agent
- [x] Handoff context loaded in session prompt
- [x] Launch confirmation notification sent
- [x] Session launch logged

#### Error Handling
- [x] Quota not ready → reschedule automatically
- [x] Handoff file missing → error notification
- [x] Terminal not available → error notification
- [x] AppleScript failure → error notification
- [x] All errors logged to errors.log
- [x] Max 3 reschedules before abort

#### Management
- [x] Cancel scheduled session
- [x] List all scheduled sessions with times
- [x] View launch history (logs)
- [x] Debug mode for troubleshooting

### Performance Requirements

- **Plist Generation**: < 1 second
- **Quota Check**: < 500ms
- **Terminal Launch**: < 3 seconds (from AppleScript start to Claude prompt)
- **Notification Delivery**: < 1 second
- **launchd Job Load**: < 2 seconds

### Reliability Requirements

- **Success Rate**: > 95% successful launches (with quota available)
- **Reschedule Success**: > 90% successful after reschedule
- **Error Recovery**: 100% of errors logged and notified
- **No Silent Failures**: All failures produce notification + log

### Usability Requirements

- **Zero Configuration**: Works out of box (except permissions)
- **Clear Errors**: Error messages explain what went wrong and how to fix
- **User Control**: Easy to cancel/list/reschedule sessions
- **Non-intrusive**: Notifications informative but not annoying

### Security Requirements

- **File Permissions**: 700 for scripts, 600 for logs
- **Input Validation**: All paths and inputs validated
- **No Privilege Escalation**: Runs as user, no sudo
- **Sensitive Data**: No secrets in logs or notifications

### Documentation Requirements

- **README**: Clear setup and usage instructions
- **Troubleshooting Guide**: Common issues and solutions
- **API Documentation**: Script interfaces documented
- **Examples**: Real-world usage examples

---

## Next Steps

### Immediate Actions (Session 4A)
1. Build Scheduler Core (scheduling logic)
2. Implement Handoff System (markdown generation)
3. Create `check-quota.sh` wrapper
4. Test QuotaTracker integration

### Session 4B Execution Plan

**Pre-session Checklist**:
- [ ] Session 4A complete
- [ ] QuotaTracker.canStartSession() available
- [ ] Handoff system working
- [ ] Test handoff file created
- [ ] Quota > 120k tokens available

**Execution Order**:
1. Phase 1: Launch infrastructure (45 mins)
2. Phase 2: launchd scheduler (35 mins)
3. **CHECKPOINT**: Test scheduling + manual launch
4. Phase 3: Notification system (25 mins)
5. Phase 4: Quota integration (35 mins)
6. **CHECKPOINT**: Test quota-aware rescheduling
7. Phase 5: Error handling (30 mins)
8. Phase 6: Documentation (20 mins)
9. **FINAL TEST**: End-to-end automation test

**Success Validation**:
- [ ] Can schedule session 5 mins in future
- [ ] Pre-session notification fires
- [ ] Terminal opens automatically
- [ ] Claude Code launches with handoff
- [ ] All logs updated
- [ ] Can cancel scheduled session

---

## Summary

### Total Estimated Tokens: 120,000 (with contingency)

**Core Estimate**: 100,000 tokens
**Contingency**: +20,000 tokens (20%)

**Breakdown**:
- Phase 1 (Launch): 25k tokens
- Phase 2 (launchd): 20k tokens
- Phase 3 (Notifications): 12k tokens
- Phase 4 (Quota): 18k tokens
- Phase 5 (Errors): 15k tokens
- Phase 6 (Docs): 10k tokens

### Key Risks Identified

**HIGH**:
1. AppleScript permissions (mitigation: clear instructions, fallback)
2. Quota race condition (mitigation: lock file, conflict detection)

**MEDIUM**:
3. launchd timing variance (mitigation: buffer time, quota recheck)
4. Environment variables (mitigation: full paths, RC sourcing)
5. Fullscreen terminal (mitigation: exit fullscreen, retry)

**LOW**:
6. Notification suppression (mitigation: logging, terminal message)
7. Log file growth (mitigation: rotation, cleanup)

### Recommended Implementation Order

**Session 4B-1 (50k tokens, 90 mins)**:
1. Phase 1: Launch infrastructure
2. Phase 2: launchd scheduler
3. **TEST**: Schedule test session and verify launch

**Session 4B-2 (40k tokens, 60 mins)**:
4. Phase 3: Notification system
5. Phase 4: Quota integration & rescheduling
6. **TEST**: Quota-aware scheduling

**Session 4B-3 (30k tokens, 50 mins)**:
7. Phase 5: Error handling & logging
8. Phase 6: Documentation & testing
9. **TEST**: Full E2E test

**Total**: 3 sessions, ~3.5 hours, 120k tokens

### Blockers / Dependencies

**Blockers**:
- ❌ Session 4A must be complete (scheduler core, handoff system)
- ❌ QuotaTracker API must be available

**Soft Dependencies**:
- ⚠️ User must grant Automation permission (can test without)
- ⚠️ iTerm2 or Terminal.app required (built-in on macOS)
- ⚠️ `claude` command must be in PATH (can use full path)

**Ready to Start**: Once Session 4A delivers:
- `check-quota.sh` script
- Handoff markdown files in `~/.claude/session-handoffs/`
- Scheduler API for scheduling/cancelling sessions

---

**Status**: ✅ SESSION 4B PLAN COMPLETE
**Next**: Execute Session 4A, then proceed with Session 4B implementation
**Confidence**: HIGH - Clear scope, manageable risks, proven technologies
