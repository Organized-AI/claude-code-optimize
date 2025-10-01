# Claude Code Optimizer v2.0 - Corrected Implementation Plan

## 🎯 Project Overview

**Goal**: Build a simplified Claude Code optimizer with calendar-driven session automation using **shell automation** (NOT Claude Agent SDK).

**Timeline**: 3 sessions × 5 hours = 15 hours total
**Token Budget**: ~300 prompts (100 per session)
**Model Mix**: 70% Sonnet, 30% Opus for complex logic

## ⚠️ CRITICAL ARCHITECTURE CLARIFICATION

### ❌ WRONG APPROACH (Previous Plan)
- Use Claude Agent SDK to programmatically control Claude Code sessions
- Use `query()` from SDK to run sessions
- Try to manage sessions through SDK

### ✅ CORRECT APPROACH (This Plan)
- **Project Analyzer**: Rule-based file scanning (NO AI needed)
- **Calendar Integration**: Google Calendar API for scheduling
- **Calendar Watcher**: Background daemon polling calendar
- **Session Starter**: Shell/AppleScript automation to open Terminal and run `claude`
- **Dashboard Monitor**: Watch Claude Code log files (JSONL parsing)

**Key Insight**: Claude Agent SDK is for BUILDING custom AI agents, NOT for controlling Claude Code sessions!

---

## 📋 Session Breakdown

### **SESSION 1: Foundation & Project Analyzer** (5 hours)

**Objective**: Set up project structure and build rule-based project analysis system

**Token Allocation**: 60-80 prompts (mostly Sonnet - no complex AI needed)
- Setup & Dependencies: 15 prompts
- File Scanner Core: 20 prompts
- Heuristic Analysis: 15 prompts
- SQLite Database: 15 prompts
- Testing & CLI: 15 prompts

**Deliverables**:

1. **Project Structure**
   ```
   claude-optimizer/
   ├── package.json
   ├── tsconfig.json
   ├── src/
   │   ├── project-analyzer.ts      # ← Rule-based analysis
   │   ├── database.ts               # ← SQLite storage
   │   ├── types.ts                  # ← Type definitions
   │   ├── cli.ts                    # ← Command interface
   │   └── utils/
   │       ├── file-scanner.ts       # ← Recursive file scanning
   │       └── complexity-calc.ts    # ← Heuristic calculations
   ├── tests/
   └── README.md
   ```

2. **Core Functionality**
   - ✅ TypeScript project setup
   - ✅ File system scanning and analysis
   - ✅ Heuristic complexity calculation
   - ✅ Session phase generation (rule-based)
   - ✅ SQLite database schema
   - ✅ CLI command: `claude-optimizer analyze <path>`

3. **Project Analyzer Implementation (CORRECTED)**

