-- Claude Code Session Tracking Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Main sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_type TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes REAL,
    process_id INTEGER,
    project_path TEXT,
    conversation_id TEXT,
    total_messages INTEGER DEFAULT 0,
    models_used TEXT,
    estimated_tokens INTEGER DEFAULT 0,
    real_input_tokens INTEGER DEFAULT 0,
    real_output_tokens INTEGER DEFAULT 0,
    real_total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0.0,
    real_cost REAL DEFAULT 0.0,
    efficiency_score REAL DEFAULT 0.0,
    files_created INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    metadata TEXT,
    five_hour_block_id TEXT,
    token_extraction_method TEXT DEFAULT 'estimated',
    last_token_update TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    total_cache_tokens INTEGER DEFAULT 0
);

-- Five-hour blocks table
CREATE TABLE IF NOT EXISTS five_hour_blocks (
    id TEXT PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    session_type TEXT,
    total_sessions INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    efficiency_score REAL DEFAULT 0.0,
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Message breakdown table
CREATE TABLE IF NOT EXISTS message_breakdown (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_number INTEGER NOT NULL,
    role TEXT NOT NULL,
    content_preview TEXT,
    tokens INTEGER DEFAULT 0,
    tools_used INTEGER DEFAULT 0,
    files_affected INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Tool usage tracking
CREATE TABLE IF NOT EXISTS tool_usage (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    first_used TIMESTAMPTZ DEFAULT now(),
    last_used TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Cost tracking
CREATE TABLE IF NOT EXISTS cost_breakdown (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    input_cost REAL DEFAULT 0.0,
    output_cost REAL DEFAULT 0.0,
    total_cost REAL DEFAULT 0.0,
    cost_calculation_date TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_block ON sessions(five_hour_block_id);
CREATE INDEX IF NOT EXISTS idx_blocks_start_time ON five_hour_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_messages_session ON message_breakdown(session_id);
CREATE INDEX IF NOT EXISTS idx_tools_session ON tool_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_cost_session ON cost_breakdown(session_id);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE five_hour_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_breakdown ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sessions FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON five_hour_blocks FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON five_hour_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON five_hour_blocks FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON message_breakdown FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON message_breakdown FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON tool_usage FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON tool_usage FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON cost_breakdown FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON cost_breakdown FOR INSERT WITH CHECK (true);

-- Sample data for testing (current session example)
INSERT INTO sessions (
    id, session_type, start_time, duration_minutes, estimated_tokens, 
    estimated_cost, files_created, files_modified, efficiency_score, 
    is_active, total_messages
) VALUES (
    'cc_session_20250818_172600',
    'claude-code',
    '2025-08-18T17:26:00+00:00',
    15.5,
    2500,
    0.025,
    1,
    3,
    0.92,
    true,
    8
) ON CONFLICT (id) DO UPDATE SET
    duration_minutes = EXCLUDED.duration_minutes,
    estimated_tokens = EXCLUDED.estimated_tokens,
    estimated_cost = EXCLUDED.estimated_cost,
    files_created = EXCLUDED.files_created,
    files_modified = EXCLUDED.files_modified,
    efficiency_score = EXCLUDED.efficiency_score,
    is_active = EXCLUDED.is_active,
    total_messages = EXCLUDED.total_messages,
    updated_at = now();

-- View for dashboard analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    COUNT(*) as total_sessions,
    SUM(estimated_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    AVG(efficiency_score) as avg_efficiency,
    SUM(files_created) as total_files_created,
    SUM(files_modified) as total_files_modified,
    COUNT(CASE WHEN is_active THEN 1 END) as active_sessions,
    DATE_TRUNC('day', start_time) as session_date
FROM sessions
GROUP BY DATE_TRUNC('day', start_time)
ORDER BY session_date DESC;

-- Function to get current session status
CREATE OR REPLACE FUNCTION get_current_session_status()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'current_session', json_build_object(
            'session_id', s.id,
            'start_time', s.start_time,
            'duration_minutes', s.duration_minutes,
            'total_tokens', s.estimated_tokens,
            'estimated_cost', s.estimated_cost,
            'files_created', s.files_created,
            'files_modified', s.files_modified,
            'efficiency_score', s.efficiency_score,
            'is_active', s.is_active,
            'total_messages', s.total_messages
        ),
        'daily_summary', json_build_object(
            'sessions_today', COUNT(*)::int,
            'tokens_today', SUM(s.estimated_tokens)::int,
            'cost_today', SUM(s.estimated_cost)::numeric(10,4)
        )
    ) INTO result
    FROM sessions s
    WHERE s.start_time >= CURRENT_DATE
    GROUP BY s.id, s.start_time, s.duration_minutes, s.estimated_tokens, 
             s.estimated_cost, s.files_created, s.files_modified, 
             s.efficiency_score, s.is_active, s.total_messages
    ORDER BY s.start_time DESC
    LIMIT 1;
    
    RETURN COALESCE(result, '{"current_session": null, "daily_summary": {"sessions_today": 0, "tokens_today": 0, "cost_today": 0}}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the function to be called via API
GRANT EXECUTE ON FUNCTION get_current_session_status() TO anon, authenticated;

SELECT 'Schema created successfully! You can now access your data via the Supabase API.' as status;