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

/**
 * Calendar integration types (Session 2)
 */

/**
 * Calendar event with session configuration
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  sessionConfig: SessionConfig;
}

/**
 * Session configuration stored in calendar event metadata
 */
export interface SessionConfig {
  projectPath: string;
  projectName: string;
  phase: string;
  model: 'sonnet' | 'opus' | 'haiku';
  tokenBudget: number;
  tools: string[];
  objectives: string[];
}

/**
 * User scheduling preferences
 */
export interface SchedulePreferences {
  startDate?: Date;
  workingHours: {
    start: number;  // Hour (0-23), e.g., 9 for 9am
    end: number;    // Hour (0-23), e.g., 17 for 5pm
  };
  daysOfWeek: number[];  // 0=Sunday, 1=Monday, ..., 6=Saturday
  sessionLength: number; // Hours per session (max 5)
  timezone?: string;     // e.g., 'America/Los_Angeles'
}

/**
 * Time slot for scheduling
 */
export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * OAuth credentials structure
 */
export interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

/**
 * OAuth token storage
 */
export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

// ============================================
// Shell Automation Types (Session 2.5)
// ============================================

/**
 * Session handle returned by SessionLauncher
 */
export interface SessionHandle {
  pid: number;
  sessionId: string;
  eventId: string;
  projectPath: string;
  phase: string;
  startTime: Date;
  logFilePath: string;
}

/**
 * Session metrics tracked by LogMonitor
 */
export interface SessionMetrics {
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  estimatedCost: number;
  toolCalls: number;
  objectivesCompleted: string[];
  messageCount: number;
  startTime: Date;
  lastUpdate: Date;
}