```typescript
// src/project-analyzer.ts - CORRECT APPROACH

import { FileScanner, ProjectMetadata } from './utils/file-scanner';

export interface ProjectAnalysis {
  projectPath: string;
  complexity: number;        // 1-10 scale (calculated via heuristics)
  estimatedHours: number;    // Rule-based estimation
  phases: SessionPhase[];    // Generated via rules
  technologies: string[];    // Detected from files
  fileCount: number;
  totalSizeKB: number;
  hasTests: boolean;
  hasDocs: boolean;
  riskFactors: string[];
  timestamp: Date;
}

export interface SessionPhase {
  name: string;
  description: string;
  estimatedHours: number;
  objectives: string[];
  suggestedModel: 'sonnet' | 'opus' | 'haiku';
  requiredTools: string[];
  tokenBudget: number;
}

export class ProjectAnalyzer {
  private fileScanner: FileScanner;

  constructor() {
    this.fileScanner = new FileScanner();
  }

  /**
   * Main analysis method - uses heuristics, NO AI
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    console.log('📊 Scanning project files...');
    const metadata = await this.fileScanner.scanProject(projectPath);

    console.log('🔢 Calculating complexity...');
    const complexity = this.calculateComplexity(metadata);

    console.log('⏱️  Estimating time...');
    const estimatedHours = this.estimateHours(metadata, complexity);

    console.log('📋 Generating session plan...');
    const phases = this.generateSessionPhases(estimatedHours, metadata);

    const risks = this.assessRisks(metadata);

    return {
      projectPath,
      complexity,
      estimatedHours,
      phases,
      technologies: metadata.technologies,
      fileCount: metadata.fileCount,
      totalSizeKB: metadata.totalSizeKB,
      hasTests: metadata.hasTests,
      hasDocs: metadata.hasDocs,
      riskFactors: risks,
      timestamp: new Date()
    };
  }

  /**
   * Calculate complexity using heuristics (NO AI)
   */
  private calculateComplexity(metadata: ProjectMetadata): number {
    let complexity = 1;

    // File count scoring
    if (metadata.fileCount < 10) complexity += 1;
    else if (metadata.fileCount < 50) complexity += 3;
    else if (metadata.fileCount < 200) complexity += 5;
    else complexity += 7;

    // Technology stack complexity
    if (metadata.technologies.length > 5) complexity += 2;
    else if (metadata.technologies.length > 3) complexity += 1;

    // Missing infrastructure
    if (!metadata.hasTests) complexity += 1;
    if (!metadata.hasDocs) complexity += 1;

    // Code size
    if (metadata.totalSizeKB > 1000) complexity += 1;

    // Architecture indicators
    if (metadata.hasMultipleLanguages) complexity += 1;
    if (metadata.hasMonorepo) complexity += 2;

    return Math.min(10, complexity);
  }

  /**
   * Estimate hours using rules (NO AI)
   */
  private estimateHours(metadata: ProjectMetadata, complexity: number): number {
    // Base estimate from complexity
    let hours = complexity * 2;

    // Adjust for file count
    hours += Math.floor(metadata.fileCount / 50);

    // Adjust for technologies
    hours += metadata.technologies.length * 0.5;

    // Missing tests/docs adds time
    if (!metadata.hasTests) hours += 2;
    if (!metadata.hasDocs) hours += 1;

    return Math.max(2, Math.min(40, hours));
  }

  /**
   * Generate session phases using rules (NO AI)
   */
  private generateSessionPhases(
    totalHours: number,
    metadata: ProjectMetadata
  ): SessionPhase[] {
    const phases: SessionPhase[] = [
      {
        name: 'Planning & Setup',
        description: 'Analyze architecture, create implementation plan, configure environment',
        estimatedHours: totalHours * 0.15,
        objectives: [
          'Understand existing codebase architecture',
          'Create detailed implementation roadmap',
          'Set up development environment and dependencies',
          'Identify key integration points'
        ],
        suggestedModel: 'opus', // Complex reasoning needed
        requiredTools: ['Read', 'Glob', 'Grep', 'Bash'],
        tokenBudget: Math.floor(totalHours * 0.15 * 30000)
      },
      {
        name: 'Core Implementation',
        description: 'Build main features, write core logic, implement integrations',
        estimatedHours: totalHours * 0.5,
        objectives: [
          'Implement primary features',
          'Write integration logic',
          'Create utility functions and helpers',
          'Build core business logic'
        ],
        suggestedModel: 'sonnet', // Fast, capable coding
        requiredTools: ['Edit', 'Write', 'Read', 'Bash'],
        tokenBudget: Math.floor(totalHours * 0.5 * 30000)
      },
      {
        name: 'Testing & Integration',
        description: 'Write tests, fix bugs, ensure components work together',
        estimatedHours: totalHours * 0.25,
        objectives: [
          'Write comprehensive test coverage',
          'Fix identified bugs and issues',
          'Verify all components integrate properly',
          'Perform integration testing'
        ],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Bash', 'Read'],
        tokenBudget: Math.floor(totalHours * 0.25 * 30000)
      },
      {
        name: 'Polish & Documentation',
        description: 'Refactor code, optimize performance, write documentation',
        estimatedHours: totalHours * 0.1,
        objectives: [
          'Code cleanup and refactoring',
          'Performance optimization',
          'Write user documentation',
          'Create developer guides'
        ],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Write', 'Read'],
        tokenBudget: Math.floor(totalHours * 0.1 * 30000)
      }
    ];

    // Filter out phases that are too short (<1 hour)
    return phases.filter(phase => phase.estimatedHours >= 1);
  }

  /**
   * Assess risks using rules (NO AI)
   */
  private assessRisks(metadata: ProjectMetadata): string[] {
    const risks: string[] = [];

    if (!metadata.hasTests) {
      risks.push('No existing test coverage - will need to write tests from scratch');
    }

    if (!metadata.hasDocs) {
      risks.push('Limited documentation - may require more time to understand codebase');
    }

    if (metadata.technologies.length > 5) {
      risks.push('Multiple technologies in use - integration complexity may be high');
    }

    if (metadata.totalSizeKB > 5000) {
      risks.push('Large codebase - navigation and understanding may take extra time');
    }

    if (metadata.hasDeprecatedDependencies) {
      risks.push('Deprecated dependencies detected - may need upgrades');
    }

    return risks;
  }
}
```

