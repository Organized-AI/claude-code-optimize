# Visual Architecture: Native Workflows

## 🎯 The Complete System

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE OPTIMIZER v2.0                      │
│                        Native Workflows Edition                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  1. INITIALIZATION  │
│  (One-time setup)   │
└──────────┬──────────┘
           │
           ▼
    ┌─────────────┐
    │ User runs:  │
    │ /analyze-   │
    │  project    │
    └──────┬──────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Rule-Based TypeScript Analyzer          │
│  • Scans files recursively               │
│  • Calculates complexity (heuristics)    │
│  • Estimates hours (formulas)            │
│  • Generates phases                      │
└──────────┬───────────────────────────────┘
           │
           ├─────────────────┬──────────────────┐
           │                 │                  │
           ▼                 ▼                  ▼
  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
  │  CLAUDE.md  │   │ session-     │   │ Specialized │
  │             │   │ plan.json    │   │ Agents      │
  │ Project     │   │              │   │             │
  │ guidance    │   │ Phase specs  │   │ 4 .md files │
  │ for Claude  │   │ Token budgets│   │ per phase   │
  └─────────────┘   └──────────────┘   └─────────────┘

─────────────────────────────────────────────────────────────────────

┌─────────────────────┐
│  2. SESSION START   │
│  (Manual or Auto)   │
└──────────┬──────────┘
           │
           ├──────────────────┬──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ Manual:  │      │ GitHub   │      │ Slash    │
    │ claude   │      │ Actions  │      │ Command  │
    │ --agent  │      │ cron →   │      │ /start-  │
    │ file.md  │      │ issue +  │      │ session  │
    │          │      │ @claude  │      │          │
    └────┬─────┘      └────┬─────┘      └────┬─────┘
         │                 │                 │
         └────────┬────────┴────────┬────────┘
                  │                 │
                  ▼                 │
         ┌────────────────┐         │
         │ CLAUDE CODE    │         │
         │ SESSION STARTS │         │
         └────────┬───────┘         │
                  │                 │
                  ▼                 │
         ┌────────────────┐         │
         │ SessionStart   │◄────────┘
         │ Hook Triggers  │
         └────────┬───────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │ Hook displays project context:  │
    │ • Complexity: 7/10               │
    │ • Estimated: 24 hours            │
    │ • Tech: React, TypeScript        │
    │ • Loads CLAUDE.md guidance       │
    └─────────────────────────────────┘

─────────────────────────────────────────────────────────────────────

┌─────────────────────┐
│  3. DURING SESSION  │
│  (Continuous)       │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Claude works on task │
    │ Uses tools: Edit,    │
    │ Read, Bash, etc.     │
    └──────────┬───────────┘
               │
               ├──────────────────┬──────────────────┐
               │                  │                  │
               ▼                  ▼                  ▼
      ┌────────────┐     ┌────────────┐     ┌────────────┐
      │ PreToolUse │     │ PostToolUse│     │ Notification│
      │ Hook       │     │ Hook       │     │ Hook       │
      │            │     │            │     │            │
      │ • Track    │     │ • Count    │     │ • Desktop  │
      │   usage    │     │   tokens   │     │   alerts   │
      │ • Enforce  │     │ • Calc cost│     │ • Warnings │
      │   limits   │     │ • Update   │     │            │
      │            │     │   log file │     │            │
      └────────────┘     └──────┬─────┘     └────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ session-log.json      │
                    │ {                     │
                    │   "totalTokens": 5K,  │
                    │   "estimatedCost": $1,│
                    │   "tools": {          │
                    │     "Edit": 42,       │
                    │     "Read": 18        │
                    │   }                   │
                    │ }                     │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ Dashboard (React)     │
                    │ • Watches log file    │
                    │ • Updates UI live     │
                    │ • Shows progress      │
                    │ • Token graphs        │
                    └───────────────────────┘

─────────────────────────────────────────────────────────────────────

┌─────────────────────┐
│  4. SESSION END     │
│  (Completion)       │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────────┐
    │ SessionEnd Hook  │
    │ • Finalize log   │
    │ • Calculate      │
    │   final stats    │
    │ • Mark phase     │
    │   complete       │
    └──────────┬───────┘
               │
               ▼
    ┌──────────────────────────┐
    │ GitHub Actions Workflow  │
    │ (if auto-triggered)      │
    │ • Close issue            │
    │ • Update progress        │
    │ • Commit changes         │
    │ • Trigger next phase?    │
    └──────────────────────────┘
