import fs from 'fs';
import path from 'path';

/**
 * Represents a complete session plan parsed from markdown
 */
export interface SessionPlan {
  sessionId: string;
  filePath: string;
  title: string;
  status?: string;
  estimatedTime?: string;
  estimatedTokens?: string;
  phases: SessionPhase[];
  prerequisites: string[];
  objectives: string[];
}

/**
 * Represents a single phase within a session plan
 */
export interface SessionPhase {
  number: number;
  name: string;
  description: string;
  estimatedHours?: number;
  estimatedTokens?: number;
  taskType?: string;
  objectives: string[];
}

/**
 * Session Plan Parser - Extracts structured data from SESSION_N_PLAN.md files
 */
export class SessionPlanParser {
  /**
   * Parse a session plan markdown file
   */
  parseFile(filePath: string): SessionPlan {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session plan file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath, '.md');

    // Extract session ID from filename (e.g., SESSION_5_PLAN -> session-5)
    const sessionId = filename.toLowerCase().replace(/_/g, '-');

    // Parse markdown sections
    const title = this.extractTitle(content);
    const status = this.extractStatus(content);
    const estimatedTime = this.extractEstimatedTime(content);
    const estimatedTokens = this.extractEstimatedTokens(content);
    const phases = this.extractPhases(content);
    const prerequisites = this.extractPrerequisites(content);
    const objectives = this.extractObjectives(content);

