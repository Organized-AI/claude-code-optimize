# Architecture Comparison: SDK vs Native Workflows

## 🔄 The Transformation

### Old Approach (Agent SDK)
**Philosophy**: Programmatically control Claude Code from external TypeScript application

### New Approach (Native Workflows)
**Philosophy**: Leverage Claude Code's built-in features for workflow automation

---

## 📊 Side-by-Side Comparison

### Project Analysis

| Feature | SDK Approach | Native Workflows |
|---------|-------------|------------------|
| **Analysis Method** | Call `query()` with prompt to Claude | Rule-based TypeScript heuristics |
| **Implementation** | `@anthropic-ai/claude-agent-sdk` | Simple file scanning + formulas |
| **Reliability** | Depends on API availability | Always works (local code) |
| **Speed** | 5-10 seconds (API call) | <1 second (local execution) |
| **Customization** | Limited to prompt engineering | Full TypeScript control |

**Old Code**:
```typescript
const session = query({
  prompt: this.buildAnalysisPrompt(metadata),
  options: {
    model: 'claude-opus-4-20250514',
    permissionMode: 'bypassPermissions'
  }
});

for await (const message of session) {
  // Process Claude's analysis...
}
```

**New Code**:
```typescript
const analyzer = new ProjectAnalyzer();
const analysis = await analyzer.analyze(projectPath);
// Uses file count, technology detection, formulas
// No API calls, instant results
```

---

### Session Automation

| Feature | SDK Approach | Native Workflows |
|---------|-------------|------------------|
| **Trigger Method** | Calendar polling → SDK `query()` | GitHub Actions → Issue with @claude |
| **Session Start** | Programmatic via SDK | Natural @claude mention |
| **Agent Selection** | Pass agent config to SDK | `claude --agent path/to/agent.md` |
| **Context Injection** | SDK session parameters | SessionStart hook + CLAUDE.md |
| **Progress Tracking** | SDK event listeners | PostToolUse hook → JSON file |

**Old Code**:
```typescript
const sessionManager = new ClaudeSessionManager();

// Calendar triggers this
await sessionManager.startSessionFromCalendar(calendarEvent);

// Inside:
const session = query({
  prompt: this.createSessionPrompt(config),
  options: {
    model: getModelName(config.model),
    allowedTools: config.tools
  }
});
```

**New Code**:
```yaml
# .github/workflows/claude-scheduler.yml
- name: Create session issue
  run: |
    gh issue create \
      --title "Claude Session: Planning" \
      --body "Load agent: .claude/agents/planning-agent.md\n\n@claude start" \
      --label claude-session
```

**Hook Code**:
```bash
# ~/.claude/hooks/session-start.sh
if [ -f ".claude/session-plan.json" ]; then
  COMPLEXITY=$(jq -r '.complexity' .claude/session-plan.json)
  echo "Complexity: $COMPLEXITY/10"
fi
```

---

### Calendar Integration

| Feature | SDK Approach | Native Workflows |
|---------|-------------|------------------|
| **Calendar System** | Google Calendar API | GitHub Actions cron |
| **Authentication** | OAuth 2.0 flow | GitHub secrets |
| **Event Creation** | `calendar.events.insert()` | Workflow YAML file |
| **Event Triggers** | Poll every 5 minutes | Native cron triggers |
| **Scheduling Logic** | Custom free/busy detection | GitHub's built-in scheduler |

**Old Code**:
```typescript
// Complex OAuth setup
const calendar = google.calendar({ version: 'v3', auth });

// Create events
await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: `Claude Session: ${phase.name}`,
    start: { dateTime: slot.start.toISOString() },
    // Store config in extended properties
    extendedProperties: {
      private: { sessionConfig: JSON.stringify(config) }
    }
  }
});

// Background watcher polls calendar
setInterval(async () => {
  const events = await calendar.events.list({
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString()
  });
  // Check if should start session...
}, 5 * 60 * 1000);
```

**New Code**:
```yaml
# .github/workflows/claude-scheduler.yml
on:
  schedule:
    - cron: '0 9 * * 1'    # Monday 9 AM - Planning
    - cron: '0 9 * * 2-4'  # Tue-Thu 9 AM - Implementation
    - cron: '0 9 * * 5'    # Friday 9 AM - Testing

jobs:
  trigger-session:
    steps:
      - name: Create issue for session
        run: gh issue create --title "Session: Planning" --body "@claude start"
```

---

### Progress Monitoring

| Feature | SDK Approach | Native Workflows |
|---------|-------------|------------------|
| **Tracking Method** | EventEmitter in SDK wrapper | Hooks writing to JSON |
| **Data Transport** | WebSocket to dashboard | File watching |
| **Token Counting** | SDK usage stats | Hook-based estimation |
| **Real-time Updates** | WebSocket.send() | fs.watch() |
| **State Storage** | In-memory + SQLite | JSON files |

**Old Code**:
```typescript
// Session manager emits events
this.sessionManager.on('token:update', (data) => {
  this.broadcast('token:update', data);
});

// WebSocket to dashboard
wss.clients.forEach(client => {
  client.send(JSON.stringify({ type: 'token:update', data }));
});

// Dashboard receives
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  setState(data);
};
```

**New Code**:
```bash
# ~/.claude/hooks/post-tool-use.sh
TOKENS=$((CURRENT + 1000))  # Estimate
jq ".totalTokens = $TOKENS" .claude/session-log.json > tmp
mv tmp .claude/session-log.json
```