```

---

## 🔄 Workflow Sequence Diagram

### Full Project Lifecycle

```
Developer                 CLI                Slash Cmd           Hooks              GitHub Actions
    │                     │                     │                  │                       │
    │  cd project-dir     │                     │                  │                       │
    │──────────────────>  │                     │                  │                       │
    │                     │                     │                  │                       │
    │  /analyze-project   │                     │                  │                       │
    │────────────────────────────────────────>  │                  │                       │
    │                     │                     │                  │                       │
    │                     │   Run analyzer.ts   │                  │                       │
    │                     │  <──────────────────│                  │                       │
    │                     │                     │                  │                       │
    │                     │   Create files:     │                  │                       │
    │                     │   • session-plan    │                  │                       │
    │                     │   • CLAUDE.md       │                  │                       │
    │                     │  ──────────────────>│                  │                       │
    │                     │                     │                  │                       │
    │  /create-agents     │                     │                  │                       │
    │────────────────────────────────────────>  │                  │                       │
    │                     │                     │                  │                       │
    │                     │   Generate 4 agents │                  │                       │
    │                     │  <──────────────────│                  │                       │
    │                     │                     │                  │                       │
    │  /setup-hooks       │                     │                  │                       │
    │────────────────────────────────────────>  │                  │                       │
    │                     │                     │                  │                       │
    │                     │   Install hooks     │                  │                       │
    │                     │  ────────────────────────────────────> │                       │
    │                     │                     │                  │                       │
    │  claude --agent     │                     │                  │                       │
    │  planning-agent.md  │                     │                  │                       │
    │─────────────────────────────────────────────────────────────>│                       │
    │                     │                     │                  │                       │
    │                     │                     │  SessionStart    │                       │
    │                     │                     │  hook executes   │                       │
    │                     │                     │  <───────────────│                       │
    │                     │                     │                  │                       │
    │  [Session active]   │                     │                  │                       │
    │                     │                     │                  │                       │
    │                     │                     │  Tool hooks fire │                       │
    │                     │                     │  continuously    │                       │
    │                     │                     │  <───────────────│                       │
    │                     │                     │                  │                       │
    │  [Complete phase]   │                     │                  │                       │
    │─────────────────────────────────────────────────────────────────────────────────────>│
    │                     │                     │                  │   Close issue         │
    │                     │                     │                  │   Update progress     │
    │                     │                     │                  │  <────────────────────│
    │                     │                     │                  │                       │
    │                     │                     │                  │   Trigger next phase  │
    │                     │                     │                  │   (scheduled)         │
    │                     │                     │                  │  ───────────────────> │
```

---

## 📂 File System Layout

```
your-project/
│
├── .claude/                              # Claude Code configuration
│   │
│   ├── commands/                         # Slash commands (user-defined)
│   │   ├── analyze-project               # Main analysis command
│   │   ├── create-session-agents         # Agent generator
│   │   └── setup-hooks                   # Hook installer
│   │
│   ├── agents/                           # Specialized agent configs
│   │   ├── planning-agent.md             # Phase 1 agent
│   │   ├── implementation-agent.md       # Phase 2 agent
│   │   ├── testing-agent.md              # Phase 3 agent
│   │   └── polish-agent.md               # Phase 4 agent
│   │
│   ├── session-plan.json                 # Generated analysis
│   │   {
│   │     "complexity": 7,
│   │     "estimatedHours": 24,
│   │     "phases": [...],
│   │     "technologies": [...]
│   │   }
│   │
│   └── session-log.json                  # Runtime tracking
│       {
│         "startTime": 1234567890,
│         "totalTokens": 45230,
│         "estimatedCost": 2.47,
│         "tools": { "Edit": 42, ... }
│       }
│
├── .github/                              # GitHub Actions
│   └── workflows/
│       ├── claude-scheduler.yml          # Session scheduling
│       └── session-complete.yml          # Completion tracking
│
├── CLAUDE.md                             # Project guidance for Claude
│   # Generated from analysis
│   # Contains objectives, tech stack, risks
│
├── src/                                  # Your project code
│   └── ...
│
└── node_modules/
    └── claude-code-optimizer/            # NPM package
        ├── dist/
        │   ├── analyzer.js               # Rule-based analyzer
        │   ├── generate-claude-md.js     # CLAUDE.md generator
        │   ├── create-agents.js          # Agent creator
        │   └── cli.js                    # CLI commands
        │
        └── hooks/                        # Hook templates
            ├── session-start.sh
            ├── pre-tool-use.sh
            ├── post-tool-use.sh
            └── notification.sh

