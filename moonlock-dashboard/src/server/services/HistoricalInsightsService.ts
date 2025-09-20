import {
  ComplexityMetrics,
  HistoricalInsights,
  SimilarProject,
  SuccessPrediction,
  OptimizationRecommendation,
  ProjectTrend,
  PredictionFactor,
  SessionOutcome,
  ProjectContext,
  SessionPlan
} from '../../contracts/AgentInterfaces.js';

interface ProjectPattern {
  id: string;
  projectType: string;
  complexityRange: [number, number];
  successRate: number;
  averageDuration: number;
  commonIssues: string[];
  bestPractices: string[];
  modelPreference: 'sonnet' | 'opus' | 'mixed';
}

interface LearningModel {
  successFactors: Record<string, number>;
  riskFactors: Record<string, number>;
  optimizationPatterns: Record<string, OptimizationRecommendation>;
  trendAnalysis: ProjectTrend[];
}

export class HistoricalInsightsService {
  private learningModel: LearningModel;
  private projectPatterns: ProjectPattern[];
  private sessionHistory: SessionOutcome[] = [];

  constructor() {
    this.learningModel = this.initializeLearningModel();
    this.projectPatterns = this.loadProjectPatterns();
  }

  async getHistoricalInsights(complexity: ComplexityMetrics): Promise<HistoricalInsights> {
    console.log('🔮 Generating historical insights and predictions...');

    // Find similar projects based on complexity profile
    const similarProjects = await this.findSimilarProjects(complexity);
    
    // Generate success prediction based on historical data
    const successPrediction = await this.predictSuccess(complexity, similarProjects);
    
    // Generate optimization recommendations
    const optimizations = await this.generateOptimizations(complexity, similarProjects);
    
    // Analyze trends
    const trends = await this.analyzeTrends(complexity);

    console.log(`✅ Historical insights generated`);
    console.log(`📊 Found ${similarProjects.length} similar projects`);
    console.log(`🎯 Success prediction: ${successPrediction.probability}%`);
    console.log(`💡 ${optimizations.length} optimization recommendations`);

    return {
      similarProjects,
      successPrediction,
      optimizations,
      trends
    };
  }

  private async findSimilarProjects(complexity: ComplexityMetrics): Promise<SimilarProject[]> {
    // Mock historical project data - in production, this would come from a database
    const historicalProjects = this.generateMockHistoricalProjects();
    
    const similarities = historicalProjects.map(project => ({
      ...project,
      similarity: this.calculateSimilarity(complexity, project.complexity)
    }));

    // Return top 5 most similar projects, sorted by similarity
    return similarities
      .filter(p => p.similarity > 30) // Only projects with >30% similarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  private calculateSimilarity(current: ComplexityMetrics, historical: ComplexityMetrics): number {
    // Calculate similarity based on multiple dimensions
    const weights = {
      overall: 0.25,
      codebase: 0.20,
      dependencies: 0.15,
      architecture: 0.25,
      testing: 0.10,
      documentation: 0.05
    };

    const overallSim = 100 - Math.abs(current.overall - historical.overall) * 10;
    const codebaseSim = 100 - Math.abs(current.codebase.score - historical.codebase.score) * 10;
    const depSim = 100 - Math.abs(current.dependencies.score - historical.dependencies.score) * 10;
    const archSim = 100 - Math.abs(current.architecture.score - historical.architecture.score) * 10;
    const testSim = 100 - Math.abs(current.testing.score - historical.testing.score) * 10;
    const docSim = 100 - Math.abs(current.documentation.score - historical.documentation.score) * 10;

    const weightedSimilarity = 
      overallSim * weights.overall +
      codebaseSim * weights.codebase +
      depSim * weights.dependencies +
      archSim * weights.architecture +
      testSim * weights.testing +
      docSim * weights.documentation;

    return Math.max(0, Math.min(100, Math.round(weightedSimilarity)));
  }

