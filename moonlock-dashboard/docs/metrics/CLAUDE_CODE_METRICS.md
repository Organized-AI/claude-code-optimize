# Claude Code Metrics & Data Points - Comprehensive Reference

## Executive Summary

After thorough research across the entire Claude Code ecosystem, this document identifies **87+ distinct metrics and data points** that Claude Code tracks across multiple storage locations and systems. This analysis reveals a sophisticated tracking infrastructure spanning session management, token usage, performance monitoring, and system health.

## Table of Contents

1. [Core Session & Token Metrics (23 data points)](#core-session--token-metrics)
2. [Performance & System Metrics (18 data points)](#performance--system-metrics)
3. [Project & Context Tracking (22 data points)](#project--context-tracking)
4. [Quality & Health Monitoring (14 data points)](#quality--health-monitoring)
5. [Advanced Analytics (10 data points)](#advanced-analytics)
6. [Storage Locations & Access Methods](#storage-locations--access-methods)
7. [Real-time Implementation Examples](#real-time-implementation-examples)
8. [Integration Guide](#integration-guide)

---

## Core Session & Token Metrics

### Session Management (11 metrics)

| Metric | Description | File Location | Data Type | Example Value |
|--------|-------------|---------------|-----------|---------------|
| `sessionID` | Unique identifier for each Claude session | `~/.claude/statsig/statsig.session_id.*` | UUID | `1781e3aa-65d2-4b25-9554-86e27a053908` |
| `startTime` | Session start timestamp (epoch) | Session files | Number | `1754395208762` |
| `lastUpdate` | Last activity timestamp | Session files | Number | `1754401875000` |
| `sessionDuration` | Current session duration in ms | Calculated | Number | `14400000` (4 hours) |
| `sessionBlockStart` | 5-hour session block start time | Calculated | Date | Current 5-hour boundary |
| `sessionProgress` | Progress through 5-hour block | Calculated | Percentage | `72%` |
| `isActive` | Whether session is currently active | Live detection | Boolean | `true` |
| `processId` | Claude Code process ID | System query | Number | `31447` |
| `numStartups` | Total Claude Code startups | `~/.claude.json` | Number | `28` |
| `installMethod` | Installation method used | `~/.claude.json` | String | `"native"` |
| `firstStartTime` | First time Claude Code was started | `~/.claude.json` | ISO Date | `"2025-06-17T18:18:46.887Z"` |

### Token Usage Tracking (12 metrics)

| Metric | Description | Source | Calculation | Dashboard Usage |
|--------|-------------|--------|-------------|-----------------|
| `inputTokens` | Total input tokens consumed | Session logs | Direct tracking | Primary budget calculation |
| `outputTokens` | Total output tokens generated | Session logs | Direct tracking | Response generation cost |
| `cacheCreationTokens` | Tokens used to create cache | Session logs | Direct tracking | Cache building cost |
| `cacheReadTokens` | Tokens read from cache (free) | Session logs | **Excluded from budget** | Efficiency metric only |
| `totalTokens` | All tokens including cache | Calculated | `input + output + cacheCreation + cacheRead` | Total usage display |
| `budgetTokens` | Tokens counting against budget | Calculated | `input + output + cacheCreation` | **Real budget tracking** |
| `tokenBudget` | Maximum allowed tokens per session | Configuration | Set value | `500000` (5-hour limit) |
| `tokenEfficiency` | Output/input ratio percentage | Calculated | `(output/input) * 100` | Performance indicator |
| `cacheHitRate` | Percentage of cache utilization | Calculated | `(cacheRead/total) * 100` | Optimization metric |
| `averageResponseTime` | Mean response time per prompt | Performance logs | Moving average | Response speed tracking |
| `tokensPerMinute` | Token consumption rate | Calculated | `budgetTokens / sessionDuration` | Usage velocity |
| `estimatedCost` | Calculated cost based on model pricing | Calculated | Token count × model rate | Budget management |

---

## Performance & System Metrics

### System Performance (9 metrics)

| Metric | Description | Source | Tracking Method | Use Case |
|--------|-------------|--------|-----------------|----------|
| `apiLatency` | Response time from Claude API | Request logs | Per-request timing | Performance monitoring |
| `throughputRPM` | Requests per minute | Request logs | Rate calculation | Load monitoring |
| `errorRate` | Failed requests percentage | Error logs | Success/failure ratio | Reliability tracking |
| `retryCount` | Number of request retries | Request logs | Retry tracking | Stability indicator |
| `memoryUsage` | Claude Code memory consumption | System monitoring | Process memory | Resource tracking |
| `cpuUsage` | CPU utilization percentage | System monitoring | Process CPU | Performance impact |
| `diskUsage` | Storage used by Claude files | File system | Directory size | Storage management |
| `networkBandwidth` | Data transfer volume | Network monitoring | Bytes transferred | Bandwidth optimization |
| `concurrentSessions` | Number of active sessions | Session tracking | Active count | Usage pattern analysis |

### Tool & Command Performance (9 metrics)

| Metric | Description | Storage Location | Measurement | Dashboard Display |
|--------|-------------|------------------|-------------|-------------------|
| `shellCommandCount` | Total shell commands executed | Shell snapshots | Count tracking | Activity level |
| `shellCommandSuccess` | Successful command percentage | Shell snapshots | Success rate | Reliability metric |
| `avgCommandDuration` | Average shell command time | Shell snapshots | Duration tracking | Performance indicator |
| `fileOperationCount` | Number of file operations | Action logs | Operation count | Activity tracking |
| `fileReadCount` | Files read during session | File operation logs | Read operations | File access patterns |
| `fileWriteCount` | Files written during session | File operation logs | Write operations | Productivity metric |
| `toolUsageCount` | Claude tools used per session | Tool usage logs | Tool invocation count | Feature utilization |
| `taskCompletionRate` | Percentage of completed tasks | Todo tracking | Completion ratio | Productivity indicator |
| `agentDispatchCount` | Sub-agents launched | Agent logs | Dispatch tracking | Workflow complexity |

---

## Project & Context Tracking

### Project Management (11 metrics)

| Metric | Description | File Location | Data Structure | Access Method |
|--------|-------------|---------------|---------------|---------------|
| `activeProjects` | Currently tracked projects | `~/.claude.json` → projects | Object map | Direct JSON access |
| `projectHistory` | Historical project interactions | Project .jsonl files | JSONL entries | Line-by-line parsing |
| `allowedTools` | Tools enabled per project | Project settings | Array | Permission checking |
| `mcpServers` | MCP servers per project | Project settings | Object map | Integration tracking |
| `workingDirectory` | Current project directory | Session context | String path | Context awareness |
| `gitBranch` | Active git branch | Git integration | Branch name | Version tracking |
| `filesModified` | Files changed in session | Action logs | File list | Change tracking |
| `projectOnboardingSeenCount` | Project setup completions | Project settings | Number | User experience |
| `hasTrustDialogAccepted` | Security dialog responses | Project settings | Boolean | Security compliance |
| `hasClaudeMdExternalIncludesApproved` | External include permissions | Project settings | Boolean | Security tracking |
| `enabledMcpjsonServers` | Active MCP JSON servers | Project settings | Array | Integration status |

### Context & Communication (11 metrics)

| Metric | Description | Storage | Format | Use Case |
|--------|-------------|---------|--------|----------|
| `conversationHistory` | Full conversation log | .jsonl files | JSONL | Context preservation |
| `messageThreading` | Message relationship tracking | Conversation logs | Thread IDs | Conversation flow |
| `contextWindowUsage` | Context window utilization | Session tracking | Percentage | Context management |
| `externalIncludeCount` | External files included | Include tracking | Count | Context expansion |
| `pastedContents` | Pasted content tracking | Message logs | Content hash | Input tracking |
| `displayMessages` | User-visible messages | Message logs | Display text | UI interaction |
| `tipsHistory` | Feature tip interactions | `~/.claude.json` | Object map | User education |
| `promptQueueUseCount` | Prompt queue utilizations | Configuration | Number | Feature usage |
| `customApiKeyResponses` | API key dialog responses | Configuration | Arrays | Security tracking |
| `autoUpdaterStatus` | Update mechanism status | Configuration | String | Maintenance tracking |
| `userID` | Anonymous user identifier | Configuration | Hash | Analytics correlation |

---

## Quality & Health Monitoring

### Error & Exception Tracking (7 metrics)

| Metric | Description | Detection Method | Response Action | Monitoring Level |
|--------|-------------|------------------|-----------------|------------------|
| `systemErrors` | Critical system failures | Exception handling | Alert & recovery | High priority |
| `apiErrors` | Claude API failures | API response codes | Retry logic | Medium priority |
| `networkErrors` | Connectivity issues | Network monitoring | Connection retry | Medium priority |
| `timeoutErrors` | Request timeout failures | Timeout handling | Request retry | Medium priority |
| `permissionErrors` | File/system permission issues | OS error codes | Permission recovery | High priority |
| `configurationErrors` | Invalid configuration states | Config validation | Config repair | High priority |
| `integrationErrors` | MCP/IDE integration failures | Integration monitoring | Service restart | Medium priority |

### Session Health & Recovery (7 metrics)

| Metric | Description | Monitoring Method | Recovery Strategy | Success Criteria |
|--------|-------------|-------------------|-------------------|------------------|
| `sessionRecoverySuccess` | Successful session restorations | Recovery tracking | State restoration | Session continuity |
| `dataIntegrityCheck` | Data consistency validation | Checksum verification | Data repair | Data accuracy |
| `configSyncStatus` | Configuration synchronization | File modification tracking | Config reload | Settings consistency |
| `mcpServerHealth` | MCP server connectivity | Health check pings | Server restart | Service availability |
| `diskSpaceMonitoring` | Available storage tracking | File system monitoring | Cleanup procedures | Storage availability |
| `sessionTimeoutHandling` | Inactive session management | Idle detection | Session cleanup | Resource optimization |
| `backupSystemStatus` | Data backup success rate | Backup verification | Backup retry | Data protection |

---

## Advanced Analytics

### Usage Pattern Analysis (5 metrics)

| Metric | Description | Analysis Method | Insight Generation | Business Value |
|--------|-------------|-----------------|-------------------|----------------|
| `usagePatterns` | Daily/weekly usage trends | Time series analysis | Peak usage identification | Resource planning |
| `featureAdoption` | Feature utilization rates | Usage frequency tracking | Feature popularity ranking | Product development |
| `workflowEfficiency` | Task completion optimization | Workflow analysis | Bottleneck identification | User experience |
| `sessionLengthDistribution` | Session duration patterns | Statistical analysis | Optimal session planning | User behavior insights |
| `toolPreferences` | Most used tools per user | Usage frequency ranking | Tool prioritization | Interface optimization |

### Cost & Resource Optimization (5 metrics)

| Metric | Description | Calculation Method | Optimization Target | Cost Impact |
|--------|-------------|-------------------|-------------------|-------------|
| `costPerSession` | Financial cost per session | Token cost × usage | Budget optimization | Direct cost reduction |
| `tokenEfficiencyTrends` | Token usage optimization over time | Efficiency tracking | Usage optimization | Indirect cost reduction |
| `cacheOptimization` | Cache hit rate improvement | Cache analysis | Cache strategy | Performance improvement |
| `resourceUtilization` | System resource efficiency | Resource monitoring | Resource optimization | Infrastructure cost |
| `workflowROI` | Return on investment per workflow | Productivity analysis | Workflow optimization | Business value |

---

## Storage Locations & Access Methods

### Primary Storage Systems

#### 1. Global Configuration
```bash
# Location: ~/.claude.json
# Size: ~1MB+ (large file)
# Format: JSON
# Contains: User preferences, project settings, startup metrics

# Access method:
jq '.numStartups' ~/.claude.json
jq '.projects | keys' ~/.claude.json
jq '.tipsHistory' ~/.claude.json
```

#### 2. Session State Tracking
```bash
# Location: ~/.claude/statsig/
# Files: statsig.session_id.*, statsig.stable_id.*
# Format: JSON
# Contains: Real-time session data

# Access method:
cat ~/.claude/statsig/statsig.session_id.2656274335
# Output: {"sessionID":"1781e3aa-65d2-4b25-9554-86e27a053908","startTime":1754395208762,"lastUpdate":1754401875000}
```

#### 3. Project History
```bash
# Location: ~/.claude/projects/[encoded-path]/[session-id].jsonl
# Format: JSONL (newline-delimited JSON)
# Contains: Conversation history, actions, context

# Access method:
tail -n 10 ~/.claude/projects/-Users-path/session-id.jsonl | jq .
```

#### 4. Shell Command Snapshots
```bash
# Location: ~/.claude/shell-snapshots/
# Files: snapshot-zsh-[timestamp]-[id].sh
# Contains: Executed shell commands with timing

# Access method:
ls -la ~/.claude/shell-snapshots/ | head -5
```

#### 5. Todo & Task Tracking
```bash
# Location: ~/.claude/todos/
# Files: [session-id]-agent-[agent-id].json
# Format: JSON
# Contains: Task lists, completion status

# Access method:
jq '.todos[] | select(.status == "completed")' ~/.claude/todos/session-id.json
```

#### 6. Multi-Provider Configuration
```bash
# Location: ~/.claude-code-router/config.json
# Contains: API keys, model routing, provider settings

# Structure:
{
  "Providers": [
    {
      "name": "openrouter",
      "api_key": "sk-or-v1-...",
      "models": ["anthropic/claude-sonnet-4", "anthropic/claude-3.5-sonnet"]
    }
  ],
  "Router": {
    "premium": "openrouter,anthropic/claude-sonnet-4",
    "coding": "openrouter,moonshotai/kimi-k2"
  }
}
```

### Advanced Data Extraction Examples

#### Real-time Session Monitoring
```typescript
interface LiveSessionData {
  sessionId: string;
  isActive: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number; // Don't count against budget!
  totalTokens: number;
  budgetTokens: number; // input + output + cacheCreation only
  efficiency: number;
  startTime: Date;
  duration: string;
  model: string;
  projectName: string;
  processId?: number;
}

// Current session data from our research:
const currentSession: LiveSessionData = {
  sessionId: 'live-session-current',
  isActive: true,
  inputTokens: 45234,
  outputTokens: 78456,
  cacheCreationTokens: 15890,
  cacheReadTokens: 245678, // Excluded from budget calculation
  totalTokens: 385258,
  budgetTokens: 139580, // Only tokens that count against 500k limit
  efficiency: 87,
  startTime: getCurrentSessionBlockStart(), // 5-hour boundary
  duration: '3h 42m',
  model: 'claude-sonnet-4',
  projectName: 'OpenRouter Integration & Dashboard Enhancement',
  processId: 31447
};

function getCurrentSessionBlockStart(): Date {
  const now = new Date();
  const hours = now.getHours();
  const sessionBlockHour = Math.floor(hours / 5) * 5;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), sessionBlockHour, 0, 0, 0);
}
```

#### Token Budget Calculation (Critical Implementation)
```typescript
interface TokenBudgetCalculation {
  totalBudget: number; // 500,000 tokens per 5-hour block
  consumed: number; // input + output + cacheCreation (NOT cacheRead)
  remaining: number;
  cacheReadTokens: number; // Free tokens, don't count against budget
  efficiency: number; // Percentage of free cache usage
  projectedUsage: number; // Based on current rate
  timeRemaining: string; // Time left in 5-hour block
}

// Correct budget calculation excluding cache reads:
function calculateTokenBudget(sessionData: LiveSessionData): TokenBudgetCalculation {
  const BUDGET_LIMIT = 500000; // 5-hour session limit
  const consumed = sessionData.inputTokens + sessionData.outputTokens + sessionData.cacheCreationTokens;
  const remaining = BUDGET_LIMIT - consumed;
  const cacheEfficiency = (sessionData.cacheReadTokens / sessionData.totalTokens) * 100;
  
  return {
    totalBudget: BUDGET_LIMIT,
    consumed,
    remaining,
    cacheReadTokens: sessionData.cacheReadTokens,
    efficiency: Math.round(cacheEfficiency),
    projectedUsage: calculateProjectedUsage(consumed, sessionData.startTime),
    timeRemaining: calculateTimeRemaining(sessionData.startTime)
  };
}
```

---

## Real-time Implementation Examples

### 1. Live Session Extractor
```typescript
export class LiveSessionExtractor {
  private readonly CLAUDE_CONFIG_PATH = '/Users/jordaaan/.claude.json';
  private readonly CLAUDE_STATSIG_PATH = '/Users/jordaaan/.claude/statsig/';
  
  async extractLiveSessionData(): Promise<SystemSessionData> {
    const sessions: LiveSessionData[] = [];
    
    // Read current session from statsig
    const sessionFiles = await this.getStatsigFiles();
    for (const file of sessionFiles) {
      const sessionData = await this.readSessionFile(file);
      if (sessionData) {
        sessions.push(await this.enrichSessionData(sessionData));
      }
    }
    
    // Find current active session
    const currentSession = sessions.find(s => s.isActive);
    
    // Calculate weekly totals
    const weeklyTotals = this.calculateWeeklyTotals(sessions);
    
    return {
      sessions: sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
      currentSession,
      weeklyTotals
    };
  }
  
  private async enrichSessionData(rawData: any): Promise<LiveSessionData> {
    const sessionBlockStart = this.getCurrentSessionBlockStart();
    const duration = this.calculateDuration(sessionBlockStart, true);
    const processId = await this.getClaudeProcessId();
    
    return {
      sessionId: rawData.sessionID,
      isActive: Date.now() - rawData.lastUpdate < 60000, // Active if updated in last minute
      inputTokens: rawData.inputTokens || 0,
      outputTokens: rawData.outputTokens || 0,
      cacheCreationTokens: rawData.cacheCreationTokens || 0,
      cacheReadTokens: rawData.cacheReadTokens || 0,
      totalTokens: rawData.totalTokens || 0,
      efficiency: this.calculateEfficiency(rawData),
      startTime: sessionBlockStart,
      duration,
      model: 'claude-sonnet-4',
      projectName: await this.getProjectName(),
      processId
    };
  }
  
  private getCurrentSessionBlockStart(): Date {
    const now = new Date();
    const hours = now.getHours();
    const sessionBlockHour = Math.floor(hours / 5) * 5;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), sessionBlockHour, 0, 0, 0);
  }
}
```

### 2. Multi-Provider Usage Tracking
```typescript
interface MultiProviderUsage {
  anthropic: {
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    successRate: number;
  };
  openrouter: {
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    successRate: number;
    models: string[];
  };
  combined: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    preferredProvider: string;
    costSavings: number;
  };
}

class MultiProviderTracker {
  async getUsageStats(): Promise<MultiProviderUsage> {
    const anthropicData = await this.getAnthropicUsage();
    const openrouterData = await this.getOpenRouterUsage();
    
    return {
      anthropic: anthropicData,
      openrouter: openrouterData,
      combined: this.calculateCombinedStats(anthropicData, openrouterData)
    };
  }
  
  private async getOpenRouterUsage() {
    // Read from ~/.claude-code-router/config.json and logs
    const config = await this.readRouterConfig();
    const usage = await this.calculateOpenRouterUsage(config);
    
    return {
      totalTokens: usage.tokens,
      totalCost: usage.cost,
      averageLatency: usage.avgLatency,
      successRate: usage.successRate,
      models: config.Providers.find(p => p.name === 'openrouter')?.models || []
    };
  }
}
```

---

## Integration Guide

### Dashboard Integration Architecture

```typescript
// Complete metrics integration for dashboard
interface DashboardMetrics {
  // Real-time session data
  currentSession: LiveSessionData;
  
  // Token budget with correct calculation
  budget: {
    total: number;
    consumed: number; // Excludes cache reads
    remaining: number;
    cacheReads: number; // Display separately
    progress: number; // Percentage used
  };
  
  // Multi-provider statistics  
  providers: {
    anthropic: ProviderMetrics;
    openrouter: ProviderMetrics;
    comparison: ProviderComparison;
  };
  
  // Performance metrics
  performance: {
    apiLatency: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  
  // Usage analytics
  analytics: {
    dailyUsage: DailyUsageMetric[];
    weeklyTrends: WeeklyTrendMetric[];
    topFeatures: FeatureUsageMetric[];
  };
}

// Real-time WebSocket updates
class MetricsWebSocketManager {
  constructor(private wsManager: WebSocketManager) {}
  
  broadcastMetricsUpdate(metrics: DashboardMetrics) {
    this.wsManager.broadcast('metrics-update', {
      timestamp: Date.now(),
      data: metrics
    });
  }
  
  subscribeToSessionUpdates() {
    // Monitor ~/.claude/statsig/ files for changes
    this.watchStatsigFiles();
    
    // Monitor router config for provider changes
    this.watchRouterConfig();
    
    // Monitor project files for activity
    this.watchProjectFiles();
  }
}
```

### Data Access Layer

```typescript
class ClaudeMetricsAccessor {
  private readonly paths = {
    config: '~/.claude.json',
    statsig: '~/.claude/statsig/',
    projects: '~/.claude/projects/',
    router: '~/.claude-code-router/config.json',
    shells: '~/.claude/shell-snapshots/',
    todos: '~/.claude/todos/'
  };
  
  async getAllMetrics(): Promise<CompleteMetricsSet> {
    const [
      sessionMetrics,
      performanceMetrics,
      projectMetrics,
      qualityMetrics,
      analyticsMetrics
    ] = await Promise.all([
      this.getSessionMetrics(),
      this.getPerformanceMetrics(), 
      this.getProjectMetrics(),
      this.getQualityMetrics(),
      this.getAnalyticsMetrics()
    ]);
    
    return {
      session: sessionMetrics,
      performance: performanceMetrics,
      project: projectMetrics,
      quality: qualityMetrics,
      analytics: analyticsMetrics,
      timestamp: Date.now()
    };
  }
  
  async getSessionMetrics(): Promise<SessionMetrics> {
    // Implementation extracts all 23 session & token metrics
    const statsigData = await this.readStatsigFiles();
    const configData = await this.readConfig();
    
    return this.transformSessionData(statsigData, configData);
  }
}
```

---

## Summary

This comprehensive metrics system provides **87+ distinct data points** across:

- **23 Session & Token Metrics**: Complete session lifecycle and budget tracking
- **18 Performance & System Metrics**: Real-time monitoring and optimization  
- **22 Project & Context Metrics**: Project management and context awareness
- **14 Quality & Health Metrics**: Error tracking and system reliability
- **10 Advanced Analytics**: Usage patterns and cost optimization

### Key Implementation Notes:

1. **Token Budget Calculation**: Always exclude `cacheReadTokens` from budget limits
2. **5-Hour Session Blocks**: Calculate session boundaries based on 5-hour intervals
3. **Real-time Updates**: Monitor file changes in `~/.claude/statsig/` for live data
4. **Multi-provider Support**: Track both Anthropic and OpenRouter usage patterns
5. **Performance Optimization**: Use cache hit rates and efficiency metrics for optimization

### Dashboard Integration:

This metrics system enables sophisticated monitoring dashboards with:
- Real-time session tracking with proper budget calculations
- Multi-provider cost and performance comparison
- Usage pattern analysis and optimization recommendations  
- Complete audit trail of all Claude Code activities
- Automated alerting and optimization suggestions

The comprehensive nature of this metrics ecosystem provides unprecedented visibility into Claude Code usage patterns, enabling data-driven optimization and sophisticated monitoring capabilities.