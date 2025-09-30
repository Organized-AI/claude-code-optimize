# Claude Code Optimizer v2.0 - Implementation Plan

## 🎯 Project Overview

**Goal**: Build a simplified Claude Code optimizer with calendar-driven session automation using the Claude Agent SDK.

**Timeline**: 3 sessions × 5 hours = 15 hours total
**Token Budget**: ~300 prompts (100 per session)
**Model Mix**: 70% Sonnet, 30% Opus for complex logic

---

## 📋 Session Breakdown

### **SESSION 1: Foundation & Project Analyzer** (5 hours)

**Objective**: Set up project structure and build AI-powered project analysis system

**Token Allocation**: 80-100 prompts
- Setup & Dependencies: 15 prompts (Sonnet)
- Project Analyzer Core: 30 prompts (Opus - complex AI integration)
- SQLite Database: 20 prompts (Sonnet)
- Testing & Debug: 20 prompts (Sonnet)
- Documentation: 15 prompts (Sonnet)

**Deliverables**:

1. **Project Structure**
   ```
   claude-optimizer/
   ├── package.json
   ├── tsconfig.json
   ├── src/
   │   ├── project-analyzer.ts      # ← SESSION 1 FOCUS
   │   ├── database.ts               # ← SESSION 1
   │   ├── types.ts                  # ← SESSION 1
   │   └── utils/
   │       ├── file-scanner.ts       # ← SESSION 1
   │       └── complexity-calc.ts    # ← SESSION 1
   ├── tests/
   │   └── project-analyzer.test.ts
   └── README.md
   ```

2. **Core Functionality**
   - ✅ TypeScript project setup with proper config
   - ✅ Claude Agent SDK integration
   - ✅ Project analyzer that scans codebase
   - ✅ AI-powered complexity analysis
   - ✅ Session phase generation
   - ✅ SQLite database schema
   - ✅ Basic CLI command: `claude-optimizer analyze <path>`

3. **Project Analyzer Implementation**

