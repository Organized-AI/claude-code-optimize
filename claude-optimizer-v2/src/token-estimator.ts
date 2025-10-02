import { SessionPlan, SessionPhase } from './session-plan-parser.js';

/**
 * Task-based baseline estimates for different types of coding work
 */
export interface TaskEstimate {
  taskType: 'planning' | 'implementation' | 'refactoring' | 'testing' | 'debugging' | 'polish';
  baseTokens: number;
  tokensPerHour: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

/**
 * Task baseline estimates - empirically derived from Session 1-5
 */
export const TASK_ESTIMATES: Record<string, TaskEstimate> = {
  planning: {
    taskType: 'planning',
    baseTokens: 15000,
    tokensPerHour: 20000,    // Mostly reading, some writing
    confidenceLevel: 'high'   // Predictable
  },
  implementation: {
    taskType: 'implementation',
    baseTokens: 25000,
    tokensPerHour: 45000,    // Heavy reading + writing
    confidenceLevel: 'medium' // Variable
  },
  refactoring: {
    taskType: 'refactoring',
    baseTokens: 30000,
    tokensPerHour: 55000,    // Lots of edits
    confidenceLevel: 'medium'
  },
  testing: {
    taskType: 'testing',
    baseTokens: 18000,
    tokensPerHour: 30000,    // Write tests + run commands
    confidenceLevel: 'high'
  },
  debugging: {
    taskType: 'debugging',
    baseTokens: 20000,
    tokensPerHour: 35000,    // Highly variable
    confidenceLevel: 'low'    // Unpredictable
  },
  polish: {
    taskType: 'polish',
    baseTokens: 12000,
    tokensPerHour: 20000,    // Cleanup + docs
    confidenceLevel: 'high'
  }
};

/**
 * Complexity multipliers that adjust base estimates
 */
export const COMPLEXITY_FACTORS = {
  projectSize: {
    small: 0.8,       // <5k LOC
    medium: 1.0,      // 5-20k LOC
    large: 1.3,       // 20-50k LOC
    enterprise: 1.6   // 50k+ LOC
  },
  techStack: {
    familiar: 0.9,    // You know it well
    learning: 1.2,    // Some experience
    new: 1.5          // First time
  },
  codeQuality: {
    clean: 0.9,       // Well-structured
    mixed: 1.0,       // Average
    legacy: 1.4       // Messy/undocumented
  }
};

/**
 * Phase-level estimate with token and time predictions
 */
export interface PhaseEstimate {
  phaseNumber: number;
  phaseName: string;
  taskType: string;
  estimatedTokens: {
    low: number;
    mid: number;
    high: number;
  };
  estimatedHours: {
    low: number;
    mid: number;
    high: number;
  };
  confidenceLevel: 'low' | 'medium' | 'high';
}

/**
 * Complete session estimate with totals and phase breakdown
 */
export interface SessionEstimate {
  sessionId: string;
  sessionFile: string;
  totalTokens: {
    low: number;
    mid: number;
    high: number;
  };
  totalHours: {
    low: number;
    mid: number;
    high: number;
  };
  confidenceLevel: 'low' | 'medium' | 'high';
  complexityFactors: {
    projectSize: number;
    techStack: number;
    codeQuality: number;
    overall: number;
  };
  phases: PhaseEstimate[];
  quotaCheck: {
    fitsProQuota: boolean;
    percentageOfQuota: number;
    recommendedBuffer: number;
  };
}

/**
 * Variance calculation result
 */
export interface Variance {
  estimated: number;
  actual: number;
  difference: number;
  percentDifference: number;
  rating: 'excellent' | 'very-good' | 'good' | 'fair' | 'poor';
}

/**
 * Token Estimator - Predicts token usage for planned sessions
 */
export class TokenEstimator {
  constructor() {
    // ML model path managed by MLModelStorage
  }

