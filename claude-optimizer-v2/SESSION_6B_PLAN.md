# Session 6B: Automation Scripts

**Status**: 🟡 HIGH PRIORITY - NOT STARTED
**Estimated Time**: 2-3 hours
**Estimated Tokens**: 35-50k tokens (18-25% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 150-165k buffer)
**Prerequisites**: SESSION 5 complete (needs handoff system)
**Can Run in Parallel**: ✅ YES (with SESSION 6A - independent systems)

---

## Executive Summary

Build shell automation scripts to launch Claude Code sessions at scheduled times with zero manual intervention. This enables the calendar-driven workflow where sessions automatically start when quota resets, loading handoff context seamlessly.

**Why High Priority**: We have handoff files and calendar integration, but require manual session launches. Automation closes the loop for fully autonomous session orchestration.

---

## Session Objectives

### Primary Goals
1. ✅ Build quota check script for readiness verification
2. ✅ Create session launcher with handoff integration
3. ✅ Implement scheduling system with launchd
4. ✅ Add automation option to /plan-next-session command
5. ✅ Enable pre-session notifications

### Success Criteria
- ✅ Can manually launch session with handoff file
- ✅ Can schedule session for future time
- ✅ launchd job runs automatically at scheduled time
- ✅ Pre-session notifications work (5 mins before)
- ✅ /plan-next-session offers automation options
- ✅ Documentation updated in AGENTS.md

---

## Token Estimation Breakdown

### Phase 1: Directory Setup & Quota Check (20 min)
**Estimated Tokens**: 7,000 - 10,000

**Calculation**:
- Directory creation: 2,000 tokens
- Quota check script: 5,000 tokens
- Duration: 0.33 hours
- Rate: 30,000 tokens/hour (scripting type)
- Formula: 0.33h × 30k/h × 0.9 (simple bash) = 8,910 tokens
- Range: ±15% = 7,000 - 10,000

**Reasoning**:
- Simple directory structure: ~2k tokens
- Quota verification logic: ~5k tokens
- **Complexity**: 0.9 (straightforward scripting)
- **Confidence**: HIGH

### Phase 2: Launch Session Script (40 min)
**Estimated Tokens**: 15,000 - 20,000

**Calculation**:
- Base implementation: 17,000 tokens
- Duration: 0.67 hours
- Rate: 30,000 tokens/hour
- Formula: 0.67h × 30k/h × 0.85 (complex flow) = 17,085 tokens
- Range: ±15% = 15,000 - 20,000

**Reasoning**:
- Multi-step launch flow: ~10k tokens
- Terminal integration: ~5k tokens
- Notification system: ~2k tokens
- **Complexity**: 0.85 (requires iTerm/Terminal scripting)
- **Confidence**: MEDIUM

### Phase 3: Schedule Session Script (35 min)
**Estimated Tokens**: 12,000 - 15,000

**Calculation**:
- Base implementation: 13,000 tokens
- Duration: 0.58 hours
- Rate: 30,000 tokens/hour
- Formula: 0.58h × 30k/h × 0.75 (launchd complexity) = 13,050 tokens
- Range: ±12% = 12,000 - 15,000

**Reasoning**:
- launchd plist generation: ~6k tokens
- Scheduling logic: ~5k tokens
- Pre-session notifications: ~2k tokens
- **Complexity**: 0.75 (macOS-specific features)
- **Confidence**: MEDIUM

### Phase 4: launchd Template & Integration (35 min)
**Estimated Tokens**: 13,000 - 17,000

**Calculation**:
- Plist template: 5,000 tokens
- /plan-next-session integration: 8,000 tokens
- Duration: 0.58 hours
- Rate: 45,000 tokens/hour (TypeScript integration)
- Formula: 0.58h × 45k/h × 0.5 (partial file) = 13,050 tokens
- Range: ±15% = 13,000 - 17,000

