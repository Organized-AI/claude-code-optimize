/**
 * Database Module
 * SQLite database operations for storing project analyses
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { ProjectAnalysis, SessionPhase } from './types.js';

export class OptimizerDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/claude-optimizer.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initialize();
  }

  /**
   * Initialize database schema
   */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        complexity INTEGER NOT NULL,
        estimated_hours REAL NOT NULL,
        file_count INTEGER,
        size_kb INTEGER,
        has_tests BOOLEAN,
        has_docs BOOLEAN,
        analyzed_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS technologies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS session_phases (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        estimated_hours REAL NOT NULL,
        suggested_model TEXT NOT NULL,
        token_budget INTEGER,
        phase_order INTEGER,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS phase_objectives (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL,
        objective TEXT NOT NULL,
        order_index INTEGER,
        FOREIGN KEY(phase_id) REFERENCES session_phases(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS risk_factors (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        risk TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
      CREATE INDEX IF NOT EXISTS idx_technologies_project ON technologies(project_id);
      CREATE INDEX IF NOT EXISTS idx_phases_project ON session_phases(project_id);
    `);
  }

  /**
   * Save a complete project analysis to database
   */
  saveProjectAnalysis(analysis: ProjectAnalysis): string {
    const projectId = randomUUID();
    const now = Date.now();

    const transaction = this.db.transaction(() => {
      // Insert project
      this.db.prepare(`
        INSERT OR REPLACE INTO projects (
          id, path, name, complexity, estimated_hours,
          file_count, size_kb, has_tests, has_docs,
          analyzed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        analysis.projectPath,
        this.getProjectName(analysis.projectPath),
        analysis.complexity,
        analysis.estimatedHours,
        analysis.fileCount,
        analysis.totalSizeKB,
        analysis.hasTests ? 1 : 0,
        analysis.hasDocs ? 1 : 0,
        analysis.timestamp.getTime(),
        now
      );

      // Insert technologies
      const techStmt = this.db.prepare(`
        INSERT INTO technologies (id, project_id, name)
        VALUES (?, ?, ?)
      `);
      analysis.technologies.forEach(tech => {
        techStmt.run(randomUUID(), projectId, tech);
      });

      // Insert phases
      const phaseStmt = this.db.prepare(`
        INSERT INTO session_phases (
          id, project_id, name, description, estimated_hours,
          suggested_model, token_budget, phase_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      analysis.phases.forEach((phase, index) => {
        const phaseId = randomUUID();
        phaseStmt.run(
          phaseId,
          projectId,
          phase.name,
          phase.description,
          phase.estimatedHours,
          phase.suggestedModel,
          phase.tokenBudget,
          index
        );

        // Insert objectives for this phase
        const objStmt = this.db.prepare(`
          INSERT INTO phase_objectives (id, phase_id, objective, order_index)
          VALUES (?, ?, ?, ?)
        `);
        phase.objectives.forEach((objective, objIndex) => {
          objStmt.run(randomUUID(), phaseId, objective, objIndex);
        });
      });

      // Insert risk factors
      const riskStmt = this.db.prepare(`
        INSERT INTO risk_factors (id, project_id, risk)
        VALUES (?, ?, ?)
      `);
      analysis.riskFactors.forEach(risk => {
        riskStmt.run(randomUUID(), projectId, risk);
      });
    });

    transaction();
    return projectId;
  }

  /**
   * Get project analysis by path
   */
  getProject(projectPath: string): ProjectAnalysis | null {
    const project = this.db.prepare(`
      SELECT * FROM projects WHERE path = ?
    `).get(projectPath) as any;

    if (!project) return null;

    // Load technologies
    const technologies = this.db.prepare(`
      SELECT name FROM technologies WHERE project_id = ?
    `).all(project.id).map((row: any) => row.name);

    // Load phases
    const phases = this.db.prepare(`
      SELECT * FROM session_phases
      WHERE project_id = ?
      ORDER BY phase_order
    `).all(project.id) as any[];

    // Load objectives for each phase
    const phasesWithObjectives: SessionPhase[] = phases.map(phase => {
      const objectives = this.db.prepare(`
        SELECT objective FROM phase_objectives
        WHERE phase_id = ?
        ORDER BY order_index
      `).all(phase.id).map((row: any) => row.objective);

      return {
        name: phase.name,
        description: phase.description,
        estimatedHours: phase.estimated_hours,
        objectives,
        suggestedModel: phase.suggested_model as 'sonnet' | 'opus' | 'haiku',
        requiredTools: [], // Not stored in DB yet
        tokenBudget: phase.token_budget
      };
    });

    // Load risks
    const riskFactors = this.db.prepare(`
      SELECT risk FROM risk_factors WHERE project_id = ?
    `).all(project.id).map((row: any) => row.risk);

    return {
      projectPath: project.path,
      complexity: project.complexity,
      estimatedHours: project.estimated_hours,
      phases: phasesWithObjectives,
      technologies,
      fileCount: project.file_count,
      totalSizeKB: project.size_kb,
      hasTests: Boolean(project.has_tests),
      hasDocs: Boolean(project.has_docs),
      riskFactors,
      timestamp: new Date(project.analyzed_at)
    };
  }

  /**
   * List all analyzed projects
   */
  listProjects(): Array<{
    id: string;
    name: string;
    path: string;
    complexity: number;
    estimatedHours: number;
    analyzedAt: Date;
  }> {
    const projects = this.db.prepare(`
      SELECT id, name, path, complexity, estimated_hours, analyzed_at
      FROM projects
      ORDER BY analyzed_at DESC
    `).all() as any[];

    return projects.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      complexity: p.complexity,
      estimatedHours: p.estimated_hours,
      analyzedAt: new Date(p.analyzed_at)
    }));
  }

  /**
   * Delete project analysis
   */
  deleteProject(projectPath: string): boolean {
    const result = this.db.prepare(`
      DELETE FROM projects WHERE path = ?
    `).run(projectPath);

    return result.changes > 0;
  }

  /**
   * Extract project name from path
   */
  private getProjectName(projectPath: string): string {
    return path.basename(projectPath) || 'unknown';
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