**Success Criteria**:
- [ ] `claude-optimizer analyze ./test-project` works end-to-end
- [ ] Complexity calculated via heuristics (no AI calls)
- [ ] Session phases generated logically
- [ ] Database stores analysis results
- [ ] All TypeScript compiles without errors
- [ ] Basic tests pass

---

### **SESSION 2: Calendar Integration & Session Automation** (5 hours)

**Objective**: Build Google Calendar integration and shell-based session automation

**Token Allocation**: 80-100 prompts
- Google Calendar OAuth: 25 prompts (Sonnet)
- Calendar Event Creation: 20 prompts (Sonnet)
- Session Automation Core: 30 prompts (Sonnet - shell scripting)
- Calendar Watcher: 15 prompts (Sonnet)
- Testing & Integration: 10 prompts (Sonnet)

**Deliverables**:

1. **New Files**
   ```
   src/
   ├── calendar-service.ts          # ← SESSION 2
   ├── session-automation.ts        # ← SESSION 2 (Shell/AppleScript)
   ├── calendar-watcher.ts          # ← SESSION 2
   └── utils/
       └── oauth-helper.ts          # ← SESSION 2
   ```

2. **Google Calendar Integration**
   - OAuth 2.0 authentication flow
   - Calendar event creation from project analysis
   - Event metadata storage (session configs)
   - Free/busy slot detection
   - iCal export support

3. **Session Automation (CORRECTED)**