    return {
      sessionId,
      filePath,
      title,
      status,
      estimatedTime,
      estimatedTokens,
      phases,
      prerequisites,
      objectives
    };
  }

  /**
   * Extract title from first heading
   */
  private extractTitle(markdown: string): string {
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : 'Untitled Session';
  }

  /**
   * Extract status from frontmatter
   */
  private extractStatus(markdown: string): string | undefined {
    const statusMatch = markdown.match(/\*\*Status\*\*:\s*(.+)$/m);
    return statusMatch ? statusMatch[1].trim() : undefined;
  }

  /**
   * Extract estimated time
   */
  private extractEstimatedTime(markdown: string): string | undefined {
    const timeMatch = markdown.match(/\*\*Estimated Time\*\*:\s*(.+)$/m);
    return timeMatch ? timeMatch[1].trim() : undefined;
  }

  /**
   * Extract estimated tokens
   */
  private extractEstimatedTokens(markdown: string): string | undefined {
    const tokensMatch = markdown.match(/\*\*Estimated Tokens\*\*:\s*(.+)$/m);
    return tokensMatch ? tokensMatch[1].trim() : undefined;
  }

  /**
   * Extract all phases from Phase Breakdown section
   */
  extractPhases(markdown: string): SessionPhase[] {
    const phases: SessionPhase[] = [];

    // Find Phase Breakdown section
    const phaseSection = this.extractSection(markdown, 'Phase Breakdown') ||
                         this.extractSection(markdown, 'Token Estimation Breakdown') ||
                         markdown;

    // Match phase headers like "### Phase 1: Name (duration, tokens)"
    const phaseRegex = /###\s+Phase\s+(\d+):\s+([^(]+?)(?:\s*\(([^)]+)\))?$/gim;
    let match;

    while ((match = phaseRegex.exec(phaseSection)) !== null) {
      const phaseNumber = parseInt(match[1]);
      const phaseName = match[2].trim();
      const metaInfo = match[3] || '';

      // Extract hours and tokens from meta info
      const hours = this.extractHoursFromString(metaInfo);
      const tokens = this.extractTokensFromString(metaInfo);

      // Get phase description (text until next phase or section)
      const startIndex = match.index + match[0].length;
      const nextPhaseIndex = phaseSection.indexOf('### Phase ' + (phaseNumber + 1), startIndex);
      const endIndex = nextPhaseIndex > 0 ? nextPhaseIndex : phaseSection.length;
      const phaseContent = phaseSection.substring(startIndex, endIndex);

      const description = this.extractPhaseDescription(phaseContent);
      const objectives = this.extractPhaseObjectives(phaseContent);

      phases.push({
        number: phaseNumber,
        name: phaseName,
        description,
        estimatedHours: hours,
        estimatedTokens: tokens,
        objectives
      });
    }

    return phases;
  }

  /**
   * Extract prerequisites from Prerequisites section
   */
  extractPrerequisites(markdown: string): string[] {
    const section = this.extractSection(markdown, 'Prerequisites') ||
                    this.extractSection(markdown, 'Before Starting');

    if (!section) return [];

    return this.extractBulletPoints(section);
  }

  /**
   * Extract objectives from Objectives or Primary Goals section
   */
  extractObjectives(markdown: string): string[] {
    const section = this.extractSection(markdown, 'Session Objectives') ||
                    this.extractSection(markdown, 'Primary Goals') ||
                    this.extractSection(markdown, 'Objectives');

    if (!section) return [];

    return this.extractBulletPoints(section);
  }

  /**
   * Extract a section by heading
   */
  private extractSection(markdown: string, heading: string): string | null {
    // Find section with this heading
    const headingRegex = new RegExp(`###+\\s+${heading}\\s*$`, 'im');
    const match = markdown.match(headingRegex);

    if (!match) return null;

    const startIndex = match.index! + match[0].length;

    // Find next heading of same or higher level
    const nextHeadingRegex = /^###+\s+/gm;
    nextHeadingRegex.lastIndex = startIndex;
    const nextMatch = nextHeadingRegex.exec(markdown);

    const endIndex = nextMatch ? nextMatch.index : markdown.length;
    return markdown.substring(startIndex, endIndex).trim();
  }

  /**
   * Extract bullet points from markdown section
   */
  private extractBulletPoints(section: string): string[] {
    const points: string[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered lists (1., 2., etc) or bullet points (-, *, +)
      const bulletMatch = trimmed.match(/^(?:\d+\.|[-*+])\s+(.+)$/);
      if (bulletMatch) {
        // Remove checkbox markers like ✅ or ❌
        const text = bulletMatch[1].replace(/^[✅❌]\s*/, '').trim();
        if (text) {
          points.push(text);
        }
      }
    }

    return points;
  }

  /**
   * Extract phase description (first paragraph after heading)
   */
  private extractPhaseDescription(phaseContent: string): string {
    const lines = phaseContent.trim().split('\n').filter(l => l.trim());

    // Look for description before code blocks or lists
    const descLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```') || trimmed.startsWith('-') ||
          trimmed.startsWith('*') || trimmed.startsWith('##')) {
        break;
      }
      if (trimmed && !trimmed.startsWith('**')) {
        descLines.push(trimmed);
      }
    }

    return descLines.join(' ').substring(0, 500); // Limit to 500 chars
  }

  /**
   * Extract objectives specific to this phase
   */
  private extractPhaseObjectives(phaseContent: string): string[] {
    return this.extractBulletPoints(phaseContent).slice(0, 5); // Max 5 objectives per phase
  }

  /**
   * Extract hours from string like "60 min" or "1.5 hours"
   */
  private extractHoursFromString(text: string): number | undefined {
    const minMatch = text.match(/(\d+)\s*min/i);
    if (minMatch) {
      return Number(minMatch[1]) / 60;
    }

    const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h(?:our)?s?/i);
    if (hourMatch) {
      return Number(hourMatch[1]);
    }

    return undefined;
  }

  /**
   * Extract tokens from string like "25,000 - 30,000 tokens"
   */
  private extractTokensFromString(text: string): number | undefined {
    const tokensMatch = text.match(/([\d,]+)\s*-\s*([\d,]+)\s*tokens?/i);
    if (tokensMatch) {
      const low = parseInt(tokensMatch[1].replace(/,/g, ''));
      const high = parseInt(tokensMatch[2].replace(/,/g, ''));
      return Math.floor((low + high) / 2); // Return midpoint
    }

    const singleMatch = text.match(/([\d,]+)\s*tokens?/i);
    if (singleMatch) {
      return parseInt(singleMatch[1].replace(/,/g, ''));
    }

    return undefined;
  }

  /**
   * Detect task type from phase description
   */
  detectTaskType(phaseDescription: string): string {
    const desc = phaseDescription.toLowerCase();

    if (desc.includes('test') || desc.includes('testing')) {
      return 'testing';
    }
    if (desc.includes('debug') || desc.includes('fix') || desc.includes('bug')) {
      return 'debugging';
    }
    if (desc.includes('refactor') || desc.includes('cleanup')) {
      return 'refactoring';
    }
    if (desc.includes('polish') || desc.includes('documentation')) {
      return 'polish';
    }
    if (desc.includes('plan') || desc.includes('design') || desc.includes('research')) {
      return 'planning';
    }

    return 'implementation';
  }

  /**
   * Find SESSION plan file by name or number
   * @param identifier - e.g., "SESSION_10_PLAN", "10", or "SESSION_10"
   */
  async findPlan(identifier: string): Promise<string> {
    const planDir = path.join(process.cwd(), 'docs', 'planning');

    // Normalize identifier to plan file name
    const planFile = this.normalizePlanName(identifier);
    const planPath = path.join(planDir, planFile);

    if (!fs.existsSync(planPath)) {
      throw new Error(
        `Session plan not found: ${planFile}\n` +
        `Searched in: ${planDir}\n` +
        `Try: SESSION_10_PLAN, 10, or check docs/planning/`
      );
    }

    return planPath;
  }

  /**
   * Parse SESSION plan file (async wrapper for parseFile)
   */
  async parsePlan(planPath: string): Promise<SessionPlan> {
    return this.parseFile(planPath);
  }

  /**
   * Build Claude Code prompt from session plan
   */
  buildPrompt(plan: SessionPlan): string {
    const lines: string[] = [
      `# ${plan.title}`,
      ''
    ];

    if (plan.status) {
      lines.push(`**Status**: ${plan.status}`);
    }
    if (plan.estimatedTime) {
      lines.push(`**Estimated Time**: ${plan.estimatedTime}`);
    }
    if (plan.estimatedTokens) {
      lines.push(`**Token Budget**: ${plan.estimatedTokens}`);
    }
    lines.push('');

    if (plan.prerequisites.length > 0) {
      lines.push('## Prerequisites');
      plan.prerequisites.forEach(prereq => {
        lines.push(`- ${prereq}`);
      });
      lines.push('');
    }

    if (plan.objectives.length > 0) {
      lines.push('## Session Objectives');
      plan.objectives.forEach((obj, i) => {
        lines.push(`${i + 1}. ${obj}`);
      });
      lines.push('');
    }

    if (plan.phases.length > 0) {
      lines.push('## Phases');
      plan.phases.forEach(phase => {
        lines.push(`### Phase ${phase.number}: ${phase.name}`);
        if (phase.description) {
          lines.push(phase.description);
          lines.push('');
        }
        if (phase.objectives.length > 0) {
          lines.push('**Objectives**:');
          phase.objectives.forEach(obj => {
            lines.push(`- ${obj}`);
          });
          lines.push('');
        }
      });
    }

    lines.push('---');
    lines.push('');
    lines.push('**Instructions**: Follow the phases above to complete this session. Mark objectives complete as you finish them.');

    return lines.join('\n');
  }

  /**
   * List all available SESSION plans
   */
  async listPlans(): Promise<string[]> {
    const planDir = path.join(process.cwd(), 'docs', 'planning');

    if (!fs.existsSync(planDir)) {
      return [];
    }

    const files = fs.readdirSync(planDir);
    return files
      .filter(f => f.match(/^SESSION_\d+[A-Z]?.*_PLAN\.md$/))
      .sort();
  }

  /**
   * Normalize plan name to filename
   * "10" -> "SESSION_10_PLAN.md"
   * "SESSION_10" -> "SESSION_10_PLAN.md"
   * "SESSION_10_PLAN" -> "SESSION_10_PLAN.md"
   */
  private normalizePlanName(identifier: string): string {
    // Remove .md extension if present
    identifier = identifier.replace(/\.md$/, '');

    // If just a number, add prefix and suffix
    if (/^\d+[A-Z]?$/.test(identifier)) {
      return `SESSION_${identifier}_PLAN.md`;
    }

    // If has SESSION_ prefix but no _PLAN suffix
    if (identifier.startsWith('SESSION_') && !identifier.endsWith('_PLAN')) {
      return `${identifier}_PLAN.md`;
    }

    // If already has both prefix and suffix
    if (identifier.startsWith('SESSION_') && identifier.endsWith('_PLAN')) {
      return `${identifier}.md`;
    }

    // Default: assume it's a complete name
    return `${identifier}.md`;
  }
}