**Reasoning**:
- Template creation: ~5k tokens
- Command integration: ~8k tokens
- **Complexity**: 0.5 (updating existing command)
- **Confidence**: HIGH

### Phase 5: Testing & Documentation (20 min)
**Estimated Tokens**: 8,000 - 10,000

**Calculation**:
- Testing: 5,000 tokens
- Documentation: 3,000 tokens
- Duration: 0.33 hours
- Rate: 25,000 tokens/hour
- Formula: 0.33h × 25k/h × 1.0 = 8,250 tokens
- Range: ±10% = 8,000 - 10,000

**Reasoning**:
- Manual testing flows: ~5k tokens
- Documentation updates: ~3k tokens
- **Complexity**: 1.0 (standard testing)
- **Confidence**: HIGH

---

## Total Estimate

**Mid-Range**: 42,500 tokens
**Conservative**: 35,000 tokens (all phases at low end)
**Aggressive**: 50,000 tokens (all phases at high end)

**Recommended Buffer**: +15% = 50,000 tokens
**Safe Upper Limit**: 60,000 tokens

**Pro Quota Check**: 60k < 200k ✅ FITS (with 140k buffer)

---

## Risk Factors (Could Increase Usage)

1. **macOS Terminal Scripting Complexity** (+5-8k tokens)
   - Mitigation: Test iTerm automation first, fallback to AppleScript

2. **launchd Configuration Issues** (+3-5k tokens)
   - Mitigation: Use proven plist template patterns

3. **Notification System Integration** (+2-4k tokens)
   - Mitigation: Use native osascript for simple notifications

**Total Risk**: +10-17k tokens
**Worst Case**: 67k tokens (still fits quota ✅)

---

## Phase Breakdown

### Phase 1: Directory Setup & Quota Check (20 min, 7-10k tokens)

**Deliverables**:
- `~/.claude/automation/`
- `~/.claude/bin/`
- `~/.claude/bin/check-quota.sh`

**Implementation**:
```bash
#!/bin/bash
# check-quota.sh - Verify quota readiness

# Use QuotaTracker via Node
node -e "
  import('./dist/quota-tracker.js').then(module => {
    const tracker = new module.QuotaTracker();
    const status = tracker.getQuotaStatus();

    if (status.percentUsed < 0.10) {
      console.log('READY');
      process.exit(0);
    } else {
      console.log('WAITING');
      console.log('Next reset: ' + status.nextReset);
      process.exit(1);
    }
  });
"
```

**Steps**:
1. Create directory structure
2. Implement quota check logic
3. Test with current quota status
4. Make script executable (chmod +x)

---

### Phase 2: Launch Session Script (40 min, 15-20k tokens)

**Deliverable**: `~/.claude/automation/launch-session.sh`

**Implementation**:
```bash
#!/bin/bash
# launch-session.sh - Launch Claude Code with handoff

HANDOFF_FILE=$1
AGENT_FILE=$2
PROJECT_PATH=$3

# 1. Verify quota ready
if ! ~/.claude/bin/check-quota.sh; then
  osascript -e 'display notification "Quota not ready - session postponed" with title "Claude Code"'
  exit 1
fi

# 2. Load handoff content
HANDOFF_CONTENT=$(cat "$HANDOFF_FILE")

# 3. Create session prompt
SESSION_PROMPT="$HANDOFF_CONTENT

$(cat "$AGENT_FILE")

Ready to continue?"

# 4. Launch iTerm with Claude Code
osascript <<EOF
  tell application "iTerm"
    create window with default profile
    tell current session of current window
      write text "cd '$PROJECT_PATH'"
      write text "claude-code"
      delay 2
      write text "$SESSION_PROMPT"
    end tell
  end tell
EOF

# 5. Send desktop notification
osascript -e 'display notification "Session started in iTerm" with title "Claude Code"'

# 6. Log session start
echo "$(date): Session started - $HANDOFF_FILE" >> ~/.claude/logs/session-launches.log
```

