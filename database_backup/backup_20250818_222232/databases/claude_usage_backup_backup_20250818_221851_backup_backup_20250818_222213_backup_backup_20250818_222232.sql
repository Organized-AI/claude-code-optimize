BEGIN TRANSACTION;
CREATE TABLE hook_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "hook_config" VALUES('rate_warning_threshold_25','25','Percentage increase for low-level rate warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('rate_warning_threshold_50','50','Percentage increase for medium-level rate warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('rate_warning_threshold_100','100','Percentage increase for critical rate warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('context_warning_threshold','150000','Token count for context window warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('context_critical_threshold','180000','Token count for critical context warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('high_tool_rate_threshold','200','Rate threshold for high tool usage warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('extreme_tool_rate_threshold','500','Rate threshold for extreme tool usage warnings','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('efficiency_excellent_threshold','50','Rate threshold for excellent efficiency','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('milestone_token_interval','10000','Token interval for milestone notifications','2025-08-13 16:27:31');
INSERT INTO "hook_config" VALUES('milestone_tool_interval','25','Tool count interval for milestone notifications','2025-08-13 16:27:31');
CREATE TABLE hook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        tool_name TEXT,
        tokens_used INTEGER DEFAULT 0,
        rate INTEGER DEFAULT 0,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "hook_events" VALUES(2,'2025-08-07 21:13:44','PreToolUse','test-tool',0,0,NULL,'2025-08-07 21:13:44');
INSERT INTO "hook_events" VALUES(3,'2025-08-07 21:13:46','PostToolUse','test-tool',0,0,NULL,'2025-08-07 21:13:46');
INSERT INTO "hook_events" VALUES(4,'2025-08-07 21:13:56','SessionEnd','session_summary',0,0,NULL,'2025-08-07 21:13:56');
INSERT INTO "hook_events" VALUES(6,'2025-08-07 21:56:47','Notification','session_start',0,0,NULL,'2025-08-07 21:56:47');
INSERT INTO "hook_events" VALUES(7,'2025-08-07 21:56:48','Notification','milestone',0,0,NULL,'2025-08-07 21:56:48');
INSERT INTO "hook_events" VALUES(8,'2025-08-07 21:56:49','Notification','efficiency',0,0,NULL,'2025-08-07 21:56:49');
INSERT INTO "hook_events" VALUES(9,'2025-08-07 21:56:50','Notification','warning',0,0,NULL,'2025-08-07 21:56:50');
INSERT INTO "hook_events" VALUES(10,'2025-08-07 21:56:51','Notification','error',0,0,NULL,'2025-08-07 21:56:51');
INSERT INTO "hook_events" VALUES(11,'2025-08-07 21:56:52','Notification','milestone',10000,0,NULL,'2025-08-07 21:56:52');
INSERT INTO "hook_events" VALUES(12,'2025-08-07 21:57:18','SessionEnd','session_summary',0,0,NULL,'2025-08-07 21:57:18');
INSERT INTO "hook_events" VALUES(14,'2025-08-07 22:02:38','Notification','session_start',0,0,NULL,'2025-08-07 22:02:38');
INSERT INTO "hook_events" VALUES(15,'2025-08-07 22:02:39','Notification','milestone',0,0,NULL,'2025-08-07 22:02:39');
INSERT INTO "hook_events" VALUES(16,'2025-08-07 22:02:40','Notification','efficiency',0,0,NULL,'2025-08-07 22:02:40');
INSERT INTO "hook_events" VALUES(17,'2025-08-07 22:02:41','Notification','warning',0,0,NULL,'2025-08-07 22:02:41');
INSERT INTO "hook_events" VALUES(18,'2025-08-07 22:02:42','Notification','error',0,0,NULL,'2025-08-07 22:02:42');
INSERT INTO "hook_events" VALUES(19,'2025-08-07 22:02:44','Notification','milestone',10000,0,NULL,'2025-08-07 22:02:44');
INSERT INTO "hook_events" VALUES(21,'2025-08-13 14:57:28','Notification','session_start',0,0,NULL,'2025-08-13 14:57:28');
INSERT INTO "hook_events" VALUES(22,'2025-08-13 14:57:29','Notification','milestone',0,0,NULL,'2025-08-13 14:57:29');
INSERT INTO "hook_events" VALUES(23,'2025-08-13 14:57:30','Notification','efficiency',0,0,NULL,'2025-08-13 14:57:30');
INSERT INTO "hook_events" VALUES(24,'2025-08-13 14:57:31','Notification','warning',0,0,NULL,'2025-08-13 14:57:31');
INSERT INTO "hook_events" VALUES(25,'2025-08-13 14:57:33','Notification','error',0,0,NULL,'2025-08-13 14:57:33');
INSERT INTO "hook_events" VALUES(26,'2025-08-13 14:57:34','Notification','milestone',10000,0,NULL,'2025-08-13 14:57:34');
INSERT INTO "hook_events" VALUES(28,'2025-08-13 16:27:44','Notification','session_start',0,0,NULL,'2025-08-13 16:27:44');
INSERT INTO "hook_events" VALUES(29,'2025-08-13 16:27:45','Notification','milestone',0,0,NULL,'2025-08-13 16:27:45');
INSERT INTO "hook_events" VALUES(30,'2025-08-13 16:27:47','Notification','efficiency',0,0,NULL,'2025-08-13 16:27:47');
INSERT INTO "hook_events" VALUES(31,'2025-08-13 16:27:48','Notification','warning',0,0,NULL,'2025-08-13 16:27:48');
INSERT INTO "hook_events" VALUES(32,'2025-08-13 16:27:49','Notification','error',0,0,NULL,'2025-08-13 16:27:49');
INSERT INTO "hook_events" VALUES(33,'2025-08-13 16:27:50','Notification','milestone',10000,0,NULL,'2025-08-13 16:27:50');
INSERT INTO "hook_events" VALUES(34,'2025-08-13 16:28:39','SessionEnd','session_summary',0,0,NULL,'2025-08-13 16:28:39');
CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        title TEXT,
        message TEXT,
        urgency TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER,
        tokens_consumed INTEGER,
        tools_used INTEGER,
        average_rate REAL,
        efficiency_rating TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "sessions" VALUES('session_1754601223','2025-08-07T21:13:43Z','2025-08-07T21:13:56Z',-17987,0,1,0.0,'excellent','2025-08-07 21:13:56');
INSERT INTO "sessions" VALUES('','','2025-08-13T16:28:39Z',1755102519,0,0,0.0,'excellent','2025-08-13 16:28:39');
CREATE TABLE token_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        rate_per_minute REAL,
        tokens_current INTEGER,
        tool_name TEXT,
        rate_change_pct REAL,
        baseline_rate REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE INDEX idx_hook_events_session ON hook_events(session_id, timestamp);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_token_rates_session ON token_rates(session_id, timestamp);
CREATE INDEX idx_notifications_session ON notifications(session_id, timestamp);
CREATE VIEW session_efficiency AS
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
    GROUP BY s.id;
CREATE VIEW rate_analysis AS
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
    ORDER BY avg_rate DESC;
CREATE VIEW tool_performance AS
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
    ORDER BY usage_count DESC;
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('hook_events',34);
COMMIT;
