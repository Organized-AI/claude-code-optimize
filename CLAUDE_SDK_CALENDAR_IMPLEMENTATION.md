# Claude Agent SDK + Calendar Integration Implementation Guide

## 🎯 The Complete Picture

**Goal**: Use Google Calendar to automatically start Claude Agent SDK sessions based on a project plan analysis.

**Flow**:
```
1. User runs: claude-optimizer schedule ./my-project
2. System analyzes project complexity
3. System creates optimal session schedule
4. System adds events to Google Calendar
5. Calendar triggers → Automatically start Claude sessions
6. Dashboard monitors real-time progress
```

---

## 🏗️ Architecture Overview

### **Component Stack**

```
┌─────────────────────────────────────────────────────────┐
│  Google Calendar (Schedule Storage)                     │
│  ├── Session 1: Monday 9am - Planning (4h)              │
│  ├── Session 2: Tuesday 9am - Implementation (4h)       │
│  └── Session 3: Thursday 9am - Testing (4h)             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Calendar Watcher (Background Service)                  │
│  ├── Polls calendar every 5 minutes                     │
│  ├── Detects upcoming sessions (30 min warning)         │
│  └── Triggers session start at scheduled time           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Claude Agent SDK Automation                            │
│  ├── Creates session via SDK                            │
│  ├── Loads project context                              │
│  ├── Executes session plan                              │
│  └── Tracks progress in real-time                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Dashboard (React - KEPT!)                               │
│  ├── Shows active session status                        │
│  ├── Real-time token/cost tracking                      │
│  ├── Calendar event timeline                            │
│  └── Session history & analytics                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Understanding Claude Agent SDK

### **What the SDK Actually Does**

The Claude Agent SDK (formerly Claude Code SDK) gives you **programmatic access to Claude Code sessions**:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Start a Claude session programmatically
const session = query({
  prompt: "Analyze this codebase and create a refactoring plan",
  options: {
    settingSources: ['project'],      // Load .claude/settings.json
    permissionMode: 'bypassPermissions', // Auto-approve actions
    model: 'claude-sonnet-4-5-20250929'
  }
});

// Stream results in real-time
for await (const message of session) {
  console.log(message);
  // Message types: text, tool_use, tool_result, etc.
}
```

### **Key SDK Capabilities for Our Use Case**

| Feature | What It Does | How We Use It |
|---------|-------------|---------------|
| `query()` | Starts a Claude session | Calendar triggers this |
| Streaming | Real-time message updates | Feed to dashboard |
| Tool permissions | Control what Claude can do | Set based on session phase |
| Project context | Load CLAUDE.md files | Auto-load project plan |
| Session hooks | Intercept events | Track tokens, log progress |
| Custom tools | Define MCP tools | Add calendar-aware tools |

---

## 🔧 Implementation: Step by Step

### **Part 1: Project Analysis & Plan Generation**

```typescript
// src/project-analyzer.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectAnalysis {
  complexity: number;        // 1-10 scale
  estimatedHours: number;    // Total work time
  phases: SessionPhase[];    // Breakdown by phase
  dependencies: string[];    // Key files/packages
  riskFactors: string[];     // Potential issues
}

export interface SessionPhase {
  name: string;              // e.g., "Planning & Setup"
  description: string;       // What happens in this phase
  estimatedHours: number;    // How long it takes
  objectives: string[];      // Key deliverables
  suggestedModel: 'sonnet' | 'opus'; // Best model for this
  tools: string[];           // Required tools (Edit, Bash, etc.)
}

export class ProjectAnalyzer {
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    // 1. Gather project metadata
    const metadata = await this.gatherMetadata(projectPath);

    // 2. Use Claude to analyze complexity
    const analysis = await this.analyzeWithClaude(projectPath, metadata);

    // 3. Generate session plan
    const phases = this.generateSessionPhases(analysis);

    return {
      complexity: analysis.complexity,
      estimatedHours: analysis.estimatedHours,
      phases,
      dependencies: analysis.dependencies,
      riskFactors: analysis.riskFactors
    };
  }

  private async analyzeWithClaude(
    projectPath: string,
    metadata: ProjectMetadata
  ): Promise<any> {
    const prompt = `