**Parameters**:
- `handoff-file`: Path to handoff markdown
- `agent-file`: Path to agent instructions (optional)
- `project-path`: Working directory for session

**Steps**:
1. Implement quota verification
2. Add handoff content loading
3. Create iTerm launch logic
4. Add notification system
5. Implement logging
6. Test manual launch

---

### Phase 3: Schedule Session Script (35 min, 12-15k tokens)

**Deliverable**: `~/.claude/automation/schedule-session.sh`

**Implementation**:
```bash
#!/bin/bash
# schedule-session.sh - Schedule future session

HANDOFF_FILE=$1
AGENT_FILE=$2
PROJECT_PATH=$3
LAUNCH_TIME=$4  # Format: "18:05" (6:05 PM)

# Create unique job ID
JOB_ID="com.claude.session.$(date +%s)"

# Generate launchd plist from template
cat ~/.claude/automation/session.plist.template | \
  sed "s|{{JOB_ID}}|$JOB_ID|g" | \
  sed "s|{{LAUNCH_TIME}}|$LAUNCH_TIME|g" | \
  sed "s|{{HANDOFF_FILE}}|$HANDOFF_FILE|g" | \
  sed "s|{{AGENT_FILE}}|$AGENT_FILE|g" | \
  sed "s|{{PROJECT_PATH}}|$PROJECT_PATH|g" \
  > ~/Library/LaunchAgents/$JOB_ID.plist

# Schedule pre-session notification (5 mins before)
NOTIFY_TIME=$(date -v-5M -j -f "%H:%M" "$LAUNCH_TIME" +"%H:%M")
osascript -e "display notification \"Session starting in 5 minutes\" with title \"Claude Code\" scheduled time \"$NOTIFY_TIME\""

# Load launchd job
launchctl load ~/Library/LaunchAgents/$JOB_ID.plist

echo "✅ Session scheduled for $LAUNCH_TIME"
echo "   Handoff: $HANDOFF_FILE"
echo "   Project: $PROJECT_PATH"
echo "   Job ID: $JOB_ID"
```

**Steps**:
1. Implement plist generation from template
2. Add pre-session notification scheduling
3. Create launchd job loading
4. Add confirmation output
5. Test scheduling (schedule for 2 mins in future)

---

### Phase 4: launchd Template & Integration (35 min, 13-17k tokens)

#### Part 1: launchd Plist Template (15 min, 5-7k tokens)

**Deliverable**: `~/.claude/automation/session.plist.template`

**Implementation**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{{JOB_ID}}</string>

    <key>ProgramArguments</key>
    <array>
        <string>~/.claude/automation/launch-session.sh</string>
        <string>{{HANDOFF_FILE}}</string>
        <string>{{AGENT_FILE}}</string>
        <string>{{PROJECT_PATH}}</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>{{HOUR}}</integer>
        <key>Minute</key>
        <integer>{{MINUTE}}</integer>
    </dict>

    <key>RunAtLoad</key>
    <false/>

    <key>StandardOutPath</key>
    <string>~/.claude/logs/launchd-out.log</string>

    <key>StandardErrorPath</key>
    <string>~/.claude/logs/launchd-err.log</string>
</dict>
</plist>
```

#### Part 2: Update /plan-next-session (20 min, 8-10k tokens)

**Update**: `src/commands/plan-next-session.ts`

**Add Automation Option**:
```typescript
// After handoff is created...

console.log('\n📅 SCHEDULE OPTIONS');
console.log('━'.repeat(50));
console.log('1. At quota reset (6:00 PM)');
console.log('2. 5 minutes after (6:05 PM) - recommended');
console.log('3. Custom time');
console.log('4. Manual launch');

const scheduleChoice = await question('Choose scheduling option (1-4): ');

