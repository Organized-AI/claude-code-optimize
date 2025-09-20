import { SessionTemplate, SessionPhase, Session } from '../../shared/types/index.js';
import { ExtendedSessionManager } from './ExtendedSessionManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionTemplatesService {
  private templates: Map<string, SessionTemplate> = new Map();
  private sessionManager: ExtendedSessionManager;
  private wsManager: WebSocketManager;
  
  constructor(sessionManager: ExtendedSessionManager, wsManager: WebSocketManager) {
    this.sessionManager = sessionManager;
    this.wsManager = wsManager;
    this.initializeDefaultTemplates();
  }
  
  private initializeDefaultTemplates() {
    // Heavy Refactoring Template
    this.templates.set('heavy_refactoring', {
      id: 'heavy_refactoring',
      name: 'Heavy Refactoring',
      type: 'heavy_refactoring',
      tokenBudget: 150000,
      estimatedDuration: 4 * 60 * 60 * 1000, // 4 hours
      phases: [
        {
          id: 'analysis',
          name: 'Code Analysis & Planning',
          order: 1,
          estimatedTokens: 30000,
          estimatedDuration: 45 * 60 * 1000,
          goals: [
            'Analyze existing codebase structure',
            'Identify refactoring opportunities',
            'Create refactoring plan'
          ],
          checkpoints: [
            'Codebase analysis complete',
            'Refactoring targets identified',
            'Impact assessment done'
          ]
        },
        {
          id: 'implementation',
          name: 'Refactoring Implementation',
          order: 2,
          estimatedTokens: 80000,
          estimatedDuration: 2 * 60 * 60 * 1000,
          goals: [
            'Execute refactoring plan',
            'Maintain functionality',
            'Improve code quality'
          ],
          checkpoints: [
            'Core refactoring complete',
            'Tests passing',
            'Code review ready'
          ]
        },
        {
          id: 'testing',
          name: 'Testing & Validation',
          order: 3,
          estimatedTokens: 40000,
          estimatedDuration: 75 * 60 * 1000,
          goals: [
            'Ensure no regressions',
            'Validate improvements',
            'Update documentation'
          ],
          checkpoints: [
            'All tests passing',
            'Performance validated',
            'Documentation updated'
          ]
        }
      ],
      customizable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Feature Development Template
    this.templates.set('feature_development', {
      id: 'feature_development',
      name: 'Feature Development',
      type: 'feature_development',
      tokenBudget: 100000,
      estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
      phases: [
        {
          id: 'design',
          name: 'Feature Design',
          order: 1,
          estimatedTokens: 20000,
          estimatedDuration: 30 * 60 * 1000,
          goals: [
            'Define feature requirements',
            'Design architecture',
            'Plan implementation'
          ],
          checkpoints: [
            'Requirements documented',
            'Design approved',
            'Technical approach defined'
          ]
        },
        {
          id: 'development',
          name: 'Implementation',
          order: 2,
          estimatedTokens: 60000,
          estimatedDuration: 2 * 60 * 60 * 1000,
          goals: [
            'Implement feature',
            'Write unit tests',
            'Handle edge cases'
          ],
          checkpoints: [
            'Core functionality complete',
            'Unit tests written',
            'Edge cases handled'
          ]
        },
        {
          id: 'integration',
          name: 'Integration & Polish',
          order: 3,
          estimatedTokens: 20000,
          estimatedDuration: 30 * 60 * 1000,
          goals: [
            'Integrate with existing code',
            'Polish UI/UX',
            'Final testing'
          ],
          checkpoints: [
            'Feature integrated',
            'UI polished',
            'Ready for release'
          ]
        }
      ],
      customizable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Bug Fixes Template
    this.templates.set('bug_fixes', {
      id: 'bug_fixes',
      name: 'Bug Fixes',
      type: 'bug_fixes',
      tokenBudget: 50000,
      estimatedDuration: 90 * 60 * 1000, // 1.5 hours
      phases: [
        {
          id: 'investigation',
          name: 'Bug Investigation',
          order: 1,
          estimatedTokens: 15000,
          estimatedDuration: 30 * 60 * 1000,
          goals: [
            'Reproduce issues',
            'Identify root causes',
            'Plan fixes'
          ],
          checkpoints: [
            'Bugs reproduced',
            'Root causes identified',
            'Fix strategy defined'
          ]
        },
        {
          id: 'fixing',
          name: 'Apply Fixes',
          order: 2,
          estimatedTokens: 25000,
          estimatedDuration: 45 * 60 * 1000,
          goals: [
            'Implement fixes',
            'Test solutions',
            'Prevent regressions'
          ],
          checkpoints: [
            'Fixes implemented',
            'Tests passing',
            'No new issues introduced'
          ]
        },
        {
          id: 'verification',
          name: 'Verification',
          order: 3,
          estimatedTokens: 10000,
          estimatedDuration: 15 * 60 * 1000,
          goals: [
            'Verify fixes work',
            'Update test cases',
            'Document changes'
          ],
          checkpoints: [
            'Fixes verified',
            'Tests updated',
            'Documentation complete'
          ]
        }
      ],
      customizable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Documentation Template
    this.templates.set('documentation', {
      id: 'documentation',
      name: 'Documentation',
      type: 'documentation',
      tokenBudget: 40000,
      estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
      phases: [
        {
          id: 'outline',
          name: 'Documentation Planning',
          order: 1,
          estimatedTokens: 10000,
          estimatedDuration: 30 * 60 * 1000,
          goals: [
            'Create documentation outline',
            'Identify key topics',
            'Gather examples'
          ],
          checkpoints: [
            'Outline complete',
            'Topics prioritized',
            'Examples collected'
          ]
        },
        {
          id: 'writing',
          name: 'Content Creation',
          order: 2,
          estimatedTokens: 25000,
          estimatedDuration: 75 * 60 * 1000,
          goals: [
            'Write documentation',
            'Create code examples',
            'Add diagrams/visuals'
          ],
          checkpoints: [
            'Content written',
            'Examples tested',
            'Visuals created'
          ]
        },
        {
          id: 'review',
          name: 'Review & Polish',
          order: 3,
          estimatedTokens: 5000,
          estimatedDuration: 15 * 60 * 1000,
          goals: [
            'Review for accuracy',
            'Fix formatting',
            'Ensure completeness'
          ],
          checkpoints: [
            'Content reviewed',
            'Formatting consistent',
            'Ready to publish'
          ]
        }
      ],
      customizable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  async getAllTemplates(): Promise<SessionTemplate[]> {
    return Array.from(this.templates.values());
  }
  
  async getTemplate(id: string): Promise<SessionTemplate | null> {
    return this.templates.get(id) || null;
  }
  
  async createCustomTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionTemplate> {
    const newTemplate: SessionTemplate = {
      ...template,
      id: uuidv4(),
      type: 'custom',
      customizable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.templates.set(newTemplate.id, newTemplate);
    await this.saveTemplates();
    
    return newTemplate;
  }
  
  async updateTemplate(id: string, updates: Partial<SessionTemplate>): Promise<SessionTemplate | null> {
    const template = this.templates.get(id);
    if (!template || !template.customizable) {
      return null;
    }
    
    const updatedTemplate = {
      ...template,
      ...updates,
      id: template.id, // Prevent ID change
      updatedAt: Date.now()
    };
    
    this.templates.set(id, updatedTemplate);
    await this.saveTemplates();
    
    return updatedTemplate;
  }
  
  async deleteTemplate(id: string): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template || !template.customizable) {
      return false;
    }
    
    this.templates.delete(id);
    await this.saveTemplates();
    
    return true;
  }
  
  async applyTemplate(sessionId: string, templateId: string): Promise<Session | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Update session with template settings
    const updatedSession: Session = {
      ...session,
      name: `${template.name} Session`,
      tokenBudget: template.tokenBudget,
      updatedAt: Date.now()
    };
    
    await this.sessionManager.updateSession(sessionId, updatedSession);
    
    // Broadcast template selection
    this.wsManager.broadcastTemplateSelected(sessionId, template);
    
    // Store template phases for tracking
    await this.storeSessionPhases(sessionId, template.phases);
    
    return updatedSession;
  }
  
  async getCurrentPhase(sessionId: string): Promise<SessionPhase | null> {
    const phases = await this.getSessionPhases(sessionId);
    if (!phases || phases.length === 0) return null;
    
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) return null;
    
    // Calculate which phase we should be in based on time elapsed
    const elapsed = Date.now() - session.startTime;
    let accumulatedTime = 0;
    
    for (const phase of phases) {
      accumulatedTime += phase.estimatedDuration;
      if (elapsed < accumulatedTime) {
        return phase;
      }
    }
    
    // If we've exceeded all phases, return the last one
    return phases[phases.length - 1];
  }
  
  async completePhase(sessionId: string, phaseId: string): Promise<void> {
    // Store phase completion in session metadata
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) return;
    
    const completedPhases = await this.getCompletedPhases(sessionId);
    completedPhases.push({
      phaseId,
      completedAt: Date.now()
    });
    
    await this.storeCompletedPhases(sessionId, completedPhases);
    
    // Broadcast phase completion
    this.wsManager.sendToSession(sessionId, {
      type: 'checkpoint',
      sessionId,
      phase: phaseId,
      promptCount: 0, // This would come from actual tracking
      timestamp: Date.now()
    });
  }
  
  private async saveTemplates(): Promise<void> {
    // In a production system, this would persist to a database
    // For now, templates are stored in memory
  }
  
  private async storeSessionPhases(sessionId: string, phases: SessionPhase[]): Promise<void> {
    // Store phases associated with a session
    // In production, this would be stored in a database
  }
  
  private async getSessionPhases(sessionId: string): Promise<SessionPhase[]> {
    // Retrieve phases for a session
    // For now, return empty array
    return [];
  }
  
  private async getCompletedPhases(sessionId: string): Promise<Array<{ phaseId: string; completedAt: number }>> {
    // Retrieve completed phases for a session
    return [];
  }
  
  private async storeCompletedPhases(
    sessionId: string, 
    completedPhases: Array<{ phaseId: string; completedAt: number }>
  ): Promise<void> {
    // Store completed phases
  }
}