Analyze this project and provide a detailed complexity assessment:

Project: ${projectPath}
Files: ${metadata.fileCount}
Languages: ${metadata.languages.join(', ')}
Size: ${metadata.sizeKB}KB

Please analyze:
1. Overall complexity (1-10 scale)
2. Estimated development hours
3. Key dependencies and technologies
4. Potential risk factors
5. Recommended session breakdown

Format response as JSON.
    `.trim();

    const session = query({
      prompt,
      options: {
        permissionMode: 'bypassPermissions',
        model: 'claude-sonnet-4-5-20250929',
        settingSources: []
      }
    });

    let response = '';
    for await (const message of session) {
      if (message.type === 'text') {
        response += message.text;
      }
    }

    return JSON.parse(this.extractJSON(response));
  }

  private generateSessionPhases(analysis: any): SessionPhase[] {
    const totalHours = analysis.estimatedHours;

    return [
      {
        name: 'Planning & Setup',
        description: 'Analyze codebase, create architecture plan, set up environment',
        estimatedHours: Math.min(2, totalHours * 0.15),
        objectives: [
          'Understand existing architecture',
          'Create detailed implementation plan',
          'Set up development environment'
        ],
        suggestedModel: 'opus',  // Complex reasoning
        tools: ['Read', 'Glob', 'Grep', 'Bash(ls:*,cat:*)']
      },
      {
        name: 'Core Implementation',
        description: 'Build main features and functionality',
        estimatedHours: totalHours * 0.5,
        objectives: [
          'Implement core features',
          'Write integration logic',
          'Create necessary utilities'
        ],
        suggestedModel: 'sonnet', // Fast coding
        tools: ['Edit', 'Write', 'Read', 'Bash']
      },
      {
        name: 'Testing & Integration',
        description: 'Write tests, fix bugs, integrate components',
        estimatedHours: totalHours * 0.25,
        objectives: [
          'Write comprehensive tests',
          'Fix identified bugs',
          'Ensure all components integrate'
        ],
        suggestedModel: 'sonnet',
        tools: ['Edit', 'Bash', 'Read']
      },
      {
        name: 'Polish & Documentation',
        description: 'Refactor, optimize, document',
        estimatedHours: totalHours * 0.1,
        objectives: [
          'Code cleanup and optimization',
          'Write documentation',
          'Final testing'
        ],
        suggestedModel: 'sonnet',
        tools: ['Edit', 'Write', 'Read']
      }
    ].filter(phase => phase.estimatedHours >= 1);
  }

  private async gatherMetadata(projectPath: string): Promise<ProjectMetadata> {
    // Count files, detect languages, calculate size, etc.
    const files = await this.getAllFiles(projectPath);

    return {
      fileCount: files.length,
      languages: this.detectLanguages(files),
      sizeKB: this.calculateSize(files),
      hasTests: files.some(f => f.includes('test')),
      hasDocs: files.some(f => f.includes('README'))
    };
  }
}
```

### **Part 2: Google Calendar Integration**

