# Claude Code Optimizer - Working Features & Tools

> Comprehensive documentation of implemented features and how they work

## 📑 Table of Contents

1. [Core Architecture](#core-architecture)
2. [Data Flow](#data-flow)
3. [Implemented Features](#implemented-features)
4. [Commands & CLI](#commands--cli)
5. [Database Schema](#database-schema)
6. [Integration with /context](#integration-with-context)
7. [How to Use This Data](#how-to-use-this-data)

---

## 🏗️ Core Architecture

### Technology Stack
- **Language**: TypeScript (compiled to JavaScript)
- **Runtime**: Node.js >= 18.0.0
- **Database**: SQLite (better-sqlite3)
- **CLI Framework**: Commander.js
- **UI Libraries**: Chalk, Ora (spinners), Inquirer (prompts)
- **External Integrations**: Google Calendar API, Claude Agent SDK, Socket.IO

### Project Structure
```
claude-optimizer-v2/
├── src/
│   ├── cli.ts                    # Main CLI entry point
│   ├── project-analyzer.ts       # AI-powered project analysis
│   ├── database.ts               # SQLite operations
│   ├── session-monitor.ts        # Real-time session tracking
│   ├── context-tracker.ts        # Context window monitoring (0-180k)
│   ├── quota-tracker.ts          # Quota tracking (5-hour windows)
│   ├── handoff-manager.ts        # Session handoff system
│   ├── session-memory.ts         # Long-term project memory
│   ├── token-estimator.ts        # ML-powered token estimation
│   ├── context-compactor.ts      # Context compression strategies
│   ├── calendar-service.ts       # Google Calendar integration
│   ├── calendar-watcher.ts       # Automated session scheduling
│   ├── websocket-server.ts       # Real-time dashboard updates
│   ├── server.ts                 # Express API server
│   ├── types.ts                  # TypeScript type definitions
│   ├── commands/                 # Standalone CLI commands
│   │   ├── plan-next-session.ts
│   │   ├── context-status.ts
│   │   ├── compact-context.ts
│   │   ├── save-and-restart.ts
│   │   └── estimate-session.ts
│   └── utils/
│       ├── file-scanner.ts       # Recursive file system scanner
│       └── oauth-helper.ts       # OAuth flow helper
├── tests/                        # Vitest test files
├── data/                         # SQLite database storage
└── dist/                         # Compiled JavaScript output
```

---

## 🔄 Data Flow

### 1. Project Analysis Flow
```
User Input (project path)
    ↓
File Scanner → Count files, detect languages
    ↓
Claude Agent SDK → Deep complexity analysis (Opus model)
    ↓
Analysis Result → Complexity score, time estimate, session plan
    ↓
SQLite Database → Cache for instant retrieval
    ↓
CLI Display → Formatted, colorful output
```

### 2. Session Monitoring Flow
```
Claude Code Session Starts
    ↓
sessions.jsonl updated (by Claude Code)
    ↓
SessionMonitor watches file changes
    ↓
QuotaTracker → Track token usage in 5-hour windows
    ↓
ContextTracker → Monitor context window (0-180k tokens)
    ↓
WebSocket Server → Push updates to dashboard
    ↓
Real-time notifications & alerts
```

### 3. Context Management Flow
```
/context command executed
    ↓
Context data available in conversation
    ↓
ContextTracker can parse and analyze
    ↓
Detect: usage %, breakdown, compaction opportunities
    ↓
Trigger: alerts, compaction suggestions, handoffs
    ↓
ML Model → Learn from session patterns
```

---

## ✨ Implemented Features

### 1. **AI-Powered Project Analysis** ✅

**File**: `src/project-analyzer.ts`

**What it does**:
- Scans entire project directory recursively
- Detects programming languages, frameworks, and technologies
- Uses Claude Opus via Agent SDK for deep complexity analysis
- Generates optimal session breakdown (planning, implementation, testing, polish)
- Provides time estimates and token budgets per phase

**How it works**:
1. File scanner counts files, calculates size, identifies languages
2. Technology detection via file extensions and package managers
3. Claude Agent SDK analyzes codebase with Read, Glob, Grep tools
4. AI returns complexity score (1-10), time estimate, session phases
5. Results cached in SQLite for instant future retrieval

**Commands**:
```bash
claude-optimizer analyze ./my-project
claude-optimizer show ./my-project
claude-optimizer list
```

---

### 2. **Session Quota Tracking** ✅

**File**: `src/quota-tracker.ts`

**What it does**:
- Tracks token usage across rolling 5-hour windows
- Monitors Claude's 1M token limit per 5-hour period
- Alerts when approaching 80% quota usage
- Suggests session planning to stay within limits

**How it works**:
1. Monitors `~/.claude/logs/sessions.jsonl` for session events
2. Parses tool_use events to extract token counts
3. Groups tokens into 5-hour rolling windows
4. Calculates remaining quota and time until reset
5. Stores tracking data in `~/.claude/quota-tracker.json`

**Data Structure**:
```typescript
interface QuotaWindow {
  windowStart: Date;
  windowEnd: Date;       // windowStart + 5 hours
  tokensUsed: number;
  sessions: string[];
  status: 'active' | 'expired';
}
```

---

### 3. **Context Window Monitoring** ✅

**File**: `src/context-tracker.ts`

**What it does**:
- Monitors per-session context usage (0-180k tokens of 200k limit)
- Provides breakdown: system prompt, file reads, tool results, conversation
- Identifies compaction opportunities
- Estimates hours remaining before context fills
- Three-tier alert system (warning/danger/critical)

**How it works**:
1. Tracks all context-consuming operations in session
2. Estimates token usage per operation type:
   - System prompt: ~5k tokens
   - File reads: 500-5k each
   - Tool results: 100-2k each
   - Conversation: 100-500 per exchange
3. Calculates total context usage and percentage
4. Identifies compactable items (old reads, duplicates)
5. Provides strategic compaction recommendations

**Thresholds**:
- 50% (90k) = ⚠️ Warning
- 80% (144k) = 🔥 Danger
- 90% (162k) = 🚨 Critical

**Commands**:
```bash
context-status           # View detailed context analysis
compact-context          # Free up context space
```

---

### 4. **Context Compaction System** ✅

**File**: `src/context-compactor.ts`

**What it does**:
- Three-level compaction strategy (soft/strategic/emergency)
- Identifies and removes redundant context
- Preserves critical information
- Frees up context space without losing functionality

**Compaction Levels**:

1. **Soft Compaction** (50-70% usage)
   - Remove old, unreferenced file reads
   - Clear duplicate tool outputs
   - Summarize verbose outputs

2. **Strategic Compaction** (70-85% usage)
   - Archive mid-session context to handoff file
   - Keep only recent conversation
   - Preserve key decisions and code

3. **Emergency Compaction** (85%+ usage)
   - Aggressive context clearing
   - Create comprehensive handoff
   - Restart session with clean slate

---

### 5. **Session Handoff System** ✅

**File**: `src/handoff-manager.ts`

**What it does**:
- Creates continuity between sessions when context is full
- Preserves important decisions, code, and context
- Generates handoff markdown files with structured information
- Integrates with session memory for long-term knowledge

**Handoff File Structure**:
```markdown
# Session Handoff - [Project Name]

## Session Overview
- Session ID: abc123
- Duration: 2.5 hours
- Tokens Used: 142,000 / 180,000 (79%)

## Key Accomplishments
- Feature X implemented
- Bug Y fixed
- Tests added

## Important Decisions
- Chose React over Vue due to...
- Database schema updated to...

## Code Changes
[Structured list of modified files]

## Next Steps
- Complete feature Z
- Add integration tests
- Deploy to staging

## Context Preservation
[Critical context that must carry forward]
```

**Commands**:
```bash
save-and-restart         # Create handoff and restart fresh session
```

---

### 6. **Session Memory System** ✅

**File**: `src/session-memory.ts`

**What it does**:
- Maintains long-term project knowledge across ALL sessions
- Cumulative tech stack detection
- Preserves all key decisions
- Tracks session history and outcomes
- Auto-injects memory into new sessions

**Storage Location**: `~/.claude/project-memory/{project-hash}.json`

**Memory Structure**:
```typescript
interface ProjectMemory {
  projectPath: string;
  projectName: string;
  totalSessions: number;
  sessions: SessionHistory[];
  cumulativeContext: {
    techStack: string[];
    architecture: string;
    testingFramework: string;
    buildSystem: string;
    keyDecisions: Decision[];
  };
}
```

**How it works**:
1. Automatically detects project from working directory
2. Loads cumulative memory at session start
3. Updates memory throughout session
4. Injects memory into handoffs automatically
5. Preserves knowledge indefinitely

---

### 7. **Token Estimation (ML-Powered)** ✅

**File**: `src/token-estimator.ts`

**What it does**:
- Predicts token usage for planned sessions
- Analyzes session plan markdown files
- Provides low/mid/high estimates
- Machine learning improves accuracy over time
- Checks if plan fits within quota

**How it works**:
1. Parse session plan markdown (phases, objectives, complexity)
2. Extract features: phase count, objective count, keywords
3. ML model predicts token range based on historical data
4. Adjusts estimates based on complexity indicators
5. Learns from actual usage to improve predictions

**Features Analyzed**:
- Number of phases
- Objectives per phase
- Complexity keywords (refactor, integration, migration)
- File count and codebase size
- Technology stack complexity

**Commands**:
```bash
estimate-session SESSION_PLAN.md
```

---

### 8. **Calendar Integration** ✅

**Files**: `src/calendar-service.ts`, `src/calendar-watcher.ts`

**What it does**:
- Google Calendar OAuth integration
- Auto-schedule sessions based on project analysis
- Calendar watcher for automated session starts
- Maps session phases to calendar events

**How it works**:
1. OAuth flow authenticates with Google Calendar
2. Creates events for each session phase
3. Adds descriptions with objectives and time blocks
4. Calendar watcher polls for upcoming events
5. Auto-launches sessions at scheduled times

**Commands**:
```bash
claude-optimizer calendar schedule ./project
claude-optimizer calendar list
claude-optimizer calendar watch
```

---

### 9. **Real-Time Dashboard** ✅

**Files**: `src/websocket-server.ts`, `src/server.ts`

**What it does**:
- WebSocket server for real-time updates
- Express API for data queries
- Live quota and context monitoring
- Dashboard visualization

**Endpoints**:
- `GET /api/quota` - Current quota status
- `GET /api/context` - Context window analysis
- `GET /api/sessions` - Session history
- `WebSocket /ws` - Real-time updates

**How it works**:
1. Server monitors quota and context trackers
2. Pushes updates via WebSocket when data changes
3. Dashboard displays live graphs and metrics
4. Notifications for threshold crossings

---

### 10. **Session Planning Assistant** ✅

**File**: `src/commands/plan-next-session.ts`

**What it does**:
- Automated session planning at 80% quota usage
- Analyzes remaining quota
- Suggests optimal session structure
- Creates time-boxed objectives

**Triggered when**:
- 80% of 5-hour quota used (~800k tokens)
- Manual command execution
- Context nearing capacity

**Output**:
- Recommended session duration
- Suggested objectives within quota
- Risk assessment
- Handoff preparation checklist

**Commands**:
```bash
plan-next-session
```

---

## 🖥️ Commands & CLI

### Main Commands

```bash
# Project Analysis
claude-optimizer analyze <path>      # Analyze project complexity
claude-optimizer list                # List all analyzed projects
claude-optimizer show <path>         # Show specific project analysis
claude-optimizer delete <path>       # Remove project from database

# Session Management
claude-optimizer status              # Show quota + context status
plan-next-session                    # Plan next session (at 80% quota)
context-status                       # Detailed context window analysis
compact-context                      # Free up context space
save-and-restart                     # Create handoff and restart
estimate-session <plan.md>           # Estimate tokens for session plan

# Calendar Integration
claude-optimizer calendar schedule <path>  # Schedule sessions
claude-optimizer calendar list            # View upcoming sessions
claude-optimizer calendar watch           # Auto-start scheduled sessions
```

### Binary Commands (package.json)

These are standalone executables defined in `bin`:

```json
{
  "claude-optimizer": "./dist/cli.js",
  "plan-next-session": "./dist/commands/plan-next-session.js",
  "context-status": "./dist/commands/context-status.js",
  "compact-context": "./dist/commands/compact-context.js",
  "save-and-restart": "./dist/commands/save-and-restart.js",
  "estimate-session": "./dist/commands/estimate-session.js"
}
```

---

## 🗄️ Database Schema

### SQLite Tables

**File**: `src/database.ts`

#### 1. `projects`
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  complexity INTEGER,
  estimated_hours REAL,
  file_count INTEGER,
  total_size INTEGER,
  has_tests BOOLEAN,
  has_docs BOOLEAN,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### 2. `technologies`
```sql
CREATE TABLE technologies (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  name TEXT NOT NULL,
  category TEXT,  -- 'language', 'framework', 'tool'
  FOREIGN KEY (project_id) REFERENCES projects(id)
)
```

#### 3. `session_phases`
```sql
CREATE TABLE session_phases (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  phase_number INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  estimated_hours REAL,
  model TEXT,           -- 'opus' or 'sonnet'
  token_budget INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
)
```

#### 4. `phase_objectives`
```sql
CREATE TABLE phase_objectives (
  id INTEGER PRIMARY KEY,
  phase_id INTEGER,
  objective TEXT NOT NULL,
  FOREIGN KEY (phase_id) REFERENCES session_phases(id)
)
```

#### 5. `risk_factors`
```sql
CREATE TABLE risk_factors (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  risk_type TEXT,       -- 'technical', 'complexity', 'dependencies'
  description TEXT,
  mitigation TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
)
```

### JSON Data Files

#### 1. `~/.claude/quota-tracker.json`
```json
{
  "windows": [
    {
      "windowStart": "2025-01-06T10:00:00Z",
      "windowEnd": "2025-01-06T15:00:00Z",
      "tokensUsed": 450000,
      "sessions": ["abc123", "def456"],
      "status": "active"
    }
  ],
  "currentWindow": { /* active window */ }
}
```

#### 2. `~/.claude/context-tracker.json`
```json
{
  "sessionId": "abc123",
  "fileReadsTokens": 25000,
  "toolResultsTokens": 12000,
  "conversationTokens": 8000,
  "codeGeneratedTokens": 15000,
  "operations": [
    {
      "type": "file_read",
      "file": "src/app.ts",
      "tokens": 1200,
      "timestamp": "2025-01-06T10:30:00Z"
    }
  ]
}
```

#### 3. `~/.claude/project-memory/{hash}.json`
```json
{
  "projectPath": "/path/to/project",
  "projectName": "my-project",
  "totalSessions": 5,
  "sessions": [
    {
      "sessionId": "abc123",
      "startTime": "2025-01-06T10:00:00Z",
      "duration": 2.5,
      "tokensUsed": 120000,
      "objectives": ["Build feature X"],
      "outcomes": ["Feature X completed"]
    }
  ],
  "cumulativeContext": {
    "techStack": ["TypeScript", "React", "Node.js"],
    "architecture": "Web Application",
    "keyDecisions": [
      {
        "decision": "Use Zustand for state management",
        "rationale": "Lighter than Redux, simpler API",
        "session": "abc123"
      }
    ]
  }
}
```

---

## 🔗 Integration with /context

### How /context Data is Captured

The `/context` command in Claude Code provides structured information about:
- **Context usage**: Total tokens, percentage used
- **Breakdown**: System prompt, tools, memory files, messages
- **Free space**: Remaining capacity

**Example /context output**:
```
⛶ ⛶ ⛶ ⛶   Context Usage
⛶ ⛶ ⛶ ⛶   claude-sonnet-4-5-20250929 • 18k/200k tokens (9%)
⛶ ⛶ ⛶ ⛶
⛶ ⛶ ⛶ ⛶   ⛁ System prompt: 3.8k tokens (1.9%)
⛶ ⛶ ⛶ ⛶   ⛁ System tools: 11.4k tokens (5.7%)
⛶ ⛶ ⛶ ⛶   ⛁ Memory files: 184 tokens (0.1%)
⛶ ⛶ ⛶ ⛶   ⛁ Messages: 3.0k tokens (1.5%)
⛶ ⛶ ⛶ ⛶   ⛶ Free space: 182k (91.5%)
```

### Parsing Strategy

The ContextTracker can parse this output to:
1. Extract total tokens and percentage
2. Parse breakdown by category
3. Identify free space
4. Calculate consumption rate
5. Trigger alerts and compaction

### Integration Points

**1. Real-Time Monitoring**
```typescript
// User runs /context
// Output appears in conversation
// ContextTracker parses structured data
// Updates internal tracking
// Triggers alerts if needed
```

**2. Automated Commands**
```typescript
// At 50% context: Suggest soft compaction
// At 80% context: Recommend strategic compaction
// At 90% context: Trigger emergency handoff
```

**3. Dashboard Updates**
```typescript
// Parse /context output
// Push via WebSocket to dashboard
// Display real-time graph
// Show compaction opportunities
```

---

## 💡 How to Use This Data

### For Development

1. **Feature Planning**: Use project analyzer to estimate new features
2. **Session Structuring**: Break work into quota-friendly chunks
3. **Context Management**: Monitor and compact proactively
4. **Knowledge Preservation**: Let session memory track decisions

### For Automation

1. **Calendar Integration**: Auto-schedule based on analysis
2. **Quota Alerts**: Receive notifications at 80% usage
3. **Context Alerts**: Get warned before hitting limits
4. **ML Learning**: Token estimator improves over time

### For Analytics

1. **Query Database**: SQL queries on project history
2. **Export Data**: JSON files for external tools
3. **Dashboard Visualization**: Real-time graphs and metrics
4. **Pattern Detection**: ML model identifies usage patterns

### Example Workflows

**Workflow 1: Start New Project**
```bash
# 1. Analyze project
claude-optimizer analyze ./my-new-project

# 2. Schedule sessions
claude-optimizer calendar schedule ./my-new-project

# 3. Enable watching
claude-optimizer calendar watch

# 4. Work automatically starts at scheduled times!
```

**Workflow 2: Mid-Session Context Management**
```bash
# 1. Check context status
context-status

# 2. If warning (50%+), soft compact
compact-context

# 3. If danger (80%+), strategic compact
compact-context --strategic

# 4. If critical (90%+), save and restart
save-and-restart
```

**Workflow 3: Plan Next Session**
```bash
# 1. Check quota
claude-optimizer status

# 2. If 80%+, plan next session
plan-next-session

# 3. Estimate token usage
estimate-session NEXT_SESSION_PLAN.md

# 4. Schedule if fits quota
claude-optimizer calendar schedule ./project
```

---

## 🎯 Key Insights

### Dual Tracking System

The optimizer tracks TWO separate constraints:

1. **Quota Tracking** (5-hour rolling windows)
   - Limit: 1M tokens per 5 hours
   - Tracks across multiple sessions
   - Resets on rolling 5-hour basis

2. **Context Tracking** (per-session window)
   - Limit: 180k tokens (90% of 200k)
   - Resets with new session
   - Tracks conversation context only

**Critical Understanding**: You can hit context limit BEFORE hitting quota limit!

### ML Learning Loop

The token estimator creates a learning loop:
1. Estimate tokens for session plan
2. Execute session and track actual usage
3. Calculate variance (estimate vs. actual)
4. Update ML model with new data point
5. Next estimate is more accurate

Over time, estimates become highly accurate for your coding patterns.

### Memory Persistence

Session memory is the "long-term brain":
- Quota tracking = short-term (5 hours)
- Context tracking = medium-term (one session)
- Session memory = long-term (forever)

All decisions, tech stack, architecture preserved across ALL sessions.

---

## 📊 Status Summary

### ✅ Fully Implemented (Sessions 1-5)
- Project analysis with Claude Agent SDK
- SQLite database with full schema
- Quota tracking (5-hour windows)
- Context window monitoring (0-180k)
- Three-level compaction system
- Session handoff system
- Session memory (long-term knowledge)
- Calendar integration
- WebSocket dashboard
- Real-time notifications

### 🚧 In Progress (Session 6)
- Token estimation ML model (Session 6A)
- Enhanced automation (Session 6B)

### 📋 Planned (Session 7+)
- Advanced analytics dashboard
- Multi-project workspace tracking
- Team collaboration features
- CI/CD integration

---

## 🔍 Technical Details

### Dependencies
```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",      // SQLite database
    "chalk": "^5.3.0",                // Terminal colors
    "commander": "^12.0.0",           // CLI framework
    "express": "^5.1.0",              // API server
    "googleapis": "^161.0.0",         // Google Calendar
    "inquirer": "^9.2.0",             // Interactive prompts
    "ora": "^8.0.0",                  // Spinners
    "socket.io": "^4.8.1"             // WebSocket
  }
}
```

### Build Process
```bash
npm run build        # Compile TypeScript to JavaScript
npm run dev          # Watch mode for development
npm test             # Run Vitest tests
npm run test:ui      # Vitest UI dashboard
```

### File Locations
- **Database**: `./data/claude-optimizer.db`
- **Quota Tracker**: `~/.claude/quota-tracker.json`
- **Context Tracker**: `~/.claude/context-tracker.json`
- **Session Memory**: `~/.claude/project-memory/{hash}.json`
- **Session Logs**: `~/.claude/logs/sessions.jsonl`

---

## 🚀 Next Steps

To leverage this documentation:

1. **Read the code**: Use file references to explore implementations
2. **Query the database**: SQL queries for project insights
3. **Extend features**: Build on existing architecture
4. **Integrate tools**: Use /context data for automation
5. **Analyze patterns**: ML model for usage optimization

---

*Last Updated: Session 5 Complete*
*Status: All core features operational and tested*