if (scheduleChoice === '1' || scheduleChoice === '2' || scheduleChoice === '3') {
  let launchTime: string;

  if (scheduleChoice === '1') {
    launchTime = '18:00';
  } else if (scheduleChoice === '2') {
    launchTime = '18:05';
  } else {
    launchTime = await question('Enter time (HH:MM): ');
  }

  // Call schedule-session.sh
  const scheduleCmd = `~/.claude/automation/schedule-session.sh "${handoffPath}" "${agentPath}" "${projectPath}" "${launchTime}"`;
  execSync(scheduleCmd, { stdio: 'inherit' });

  console.log('\n✅ Session scheduled successfully!');
  console.log('   The session will launch automatically at ' + launchTime);
} else {
  console.log('\n📝 Manual launch instructions saved to handoff file');
}
```

**Steps**:
1. Add interactive scheduling menu
2. Implement automation script calling
3. Test integration with handoff creation
4. Update package.json if needed

---

### Phase 5: Testing & Documentation (20 min, 8-10k tokens)

#### Testing Flow (15 min, 5-7k tokens)

**Test Cases**:
1. Manual launch
   ```bash
   ~/.claude/automation/launch-session.sh \
     ~/.claude/handoffs/session-5-context.md \
     ~/.claude/agents/implementation-agent.md \
     ~/projects/claude-optimizer-v2
   ```

2. Scheduled launch (2 mins in future)
   ```bash
   FUTURE_TIME=$(date -v+2M +"%H:%M")
   ~/.claude/automation/schedule-session.sh \
     ~/.claude/handoffs/session-5-context.md \
     ~/.claude/agents/implementation-agent.md \
     ~/projects/claude-optimizer-v2 \
     "$FUTURE_TIME"
   ```

3. Pre-session notification
   - Wait 1:55 and verify notification appears

4. Integration test
   ```bash
   cd claude-optimizer-v2
   npm run build
   plan-next-session
   # Choose automation option, verify scheduling
   ```

#### Documentation (5 min, 3k tokens)

**Update**: `AGENTS.md`

**Add Section**:
```markdown
## Automation Scripts

### Manual Session Launch
```bash
~/.claude/automation/launch-session.sh <handoff-file> <agent-file> <project-path>
```

Launches Claude Code session immediately with handoff context.

### Schedule Session
```bash
~/.claude/automation/schedule-session.sh <handoff-file> <agent-file> <project-path> <time>
```

Schedules session for future time (HH:MM format).

### Automation via /plan-next-session
The `/plan-next-session` command now offers automatic scheduling:
1. At quota reset (6:00 PM)
2. 5 minutes after (6:05 PM) - recommended
3. Custom time
4. Manual launch

Pre-session notifications appear 5 minutes before scheduled time.
```

---

## Prerequisites

### Before Starting
1. ✅ SESSION 5 completed (handoff system working)
2. ✅ HandoffManager available in src/handoff-manager.ts
3. ✅ QuotaTracker available in src/quota-tracker.ts
4. ✅ macOS environment (for launchd, iTerm, osascript)

### Files to Read First
1. `src/handoff-manager.ts` - Handoff integration point
2. `src/quota-tracker.ts` - Quota check integration
3. `src/commands/plan-next-session.ts` - Command to update

### Reference Documents
1. `IMPLEMENTATION_GAP_ANALYSIS.md` - Automation requirements
2. `AUTOMATED_SESSION_ORCHESTRATION_PLAN.md` Section 3 - Specifications
3. `BUILD_ORCHESTRATION_PROMPT.md` - Session 6B details

---

## Session Start Prompt

**Copy-paste this into Claude Code**:

```markdown
You are implementing SESSION 6B: Automation Scripts for Claude Code Optimizer v2.0.

**Context**: We have handoff files that preserve context between sessions (from SESSION 5). Now we need automation to launch sessions at scheduled times (e.g., when quota resets) with zero manual intervention.

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md Section "Automated Session Launch"
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 3
- Read: SESSION_6B_PLAN.md (this plan)
- Integration: src/handoff-manager.ts, src/quota-tracker.ts

