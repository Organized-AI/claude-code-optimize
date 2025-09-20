import {
  ComplexityMetrics,
  RiskAssessment,
  SessionPlan,
  ModelAllocation,
  PlannedSession,
  TokenBudget,
  TokenBreakdown,
  AllocationConstraints,
  ValidationResult,
  QuotaUsage
} from '../../contracts/AgentInterfaces.js';

interface TaskTemplate {
  name: string;
  type: 'analysis' | 'implementation' | 'testing' | 'documentation' | 'refactoring';
  complexity: number; // 1-10
  preferredModel: 'sonnet' | 'opus' | 'either';
  estimatedMinutes: number;
  estimatedTokens: number;
  dependencies: string[];
  parallelizable: boolean;
}

interface OptimizationRule {
  condition: (complexity: ComplexityMetrics, risk: RiskAssessment) => boolean;
  adjustment: (plan: SessionPlan) => SessionPlan;
  priority: number;
  description: string;
}

export class SessionPlanningService {
  private readonly TOKENS_PER_MINUTE = {
    sonnet: 50,  // Sonnet tokens per minute (conservative estimate)
    opus: 30     // Opus tokens per minute (more thoughtful responses)
  };

  private readonly EFFICIENCY_MULTIPLIERS = {
    sonnet: 1.3,  // Sonnet is faster for routine tasks
    opus: 0.8     // Opus is slower but more thorough
  };

