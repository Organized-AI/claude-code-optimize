import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * ML Model - Stores learned estimation patterns
 */
export interface MLModel {
  version: string;
  lastUpdated: string;
  sessionsAnalyzed: number;
  overallAccuracy: number;
  taskTypeAccuracy: Record<string, TaskTypeAccuracy>;
  userProfile: UserProfile;
  libraryKnowledge: Record<string, LibraryKnowledge>;
}

export interface TaskTypeAccuracy {
  accuracy: number;
  avgVariance: number;
  sessionsCount: number;
}

export interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  specialties: string[];
  avgBurnRate: number; // tokens per minute
  learningCurve: number; // improvement rate
}

export interface LibraryKnowledge {
  sessionsUsed: number;
  avgIntegrationCost: number;
  variance: number;
}

/**
 * ML Model Storage - Persists and updates the learning model
 */
export class MLModelStorage {
  private modelPath: string;
  private modelDir: string;

  constructor() {
    this.modelDir = path.join(os.homedir(), '.claude', 'ml-model');
    this.modelPath = path.join(this.modelDir, 'estimation-model.json');
  }

  /**
   * Load the ML model (or create default)
   */
  load(): MLModel {
    // Ensure directory exists
    if (!fs.existsSync(this.modelDir)) {
      fs.mkdirSync(this.modelDir, { recursive: true });
    }

    // Load existing model or create default
    if (fs.existsSync(this.modelPath)) {
      try {
        const content = fs.readFileSync(this.modelPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('Error loading ML model, using default:', error);
        return this.createDefaultModel();
      }
    }

    return this.createDefaultModel();
  }

  /**
   * Save the ML model
   */
  save(model: MLModel): void {
    model.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    if (!fs.existsSync(this.modelDir)) {
      fs.mkdirSync(this.modelDir, { recursive: true });
    }

    fs.writeFileSync(this.modelPath, JSON.stringify(model, null, 2));
  }

  /**
   * Update model with new session data
   */
  updateWithSession(_sessionId: string, taskType: string, estimated: number, actual: number): void {
    const model = this.load();

    // Update sessions analyzed
    model.sessionsAnalyzed++;

    // Calculate variance for this session
    const variance = Math.abs((actual - estimated) / estimated);
    const accuracy = 1 - Math.min(variance, 1);

    // Update task type accuracy
    if (!model.taskTypeAccuracy[taskType]) {
      model.taskTypeAccuracy[taskType] = {
        accuracy: 0,
        avgVariance: 0,
        sessionsCount: 0
      };
    }

    const taskAcc = model.taskTypeAccuracy[taskType];
    const newCount = taskAcc.sessionsCount + 1;

    // Running average
    taskAcc.accuracy = ((taskAcc.accuracy * taskAcc.sessionsCount) + accuracy) / newCount;
    taskAcc.avgVariance = ((taskAcc.avgVariance * taskAcc.sessionsCount) + variance) / newCount;
    taskAcc.sessionsCount = newCount;

    // Update overall accuracy
    const allAccuracies = Object.values(model.taskTypeAccuracy).map(t => t.accuracy);
    model.overallAccuracy = allAccuracies.reduce((sum, acc) => sum + acc, 0) / allAccuracies.length;

    // Update user burn rate
    // Assuming session took typical hours, calculate tokens/min
    // This is a simplified calculation
    const estimatedHours = estimated / 45000; // Rough estimate based on implementation rate
    const estimatedMinutes = estimatedHours * 60;
    const burnRate = actual / estimatedMinutes;

    const profileBurnCount = model.userProfile.avgBurnRate === 0 ? 0 : model.sessionsAnalyzed - 1;
    model.userProfile.avgBurnRate = ((model.userProfile.avgBurnRate * profileBurnCount) + burnRate) /
                                    (profileBurnCount + 1);

    // Save updated model
    this.save(model);
  }

  /**
   * Get accuracy for a specific task type
   */
  getTaskTypeAccuracy(taskType: string): number {
    const model = this.load();
    return model.taskTypeAccuracy[taskType]?.accuracy || 0.75; // Default 75%
  }

  /**
   * Create default model
   */
  private createDefaultModel(): MLModel {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      sessionsAnalyzed: 0,
      overallAccuracy: 0.75, // Start with 75% baseline

      taskTypeAccuracy: {
        planning: { accuracy: 0.85, avgVariance: 0.15, sessionsCount: 0 },
        implementation: { accuracy: 0.70, avgVariance: 0.30, sessionsCount: 0 },
        refactoring: { accuracy: 0.65, avgVariance: 0.35, sessionsCount: 0 },
        testing: { accuracy: 0.80, avgVariance: 0.20, sessionsCount: 0 },
        debugging: { accuracy: 0.60, avgVariance: 0.40, sessionsCount: 0 },
        polish: { accuracy: 0.85, avgVariance: 0.15, sessionsCount: 0 }
      },

      userProfile: {
        experienceLevel: 'intermediate',
        specialties: ['typescript', 'nodejs', 'react'],
        avgBurnRate: 580, // tokens per minute (starting estimate)
        learningCurve: 0.05 // 5% improvement per session
      },

      libraryKnowledge: {}
    };
  }
}
