-- Claude Code Optimizer Dashboard - Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for persistent storage

-- ============================================================================
-- CORE SESSION MANAGEMENT
-- ============================================================================

-- Legacy sessions table (maintained for backward compatibility)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration INTEGER NOT NULL,
  token_budget INTEGER,
  tokens_used INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Enhanced session data with full features
CREATE TABLE IF NOT EXISTS session_data (
  id TEXT PRIMARY KEY,
  name TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
  model TEXT NOT NULL CHECK(model IN ('sonnet', 'opus')),
  tokens_used INTEGER DEFAULT 0,
  token_budget INTEGER,
  complexity_score REAL,
  risk_score REAL,
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Session checkpoints with enhanced data
CREATE TABLE IF NOT EXISTS session_checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phase TEXT NOT NULL,
  prompt_count INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  context_snapshot TEXT, -- JSON object
  metadata TEXT, -- JSON object
  FOREIGN KEY (session_id) REFERENCES session_data (id) ON DELETE CASCADE
);

-- Conversation history
CREATE TABLE IF NOT EXISTS conversation_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tokens INTEGER NOT NULL,
  metadata TEXT, -- JSON object
  FOREIGN KEY (session_id) REFERENCES session_data (id) ON DELETE CASCADE
);

-- Token usage tracking (legacy)
CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  operation TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  cumulative_total INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);

-- Checkpoints (legacy)
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  prompt_count INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT, -- JSON string for additional data
  FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);

-- ============================================================================
-- QUOTA MANAGEMENT AND ANALYTICS
-- ============================================================================

-- Quota usage tracking
CREATE TABLE IF NOT EXISTS quota_usage (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL, -- 'hour', 'day', 'week', 'month', etc.
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  sonnet_used REAL NOT NULL DEFAULT 0,
  opus_used REAL NOT NULL DEFAULT 0,
  sonnet_sessions INTEGER NOT NULL DEFAULT 0,
  opus_sessions INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  efficiency_score REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Detailed usage breakdown by session
CREATE TABLE IF NOT EXISTS quota_session_usage (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  model TEXT NOT NULL CHECK(model IN ('sonnet', 'opus')),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration_hours REAL NOT NULL,
  tokens_used INTEGER NOT NULL,
  tokens_per_hour REAL NOT NULL,
  complexity_score REAL,
  efficiency_score REAL,
  timestamp INTEGER NOT NULL
);

-- Quota alerts and warnings
CREATE TABLE IF NOT EXISTS quota_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  threshold_value REAL NOT NULL,
  current_value REAL NOT NULL,
  model TEXT CHECK(model IN ('sonnet', 'opus')),
  resolved BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

-- Usage trends and patterns
CREATE TABLE IF NOT EXISTS quota_trends (
  id TEXT PRIMARY KEY,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  model TEXT CHECK(model IN ('sonnet', 'opus')),
  value REAL NOT NULL,
  change_percentage REAL NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('increasing', 'decreasing', 'stable')),
  significance TEXT NOT NULL CHECK(significance IN ('low', 'medium', 'high')),
  timestamp INTEGER NOT NULL
);

-- Performance benchmarks
CREATE TABLE IF NOT EXISTS quota_benchmarks (
  id TEXT PRIMARY KEY,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  percentile REAL NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('excellent', 'good', 'average', 'poor')),
  period TEXT NOT NULL,
  model TEXT CHECK(model IN ('sonnet', 'opus')),
  timestamp INTEGER NOT NULL
);

-- ============================================================================
-- ANALYTICS AND INSIGHTS
-- ============================================================================

-- Analytics events storage
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  timestamp INTEGER NOT NULL,
  data TEXT NOT NULL, -- JSON object
  tags TEXT NOT NULL, -- JSON array
  user_id TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL
);