```typescript
// src/calendar-service.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  sessionConfig: {
    projectPath: string;
    phase: string;
    model: string;
    tokenBudget: number;
    tools: string[];
    objectives: string[];
  };
}

export class CalendarService {
  private calendar: any;
  private auth: OAuth2Client;

  async initialize(): Promise<void> {
    // 1. Load credentials
    const credentials = await this.loadCredentials();

    // 2. Create OAuth client
    this.auth = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      'http://localhost:3000/oauth/callback'
    );

    // 3. Check for existing token
    const token = await this.loadToken();
    if (token) {
      this.auth.setCredentials(token);
    } else {
      // Trigger OAuth flow
      await this.authenticate();
    }

    // 4. Initialize calendar API
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  async createSessionSchedule(
    analysis: ProjectAnalysis,
    preferences: {
      startDate?: Date;
      workingHours: { start: number; end: number }; // e.g., {start: 9, end: 17}
      daysOfWeek: number[]; // 0-6, Monday = 1
      sessionLength: number; // hours, max 5
    }
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    const startDate = preferences.startDate || new Date();

    // 1. Find available time slots
    const slots = await this.findAvailableSlots(
      startDate,
      analysis.phases.length,
      preferences
    );

    // 2. Create calendar event for each phase
    for (let i = 0; i < analysis.phases.length; i++) {
      const phase = analysis.phases[i];
      const slot = slots[i];

      const event = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `Claude Session: ${phase.name}`,
          description: this.formatEventDescription(phase),
          start: {
            dateTime: slot.start.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          end: {
            dateTime: slot.end.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'popup', minutes: 5 }
            ]
          },
          // Store session config in event metadata
          extendedProperties: {
            private: {
              claudeOptimizer: 'true',
              sessionConfig: JSON.stringify({
                projectPath: analysis.projectPath,
                phase: phase.name,
                model: phase.suggestedModel,
                tokenBudget: this.calculateTokenBudget(phase),
                tools: phase.tools,
                objectives: phase.objectives
              })
            }
          }
        }
      });

      events.push({
        id: event.data.id!,
        summary: event.data.summary!,
        description: event.data.description!,
        start: new Date(event.data.start!.dateTime!),
        end: new Date(event.data.end!.dateTime!),
        sessionConfig: JSON.parse(
          event.data.extendedProperties!.private!.sessionConfig
        )
      });
    }

    return events;
  }

  async getUpcomingSessions(withinMinutes: number = 60): Promise<CalendarEvent[]> {
    const now = new Date();
    const timeMax = new Date(now.getTime() + withinMinutes * 60000);

    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items
      .filter((event: any) =>
        event.extendedProperties?.private?.claudeOptimizer === 'true'
      )
      .map((event: any) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        sessionConfig: JSON.parse(
          event.extendedProperties.private.sessionConfig
        )
      }));
  }

  private async findAvailableSlots(
    startDate: Date,
    sessionCount: number,
    preferences: any
  ): Promise<Array<{ start: Date; end: Date }>> {
    const slots: Array<{ start: Date; end: Date }> = [];
    let currentDate = new Date(startDate);

    while (slots.length < sessionCount) {
      // Skip weekends if not in preferences
      if (!preferences.daysOfWeek.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check if slot is available
      const slotStart = new Date(currentDate);
      slotStart.setHours(preferences.workingHours.start, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setHours(
        slotStart.getHours() + Math.min(preferences.sessionLength, 5),
        0, 0, 0
      );

      const isBusy = await this.isTimeSlotBusy(slotStart, slotEnd);

      if (!isBusy) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  private async isTimeSlotBusy(start: Date, end: Date): Promise<boolean> {
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: 'primary' }]
      }
    });

    const busy = response.data.calendars.primary.busy || [];
    return busy.length > 0;
  }

  private formatEventDescription(phase: SessionPhase): string {
    return `
🌙 Claude Code Session

Phase: ${phase.name}
Duration: ${phase.estimatedHours} hours
Model: ${phase.suggestedModel}

Objectives:
${phase.objectives.map(obj => `• ${obj}`).join('\n')}

This session will start automatically via Claude Optimizer.
    `.trim();
  }

  private calculateTokenBudget(phase: SessionPhase): number {
    // Rough estimate: 1 hour = ~30,000 tokens at moderate pace
    return Math.floor(phase.estimatedHours * 30000);
  }
}
```

### **Part 3: Claude SDK Session Automation**

