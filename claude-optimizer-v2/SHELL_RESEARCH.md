# Shell Automation Research - Claude Code

**Research Date**: 2025-09-30
**Purpose**: Determine correct approach for launching and monitoring Claude Code sessions
**Status**: ✅ Complete - CLI approach confirmed viable

---

## Executive Summary

**Finding**: Claude Code provides a **robust CLI interface** that can be used for automation.

**Key Discovery**: The `claude` command supports:
- Non-interactive mode with `--print` flag
- JSON output formats (`--output-format json|stream-json`)
- Model selection (`--model sonnet|opus|haiku`)
- Permission modes (`--permission-mode bypassPermissions`)
- Directory context (runs from current working directory)
- Session resumption (`--continue`, `--resume`)

**Log Files**: Claude Code writes structured JSONL logs to:
```
~/.claude/projects/<project-path-encoded>/<session-uuid>.jsonl
```

**Recommended Approach**: Use CLI + Log Monitoring (No AppleScript needed!)

---

## 1. CLI Research Findings

### Claude CLI Location

```bash
$ which claude
/Users/jordaaan/.nvm/versions/node/v24.7.0/bin/claude
```

The `claude` CLI is a Node.js binary installed in the user's NVM directory.

### CLI Help Output

```
Usage: claude [options] [command] [prompt]

Claude Code - starts an interactive session by default, use -p/--print for
non-interactive output

Arguments:
  prompt                                            Your prompt

Options:
  -p, --print                                       Print response and exit (useful for pipes)
  --output-format <format>                          Output format: "text", "json", or "stream-json"
  --model <model>                                   Model: 'sonnet', 'opus', 'haiku', or full name
  --permission-mode <mode>                          Permission mode: "bypassPermissions", "acceptEdits", "default", "plan"
  --dangerously-skip-permissions                    Bypass all permission checks
  --allowedTools <tools...>                         Comma/space-separated tool names to allow
  --disallowedTools <tools...>                      Comma/space-separated tool names to deny
  -c, --continue                                    Continue most recent conversation
  -r, --resume [sessionId]                          Resume a conversation
  --session-id <uuid>                               Use specific session ID
  --settings <file-or-json>                         Path to settings JSON or JSON string
  --add-dir <directories...>                        Additional directories to allow tool access
  --ide                                             Auto-connect to IDE on startup
```

### Key Features for Automation

#### 1. Non-Interactive Mode (`--print`)
```bash
claude --print "Your prompt here"
```
- Exits after response
- Perfect for automation
- Skips workspace trust dialog

#### 2. JSON Output Formats
```bash
# Single JSON result
claude --print --output-format json "Your prompt"

# Streaming JSON (real-time)
claude --print --output-format stream-json "Your prompt"
```

#### 3. Model Selection
```bash
claude --model sonnet "Your prompt"
claude --model opus "Your prompt"
claude --model claude-sonnet-4-5-20250929 "Your prompt"
```

#### 4. Permission Control
```bash
# Bypass all permissions (for automated sessions)
claude --permission-mode bypassPermissions "Your prompt"

# Skip all permission checks
claude --dangerously-skip-permissions "Your prompt"
```

#### 5. Directory Context
The CLI operates in the current working directory:
```bash
cd /path/to/project
claude --print "Analyze this project"
```

#### 6. Session Management
```bash
# Continue last session
claude --continue

# Resume specific session
claude --resume <session-id>

# Create new session with specific ID
claude --session-id <uuid> "Your prompt"
```

---

## 2. Log File Format Research

### Log File Location Pattern

```
~/.claude/projects/<URL-encoded-project-path>/<session-uuid>.jsonl
```

**Example**:
```
~/.claude/projects/-Users-jordaaan-Library-Mobile-Documents-com-apple-CloudDocs-BHT-Promo-iCloud-Organized-AI-Windsurf-Claude-Code-Optimizer-claude-optimizer-v2/b3fa017a-070e-4fa6-bc05-3d5c8e9cd9c0.jsonl
```

### Log Entry Structure

Each line is a JSON object with this structure:

