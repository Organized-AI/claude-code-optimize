# Database Schema Requirements

## 📊 Current Schema (DO NOT BREAK)
- `claude_sessions` table - PRESERVE, ENHANCE
- Existing session tracking - MAINTAIN
- Real-time monitoring data - PRESERVE

## 🚀 Required Enhancements

### Enhanced Sessions Table
```sql
-- Add columns to existing claude_sessions table
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS cache_creation_tokens INTEGER DEFAULT 0;
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER DEFAULT 0;
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'claude-sonnet-4-20250514';
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS efficiency_score REAL DEFAULT 0.0;
```

### New Analytics Tables
```sql
-- Cache performance tracking
CREATE TABLE IF NOT EXISTS cache_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    total_cache_tokens INTEGER DEFAULT 0,
    cache_hit_tokens INTEGER DEFAULT 0,
    cache_savings_usd REAL DEFAULT 0.0,
    hit_rate REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily usage aggregations (for faster reporting)
CREATE TABLE IF NOT EXISTS daily_usage_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    session_count INTEGER DEFAULT 0,
    models_used TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5-hour blocks tracking
CREATE TABLE IF NOT EXISTS usage_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT UNIQUE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, completed, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance
```sql
-- Optimize query performance
CREATE INDEX IF NOT EXISTS idx_claude_sessions_date ON claude_sessions(DATE(session_start));
CREATE INDEX IF NOT EXISTS idx_claude_sessions_model ON claude_sessions(model_name);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_project ON claude_sessions(project_name);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage_summary(date);
CREATE INDEX IF NOT EXISTS idx_usage_blocks_start ON usage_blocks(start_time);
```

## 🔄 Migration Strategy
1. Add new columns to existing tables (non-breaking)
2. Create new tables for analytics
3. Populate historical data where possible
4. Create indexes for performance
5. Validate data integrity