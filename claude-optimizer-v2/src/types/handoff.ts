/**
 * Session Handoff Types
 * Structures for preserving perfect context between sessions
 */

export interface SessionHandoff {
  // Metadata
  fromSessionId: string;
  toSessionId?: string;        // Generated at launch
  createdAt: string;            // ISO timestamp
  scheduledFor?: string;        // ISO timestamp

  // Session config
  projectPath: string;
  projectName: string;
  agent?: string;               // Agent file path (e.g., ".claude/agents/implementation.md")
  model?: string;               // Preferred model (sonnet/opus)

  // What was accomplished
  accomplishments: string[];    // List of completed objectives
  currentState: {
    branch?: string;
    lastCommit?: string;
    testsStatus?: string;       // e.g., "15/15 passing"
    filesModified?: string[];
  };

  // Next session objectives
  nextObjectives: SessionObjective[];
  estimatedTokens: number;

  // Context and decisions
  keyDecisions: string[];       // Important decisions made
  blockers: string[];           // Any blockers or issues
  notes: string;                // Additional context

  // Files to read first
  filesToRead?: string[];

  // Commands to run on start
  startupCommands?: string[];

  // Agent instructions (optional override)
  agentInstructions?: string;
}

export interface SessionObjective {
  description: string;
  estimatedTokens?: number;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];      // IDs of other objectives
}

export interface HandoffMetadata {
  id: string;
  projectPath: string;
  projectName: string;
  createdAt: Date;
  scheduledFor?: Date;
  status: 'pending' | 'launched' | 'completed' | 'cancelled';
  estimatedTokens: number;
}