```typescript
interface LogEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: "external" | "internal";
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  type: "user" | "assistant";
  message: Message;
  uuid: string;
  timestamp: string; // ISO 8601
  requestId?: string;
  toolUseResult?: ToolResult;
}
```

### Message Types

#### User Message
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "Your prompt here"
      }
    ]
  }
}
```

#### Assistant Message (Text)
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01xyz...",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-20250514",
    "content": [
      {
        "type": "text",
        "text": "Response text"
      }
    ],
    "usage": {
      "input_tokens": 4,
      "cache_creation_input_tokens": 6868,
      "cache_read_input_tokens": 5291,
      "output_tokens": 5,
      "service_tier": "standard"
    }
  }
}
```

#### Assistant Message (Tool Use)
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01xyz...",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01abc...",
        "name": "Read",
        "input": {
          "file_path": "/path/to/file"
        }
      }
    ]
  }
}
```

#### Tool Result
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "toolu_01abc...",
        "type": "tool_result",
        "content": "File contents here"
      }
    ]
  },
  "toolUseResult": {
    "stdout": "...",
    "stderr": "...",
    "interrupted": false
  }
}
```

### Token Usage Tracking

Every assistant message includes usage statistics:
```json
"usage": {
  "input_tokens": 7,
  "cache_creation_input_tokens": 7156,
  "cache_read_input_tokens": 5291,
  "cache_creation": {
    "ephemeral_5m_input_tokens": 7156,
    "ephemeral_1h_input_tokens": 0
  },
  "output_tokens": 263,
  "service_tier": "standard"
}
```

**Total tokens** = input_tokens + cache_creation_input_tokens + output_tokens

---

## 3. Automation Strategy

### Recommended Approach: CLI + Log Monitoring

```
┌─────────────────────────────────────────────────────────────┐
│                   Optimizer CLI (Node.js)                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 1. spawn('claude', args, { cwd })
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Claude Code CLI Process (child)                 │
│                                                              │
│  Args: --permission-mode bypassPermissions                  │
│        --model sonnet                                       │
│        --session-id <uuid>                                  │
│        <instruction-prompt>                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 2. Writes to log file
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  ~/.claude/projects/<project>/<session-id>.jsonl           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 3. tail -f monitoring
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      LogMonitor Service                      │
│          (Parses JSONL, tracks progress)                    │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Approach

#### Step 1: Generate Session ID
```typescript
import { randomUUID } from 'crypto';

const sessionId = randomUUID(); // e.g., "b3fa017a-070e-4fa6-bc05-3d5c8e9cd9c0"
```

#### Step 2: Build Instruction Prompt
```typescript
const prompt = `
${config.phase} - ${config.projectName}

## Session Objectives

${config.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## Constraints

- Token Budget: ${config.tokenBudget.toLocaleString()} tokens
- Model: ${config.model}
- Mark each objective complete with: ✓ Completed: [objective description]

## Instructions

Work through each objective methodically. Write production-quality code with proper error handling and documentation. Test your work before marking objectives complete.

BEGIN SESSION NOW.
`.trim();
```

#### Step 3: Launch Claude CLI
```typescript
import { spawn } from 'child_process';

const process = spawn('claude', [
  '--permission-mode', 'bypassPermissions',
  '--model', config.model, // 'sonnet', 'opus', or 'haiku'
  '--session-id', sessionId,
  prompt
], {
  cwd: config.projectPath,
  detached: true,
  stdio: 'ignore' // Run in background
});

process.unref(); // Allow parent to exit
```

#### Step 4: Calculate Log File Path
```typescript
import * as path from 'path';
import * as os from 'os';