**Your Task**: Build shell automation for scheduled session starts.

**Deliverables** (in order):

1. **Directory Structure** (5 min, 2-3k tokens)
   - Create: ~/.claude/automation/
   - Create: ~/.claude/bin/
   - Verify paths exist

2. **Quota Check Script** (15 min, 5-7k tokens)
   - Create: ~/.claude/bin/check-quota.sh
   - Verify quota has reset
   - Return READY or WAITING
   - Use QuotaTracker via Node
   - Make executable (chmod +x)

3. **Launch Session Script** (40 min, 15-20k tokens)
   - Create: ~/.claude/automation/launch-session.sh
   - Parameters: handoff-file, agent-file, project-path
   - Flow:
     1. Verify quota ready
     2. Load handoff content
     3. Create session prompt with context
     4. Launch iTerm/Terminal with Claude Code
     5. Send desktop notification
     6. Log session start
   - Make executable (chmod +x)

4. **Schedule Session Script** (35 min, 12-15k tokens)
   - Create: ~/.claude/automation/schedule-session.sh
   - Parameters: handoff-file, agent-file, project-path, launch-time
   - Flow:
     1. Create launchd plist from template
     2. Schedule for specific time
     3. Set up pre-session notification (5 mins before)
     4. Load launchd job
     5. Confirm scheduling
   - Make executable (chmod +x)

5. **launchd Plist Template** (15 min, 5-7k tokens)
   - Create: ~/.claude/automation/session.plist.template
   - Configurable: time, paths, scripts
   - Include StartCalendarInterval, ProgramArguments
   - Add logging paths

6. **Integration: Update /plan-next-session** (20 min, 8-10k tokens)
   - Update: src/commands/plan-next-session.ts
   - Add automation option at end of handoff creation:
     ```
     Schedule options:
     1. At quota reset (6:00 PM)
     2. 5 minutes after (6:05 PM) - recommended
     3. Custom time
     4. Manual
     ```
   - Call schedule-session.sh when user chooses 1-3
   - Update imports if needed

7. **Testing & Documentation** (20 min, 8-10k tokens)
   - Test manual launch with handoff file
   - Test scheduled launch (2 mins in future)
   - Test pre-session notifications
   - Update: AGENTS.md with automation commands
   - Verify: npm run build still works

**Success Criteria**:
- ✅ Can manually launch session with handoff
- ✅ Can schedule session for future time
- ✅ launchd job runs automatically
- ✅ Pre-session notifications work
- ✅ /plan-next-session offers automation

**Working Approach**:
1. Start with directory setup and quota check (simple)
2. Build launch script incrementally, test iTerm integration
3. Add scheduling with launchd (test with near-future time)
4. Integrate with existing /plan-next-session command
5. Use osascript for macOS notifications
6. Test end-to-end automation flow

**Note**: This session CAN run in parallel with SESSION 6A (Token Estimation) as they are independent systems.

Ready to build SESSION 6B?
```

---

## Historical Context

**Previous Sessions**:
- SESSION 1-4: Built quota tracking, calendar integration, handoffs, dashboard
- SESSION 5: Built context window monitoring and compaction

**Current Gap**:
- Handoff files exist but require manual session launches
- No automation for scheduled quota reset sessions
- Calendar events created but not actionable

**Why This Session Matters**:
- Closes automation loop for calendar-driven workflow
- Enables zero-touch session orchestration
- Foundation for fully autonomous multi-session projects
- Works with existing handoff and calendar systems

---

## Next Session

After SESSION 6B completes:
- If SESSION 6A also complete: Proceed to SESSION 7 (Memory System)
- If SESSION 6A still running: Wait for completion, then SESSION 7
- SESSION 7 integrates all systems (context, estimation, automation, memory)

See: `SESSION_7_PLAN.md`
