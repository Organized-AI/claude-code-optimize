-- Create claude_sessions table for storing Claude Code session data
CREATE TABLE IF NOT EXISTS claude_sessions (
  session_id TEXT PRIMARY KEY,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  token_budget INTEGER NOT NULL DEFAULT 200000,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
  is_realtime_active BOOLEAN NOT NULL DEFAULT false,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  efficiency DECIMAL(5,2) NOT NULL DEFAULT 0,
  rate_per_min INTEGER NOT NULL DEFAULT 0,
  cost_estimate DECIMAL(10,4) NOT NULL DEFAULT 0,
  budget_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  remaining_time BIGINT NOT NULL DEFAULT 0,
  elapsed_time BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on last_activity for faster queries
CREATE INDEX IF NOT EXISTS idx_claude_sessions_last_activity ON claude_sessions(last_activity DESC);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_claude_sessions_session_id ON claude_sessions(session_id);

-- Enable Row Level Security (optional, for better security)
ALTER TABLE claude_sessions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on claude_sessions" ON claude_sessions
  FOR ALL USING (true);
