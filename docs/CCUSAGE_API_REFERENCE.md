# ccusage API Compatibility Reference

## 📊 Required API Endpoints

### Daily Reports
**Endpoint**: `GET /api/reports/daily`
**Query Parameters**:
- `since`: Optional date filter (YYYYMMDD)
- `until`: Optional date filter (YYYYMMDD)  
- `breakdown`: Boolean for model breakdown
- `format`: `json` or `csv`

**Response Format**:
```json
{
  "daily": [
    {
      "date": "2025-08-15",
      "inputTokens": 12450,
      "outputTokens": 8930,
      "cacheCreationTokens": 2048,
      "cacheReadTokens": 1024,
      "totalTokens": 24452,
      "costUSD": 15.67,
      "sessionCount": 3,
      "modelsUsed": ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
      "modelBreakdown": {
        "claude-sonnet-4-20250514": {
          "inputTokens": 8000,
          "outputTokens": 6000,
          "totalCost": 8.50
        }
      }
    }
  ],
  "totals": {
    "inputTokens": 85420,
    "outputTokens": 62140,
    "totalTokens": 147560,
    "totalCost": 95.23
  }
}
```

### Weekly Reports  
**Endpoint**: `GET /api/reports/weekly`
**Similar structure with weekly aggregation**

### Session Reports
**Endpoint**: `GET /api/reports/sessions`
**Query Parameters**:
- `session_id`: Optional specific session
- `since`: Date filter
- `project`: Project filter

**Response Format**:
```json
{
  "sessions": [
    {
      "sessionId": "session-abc123-def456",
      "project": "my-project",
      "startTime": "2025-08-15T14:30:00Z",
      "endTime": "2025-08-15T16:45:00Z",
      "duration": 135,
      "inputTokens": 5240,
      "outputTokens": 3860,
      "totalTokens": 9100,
      "costUSD": 6.75,
      "model": "claude-sonnet-4-20250514",
      "messageCount": 12
    }
  ]
}
```

### Blocks Reports (5-Hour Tracking)
**Endpoint**: `GET /api/reports/blocks`
**Query Parameters**:
- `active`: Boolean to show only active blocks
- `live`: Boolean for real-time monitoring

**Response Format**:
```json
{
  "blocks": [
    {
      "blockId": "block-20250815-1400",
      "startTime": "2025-08-15T14:00:00Z",
      "endTime": "2025-08-15T19:00:00Z",
      "duration": 300,
      "tokensUsed": 45000,
      "tokenLimit": 100000,
      "percentUsed": 45,
      "status": "active",
      "sessionsCount": 3,
      "isActive": true
    }
  ]
}
```

## 🔄 Enhanced Real-time Endpoints (UNIQUE)

### Current Session
**Endpoint**: `GET /api/live/current-session`
```json
{
  "active": true,
  "sessionId": "session-live-12345",
  "startTime": "2025-08-15T15:30:00Z",
  "duration": 45,
  "tokenCount": 3250,
  "burnRate": 72,
  "model": "claude-sonnet-4-20250514",
  "estimatedCost": 2.45,
  "riskLevel": "safe"
}
```

### Block Progress
**Endpoint**: `GET /api/live/block-progress`
```json
{
  "currentBlock": {
    "blockId": "block-20250815-1400", 
    "tokensUsed": 45000,
    "tokenLimit": 100000,
    "percentUsed": 45,
    "timeRemaining": "2h 15m",
    "status": "safe"
  }
}
```