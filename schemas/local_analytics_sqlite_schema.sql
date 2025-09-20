-- Local Analytics SQLite Schema
-- Lightweight local cache for offline analytics and fast queries
-- This is a secondary database, Supabase is the primary source

-- Analytics summary table for fast dashboard queries
CREATE TABLE IF NOT EXISTS analytics_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'block'
    timestamp TIMESTAMP NOT NULL,
    session_type TEXT DEFAULT 'claude-code',
    
    -- Aggregated metrics
    total_sessions INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    billable_tokens INTEGER DEFAULT 0,
    cache_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    
    -- Performance metrics
    avg_response_time_ms REAL,
    error_rate REAL DEFAULT 0.0,
    efficiency_score REAL DEFAULT 0.0,
    
    -- Activity metrics
    files_created INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    tools_invoked INTEGER DEFAULT 0,
    
    -- Cache metadata
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_version INTEGER DEFAULT 1,
    is_stale BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recent sessions cache for quick access
CREATE TABLE IF NOT EXISTS recent_sessions (
    id TEXT PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes REAL,
    project_path TEXT,
    conversation_id TEXT,
    
    -- Token summary
    total_tokens INTEGER DEFAULT 0,
    billable_tokens INTEGER DEFAULT 0,
    cache_savings INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    
    -- Quick stats
    message_count INTEGER DEFAULT 0,
    tool_count INTEGER DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    sync_status TEXT DEFAULT 'synced',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model usage statistics
CREATE TABLE IF NOT EXISTS model_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    model_name TEXT NOT NULL,
    
    -- Usage metrics
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_tokens INTEGER DEFAULT 0,
    
    -- Cost metrics
    total_cost REAL DEFAULT 0.0,
    cost_per_token REAL,
    
    -- Performance
    avg_response_time_ms REAL,
    success_rate REAL DEFAULT 1.0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, model_name)
);

-- Tool usage patterns
CREATE TABLE IF NOT EXISTS tool_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Usage counts
    invocation_count INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Performance
    avg_execution_time_ms REAL,
    max_execution_time_ms REAL,
    
    -- Common parameters (JSON)
    common_params TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, tool_name)
);

-- Quota tracking for quick limit checks
CREATE TABLE IF NOT EXISTS quota_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL,
    period_type TEXT NOT NULL, -- 'weekly', 'daily', '5hour'
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Usage vs limits
    tokens_used INTEGER DEFAULT 0,
    tokens_limit INTEGER NOT NULL,
    tokens_remaining INTEGER NOT NULL,
    usage_percentage REAL DEFAULT 0.0,
    
    -- Projections
    projected_usage INTEGER,
    projected_percentage REAL,
    burn_rate REAL, -- tokens per hour
    
    -- Status
    status TEXT DEFAULT 'green', -- 'green', 'yellow', 'red'
    alert_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL UNIQUE,
    last_sync_time TIMESTAMP,
    last_sync_id TEXT,
    record_count INTEGER DEFAULT 0,
    sync_duration_ms INTEGER,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_analytics_cache_lookup 
    ON analytics_cache(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_stale 
    ON analytics_cache(is_stale) WHERE is_stale = FALSE;

CREATE INDEX IF NOT EXISTS idx_recent_sessions_time 
    ON recent_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_recent_sessions_active 
    ON recent_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recent_sessions_project 
    ON recent_sessions(project_path);

CREATE INDEX IF NOT EXISTS idx_model_usage_date 
    ON model_usage_stats(date DESC, model_name);

CREATE INDEX IF NOT EXISTS idx_tool_patterns_date 
    ON tool_patterns(date DESC, tool_name);

CREATE INDEX IF NOT EXISTS idx_quota_status_current 
    ON quota_status(period_type, timestamp DESC);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_analytics_cache_timestamp 
AFTER UPDATE ON analytics_cache
BEGIN
    UPDATE analytics_cache SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sync_metadata_timestamp 
AFTER UPDATE ON sync_metadata
BEGIN
    UPDATE sync_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS current_session_stats AS
SELECT 
    COUNT(*) as active_sessions,
    SUM(total_tokens) as total_tokens_active,
    SUM(billable_tokens) as billable_tokens_active,
    AVG(duration_minutes) as avg_duration_minutes
FROM recent_sessions
WHERE is_active = TRUE;

CREATE VIEW IF NOT EXISTS daily_usage_trend AS
SELECT 
    DATE(timestamp) as date,
    SUM(total_sessions) as sessions,
    SUM(total_tokens) as tokens,
    SUM(total_cost) as cost,
    AVG(efficiency_score) as avg_efficiency
FROM analytics_cache
WHERE metric_type = 'daily'
AND timestamp >= date('now', '-30 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE VIEW IF NOT EXISTS tool_effectiveness AS
SELECT 
    tool_name,
    SUM(invocation_count) as total_invocations,
    SUM(success_count) as total_successes,
    CAST(SUM(success_count) AS REAL) / NULLIF(SUM(invocation_count), 0) as success_rate,
    AVG(avg_execution_time_ms) as avg_time_ms
FROM tool_patterns
WHERE date >= date('now', '-7 days')
GROUP BY tool_name
ORDER BY total_invocations DESC;

-- Cleanup old data procedure (as a trigger)
CREATE TRIGGER IF NOT EXISTS cleanup_old_analytics
AFTER INSERT ON analytics_cache
WHEN (SELECT COUNT(*) FROM analytics_cache) > 10000
BEGIN
    DELETE FROM analytics_cache 
    WHERE timestamp < datetime('now', '-30 days')
    AND metric_type = 'hourly';
    
    DELETE FROM recent_sessions
    WHERE start_time < datetime('now', '-7 days')
    AND is_active = FALSE;
END;