~/.claude/                                # Global Claude settings
├── hooks/                                # Installed hooks
│   ├── session-start.sh                  # Copied from package
│   ├── pre-tool-use.sh
│   ├── post-tool-use.sh
│   └── notification.sh
│
└── settings.json                         # Hook registrations
    {
      "hooks": {
        "SessionStart": "~/.claude/hooks/session-start.sh",
        "PreToolUse": "~/.claude/hooks/pre-tool-use.sh",
        "PostToolUse": "~/.claude/hooks/post-tool-use.sh"
      }
    }
```

---

## 🎭 Agent Specialization Flow

```
                        ┌──────────────────────┐
                        │  Project Analysis    │
                        │  Complexity: 7/10    │
                        │  Est. Time: 24 hours │
                        └──────────┬───────────┘
                                   │
                   ┌───────────────┼───────────────┐
                   │               │               │
                   ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ Planning     │  │ Implement    │  │ Testing      │
         │ Agent        │  │ Agent        │  │ Agent        │
         ├──────────────┤  ├──────────────┤  ├──────────────┤
         │ Role:        │  │ Role:        │  │ Role:        │
         │ Architect    │  │ Developer    │  │ QA Engineer  │
         ├──────────────┤  ├──────────────┤  ├──────────────┤
         │ Model: Opus  │  │ Model: Sonnet│  │ Model: Sonnet│
         ├──────────────┤  ├──────────────┤  ├──────────────┤
         │ Budget:      │  │ Budget:      │  │ Budget:      │
         │ 72K tokens   │  │ 270K tokens  │  │ 135K tokens  │
         ├──────────────┤  ├──────────────┤  ├──────────────┤
         │ Tools:       │  │ Tools:       │  │ Tools:       │
         │ Read, Glob   │  │ Edit, Write  │  │ Edit, Bash   │
         │ Grep, Bash   │  │ Read, Bash   │  │ Read         │
         ├──────────────┤  ├──────────────┤  ├──────────────┤
         │ Objectives:  │  │ Objectives:  │  │ Objectives:  │
         │ • Architecture│ │ • Features   │  │ • Tests      │
         │ • Roadmap    │  │ • Integration│  │ • Bug fixes  │
         │ • Setup      │  │ • Utilities  │  │ • Integration│
         └──────────────┘  └──────────────┘  └──────────────┘
                   │               │               │
                   └───────────────┼───────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Session Complete    │
                        │  • All phases done   │
                        │  • Tests passing     │
                        │  • Docs written      │
                        └──────────────────────┘
```

---

## 🔗 Hook Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE SESSION                      │
└─────────────────────────────────────────────────────────────┘

                        SESSION LIFECYCLE

    START                                            END
      │                                               │
      ▼                                               ▼
┌──────────┐                                    ┌──────────┐
│SessionStart                                   │SessionEnd│
│  Hook    │                                    │  Hook    │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ Inject context                                │ Finalize
     │ Display stats                                 │ Save results
     │ Initialize log                                │ Calculate totals
     │                                               │
     └─────────────────┬─────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Tool Execution │
              │   (repeated)   │
              └────────┬───────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │PreToolUse│  │ Tool Run │  │PostToolUse
  │  Hook    │  │          │  │  Hook    │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │             │             │
       │ Log usage   │ Execute     │ Count tokens
       │ Check limits│             │ Update cost
       │             │             │ Check budget
       │             │             │
       └─────────────┴─────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │Notification Hook│
            │  (conditional)  │
            └─────────┬───────┘
                      │
                      │ Desktop alert
                      │ Budget warning
                      │ Milestone reached
                      │
                      ▼
              [User sees alert]
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│ CLI Command │ claude-optimizer analyze ./project
└──────┬──────┘
       │
       ▼
┌───────────────────────┐
│  TypeScript Analyzer  │
│                       │
│  1. Scan files        │──────> [file-scanner.ts]
│  2. Calc complexity   │──────> [Heuristics + formulas]
│  3. Est. hours        │──────> [Based on complexity]
│  4. Generate phases   │──────> [4 phases template]
│                       │
└───────────┬───────────┘
            │
            ├─────────────────────┬──────────────────┐
            │                     │                  │
            ▼                     ▼                  ▼
    ┌──────────────┐     ┌──────────────┐   ┌──────────────┐
    │ session-     │     │  CLAUDE.md   │   │ 4 Agent      │
    │ plan.json    │     │              │   │ .md files    │
    └──────┬───────┘     └──────┬───────┘   └──────┬───────┘
           │                    │                   │
           │                    │                   │
           └────────────┬───────┴───────┬───────────┘
                        │               │
                        ▼               │
                ┌──────────────┐        │
                │ Claude Code  │        │
                │ Session      │        │
                └──────┬───────┘        │
                       │                │
                       │ Uses agent ────┘
                       │ Reads CLAUDE.md
                       │
                       ▼
              ┌─────────────────┐
              │ Hooks Execute   │
              │ During Session  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ session-log.json│
              │ (updated live)  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Dashboard Reads │
              │ (file watch)    │
              └─────────────────┘
```

