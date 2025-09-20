import { DatabaseManager } from '../services/DatabaseManager.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Database migration system for the Claude Code Optimizer
 * Handles schema evolution and data migration
 */

export interface Migration {
  version: string;
  description: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
}

export class MigrationManager {
  private dbManager: DatabaseManager;
  private db: any;
  private migrationsPath: string;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.db = (dbManager as any).db;
    this.migrationsPath = __dirname;
    
    this.initializeMigrationTracking();
  }

  private initializeMigrationTracking(): void {
    // Create migration tracking table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL,
        description TEXT NOT NULL,
        checksum TEXT NOT NULL
      );
    `);
  }

  async runMigrations(): Promise<void> {
    const migrations = this.getMigrations();
    const appliedMigrations = this.getAppliedMigrations();

    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        console.log(`Applying migration ${migration.version}: ${migration.description}`);
        
        try {
          await migration.up(this.db);
          this.markMigrationAsApplied(migration);
          console.log(`✓ Migration ${migration.version} applied successfully`);
        } catch (error) {
          console.error(`✗ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }

  async rollbackMigration(version: string): Promise<void> {
    const migrations = this.getMigrations();
    const migration = migrations.find(m => m.version === version);
    
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    const appliedMigrations = this.getAppliedMigrations();
    if (!appliedMigrations.includes(version)) {
      throw new Error(`Migration ${version} has not been applied`);
    }

    console.log(`Rolling back migration ${version}: ${migration.description}`);
    
    try {
      await migration.down(this.db);
      this.markMigrationAsRolledBack(version);
      console.log(`✓ Migration ${version} rolled back successfully`);
    } catch (error) {
      console.error(`✗ Migration ${version} rollback failed:`, error);
      throw error;
    }
  }

  private getMigrations(): Migration[] {
    return [
      {
        version: '001_initial_schema',
        description: 'Create initial database schema',
        up: async (db) => {
          const schemaPath = join(this.migrationsPath, 'schema.sql');
          const schema = readFileSync(schemaPath, 'utf-8');
          db.exec(schema);
        },
        down: async (db) => {
          // Drop all tables (be very careful with this in production!)
          const tables = [
            'analytics_search', 'session_search', // FTS tables first
            'analytics_performance', 'analytics_insights', 'analytics_aggregations', 'analytics_events',
            'quota_benchmarks', 'quota_trends', 'quota_alerts', 'quota_session_usage', 'quota_usage',
            'conversation_history', 'session_checkpoints', 'session_data',
            'checkpoints', 'token_usage', 'sessions',
            'schema_version'
          ];
          
          for (const table of tables) {
            db.exec(`DROP TABLE IF EXISTS ${table};`);
          }
        }
      },
      {
        version: '002_add_user_preferences',
        description: 'Add user preferences and app state tracking',
        up: async (db) => {
          db.exec(`
            -- User preferences tracking
            CREATE TABLE IF NOT EXISTS user_preferences (
              id TEXT PRIMARY KEY DEFAULT 'default',
              preferences TEXT NOT NULL, -- JSON object
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );

            -- Application state tracking
            CREATE TABLE IF NOT EXISTS app_state (
              id TEXT PRIMARY KEY DEFAULT 'current',
              state TEXT NOT NULL, -- JSON object
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );

            -- User activity tracking
            CREATE TABLE IF NOT EXISTS user_activity (
              id TEXT PRIMARY KEY,
              activity_type TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              data TEXT, -- JSON object
              session_id TEXT,
              ip_address TEXT,
              user_agent TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity (activity_type, timestamp);
            CREATE INDEX IF NOT EXISTS idx_user_activity_session ON user_activity (session_id);
          `);
        },
        down: async (db) => {
          db.exec(`
            DROP INDEX IF EXISTS idx_user_activity_session;
            DROP INDEX IF EXISTS idx_user_activity_type;
            DROP TABLE IF EXISTS user_activity;
            DROP TABLE IF EXISTS app_state;
            DROP TABLE IF EXISTS user_preferences;
          `);
        }
      },
      {
        version: '003_enhance_analytics',
        description: 'Enhance analytics with advanced features',
        up: async (db) => {
          db.exec(`
            -- Add columns to analytics_events for better categorization
            ALTER TABLE analytics_events ADD COLUMN category TEXT DEFAULT 'general';
            ALTER TABLE analytics_events ADD COLUMN severity TEXT DEFAULT 'info';
            ALTER TABLE analytics_events ADD COLUMN source TEXT DEFAULT 'system';

            -- Analytics event categories
            CREATE TABLE IF NOT EXISTS analytics_categories (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              description TEXT,
              color TEXT,
              icon TEXT,
              created_at INTEGER NOT NULL
            );

            -- Event correlation tracking
            CREATE TABLE IF NOT EXISTS analytics_correlations (
              id TEXT PRIMARY KEY,
              event_a_id TEXT NOT NULL,
              event_b_id TEXT NOT NULL,
              correlation_type TEXT NOT NULL,
              correlation_strength REAL NOT NULL,
              confidence REAL NOT NULL,
              discovered_at INTEGER NOT NULL,
              FOREIGN KEY (event_a_id) REFERENCES analytics_events (id),
              FOREIGN KEY (event_b_id) REFERENCES analytics_events (id)
            );

            -- Anomaly detection results
            CREATE TABLE IF NOT EXISTS analytics_anomalies (
              id TEXT PRIMARY KEY,
              metric_name TEXT NOT NULL,
              anomaly_type TEXT NOT NULL, -- 'spike', 'dip', 'pattern_break', 'outlier'
              severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
              value REAL NOT NULL,
              expected_value REAL NOT NULL,
              deviation REAL NOT NULL,
              timestamp INTEGER NOT NULL,
              detected_at INTEGER NOT NULL,
              context TEXT, -- JSON object
              investigated BOOLEAN DEFAULT FALSE
            );

            -- Indexes for new tables
            CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events (category, timestamp);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_severity ON analytics_events (severity, timestamp);
            CREATE INDEX IF NOT EXISTS idx_analytics_correlations_type ON analytics_correlations (correlation_type);
            CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_metric ON analytics_anomalies (metric_name, timestamp);
            CREATE INDEX IF NOT EXISTS idx_analytics_anomalies_severity ON analytics_anomalies (severity, detected_at);

            -- Insert default categories
            INSERT OR IGNORE INTO analytics_categories (id, name, description, color, created_at) VALUES
              ('session', 'Session Events', 'Events related to session lifecycle', '#3B82F6', strftime('%s', 'now') * 1000),
              ('performance', 'Performance', 'System and query performance metrics', '#10B981', strftime('%s', 'now') * 1000),
              ('quota', 'Quota Management', 'Quota usage and warnings', '#F59E0B', strftime('%s', 'now') * 1000),
              ('error', 'Errors', 'System errors and failures', '#EF4444', strftime('%s', 'now') * 1000),
              ('user', 'User Actions', 'User-initiated actions and interactions', '#8B5CF6', strftime('%s', 'now') * 1000),
              ('system', 'System Events', 'Internal system events and processes', '#6B7280', strftime('%s', 'now') * 1000);
          `);
        },
        down: async (db) => {
          db.exec(`
            DROP INDEX IF EXISTS idx_analytics_anomalies_severity;
            DROP INDEX IF EXISTS idx_analytics_anomalies_metric;
            DROP INDEX IF EXISTS idx_analytics_correlations_type;
            DROP INDEX IF EXISTS idx_analytics_events_severity;
            DROP INDEX IF EXISTS idx_analytics_events_category;
            DROP TABLE IF EXISTS analytics_anomalies;
            DROP TABLE IF EXISTS analytics_correlations;
            DROP TABLE IF EXISTS analytics_categories;
            
            -- Note: Cannot remove columns in SQLite, would need to recreate table
            -- ALTER TABLE analytics_events DROP COLUMN category;
            -- ALTER TABLE analytics_events DROP COLUMN severity;
            -- ALTER TABLE analytics_events DROP COLUMN source;
          `);
        }
      },
      {
        version: '004_add_project_tracking',
        description: 'Add project-specific tracking and analysis',
        up: async (db) => {
          db.exec(`
            -- Project information tracking
            CREATE TABLE IF NOT EXISTS projects (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              path TEXT NOT NULL,
              description TEXT,
              complexity_score REAL,
              risk_score REAL,
              language_primary TEXT,
              languages TEXT, -- JSON array
              framework TEXT,
              repository_url TEXT,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              last_analyzed_at INTEGER
            );

            -- Session-project relationships
            CREATE TABLE IF NOT EXISTS session_projects (
              session_id TEXT NOT NULL,
              project_id TEXT NOT NULL,
              PRIMARY KEY (session_id, project_id),
              FOREIGN KEY (session_id) REFERENCES session_data (id) ON DELETE CASCADE,
              FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            );

            -- Project complexity analysis history
            CREATE TABLE IF NOT EXISTS project_analyses (
              id TEXT PRIMARY KEY,
              project_id TEXT NOT NULL,
              analysis_type TEXT NOT NULL, -- 'complexity', 'risk', 'security', 'performance'
              results TEXT NOT NULL, -- JSON object
              score REAL NOT NULL,
              analyzer_version TEXT,
              timestamp INTEGER NOT NULL,
              FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            );

            -- Project metrics over time
            CREATE TABLE IF NOT EXISTS project_metrics (
              id TEXT PRIMARY KEY,
              project_id TEXT NOT NULL,
              metric_name TEXT NOT NULL,
              metric_value REAL NOT NULL,
              timestamp INTEGER NOT NULL,
              metadata TEXT, -- JSON object
              FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            );

            -- Indexes for project tables
            CREATE INDEX IF NOT EXISTS idx_projects_path ON projects (path);
            CREATE INDEX IF NOT EXISTS idx_projects_complexity ON projects (complexity_score);
            CREATE INDEX IF NOT EXISTS idx_project_analyses_type ON project_analyses (project_id, analysis_type, timestamp);
            CREATE INDEX IF NOT EXISTS idx_project_metrics_name ON project_metrics (project_id, metric_name, timestamp);

            -- Add project_id to session_data
            ALTER TABLE session_data ADD COLUMN project_id TEXT;
            CREATE INDEX IF NOT EXISTS idx_session_data_project ON session_data (project_id);
          `);
        },
        down: async (db) => {
          db.exec(`
            DROP INDEX IF EXISTS idx_session_data_project;
            DROP INDEX IF EXISTS idx_project_metrics_name;
            DROP INDEX IF EXISTS idx_project_analyses_type;
            DROP INDEX IF EXISTS idx_projects_complexity;
            DROP INDEX IF EXISTS idx_projects_path;
            DROP TABLE IF EXISTS project_metrics;
            DROP TABLE IF EXISTS project_analyses;
            DROP TABLE IF EXISTS session_projects;
            DROP TABLE IF EXISTS projects;
            
            -- Note: Cannot drop columns in SQLite
            -- ALTER TABLE session_data DROP COLUMN project_id;
          `);
        }
      },
      {
        version: '005_performance_optimization',
        description: 'Add performance monitoring and optimization features',
        up: async (db) => {
          db.exec(`
            -- System performance metrics
            CREATE TABLE IF NOT EXISTS system_performance (
              id TEXT PRIMARY KEY,
              metric_type TEXT NOT NULL, -- 'cpu', 'memory', 'disk', 'network', 'database'
              metric_name TEXT NOT NULL,
              value REAL NOT NULL,
              unit TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              host TEXT,
              process_id INTEGER,
              metadata TEXT -- JSON object
            );

            -- Query performance tracking (enhanced)
            CREATE TABLE IF NOT EXISTS query_performance (
              id TEXT PRIMARY KEY,
              query_type TEXT NOT NULL,
              query_signature TEXT NOT NULL, -- Hash of the normalized query
              execution_time_ms INTEGER NOT NULL,
              rows_examined INTEGER,
              rows_returned INTEGER,
              memory_used_kb INTEGER,
              cpu_time_ms INTEGER,
              timestamp INTEGER NOT NULL,
              session_id TEXT,
              user_id TEXT,
              optimization_applied BOOLEAN DEFAULT FALSE
            );

            -- Performance alerts
            CREATE TABLE IF NOT EXISTS performance_alerts (
              id TEXT PRIMARY KEY,
              alert_type TEXT NOT NULL, -- 'slow_query', 'high_memory', 'high_cpu', 'disk_space'
              severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')),
              message TEXT NOT NULL,
              threshold_value REAL NOT NULL,
              actual_value REAL NOT NULL,
              metric_name TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              resolved BOOLEAN DEFAULT FALSE,
              resolved_at INTEGER,
              resolution_note TEXT
            );

            -- Performance optimization suggestions
            CREATE TABLE IF NOT EXISTS optimization_suggestions (
              id TEXT PRIMARY KEY,
              target_type TEXT NOT NULL, -- 'query', 'index', 'schema', 'application'
              target_identifier TEXT NOT NULL,
              suggestion_type TEXT NOT NULL, -- 'add_index', 'rewrite_query', 'cache', 'partition'
              description TEXT NOT NULL,
              estimated_improvement REAL, -- Percentage improvement expected
              implementation_effort TEXT CHECK(implementation_effort IN ('low', 'medium', 'high')),
              priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
              status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'implemented', 'rejected')),
              created_at INTEGER NOT NULL,
              implemented_at INTEGER
            );

            -- Indexes for performance tables
            CREATE INDEX IF NOT EXISTS idx_system_performance_type ON system_performance (metric_type, timestamp);
            CREATE INDEX IF NOT EXISTS idx_system_performance_name ON system_performance (metric_name, timestamp);
            CREATE INDEX IF NOT EXISTS idx_query_performance_type ON query_performance (query_type, timestamp);
            CREATE INDEX IF NOT EXISTS idx_query_performance_time ON query_performance (execution_time_ms DESC);
            CREATE INDEX IF NOT EXISTS idx_performance_alerts_type ON performance_alerts (alert_type, severity, timestamp);
            CREATE INDEX IF NOT EXISTS idx_optimization_suggestions_priority ON optimization_suggestions (priority, status);

            -- Update analytics_performance table with additional columns
            ALTER TABLE analytics_performance ADD COLUMN memory_used_kb INTEGER;
            ALTER TABLE analytics_performance ADD COLUMN cpu_time_ms INTEGER;
            ALTER TABLE analytics_performance ADD COLUMN optimization_applied BOOLEAN DEFAULT FALSE;
          `);
        },
        down: async (db) => {
          db.exec(`
            DROP INDEX IF EXISTS idx_optimization_suggestions_priority;
            DROP INDEX IF EXISTS idx_performance_alerts_type;
            DROP INDEX IF EXISTS idx_query_performance_time;
            DROP INDEX IF EXISTS idx_query_performance_type;
            DROP INDEX IF EXISTS idx_system_performance_name;
            DROP INDEX IF EXISTS idx_system_performance_type;
            DROP TABLE IF EXISTS optimization_suggestions;
            DROP TABLE IF EXISTS performance_alerts;
            DROP TABLE IF EXISTS query_performance;
            DROP TABLE IF EXISTS system_performance;
          `);
        }
      }
    ];
  }

  private getAppliedMigrations(): string[] {
    const stmt = this.db.prepare('SELECT version FROM schema_migrations ORDER BY version');
    const rows = stmt.all();
    return rows.map((row: any) => row.version);
  }

  private markMigrationAsApplied(migration: Migration): void {
    const stmt = this.db.prepare(`
      INSERT INTO schema_migrations (version, applied_at, description, checksum)
      VALUES (?, ?, ?, ?)
    `);

    const checksum = this.calculateMigrationChecksum(migration);
    stmt.run(migration.version, Date.now(), migration.description, checksum);
  }

  private markMigrationAsRolledBack(version: string): void {
    const stmt = this.db.prepare('DELETE FROM schema_migrations WHERE version = ?');
    stmt.run(version);
  }

  private calculateMigrationChecksum(migration: Migration): string {
    // Simple checksum based on migration content
    const content = migration.version + migration.description + migration.up.toString();
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  async getMigrationStatus(): Promise<{
    appliedMigrations: string[];
    pendingMigrations: string[];
    totalMigrations: number;
  }> {
    const allMigrations = this.getMigrations().map(m => m.version);
    const appliedMigrations = this.getAppliedMigrations();
    const pendingMigrations = allMigrations.filter(v => !appliedMigrations.includes(v));

    return {
      appliedMigrations,
      pendingMigrations,
      totalMigrations: allMigrations.length
    };
  }

  async validateMigrationIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const appliedMigrations = this.getAppliedMigrations();
    const availableMigrations = this.getMigrations().map(m => m.version);

    // Check for applied migrations that no longer exist
    const orphanedMigrations = appliedMigrations.filter(v => !availableMigrations.includes(v));
    if (orphanedMigrations.length > 0) {
      issues.push(`Orphaned migrations found: ${orphanedMigrations.join(', ')}`);
    }

    // Check for gaps in migration sequence (if using sequential naming)
    const sortedApplied = appliedMigrations.sort();
    for (let i = 1; i < sortedApplied.length; i++) {
      const current = sortedApplied[i];
      const previous = sortedApplied[i - 1];
      
      // Check if there are missing migrations between applied ones
      const currentIndex = availableMigrations.indexOf(current);
      const previousIndex = availableMigrations.indexOf(previous);
      
      if (currentIndex - previousIndex > 1) {
        const missing = availableMigrations.slice(previousIndex + 1, currentIndex);
        issues.push(`Missing migrations between ${previous} and ${current}: ${missing.join(', ')}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  async repairMigrationState(): Promise<void> {
    const integrity = await this.validateMigrationIntegrity();
    
    if (!integrity.isValid) {
      console.log('Migration integrity issues detected, attempting repair...');
      
      // For now, just log the issues. In a production system, you might want to
      // implement specific repair strategies based on the type of issue.
      for (const issue of integrity.issues) {
        console.warn(`Migration issue: ${issue}`);
      }
      
      // Could implement automatic repairs here, such as:
      // - Removing orphaned migration records
      // - Running missing migrations
      // - Validating checksums and re-applying if necessary
    }
  }
}

// Utility function to run migrations
export async function runMigrations(dbManager: DatabaseManager): Promise<void> {
  const migrationManager = new MigrationManager(dbManager);
  await migrationManager.runMigrations();
}