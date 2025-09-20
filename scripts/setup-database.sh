#!/bin/bash

# Database Setup Script for Claude Code Hooks Integration
# Creates/updates SQLite database schema for hook event tracking

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OPTIMIZER_DB="$PROJECT_ROOT/data/claude_usage.db"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if optimizer database exists
check_optimizer_database() {
    if [[ -f "$OPTIMIZER_DB" ]]; then
        log "✅ Found existing optimizer database: $OPTIMIZER_DB"
        return 0
    else
        log "❌ Optimizer database not found: $OPTIMIZER_DB"
        return 1
    fi
}

# Create optimizer directory structure if needed
setup_optimizer_structure() {
    local optimizer_dir="$PROJECT_ROOT"
    local data_dir="$optimizer_dir/data"
    
    if [[ ! -d "$optimizer_dir" ]]; then
        log "📁 Creating optimizer directory: $optimizer_dir"
        mkdir -p "$optimizer_dir"
    fi
    
    if [[ ! -d "$data_dir" ]]; then
        log "📁 Creating data directory: $data_dir"
        mkdir -p "$data_dir"
    fi
}

# Initialize database with required tables
initialize_database() {
    local db_path="$1"
    
    log "🗄️ Initializing database: $db_path"
    
    # Create hook_events table
    sqlite3 "$db_path" "CREATE TABLE IF NOT EXISTS hook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        tool_name TEXT,
        tokens_used INTEGER DEFAULT 0,
        rate INTEGER DEFAULT 0,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );"
    
    # Create sessions table
    sqlite3 "$db_path" "CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER,
        tokens_consumed INTEGER,
        tools_used INTEGER,
        average_rate REAL,
        efficiency_rating TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );"
    
    # Create token_rates table for rate tracking
    sqlite3 "$db_path" "CREATE TABLE IF NOT EXISTS token_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        rate_per_minute REAL,
        tokens_current INTEGER,
        tool_name TEXT,
        rate_change_pct REAL,
        baseline_rate REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );"
    
    # Create notifications table
    sqlite3 "$db_path" "CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        title TEXT,
        message TEXT,
        urgency TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );"
    
    # Create indexes for better performance
    sqlite3 "$db_path" "CREATE INDEX IF NOT EXISTS idx_hook_events_session ON hook_events(session_id, timestamp);"
    sqlite3 "$db_path" "CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);"
    sqlite3 "$db_path" "CREATE INDEX IF NOT EXISTS idx_token_rates_session ON token_rates(session_id, timestamp);"
    sqlite3 "$db_path" "CREATE INDEX IF NOT EXISTS idx_notifications_session ON notifications(session_id, timestamp);"
    
    log "✅ Database schema initialized successfully"
}

# Create views for easy data analysis
create_analysis_views() {
    local db_path="$1"
    
    log "📊 Creating analysis views"
    
    # Session efficiency view
    sqlite3 "$db_path" "CREATE VIEW IF NOT EXISTS session_efficiency AS
    SELECT 
        s.id as session_id,
        s.start_time,
        s.duration_seconds / 60.0 as duration_minutes,
        s.tokens_consumed,
        s.tools_used,
        s.average_rate,
        s.efficiency_rating,
        ROUND(s.tokens_consumed / NULLIF(s.tools_used, 0), 2) as tokens_per_tool,
        COUNT(n.id) as notification_count,
        COUNT(CASE WHEN n.urgency = 'critical' THEN 1 END) as critical_alerts
    FROM sessions s
    LEFT JOIN notifications n ON s.id = n.session_id
    GROUP BY s.id;"
    
    # Rate analysis view
    sqlite3 "$db_path" "CREATE VIEW IF NOT EXISTS rate_analysis AS
    SELECT 
        session_id,
        tool_name,
        AVG(rate_per_minute) as avg_rate,
        MAX(rate_per_minute) as peak_rate,
        MIN(rate_per_minute) as min_rate,
        AVG(rate_change_pct) as avg_change_pct,
        COUNT(*) as measurements
    FROM token_rates
    WHERE rate_per_minute > 0
    GROUP BY session_id, tool_name
    ORDER BY avg_rate DESC;"
    
    # Tool performance view
    sqlite3 "$db_path" "CREATE VIEW IF NOT EXISTS tool_performance AS
    SELECT 
        tool_name,
        COUNT(*) as usage_count,
        AVG(tokens_used) as avg_tokens,
        AVG(rate) as avg_rate,
        SUM(CASE WHEN event_type = 'PreToolUse' THEN 1 ELSE 0 END) as pre_tool_events,
        SUM(CASE WHEN event_type = 'PostToolUse' THEN 1 ELSE 0 END) as post_tool_events
    FROM hook_events
    WHERE tool_name IS NOT NULL AND tool_name != 'unknown'
    GROUP BY tool_name
    ORDER BY usage_count DESC;"
    
    log "✅ Analysis views created successfully"
}

