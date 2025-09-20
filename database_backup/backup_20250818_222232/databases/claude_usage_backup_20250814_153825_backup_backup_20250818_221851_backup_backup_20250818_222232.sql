BEGIN TRANSACTION;
CREATE TABLE five_hour_blocks (
        id TEXT PRIMARY KEY,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        session_type TEXT,
        total_sessions INTEGER,
        total_tokens INTEGER,
        efficiency_score REAL,
        is_complete BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE real_sessions (
        id TEXT PRIMARY KEY,
        session_type TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        process_id INTEGER,
        project_path TEXT,
        conversation_id TEXT,
        total_messages INTEGER,
        models_used TEXT,
        estimated_tokens INTEGER,
        is_active BOOLEAN,
        metadata TEXT,
        five_hour_block_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
COMMIT;