-- Aggregated analytics data for faster queries
CREATE TABLE IF NOT EXISTS analytics_aggregations (
  id TEXT PRIMARY KEY,
  metric_name TEXT NOT NULL,
  period TEXT NOT NULL, -- 'hour', 'day', 'week', 'month'
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  value REAL NOT NULL,
  count INTEGER NOT NULL,
  metadata TEXT, -- JSON object with additional context
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Analytics insights and patterns
CREATE TABLE IF NOT EXISTS analytics_insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('pattern', 'anomaly', 'correlation', 'prediction')),
  message TEXT NOT NULL,
  confidence REAL NOT NULL,
  data TEXT NOT NULL, -- JSON object
  actionable BOOLEAN DEFAULT FALSE,
  session_id TEXT,
  metric_name TEXT,
  timestamp INTEGER NOT NULL,
  expires_at INTEGER -- Optional expiration for temporary insights
);

-- Performance tracking for analytics queries
CREATE TABLE IF NOT EXISTS analytics_performance (
  id TEXT PRIMARY KEY,
  query_type TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  query_hash TEXT NOT NULL
);

-- ============================================================================
-- FULL-TEXT SEARCH TABLES
-- ============================================================================

-- Full-text search support for session content
CREATE VIRTUAL TABLE IF NOT EXISTS session_search USING fts5(
  session_id, name, content, tags, 
  content='session_data', 
  prefix='2 3 4'
);