```typescript
// src/session-automation.ts - CORRECT APPROACH

import { exec } from 'child_process';
import { promisify } from 'util';
import { SessionPhase } from './project-analyzer';

const execAsync = promisify(exec);

export interface SessionConfig {
  projectPath: string;
  phase: SessionPhase;
  sessionNumber: number;
}

export class SessionAutomation {
  /**
   * Start Claude Code session via shell automation
   * Uses AppleScript to open Terminal and run `claude`
   */
  async startClaudeCodeSession(config: SessionConfig): Promise<void> {
    const { projectPath, phase } = config;

    // 1. Build initial prompt for the session
    const initialPrompt = this.buildInitialPrompt(config);

    // 2. Open Terminal and navigate to project
    const terminalScript = `
      tell application "Terminal"
        activate
        do script "cd '${projectPath}' && echo '${initialPrompt}' && claude"
      end tell
    `;

    await execAsync(`osascript -e '${terminalScript.replace(/'/g, "\\'")}'`);

    console.log(`✅ Started Claude Code session for: ${phase.name}`);
  }

  /**
   * Build initial prompt based on session phase
   */
  private buildInitialPrompt(config: SessionConfig): string {
    const { phase, sessionNumber } = config;

    return `
Session ${sessionNumber}: ${phase.name}

OBJECTIVES:
${phase.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

ESTIMATED TIME: ${phase.estimatedHours} hours
SUGGESTED MODEL: ${phase.suggestedModel}
TOKEN BUDGET: ${phase.tokenBudget.toLocaleString()}

DESCRIPTION:
${phase.description}

Please begin working on these objectives. Use the recommended model (${phase.suggestedModel}) for optimal results.
    `.trim();
  }

  /**
   * Monitor active Claude Code session via log files
   */
  async monitorSession(sessionId: string): Promise<void> {
    const logPath = this.getClaudeLogPath(sessionId);

    // Watch log file for updates
    const watcher = fs.watch(logPath, async (eventType) => {
      if (eventType === 'change') {
        await this.readNewLogEntries(logPath);
      }
    });

    return watcher;
  }

  /**
   * Read Claude Code log file (JSONL format)
   */
  private async readNewLogEntries(logPath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      // Parse each JSONL line
      lines.forEach(line => {
        try {
          const message = JSON.parse(line);
          this.processLogMessage(message);
        } catch (error) {
          // Invalid JSON, skip
        }
      });
    } catch (error) {
      console.error('Error reading log file:', error);
    }
  }

  /**
   * Process log message and emit updates
   */
  private processLogMessage(message: any): void {
    // Extract useful information
    if (message.type === 'tool_use') {
      console.log(`🔧 Tool used: ${message.tool}`);
    }

    if (message.type === 'usage') {
      console.log(`📊 Tokens: ${message.input_tokens}/${message.output_tokens}`);
    }

    // Emit to dashboard via WebSocket
    this.emitToDashboard(message);
  }

  /**
   * Get Claude Code log file path
   */
  private getClaudeLogPath(sessionId: string): string {
    const home = process.env.HOME;
    return `${home}/.claude/logs/session-${sessionId}.jsonl`;
  }

  /**
   * Start Claude Code in headless mode (for automation)
   */
  async startHeadlessSession(config: SessionConfig): Promise<void> {
    const { projectPath, phase } = config;
    const initialPrompt = this.buildInitialPrompt(config);

    // Use claude --print for headless execution
    const command = `cd '${projectPath}' && claude --print "${initialPrompt}"`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Session error:', stderr);
    }

    console.log('Session output:', stdout);
  }
}
```

4. **Calendar Watcher (CORRECTED)**

```typescript
// src/calendar-watcher.ts - CORRECT APPROACH

import { CalendarService } from './calendar-service';
import { SessionAutomation } from './session-automation';

export class CalendarWatcher {
  private calendarService: CalendarService;
  private sessionAutomation: SessionAutomation;
  private watchInterval: NodeJS.Timer | null = null;

  constructor() {
    this.calendarService = new CalendarService();
    this.sessionAutomation = new SessionAutomation();
  }

  /**
   * Start watching calendar for scheduled sessions
   */
  start(): void {
    console.log('👀 Watching calendar for scheduled sessions...');

    // Poll calendar every 5 minutes
    this.watchInterval = setInterval(() => {
      this.checkUpcomingSessions();
    }, 5 * 60 * 1000);

    // Check immediately on start
    this.checkUpcomingSessions();
  }

