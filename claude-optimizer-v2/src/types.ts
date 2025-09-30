/**
 * Core type definitions for Claude Code Optimizer v2.0
 */

/**
 * Project metadata gathered from file system scan
 */
export interface ProjectMetadata {
  fileCount: number;
  totalSizeKB: number;
  languages: string[];
  technologies: string[];
  keyFiles: string[];
  hasTests: boolean;
  hasDocs: boolean;
  directories: string[];
}

/**
 * Complete project analysis result
 */
export interface ProjectAnalysis {
  projectPath: string;
  complexity: number;        // 1-10 scale
  estimatedHours: number;    // Total development time
  phases: SessionPhase[];    // Breakdown by phase
  technologies: string[];    // Detected tech stack
  fileCount: number;
  totalSizeKB: number;
  hasTests: boolean;
  hasDocs: boolean;
  riskFactors: string[];     // Potential challenges
  timestamp: Date;
}

/**
 * Individual session phase definition
 */
export interface SessionPhase {
  name: string;              // e.g., "Planning & Setup"
  description: string;       // What happens in this phase
  estimatedHours: number;    // Time allocation
  objectives: string[];      // Key deliverables
  suggestedModel: 'sonnet' | 'opus' | 'haiku';
  requiredTools: string[];   // ['Edit', 'Bash', 'Read']
  tokenBudget: number;       // Estimated tokens needed
}

/**
 * AI analysis response from Claude
 */
export interface AIAnalysisResult {
  complexity: number;
  estimatedHours: number;
  reasoning: string;
  suggestedPhases: Array<{
    name: string;
    percentage: number;
  }>;
  risks: string[];
  technologies: string[];
}

/**
 * Language detection mapping
 */
export interface LanguageMap {
  [extension: string]: string;
}

/**
 * Database row types
 */
export interface ProjectRow {
  id: string;
  path: string;
  name: string;
  complexity: number;
  estimated_hours: number;
  file_count: number;
  size_kb: number;
  has_tests: number;  // SQLite boolean (0/1)
  has_docs: number;   // SQLite boolean (0/1)
  analyzed_at: number; // Unix timestamp
  created_at: number;  // Unix timestamp
}

export interface PhaseRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  estimated_hours: number;
  suggested_model: string;
  token_budget: number;
  phase_order: number;
}

export interface ObjectiveRow {
  id: string;
  phase_id: string;
  objective: string;
  order_index: number;
}