  /**
   * Estimate tokens for a complete session plan
   */
  estimateSession(sessionPlan: SessionPlan): SessionEstimate {
    const phases: PhaseEstimate[] = sessionPlan.phases.map((phase, index) =>
      this.estimatePhase(phase, index + 1)
    );

    // Sum up phase estimates
    const totalLow = phases.reduce((sum, p) => sum + p.estimatedTokens.low, 0);
    const totalMid = phases.reduce((sum, p) => sum + p.estimatedTokens.mid, 0);
    const totalHigh = phases.reduce((sum, p) => sum + p.estimatedTokens.high, 0);

    const totalHoursLow = phases.reduce((sum, p) => sum + p.estimatedHours.low, 0);
    const totalHoursMid = phases.reduce((sum, p) => sum + p.estimatedHours.mid, 0);
    const totalHoursHigh = phases.reduce((sum, p) => sum + p.estimatedHours.high, 0);

    // Determine overall confidence (lowest among phases)
    const confidenceLevels = phases.map(p => p.confidenceLevel);
    const overallConfidence = this.getLowestConfidence(confidenceLevels);

    // Detect complexity factors
    const complexityFactors = this.detectComplexityFactors(sessionPlan);

    // Quota check (Pro = 200k tokens)
    const proQuota = 200000;
    const percentageOfQuota = (totalMid / proQuota) * 100;
    const recommendedBuffer = Math.ceil(totalHigh * 1.15);

    return {
      sessionId: sessionPlan.sessionId,
      sessionFile: sessionPlan.filePath,
      totalTokens: {
        low: Math.floor(totalLow),
        mid: Math.floor(totalMid),
        high: Math.floor(totalHigh)
      },
      totalHours: {
        low: Number(totalHoursLow.toFixed(1)),
        mid: Number(totalHoursMid.toFixed(1)),
        high: Number(totalHoursHigh.toFixed(1))
      },
      confidenceLevel: overallConfidence,
      complexityFactors,
      phases,
      quotaCheck: {
        fitsProQuota: recommendedBuffer < proQuota,
        percentageOfQuota: Number(percentageOfQuota.toFixed(1)),
        recommendedBuffer
      }
    };
  }

  /**
   * Estimate tokens for a single phase
   */
  private estimatePhase(phase: SessionPhase, phaseNumber: number): PhaseEstimate {
    // Detect task type from phase description
    const taskType = this.detectTaskType(phase);
    const taskEstimate = TASK_ESTIMATES[taskType] || TASK_ESTIMATES.implementation;

    // Use provided hours or derive from description
    const hours = phase.estimatedHours || this.estimateHoursFromDescription(phase.description);

    // Calculate token estimate
    const baseTokens = hours * taskEstimate.tokensPerHour;

    // Add 10% variance for low/high
    const lowTokens = baseTokens * 0.9;
    const highTokens = baseTokens * 1.1;

    // Convert hours to range
    const lowHours = hours * 0.9;
    const highHours = hours * 1.1;

    return {
      phaseNumber,
      phaseName: phase.name,
      taskType,
      estimatedTokens: {
        low: Math.floor(lowTokens),
        mid: Math.floor(baseTokens),
        high: Math.floor(highTokens)
      },
      estimatedHours: {
        low: Number(lowHours.toFixed(1)),
        mid: Number(hours.toFixed(1)),
        high: Number(highHours.toFixed(1))
      },
      confidenceLevel: taskEstimate.confidenceLevel
    };
  }

  /**
   * Detect task type from phase information
   */
  private detectTaskType(phase: SessionPhase): string {
    const desc = phase.description.toLowerCase();
    const name = phase.name.toLowerCase();
    const combined = desc + ' ' + name;

    if (combined.includes('test') || combined.includes('testing')) {
      return 'testing';
    }
    if (combined.includes('debug') || combined.includes('fix') || combined.includes('bug')) {
      return 'debugging';
    }
    if (combined.includes('refactor') || combined.includes('cleanup') || combined.includes('reorganize')) {
      return 'refactoring';
    }
    if (combined.includes('polish') || combined.includes('documentation') || combined.includes('docs')) {
      return 'polish';
    }
    if (combined.includes('plan') || combined.includes('design') || combined.includes('research')) {
      return 'planning';
    }

    // Default to implementation
    return 'implementation';
  }

