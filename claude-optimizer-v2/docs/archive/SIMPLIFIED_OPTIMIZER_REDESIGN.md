# Claude Code Optimizer: Simplified Redesign

## 🎯 Vision: Best of Both Worlds

**Goal**: Combine the simplicity of Maciek's Monitor + cc-statusline with your unique calendar automation, while dramatically reducing complexity.

**Tagline**: *"One command. Smart tracking. Automated scheduling."*

---

## 🔄 Simplification Strategy

### **Before (Current Architecture)**
```
❌ Too Complex:
├── Moonlock Dashboard (React app)
├── Multiple databases (SQLite + Supabase + JSON)
├── Separate dashboard server
├── WebSocket management
├── Session tracker scripts
├── 20+ specialized agents
├── Manual setup process
└── Multiple configuration files
```

### **After (Simplified Architecture)**
```
✅ Simple & Focused:
├── Single CLI tool (npx installable)
├── One SQLite database
├── Built-in statusline (like cc-statusline)
├── Real-time terminal UI (like Maciek)
├── Google Calendar integration (UNIQUE)
└── Optional web dashboard (single HTML file)
```

---

## 📦 Simplified Tool: `claude-optimizer`

### **Installation: One Command**

```bash
# Install globally
npm install -g claude-optimizer

# Or use directly
npx claude-optimizer init
```

### **First-Time Setup: 3 Questions**

```bash
┌─────────────────────────────────────────┐
│  🌙 Claude Optimizer Setup              │
├─────────────────────────────────────────┤
│  1. Claude API Key: [Enter key]         │
│  2. Google Calendar? [Y/n]              │
│  3. Working hours: [9am-5pm]            │
└─────────────────────────────────────────┘

✅ Configuration saved to ~/.claude-optimizer/config.json
✅ Database initialized at ~/.claude-optimizer/sessions.db
✅ Calendar sync enabled
✅ Ready to use!

Try: claude-optimizer start
```

---

## 🛠️ Core Features (Simplified)

### **Feature 1: Smart Session Tracking**

Inspired by **Maciek's Monitor**, but simpler:

```bash
# Start tracking
claude-optimizer start

┌─────────────────────────────────────────────────────────────┐
│  🌙 Claude Session Active                                   │
├─────────────────────────────────────────────────────────────┤
│  ⏱️  Time: 1h 23m / 5h 00m remaining  ████████░░  28%      │
│  🎯 Tokens: 45,320 / 150,000           ████░░░░░░  30%      │
│  💰 Cost: $2.34 / $10.00 budget        ████░░░░░░  23%      │
│  📊 Rate: 560 tokens/min (normal)                           │
│                                                              │
│  Model: Claude Sonnet 4                                     │
│  Phase: Implementation                                      │
│                                                              │
│  ⚠️  Warning: On track to use 70% of budget                │
│                                                              │
│  [P]ause  [S]top  [R]eport  [C]alendar                     │
└─────────────────────────────────────────────────────────────┘
```

