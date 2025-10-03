# iCal + SESSION Plan Integration

## Goal
Enable starting SESSION_#_PLAN.md sessions from iPhone/laptop calendar with one tap/click.

## Current State Analysis

### ✅ What Already Works
1. **Session Plans** - You have SESSION_2 through SESSION_10 in `docs/planning/`
2. **Session Launcher** - `SessionLauncher` class launches Claude Code with instructions
3. **Calendar Service** - Creates Google Calendar events with session metadata
4. **iCal Export** - Exports sessions to `.ics` format for iPhone

### ❌ What's Missing
1. **SESSION Plan → Calendar Mapping** - No connection between SESSION_X_PLAN.md and calendar events
2. **URL Launcher** - No way to trigger session start from calendar event
3. **Mobile-Friendly Start** - Can't easily start sessions from iPhone
4. **Session Plan Instructions** - Calendar doesn't include SESSION plan content

## Proposed Architecture

### Approach: URL Scheme Launcher

**How it works**:
1. Calendar event contains custom URL: `claude-session://start?plan=SESSION_10_PLAN`
2. iPhone/Mac recognizes URL and opens terminal/script
3. Script reads SESSION plan, launches Claude Code with instructions
4. Session starts automatically with all objectives loaded

### Three-Tier Implementation

#### Tier 1: Basic (Works Everywhere)
- **Calendar event** contains full instructions in description
- **Manual start**: Copy/paste command from calendar
- **Works on**: Any device, any calendar app
- **Effort**: 30 minutes

#### Tier 2: URL Launcher (Mac/iPhone)
- **Calendar event** contains URL scheme: `claude-session://...`
- **One-tap start**: Click URL in calendar → script runs → session starts
- **Works on**: Mac (for sure), iPhone (with Shortcuts app)
- **Effort**: 1-2 hours

#### Tier 3: Full Automation (Calendar Watcher)
- **Calendar watcher** monitors for session start times
- **Auto-start**: Sessions begin automatically at scheduled time
- **Full integration**: Uses SESSION plan content as instructions
- **Effort**: 30 minutes (already mostly built!)

## Test Plan

### Phase 1: Manual Testing (30 min)
**Goal**: Verify SESSION plans can trigger sessions

1. **Create test calendar event**
   ```bash
   # Add SESSION plan content to calendar description
   node dist/cli.js calendar schedule ~/project
   ```

2. **Export to iCal**
   ```bash
   node dist/cli.js calendar export test-session.ics
   ```

3. **Import to iPhone Calendar**
   - AirDrop `test-session.ics` to iPhone
   - Tap to import
   - Verify event shows SESSION objectives

4. **Manual session start from laptop**
   - Read event on iPhone
   - Open laptop terminal
   - Copy command from calendar
   - Verify session starts with correct instructions

**Success Criteria**: Can see SESSION objectives in calendar and start session manually

---

### Phase 2: Enhanced Calendar Integration (1 hour)

#### Step 1: Map SESSION Plans to Calendar Events
**File**: `src/session-plan-mapper.ts` (new)

```typescript
export interface SessionPlanMetadata {
  planFile: string;          // 'SESSION_10_PLAN.md'
  title: string;             // 'Real Data Integration'
  estimatedHours: number;
  estimatedTokens: string;
  objectives: string[];
  prerequisites: string[];
}

export class SessionPlanMapper {
  // Parse SESSION_X_PLAN.md files
  async parseSessionPlan(planPath: string): Promise<SessionPlanMetadata>

  // Create calendar event from SESSION plan
  async createEventFromPlan(
    plan: SessionPlanMetadata,
    startTime: Date
  ): Promise<CalendarEvent>

  // Generate launch instructions
  buildLaunchCommand(plan: SessionPlanMetadata): string
}
```

#### Step 2: Enhance iCal Export
**File**: `src/calendar-service.ts` (modify)

Add to event description:
```
🚀 Quick Start:
1. Open terminal
2. Run: cd ~/path/to/project
3. Run: node dist/cli.js session start SESSION_10_PLAN

📋 Full Objectives:
[... all objectives from SESSION plan ...]

📱 Mobile: Tap this URL to start (if configured):
claude-session://start?plan=SESSION_10_PLAN&project=/path/to/project
```