  /**
   * Estimate hours from phase description (fallback)
   */
  private estimateHoursFromDescription(description: string): number {
    // Try to extract from patterns like "45 min" or "1.5 hours"
    const minMatch = description.match(/(\d+)\s*min/i);
    if (minMatch) {
      return Number(minMatch[1]) / 60;
    }

    const hourMatch = description.match(/(\d+(?:\.\d+)?)\s*h(?:our)?s?/i);
    if (hourMatch) {
      return Number(hourMatch[1]);
    }

    // Default estimate based on description length
    if (description.length < 100) return 0.5;
    if (description.length < 300) return 1.0;
    return 1.5;
  }

  /**
   * Detect complexity factors from session plan
   */
  private detectComplexityFactors(sessionPlan: SessionPlan): {
    projectSize: number;
    techStack: number;
    codeQuality: number;
    overall: number;
  } {
    // Default to medium/familiar/clean
    let projectSize = COMPLEXITY_FACTORS.projectSize.medium;
    let techStack = COMPLEXITY_FACTORS.techStack.familiar;
    let codeQuality = COMPLEXITY_FACTORS.codeQuality.clean;

    // Analyze prerequisites and objectives for hints
    const allText = (sessionPlan.objectives.join(' ') +
                     sessionPlan.prerequisites.join(' ')).toLowerCase();

    // Project size detection
    if (allText.includes('large') || allText.includes('enterprise')) {
      projectSize = COMPLEXITY_FACTORS.projectSize.large;
    } else if (allText.includes('small') || allText.includes('prototype')) {
      projectSize = COMPLEXITY_FACTORS.projectSize.small;
    }

    // Tech stack detection
    if (allText.includes('new') || allText.includes('learning') || allText.includes('unfamiliar')) {
      techStack = COMPLEXITY_FACTORS.techStack.new;
    } else if (allText.includes('typescript') || allText.includes('node') || allText.includes('react')) {
      techStack = COMPLEXITY_FACTORS.techStack.familiar;
    }

    // Code quality detection
    if (allText.includes('legacy') || allText.includes('messy') || allText.includes('undocumented')) {
      codeQuality = COMPLEXITY_FACTORS.codeQuality.legacy;
    } else if (allText.includes('clean') || allText.includes('well-structured')) {
      codeQuality = COMPLEXITY_FACTORS.codeQuality.clean;
    }

    const overall = projectSize * techStack * codeQuality;

    return { projectSize, techStack, codeQuality, overall };
  }

  /**
   * Get lowest confidence level from array
   */
  private getLowestConfidence(levels: ('low' | 'medium' | 'high')[]): 'low' | 'medium' | 'high' {
    if (levels.includes('low')) return 'low';
    if (levels.includes('medium')) return 'medium';
    return 'high';
  }

  /**
   * Calculate variance between estimated and actual
   */
  calculateVariance(estimated: number, actual: number): Variance {
    const difference = actual - estimated;
    const percentDifference = (difference / estimated) * 100;

    let rating: 'excellent' | 'very-good' | 'good' | 'fair' | 'poor';
    const absPercent = Math.abs(percentDifference);

    if (absPercent < 5) rating = 'excellent';
    else if (absPercent < 10) rating = 'very-good';
    else if (absPercent < 20) rating = 'good';
    else if (absPercent < 30) rating = 'fair';
    else rating = 'poor';

    return {
      estimated,
      actual,
      difference,
      percentDifference,
      rating
    };
  }

  /**
   * Track actual usage for a session (for ML learning)
   */
  trackActualUsage(sessionId: string, actualTokens: number): void {
    // This would integrate with the ML model storage
    // For now, just log it
    console.log(`Tracked ${actualTokens} tokens for session ${sessionId}`);
  }
}