```typescript
// Dashboard watches file
const watcher = fs.watch('.claude/session-log.json', () => {
  const log = JSON.parse(fs.readFileSync('.claude/session-log.json'));
  setState({ tokens: log.totalTokens, cost: log.estimatedCost });
});
```

---

## 🎯 Key Advantages of Native Workflows

### 1. Simplicity

**SDK Approach**:
```typescript
// 150+ lines of complex setup
import { query } from '@anthropic-ai/claude-agent-sdk';
const session = query({ ... });
for await (const message of session) { ... }
// Handle message types, errors, reconnection, etc.
```

**Native Approach**:
```bash
# 10 lines of bash
/analyze-project
/create-session-agents
gh workflow run claude-scheduler.yml
```

### 2. Maintainability

**SDK Approach**:
- Breaking changes in SDK versions
- Complex TypeScript async patterns
- Error handling for SDK edge cases
- WebSocket connection management

**Native Approach**:
- Stable shell scripts
- Standard YAML workflows
- Simple file I/O
- Hooks rarely change

### 3. Transparency

**SDK Approach**:
- Hidden SDK internals
- Complex event flow
- Hard to debug

**Native Approach**:
- Visible bash scripts
- Clear workflow files
- Easy to inspect and modify

### 4. Portability

**SDK Approach**:
- Requires Node.js runtime
- SDK must be installed
- Version compatibility issues

**Native Approach**:
- Works anywhere with Claude Code
- Standard bash/YAML
- CI/CD ready out of box

---

## 📋 Feature Parity Matrix

| Feature | SDK | Native | Winner |
|---------|-----|--------|--------|
| Project Analysis | ✅ AI-powered | ✅ Rule-based | Native (faster) |
| Agent Creation | ✅ Programmatic | ✅ File generation | Tie |
| Scheduling | ✅ Calendar polling | ✅ GitHub cron | Native (simpler) |
| Session Triggers | ✅ SDK query() | ✅ @claude mention | Native (natural) |
| Progress Tracking | ✅ EventEmitter | ✅ Hooks + JSON | Native (transparent) |
| Token Monitoring | ✅ SDK stats | ✅ Hook estimation | SDK (accurate) |
| Dashboard Updates | ✅ WebSocket | ✅ File watch | Native (simpler) |
| Error Handling | ❌ Complex | ✅ Simple | Native |
| Learning Curve | ❌ Steep | ✅ Gentle | Native |
| Reliability | ⚠️ API-dependent | ✅ Always works | Native |

**Score**: Native Workflows win 8/10 categories

---

## 🚀 Migration Path

### What to Keep from SDK Version

1. **Database Schema** - Still useful for historical tracking
   ```sql
   -- Keep these tables
   CREATE TABLE projects ...
   CREATE TABLE session_phases ...
   ```

2. **Type Definitions** - Reuse for TypeScript analyzer
   ```typescript
   export interface ProjectAnalysis { ... }
   export interface SessionPhase { ... }
   ```

3. **File Scanner** - Works great, no AI needed
   ```typescript
   export class FileScanner {
     async scanProject(path: string): Promise<ProjectMetadata>
   }
   ```

### What to Replace

1. **Project Analyzer** - Replace SDK `query()` with heuristics
   ```diff
   - const analysis = await this.analyzeWithClaude(metadata);
   + const complexity = this.calculateComplexity(files);
   ```

2. **Session Manager** - Replace with hooks
   ```diff
   - class ClaudeSessionManager extends EventEmitter
   + ~/.claude/hooks/session-start.sh
   ```

3. **Calendar Service** - Replace with GitHub Actions
   ```diff
   - class CalendarService { google.calendar() ... }
   + .github/workflows/claude-scheduler.yml
   ```

4. **WebSocket Server** - Replace with file watching
   ```diff
   - const wss = new WebSocketServer({ port: 8080 });
   + fs.watch('.claude/session-log.json', callback);
   ```

---

## 💡 When to Use Each Approach

### Use SDK Approach When:
- You need real-time programmatic control
- Building a product that wraps Claude Code
- Require precise token counting
- Need complex event orchestration

### Use Native Workflows When:
- Optimizing your own Claude Code usage
- Want simple, maintainable automation
- Working in CI/CD environments
- Prefer transparent, debuggable systems
- **Building Claude Code Optimizer** ✅

---

## 🎓 Learning Takeaways

```★ Insight ─────────────────────────────────────
1. **SDK ≠ The Only Way**: Claude Code has powerful built-in features (slash commands, hooks, agents) designed for exactly this kind of workflow automation - using them is often simpler than building SDK wrappers.

2. **Files as State**: Instead of complex WebSocket/EventEmitter patterns, hooks writing to JSON files + file watching is surprisingly effective for dashboard updates - simpler mental model, easier to debug.

3. **GitHub Actions as Calendar**: We don't need Google Calendar API - GitHub Actions' cron scheduling + issue creation is a perfect fit for triggering Claude sessions, with bonus integration to your code repository.
─────────────────────────────────────────────────```

---

## 🎯 Recommended Approach

**For Claude Code Optimizer**: Use **Native Workflows**

**Reasons**:
1. Simpler to build and maintain
2. Leverages Claude Code's strengths
3. Works reliably without external APIs
4. Easy for others to understand and contribute
5. Transparent and debuggable

**Next Steps**:
1. Read `SESSION_1_START_NATIVE_WORKFLOWS.md`
2. Implement rule-based analyzer
3. Create slash commands
4. Set up hooks system
5. Add GitHub Actions workflows

---

*This comparison guide helps transition from SDK thinking to native workflows thinking.*