```typescript
// src/claude-session-manager.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { CalendarEvent } from './calendar-service';
import { EventEmitter } from 'events';

export interface SessionStatus {
  id: string;
  phase: string;
  status: 'starting' | 'active' | 'paused' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  tokensUsed: number;
  cost: number;
  progress: {
    completed: string[];
    current: string;
    remaining: string[];
  };
}

export class ClaudeSessionManager extends EventEmitter {
  private activeSession: SessionStatus | null = null;

  async startSessionFromCalendar(event: CalendarEvent): Promise<void> {
    console.log(`🚀 Starting Claude session: ${event.sessionConfig.phase}`);

    // 1. Initialize session
    this.activeSession = {
      id: event.id,
      phase: event.sessionConfig.phase,
      status: 'starting',
      startTime: new Date(),
      tokensUsed: 0,
      cost: 0,
      progress: {
        completed: [],
        current: event.sessionConfig.objectives[0],
        remaining: event.sessionConfig.objectives.slice(1)
      }
    };

    this.emit('session:started', this.activeSession);

    // 2. Create session plan prompt
    const sessionPrompt = this.createSessionPrompt(event.sessionConfig);

    // 3. Start Claude session with SDK
    try {
      const session = query({
        prompt: sessionPrompt,
        options: {
          permissionMode: 'bypassPermissions',
          model: this.getModelName(event.sessionConfig.model),
          settingSources: ['project'],
          allowedTools: event.sessionConfig.tools,
          // Custom hooks to track progress
          hooks: {
            onToolUse: (tool) => this.handleToolUse(tool),
            onMessage: (message) => this.handleMessage(message),
            onError: (error) => this.handleError(error)
          }
        }
      });

      // 4. Stream session execution
      this.activeSession.status = 'active';

      for await (const message of session) {
        this.processMessage(message);

        // Check if we've exceeded time limit
        const elapsed = Date.now() - this.activeSession.startTime.getTime();
        if (elapsed > event.sessionConfig.duration * 3600000) {
          console.log('⚠️  Session time limit reached, wrapping up...');
          break;
        }
      }

      // 5. Complete session
      this.completeSession();

    } catch (error) {
      console.error('❌ Session error:', error);
      this.activeSession.status = 'error';
      this.emit('session:error', error);
    }
  }

  private createSessionPrompt(config: any): string {
    return `
You are working on the "${config.phase}" phase of this project.

Project Path: ${config.projectPath}
Duration: ${config.duration} hours
Token Budget: ${config.tokenBudget} tokens

Objectives for this session:
${config.objectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}

Please work systematically through these objectives. After completing each one:
1. Summarize what was accomplished
2. Note any issues or blockers
3. Suggest next steps

Begin with objective 1 and work through the list. Focus on quality over speed.
    `.trim();
  }

  private processMessage(message: any): void {
    if (!this.activeSession) return;

    // Track token usage
    if (message.usage) {
      this.activeSession.tokensUsed += message.usage.input_tokens + message.usage.output_tokens;
      this.activeSession.cost = this.calculateCost(
        this.activeSession.tokensUsed,
        message.model
      );

      this.emit('token:update', {
        tokens: this.activeSession.tokensUsed,
        cost: this.activeSession.cost
      });
    }

    // Track progress through objectives
    if (message.type === 'text' && message.text.includes('✅')) {
      // Parse completed objective
      this.updateProgress(message.text);
    }

    // Emit real-time updates to dashboard
    this.emit('message', message);
  }

  private handleToolUse(tool: any): void {
    console.log(`🔧 Tool used: ${tool.name}`);
    this.emit('tool:used', tool);
  }

  private handleMessage(message: any): void {
    // Log all messages for debugging
    this.emit('debug:message', message);
  }

  private handleError(error: any): void {
    console.error('Session error:', error);
    if (this.activeSession) {
      this.activeSession.status = 'error';
    }
  }

  private updateProgress(text: string): void {
    if (!this.activeSession) return;

    // Move current to completed
    this.activeSession.progress.completed.push(
      this.activeSession.progress.current
    );

    // Move next to current
    if (this.activeSession.progress.remaining.length > 0) {
      this.activeSession.progress.current =
        this.activeSession.progress.remaining[0];
      this.activeSession.progress.remaining =
        this.activeSession.progress.remaining.slice(1);
    } else {
      this.activeSession.progress.current = 'All objectives complete!';
    }

    this.emit('progress:update', this.activeSession.progress);
  }

  private completeSession(): void {
    if (!this.activeSession) return;

    this.activeSession.status = 'completed';
    this.activeSession.endTime = new Date();

    this.emit('session:completed', this.activeSession);

    console.log('✅ Session completed successfully!');
    console.log(`   Tokens: ${this.activeSession.tokensUsed}`);
    console.log(`   Cost: $${this.activeSession.cost.toFixed(4)}`);
  }

  private getModelName(model: string): string {
    const models: Record<string, string> = {
      'sonnet': 'claude-sonnet-4-5-20250929',
      'opus': 'claude-opus-4-20250514',
      'haiku': 'claude-haiku-4-20250910'
    };
    return models[model] || models.sonnet;
  }

  private calculateCost(tokens: number, model: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'sonnet': { input: 3.00, output: 15.00 },
      'opus': { input: 15.00, output: 75.00 },
      'haiku': { input: 0.25, output: 1.25 }
    };

    const modelPricing = pricing[model] || pricing.sonnet;
    // Assume 70% input, 30% output for estimation
    return (tokens * 0.7 * modelPricing.input + tokens * 0.3 * modelPricing.output) / 1_000_000;
  }

  getActiveSession(): SessionStatus | null {
    return this.activeSession;
  }
}
```