  private readonly TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
    'analysis': [
      {
        name: 'Codebase Architecture Review',
        type: 'analysis',
        complexity: 8,
        preferredModel: 'opus',
        estimatedMinutes: 120,
        estimatedTokens: 3600,
        dependencies: [],
        parallelizable: false
      },
      {
        name: 'Dependency Analysis',
        type: 'analysis',
        complexity: 6,
        preferredModel: 'sonnet',
        estimatedMinutes: 60,
        estimatedTokens: 3000,
        dependencies: [],
        parallelizable: true
      },
      {
        name: 'Performance Bottleneck Identification',
        type: 'analysis',
        complexity: 7,
        preferredModel: 'opus',
        estimatedMinutes: 90,
        estimatedTokens: 2700,
        dependencies: ['Codebase Architecture Review'],
        parallelizable: false
      }
    ],
    'implementation': [
      {
        name: 'Core Feature Implementation',
        type: 'implementation',
        complexity: 9,
        preferredModel: 'opus',
        estimatedMinutes: 180,
        estimatedTokens: 5400,
        dependencies: ['Codebase Architecture Review'],
        parallelizable: false
      },
      {
        name: 'Utility Function Creation',
        type: 'implementation',
        complexity: 4,
        preferredModel: 'sonnet',
        estimatedMinutes: 45,
        estimatedTokens: 2250,
        dependencies: [],
        parallelizable: true
      },
      {
        name: 'API Integration',
        type: 'implementation',
        complexity: 6,
        preferredModel: 'sonnet',
        estimatedMinutes: 75,
        estimatedTokens: 3750,
        dependencies: ['Core Feature Implementation'],
        parallelizable: true
      }
    ],
    'testing': [
      {
        name: 'Unit Test Creation',
        type: 'testing',
        complexity: 5,
        preferredModel: 'sonnet',
        estimatedMinutes: 90,
        estimatedTokens: 4500,
        dependencies: ['Core Feature Implementation'],
        parallelizable: true
      },
      {
        name: 'Integration Test Setup',
        type: 'testing',
        complexity: 7,
        preferredModel: 'opus',
        estimatedMinutes: 120,
        estimatedTokens: 3600,
        dependencies: ['API Integration'],
        parallelizable: false
      },
      {
        name: 'Test Coverage Analysis',
        type: 'testing',
        complexity: 4,
        preferredModel: 'sonnet',
        estimatedMinutes: 30,
        estimatedTokens: 1500,
        dependencies: ['Unit Test Creation'],
        parallelizable: true
      }
    ],
    'refactoring': [
      {
        name: 'Code Structure Improvement',
        type: 'refactoring',
        complexity: 8,
        preferredModel: 'opus',
        estimatedMinutes: 150,
        estimatedTokens: 4500,
        dependencies: ['Codebase Architecture Review'],
        parallelizable: false
      },
      {
        name: 'Performance Optimization',
        type: 'refactoring',
        complexity: 7,
        preferredModel: 'opus',
        estimatedMinutes: 120,
        estimatedTokens: 3600,
        dependencies: ['Performance Bottleneck Identification'],
        parallelizable: false
      },
      {
        name: 'Code Style Standardization',
        type: 'refactoring',
        complexity: 3,
        preferredModel: 'sonnet',
        estimatedMinutes: 60,
        estimatedTokens: 3000,
        dependencies: [],
        parallelizable: true
      }
    ],
    'documentation': [
      {
        name: 'API Documentation Update',
        type: 'documentation',
        complexity: 5,
        preferredModel: 'sonnet',
        estimatedMinutes: 75,
        estimatedTokens: 3750,
        dependencies: ['API Integration'],
        parallelizable: true
      },
      {
        name: 'Architecture Documentation',
        type: 'documentation',
        complexity: 6,
        preferredModel: 'opus',
        estimatedMinutes: 90,
        estimatedTokens: 2700,
        dependencies: ['Codebase Architecture Review'],
        parallelizable: true
      },
      {
        name: 'README Enhancement',
        type: 'documentation',
        complexity: 4,
        preferredModel: 'sonnet',
        estimatedMinutes: 45,
        estimatedTokens: 2250,
        dependencies: [],
        parallelizable: true
      }
    ]
  };

  private optimizationRules: OptimizationRule[] = [
    {
      condition: (complexity, risk) => risk.quotaRisk.probability > 70,
      adjustment: (plan) => this.shiftToSonnet(plan, 0.7),
      priority: 10,
      description: 'High quota risk - shift 70% of tasks to Sonnet'
    },
    {
      condition: (complexity, risk) => risk.timeRisk.probability > 80,
      adjustment: (plan) => this.addParallelization(plan),
      priority: 8,
      description: 'High time risk - maximize parallel execution'
    },
    {
      condition: (complexity, risk) => complexity.testing.coveragePercentage < 50,
      adjustment: (plan) => this.prioritizeTesting(plan),
      priority: 6,
      description: 'Low test coverage - prioritize testing tasks'
    },
    {
      condition: (complexity, risk) => complexity.architecture.technicalDebtHours > 100,
      adjustment: (plan) => this.prioritizeRefactoring(plan),
      priority: 7,
      description: 'High technical debt - prioritize refactoring'
    },
    {
      condition: (complexity, risk) => complexity.documentation.completenessPercentage < 40,
      adjustment: (plan) => this.addDocumentationTasks(plan),
      priority: 4,
      description: 'Poor documentation - add documentation tasks'
    }
  ];

  async planSessions(complexity: ComplexityMetrics, risk: RiskAssessment): Promise<SessionPlan> {
    console.log('📋 Starting intelligent session planning...');

    // Generate task list based on complexity analysis
    const tasks = await this.generateTaskList(complexity, risk);
    
    // Create initial session plan
    let plan = await this.createInitialPlan(tasks, complexity, risk);
    
    // Apply optimization rules
    plan = await this.optimizePlan(plan, complexity, risk);
    
    // Validate and adjust for quota constraints
    plan = await this.validateAndAdjustQuotas(plan, risk.quotaRisk.currentUsage);
    
    // Calculate confidence based on historical data and risk factors
    plan.confidence = this.calculatePlanConfidence(plan, complexity, risk);

    console.log(`✅ Session plan created with ${plan.sessionSequence.length} sessions`);
    console.log(`⏱️  Total estimated time: ${Math.round(plan.totalEstimatedTime / 60)} hours`);
    console.log(`🎯 Model allocation - Sonnet: ${plan.modelAllocation.sonnet.percentage}%, Opus: ${plan.modelAllocation.opus.percentage}%`);
    console.log(`🔮 Confidence: ${plan.confidence}%`);

    return plan;
  }

  private async generateTaskList(complexity: ComplexityMetrics, risk: RiskAssessment): Promise<TaskTemplate[]> {
    const tasks: TaskTemplate[] = [];
    
    // Always include analysis phase
    tasks.push(...this.TASK_TEMPLATES.analysis);
    
    // Add implementation tasks based on complexity
    if (complexity.overall > 3) {
      tasks.push(...this.TASK_TEMPLATES.implementation);
    }
    
    // Add testing tasks if coverage is low or complexity is high
    if (complexity.testing.coveragePercentage < 70 || complexity.overall > 6) {
      tasks.push(...this.TASK_TEMPLATES.testing);
    }
    
    // Add refactoring tasks for high technical debt
    if (complexity.architecture.technicalDebtHours > 50 || complexity.architecture.score > 7) {
      tasks.push(...this.TASK_TEMPLATES.refactoring);
    }
    
    // Add documentation tasks for poor documentation
    if (complexity.documentation.completenessPercentage < 60) {
      tasks.push(...this.TASK_TEMPLATES.documentation);
    }
    
    // Adjust task estimates based on complexity
    return tasks.map(task => ({
      ...task,
      estimatedMinutes: Math.round(task.estimatedMinutes * this.getComplexityMultiplier(task, complexity)),
      estimatedTokens: Math.round(task.estimatedTokens * this.getComplexityMultiplier(task, complexity))
    }));
  }

  private getComplexityMultiplier(task: TaskTemplate, complexity: ComplexityMetrics): number {
    let multiplier = 1.0;
    
    // Adjust based on task type and relevant complexity metrics
    switch (task.type) {
      case 'analysis':
        multiplier *= 1 + (complexity.codebase.score - 5) * 0.1;
        break;
      case 'implementation':
        multiplier *= 1 + (complexity.architecture.score - 5) * 0.15;
        break;
      case 'testing':
        multiplier *= 1 + (10 - complexity.testing.score) * 0.1;
        break;
      case 'refactoring':
        multiplier *= 1 + (complexity.architecture.technicalDebtHours / 100);
        break;
      case 'documentation':
        multiplier *= 1 + (10 - complexity.documentation.score) * 0.05;
        break;
    }
    
    // Factor in overall complexity
    multiplier *= 1 + (complexity.overall - 5) * 0.05;
    
    return Math.max(0.5, Math.min(3.0, multiplier));
  }

  private async createInitialPlan(tasks: TaskTemplate[], complexity: ComplexityMetrics, risk: RiskAssessment): Promise<SessionPlan> {
    // Create planned sessions from tasks
    const sessions: PlannedSession[] = tasks.map((task, index) => ({
      id: `session-${index + 1}`,
      name: task.name,
      model: this.selectOptimalModel(task, complexity, risk),
      estimatedDuration: task.estimatedMinutes,
      estimatedTokens: task.estimatedTokens,
      tasks: [task.name],
      dependencies: task.dependencies,
      priority: this.calculateTaskPriority(task, complexity, risk)
    }));

    // Sort by priority and dependencies
    const sortedSessions = this.sortSessionsByDependencies(sessions);
    
    // Calculate totals
    const totalTime = sortedSessions.reduce((sum, session) => sum + session.estimatedDuration, 0);
    const totalTokens = sortedSessions.reduce((sum, session) => sum + session.estimatedTokens, 0);
    
    // Calculate model allocation
    const modelAllocation = this.calculateModelAllocation(sortedSessions);
    
    // Create token budget
    const tokenBudget = this.createTokenBudget(sortedSessions, complexity);
    
    // Generate initial recommendations
    const recommendations = this.generateInitialRecommendations(complexity, risk);

    return {
      totalEstimatedTime: totalTime,
      modelAllocation,
      sessionSequence: sortedSessions,
      tokenBudget,
      recommendations,
      confidence: 70 // Initial confidence, will be adjusted
    };
  }

  private selectOptimalModel(task: TaskTemplate, complexity: ComplexityMetrics, risk: RiskAssessment): 'sonnet' | 'opus' {
    // High quota risk -> prefer Sonnet
    if (risk.quotaRisk.probability > 70) {
      return 'sonnet';
    }
    
    // Very high complexity tasks -> prefer Opus
    if (task.complexity >= 8 && task.preferredModel === 'opus') {
      return 'opus';
    }
    
    // Architecture and complex implementation -> Opus
    if ((task.type === 'analysis' || task.type === 'implementation') && task.complexity >= 7) {
      return 'opus';
    }
    
    // Testing, documentation, simple tasks -> Sonnet
    if (task.type === 'testing' || task.type === 'documentation' || task.complexity <= 5) {
      return 'sonnet';
    }
    
    // Default to task preference
    return task.preferredModel === 'opus' ? 'opus' : 'sonnet';
  }

  private calculateTaskPriority(task: TaskTemplate, complexity: ComplexityMetrics, risk: RiskAssessment): number {
    let priority = task.complexity; // Base priority from complexity
    
    // Boost priority based on risk factors
    if (task.type === 'analysis' && complexity.overall > 7) priority += 3;
    if (task.type === 'testing' && complexity.testing.coveragePercentage < 50) priority += 2;
    if (task.type === 'refactoring' && complexity.architecture.technicalDebtHours > 100) priority += 2;
    
    // High-risk projects need better planning up front
    if (risk.overall > 70 && task.dependencies.length === 0) priority += 1;
    
    return Math.min(10, Math.max(1, Math.round(priority)));
  }

  private sortSessionsByDependencies(sessions: PlannedSession[]): PlannedSession[] {
    const sorted: PlannedSession[] = [];
    const remaining = [...sessions];
    const completed = new Set<string>();
    
    while (remaining.length > 0) {
      // Find sessions with no unmet dependencies
      const ready = remaining.filter(session => 
        session.dependencies.every(dep => completed.has(dep))
      );
      
      if (ready.length === 0) {
        // Break circular dependencies by taking highest priority
        const nextSession = remaining.reduce((max, session) => 
          session.priority > max.priority ? session : max
        );
        ready.push(nextSession);
      }
      
      // Sort ready sessions by priority
      ready.sort((a, b) => b.priority - a.priority);
      
      // Add to sorted list and mark as completed
      for (const session of ready) {
        sorted.push(session);
        completed.add(session.name);
        const index = remaining.indexOf(session);
        remaining.splice(index, 1);
      }
    }
    
    return sorted;
  }

  private calculateModelAllocation(sessions: PlannedSession[]): ModelAllocation {
    const sonnetSessions = sessions.filter(s => s.model === 'sonnet');
    const opusSessions = sessions.filter(s => s.model === 'opus');
    
    const sonnetTime = sonnetSessions.reduce((sum, s) => sum + s.estimatedDuration, 0);
    const opusTime = opusSessions.reduce((sum, s) => sum + s.estimatedDuration, 0);
    const totalTime = sonnetTime + opusTime;
    
    return {
      sonnet: {
        estimatedTime: sonnetTime,
        percentage: totalTime > 0 ? Math.round((sonnetTime / totalTime) * 100) : 0,
        tasks: sonnetSessions.map(s => s.name)
      },
      opus: {
        estimatedTime: opusTime,
        percentage: totalTime > 0 ? Math.round((opusTime / totalTime) * 100) : 0,
        tasks: opusSessions.map(s => s.name)
      }
    };
  }

  private createTokenBudget(sessions: PlannedSession[], complexity: ComplexityMetrics): TokenBudget {
    const totalTokens = sessions.reduce((sum, s) => sum + s.estimatedTokens, 0);
    const sonnetTokens = sessions.filter(s => s.model === 'sonnet').reduce((sum, s) => sum + s.estimatedTokens, 0);
    const opusTokens = sessions.filter(s => s.model === 'opus').reduce((sum, s) => sum + s.estimatedTokens, 0);
    
    // Add 20% buffer for uncertainties
    const buffer = Math.round(totalTokens * 0.2);
    
    const breakdown: TokenBreakdown[] = [
      {
        category: 'Analysis Tasks',
        estimatedTokens: sessions.filter(s => s.name.includes('Analysis') || s.name.includes('Review')).reduce((sum, s) => sum + s.estimatedTokens, 0),
        confidence: 80
      },
      {
        category: 'Implementation Tasks',
        estimatedTokens: sessions.filter(s => s.name.includes('Implementation') || s.name.includes('Creation')).reduce((sum, s) => sum + s.estimatedTokens, 0),
        confidence: 70
      },
      {
        category: 'Testing Tasks',
        estimatedTokens: sessions.filter(s => s.name.includes('Test')).reduce((sum, s) => sum + s.estimatedTokens, 0),
        confidence: 85
      },
      {
        category: 'Documentation Tasks',
        estimatedTokens: sessions.filter(s => s.name.includes('Documentation') || s.name.includes('README')).reduce((sum, s) => sum + s.estimatedTokens, 0),
        confidence: 90
      },
      {
        category: 'Refactoring Tasks',
        estimatedTokens: sessions.filter(s => s.name.includes('Improvement') || s.name.includes('Optimization')).reduce((sum, s) => sum + s.estimatedTokens, 0),
        confidence: 65
      }
    ].filter(item => item.estimatedTokens > 0);
    
    return {
      total: totalTokens + buffer,
      sonnet: sonnetTokens,
      opus: opusTokens,
      buffer,
      breakdown
    };
  }

  private generateInitialRecommendations(complexity: ComplexityMetrics, risk: RiskAssessment): string[] {
    const recommendations: string[] = [];
    
    if (risk.quotaRisk.probability > 70) {
      recommendations.push('⚠️ High quota risk detected - plan includes Sonnet optimization');
    }
    
    if (risk.timeRisk.probability > 70) {
      recommendations.push('⏱️ High time risk - consider adding buffer time to schedule');
    }
    
    if (complexity.testing.coveragePercentage < 50) {
      recommendations.push('🧪 Low test coverage detected - testing tasks prioritized');
    }
    
    if (complexity.architecture.technicalDebtHours > 100) {
      recommendations.push('🔧 High technical debt - refactoring tasks included');
    }
    
    if (complexity.documentation.completenessPercentage < 40) {
      recommendations.push('📝 Poor documentation - documentation improvements planned');
    }
    
    recommendations.push(`🎯 Plan optimized for ${complexity.overall}/10 complexity project`);
    
    return recommendations;
  }

  private async optimizePlan(plan: SessionPlan, complexity: ComplexityMetrics, risk: RiskAssessment): Promise<SessionPlan> {
    let optimizedPlan = { ...plan };
    
    // Apply optimization rules in priority order
    const applicableRules = this.optimizationRules
      .filter(rule => rule.condition(complexity, risk))
      .sort((a, b) => b.priority - a.priority);
    
    for (const rule of applicableRules) {
      console.log(`📈 Applying optimization: ${rule.description}`);
      optimizedPlan = rule.adjustment(optimizedPlan);
    }
    
    return optimizedPlan;
  }

  private shiftToSonnet(plan: SessionPlan, percentage: number): SessionPlan {
    const sessions = [...plan.sessionSequence];
    const opusSessions = sessions.filter(s => s.model === 'opus');
    const shiftCount = Math.ceil(opusSessions.length * percentage);
    
    // Shift lower-complexity Opus tasks to Sonnet
    opusSessions
      .sort((a, b) => a.priority - b.priority) // Lower priority first
      .slice(0, shiftCount)
      .forEach(session => {
        session.model = 'sonnet';
        // Adjust estimates for Sonnet efficiency
        session.estimatedDuration = Math.round(session.estimatedDuration * 0.8);
        session.estimatedTokens = Math.round(session.estimatedTokens * 1.2);
      });
    
    // Recalculate allocations
    const modelAllocation = this.calculateModelAllocation(sessions);
    const tokenBudget = this.createTokenBudget(sessions, plan as any);
    const totalTime = sessions.reduce((sum, s) => sum + s.estimatedDuration, 0);
    
    return {
      ...plan,
      sessionSequence: sessions,
      modelAllocation,
      tokenBudget,
      totalEstimatedTime: totalTime
    };
  }

  private addParallelization(plan: SessionPlan): SessionPlan {
    const sessions = [...plan.sessionSequence];
    
    // Identify sessions that can run in parallel
    const parallelizable = sessions.filter(s => 
      s.dependencies.length === 0 || 
      s.name.includes('Test') || 
      s.name.includes('Documentation')
    );
    
    // Reduce estimated time by assuming some parallel execution
    const parallelEfficiency = Math.min(0.3, parallelizable.length * 0.05);
    const totalTime = plan.totalEstimatedTime * (1 - parallelEfficiency);
    
    return {
      ...plan,
      totalEstimatedTime: Math.round(totalTime),
      recommendations: [
        ...plan.recommendations,
        `⚡ Parallel execution can save ~${Math.round(plan.totalEstimatedTime * parallelEfficiency / 60)} hours`
      ]
    };
  }

  private prioritizeTesting(plan: SessionPlan): SessionPlan {
    const sessions = [...plan.sessionSequence];
    
    // Boost priority of testing tasks
    sessions.forEach(session => {
      if (session.name.includes('Test')) {
        session.priority = Math.min(10, session.priority + 2);
      }
    });
    
    // Re-sort by priority
    const sortedSessions = this.sortSessionsByDependencies(sessions);
    
    return {
      ...plan,
      sessionSequence: sortedSessions,
      recommendations: [
        ...plan.recommendations,
        '🧪 Testing tasks prioritized due to low coverage'
      ]
    };
  }

  private prioritizeRefactoring(plan: SessionPlan): SessionPlan {
    const sessions = [...plan.sessionSequence];
    
    // Boost priority of refactoring tasks
    sessions.forEach(session => {
      if (session.name.includes('Improvement') || session.name.includes('Optimization')) {
        session.priority = Math.min(10, session.priority + 2);
      }
    });
    
    // Re-sort by priority
    const sortedSessions = this.sortSessionsByDependencies(sessions);
    
    return {
      ...plan,
      sessionSequence: sortedSessions,
      recommendations: [
        ...plan.recommendations,
        '🔧 Refactoring tasks prioritized due to high technical debt'
      ]
    };
  }

  private addDocumentationTasks(plan: SessionPlan): SessionPlan {
    const sessions = [...plan.sessionSequence];
    
    // Add additional documentation task if not already included
    const hasDocTasks = sessions.some(s => s.name.includes('Documentation'));
    if (!hasDocTasks) {
      sessions.push({
        id: `session-${sessions.length + 1}`,
        name: 'Documentation Improvement',
        model: 'sonnet',
        estimatedDuration: 60,
        estimatedTokens: 3000,
        tasks: ['Documentation Improvement'],
        dependencies: [],
        priority: 5
      });
    }
    
    // Recalculate totals
    const modelAllocation = this.calculateModelAllocation(sessions);
    const tokenBudget = this.createTokenBudget(sessions, plan as any);
    const totalTime = sessions.reduce((sum, s) => sum + s.estimatedDuration, 0);
    
    return {
      ...plan,
      sessionSequence: sessions,
      modelAllocation,
      tokenBudget,
      totalEstimatedTime: totalTime,
      recommendations: [
        ...plan.recommendations,
        '📝 Additional documentation tasks added'
      ]
    };
  }

  private async validateAndAdjustQuotas(plan: SessionPlan, currentQuotas: QuotaUsage): Promise<SessionPlan> {
    const WEEKLY_LIMITS = { sonnet: 480, opus: 40 }; // hours
    const SAFETY_THRESHOLD = 0.90;
    
    // Convert minutes to hours for quota checking
    const plannedSonnetHours = plan.modelAllocation.sonnet.estimatedTime / 60;
    const plannedOpusHours = plan.modelAllocation.opus.estimatedTime / 60;
    
    const projectedSonnet = currentQuotas.sonnet.used + plannedSonnetHours;
    const projectedOpus = currentQuotas.opus.used + plannedOpusHours;
    
    const sonnetSafeLimit = WEEKLY_LIMITS.sonnet * SAFETY_THRESHOLD;
    const opusSafeLimit = WEEKLY_LIMITS.opus * SAFETY_THRESHOLD;
    
    let adjustedPlan = { ...plan };
    
    // Adjust if exceeding safe limits
    if (projectedSonnet > sonnetSafeLimit) {
      const excessHours = projectedSonnet - sonnetSafeLimit;
      adjustedPlan = this.reduceModelUsage(adjustedPlan, 'sonnet', excessHours * 60);
      adjustedPlan.recommendations.push(`🚨 Reduced Sonnet usage by ${excessHours.toFixed(1)} hours to stay within 90% limit`);
    }
    
    if (projectedOpus > opusSafeLimit) {
      const excessHours = projectedOpus - opusSafeLimit;
      adjustedPlan = this.reduceModelUsage(adjustedPlan, 'opus', excessHours * 60);
      adjustedPlan.recommendations.push(`🚨 Reduced Opus usage by ${excessHours.toFixed(1)} hours to stay within 90% limit`);
    }
    
    return adjustedPlan;
  }

  private reduceModelUsage(plan: SessionPlan, model: 'sonnet' | 'opus', reductionMinutes: number): SessionPlan {
    const sessions = [...plan.sessionSequence];
    let remainingReduction = reductionMinutes;
    
    // Remove or reduce sessions of the specified model, starting with lowest priority
    const modelSessions = sessions
      .filter(s => s.model === model)
      .sort((a, b) => a.priority - b.priority);
    
    for (const session of modelSessions) {
      if (remainingReduction <= 0) break;
      
      if (session.estimatedDuration <= remainingReduction) {
        // Remove entire session
        remainingReduction -= session.estimatedDuration;
        const index = sessions.indexOf(session);
        sessions.splice(index, 1);
      } else {
        // Reduce session duration
        session.estimatedDuration -= remainingReduction;
        session.estimatedTokens = Math.round(session.estimatedTokens * (session.estimatedDuration / (session.estimatedDuration + remainingReduction)));
        remainingReduction = 0;
      }
    }
    
    // Recalculate allocations
    const modelAllocation = this.calculateModelAllocation(sessions);
    const tokenBudget = this.createTokenBudget(sessions, plan as any);
    const totalTime = sessions.reduce((sum, s) => sum + s.estimatedDuration, 0);
    
    return {
      ...plan,
      sessionSequence: sessions,
      modelAllocation,
      tokenBudget,
      totalEstimatedTime: totalTime
    };
  }

  private calculatePlanConfidence(plan: SessionPlan, complexity: ComplexityMetrics, risk: RiskAssessment): number {
    let confidence = 80; // Base confidence
    
    // Reduce confidence for high complexity
    confidence -= (complexity.overall - 5) * 5;
    
    // Reduce confidence for high risk
    confidence -= (risk.overall - 50) * 0.3;
    
    // Increase confidence for good test coverage
    if (complexity.testing.coveragePercentage > 80) confidence += 10;
    
    // Increase confidence for good documentation
    if (complexity.documentation.completenessPercentage > 70) confidence += 5;
    
    // Reduce confidence for high technical debt
    if (complexity.architecture.technicalDebtHours > 100) confidence -= 15;
    
    // Adjust based on plan optimization
    const optimizationScore = plan.recommendations.length;
    confidence += Math.min(10, optimizationScore * 2);
    
    return Math.max(30, Math.min(95, Math.round(confidence)));
  }

  // Public utility methods
  async optimizeAllocation(plan: SessionPlan, constraints: AllocationConstraints): Promise<SessionPlan> {
    let optimizedPlan = { ...plan };
    
    if (constraints.maxSonnetTime) {
      const currentSonnetTime = plan.modelAllocation.sonnet.estimatedTime;
      if (currentSonnetTime > constraints.maxSonnetTime) {
        const reduction = currentSonnetTime - constraints.maxSonnetTime;
        optimizedPlan = this.reduceModelUsage(optimizedPlan, 'sonnet', reduction);
      }
    }
    
    if (constraints.maxOpusTime) {
      const currentOpusTime = plan.modelAllocation.opus.estimatedTime;
      if (currentOpusTime > constraints.maxOpusTime) {
        const reduction = currentOpusTime - constraints.maxOpusTime;
        optimizedPlan = this.reduceModelUsage(optimizedPlan, 'opus', reduction);
      }
    }
    
    if (constraints.preferredModel) {
      // Shift tasks to preferred model where appropriate
      const shiftPercentage = constraints.preferredModel === 'sonnet' ? 0.8 : 0.3;
      if (constraints.preferredModel === 'sonnet') {
        optimizedPlan = this.shiftToSonnet(optimizedPlan, shiftPercentage);
      }
    }
    
    return optimizedPlan;
  }

  async validatePlan(plan: SessionPlan, quotas: QuotaUsage): Promise<ValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // Check quota safety
    const WEEKLY_LIMITS = { sonnet: 480, opus: 40 };
    const plannedSonnetHours = plan.modelAllocation.sonnet.estimatedTime / 60;
    const plannedOpusHours = plan.modelAllocation.opus.estimatedTime / 60;
    
    const projectedSonnet = quotas.sonnet.used + plannedSonnetHours;
    const projectedOpus = quotas.opus.used + plannedOpusHours;
    
    if (projectedSonnet > WEEKLY_LIMITS.sonnet * 0.9) {
      errors.push(`Plan would exceed 90% Sonnet quota (${projectedSonnet.toFixed(1)}/${WEEKLY_LIMITS.sonnet} hours)`);
    } else if (projectedSonnet > WEEKLY_LIMITS.sonnet * 0.8) {
      warnings.push(`Plan approaches 80% Sonnet quota (${projectedSonnet.toFixed(1)}/${WEEKLY_LIMITS.sonnet} hours)`);
    }
    
    if (projectedOpus > WEEKLY_LIMITS.opus * 0.9) {
      errors.push(`Plan would exceed 90% Opus quota (${projectedOpus.toFixed(1)}/${WEEKLY_LIMITS.opus} hours)`);
    } else if (projectedOpus > WEEKLY_LIMITS.opus * 0.8) {
      warnings.push(`Plan approaches 80% Opus quota (${projectedOpus.toFixed(1)}/${WEEKLY_LIMITS.opus} hours)`);
    }
    
    // Check for circular dependencies
    const dependencyIssues = this.checkCircularDependencies(plan.sessionSequence);
    errors.push(...dependencyIssues);
    
    // Check plan duration
    if (plan.totalEstimatedTime > 10 * 60) { // More than 10 hours
      warnings.push('Plan duration exceeds 10 hours - consider breaking into phases');
      suggestions.push('Split into multiple shorter sessions for better focus');
    }
    
    // Check confidence
    if (plan.confidence < 50) {
      warnings.push(`Low confidence plan (${plan.confidence}%) - high uncertainty`);
      suggestions.push('Consider additional analysis phase or reduced scope');
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions
    };
  }

  private checkCircularDependencies(sessions: PlannedSession[]): string[] {
    const errors: string[] = [];
    const sessionMap = new Map(sessions.map(s => [s.name, s]));
    
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const checkCircular = (sessionName: string, path: string[]): void => {
      if (visiting.has(sessionName)) {
        errors.push(`Circular dependency detected: ${path.join(' -> ')} -> ${sessionName}`);
        return;
      }
      
      if (visited.has(sessionName)) return;
      
      visiting.add(sessionName);
      const session = sessionMap.get(sessionName);
      
      if (session) {
        for (const dep of session.dependencies) {
          checkCircular(dep, [...path, sessionName]);
        }
      }
      
      visiting.delete(sessionName);
      visited.add(sessionName);
    };
    
    for (const session of sessions) {
      if (!visited.has(session.name)) {
        checkCircular(session.name, []);
      }
    }
    
    return errors;
  }
}