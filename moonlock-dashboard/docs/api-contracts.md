# API Contracts & Data Models

## REST API Endpoints

### Session Management
```typescript
// POST /api/sessions
// Start new session
Request: {
  name?: string;
  duration: number; // milliseconds
  tokenBudget?: number;
}
Response: {
  id: string;
  startTime: number;
  duration: number;
  status: 'active' | 'paused' | 'completed';
}

// GET /api/sessions/:id
// Get session details
Response: {
  id: string;
  name?: string;
  startTime: number;
  endTime?: number;
  duration: number;
  tokenBudget?: number;
  tokensUsed: number;
  status: 'active' | 'paused' | 'completed';
  checkpoints: Checkpoint[];
}

// PATCH /api/sessions/:id
// Update session (pause/resume/complete)
Request: {
  status: 'active' | 'paused' | 'completed';
}

// GET /api/sessions
// List all sessions
Query: {
  limit?: number;
  offset?: number;
  status?: string;
}
```

### Token Tracking
```typescript
// POST /api/sessions/:id/tokens
// Record token usage
Request: {
  tokensUsed: number;
  operation: string;
  timestamp?: number;
}

// GET /api/sessions/:id/tokens
// Get token usage history
Response: {
  usage: TokenUsage[];
  totalUsed: number;
  averagePerMinute: number;
  projectedTotal: number;
}
```

### Analytics
```typescript
// GET /api/analytics/usage
// Get usage analytics
Query: {
  period: 'hour' | 'day' | 'week' | 'month';
  sessions?: string[];
}
Response: {
  totalSessions: number;
  totalTokens: number;
  averageSessionDuration: number;
  peakUsageHours: number[];
  trends: AnalyticsTrend[];
}
```

## WebSocket Events

### Client → Server
```typescript
// Subscribe to session updates
{
  type: 'subscribe';
  sessionId: string;
}

// Request current state
{
  type: 'ping';
  sessionId: string;
}
```

### Server → Client
```typescript
// Timer update (every second)
{
  type: 'timer_update';
  sessionId: string;
  elapsed: number;
  remaining: number;
  status: 'active' | 'paused' | 'completed';
}

// Token usage update
{
  type: 'token_update';
  sessionId: string;
  tokensUsed: number;
  totalUsed: number;
  projectedTotal?: number;
}

// Checkpoint reached
{
  type: 'checkpoint';
  sessionId: string;
  phase: string;
  promptCount: number;
  timestamp: number;
}

// Alert notification
{
  type: 'alert';
  sessionId: string;
  level: 'warning' | 'error';
  message: string;
}
```

## Data Models

### Session
```typescript
interface Session {
  id: string;
  name?: string;
  startTime: number; // Unix timestamp
  endTime?: number;
  duration: number; // milliseconds
  tokenBudget?: number;
  tokensUsed: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}
```

### TokenUsage
```typescript
interface TokenUsage {
  id: string;
  sessionId: string;
  tokensUsed: number;
  operation: string;
  timestamp: number;
  cumulativeTotal: number;
}
```

### Checkpoint
```typescript
interface Checkpoint {
  id: string;
  sessionId: string;
  phase: string;
  promptCount: number;
  tokensUsed: number;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

### Analytics Models
```typescript
interface AnalyticsTrend {
  timestamp: number;
  tokensUsed: number;
  sessionCount: number;
  averageDuration: number;
}

interface UsageProjection {
  currentRate: number; // tokens per minute
  projectedTotal: number;
  timeToLimit: number; // minutes
  confidence: number; // 0-1
}
```

## Error Responses
```typescript
interface ApiError {
  error: string;
  message: string;
  code: number;
  details?: any;
}

// Common error codes:
// 400 - Bad Request
// 404 - Session Not Found  
// 409 - Session Already Completed
// 429 - Rate Limited
// 500 - Internal Server Error
```