#### Step 3: Create Session Start Command
**File**: `src/commands/session-start.ts` (new)

```typescript
// Usage: node dist/cli.js session start SESSION_10_PLAN
export async function sessionStart(planName: string) {
  // 1. Find SESSION plan file
  const planPath = findSessionPlan(planName);

  // 2. Parse objectives and instructions
  const plan = await parseSessionPlan(planPath);

  // 3. Build Claude Code prompt
  const prompt = buildPromptFromPlan(plan);

  // 4. Launch session
  const launcher = new SessionLauncher();
  await launcher.launchSessionFromPlan(plan, prompt);
}
```

**Test**:
```bash
# Test the command directly
node dist/cli.js session start SESSION_10_PLAN

# Should:
# - Find docs/planning/SESSION_10_PLAN.md
# - Extract objectives
# - Launch Claude Code with full instructions
```

---

### Phase 3: URL Scheme (Mac Only, 1 hour)

#### Step 1: Register URL Handler (Mac)
**File**: `scripts/install-url-handler.sh` (new)

```bash
#!/bin/bash
# Register claude-session:// URL handler on Mac

cat > ~/Library/LaunchAgents/com.claude.session-launcher.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.session-launcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/claude-optimizer-v2/scripts/handle-session-url.sh</string>
        <string>%u</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.claude.session-launcher.plist
```

#### Step 2: URL Handler Script
**File**: `scripts/handle-session-url.sh` (new)

```bash
#!/bin/bash
# Handle claude-session:// URLs

URL="$1"

# Parse URL: claude-session://start?plan=SESSION_10_PLAN&project=/path
PLAN=$(echo "$URL" | sed 's/.*plan=\([^&]*\).*/\1/')
PROJECT=$(echo "$URL" | sed 's/.*project=\([^&]*\).*/\1/')

# Launch session
cd "$PROJECT"
node dist/cli.js session start "$PLAN"
```

#### Step 3: Update Calendar Export
Modify `exportToIcal()` to include URL:

```typescript
description += `\n\n📱 One-Tap Start:\nclaud-session://start?plan=${planName}&project=${projectPath}`;
```

**Test**:
```bash
# Install handler
./scripts/install-url-handler.sh

# Test URL in browser
open "claude-session://start?plan=SESSION_10_PLAN&project=$PWD"

# Should open terminal and start session
```

---

### Phase 4: iPhone Integration (1 hour)

#### Option A: iOS Shortcuts (Recommended)
1. Create iOS Shortcut that:
   - Receives URL from calendar
   - Extracts plan name and project path
   - SSHs into Mac/laptop
   - Runs session start command

2. Test:
   - Tap calendar event URL on iPhone
   - iOS prompts "Open in Shortcuts?"
   - Shortcut runs, session starts on laptop

#### Option B: Email Trigger
1. Calendar event includes special email address
2. iPhone taps "Email organizer"
3. Email triggers server script
4. Server starts session

---

### Phase 5: Calendar Watcher Enhancement (30 min)

**Enhance existing watcher** to use SESSION plans:

**File**: `src/calendar-watcher.ts` (modify)

```typescript
private async triggerSession(session: CalendarEvent): Promise<void> {
  // Check if event has SESSION plan metadata
  const planName = session.extendedProperties?.private?.sessionPlan;

  if (planName) {
    // Launch using SESSION plan
    console.log(`🚀 Starting session from plan: ${planName}`);
    await this.launchFromSessionPlan(planName, session);
  } else {
    // Fall back to existing launcher
    await this.launchFromCalendarEvent(session);
  }
}

private async launchFromSessionPlan(
  planName: string,
  event: CalendarEvent
): Promise<void> {
  const planPath = findSessionPlan(planName);
  const plan = await parseSessionPlan(planPath);

  // Build enhanced prompt with SESSION objectives
  const prompt = buildPromptFromPlan(plan);

  // Launch with full context
  const launcher = new SessionLauncher();
  await launcher.launchSessionFromPlan(plan, prompt);
}
```

**Test**:
```bash
# Create calendar event with SESSION plan reference
node dist/cli.js calendar schedule ~/project --plan SESSION_10_PLAN