---

## 🎯 Complete Example Flow

### Real-World Scenario

```
1. MONDAY MORNING
   ├─ Developer: /analyze-project
   ├─ Creates: session-plan.json, CLAUDE.md
   ├─ Developer: /create-session-agents
   └─ Creates: 4 agent files

2. MONDAY 9 AM (GitHub Actions triggers)
   ├─ Workflow creates issue: "Planning Phase"
   ├─ Issue body: "@claude start with planning-agent.md"
   └─ Claude Code detects @mention

3. CLAUDE SESSION STARTS
   ├─ SessionStart hook fires
   │  ├─ Reads session-plan.json
   │  ├─ Displays: "Complexity 7/10, 24 hours"
   │  └─ Loads CLAUDE.md guidance
   │
   ├─ Planning agent loaded
   │  ├─ Role: Software Architect
   │  ├─ Token budget: 72,000
   │  └─ Objectives: [Architecture, Roadmap, Setup]
   │
   └─ Claude works on objectives

4. DURING SESSION (every tool use)
   ├─ PreToolUse hook: Log tool name
   ├─ Tool executes: (Edit, Read, Bash, etc.)
   ├─ PostToolUse hook:
   │  ├─ Estimate tokens (+1000)
   │  ├─ Update session-log.json
   │  ├─ Calculate cost
   │  └─ Check budget (warn at 80%)
   │
   └─ Dashboard watches session-log.json
      └─ Updates UI in real-time

5. SESSION COMPLETES
   ├─ SessionEnd hook:
   │  ├─ Finalize session-log.json
   │  ├─ Calculate final stats
   │  └─ Mark planning phase complete
   │
   ├─ GitHub Actions detects completion
   │  ├─ Closes issue
   │  ├─ Updates progress: "1/4 phases done"
   │  └─ Commits session-log.json
   │
   └─ Notification: "Planning phase complete!"

6. TUESDAY 9 AM (Next phase auto-starts)
   ├─ GitHub Actions creates new issue
   ├─ Issue: "Implementation Phase"
   ├─ Mentions: @claude with implementation-agent.md
   └─ Cycle repeats...
```

---

## 🎓 Key Architectural Principles

### 1. **File-Based State**
```
Why: Simple, transparent, debuggable
How: JSON files + file watching
Not: WebSockets, databases, EventEmitters
```

### 2. **Shell-Script Automation**
```
Why: Universal, maintainable, transparent
How: Bash hooks + slash commands
Not: Complex TypeScript SDK wrappers
```

### 3. **Native Integration**
```
Why: Leverage Claude Code's strengths
How: Agents, hooks, slash commands
Not: Fighting the platform
```

### 4. **GitHub as Scheduler**
```
Why: Integrated with code, free, reliable
How: Actions + cron + issues
Not: Google Calendar API polling
```

### 5. **Rule-Based Analysis**
```
Why: Fast, deterministic, always works
How: Heuristics + formulas
Not: AI API calls
```

---

This architecture is **simpler**, **more reliable**, and **easier to maintain** than the SDK approach!
