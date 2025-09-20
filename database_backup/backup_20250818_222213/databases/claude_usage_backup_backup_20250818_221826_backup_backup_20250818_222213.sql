BEGIN TRANSACTION;
CREATE TABLE five_hour_blocks (
                id TEXT PRIMARY KEY,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                total_sessions INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                billable_tokens INTEGER DEFAULT 0,
                input_output_tokens INTEGER DEFAULT 0,
                cache_creation_tokens INTEGER DEFAULT 0,
                cache_read_tokens INTEGER DEFAULT 0,
                is_complete BOOLEAN DEFAULT FALSE,
                efficiency_score REAL,
                cost_estimate REAL
            );
INSERT INTO "five_hour_blocks" VALUES('block_1755206851','2025-08-14T14:27:31.100486',NULL,1,0,2814269,0,0,0,0,NULL,NULL);
CREATE TABLE real_sessions (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    session_type TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    real_input_tokens INTEGER DEFAULT 0,
    real_output_tokens INTEGER DEFAULT 0,
    real_total_tokens INTEGER DEFAULT 0,
    estimated_tokens INTEGER DEFAULT 0,
    token_extraction_method TEXT,
    last_token_update TIMESTAMP,
    models_used TEXT,
    is_active BOOLEAN DEFAULT 0,
    metadata TEXT
, billable_tokens INTEGER DEFAULT 0, input_output_tokens INTEGER DEFAULT 0, cache_creation_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0, cost_estimate REAL DEFAULT 0);
INSERT INTO "real_sessions" VALUES('session_1','conv_1','claude_desktop','2025-08-12 20:58:38',NULL,1200,800,2000,0,'real_time_api_monitoring',NULL,'claude-3-opus',0,NULL,0,0,0,0,0.0);
INSERT INTO "real_sessions" VALUES('session_2','conv_2','claude_desktop','2025-08-13 20:58:38',NULL,300,200,500,0,'real_time_api_monitoring',NULL,'claude-3-sonnet',0,NULL,0,0,0,0,0.0);
INSERT INTO "real_sessions" VALUES('session_3','conv_3','claude_desktop','2025-08-14 14:58:38',NULL,150,100,250,0,'real_time_api_monitoring',NULL,'claude-3-haiku',0,NULL,0,0,0,0,0.0);
INSERT INTO "real_sessions" VALUES('session_4','conv_4','claude_desktop','2025-08-14 17:58:38',NULL,800,1200,2000,0,'real_time_api_monitoring',NULL,'claude-3-opus',0,NULL,0,0,0,0,0.0);
INSERT INTO "real_sessions" VALUES('session_5','conv_5','claude_desktop','2025-08-14 19:58:38',NULL,200,300,500,0,'real_time_api_monitoring',NULL,'claude-3-sonnet',0,NULL,0,0,0,0,0.0);
INSERT INTO "real_sessions" VALUES('bbd41f5f-33e1-43d8-9e4e-3534b49a6722',NULL,'claude_code','2025-08-14T21:12:40.256Z',NULL,0,0,16405327,0,NULL,NULL,'["claude-sonnet-4-20250514", "claude-opus-4-1-20250805"]',1,'{"conversation_file": "/Users/jordaaan/.claude/projects/-Users-jordaaan-Library-Mobile-Documents-com-apple-CloudDocs-BHT-Promo-iCloud-Organized-AI-Windsurf-Claude-Code-Optimizer/bbd41f5f-33e1-43d8-9e4e-3534b49a6722.jsonl", "message_count": 356}',2814269,342719,961433,1510117,25.33);
COMMIT;