```typescript
// src/project-analyzer.ts - Core deliverable

import { query } from '@anthropic-ai/claude-agent-sdk';

export interface ProjectAnalysis {
  projectPath: string;
  complexity: number;        // 1-10 scale
  estimatedHours: number;    // Total work estimate
  phases: SessionPhase[];    // Breakdown by phase
  technologies: string[];    // Detected tech stack
  fileCount: number;
  totalSizeKB: number;
  hasTests: boolean;
  hasDocs: boolean;
  riskFactors: string[];     // Potential issues
  timestamp: Date;
}

export interface SessionPhase {
  name: string;              // "Planning & Setup"
  description: string;       // What happens
  estimatedHours: number;    // 2-5 hours
  objectives: string[];      // Concrete deliverables
  suggestedModel: 'sonnet' | 'opus' | 'haiku';
  requiredTools: string[];   // ['Edit', 'Bash', 'Read']
  tokenBudget: number;       // Estimated tokens needed
}

export class ProjectAnalyzer {
  /**
   * Main analysis method - uses Claude SDK to deeply analyze project
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    // 1. Gather file system metadata
    const metadata = await this.scanProjectFiles(projectPath);

    // 2. Use Claude SDK to analyze complexity
    const aiAnalysis = await this.analyzeWithClaude(projectPath, metadata);

    // 3. Generate optimal session phases
    const phases = this.generateSessionPhases(aiAnalysis);

    // 4. Calculate risk factors
    const risks = this.assessRisks(metadata, aiAnalysis);

    return {
      projectPath,
      complexity: aiAnalysis.complexity,
      estimatedHours: aiAnalysis.estimatedHours,
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
   * Use Claude SDK to perform deep analysis
   */
  private async analyzeWithClaude(
    projectPath: string,
    metadata: ProjectMetadata
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(projectPath, metadata);

    const session = query({
      prompt,
      options: {
        model: 'claude-opus-4-20250514', // Use Opus for complex reasoning
        permissionMode: 'bypassPermissions',
        settingSources: [],
        allowedTools: ['Read', 'Glob', 'Grep', 'Bash(ls:*,find:*,wc:*)']
      }
    });

    let response = '';
    for await (const message of session) {
      if (message.type === 'text') {
        response += message.text;
      }
    }

    return this.parseClaudeResponse(response);
  }

  /**
   * Generate optimal session breakdown
   */
  private generateSessionPhases(analysis: AIAnalysisResult): SessionPhase[] {
    const totalHours = analysis.estimatedHours;

    // Standard 4-phase approach
    const phases: SessionPhase[] = [
      {
        name: 'Planning & Setup',
        description: 'Analyze architecture, create implementation plan, configure environment',
        estimatedHours: Math.min(2, totalHours * 0.15),
        objectives: [
          'Understand existing codebase architecture',
          'Create detailed implementation roadmap',
          'Set up development environment and dependencies'
        ],
        suggestedModel: 'opus', // Complex reasoning needed
        requiredTools: ['Read', 'Glob', 'Grep', 'Bash'],
        tokenBudget: this.calculateTokenBudget(totalHours * 0.15)
      },
      {
        name: 'Core Implementation',
        description: 'Build main features, write core logic, implement integrations',
        estimatedHours: totalHours * 0.5,
        objectives: [
          'Implement primary features',
          'Write integration logic',
          'Create utility functions and helpers'
        ],
        suggestedModel: 'sonnet', // Fast, capable coding
        requiredTools: ['Edit', 'Write', 'Read', 'Bash'],
        tokenBudget: this.calculateTokenBudget(totalHours * 0.5)
      },
      {
        name: 'Testing & Integration',
        description: 'Write tests, fix bugs, ensure components work together',
        estimatedHours: totalHours * 0.25,
        objectives: [
          'Write comprehensive test coverage',
          'Fix identified bugs and issues',
          'Verify all components integrate properly'
        ],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Bash', 'Read'],
        tokenBudget: this.calculateTokenBudget(totalHours * 0.25)
      },
      {
        name: 'Polish & Documentation',
        description: 'Refactor code, optimize performance, write docs',
        estimatedHours: totalHours * 0.1,
        objectives: [
          'Code cleanup and refactoring',
          'Performance optimization',
          'Write user and developer documentation'
        ],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Write', 'Read'],
        tokenBudget: this.calculateTokenBudget(totalHours * 0.1)
      }
    ];

    // Filter out phases that are too short (<1 hour)
    return phases.filter(phase => phase.estimatedHours >= 1);
  }

  /**
   * Scan project files and gather metadata
   */
  private async scanProjectFiles(projectPath: string): Promise<ProjectMetadata> {
    // Implementation details...
  }

  private buildAnalysisPrompt(path: string, metadata: ProjectMetadata): string {
    return `
You are analyzing a software project to estimate complexity and development time.

Project Path: ${path}
File Count: ${metadata.fileCount}
Total Size: ${metadata.totalSizeKB}KB
Languages: ${metadata.languages.join(', ')}
Has Tests: ${metadata.hasTests ? 'Yes' : 'No'}
Has Documentation: ${metadata.hasDocs ? 'Yes' : 'No'}

Key Files:
${metadata.keyFiles.map(f => `- ${f}`).join('\n')}

Please analyze this project and provide:

1. **Complexity Score** (1-10 scale):
   - 1-3: Simple (CRUD, basic scripts, small utilities)
   - 4-6: Moderate (Multi-component apps, APIs, standard web apps)
   - 7-9: Complex (Distributed systems, ML pipelines, large codebases)
   - 10: Very Complex (OS kernels, compilers, enterprise systems)

2. **Time Estimate** (in hours):
   - Consider codebase size, complexity, and scope
   - Assume experienced developer working efficiently
   - Account for testing and documentation time

3. **Key Technologies**:
   - List main frameworks, libraries, languages used

4. **Development Phases**:
   - Suggest logical breakdown of work
   - Estimate percentage of time per phase

5. **Risk Factors**:
   - Identify potential challenges or blockers
   - Note missing documentation or tests
   - Flag deprecated dependencies

Provide analysis as JSON:
{
  "complexity": <1-10>,
  "estimatedHours": <number>,
  "technologies": [<strings>],
  "phases": [{"name": <string>, "percentage": <number>}],
  "risks": [<strings>]
}
    `.trim();
  }

  private calculateTokenBudget(hours: number): number {
    // Rough estimate: 30,000 tokens per hour at moderate pace
    return Math.floor(hours * 30000);
  }
}
```