# Insert sample configuration data
insert_sample_data() {
    local db_path="$1"
    
    log "📝 Inserting sample configuration data"
    
    # Create configuration table if it doesn't exist
    sqlite3 "$db_path" "CREATE TABLE IF NOT EXISTS hook_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );"
    
    # Insert default configuration
    sqlite3 "$db_path" "INSERT OR REPLACE INTO hook_config (key, value, description) VALUES 
    ('rate_warning_threshold_25', '25', 'Percentage increase for low-level rate warnings'),
    ('rate_warning_threshold_50', '50', 'Percentage increase for medium-level rate warnings'),
    ('rate_warning_threshold_100', '100', 'Percentage increase for critical rate warnings'),
    ('context_warning_threshold', '150000', 'Token count for context window warnings'),
    ('context_critical_threshold', '180000', 'Token count for critical context warnings'),
    ('high_tool_rate_threshold', '200', 'Rate threshold for high tool usage warnings'),
    ('extreme_tool_rate_threshold', '500', 'Rate threshold for extreme tool usage warnings'),
    ('efficiency_excellent_threshold', '50', 'Rate threshold for excellent efficiency'),
    ('milestone_token_interval', '10000', 'Token interval for milestone notifications'),
    ('milestone_tool_interval', '25', 'Tool count interval for milestone notifications');"
    
    log "✅ Sample configuration data inserted"
}

# Test database connectivity
test_database() {
    local db_path="$1"
    
    log "🧪 Testing database connectivity"
    
    # Test basic queries
    local table_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
    local view_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type='view';")
    
    log "📊 Database stats: $table_count tables, $view_count views"
    
    # Test insert/select
    sqlite3 "$db_path" "INSERT INTO hook_events (timestamp, event_type, tool_name, session_id) VALUES ('$(date -u +"%Y-%m-%dT%H:%M:%SZ")', 'test', 'database_setup', 'test_session');"
    local test_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM hook_events WHERE event_type='test' AND tool_name='database_setup';")
    
    if [[ $test_count -eq 1 ]]; then
        log "✅ Database connectivity test passed"
        # Clean up test data
        sqlite3 "$db_path" "DELETE FROM hook_events WHERE event_type='test' AND tool_name='database_setup';"
        return 0
    else
        log "❌ Database connectivity test failed"
        return 1
    fi
}

# Main setup function
main() {
    log "🚀 Starting Claude Code Hooks database setup"
    
    # Setup directory structure
    setup_optimizer_structure
    
    # Determine database path
    local db_path
    if check_optimizer_database; then
        db_path="$OPTIMIZER_DB"
        log "📎 Using existing optimizer database"
    else
        db_path="$PROJECT_ROOT/$OPTIMIZER_PATH/data/claude_usage.db"
        log "📦 Creating new database: $db_path"
    fi
    
    # Initialize database
    initialize_database "$db_path"
    
    # Create analysis views
    create_analysis_views "$db_path"
    
    # Insert sample configuration
    insert_sample_data "$db_path"
    
    # Test database
    if test_database "$db_path"; then
        log "✅ Database setup completed successfully"
        log "🗄️ Database location: $db_path"
        
        # Create symlink for easy access
        local hooks_db_link="$PROJECT_ROOT/data/hooks.db"
        ln -sf "$db_path" "$hooks_db_link" 2>/dev/null
        log "🔗 Database symlink: $hooks_db_link"
        
        return 0
    else
        log "❌ Database setup failed"
        return 1
    fi
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi