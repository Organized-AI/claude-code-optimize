# Claude Agent SDK vs Claude Code Headless Mode

## 🎯 The Critical Difference

### Claude Agent SDK
**Purpose**: Build custom AI agents that can use tools and interact with systems

**Use Case**: You're building a NEW AI-powered application (chatbot, assistant, automation tool)

**Example**:
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// You're building a custom AI agent
const session = query({
  prompt: "Analyze this codebase and suggest improvements",
  options: {
    model: 'claude-opus-4',
    allowedTools: ['Read', 'Glob', 'Bash']
  }
});

for await (const message of session) {
  // YOUR code processes Claude's responses
  // YOUR code decides what to do with tool use
  // YOU control the conversation flow
}
```

**What You Get**:
- You write code that USES Claude as a tool
- Claude becomes part of YOUR application
- You control prompts, tool access, and flow
- You build the agent's personality/behavior

---

### Claude Code (Headless Mode)
**Purpose**: Use the existing Claude Code CLI tool programmatically

**Use Case**: You want to trigger/automate Claude Code sessions that run like normal Claude Code sessions

**Example**:
```bash
# Headless mode - just runs Claude Code without interactive prompt
claude --print "Build a React component for user login"

# Output is Claude Code's response
# Claude Code handles all tool use, decision making, etc.
```

**What You Get**:
- You trigger Claude Code (the existing tool)
- Claude Code runs as it normally would
- You just provide the initial prompt
- Claude Code handles everything else

---

## 📊 Detailed Comparison

### Architecture Perspective

#### Claude Agent SDK Architecture
```
┌─────────────────────────────────────────────────────┐
│ YOUR APPLICATION                                     │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ Your Custom Agent Logic                    │    │
│  │                                             │    │
│  │  • You define the prompts                  │    │
│  │  • You handle tool results                 │    │
│  │  • You control conversation flow           │    │
│  │  • You parse responses                     │    │
│  │  • You decide what happens next            │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ Claude Agent SDK                           │    │
│  │  query() → Claude API → Responses          │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

#### Claude Code Headless Architecture
```
┌─────────────────────────────────────────────────────┐
│ YOUR APPLICATION                                     │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ You just trigger it:                        │    │
│  │   exec('claude --print "Build login"')     │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ CLAUDE CODE (existing tool)                │    │
│  │                                             │    │
│  │  • Claude Code defines prompts             │    │
│  │  • Claude Code handles tool results        │    │
│  │  • Claude Code controls flow               │    │
│  │  • Claude Code makes all decisions         │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Practical Examples

### Example 1: Code Analysis

#### Using Claude Agent SDK
```typescript
// YOU are building the analyzer
import { query } from '@anthropic-ai/claude-agent-sdk';