4. **Database Schema**

```typescript
// src/database.ts - Core deliverable

import Database from 'better-sqlite3';

export class OptimizerDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        complexity INTEGER NOT NULL,
        estimated_hours REAL NOT NULL,
        file_count INTEGER,
        size_kb INTEGER,
        has_tests BOOLEAN,
        has_docs BOOLEAN,
        analyzed_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_phases (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        estimated_hours REAL NOT NULL,
        suggested_model TEXT NOT NULL,
        token_budget INTEGER,
        phase_order INTEGER,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS phase_objectives (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL,
        objective TEXT NOT NULL,
        order_index INTEGER,
        FOREIGN KEY(phase_id) REFERENCES session_phases(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        phase_id TEXT,
        status TEXT NOT NULL,
        start_time INTEGER,
        end_time INTEGER,
        tokens_used INTEGER,
        cost REAL,
        model TEXT,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(phase_id) REFERENCES session_phases(id)
      );

      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    `);
  }

  saveProjectAnalysis(analysis: ProjectAnalysis): void {
    // Insert project
    // Insert phases
    // Insert objectives
  }

  getProject(projectPath: string): ProjectAnalysis | null {
    // Retrieve from database
  }
}
```

5. **CLI Command**

```typescript
// src/cli.ts - Initial version

import { Command } from 'commander';
import { ProjectAnalyzer } from './project-analyzer';

const program = new Command();

program
  .name('claude-optimizer')
  .version('2.0.0')
  .description('AI-powered Claude Code session optimizer');

program
  .command('analyze <project-path>')
  .description('Analyze project complexity and generate session plan')
  .action(async (projectPath) => {
    console.log('🔍 Analyzing project...');

    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyzeProject(projectPath);

    console.log('\n📊 Analysis Results:');
    console.log(`   Complexity: ${analysis.complexity}/10`);
    console.log(`   Estimated Time: ${analysis.estimatedHours} hours`);
    console.log(`   Files: ${analysis.fileCount}`);
    console.log(`   Technologies: ${analysis.technologies.join(', ')}`);

    console.log('\n📋 Recommended Sessions:');
    analysis.phases.forEach((phase, i) => {
      console.log(`   ${i + 1}. ${phase.name} (${phase.estimatedHours}h)`);
      console.log(`      Model: ${phase.suggestedModel}`);
      console.log(`      Objectives: ${phase.objectives.length}`);
    });

    if (analysis.riskFactors.length > 0) {
      console.log('\n⚠️  Risk Factors:');
      analysis.riskFactors.forEach(risk => {
        console.log(`   • ${risk}`);
      });
    }
  });

program.parse();
```

**Success Criteria**:
- [ ] `claude-optimizer analyze ./test-project` works end-to-end
- [ ] Claude SDK successfully analyzes project complexity
- [ ] Session phases are logically generated
- [ ] Database stores analysis results
- [ ] All TypeScript compiles without errors
- [ ] Basic tests pass

**Checkpoints**:
- ✅ Hour 1: Project setup, dependencies installed, TypeScript configured
- ✅ Hour 2: File scanner working, metadata collection complete
- ✅ Hour 3: Claude SDK integration, analysis prompt working
- ✅ Hour 4: Session phase generation, database schema created
- ✅ Hour 5: CLI command functional, tests written, documentation updated

---

### **SESSION 2: Calendar Integration & Session Manager** (5 hours)

**Objective**: Build Google Calendar integration and Claude SDK session automation

**Token Allocation**: 90-110 prompts
- Google Calendar OAuth: 25 prompts (Sonnet)
- Calendar Event Creation: 20 prompts (Sonnet)
- Session Manager Core: 35 prompts (Opus - complex SDK integration)
- Calendar Watcher: 15 prompts (Sonnet)
- Testing & Integration: 15 prompts (Sonnet)

**Deliverables**:

1. **New Files**
   ```
   src/
   ├── calendar-service.ts          # ← SESSION 2
   ├── session-manager.ts           # ← SESSION 2
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

3. **Session Manager**
   - Claude SDK session automation
   - Real-time progress tracking
   - Token/cost monitoring
   - Objective completion detection
   - Error handling and recovery