  /**
   * Stop watching calendar
   */
  stop(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

  /**
   * Check for sessions starting soon
   */
  private async checkUpcomingSessions(): Promise<void> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Get upcoming events
    const events = await this.calendarService.getUpcomingEvents(
      now,
      fiveMinutesFromNow
    );

    for (const event of events) {
      const startTime = new Date(event.start.dateTime);
      const timeUntilStart = startTime.getTime() - now.getTime();

      // Notify 5 minutes before
      if (timeUntilStart > 0 && timeUntilStart <= 5 * 60 * 1000) {
        this.sendNotification(
          'Upcoming Session',
          `"${event.summary}" starts in ${Math.round(timeUntilStart / 60000)} minutes`
        );
      }

      // Auto-start at scheduled time
      if (timeUntilStart <= 0 && !event.hasStarted) {
        await this.autoStartSession(event);
      }
    }
  }

  /**
   * Automatically start session at scheduled time
   */
  private async autoStartSession(event: any): Promise<void> {
    console.log(`🚀 Auto-starting session: ${event.summary}`);

    const sessionConfig = this.extractSessionConfig(event);

    // Use shell automation to start Claude Code
    await this.sessionAutomation.startClaudeCodeSession(sessionConfig);

    // Mark event as started
    await this.calendarService.markEventStarted(event.id);

    this.sendNotification(
      'Session Started',
      `Claude Code session "${event.summary}" has been started`
    );
  }

  /**
   * Send macOS notification
   */
  private sendNotification(title: string, message: string): void {
    const script = `
      display notification "${message}" with title "${title}"
    `;

    exec(`osascript -e '${script}'`, (error) => {
      if (error) console.error('Notification error:', error);
    });
  }

  /**
   * Extract session config from calendar event
   */
  private extractSessionConfig(event: any): SessionConfig {
    // Session config stored in event metadata
    return JSON.parse(event.extendedProperties?.private?.sessionConfig || '{}');
  }
}
```

**Success Criteria**:
- [ ] OAuth flow completes successfully
- [ ] Calendar events created with session configs
- [ ] Calendar watcher detects upcoming sessions
- [ ] Auto-start triggers via shell automation
- [ ] Terminal opens and Claude Code starts
- [ ] Log file monitoring captures session activity

---

### **SESSION 3: Dashboard Integration & Polish** (5 hours)

**Objective**: Connect everything to React dashboard, add final features, polish UX

**Token Allocation**: 80-100 prompts
- Dashboard Server: 20 prompts (Sonnet)
- WebSocket Integration: 20 prompts (Sonnet)
- React Components: 25 prompts (Sonnet)
- CLI Polish: 15 prompts (Sonnet)
- Documentation & Testing: 20 prompts (Sonnet)

**Deliverables**:

1. **New Files**
   ```
   src/
   ├── dashboard-server.ts          # ← SESSION 3
   └── websocket-manager.ts         # ← SESSION 3

   dashboard/
   ├── src/
   │   ├── components/
   │   │   ├── SessionMonitor.tsx   # ← SESSION 3
   │   │   ├── CalendarView.tsx     # ← SESSION 3
   │   │   └── ProjectAnalysis.tsx  # ← SESSION 3
   │   └── hooks/
   │       └── useSession.ts        # ← SESSION 3
   ```

2. **Dashboard Server with WebSocket**

```typescript
// src/dashboard-server.ts

import express from 'express';
import { WebSocketServer } from 'ws';
import { OptimizerDatabase } from './database';

export class DashboardServer {
  private app: express.Application;
  private wss: WebSocketServer;
  private db: OptimizerDatabase;