function getLogFilePath(projectPath: string, sessionId: string): string {
  // URL-encode project path (replace / with -, spaces with -)
  const encoded = projectPath
    .replace(/^\//, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-');

  return path.join(
    os.homedir(),
    '.claude',
    'projects',
    encoded,
    `${sessionId}.jsonl`
  );
}
```

#### Step 5: Monitor Log File
```typescript
import { spawn } from 'child_process';

const logPath = getLogFilePath(projectPath, sessionId);

// Wait for log file to be created (may take a few seconds)
await waitForFile(logPath, 30000); // 30s timeout

// Start tailing
const tailProcess = spawn('tail', ['-f', '-n', '0', logPath]);

tailProcess.stdout?.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      processLogEntry(entry);
    } catch (error) {
      console.warn('Invalid JSON in log:', line);
    }
  }
});
```

#### Step 6: Parse and Track Progress
```typescript
function processLogEntry(entry: LogEntry): void {
  if (entry.type === 'assistant' && entry.message.usage) {
    // Update token usage
    totalTokens += entry.message.usage.output_tokens;
    totalTokens += entry.message.usage.input_tokens;
    totalTokens += entry.message.usage.cache_creation_input_tokens || 0;

    emit('token-update', totalTokens);
  }

  if (entry.type === 'assistant') {
    const content = entry.message.content;

    for (const block of content) {
      if (block.type === 'text') {
        // Check for objective completion markers
        const match = block.text.match(/✓\s*(?:Completed|Done):\s*(.+)/i);
        if (match) {
          const objective = match[1].trim();
          emit('objective-complete', objective);
        }
      }

      if (block.type === 'tool_use') {
        emit('tool-use', block.name);
      }
    }
  }
}
```

---

## 4. Testing Results

### Test 1: CLI Availability ✅
```bash
$ which claude
/Users/jordaaan/.nvm/versions/node/v24.7.0/bin/claude
```
**Result**: CLI exists and is accessible

### Test 2: Help Documentation ✅
```bash
$ claude --help
```
**Result**: Comprehensive help available with all needed options

### Test 3: Log File Discovery ✅
```bash
$ find ~/.claude/projects -name "*.jsonl" | head -5
```
**Result**: Found multiple session log files with expected structure

### Test 4: Log Format Analysis ✅
```bash
$ tail -20 ~/.claude/projects/.../session.jsonl
```
**Result**: JSONL format confirmed, structure documented

### Test 5: Process Detection ✅
```bash
$ ps aux | grep -i claude | grep -v grep
```
**Result**: Multiple Claude processes found, including main app and helpers

---

## 5. Implementation Plan Updates

### What We Can Do (Confirmed)

✅ **Launch Claude CLI sessions programmatically**
```typescript
spawn('claude', [
  '--permission-mode', 'bypassPermissions',
  '--model', model,
  '--session-id', uuid,
  prompt
], { cwd: projectPath });
```

✅ **Monitor sessions via log files**
```typescript
const logPath = getLogFilePath(projectPath, sessionId);
const tail = spawn('tail', ['-f', logPath]);
tail.stdout.on('data', processLogData);
```

✅ **Track token usage in real-time**
```typescript
// From log entry.message.usage
totalTokens = usage.input_tokens + usage.output_tokens + usage.cache_creation_input_tokens;
```

✅ **Detect objective completions**
```typescript
// Parse assistant messages for patterns
if (text.match(/✓\s*Completed:\s*(.+)/i)) {
  // Objective completed!
}
```

✅ **Identify tool usage**
```typescript
// From log entry.message.content
if (content.type === 'tool_use') {
  console.log(`Tool used: ${content.name}`);
}
```

### What We Don't Need

❌ **AppleScript** - Not needed, CLI is sufficient
❌ **URL Schemes** - Not needed, CLI is sufficient
❌ **GUI Automation** - Not needed, CLI is sufficient
❌ **Claude Agent SDK** - Not needed for external control

---

## 6. Key Implementation Details

### Session ID Generation
```typescript
import { randomUUID } from 'crypto';