async function analyzeProject(path: string) {
  const session = query({
    prompt: `Analyze the project at ${path} and provide complexity score`,
    options: {
      model: 'claude-opus-4',
      allowedTools: ['Read', 'Glob', 'Bash(ls:*,wc:*)']
    }
  });

  let complexity = 0;
  let response = '';

  for await (const message of session) {
    if (message.type === 'text') {
      response += message.text;
    }

    if (message.type === 'tool_use') {
      // YOU handle what happens with each tool use
      console.log(`Claude used: ${message.tool}`);
    }
  }

  // YOU parse the response
  complexity = extractComplexityFromResponse(response);

  return complexity;
}
```

**Pros**:
- Full control over the agent's behavior
- Can customize exactly how analysis happens
- Can limit tool access precisely

**Cons**:
- You write all the logic
- Uses your tokens
- More complex to build
- You're responsible for prompt engineering

---

#### Using Claude Code Headless
```typescript
// You just trigger Claude Code
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function analyzeProject(path: string) {
  // Just run Claude Code with a prompt
  const { stdout } = await execAsync(
    `cd ${path} && claude --print "Analyze this project's complexity. Provide a score 1-10 and explanation."`
  );

  // Claude Code handles everything, you get the output
  console.log(stdout);

  // Parse the output (Claude Code already did the analysis)
  return parseClaudeCodeOutput(stdout);
}
```

**Pros**:
- Claude Code's existing capabilities
- No custom agent logic needed
- Claude Code's optimized prompts and behavior

**Cons**:
- Less control over exact behavior
- Uses Claude Code's token limits
- Can't customize tool permissions as precisely

---

## 🎯 When to Use Each

### Use Claude Agent SDK When:

1. **Building a Custom AI Application**
   ```typescript
   // Example: Building a customer support chatbot
   const chatbot = query({
     prompt: "You are a helpful customer support agent for Acme Corp...",
     options: {
       model: 'claude-sonnet-4',
       allowedTools: ['Read(./customer-data/*)', 'mcp__database_query']
     }
   });
   ```

2. **Need Precise Control**
   - Custom tool permissions
   - Specific conversation flows
   - Integration with your own databases/APIs
   - Custom prompt engineering

3. **Building a Product**
   - SaaS application with AI features
   - Internal tools with AI assistance
   - Automated workflows with specific requirements

### Use Claude Code Headless When:

1. **Automating Development Tasks**
   ```bash
   # Trigger Claude Code to work on a feature
   claude --print "Implement user authentication with OAuth2"
   ```

2. **Scheduling Claude Code Sessions**
   ```typescript
   // Start a Claude Code session at scheduled time
   async function startScheduledSession() {
     const prompt = loadSessionPromptFromCalendar();
     exec(`cd ${projectPath} && claude --print "${prompt}"`);
   }
   ```

3. **Integrating with Existing Workflow**
   - CI/CD pipelines
   - Git hooks
   - Calendar-triggered sessions
   - Automated code reviews

---

## 🎪 For Your Project: Which Should You Use?

### Your Goal:
> "I want to build in a calendar that can start and execute commands in Claude Code SDK"

### The Confusion:
You want to **trigger Claude Code sessions**, not build a custom agent from scratch.

### ✅ Correct Choice: Claude Code Headless + Shell Automation

**Why**:
1. **You're not building a new AI agent** - you're automating an existing tool (Claude Code)
2. **You want Claude Code's capabilities** - file editing, bash commands, etc.
3. **You want to schedule sessions** - calendar triggers Claude Code, not a custom agent
4. **You want the dashboard to show activity** - watch Claude Code's log files

### Implementation:
```typescript
// Calendar watcher detects it's time for a session
export class CalendarWatcher {
  async autoStartSession(event: CalendarEvent) {
    const { projectPath, phase } = event.sessionConfig;

    // Build prompt for this session phase
    const prompt = `
      Session: ${phase.name}
      Objectives:
      ${phase.objectives.map(o => `- ${o}`).join('\n')}

      Please begin working on these objectives.
    `;

    // Use AppleScript to open Terminal and run Claude Code
    const script = `
      tell application "Terminal"
        activate
        do script "cd '${projectPath}' && claude --print '${prompt}'"
      end tell
    `;

    await execAsync(`osascript -e '${script}'`);

    // Now monitor the session via log files
    this.watchSessionLogs();
  }

  watchSessionLogs() {
    // Watch ~/.claude/logs/session-*.jsonl
    const logPath = this.getLatestSessionLog();

    fs.watch(logPath, () => {
      const newMessages = this.readNewLogEntries(logPath);

      // Send to dashboard via WebSocket
      newMessages.forEach(msg => {
        this.dashboardServer.emitSessionUpdate(msg);
      });
    });
  }
}
```

---

## 🚫 What NOT to Do

### ❌ Don't Use Agent SDK for This:
```typescript
// ❌ WRONG: This builds a custom agent, not triggering Claude Code
const session = query({
  prompt: "Work on implementing user authentication",
  options: {
    model: 'claude-opus-4',
    allowedTools: ['Edit', 'Write', 'Bash']
  }
});