### **Part 4: Calendar Watcher (Background Service)**

```typescript
// src/calendar-watcher.ts
import { CalendarService, CalendarEvent } from './calendar-service';
import { ClaudeSessionManager } from './claude-session-manager';

export class CalendarWatcher {
  private calendar: CalendarService;
  private sessionManager: ClaudeSessionManager;
  private checkInterval: NodeJS.Timeout | null = null;
  private upcomingEvents: Map<string, CalendarEvent> = new Map();

  constructor(
    calendar: CalendarService,
    sessionManager: ClaudeSessionManager
  ) {
    this.calendar = calendar;
    this.sessionManager = sessionManager;
  }

  start(): void {
    console.log('👁️  Calendar watcher started...');

    // Check calendar every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkUpcomingEvents();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkUpcomingEvents();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkUpcomingEvents(): Promise<void> {
    try {
      // Get events in next 60 minutes
      const events = await this.calendar.getUpcomingSessions(60);

      for (const event of events) {
        const minutesUntil = (event.start.getTime() - Date.now()) / 60000;

        // 30-minute warning
        if (minutesUntil <= 30 && minutesUntil > 25) {
          this.sendNotification(event, '30 minutes');
        }

        // 5-minute warning
        if (minutesUntil <= 5 && minutesUntil > 0) {
          this.sendNotification(event, '5 minutes');
        }

        // Start session at scheduled time
        if (minutesUntil <= 0 && !this.upcomingEvents.has(event.id)) {
          await this.startScheduledSession(event);
          this.upcomingEvents.set(event.id, event);
        }
      }

      // Clean up old events
      this.cleanupOldEvents();

    } catch (error) {
      console.error('Error checking calendar:', error);
    }
  }

  private sendNotification(event: CalendarEvent, timeUntil: string): void {
    console.log(`🔔 Session starting in ${timeUntil}`);
    console.log(`   Phase: ${event.sessionConfig.phase}`);
    console.log(`   Project: ${event.sessionConfig.projectPath}`);

    // macOS notification
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "Phase: ${event.sessionConfig.phase}" with title "Claude Session in ${timeUntil}"'`);
    }
  }

  private async startScheduledSession(event: CalendarEvent): Promise<void> {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 AUTO-STARTING CLAUDE SESSION');
    console.log('═══════════════════════════════════════════════');
    console.log(`Phase: ${event.sessionConfig.phase}`);
    console.log(`Project: ${event.sessionConfig.projectPath}`);
    console.log(`Duration: ${event.sessionConfig.duration}h`);
    console.log('═══════════════════════════════════════════════');
    console.log('');

    await this.sessionManager.startSessionFromCalendar(event);
  }

  private cleanupOldEvents(): void {
    const now = Date.now();
    const eventsToRemove: string[] = [];

    this.upcomingEvents.forEach((event, id) => {
      if (event.end.getTime() < now) {
        eventsToRemove.push(id);
      }
    });

    eventsToRemove.forEach(id => this.upcomingEvents.delete(id));
  }
}
```

### **Part 5: Dashboard Integration (KEEPING IT!)**

```typescript
// src/dashboard-server.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import { ClaudeSessionManager } from './claude-session-manager';
import { CalendarService } from './calendar-service';

export class DashboardServer {
  private app = express();
  private wss: WebSocketServer;
  private sessionManager: ClaudeSessionManager;
  private calendar: CalendarService;

  constructor(
    sessionManager: ClaudeSessionManager,
    calendar: CalendarService
  ) {
    this.sessionManager = sessionManager;
    this.calendar = calendar;
    this.setupRoutes();
    this.setupWebSocket();
    this.connectToSessionManager();
  }