# Start watcher
node dist/cli.js calendar watch

# Wait for scheduled time
# Session should auto-start with SESSION_10 objectives
```

---

## Implementation Priority

### 🟢 Quick Win (30 min) - Start This Weekend
**Enhance iCal export with manual commands**
1. Modify `calendar-service.ts` to include SESSION plan commands in description
2. Export to iCal with full instructions
3. Import to iPhone
4. Can manually start sessions by reading calendar

**Deliverable**: Weekend-ready workflow where you can see what to do and copy/paste commands

---

### 🟡 Medium Effort (1-2 hours) - Next Week
**Add `session start` command**
1. Create `commands/session-start.ts`
2. Parse SESSION plan files
3. Launch with full objectives
4. Test end-to-end

**Deliverable**: One command to start any SESSION plan

---

### 🔵 Full Integration (2-3 hours) - Week After
**URL handlers + Calendar watcher**
1. Mac URL scheme handler
2. iOS Shortcuts integration
3. Enhanced calendar watcher
4. Full automation

**Deliverable**: One-tap session start from iPhone calendar

---

## Recommended Approach: Start Simple

### This Weekend (30 min implementation)

#### 1. Create Session Plan Command (15 min)
```bash
# New command in CLI
node dist/cli.js session start SESSION_10_PLAN

# Functionality:
# - Reads docs/planning/SESSION_10_PLAN.md
# - Extracts objectives
# - Launches Claude Code with instructions
```

#### 2. Enhanced Calendar Export (15 min)
```bash
# Modified calendar export includes:
# - Full SESSION plan objectives in description
# - Command to start: "node dist/cli.js session start SESSION_X"
# - Manual workflow instructions

node dist/cli.js calendar export sessions.ics
```

#### 3. Weekend Workflow
1. **Friday**: Export calendar to iPhone
2. **Saturday morning**: Check calendar for SESSION_10
3. **On laptop**: Run `node dist/cli.js session start SESSION_10_PLAN`
4. **Session starts** with all objectives loaded automatically
5. **Track progress** using dashboard

### Next Week (Automation)
- Add URL handlers for one-tap start
- Enhance calendar watcher to auto-start from SESSION plans
- Test full automation workflow

---

## Test Checklist

### Basic Integration ✓
- [ ] Can parse SESSION plan markdown
- [ ] Can extract objectives and metadata
- [ ] Can generate calendar events from plans
- [ ] Can export to iCal with instructions
- [ ] Can import to iPhone calendar
- [ ] Can manually start session from laptop

### Enhanced Integration
- [ ] One command starts session with plan objectives
- [ ] Calendar watcher auto-starts from SESSION plans
- [ ] Dashboard shows SESSION plan progress
- [ ] iPhone shows clear next steps

### Advanced Integration
- [ ] URL scheme works on Mac
- [ ] iOS Shortcuts integration works
- [ ] One-tap start from iPhone calendar
- [ ] Full automation end-to-end

---

## Files to Create/Modify

### New Files
- [ ] `src/session-plan-mapper.ts` - Parse SESSION plans
- [ ] `src/commands/session-start.ts` - Start session from plan
- [ ] `scripts/install-url-handler.sh` - Mac URL handler
- [ ] `scripts/handle-session-url.sh` - Process session URLs

### Modified Files
- [ ] `src/calendar-service.ts` - Enhanced iCal export
- [ ] `src/calendar-watcher.ts` - SESSION plan integration
- [ ] `src/cli.ts` - Add `session start` command
- [ ] `src/session-launcher.ts` - Launch from plan file

---

## Success Metrics

**This Weekend**:
- ✅ Can view SESSION_10 objectives on iPhone calendar
- ✅ Can start session with one command from laptop
- ✅ Session loads with all objectives automatically

**Next Week**:
- ✅ One-tap URL launch on Mac
- ✅ Calendar watcher auto-starts with SESSION plans
- ✅ Full iPhone → laptop → session workflow

**Ultimate Goal**:
- ✅ Tap calendar event on iPhone → session starts on laptop
- ✅ No manual steps required
- ✅ SESSION plan objectives automatically loaded
- ✅ Progress tracked in real-time dashboard