  private async predictSuccess(complexity: ComplexityMetrics, similarProjects: SimilarProject[]): Promise<SuccessPrediction> {
    const factors: PredictionFactor[] = [];
    let baseProbability = 70; // Base success rate

    // Factor in similar project success rates
    if (similarProjects.length > 0) {
      const avgSuccessRate = similarProjects.reduce((sum, p) => sum + (p.success ? 100 : 0), 0) / similarProjects.length;
      baseProbability = avgSuccessRate * 0.6 + baseProbability * 0.4; // Weighted average
      
      factors.push({
        name: 'Similar Project History',
        weight: 0.3,
        contribution: avgSuccessRate - 70,
        description: `${similarProjects.length} similar projects with ${avgSuccessRate.toFixed(1)}% success rate`
      });
    }

    // Complexity factors
    if (complexity.overall > 8) {
      factors.push({
        name: 'High Overall Complexity',
        weight: 0.25,
        contribution: -20,
        description: 'Very high complexity (9-10/10) significantly increases risk'
      });
      baseProbability -= 20;
    } else if (complexity.overall > 6) {
      factors.push({
        name: 'Moderate Complexity',
        weight: 0.15,
        contribution: -10,
        description: 'Moderate complexity (7-8/10) adds some risk'
      });
      baseProbability -= 10;
    } else if (complexity.overall < 4) {
      factors.push({
        name: 'Low Complexity',
        weight: 0.1,
        contribution: 10,
        description: 'Low complexity (1-3/10) improves success chances'
      });
      baseProbability += 10;
    }

    // Architecture quality factor
    if (complexity.architecture.maintainabilityIndex > 80) {
      factors.push({
        name: 'High Maintainability',
        weight: 0.15,
        contribution: 15,
        description: 'High maintainability index improves success likelihood'
      });
      baseProbability += 15;
    } else if (complexity.architecture.maintainabilityIndex < 40) {
      factors.push({
        name: 'Poor Maintainability',
        weight: 0.2,
        contribution: -25,
        description: 'Low maintainability index significantly increases risk'
      });
      baseProbability -= 25;
    }

    // Testing factor
    if (complexity.testing.coveragePercentage > 80) {
      factors.push({
        name: 'High Test Coverage',
        weight: 0.1,
        contribution: 10,
        description: 'High test coverage reduces implementation risk'
      });
      baseProbability += 10;
    } else if (complexity.testing.coveragePercentage < 30) {
      factors.push({
        name: 'Low Test Coverage',
        weight: 0.15,
        contribution: -15,
        description: 'Low test coverage increases debugging and integration risk'
      });
      baseProbability -= 15;
    }

    // Technical debt factor
    if (complexity.architecture.technicalDebtHours > 200) {
      factors.push({
        name: 'Extreme Technical Debt',
        weight: 0.2,
        contribution: -30,
        description: 'Extreme technical debt creates major obstacles'
      });
      baseProbability -= 30;
    } else if (complexity.architecture.technicalDebtHours > 100) {
      factors.push({
        name: 'High Technical Debt',
        weight: 0.15,
        contribution: -20,
        description: 'High technical debt slows progress and increases complexity'
      });
      baseProbability -= 20;
    }

    // Documentation factor
    if (complexity.documentation.completenessPercentage > 80) {
      factors.push({
        name: 'Excellent Documentation',
        weight: 0.08,
        contribution: 8,
        description: 'Comprehensive documentation speeds understanding'
      });
      baseProbability += 8;
    } else if (complexity.documentation.completenessPercentage < 30) {
      factors.push({
        name: 'Poor Documentation',
        weight: 0.1,
        contribution: -12,
        description: 'Poor documentation slows progress and increases errors'
      });
      baseProbability -= 12;
    }

    // Dependency risk factor
    const criticalVulns = complexity.dependencies.vulnerabilities.filter(v => v.severity === 'critical').length;
    if (criticalVulns > 0) {
      factors.push({
        name: 'Critical Security Vulnerabilities',
        weight: 0.12,
        contribution: -criticalVulns * 10,
        description: `${criticalVulns} critical vulnerabilities require immediate attention`
      });
      baseProbability -= criticalVulns * 10;
    }

    // Calculate confidence based on data quality and quantity
    let confidence = 60; // Base confidence
    if (similarProjects.length >= 3) confidence += 20;
    if (similarProjects.length >= 1) confidence += 10;
    if (factors.length >= 5) confidence += 10; // More factors = better analysis

    const probability = Math.max(10, Math.min(95, Math.round(baseProbability)));
    confidence = Math.max(30, Math.min(90, confidence));

    return {
      probability,
      confidence,
      factors
    };
  }