  private setupRoutes(): void {
    this.app.use(express.static('dashboard/dist'));
    this.app.use(express.json());

    // API Routes
    this.app.get('/api/session/current', (req, res) => {
      res.json(this.sessionManager.getActiveSession());
    });

    this.app.get('/api/calendar/upcoming', async (req, res) => {
      const events = await this.calendar.getUpcomingSessions(1440); // Next 24h
      res.json(events);
    });

    this.app.post('/api/session/pause', (req, res) => {
      // Pause current session
      res.json({ success: true });
    });
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ port: 8080 });

    this.wss.on('connection', (ws) => {
      console.log('📊 Dashboard connected');

      // Send current session state
      const session = this.sessionManager.getActiveSession();
      if (session) {
        ws.send(JSON.stringify({
          type: 'session:state',
          data: session
        }));
      }
    });
  }

  private connectToSessionManager(): void {
    // Pipe all session events to dashboard
    this.sessionManager.on('session:started', (data) => {
      this.broadcast('session:started', data);
    });

    this.sessionManager.on('token:update', (data) => {
      this.broadcast('token:update', data);
    });

    this.sessionManager.on('progress:update', (data) => {
      this.broadcast('progress:update', data);
    });

    this.sessionManager.on('session:completed', (data) => {
      this.broadcast('session:completed', data);
    });

    this.sessionManager.on('message', (data) => {
      this.broadcast('message', data);
    });
  }

  private broadcast(type: string, data: any): void {
    const message = JSON.stringify({ type, data });
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  start(port: number = 3001): void {
    this.app.listen(port, () => {
      console.log(`📊 Dashboard running at http://localhost:${port}`);
    });
  }
}
```

---

## 🎯 Putting It All Together

### **Main Application Entry Point**

```typescript
// src/index.ts
import { ProjectAnalyzer } from './project-analyzer';
import { CalendarService } from './calendar-service';
import { ClaudeSessionManager } from './claude-session-manager';
import { CalendarWatcher } from './calendar-watcher';
import { DashboardServer } from './dashboard-server';

async function main() {
  console.log('🌙 Claude Optimizer Starting...');

  // 1. Initialize services
  const calendar = new CalendarService();
  await calendar.initialize();

  const sessionManager = new ClaudeSessionManager();
  const watcher = new CalendarWatcher(calendar, sessionManager);
  const dashboard = new DashboardServer(sessionManager, calendar);

  // 2. Start background watcher
  watcher.start();

  // 3. Start dashboard
  dashboard.start(3001);

  console.log('✅ Claude Optimizer ready!');
  console.log('📅 Watching calendar for scheduled sessions...');
  console.log('📊 Dashboard: http://localhost:3001');
}

main().catch(console.error);
```

### **CLI Commands**

```typescript
// src/cli.ts
import { Command } from 'commander';
import { ProjectAnalyzer } from './project-analyzer';
import { CalendarService } from './calendar-service';

const program = new Command();

program
  .name('claude-optimizer')
  .description('Simplified Claude Code session optimizer with calendar automation')
  .version('2.0.0');