**Key Improvements Over Current System:**
- ✅ Single terminal UI (no separate dashboard server)
- ✅ Real-time updates (no WebSocket complexity)
- ✅ ML predictions (like Maciek's P90)
- ✅ One SQLite database (no Supabase complexity)

### **Feature 2: Integrated Statusline**

Inspired by **cc-statusline**, but auto-configured:

```bash
# Enable statusline in Claude Code
claude-optimizer statusline enable

# Your Claude Code terminal now shows:
📁 ~/project  🌿 main  🤖 Sonnet 4  💰 $2.34  ⏱️ 1h 23m  🎯 45.3K tok
```

**Auto-configures** `.claude/settings.json` - no manual setup needed!

### **Feature 3: Calendar Integration** (UNIQUE!)

The killer feature no one else has:

```bash
# Analyze project and create calendar schedule
claude-optimizer schedule ./my-project

🔍 Analyzing project...
  ├── Complexity: 7/10 (Medium-High)
  ├── Estimated: 3 sessions × 4 hours
  └── Total: 12 hours of work

📅 Suggested schedule:
  Session 1: Monday 9am-1pm    (Planning + Setup)
  Session 2: Tuesday 9am-1pm   (Core Implementation)
  Session 3: Thursday 9am-1pm  (Testing + Polish)

Create calendar events? [Y/n] y

✅ 3 events created in Google Calendar
✅ Automated session start enabled
✅ 30-min reminders configured

Next session starts automatically on Monday at 9am!
```

**Auto-Start Feature:**
```bash
# When calendar event triggers:
🔔 Session starting in 5 minutes...
   Project: my-project
   Phase: Planning + Setup
   Duration: 4 hours

   Press Ctrl+C to cancel

[Starting in 5... 4... 3... 2... 1...]

✅ Session started!
```

---

## 🏗️ Simplified Architecture

### **File Structure: Minimal**

```
claude-optimizer/
├── package.json
├── src/
│   ├── cli.ts                    # Main CLI interface (200 lines)
│   ├── tracker.ts                # Session tracking logic (300 lines)
│   ├── calendar.ts               # Google Calendar integration (200 lines)
│   ├── statusline.ts             # Statusline generator (150 lines)
│   ├── predictor.ts              # ML predictions (200 lines)
│   ├── database.ts               # SQLite wrapper (150 lines)
│   └── ui.ts                     # Terminal UI components (250 lines)
├── templates/
│   └── dashboard.html            # Optional web view (single file)
└── README.md

Total: ~1,500 lines of code vs. current 10,000+
```

### **Technology Stack: Simpler**

| Component | Current (Complex) | New (Simple) | Why? |
|-----------|------------------|--------------|------|
| **CLI** | Multiple scripts | Single binary | Easier to use |
| **Database** | SQLite + Supabase + JSON | SQLite only | One source of truth |
| **UI** | React Dashboard | Terminal UI + HTML | No build process |
| **Server** | Express + WebSocket | None (file-based) | No server management |
| **Configuration** | Multiple files | Single JSON | Simpler setup |
| **Installation** | Manual | npm/npx | One command |

### **Data Storage: Single Database**

```sql
-- ~/.claude-optimizer/sessions.db

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_path TEXT,
  start_time INTEGER,
  end_time INTEGER,
  model TEXT,
  phase TEXT,
  tokens_used INTEGER,
  cost REAL,
  status TEXT -- 'active' | 'paused' | 'completed'
);

CREATE TABLE token_events (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  timestamp INTEGER,
  tokens INTEGER,
  operation TEXT,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  gcal_event_id TEXT,
  start_time INTEGER,
  duration INTEGER,
  auto_start BOOLEAN,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

-- That's it! Simple schema, powerful tracking
```

---

## 💻 Command Interface

### **Core Commands (Keep It Simple)**

```bash
# Start tracking a session
claude-optimizer start [--project ./path] [--model sonnet-4] [--budget 10]

# Schedule project sessions
claude-optimizer schedule <project-path>

# View current session status
claude-optimizer status

# Generate session report
claude-optimizer report [--format json|html|pdf]

# Configure calendar integration
claude-optimizer calendar setup

# Enable/disable statusline
claude-optimizer statusline [enable|disable]

# View historical analytics
claude-optimizer analytics [--period week|month]

# Interactive TUI mode
claude-optimizer ui
```

### **Advanced Features (Hidden Unless Needed)**

```bash
# Export session data
claude-optimizer export --to supabase

# Team mode (optional)
claude-optimizer team init

# Webhook integration (optional)
claude-optimizer webhook setup
```

---

## 🎨 User Interface Options

### **Option 1: Terminal UI (Primary)**

Like Maciek's rich terminal interface:

```bash
claude-optimizer ui

╔═══════════════════════════════════════════════════════════╗
║  🌙 Claude Code Optimizer                                 ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Active Session                                            ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ Project: my-awesome-app                              │ ║
║  │ Model: Sonnet 4          Phase: Implementation       │ ║
║  │ Started: 2 hours ago     Remaining: 3h 00m           │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Token Usage                                               ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ Current: 45,320 / 150,000        ▓▓▓▓░░░░  30%       │ ║
║  │ Rate: 560 tok/min (normal)                           │ ║
║  │ Predicted: 134,000 (↓16k saved)                      │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Cost Tracking                                             ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ Session: $2.34 / $10.00          ▓▓░░░░░░  23%       │ ║
║  │ Today: $8.45                                         │ ║
║  │ This Week: $34.22 / $100.00                          │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Next Calendar Event                                       ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ 📅 Tomorrow 9:00 AM - Testing Phase (4 hours)        │ ║
║  │ Auto-start: Enabled                                  │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  [P] Pause  [S] Stop  [C] Calendar  [R] Report  [Q] Quit ║
╚═══════════════════════════════════════════════════════════╝
```

### **Option 2: Web Dashboard (Optional)**

Single HTML file, opens in browser:

```bash
claude-optimizer dashboard

# Opens: http://localhost:8080/dashboard
# OR generates static HTML you can open
```

No build process, no server management, just a clean interface.

### **Option 3: Statusline (Auto-configured)**

```bash
# In Claude Code terminal:
📁 ~/project  🌿 main  🤖 Sonnet 4  ⏱️ 2h 34m  💰 $2.34  🎯 45.3K
```

---

## 📅 Calendar Integration: Deep Dive

### **Setup Flow: 2 Minutes**

```bash
claude-optimizer calendar setup

┌─────────────────────────────────────────────────┐
│  📅 Google Calendar Setup                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Opening Google OAuth in browser...          │
│  2. Please authorize Claude Optimizer           │
│  3. ✅ Authorization successful!                │
│                                                  │
│  Calendar: [Primary ▼]                          │
│  Auto-start sessions: [✓] Enabled               │
│  Reminder time: [30] minutes before             │
│  Working hours: 9am - 5pm                       │
│                                                  │
│  [Save Configuration]                           │
└─────────────────────────────────────────────────┘

✅ Calendar integration configured!
```

### **Scheduling Intelligence**

```typescript
class SmartScheduler {
  async scheduleProject(projectPath: string): Promise<CalendarSchedule> {
    // 1. Analyze project complexity
    const analysis = await this.analyzeProject(projectPath);

    // 2. Calculate optimal sessions
    const sessions = this.calculateSessions({
      complexity: analysis.complexity,
      estimatedHours: analysis.estimatedHours,
      userWorkingHours: config.workingHours,
      preferredSessionLength: 4, // hours
      maxSessionLength: 5  // Claude Code limit
    });

    // 3. Find optimal calendar slots
    const slots = await this.findAvailableSlots({
      sessions,
      calendar: googleCalendar,
      startDate: new Date(),
      endDate: addDays(new Date(), 14), // next 2 weeks
      avoidWeekends: true
    });

    // 4. Create events with smart descriptions
    return this.createCalendarEvents(sessions, slots);
  }

  private calculateSessions(params: {
    complexity: number;        // 1-10
    estimatedHours: number;    // total work hours
    userWorkingHours: string;  // "9am-5pm"
    preferredSessionLength: number;
    maxSessionLength: number;
  }): Session[] {
    const sessionCount = Math.ceil(
      params.estimatedHours / params.preferredSessionLength
    );

    return [
      { phase: 'Planning & Setup', hours: Math.min(2, params.estimatedHours * 0.2) },
      { phase: 'Core Implementation', hours: params.estimatedHours * 0.5 },
      { phase: 'Testing & Integration', hours: params.estimatedHours * 0.2 },
      { phase: 'Polish & Documentation', hours: params.estimatedHours * 0.1 }
    ].filter(s => s.hours >= 1); // Only sessions >= 1 hour
  }
}
```

### **Auto-Start Flow**

```bash
# Background daemon watches calendar
# When event approaches:

[2025-01-06 08:30:00] 📅 Session starting in 30 minutes
                       Project: my-awesome-app
                       Phase: Core Implementation
                       Duration: 4 hours

# Show system notification
# At start time:

[2025-01-06 09:00:00] 🚀 Starting session...

                       ✅ Project opened: my-awesome-app
                       ✅ Claude Code session started
                       ✅ Tracking enabled
                       ✅ Timer: 4h 00m remaining

# Terminal UI automatically opens
# Session begins automatically!
```

---

## 🚀 Migration Path: From Current to Simplified

### **Phase 1: Build New Simplified Tool** (Week 1)

```bash
# New project structure
claude-optimizer/
├── src/
│   ├── cli.ts          # New CLI interface
│   ├── tracker.ts      # Simplified from current system
│   ├── calendar.ts     # NEW: Google Calendar
│   └── database.ts     # Simplified SQLite only
```

**Keep from current:**
- ✅ Token tracking logic
- ✅ Session management concepts
- ✅ Cost calculation formulas
- ✅ 5-hour precision timer

**Remove:**
- ❌ React dashboard (replace with terminal UI)
- ❌ Supabase integration (SQLite only)
- ❌ WebSocket complexity
- ❌ Multiple configuration files
- ❌ Separate server processes

### **Phase 2: Add Calendar Integration** (Week 2)

```typescript
// calendar.ts - NEW MODULE
import { google } from 'googleapis';

export class CalendarIntegration {
  async setup(): Promise<void> {
    // OAuth flow
    // Save credentials
  }

  async scheduleProject(project: ProjectAnalysis): Promise<CalendarEvent[]> {
    // Create optimized session schedule
    // Insert into Google Calendar
    // Return event details
  }

  async watchEvents(): Promise<void> {
    // Watch for upcoming events
    // Trigger auto-start
  }
}
```

### **Phase 3: Polish & Release** (Week 3)

```bash
# Publish to npm
npm publish claude-optimizer

# Users can now:
npx claude-optimizer init
```

---

## 📊 Comparison: Current vs. Simplified

| Metric | Current | Simplified | Improvement |
|--------|---------|------------|-------------|
| **Installation** | 15+ steps | 1 command | 93% faster |
| **Configuration** | 5+ files | 1 JSON file | 80% simpler |
| **Lines of Code** | ~10,000 | ~1,500 | 85% reduction |
| **Dependencies** | 50+ packages | 15 packages | 70% fewer |
| **Memory Usage** | ~300MB | ~30MB | 90% lighter |
| **Startup Time** | 5-10 seconds | <1 second | 90% faster |
| **Learning Curve** | 2-3 hours | 5 minutes | 95% easier |
| **Database Setup** | SQLite + Supabase | SQLite only | 50% simpler |
| **Server Required** | Yes | No | ✅ Eliminated |
| **Calendar Feature** | ❌ None | ✅ Full integration | ∞ better |

---

## 🎯 Feature Comparison Matrix

| Feature | Current Tool | Maciek Monitor | cc-statusline | New Simplified | Winner |
|---------|-------------|----------------|---------------|----------------|--------|
| **Simple Install** | ❌ | ✅ | ✅ | ✅ | Simplified |
| **Terminal UI** | ❌ | ✅ | Statusline | ✅ Both | Simplified |
| **Real-time Tracking** | ✅ Dashboard | ✅ Terminal | ✅ Statusline | ✅ Terminal | = |
| **ML Predictions** | ⚠️ Basic | ✅ P90 | ❌ | ✅ P90/P99 | Simplified |
| **Cost Tracking** | ✅ | ✅ | ✅ | ✅ | = |
| **Multi-Provider** | ✅ | ❌ | ❌ | ✅ Optional | Simplified |
| **Calendar** | ❌ | ❌ | ❌ | ✅ | **Simplified** |
| **Auto-Start** | ❌ | ❌ | ❌ | ✅ | **Simplified** |
| **Web Dashboard** | ✅ Complex | ❌ | ❌ | ✅ Optional | Simplified |
| **Statusline** | ❌ | ❌ | ✅ | ✅ | Simplified |
| **Setup Time** | 15+ min | 2 min | 2 min | 2 min | Simplified |
| **Memory Usage** | 300MB | 50MB | 10MB | 30MB | **Simplified** |

**Result**: Simplified version wins on simplicity + unique calendar features!

---

## 🛠️ Implementation Plan

### **Week 1: Core CLI & Tracking**

**Day 1-2: CLI Foundation**
```bash
# Create project
mkdir claude-optimizer && cd claude-optimizer
npm init -y
npm install commander inquirer ora chalk better-sqlite3

# Build CLI structure
src/
  ├── cli.ts          # Command interface
  ├── config.ts       # Configuration management
  └── database.ts     # SQLite wrapper
```

**Day 3-4: Session Tracking**
```typescript
// tracker.ts
export class SessionTracker {
  async start(options: SessionOptions): Promise<Session>
  async pause(): Promise<void>
  async resume(): Promise<void>
  async stop(): Promise<SessionReport>
  getCurrentStatus(): SessionStatus
}
```

**Day 5: Terminal UI**
```typescript
// ui.ts - Simple blessed-based UI
export class TerminalUI {
  render(status: SessionStatus): void
  handleInput(): void
  showStats(): void
}
```

### **Week 2: Calendar Integration**

**Day 1-2: Google Calendar Setup**
```typescript
// calendar.ts
export class CalendarService {
  async authenticate(): Promise<void>
  async createEvent(event: SessionEvent): Promise<string>
  async listUpcoming(): Promise<SessionEvent[]>
}
```

**Day 3-4: Smart Scheduling**
```typescript
// scheduler.ts
export class SmartScheduler {
  async analyzeProject(path: string): Promise<ProjectAnalysis>
  async generateSchedule(analysis: ProjectAnalysis): Promise<Schedule>
  async findOptimalSlots(): Promise<TimeSlot[]>
}
```

**Day 5: Auto-Start System**
```typescript
// daemon.ts
export class SessionDaemon {
  async watchCalendar(): Promise<void>
  async triggerAutoStart(event: SessionEvent): Promise<void>
}
```

### **Week 3: Polish & Release**

**Day 1-2: ML Predictions**
```typescript
// predictor.ts
export class UsagePredictor {
  predictSessionDuration(context: ProjectContext): Prediction
  predictCost(session: SessionPlan): CostPrediction
  calculateP90P99(history: SessionHistory[]): Statistics
}
```

**Day 3: Statusline Integration**
```typescript
// statusline.ts
export class StatuslineGenerator {
  generate(status: SessionStatus): string
  configureClaudeCode(): void
}
```

**Day 4-5: Testing & Documentation**
- Integration tests
- README with examples
- Video walkthrough
- npm publish

---

## 📚 Documentation Structure

### **README.md (Simple & Clear)**

```markdown
# Claude Optimizer 🌙

> The simplest way to track Claude Code sessions with automated calendar scheduling

## Install

```bash
npx claude-optimizer init
```

## Use

```bash
# Start a session
claude-optimizer start

# Schedule a project
claude-optimizer schedule ./my-project

# View status
claude-optimizer status
```

## Features

✅ One-command install
✅ Real-time terminal UI
✅ Google Calendar integration
✅ Auto-start sessions
✅ ML-powered predictions
✅ Cost tracking

That's it!
```

---

## 🎉 Success Metrics

### **Adoption Goals**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Install time** | <2 minutes | User testing |
| **First session** | <5 minutes | Time from install to first tracked session |
| **Learning curve** | <10 minutes | User can use all core features |
| **Calendar setup** | <3 minutes | OAuth to first event created |
| **Memory footprint** | <50MB | Process monitoring |
| **npm downloads** | 1,000+/month | npm stats |

### **User Satisfaction**

- ✅ "Just works" out of the box
- ✅ No manual configuration needed
- ✅ Calendar integration is killer feature
- ✅ Terminal UI is fast and informative
- ✅ Predictions are accurate

---

## 🚀 Go-to-Market Strategy

### **Positioning**

**Tagline**: *"Claude Optimizer: One command. Smart tracking. Automated scheduling."*

**Elevator Pitch**:
> "Stop manually tracking your Claude Code sessions. Claude Optimizer gives you real-time usage tracking, ML-powered predictions, and automatic calendar scheduling—all in one simple command."

### **Marketing Channels**

1. **npm Registry** - Primary distribution
2. **GitHub** - Open source, community-driven
3. **Reddit** - r/ClaudeAI, r/OpenAI
4. **Twitter/X** - Developer community
5. **Product Hunt** - Launch announcement

### **Differentiation**

| Competitor | Weakness | Our Strength |
|------------|----------|--------------|
| Maciek Monitor | No calendar, complex setup | ✅ Calendar + 1-command install |
| cc-statusline | Only statusline, no tracking | ✅ Full tracking + statusline |
| Manual tracking | Time-consuming, error-prone | ✅ Automated, accurate |

---

## ✅ Next Steps

1. **Create new `claude-optimizer` repository**
2. **Build Week 1 deliverables** (CLI + tracking)
3. **Add Week 2 features** (Calendar integration)
4. **Polish in Week 3** (ML + statusline)
5. **Publish to npm**
6. **Launch on Product Hunt**

**Should I start building the simplified version? I can begin with the CLI foundation and session tracking module.**