// You'd have to build all the logic for:
// - How to edit files
// - How to run commands
// - How to track progress
// - How to handle errors
// - Essentially rebuilding Claude Code from scratch!
```

**Problems**:
- You'd be rebuilding Claude Code's functionality
- Your custom agent won't have Claude Code's optimizations
- No access to Claude Code's session management
- Can't leverage Claude Code's proven workflows

---

## 📊 Feature Comparison

| Feature | Claude Agent SDK | Claude Code Headless |
|---------|------------------|---------------------|
| **Purpose** | Build custom AI agents | Automate existing Claude Code |
| **Control** | Full control over behavior | Claude Code handles behavior |
| **Tool Access** | You define available tools | Claude Code's standard tools |
| **Prompt Engineering** | You write all prompts | Claude Code optimized prompts |
| **Session Management** | You implement it | Claude Code handles it |
| **File Editing** | You handle tool results | Claude Code's Edit tool |
| **Error Handling** | You implement it | Claude Code's built-in handling |
| **Use Case** | New AI applications | Automating dev workflows |
| **Complexity** | High (build from scratch) | Low (just trigger it) |
| **Token Usage** | Your API key/account | Claude Code's quota system |
| **Log Files** | You create them | `~/.claude/logs/*.jsonl` |
| **Monitoring** | You implement it | Read Claude Code's logs |

---

## 🎯 Decision Matrix

```
Do you need to BUILD a custom AI agent with specific behavior?
│
├─ YES → Use Claude Agent SDK
│   └─ Examples:
│       • Customer support chatbot
│       • Custom code generation tool
│       • AI assistant for specific domain
│       • Product with embedded AI
│
└─ NO → Do you want to AUTOMATE existing Claude Code?
    │
    └─ YES → Use Claude Code Headless
        └─ Examples:
            • Calendar-scheduled coding sessions
            • CI/CD triggered code reviews
            • Git hook code analysis
            • Automated project setup
```

---

## 💡 Analogy

### Claude Agent SDK = Building a Car
- You design the engine
- You choose the features
- You control every aspect
- You're responsible for making it work

### Claude Code Headless = Using a Rental Car
- Car already exists and works
- You just need to drive it
- You tell it where to go (initial prompt)
- It handles the mechanics

**Your Project**: You need a rental car (Claude Code), not to build a car from scratch!

---

## ✅ Final Recommendation for Your Project

### Architecture:
```
1. PROJECT ANALYZER
   • Rule-based heuristics (NO Agent SDK, NO Claude Code)
   • Simple calculations: file count, tech stack, etc.
   • Fast, free, accurate enough

2. CALENDAR SCHEDULER
   • Google Calendar API
   • Create events with session configs
   • Store phase objectives in metadata

3. CALENDAR WATCHER
   • Background daemon
   • Polls calendar every 5 minutes
   • Detects upcoming sessions

4. SESSION STARTER (CRITICAL CHOICE)
   ✅ Use Claude Code Headless:
      • AppleScript opens Terminal
      • Run: claude --print "prompt for phase"
      • Claude Code does its thing

   ❌ Don't use Agent SDK:
      • You'd rebuild Claude Code
      • Unnecessary complexity
      • More token usage
      • Harder to maintain

5. SESSION MONITOR
   • Watch ~/.claude/logs/session-*.jsonl
   • Parse JSONL messages
   • Stream to dashboard via WebSocket
```

---

## 🎓 Key Takeaway

**Claude Agent SDK** = "I want to build a custom AI-powered application"
**Claude Code Headless** = "I want to automate when/how Claude Code runs"

**Your project** = Calendar-triggered Claude Code sessions → **Use Headless Mode**

You're automating an existing tool (Claude Code), not building a new AI agent!

---

**Ready to proceed with the correct approach?** The implementation plan uses shell automation + Claude Code headless, which is the right architecture for your calendar integration goal! 🚀