program
  .command('schedule <project-path>')
  .description('Analyze project and create calendar schedule')
  .option('--start <date>', 'Start date for first session')
  .option('--hours <start-end>', 'Working hours (e.g., "9-17")', '9-17')
  .action(async (projectPath, options) => {
    console.log('🔍 Analyzing project...');

    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyzeProject(projectPath);

    console.log(`\n📊 Analysis Complete:`);
    console.log(`   Complexity: ${analysis.complexity}/10`);
    console.log(`   Estimated: ${analysis.estimatedHours} hours`);
    console.log(`   Sessions: ${analysis.phases.length}`);

    console.log(`\n📅 Creating calendar schedule...`);

    const calendar = new CalendarService();
    await calendar.initialize();

    const [start, end] = options.hours.split('-').map(Number);
    const events = await calendar.createSessionSchedule(analysis, {
      workingHours: { start, end },
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      sessionLength: 4
    });

    console.log(`\n✅ Created ${events.length} calendar events:`);
    events.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.start.toLocaleDateString()} at ${event.start.toLocaleTimeString()}`);
      console.log(`      ${event.sessionConfig.phase} (${event.sessionConfig.duration}h)`);
    });

    console.log(`\n🚀 Sessions will start automatically!`);
  });

program
  .command('start')
  .description('Start background watcher and dashboard')
  .action(async () => {
    // Start main application
    await main();
  });

program.parse();
```

---

## 📝 User Flow Example

### **Step 1: User Schedules Project**

```bash
$ claude-optimizer schedule ./my-awesome-app

🔍 Analyzing project...
   Reading 234 files...
   Detecting complexity...
   Using Claude to analyze architecture...

📊 Analysis Complete:
   Complexity: 7/10 (Medium-High)
   Estimated: 12 hours total
   Sessions: 3 phases

📅 Suggested Schedule:
   Session 1: Mon Jan 8, 9:00 AM - Planning & Setup (4h)
   Session 2: Tue Jan 9, 9:00 AM - Core Implementation (4h)
   Session 3: Thu Jan 11, 9:00 AM - Testing & Polish (4h)

Create these calendar events? [Y/n] y

✅ 3 events created in Google Calendar
✅ Auto-start enabled
✅ Dashboard monitoring active

🚀 Sessions will start automatically at scheduled times!
   Dashboard: http://localhost:3001
```

### **Step 2: Calendar Event Triggers**

```bash
# Monday, 8:30 AM
🔔 Session starting in 30 minutes
   Phase: Planning & Setup
   Project: my-awesome-app
   Duration: 4 hours

# Monday, 8:55 AM
🔔 Session starting in 5 minutes
   Preparing environment...

# Monday, 9:00 AM
═══════════════════════════════════════════════
🚀 AUTO-STARTING CLAUDE SESSION
═══════════════════════════════════════════════
Phase: Planning & Setup
Project: /Users/you/my-awesome-app
Duration: 4h
═══════════════════════════════════════════════

✅ Project opened: my-awesome-app
✅ Claude session started
✅ Tracking enabled
✅ Dashboard updated

[Claude begins working on objectives...]
```

### **Step 3: Dashboard Shows Real-Time Progress**

```
┌─────────────────────────────────────────────┐
│  🌙 Claude Code Optimizer Dashboard         │
├─────────────────────────────────────────────┤
│  Active Session: Planning & Setup           │
│  ⏱️  1h 23m elapsed / 2h 37m remaining      │
│  🎯 Tokens: 45,320 / 120,000  ████░░  37%  │
│  💰 Cost: $2.34 / $8.00       ████░░  29%  │
│                                              │
│  Progress:                                   │
│  ✅ Understand existing architecture        │
│  ✅ Create detailed implementation plan      │
│  ⏳ Set up development environment (current) │
│                                              │
│  Next Calendar Event:                        │
│  📅 Tomorrow 9:00 AM - Core Implementation  │
│                                              │
│  [Pause]  [Stop]  [View Details]           │
└─────────────────────────────────────────────┘
```

---

## 🎉 Summary: What You Get

### **The Complete Workflow**

1. ✅ **One command** to analyze project
2. ✅ **AI-powered** complexity analysis
3. ✅ **Smart scheduling** in Google Calendar
4. ✅ **Automatic session** start at calendar time
5. ✅ **Claude SDK** executes session plan
6. ✅ **Real-time dashboard** shows progress
7. ✅ **Simplified architecture** (but keeps dashboard!)

### **Technology Stack**

```
Frontend: React Dashboard (KEPT from current)
Backend: Express + WebSocket (simplified)
Database: SQLite only (no Supabase complexity)
Calendar: Google Calendar API
Automation: Claude Agent SDK
CLI: Commander.js
```

### **Next Steps to Build**

**Week 1**: Core automation
- [ ] Project analyzer with Claude SDK
- [ ] Google Calendar integration
- [ ] Session manager with SDK

**Week 2**: Polish & integrate
- [ ] Calendar watcher service
- [ ] Dashboard WebSocket updates
- [ ] CLI commands

**Week 3**: Testing & release
- [ ] End-to-end testing
- [ ] Documentation
- [ ] npm package

**Ready to start building? I can begin with the project analyzer and Claude SDK integration!**