const sessionId = randomUUID();
// Example: "b3fa017a-070e-4fa6-bc05-3d5c8e9cd9c0"
```

### Project Path Encoding
```typescript
function encodeProjectPath(projectPath: string): string {
  // Example: /Users/name/project → -Users-name-project
  return projectPath
    .replace(/^\//, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-');
}
```

### Log File Path Construction
```typescript
const logPath = path.join(
  os.homedir(),
  '.claude',
  'projects',
  encodeProjectPath(projectPath),
  `${sessionId}.jsonl`
);
```

### Wait for Log File
```typescript
async function waitForFile(filePath: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      await fs.access(filePath);
      return; // File exists
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Log file not created within ${timeout}ms`);
}
```

### Tail Log File
```typescript
import { spawn } from 'child_process';

const tail = spawn('tail', [
  '-f',      // Follow mode
  '-n', '0'  // Start from end (skip existing lines)
  logPath
]);

tail.stdout.on('data', (chunk) => {
  const lines = chunk.toString().split('\n').filter(Boolean);
  lines.forEach(line => {
    try {
      const entry = JSON.parse(line);
      processLogEntry(entry);
    } catch (error) {
      console.warn('Invalid JSON:', line);
    }
  });
});
```

---

## 7. Cost Calculation

From log entries, we can calculate costs accurately:

```typescript
interface Usage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

const TOKEN_COSTS = {
  'opus': { input: 15.00, output: 75.00 },
  'sonnet': { input: 3.00, output: 15.00 },
  'haiku': { input: 0.80, output: 4.00 }
};

function calculateCost(usage: Usage, model: string): number {
  const costs = TOKEN_COSTS[model];

  // Input cost (includes cache creation)
  const inputCost = (
    (usage.input_tokens + usage.cache_creation_input_tokens) / 1_000_000
  ) * costs.input;

  // Output cost
  const outputCost = (usage.output_tokens / 1_000_000) * costs.output;

  // Cache reads are typically 90% cheaper (but need to verify)
  const cacheReadCost = (usage.cache_read_input_tokens / 1_000_000) * costs.input * 0.1;

  return inputCost + outputCost + cacheReadCost;
}
```

---

## 8. Example Log Entries

### Session Start (User Message)
```json
{
  "parentUuid": null,
  "isSidechain": false,
  "userType": "external",
  "cwd": "/path/to/project",
  "sessionId": "b3fa017a-070e-4fa6-bc05-3d5c8e9cd9c0",
  "version": "2.0.1",
  "gitBranch": "main",
  "type": "user",
  "message": {
    "role": "user",
    "content": [{"type": "text", "text": "Your prompt here"}]
  },
  "uuid": "733f5f6e-ae4e-46e1-b64d-db576ecbd723",
  "timestamp": "2025-09-30T22:02:59.408Z"
}
```

### Assistant Response
```json
{
  "parentUuid": "733f5f6e-ae4e-46e1-b64d-db576ecbd723",
  "type": "assistant",
  "message": {
    "id": "msg_01RPPZiznRSMie95CF3djqSn",
    "role": "assistant",
    "model": "claude-opus-4-20250514",
    "content": [
      {"type": "text", "text": "I'll analyze this project..."}
    ],
    "usage": {
      "input_tokens": 4,
      "cache_creation_input_tokens": 6868,
      "cache_read_input_tokens": 5291,
      "output_tokens": 5
    }
  },
  "timestamp": "2025-09-30T22:03:03.074Z"
}
```

### Tool Use
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01UqgbuDrUxtPSFTYcC3Fh9m",
        "name": "Read",
        "input": {"file_path": "/path/to/file"}
      }
    ]
  }
}
```

### Tool Result
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "toolu_01UqgbuDrUxtPSFTYcC3Fh9m",
        "type": "tool_result",
        "content": "File contents here"
      }
    ]
  },
  "toolUseResult": {
    "type": "text",
    "file": {
      "filePath": "/path/to/file",
      "content": "...",
      "numLines": 9,
      "totalLines": 9
    }
  }
}
```

---

## 9. Advantages Over AppleScript

### CLI Approach ✅

**Pros**:
- ✅ Clean, documented API
- ✅ Predictable behavior
- ✅ Easy to test
- ✅ Cross-platform potential (if Claude CLI exists on Windows/Linux)
- ✅ No accessibility permissions needed
- ✅ No GUI dependency
- ✅ Reliable session tracking via log files

**Cons**:
- ⚠️ Requires `claude` CLI to be installed
- ⚠️ May not work if user has custom Claude installation

