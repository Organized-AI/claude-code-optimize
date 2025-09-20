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
    , real_input_tokens INTEGER DEFAULT 0, real_output_tokens INTEGER DEFAULT 0, real_total_tokens INTEGER DEFAULT 0, token_extraction_method TEXT DEFAULT 'estimated', last_token_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP, tokens_used INTEGER GENERATED ALWAYS AS 
                    (COALESCE(real_total_tokens, estimated_tokens, 0)) VIRTUAL);
INSERT INTO "real_sessions" VALUES('bbd41f5f-33e1-43d8-9e4e-3534b49a6722','claude_code','2025-08-14T20:03:05.742Z',NULL,0,'/tmp','bbd41f5f-33e1-43d8-9e4e-3534b49a6722',356,'claude-sonnet-4-20250514',NULL,1,'{"file": "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/claude-backup/projects/-Users-jordaaan-Library-Mobile-Documents-com-apple-CloudDocs-BHT-Promo-iCloud-Organized-AI-Windsurf-Claude-Code-Optimizer/bbd41f5f-33e1-43d8-9e4e-3534b49a6722.jsonl"}',NULL,'2025-08-14 21:44:25',965685,338467,1304152,'jsonl_parsed','2025-08-14 21:44:25');
INSERT INTO "real_sessions" VALUES('cc_session_20250816_222413','claude-code','2025-08-16T21:37:00',NULL,7066,'/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer','cc_session_20250816_222413',4,'claude-sonnet-4',15000,1,'{"current_session": {"session_id": "cc_session_20250816_222413", "start_time": "2025-08-16T21:37:00", "duration_minutes": 47.2, "total_tokens": 15000, "estimated_cost": 0.045, "files_created": 1, "files_modified": 2, "efficiency_score": 0.92, "last_update": "2025-08-16T22:24:13.642504"}, "breakdown": [{"message": "#1 [user]", "content": "it seems the data is stale in my dashboard and...", "tokens": 150, "tools": 0, "files": 0}, {"message": "#2 [assistant]", "content": "I''ll help you check if your dashboard is showing...", "tokens": 5000, "tools": 15, "files": 1}, {"message": "#3 [user]", "content": "let''s fix the root causes and explore possible...", "tokens": 120, "tools": 0, "files": 0}, {"message": "#4 [assistant]", "content": "I''ll investigate the root causes and identify...", "tokens": 9730, "tools": 8, "files": 1}], "tools_summary": {"TodoWrite": 6, "Task": 1, "Bash": 12, "Read": 4, "Write": 1}, "cost_breakdown": {"input_tokens": 9000, "output_tokens": 6000, "input_cost": 0.027, "output_cost": 0.018, "total_cost": 0.045}}','block_20250816_22','2025-08-17 03:24:13',0,0,15000,'live_update','2025-08-16T22:24:13.645550');
COMMIT;
