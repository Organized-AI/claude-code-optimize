import fs from 'fs';
import path from 'path';
import os from 'os';
import { SessionEstimate } from './token-estimator.js';

export interface VarianceData {
  sessionId: string;
  planFile: string;
  createdAt: string;
  completedAt?: string;
  estimated: {
    totalTokens: number;
    phases: Record<string, number>;
  };
  actual: {
    totalTokens: number;
    phases: Record<string, PhaseActual>;
  };
  variance: {
    total: number;
    totalPercent: number;
    byPhase: Record<string, VarianceDetail>;
  };
  deviations: Deviation[];
}

export interface PhaseActual {
  tokens: number;
  completedAt: string;
}

export interface VarianceDetail {
  estimated: number;
  actual: number;
  difference: number;
  percent: number;
}

export interface Deviation {
  phase: string;
  reason: string;
  impact: number; // tokens
}

export class VarianceTracker {
  private trackingDir: string;

  constructor() {
    this.trackingDir = path.join(os.homedir(), '.claude', 'session-tracking');
  }

  /**
   * Start tracking a new session
   */
  startTracking(sessionId: string, estimate: SessionEstimate): void {
    if (!fs.existsSync(this.trackingDir)) {
      fs.mkdirSync(this.trackingDir, { recursive: true });
    }

    const data: VarianceData = {
      sessionId,
      planFile: estimate.sessionFile,
      createdAt: new Date().toISOString(),
      estimated: {
        totalTokens: estimate.totalTokens.mid,
        phases: estimate.phases.reduce((acc, phase) => {
          acc[`phase-${phase.phaseNumber}`] = phase.estimatedTokens.mid;
          return acc;
        }, {} as Record<string, number>)
      },
      actual: {
        totalTokens: 0,
        phases: {}
      },
      variance: {
        total: 0,
        totalPercent: 0,
        byPhase: {}
      },
      deviations: []
    };

    const filePath = this.getFilePath(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Record actual tokens for a completed phase
   */
  recordPhaseComplete(sessionId: string, phaseId: string, actualTokens: number): void {
    const data = this.load(sessionId);
    if (!data) return;

    data.actual.phases[phaseId] = {
      tokens: actualTokens,
      completedAt: new Date().toISOString()
    };

    this.save(sessionId, data);
  }

  /**
   * Calculate variance for the session
   */
  calculateVariance(sessionId: string): VarianceData {
    const data = this.load(sessionId);
    if (!data) throw new Error(`No tracking data for session: ${sessionId}`);

    // Calculate total actual
    const totalActual = Object.values(data.actual.phases).reduce((sum, p) => sum + p.tokens, 0);
    data.actual.totalTokens = totalActual;

    // Calculate total variance
    const totalVariance = totalActual - data.estimated.totalTokens;
    const totalPercent = (totalVariance / data.estimated.totalTokens) * 100;

    data.variance.total = totalVariance;
    data.variance.totalPercent = totalPercent;

    // Calculate phase variances
    for (const [phaseId, estimated] of Object.entries(data.estimated.phases)) {
      const actual = data.actual.phases[phaseId]?.tokens || 0;
      const difference = actual - estimated;
      const percent = estimated > 0 ? (difference / estimated) * 100 : 0;

      data.variance.byPhase[phaseId] = {
        estimated,
        actual,
        difference,
        percent
      };
    }

    data.completedAt = new Date().toISOString();

    this.save(sessionId, data);
    return data;
  }

  /**
   * Identify significant deviations
   */
  identifyDeviations(variance: VarianceData): Deviation[] {
    const deviations: Deviation[] = [];

    for (const [phaseId, detail] of Object.entries(variance.variance.byPhase)) {
      if (Math.abs(detail.percent) > 20) {
        const reason = detail.percent > 0 ? 'Underestimated complexity' : 'Overestimated difficulty';
        deviations.push({
          phase: phaseId,
          reason,
          impact: detail.difference
        });
      }
    }

    return deviations;
  }

  /**
   * Load tracking data
   */
  private load(sessionId: string): VarianceData | null {
    const filePath = this.getFilePath(sessionId);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading variance data for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Save tracking data
   */
  private save(sessionId: string, data: VarianceData): void {
    const filePath = this.getFilePath(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Get file path for session tracking data
   */
  private getFilePath(sessionId: string): string {
    return path.join(this.trackingDir, `${sessionId}.json`);
  }
}