  constructor() {
    this.app = express();
    this.db = new OptimizerDatabase();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Get all projects
    this.app.get('/api/projects', (req, res) => {
      const projects = this.db.getAllProjects();
      res.json(projects);
    });

    // Get project analysis
    this.app.get('/api/projects/:path', (req, res) => {
      const analysis = this.db.getProject(req.params.path);
      res.json(analysis);
    });

    // Get active sessions
    this.app.get('/api/sessions/active', (req, res) => {
      const sessions = this.db.getActiveSessions();
      res.json(sessions);
    });
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws) => {
      console.log('📡 Dashboard connected');

      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        this.handleWebSocketMessage(ws, data);
      });
    });
  }

  /**
   * Emit session update to dashboard
   */
  emitSessionUpdate(sessionId: string, data: any): void {
    const message = JSON.stringify({
      type: 'session_update',
      sessionId,
      data
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  start(port: number = 3001): void {
    this.app.listen(port, () => {
      console.log(`📊 Dashboard server running on http://localhost:${port}`);
    });
  }
}
```

3. **Complete CLI Commands**

```bash
claude-optimizer analyze <path>       # Analyze project complexity
claude-optimizer schedule <path>      # Create Google Calendar schedule
claude-optimizer watch                # Start calendar watcher daemon
claude-optimizer status               # Show active sessions
claude-optimizer dashboard            # Start dashboard server
claude-optimizer calendar setup       # Configure Google Calendar OAuth
```

**Success Criteria**:
- [ ] Dashboard shows real-time session progress
- [ ] WebSocket updates working smoothly
- [ ] Calendar view displays scheduled sessions
- [ ] All CLI commands working end-to-end
- [ ] Documentation complete
- [ ] Ready for production use

---

## 🎯 Overall Success Metrics

### **Technical Metrics**

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Installation time | <2 minutes | `npm install && npm run build` |
| First analysis | <10 seconds | `claude-optimizer analyze ./test-project` |
| Calendar setup | <3 minutes | OAuth flow completion |
| Session auto-start | 100% reliable | Calendar event triggers shell command |
| Dashboard latency | <100ms | WebSocket message delivery |
| Memory footprint | <50MB | Process monitoring |

### **Functional Requirements**

- ✅ Analyze any codebase in any language (rule-based)
- ✅ Generate accurate complexity scores (±1 point)
- ✅ Create optimal session schedules
- ✅ Integrate with Google Calendar
- ✅ Auto-start sessions via shell automation
- ✅ Real-time dashboard monitoring via log files
- ✅ Track tokens, cost, progress
- ✅ Handle errors gracefully

---

## 🛠️ Development Setup

### **Prerequisites**

```bash
# Node.js 18+
node --version

# npm or yarn
npm --version

# Claude CLI (for testing)
claude --version

# Google Cloud account (for Calendar API)
```

### **Initial Setup**

```bash
# Create project
mkdir claude-optimizer
cd claude-optimizer

# Initialize npm
npm init -y

# Install dependencies (NO Claude Agent SDK!)
npm install googleapis google-auth-library
npm install better-sqlite3
npm install commander inquirer ora chalk
npm install express ws
npm install --save-dev typescript @types/node @types/express @types/ws
npm install --save-dev vitest @vitest/ui
```

---

## 📚 Key Differences from Previous Plan

| Aspect | ❌ Wrong (V2) | ✅ Correct (V3) |
|--------|---------------|-----------------|
| **Project Analysis** | Use Claude Agent SDK with Opus | Rule-based heuristics |
| **Session Control** | `query()` from SDK | Shell/AppleScript automation |
| **Session Monitoring** | SDK message streaming | Log file watching (JSONL) |
| **Dependencies** | `@anthropic-ai/claude-agent-sdk` | None (just shell commands) |
| **Complexity** | AI-powered deep analysis | File count + tech stack scoring |
| **Token Usage** | 30+ prompts for analysis | 0 prompts (all heuristics) |

---

## 🚀 Ready to Implement

This corrected plan uses the right approach:
1. **No Claude Agent SDK** - it's for building agents, not controlling Claude Code
2. **Shell automation** - AppleScript/bash to start Terminal and run `claude`
3. **Log file monitoring** - watch `~/.claude/logs/session-*.jsonl` for updates
4. **Rule-based analysis** - heuristics instead of AI for project complexity
5. **Calendar integration** - Google Calendar API for scheduling
6. **Dashboard monitoring** - WebSocket updates from log file parsing

**Success = Automated calendar-driven Claude Code sessions with real-time dashboard!** 🚀
