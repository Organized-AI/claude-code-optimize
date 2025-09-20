-- Optimized Supabase Schema for Claude Code Optimizer
-- Performance-focused schema with proper indexes and partitioning
-- Single source of truth for all session data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Drop existing tables if needed for clean migration
DROP TABLE IF EXISTS message_breakdown CASCADE;
DROP TABLE IF EXISTS tool_usage CASCADE;
DROP TABLE IF EXISTS cost_breakdown CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS five_hour_blocks CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;

-- Five hour blocks table (parent table for sessions)
CREATE TABLE five_hour_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    session_type TEXT NOT NULL DEFAULT 'claude-code',
    total_sessions INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    billable_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    total_cost NUMERIC(10,4) DEFAULT 0.0,
    efficiency_score NUMERIC(5,2) DEFAULT 0.0,
    is_complete BOOLEAN DEFAULT FALSE,
    calendar_event_id TEXT, -- For Google Calendar integration
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table with optimized structure
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_type TEXT NOT NULL DEFAULT 'claude-code',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes NUMERIC(10,2),
    process_id INTEGER,
    project_path TEXT,
    conversation_id TEXT,
    total_messages INTEGER DEFAULT 0,
    models_used JSONB DEFAULT '[]'::jsonb,
    
    -- Token tracking with cache awareness
    estimated_tokens INTEGER DEFAULT 0,
    real_input_tokens INTEGER DEFAULT 0,
    real_output_tokens INTEGER DEFAULT 0,
    real_total_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    total_cache_tokens INTEGER DEFAULT 0,
    
    -- Cost tracking
    estimated_cost NUMERIC(10,4) DEFAULT 0.0,
    real_cost NUMERIC(10,4) DEFAULT 0.0,
    cache_discount NUMERIC(10,4) DEFAULT 0.0,
    
    -- Activity tracking
    files_created INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    tools_used JSONB DEFAULT '{}'::jsonb,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    five_hour_block_id UUID REFERENCES five_hour_blocks(id),
    token_extraction_method TEXT DEFAULT 'estimated',
    last_token_update TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance metrics
    efficiency_score NUMERIC(5,2) DEFAULT 0.0,
    response_time_avg NUMERIC(10,2), -- milliseconds
    error_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Message breakdown for detailed analysis
CREATE TABLE message_breakdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content_preview TEXT,
    content_hash TEXT, -- For deduplication
    model_used TEXT,
    
    -- Token details
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Tool usage
    tools_used JSONB DEFAULT '[]'::jsonb,
    files_affected INTEGER DEFAULT 0,
    
    -- Performance
    response_time_ms INTEGER,
    error_occurred BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, message_number)
);

-- Tool usage tracking
CREATE TABLE tool_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES message_breakdown(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    invocation_count INTEGER DEFAULT 1,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_execution_time_ms NUMERIC(10,2),
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cost breakdown for billing analysis
CREATE TABLE cost_breakdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_tokens INTEGER DEFAULT 0,
    input_cost NUMERIC(10,6) DEFAULT 0.0,
    output_cost NUMERIC(10,6) DEFAULT 0.0,
    cache_discount NUMERIC(10,6) DEFAULT 0.0,
    total_cost NUMERIC(10,6) DEFAULT 0.0,
    cost_per_token NUMERIC(10,8),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sync status for tracking data pipeline health
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    last_sync_time TIMESTAMPTZ,
    last_successful_sync TIMESTAMPTZ,
    records_synced INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'idle',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX idx_sessions_project_path ON sessions(project_path);
CREATE INDEX idx_sessions_conversation_id ON sessions(conversation_id);
CREATE INDEX idx_sessions_five_hour_block ON sessions(five_hour_block_id);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at DESC);

CREATE INDEX idx_five_hour_blocks_start_time ON five_hour_blocks(start_time DESC);
CREATE INDEX idx_five_hour_blocks_active ON five_hour_blocks(is_complete) WHERE is_complete = FALSE;

CREATE INDEX idx_message_breakdown_session ON message_breakdown(session_id, message_number);
CREATE INDEX idx_message_breakdown_timestamp ON message_breakdown(timestamp DESC);