-- Full-text search for analytics events
CREATE VIRTUAL TABLE IF NOT EXISTS analytics_search USING fts5(
  event_id, event_type, content, tags,
  content='analytics_events',
  prefix='2 3 4'
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_session_data_status ON session_data (status);
CREATE INDEX IF NOT EXISTS idx_session_data_model ON session_data (model);
CREATE INDEX IF NOT EXISTS idx_session_data_created_at ON session_data (created_at);
CREATE INDEX IF NOT EXISTS idx_session_data_tags ON session_data (tags);

-- Token usage indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage (session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage (timestamp);

-- Checkpoint indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_session_id ON checkpoints (session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints (timestamp);
CREATE INDEX IF NOT EXISTS idx_session_checkpoints_session_id ON session_checkpoints (session_id);
CREATE INDEX IF NOT EXISTS idx_session_checkpoints_timestamp ON session_checkpoints (timestamp);

-- Conversation history indexes
CREATE INDEX IF NOT EXISTS idx_conversation_session_id ON conversation_history (session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_timestamp ON conversation_history (timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_role ON conversation_history (role);

-- Quota indexes
CREATE INDEX IF NOT EXISTS idx_quota_usage_period ON quota_usage (period, start_time);
CREATE INDEX IF NOT EXISTS idx_quota_session_model ON quota_session_usage (model, timestamp);
CREATE INDEX IF NOT EXISTS idx_quota_alerts_severity ON quota_alerts (severity, resolved);
CREATE INDEX IF NOT EXISTS idx_quota_trends_metric ON quota_trends (metric, period);
CREATE INDEX IF NOT EXISTS idx_quota_benchmarks_metric ON quota_benchmarks (metric, period);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events (session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tags ON analytics_events (tags);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_metric ON analytics_aggregations (metric_name, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_type ON analytics_insights (type, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_actionable ON analytics_insights (actionable, timestamp);

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY AND SEARCH INDEX MAINTENANCE
-- ============================================================================

-- Session search triggers
CREATE TRIGGER IF NOT EXISTS session_search_insert AFTER INSERT ON session_data BEGIN
  INSERT INTO session_search(session_id, name, content, tags) 
  VALUES (new.id, new.name, new.metadata, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS session_search_update AFTER UPDATE ON session_data BEGIN
  DELETE FROM session_search WHERE session_id = old.id;
  INSERT INTO session_search(session_id, name, content, tags) 
  VALUES (new.id, new.name, new.metadata, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS session_search_delete AFTER DELETE ON session_data BEGIN
  DELETE FROM session_search WHERE session_id = old.id;
END;

-- Analytics search triggers
CREATE TRIGGER IF NOT EXISTS analytics_search_insert AFTER INSERT ON analytics_events BEGIN
  INSERT INTO analytics_search(event_id, event_type, content, tags) 
  VALUES (new.id, new.event_type, new.data, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS analytics_search_update AFTER UPDATE ON analytics_events BEGIN
  DELETE FROM analytics_search WHERE event_id = old.id;
  INSERT INTO analytics_search(event_id, event_type, content, tags) 
  VALUES (new.id, new.event_type, new.data, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS analytics_search_delete AFTER DELETE ON analytics_events BEGIN
  DELETE FROM analytics_search WHERE event_id = old.id;
END;

-- Data integrity triggers
-- Automatically update session_data.updated_at when related tables change
CREATE TRIGGER IF NOT EXISTS update_session_timestamp_on_checkpoint AFTER INSERT ON session_checkpoints BEGIN
  UPDATE session_data SET updated_at = NEW.timestamp WHERE id = NEW.session_id;
END;

CREATE TRIGGER IF NOT EXISTS update_session_timestamp_on_conversation AFTER INSERT ON conversation_history BEGIN
  UPDATE session_data SET updated_at = NEW.timestamp WHERE id = NEW.session_id;
END;

-- Automatically update tokens_used in session_data when conversation entries are added
CREATE TRIGGER IF NOT EXISTS update_session_tokens_on_conversation AFTER INSERT ON conversation_history BEGIN
  UPDATE session_data 
  SET tokens_used = (
    SELECT SUM(tokens) FROM conversation_history WHERE session_id = NEW.session_id
  ) 
  WHERE id = NEW.session_id;
END;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Comprehensive session view with all related data
CREATE VIEW IF NOT EXISTS session_full_view AS
SELECT 
  sd.*,
  COUNT(sc.id) as checkpoint_count,
  COUNT(ch.id) as conversation_entries,
  SUM(ch.tokens) as total_conversation_tokens,
  MAX(sc.timestamp) as last_checkpoint_time,
  MAX(ch.timestamp) as last_conversation_time
FROM session_data sd
LEFT JOIN session_checkpoints sc ON sd.id = sc.session_id
LEFT JOIN conversation_history ch ON sd.id = ch.session_id
GROUP BY sd.id;

-- Current quota usage summary
CREATE VIEW IF NOT EXISTS current_quota_summary AS
SELECT 
  'current_week' as period,
  SUM(CASE WHEN model = 'sonnet' THEN duration_hours ELSE 0 END) as sonnet_used,
  SUM(CASE WHEN model = 'opus' THEN duration_hours ELSE 0 END) as opus_used,
  COUNT(CASE WHEN model = 'sonnet' THEN 1 END) as sonnet_sessions,
  COUNT(CASE WHEN model = 'opus' THEN 1 END) as opus_sessions,
  AVG(efficiency_score) as avg_efficiency,
  datetime(MIN(timestamp) / 1000, 'unixepoch') as period_start,
  datetime(MAX(timestamp) / 1000, 'unixepoch') as period_end
FROM quota_session_usage
WHERE timestamp >= strftime('%s', 'now', '-7 days') * 1000;

-- Analytics insights summary
CREATE VIEW IF NOT EXISTS insights_summary AS
SELECT 
  type,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN actionable = TRUE THEN 1 END) as actionable_count,
  datetime(MAX(timestamp) / 1000, 'unixepoch') as latest_insight
FROM analytics_insights
WHERE timestamp >= strftime('%s', 'now', '-7 days') * 1000
GROUP BY type;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

-- This schema supports:
-- 1. Comprehensive session management with full context preservation
-- 2. Advanced quota tracking with predictive analytics
-- 3. Real-time analytics and insights generation
-- 4. Full-text search capabilities across all data types
-- 5. Data integrity through triggers and foreign key constraints
-- 6. Performance optimization through strategic indexing
-- 7. Backward compatibility with existing systems
-- 8. Extensible design for future enhancements

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_version (version, applied_at, description) 
VALUES ('1.0.0', strftime('%s', 'now') * 1000, 'Initial comprehensive schema for Claude Code Optimizer');