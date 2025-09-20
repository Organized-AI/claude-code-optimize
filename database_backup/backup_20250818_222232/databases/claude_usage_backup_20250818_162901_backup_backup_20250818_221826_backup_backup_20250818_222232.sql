BEGIN TRANSACTION;
CREATE TABLE cost_breakdown (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            input_cost REAL DEFAULT 0.0,
            output_cost REAL DEFAULT 0.0,
            total_cost REAL DEFAULT 0.0,
            cost_calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
INSERT INTO "cost_breakdown" VALUES(1,'cc_session_20250816_222413',9000,6000,0.027,0.018,0.045,'2025-08-18 21:13:40');
CREATE TABLE five_hour_blocks (
            id TEXT PRIMARY KEY,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            session_type TEXT,
            total_sessions INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_cost REAL DEFAULT 0.0,
            efficiency_score REAL DEFAULT 0.0,
            is_complete BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
INSERT INTO "five_hour_blocks" VALUES('block_1755206851','2025-08-14T14:27:31.100486',NULL,NULL,1,0,0.0,NULL,0,NULL,'2025-08-18 21:13:40');
CREATE TABLE message_breakdown (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            message_number INTEGER NOT NULL,
            role TEXT NOT NULL,
            content_preview TEXT,
            tokens INTEGER DEFAULT 0,
            tools_used INTEGER DEFAULT 0,
            files_affected INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
INSERT INTO "message_breakdown" VALUES(1,'cc_session_20250816_222413',1,'user','it seems the data is stale in my dashboard and...',150,0,0,'2025-08-18 21:13:40');
INSERT INTO "message_breakdown" VALUES(2,'cc_session_20250816_222413',2,'assistant','I''ll help you check if your dashboard is showing...',5000,15,1,'2025-08-18 21:13:40');
INSERT INTO "message_breakdown" VALUES(3,'cc_session_20250816_222413',3,'user','let''s fix the root causes and explore possible...',120,0,0,'2025-08-18 21:13:40');
INSERT INTO "message_breakdown" VALUES(4,'cc_session_20250816_222413',4,'assistant','I''ll investigate the root causes and identify...',9730,8,1,'2025-08-18 21:13:40');
CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            session_type TEXT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
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
            is_active BOOLEAN DEFAULT 0,
            metadata TEXT,
            five_hour_block_id TEXT,
            token_extraction_method TEXT DEFAULT 'estimated',
            last_token_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
INSERT INTO "sessions" VALUES('session_1','claude_desktop','2025-08-12 20:58:38',NULL,NULL,NULL,NULL,'conv_1',0,'claude-3-opus',0,1200,800,2000,0.0,0.0,0.0,0,0,0,NULL,NULL,'real_time_api_monitoring',NULL,NULL,'2025-08-18 21:13:40');
INSERT INTO "sessions" VALUES('session_2','claude_desktop','2025-08-13 20:58:38',NULL,NULL,NULL,NULL,'conv_2',0,'claude-3-sonnet',0,300,200,500,0.0,0.0,0.0,0,0,0,NULL,NULL,'real_time_api_monitoring',NULL,NULL,'2025-08-18 21:13:40');
INSERT INTO "sessions" VALUES('session_3','claude_desktop','2025-08-14 14:58:38',NULL,NULL,NULL,NULL,'conv_3',0,'claude-3-haiku',0,150,100,250,0.0,0.0,0.0,0,0,0,NULL,NULL,'real_time_api_monitoring',NULL,NULL,'2025-08-18 21:13:40');
INSERT INTO "sessions" VALUES('session_4','claude_desktop','2025-08-14 17:58:38',NULL,NULL,NULL,NULL,'conv_4',0,'claude-3-opus',0,800,1200,2000,0.0,0.0,0.0,0,0,0,NULL,NULL,'real_time_api_monitoring',NULL,NULL,'2025-08-18 21:13:40');
INSERT INTO "sessions" VALUES('session_5','claude_desktop','2025-08-14 19:58:38',NULL,NULL,NULL,NULL,'conv_5',0,'claude-3-sonnet',0,200,300,500,0.0,0.0,0.0,0,0,0,NULL,NULL,'real_time_api_monitoring',NULL,NULL,'2025-08-18 21:13:40');
INSERT INTO "sessions" VALUES('bbd41f5f-33e1-43d8-9e4e-3534b49a6722','claude_code','2025-08-14T21:12:40.256Z',NULL,NULL,NULL,NULL,NULL,0,'["claude-sonnet-4-20250514", "claude-opus-4-1-20250805"]',0,0,0,16405327,0.0,0.0,0.0,0,0,1,'{"conversation_file": "/Users/jordaaan/.claude/projects/-Users-jordaaan-Library-Mobile-Documents-com-apple-CloudDocs-BHT-Promo-iCloud-Organized-AI-Windsurf-Claude-Code-Optimizer/bbd41f5f-33e1-43d8-9e4e-3534b49a6722.jsonl", "message_count": 356}',NULL,NULL,NULL,NULL,'2025-08-18 21:13:40');
INSERT INTO "sessions" VALUES('cc_session_20250816_222413','claude-code','2025-08-16T21:37:00',NULL,47.2,NULL,NULL,NULL,4,NULL,15000,0,0,0,0.045,0.0,0.92,1,2,1,NULL,NULL,'estimated','2025-08-16T22:24:13.642504','2025-08-18 21:13:40','2025-08-18 21:13:40');
CREATE TABLE tool_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            usage_count INTEGER DEFAULT 1,
            first_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
INSERT INTO "tool_usage" VALUES(1,'cc_session_20250816_222413','TodoWrite',6,'2025-08-18 21:13:40','2025-08-18 21:13:40');
INSERT INTO "tool_usage" VALUES(2,'cc_session_20250816_222413','Task',1,'2025-08-18 21:13:40','2025-08-18 21:13:40');
INSERT INTO "tool_usage" VALUES(3,'cc_session_20250816_222413','Bash',12,'2025-08-18 21:13:40','2025-08-18 21:13:40');
INSERT INTO "tool_usage" VALUES(4,'cc_session_20250816_222413','Read',4,'2025-08-18 21:13:40','2025-08-18 21:13:40');
INSERT INTO "tool_usage" VALUES(5,'cc_session_20250816_222413','Write',1,'2025-08-18 21:13:40','2025-08-18 21:13:40');
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_sessions_block ON sessions(five_hour_block_id);
CREATE INDEX idx_blocks_start_time ON five_hour_blocks(start_time);
CREATE INDEX idx_messages_session ON message_breakdown(session_id);
CREATE INDEX idx_tools_session ON tool_usage(session_id);
CREATE INDEX idx_cost_session ON cost_breakdown(session_id);
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('message_breakdown',4);
INSERT INTO "sqlite_sequence" VALUES('tool_usage',5);
INSERT INTO "sqlite_sequence" VALUES('cost_breakdown',1);
COMMIT;