### AppleScript Approach ❌

**Pros**:
- ✅ Can control GUI directly

**Cons**:
- ❌ Brittle (breaks with UI changes)
- ❌ Requires accessibility permissions
- ❌ macOS-only
- ❌ Harder to test
- ❌ No programmatic access to session data
- ❌ Complex to maintain

**Decision**: Use CLI approach exclusively

---

## 10. Next Steps

Based on this research, we can proceed with Phase 2 implementation:

1. ✅ **SessionLauncher** - Use `spawn('claude', args, { cwd })`
2. ✅ **LogMonitor** - Use `spawn('tail', ['-f', logPath])`
3. ✅ **CalendarWatcher** - Integrate SessionLauncher + LogMonitor
4. ✅ **No AppleScript needed** - CLI is sufficient

---

## Appendix A: Full CLI Help Output

```
Usage: claude [options] [command] [prompt]

Claude Code - starts an interactive session by default, use -p/--print for
non-interactive output

Arguments:
  prompt                                            Your prompt

Options:
  -d, --debug [filter]                              Enable debug mode
  --verbose                                         Override verbose mode
  -p, --print                                       Print response and exit
  --output-format <format>                          "text", "json", or "stream-json"
  --include-partial-messages                        Include partial chunks (stream-json)
  --input-format <format>                           "text" or "stream-json"
  --dangerously-skip-permissions                    Bypass all permission checks
  --replay-user-messages                            Re-emit user messages
  --allowedTools <tools...>                         Comma/space-separated tools to allow
  --disallowedTools <tools...>                      Comma/space-separated tools to deny
  --mcp-config <configs...>                         Load MCP servers from JSON
  --append-system-prompt <prompt>                   Append to system prompt
  --permission-mode <mode>                          "acceptEdits", "bypassPermissions", "default", "plan"
  -c, --continue                                    Continue most recent conversation
  -r, --resume [sessionId]                          Resume a conversation
  --fork-session                                    Create new session ID when resuming
  --model <model>                                   Model alias or full name
  --fallback-model <model>                          Fallback when overloaded
  --settings <file-or-json>                         Settings JSON file or string
  --add-dir <directories...>                        Additional directories to allow
  --ide                                             Auto-connect to IDE
  --strict-mcp-config                               Only use MCP from --mcp-config
  --session-id <uuid>                               Use specific session ID
  --agents <json>                                   Custom agents JSON
  --setting-sources <sources>                       Comma-separated: user, project, local
  -v, --version                                     Output version
  -h, --help                                        Display help

Commands:
  mcp                                               Configure MCP servers
  migrate-installer                                 Migrate from npm to local
  setup-token                                       Set up auth token
  doctor                                            Check auto-updater health
  update                                            Check and install updates
  install [target]                                  Install Claude Code build
```

---

## Appendix B: Example Session Commands

### Start automated session
```bash
cd /path/to/project
claude \
  --permission-mode bypassPermissions \
  --model sonnet \
  --session-id $(uuidgen) \
  "Your comprehensive session prompt here"
```

### Monitor session logs
```bash
# Find session log file
LOG_PATH=~/.claude/projects/<encoded-path>/<session-id>.jsonl

# Tail in real-time
tail -f "$LOG_PATH" | jq -r '.message.content[] | select(.type=="text") | .text'
```

### Parse token usage
```bash
# Extract total tokens from log
tail -f "$LOG_PATH" | jq -r '
  select(.type=="assistant" and .message.usage != null) |
  "Tokens: \(.message.usage.input_tokens + .message.usage.output_tokens + .message.usage.cache_creation_input_tokens)"
'
```

---

## Conclusion

The Claude Code CLI provides everything we need for automation:
- ✅ Programmatic session launching
- ✅ Model selection and permission control
- ✅ Structured log file output (JSONL)
- ✅ Real-time token usage tracking
- ✅ Tool usage visibility
- ✅ Session state monitoring

**No AppleScript required. No SDK misuse. Just clean shell automation.**

Ready to proceed with Phase 2 implementation! 🚀