4. **Calendar Watcher**
   - Background service polling calendar
   - 30-minute and 5-minute warnings
   - Automatic session trigger at scheduled time
   - macOS notification integration

**Key Implementation**:

```typescript
// src/calendar-service.ts

export class CalendarService {
  async createSessionSchedule(
    analysis: ProjectAnalysis,
    preferences: SchedulePreferences
  ): Promise<CalendarEvent[]> {
    // 1. Find available time slots
    const slots = await this.findAvailableSlots(preferences);

    // 2. Create calendar event for each phase
    const events = await Promise.all(
      analysis.phases.map((phase, i) =>
        this.createEvent(phase, slots[i])
      )
    );

    return events;
  }
}

// src/session-manager.ts

export class SessionManager extends EventEmitter {
  async startSessionFromCalendar(event: CalendarEvent): Promise<void> {
    const session = query({
      prompt: this.buildSessionPrompt(event.sessionConfig),
      options: {
        model: this.getModelName(event.sessionConfig.model),
        permissionMode: 'bypassPermissions',
        settingSources: ['project']
      }
    });

    for await (const message of session) {
      this.processMessage(message);
      this.emit('update', message);
    }
  }
}
```

**Success Criteria**:
- [ ] OAuth flow completes successfully
- [ ] Calendar events created with session configs
- [ ] Session manager starts Claude SDK sessions
- [ ] Real-time updates emitted via EventEmitter
- [ ] Calendar watcher detects upcoming sessions
- [ ] Auto-start triggers at scheduled time

**Checkpoints**:
- ✅ Hour 1: OAuth setup, Google Calendar API working
- ✅ Hour 2: Event creation logic, free/busy detection
- ✅ Hour 3: Session manager core, Claude SDK integration
- ✅ Hour 4: Calendar watcher service, notification system
- ✅ Hour 5: End-to-end test, debugging, polish

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

2. **Dashboard Server**
   - Express API routes
   - WebSocket server for real-time updates
   - Session state management
   - Calendar event endpoints

3. **React Dashboard Updates**
   - Real-time session monitoring component
   - Calendar timeline view
   - Project analysis display
   - Auto-refresh on session events

4. **Complete CLI**
   - `claude-optimizer analyze <path>`
   - `claude-optimizer schedule <path>`
   - `claude-optimizer start` (background service)
   - `claude-optimizer status`
   - `claude-optimizer calendar setup`

**Success Criteria**:
- [ ] Dashboard shows real-time session progress
- [ ] WebSocket updates working smoothly
- [ ] Calendar view displays scheduled sessions
- [ ] All CLI commands working end-to-end
- [ ] Documentation complete
- [ ] Ready for production use

**Checkpoints**:
- ✅ Hour 1: Dashboard server setup, API routes
- ✅ Hour 2: WebSocket integration, real-time updates
- ✅ Hour 3: React components, calendar view
- ✅ Hour 4: CLI commands, final features
- ✅ Hour 5: Testing, documentation, polish

---

## 🎯 Overall Success Metrics

### **Technical Metrics**

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Installation time | <2 minutes | `npm install && npm run build` |
| First analysis | <30 seconds | `claude-optimizer analyze ./test-project` |
| Calendar setup | <3 minutes | OAuth flow completion |
| Session auto-start | 100% reliable | Calendar event triggers session |
| Dashboard latency | <100ms | WebSocket message delivery |
| Memory footprint | <50MB | Process monitoring |

### **Functional Requirements**

- ✅ Analyze any codebase in any language
- ✅ Generate accurate complexity scores (±1 point)
- ✅ Create optimal session schedules
- ✅ Integrate with Google Calendar
- ✅ Auto-start sessions at scheduled times
- ✅ Real-time dashboard monitoring
- ✅ Track tokens, cost, progress
- ✅ Handle errors gracefully

### **User Experience Goals**

- ✅ One-command installation
- ✅ Intuitive CLI interface
- ✅ Clear, actionable analysis output
- ✅ Beautiful dashboard UI
- ✅ Reliable automation
- ✅ Helpful error messages

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
mkdir claude-optimizer-v2
cd claude-optimizer-v2