  private async generateOptimizations(complexity: ComplexityMetrics, similarProjects: SimilarProject[]): Promise<OptimizationRecommendation[]> {
    const optimizations: OptimizationRecommendation[] = [];

    // Learn from successful similar projects
    const successfulProjects = similarProjects.filter(p => p.success);
    const failedProjects = similarProjects.filter(p => !p.success);

    // Model allocation optimizations
    if (complexity.overall > 7) {
      const avgDuration = successfulProjects.length > 0 
        ? successfulProjects.reduce((sum, p) => sum + p.actualDuration, 0) / successfulProjects.length
        : 0;
      
      if (avgDuration > 0 && avgDuration < 600) { // Less than 10 hours
        optimizations.push({
          type: 'model_allocation',
          recommendation: 'Use Opus for initial architecture analysis, then switch to Sonnet for implementation',
          expectedImprovement: 25,
          implementation: 'Allocate first 2-3 hours to Opus for complex analysis, remainder to Sonnet',
          priority: 'high'
        });
      }
    }

    // Session sequencing optimizations
    if (complexity.testing.coveragePercentage < 50) {
      optimizations.push({
        type: 'session_sequencing',
        recommendation: 'Implement test-driven development approach',
        expectedImprovement: 30,
        implementation: 'Write tests before implementation to reduce debugging time',
        priority: 'high'
      });
    }

    // Time management optimizations
    const hasTimeOverruns = failedProjects.some(p => p.actualDuration > p.actualDuration * 1.5);
    if (hasTimeOverruns) {
      optimizations.push({
        type: 'time_management',
        recommendation: 'Break project into smaller, incremental milestones',
        expectedImprovement: 20,
        implementation: 'Create 2-hour focused sessions with clear deliverables',
        priority: 'medium'
      });
    }

    // Complexity reduction optimizations
    if (complexity.architecture.technicalDebtHours > 100) {
      optimizations.push({
        type: 'complexity_reduction',
        recommendation: 'Address technical debt before new feature development',
        expectedImprovement: 35,
        implementation: 'Dedicate first 25% of time to refactoring and cleanup',
        priority: 'high'
      });
    }

    if (complexity.dependencies.outdatedDependencies > complexity.dependencies.totalDependencies * 0.3) {
      optimizations.push({
        type: 'complexity_reduction',
        recommendation: 'Update dependencies before major changes',
        expectedImprovement: 15,
        implementation: 'Spend initial session updating and testing dependency upgrades',
        priority: 'medium'
      });
    }

    // Documentation optimizations
    if (complexity.documentation.completenessPercentage < 40) {
      optimizations.push({
        type: 'time_management',
        recommendation: 'Start with documentation review and creation',
        expectedImprovement: 10,
        implementation: 'Begin with understanding and documenting existing architecture',
        priority: 'low'
      });
    }

    return optimizations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedImprovement - a.expectedImprovement;
    });
  }

  private async analyzeTrends(complexity: ComplexityMetrics): Promise<ProjectTrend[]> {
    const trends: ProjectTrend[] = [];

    // Mock trend analysis based on complexity characteristics
    if (complexity.overall > 7) {
      trends.push({
        period: 'Last 3 months',
        metric: 'High Complexity Project Success Rate',
        value: 65,
        change: -8,
        trend: 'declining'
      });
    }

    if (complexity.testing.coveragePercentage < 50) {
      trends.push({
        period: 'Last 6 months',
        metric: 'Low Test Coverage Project Duration',
        value: 450, // minutes
        change: 15,
        trend: 'declining'
      });
    }

    if (complexity.architecture.technicalDebtHours > 100) {
      trends.push({
        period: 'Last 6 months',
        metric: 'High Tech Debt Project Success',
        value: 45,
        change: -12,
        trend: 'declining'
      });
    }

    trends.push({
      period: 'Last month',
      metric: 'Average Session Duration',
      value: 180,
      change: 5,
      trend: 'stable'
    });

    trends.push({
      period: 'Last 3 months',
      metric: 'Sonnet vs Opus Efficiency Ratio',
      value: 1.4,
      change: 8,
      trend: 'improving'
    });

    return trends;
  }

  // Learning and adaptation methods
  async recordOutcome(sessionId: string, outcome: SessionOutcome): Promise<void> {
    console.log(`📝 Recording session outcome for learning: ${sessionId}`);
    
    this.sessionHistory.push(outcome);
    
    // Update learning model based on outcome
    await this.updateLearningModel(outcome);
    
    // Store in persistent storage (mock)
    await this.persistOutcome(outcome);
  }

  async updateModels(outcomes: SessionOutcome[]): Promise<void> {
    console.log(`🧠 Updating learning models with ${outcomes.length} outcomes`);
    
    for (const outcome of outcomes) {
      await this.updateLearningModel(outcome);
    }
    
    // Recalibrate prediction models
    await this.recalibrateModels();
  }

  async getRecommendations(context: ProjectContext): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Quota-based recommendations
    if (context.currentQuotas.sonnet.percentage > 80) {
      recommendations.push({
        type: 'model_allocation',
        recommendation: 'Consider using Opus for complex tasks to preserve Sonnet quota',
        expectedImprovement: 15,
        implementation: 'Switch complex analysis tasks to Opus model',
        priority: 'medium'
      });
    }

    if (context.currentQuotas.opus.percentage > 80) {
      recommendations.push({
        type: 'model_allocation',
        recommendation: 'Use Sonnet for routine tasks to preserve Opus quota',
        expectedImprovement: 20,
        implementation: 'Delegate implementation and testing tasks to Sonnet',
        priority: 'high'
      });
    }

    // Time constraint recommendations
    if (context.timeConstraints?.deadline) {
      const timeRemaining = context.timeConstraints.deadline - Date.now();
      const hoursRemaining = timeRemaining / (1000 * 60 * 60);
      
      if (hoursRemaining < 24) {
        recommendations.push({
          type: 'time_management',
          recommendation: 'Focus on MVP features only due to tight deadline',
          expectedImprovement: 40,
          implementation: 'Prioritize core functionality, defer nice-to-have features',
          priority: 'high'
        });
      }
    }

    // Complexity-based recommendations
    if (context.complexity.overall > 8) {
      recommendations.push({
        type: 'session_sequencing',
        recommendation: 'Break high-complexity project into focused sessions',
        expectedImprovement: 25,
        implementation: 'Create 2-3 hour focused sessions with specific goals',
        priority: 'high'
      });
    }

    // Risk tolerance recommendations
    if (context.preferences?.riskTolerance === 'low') {
      recommendations.push({
        type: 'model_allocation',
        recommendation: 'Use Opus for critical decisions to minimize risk',
        expectedImprovement: 30,
        implementation: 'Allocate Opus to architecture decisions and complex implementation',
        priority: 'medium'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedImprovement - a.expectedImprovement;
    });
  }

  async predictOutcome(plan: SessionPlan, insights: HistoricalInsights): Promise<SuccessPrediction> {
    const factors: PredictionFactor[] = [];
    let probability = insights.successPrediction.probability; // Start with historical success prediction
    
    // Factor in plan characteristics
    if (plan.confidence > 80) {
      factors.push({
        name: 'High Plan Confidence',
        weight: 0.15,
        contribution: 10,
        description: 'Well-analyzed plan with high confidence'
      });
      probability += 10;
    } else if (plan.confidence < 50) {
      factors.push({
        name: 'Low Plan Confidence',
        weight: 0.2,
        contribution: -15,
        description: 'Uncertain plan with many unknowns'
      });
      probability -= 15;
    }

    // Model allocation factor
    const opusRatio = plan.modelAllocation.opus.percentage / 100;
    if (plan.totalEstimatedTime > 600 && opusRatio < 0.2) { // Long project with little Opus
      factors.push({
        name: 'Insufficient Opus Allocation',
        weight: 0.12,
        contribution: -10,
        description: 'Complex project may need more Opus for architectural decisions'
      });
      probability -= 10;
    }

    // Time estimation factor
    if (plan.totalEstimatedTime > 8 * 60) { // More than 8 hours
      factors.push({
        name: 'Long Session Duration',
        weight: 0.1,
        contribution: -8,
        description: 'Long sessions have higher probability of scope creep'
      });
      probability -= 8;
    }

    // Buffer analysis
    const bufferRatio = plan.tokenBudget.buffer / plan.tokenBudget.total;
    if (bufferRatio < 0.15) { // Less than 15% buffer
      factors.push({
        name: 'Insufficient Buffer',
        weight: 0.08,
        contribution: -5,
        description: 'Low buffer increases risk of quota overrun'
      });
      probability -= 5;
    }

    // Historical similarity factor
    const avgSimilarity = insights.similarProjects.reduce((sum, p) => sum + p.similarity, 0) / Math.max(insights.similarProjects.length, 1);
    if (avgSimilarity > 70) {
      factors.push({
        name: 'Strong Historical Matches',
        weight: 0.15,
        contribution: 12,
        description: 'High similarity to successful historical projects'
      });
      probability += 12;
    }

    const finalProbability = Math.max(10, Math.min(95, Math.round(probability)));
    const confidence = Math.max(40, Math.min(90, insights.successPrediction.confidence));

    return {
      probability: finalProbability,
      confidence,
      factors: [...insights.successPrediction.factors, ...factors]
    };
  }

  // Private implementation methods
  private initializeLearningModel(): LearningModel {
    return {
      successFactors: {
        'high_test_coverage': 0.15,
        'good_documentation': 0.10,
        'low_technical_debt': 0.20,
        'moderate_complexity': 0.12,
        'opus_for_architecture': 0.18,
        'sonnet_for_implementation': 0.10,
        'incremental_approach': 0.15
      },
      riskFactors: {
        'high_complexity': 0.25,
        'poor_test_coverage': 0.18,
        'high_technical_debt': 0.22,
        'outdated_dependencies': 0.15,
        'poor_documentation': 0.12,
        'tight_deadlines': 0.20
      },
      optimizationPatterns: {},
      trendAnalysis: []
    };
  }

  private loadProjectPatterns(): ProjectPattern[] {
    return [
      {
        id: 'web-app-react',
        projectType: 'React Web Application',
        complexityRange: [5, 8],
        successRate: 75,
        averageDuration: 480, // 8 hours
        commonIssues: ['State management complexity', 'API integration challenges', 'Testing setup'],
        bestPractices: ['Use TypeScript', 'Implement proper testing', 'Modular component structure'],
        modelPreference: 'mixed'
      },
      {
        id: 'api-backend',
        projectType: 'REST API Backend',
        complexityRange: [4, 7],
        successRate: 82,
        averageDuration: 360, // 6 hours
        commonIssues: ['Database design', 'Authentication complexity', 'Error handling'],
        bestPractices: ['Design-first approach', 'Comprehensive testing', 'Clear documentation'],
        modelPreference: 'mixed'
      },
      {
        id: 'data-analysis',
        projectType: 'Data Analysis Pipeline',
        complexityRange: [6, 9],
        successRate: 68,
        averageDuration: 600, // 10 hours
        commonIssues: ['Data quality issues', 'Performance optimization', 'Visualization complexity'],
        bestPractices: ['Data validation', 'Incremental processing', 'Clear documentation'],
        modelPreference: 'opus'
      },
      {
        id: 'ui-component',
        projectType: 'UI Component Library',
        complexityRange: [3, 6],
        successRate: 85,
        averageDuration: 240, // 4 hours
        commonIssues: ['Design consistency', 'Browser compatibility', 'Documentation'],
        bestPractices: ['Storybook integration', 'Comprehensive testing', 'Design system'],
        modelPreference: 'sonnet'
      }
    ];
  }

  private generateMockHistoricalProjects(): Array<SimilarProject & { complexity: ComplexityMetrics }> {
    // Mock historical project data with complexity metrics
    return [
      {
        id: 'proj-001',
        name: 'E-commerce Dashboard Refactor',
        similarity: 0, // Will be calculated
        complexity: {
          overall: 7.2,
          codebase: { score: 7, fileCount: 245, linesOfCode: 12500, cyclomaticComplexity: 18, duplicateCodePercentage: 12, languageCount: 3, factors: [] },
          dependencies: { score: 6, totalDependencies: 85, outdatedDependencies: 12, vulnerabilities: [], dependencyDepth: 8, factors: [] },
          architecture: { score: 8, maintainabilityIndex: 65, technicalDebtHours: 45, couplingScore: 6.2, cohesionScore: 7.1, factors: [] },
          testing: { score: 6, coveragePercentage: 68, testFileCount: 45, testQualityScore: 6.5, factors: [] },
          documentation: { score: 5, completenessPercentage: 55, readmeQuality: 6, apiDocumentationScore: 5.5, factors: [] }
        },
        actualDuration: 420,
        tokensUsed: 8500,
        success: true,
        lessons: ['Start with dependency updates', 'Focus on test coverage first', 'Document architecture decisions']
      },
      {
        id: 'proj-002',
        name: 'API Gateway Implementation',
        similarity: 0,
        complexity: {
          overall: 8.5,
          codebase: { score: 8, fileCount: 180, linesOfCode: 15000, cyclomaticComplexity: 22, duplicateCodePercentage: 8, languageCount: 2, factors: [] },
          dependencies: { score: 7, totalDependencies: 120, outdatedDependencies: 25, vulnerabilities: [], dependencyDepth: 12, factors: [] },
          architecture: { score: 9, maintainabilityIndex: 45, technicalDebtHours: 120, couplingScore: 8.1, cohesionScore: 5.2, factors: [] },
          testing: { score: 4, coveragePercentage: 35, testFileCount: 15, testQualityScore: 4.2, factors: [] },
          documentation: { score: 3, completenessPercentage: 25, readmeQuality: 3.5, apiDocumentationScore: 2.8, factors: [] }
        },
        actualDuration: 720,
        tokensUsed: 15500,
        success: false,
        lessons: ['Poor documentation caused delays', 'Testing was inadequate', 'Should have used Opus for architecture']
      },
      {
        id: 'proj-003',
        name: 'Mobile App Backend',
        similarity: 0,
        complexity: {
          overall: 6.1,
          codebase: { score: 6, fileCount: 95, linesOfCode: 8500, cyclomaticComplexity: 12, duplicateCodePercentage: 15, languageCount: 2, factors: [] },
          dependencies: { score: 5, totalDependencies: 45, outdatedDependencies: 8, vulnerabilities: [], dependencyDepth: 6, factors: [] },
          architecture: { score: 7, maintainabilityIndex: 72, technicalDebtHours: 28, couplingScore: 5.5, cohesionScore: 6.8, factors: [] },
          testing: { score: 8, coveragePercentage: 85, testFileCount: 35, testQualityScore: 7.8, factors: [] },
          documentation: { score: 7, completenessPercentage: 75, readmeQuality: 7.5, apiDocumentationScore: 6.9, factors: [] }
        },
        actualDuration: 360,
        tokensUsed: 6800,
        success: true,
        lessons: ['Good testing saved time', 'Clear documentation helped', 'Sonnet worked well for implementation']
      }
    ];
  }

  private async updateLearningModel(outcome: SessionOutcome): Promise<void> {
    // Update success/risk factors based on outcome
    const isSuccess = outcome.success;
    const complexityLevel = outcome.complexity > 7 ? 'high' : outcome.complexity > 4 ? 'medium' : 'low';
    
    // Adjust learning weights based on outcome
    if (isSuccess) {
      if (outcome.model === 'opus' && complexityLevel === 'high') {
        this.learningModel.successFactors['opus_for_architecture'] += 0.01;
      }
      if (outcome.model === 'sonnet' && complexityLevel !== 'high') {
        this.learningModel.successFactors['sonnet_for_implementation'] += 0.01;
      }
    } else {
      // Learn from failures
      if (outcome.actualDuration > outcome.plannedDuration * 1.5) {
        this.learningModel.riskFactors['poor_time_estimation'] = 
          (this.learningModel.riskFactors['poor_time_estimation'] || 0) + 0.02;
      }
    }
  }

  private async recalibrateModels(): Promise<void> {
    // Normalize weights
    const successSum = Object.values(this.learningModel.successFactors).reduce((sum, val) => sum + val, 0);
    const riskSum = Object.values(this.learningModel.riskFactors).reduce((sum, val) => sum + val, 0);
    
    // Normalize to sum to 1.0
    for (const key in this.learningModel.successFactors) {
      this.learningModel.successFactors[key] /= successSum;
    }
    
    for (const key in this.learningModel.riskFactors) {
      this.learningModel.riskFactors[key] /= riskSum;
    }
  }

  private async persistOutcome(outcome: SessionOutcome): Promise<void> {
    // Mock persistence - in production would save to database
    console.log(`💾 Persisting session outcome for future learning`);
  }
}