CREATE INDEX idx_tool_usage_session ON tool_usage(session_id);
CREATE INDEX idx_tool_usage_name ON tool_usage(tool_name);

CREATE INDEX idx_cost_breakdown_session ON cost_breakdown(session_id);
CREATE INDEX idx_cost_breakdown_timestamp ON cost_breakdown(timestamp DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_five_hour_blocks_updated_at BEFORE UPDATE ON five_hour_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically assign sessions to five hour blocks
CREATE OR REPLACE FUNCTION assign_five_hour_block()
RETURNS TRIGGER AS $$
DECLARE
    block_id UUID;
BEGIN
    -- Find or create appropriate five hour block
    SELECT id INTO block_id
    FROM five_hour_blocks
    WHERE start_time <= NEW.start_time
    AND (end_time IS NULL OR end_time > NEW.start_time)
    AND session_type = NEW.session_type
    ORDER BY start_time DESC
    LIMIT 1;
    
    IF block_id IS NULL THEN
        -- Create new block
        INSERT INTO five_hour_blocks (start_time, end_time, session_type)
        VALUES (
            date_trunc('hour', NEW.start_time),
            date_trunc('hour', NEW.start_time) + INTERVAL '5 hours',
            NEW.session_type
        )
        RETURNING id INTO block_id;
    END IF;
    
    NEW.five_hour_block_id = block_id;
    
    -- Update block statistics
    UPDATE five_hour_blocks
    SET total_sessions = total_sessions + 1,
        total_tokens = total_tokens + COALESCE(NEW.real_total_tokens, NEW.estimated_tokens, 0),
        billable_tokens = billable_tokens + COALESCE(NEW.real_total_tokens, NEW.estimated_tokens, 0) - COALESCE(NEW.cache_read_tokens, 0),
        total_cost = total_cost + COALESCE(NEW.real_cost, NEW.estimated_cost, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = block_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER assign_session_to_block BEFORE INSERT ON sessions
    FOR EACH ROW EXECUTE FUNCTION assign_five_hour_block();

-- Views for common queries
CREATE OR REPLACE VIEW active_sessions AS
SELECT s.*, 
       fb.start_time as block_start,
       fb.end_time as block_end,
       fb.total_tokens as block_total_tokens,
       fb.total_cost as block_total_cost
FROM sessions s
LEFT JOIN five_hour_blocks fb ON s.five_hour_block_id = fb.id
WHERE s.is_active = TRUE
ORDER BY s.start_time DESC;

CREATE OR REPLACE VIEW weekly_summary AS
SELECT 
    DATE_TRUNC('week', start_time) as week_start,
    session_type,
    COUNT(*) as total_sessions,
    SUM(real_total_tokens) as total_tokens,
    SUM(cache_read_tokens) as cache_tokens,
    SUM(real_total_tokens - COALESCE(cache_read_tokens, 0)) as billable_tokens,
    SUM(real_cost) as total_cost,
    AVG(efficiency_score) as avg_efficiency,
    SUM(files_created + files_modified) as total_files_touched
FROM sessions
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY week_start, session_type
ORDER BY week_start DESC;

-- Performance monitoring view
CREATE OR REPLACE VIEW system_performance AS
SELECT 
    'sessions' as metric,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_day,
    AVG(response_time_avg) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as avg_response_time_ms,
    SUM(error_count) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as errors_last_hour
FROM sessions
UNION ALL
SELECT 
    'sync_status' as metric,
    SUM(records_synced) FILTER (WHERE last_sync_time > NOW() - INTERVAL '1 hour') as last_hour,
    SUM(records_synced) FILTER (WHERE last_sync_time > NOW() - INTERVAL '24 hours') as last_day,
    NULL as avg_response_time_ms,
    SUM(errors_count) FILTER (WHERE last_sync_time > NOW() - INTERVAL '1 hour') as errors_last_hour
FROM sync_status;

-- Row Level Security (RLS) policies if needed
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE five_hour_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_breakdown ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust based on your Supabase setup)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;