# Initialize npm
npm init -y

# Install dependencies
npm install @anthropic-ai/claude-agent-sdk
npm install googleapis google-auth-library
npm install better-sqlite3
npm install commander inquirer ora chalk
npm install express ws
npm install --save-dev typescript @types/node @types/express @types/ws
npm install --save-dev vitest @vitest/ui

# TypeScript config
npx tsc --init
```

### **TypeScript Configuration**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### **Package.json Scripts**

```json
{
  "name": "claude-optimizer",
  "version": "2.0.0",
  "type": "module",
  "bin": {
    "claude-optimizer": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "cli": "node --loader ts-node/esm src/cli.ts",
    "start": "npm run build && node dist/cli.js"
  }
}
```

---

## 📝 Testing Strategy

### **Unit Tests**

```typescript
// tests/project-analyzer.test.ts

import { describe, it, expect } from 'vitest';
import { ProjectAnalyzer } from '../src/project-analyzer';

describe('ProjectAnalyzer', () => {
  it('should analyze a simple project', async () => {
    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyzeProject('./test-fixtures/simple-app');

    expect(analysis.complexity).toBeGreaterThan(0);
    expect(analysis.complexity).toBeLessThanOrEqual(10);
    expect(analysis.phases.length).toBeGreaterThan(0);
  });

  it('should generate appropriate session phases', async () => {
    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyzeProject('./test-fixtures/medium-app');

    expect(analysis.phases).toContainEqual(
      expect.objectContaining({ name: 'Planning & Setup' })
    );
  });
});
```

### **Integration Tests**

```typescript
// tests/integration.test.ts

describe('End-to-End Flow', () => {
  it('should complete full workflow', async () => {
    // 1. Analyze project
    const analysis = await analyzer.analyzeProject('./test-project');

    // 2. Create calendar schedule
    const events = await calendar.createSessionSchedule(analysis, preferences);

    // 3. Verify events created
    expect(events.length).toBe(analysis.phases.length);

    // 4. Simulate calendar trigger
    await sessionManager.startSessionFromCalendar(events[0]);

    // 5. Verify session started
    const status = sessionManager.getActiveSession();
    expect(status).toBeTruthy();
    expect(status.status).toBe('active');
  });
});
```

---

## 🚀 Deployment Checklist

### **Pre-Release**

- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] CLI commands work end-to-end
- [ ] Documentation complete
- [ ] Examples added
- [ ] Error handling comprehensive
- [ ] Performance optimized

### **Release Process**

```bash
# 1. Build production
npm run build

# 2. Test production build
npm run start -- analyze ./test-project

# 3. Publish to npm
npm publish

# 4. Create GitHub release
git tag v2.0.0
git push --tags
```

### **Post-Release**

- [ ] Update README with installation instructions
- [ ] Create demo video
- [ ] Write blog post
- [ ] Share on social media
- [ ] Monitor for issues
- [ ] Respond to user feedback

---

## 📚 Documentation Structure

### **README.md**

```markdown
# Claude Optimizer 🌙

> AI-powered session optimizer with automated calendar scheduling

## Quick Start

```bash
npx claude-optimizer analyze ./my-project
npx claude-optimizer schedule ./my-project
npx claude-optimizer start
```

## Features

✅ AI-powered project analysis
✅ Google Calendar integration
✅ Automated session scheduling
✅ Real-time dashboard monitoring
✅ Token & cost tracking

[Full documentation →]
```

### **API Documentation**

```markdown
# API Reference

## ProjectAnalyzer

### analyzeProject(path: string): Promise<ProjectAnalysis>

Analyzes a codebase and returns complexity metrics...

## CalendarService

### createSessionSchedule(analysis, preferences): Promise<CalendarEvent[]>

Creates optimized calendar schedule...
```

---

## 🎯 Success Definition

**The project is successful when:**

1. ✅ A user can run `npx claude-optimizer schedule ./project`
2. ✅ Calendar events are created automatically
3. ✅ Sessions start automatically at scheduled times
4. ✅ Dashboard shows real-time progress
5. ✅ Total setup time < 5 minutes
6. ✅ Zero manual intervention needed
7. ✅ Reliable and error-free operation

**Ready for Session 1!** 🚀
