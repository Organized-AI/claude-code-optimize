import {
  ComplexityMetrics,
  RiskAssessment,
  QuotaRisk,
  TimeRisk,
  ComplexityRisk,
  QuotaUsage,
  RiskFactor,
  MitigationStrategy
} from '../../contracts/AgentInterfaces.js';

interface RiskModel {
  quotaExceededThreshold: number; // 90% - never allow exceeding this
  timeOverrunProbability: Record<string, number>;
  complexityRiskFactors: Record<string, number>;
  mitigationEffectiveness: Record<string, number>;
}

export class RiskAssessmentService {
  private readonly QUOTA_SAFETY_LIMIT = 0.90; // Never exceed 90% of weekly quota
  private readonly WEEKLY_QUOTAS = {
    sonnet: 480, // hours per week
    opus: 40     // hours per week
  };

  private riskModel: RiskModel = {
    quotaExceededThreshold: 0.90,
    timeOverrunProbability: {
      'low_complexity': 0.15,
      'medium_complexity': 0.35,
      'high_complexity': 0.65,
      'very_high_complexity': 0.85
    },
    complexityRiskFactors: {
      'high_file_count': 0.20,
      'high_dependency_count': 0.15,
      'outdated_dependencies': 0.25,
      'security_vulnerabilities': 0.30,
      'low_test_coverage': 0.20,
      'high_technical_debt': 0.35,
      'poor_documentation': 0.15,
      'high_coupling': 0.25,
      'low_maintainability': 0.40
    },
    mitigationEffectiveness: {
      'switch_to_sonnet': 0.60,
      'reduce_scope': 0.80,
      'add_buffer_time': 0.45,
      'incremental_approach': 0.70,
      'dependency_cleanup': 0.55,
      'test_first_approach': 0.50,
      'documentation_review': 0.30
    }
  };

  async assessRisk(complexity: ComplexityMetrics, currentQuotas: QuotaUsage): Promise<RiskAssessment> {
    console.log('🎯 Starting comprehensive risk assessment...');

    // Parallel risk assessment for different risk types
    const [quotaRisk, timeRisk, complexityRisk] = await Promise.all([
      this.assessQuotaRisk(complexity, currentQuotas),
      this.assessTimeRisk(complexity),
      this.assessComplexityRisk(complexity)
    ]);

    // Generate mitigation strategies based on identified risks
    const mitigationStrategies = await this.generateMitigationStrategies(
      quotaRisk, 
      timeRisk, 
      complexityRisk, 
      complexity
    );

    // Calculate overall risk score (weighted combination)
    const overall = this.calculateOverallRisk(quotaRisk, timeRisk, complexityRisk);

    const assessment: RiskAssessment = {
      overall,
      quotaRisk,
      timeRisk,
      complexityRisk,
      mitigationStrategies
    };

    console.log(`✅ Risk assessment complete. Overall risk: ${overall}%`);
    console.log(`⚠️  Quota risk: ${quotaRisk.probability}%`);
    console.log(`⏱️  Time risk: ${timeRisk.probability}%`);
    console.log(`🔧 Complexity risk: ${complexityRisk.probability}%`);

    return assessment;
  }

  private async assessQuotaRisk(complexity: ComplexityMetrics, currentQuotas: QuotaUsage): Promise<QuotaRisk> {
    // Calculate current usage percentages
    const sonnetUsagePercent = (currentQuotas.sonnet.used / this.WEEKLY_QUOTAS.sonnet) * 100;
    const opusUsagePercent = (currentQuotas.opus.used / this.WEEKLY_QUOTAS.opus) * 100;

    // Project additional usage based on complexity
    const projectedAdditionalUsage = this.projectUsageFromComplexity(complexity);
    
    const projectedSonnetTotal = currentQuotas.sonnet.used + projectedAdditionalUsage.sonnet;
    const projectedOpusTotal = currentQuotas.opus.used + projectedAdditionalUsage.opus;

    const projectedSonnetPercent = (projectedSonnetTotal / this.WEEKLY_QUOTAS.sonnet) * 100;
    const projectedOpusPercent = (projectedOpusTotal / this.WEEKLY_QUOTAS.opus) * 100;

    // Calculate probability of exceeding 90% quota
    let probability = 0;
    
    if (projectedSonnetPercent > 90) probability += 50;
    if (projectedOpusPercent > 90) probability += 50;
    
    // Adjust based on complexity
    if (complexity.overall > 8) probability += 30;
    else if (complexity.overall > 6) probability += 20;
    else if (complexity.overall > 4) probability += 10;
    
    // Factor in current usage
    if (sonnetUsagePercent > 80) probability += 25;
    else if (sonnetUsagePercent > 70) probability += 15;
    else if (sonnetUsagePercent > 60) probability += 10;
    
    if (opusUsagePercent > 80) probability += 25;
    else if (opusUsagePercent > 70) probability += 15;
    else if (opusUsagePercent > 60) probability += 10;

    probability = Math.min(100, Math.max(0, probability));

    // Calculate time to reach 90% limit
    const timeToSonnetLimit = this.calculateTimeToLimit(currentQuotas.sonnet, this.WEEKLY_QUOTAS.sonnet * 0.9);
    const timeToOpusLimit = this.calculateTimeToLimit(currentQuotas.opus, this.WEEKLY_QUOTAS.opus * 0.9);
    const timeToLimit = Math.min(timeToSonnetLimit, timeToOpusLimit);

    // Generate recommendations
    const recommendations = this.generateQuotaRecommendations(
      projectedSonnetPercent,
      projectedOpusPercent,
      complexity
    );

    return {
      probability,
      currentUsage: currentQuotas,
      projectedUsage: {
        sonnet: {
          used: projectedSonnetTotal,
          limit: this.WEEKLY_QUOTAS.sonnet,
          percentage: projectedSonnetPercent
        },
        opus: {
          used: projectedOpusTotal,
          limit: this.WEEKLY_QUOTAS.opus,
          percentage: projectedOpusPercent
        }
      },
      timeToLimit,
      recommendations
    };
  }

  private async assessTimeRisk(complexity: ComplexityMetrics): Promise<TimeRisk> {
    // Estimate base duration from complexity
    const baseDuration = this.estimateDurationFromComplexity(complexity);
    
    // Identify risk factors that could cause time overruns
    const factors: RiskFactor[] = [];
    
    // Codebase complexity factors
    if (complexity.codebase.score > 8) {
      factors.push({
        name: 'High Codebase Complexity',
        probability: 70,
        impact: 8,
        description: `Very complex codebase (${complexity.codebase.score}/10) may require more time than estimated`
      });
    } else if (complexity.codebase.score > 6) {
      factors.push({
        name: 'Moderate Codebase Complexity',
        probability: 40,
        impact: 5,
        description: `Moderately complex codebase (${complexity.codebase.score}/10) may extend timeline`
      });
    }

    // Dependency risk factors
    if (complexity.dependencies.score > 7) {
      factors.push({
        name: 'Dependency Complexity',
        probability: 60,
        impact: 6,
        description: `Complex dependency structure may cause integration delays`
      });
    }

    // Architecture factors
    if (complexity.architecture.technicalDebtHours > 100) {
      factors.push({
        name: 'High Technical Debt',
        probability: 75,
        impact: 9,
        description: `${complexity.architecture.technicalDebtHours} hours of technical debt may slow progress`
      });
    }

    // Testing factors
    if (complexity.testing.coveragePercentage < 50) {
      factors.push({
        name: 'Low Test Coverage',
        probability: 55,
        impact: 6,
        description: `Low test coverage (${complexity.testing.coveragePercentage.toFixed(1)}%) increases debugging time`
      });
    }

    // Documentation factors
    if (complexity.documentation.completenessPercentage < 40) {
      factors.push({
        name: 'Poor Documentation',
        probability: 45,
        impact: 5,
        description: `Incomplete documentation may require additional research time`
      });
    }

    // Calculate overall time overrun probability
    const averageFactorProbability = factors.length > 0 
      ? factors.reduce((sum, f) => sum + f.probability, 0) / factors.length
      : 20; // Base probability

    let probability = Math.min(85, averageFactorProbability);
    
    // Adjust based on overall complexity
    if (complexity.overall > 8) probability += 15;
    else if (complexity.overall > 6) probability += 10;
    else if (complexity.overall > 4) probability += 5;

    // Calculate confidence in estimate (inverse of risk factors)
    const confidence = Math.max(20, 100 - (factors.length * 10) - (complexity.overall * 5));
    
    // Calculate recommended buffer time
    const bufferTime = Math.ceil(baseDuration * (probability / 100) * 0.5); // 50% of risk as buffer

    return {
      probability: Math.round(probability),
      estimatedDuration: baseDuration,
      confidence: Math.round(confidence),
      bufferTime,
      factors
    };
  }

  private async assessComplexityRisk(complexity: ComplexityMetrics): Promise<ComplexityRisk> {
    const riskFactors: RiskFactor[] = [];
    
    // Analyze each complexity dimension for risks
    this.analyzeCodebaseRisks(complexity.codebase, riskFactors);
    this.analyzeDependencyRisks(complexity.dependencies, riskFactors);
    this.analyzeArchitectureRisks(complexity.architecture, riskFactors);
    this.analyzeTestingRisks(complexity.testing, riskFactors);
    this.analyzeDocumentationRisks(complexity.documentation, riskFactors);

    // Calculate overall complexity risk probability
    const highRiskFactors = riskFactors.filter(f => f.impact >= 7);
    const mediumRiskFactors = riskFactors.filter(f => f.impact >= 4 && f.impact < 7);
    
    let probability = 10; // Base probability
    probability += highRiskFactors.length * 15;
    probability += mediumRiskFactors.length * 8;
    probability += (complexity.overall - 5) * 10; // Adjust for overall complexity
    
    probability = Math.min(95, Math.max(5, probability));

    // Identify impact areas
    const impactAreas = this.identifyImpactAreas(riskFactors, complexity);

    return {
      probability: Math.round(probability),
      riskFactors,
      impactAreas
    };
  }

  private analyzeCodebaseRisks(codebase: any, riskFactors: RiskFactor[]): void {
    if (codebase.fileCount > 500) {
      riskFactors.push({
        name: 'High File Count',
        probability: 60,
        impact: 7,
        description: `${codebase.fileCount} files may be difficult to navigate and modify`
      });
    }

    if (codebase.cyclomaticComplexity > 15) {
      riskFactors.push({
        name: 'High Cyclomatic Complexity',
        probability: 70,
        impact: 8,
        description: `High cyclomatic complexity makes code harder to understand and modify`
      });
    }

    if (codebase.duplicateCodePercentage > 15) {
      riskFactors.push({
        name: 'Code Duplication',
        probability: 50,
        impact: 6,
        description: `${codebase.duplicateCodePercentage.toFixed(1)}% duplicate code increases maintenance burden`
      });
    }

    if (codebase.languageCount > 5) {
      riskFactors.push({
        name: 'Language Diversity',
        probability: 40,
        impact: 5,
        description: `${codebase.languageCount} different languages require diverse expertise`
      });
    }
  }

  private analyzeDependencyRisks(dependencies: any, riskFactors: RiskFactor[]): void {
    if (dependencies.totalDependencies > 100) {
      riskFactors.push({
        name: 'High Dependency Count',
        probability: 55,
        impact: 6,
        description: `${dependencies.totalDependencies} dependencies increase integration complexity`
      });
    }

    if (dependencies.outdatedDependencies > dependencies.totalDependencies * 0.3) {
      riskFactors.push({
        name: 'Outdated Dependencies',
        probability: 65,
        impact: 7,
        description: `${dependencies.outdatedDependencies} outdated dependencies pose security and compatibility risks`
      });
    }

    const criticalVulns = dependencies.vulnerabilities.filter((v: any) => v.severity === 'critical').length;
    if (criticalVulns > 0) {
      riskFactors.push({
        name: 'Critical Security Vulnerabilities',
        probability: 80,
        impact: 9,
        description: `${criticalVulns} critical vulnerabilities require immediate attention`
      });
    }

    if (dependencies.dependencyDepth > 10) {
      riskFactors.push({
        name: 'Deep Dependency Tree',
        probability: 45,
        impact: 5,
        description: `Dependency depth of ${dependencies.dependencyDepth} increases conflict risk`
      });
    }
  }

  private analyzeArchitectureRisks(architecture: any, riskFactors: RiskFactor[]): void {
    if (architecture.maintainabilityIndex < 40) {
      riskFactors.push({
        name: 'Low Maintainability',
        probability: 75,
        impact: 8,
        description: `Maintainability index of ${architecture.maintainabilityIndex.toFixed(1)} indicates hard-to-maintain code`
      });
    }

    if (architecture.technicalDebtHours > 100) {
      riskFactors.push({
        name: 'High Technical Debt',
        probability: 70,
        impact: 9,
        description: `${architecture.technicalDebtHours} hours of technical debt will slow development`
      });
    }

    if (architecture.couplingScore > 7) {
      riskFactors.push({
        name: 'High Coupling',
        probability: 60,
        impact: 7,
        description: `High coupling score (${architecture.couplingScore.toFixed(1)}) makes changes risky`
      });
    }

    if (architecture.cohesionScore < 4) {
      riskFactors.push({
        name: 'Low Cohesion',
        probability: 55,
        impact: 6,
        description: `Low cohesion score (${architecture.cohesionScore.toFixed(1)}) indicates poor module organization`
      });
    }
  }

  private analyzeTestingRisks(testing: any, riskFactors: RiskFactor[]): void {
    if (testing.coveragePercentage < 50) {
      riskFactors.push({
        name: 'Low Test Coverage',
        probability: 65,
        impact: 7,
        description: `${testing.coveragePercentage.toFixed(1)}% test coverage increases bug risk`
      });
    }

    if (testing.testQualityScore < 5) {
      riskFactors.push({
        name: 'Poor Test Quality',
        probability: 50,
        impact: 6,
        description: `Low test quality score (${testing.testQualityScore.toFixed(1)}) may not catch bugs effectively`
      });
    }
  }

  private analyzeDocumentationRisks(documentation: any, riskFactors: RiskFactor[]): void {
    if (documentation.completenessPercentage < 40) {
      riskFactors.push({
        name: 'Poor Documentation',
        probability: 45,
        impact: 5,
        description: `${documentation.completenessPercentage.toFixed(1)}% documentation completeness slows understanding`
      });
    }

    if (documentation.readmeQuality < 5) {
      riskFactors.push({
        name: 'Poor README',
        probability: 40,
        impact: 4,
        description: `Low README quality score makes project harder to understand`
      });
    }
  }

  private identifyImpactAreas(riskFactors: RiskFactor[], complexity: ComplexityMetrics): string[] {
    const areas = new Set<string>();

    if (riskFactors.some(f => f.name.includes('File Count') || f.name.includes('Complexity'))) {
      areas.add('Development Speed');
    }

    if (riskFactors.some(f => f.name.includes('Dependencies') || f.name.includes('Vulnerabilities'))) {
      areas.add('Security & Stability');
    }

    if (riskFactors.some(f => f.name.includes('Technical Debt') || f.name.includes('Maintainability'))) {
      areas.add('Code Quality');
    }

    if (riskFactors.some(f => f.name.includes('Test') || f.name.includes('Coverage'))) {
      areas.add('Reliability');
    }

    if (riskFactors.some(f => f.name.includes('Documentation'))) {
      areas.add('Knowledge Transfer');
    }

    if (complexity.overall > 7) {
      areas.add('Project Completion');
    }

    return Array.from(areas);
  }

  private async generateMitigationStrategies(
    quotaRisk: QuotaRisk,
    timeRisk: TimeRisk,
    complexityRisk: ComplexityRisk,
    complexity: ComplexityMetrics
  ): Promise<MitigationStrategy[]> {
    const strategies: MitigationStrategy[] = [];

    // Quota risk mitigation
    if (quotaRisk.probability > 60) {
      strategies.push({
        riskType: 'quota',
        strategy: 'Switch to Sonnet for routine tasks to preserve Opus quota',
        impact: 8,
        effort: 3,
        priority: 'high'
      });

      strategies.push({
        riskType: 'quota',
        strategy: 'Reduce project scope to fit within quota limits',
        impact: 9,
        effort: 5,
        priority: 'high'
      });
    }

    if (quotaRisk.probability > 40) {
      strategies.push({
        riskType: 'quota',
        strategy: 'Implement more efficient prompting strategies',
        impact: 6,
        effort: 4,
        priority: 'medium'
      });
    }

    // Time risk mitigation
    if (timeRisk.probability > 70) {
      strategies.push({
        riskType: 'time',
        strategy: 'Break project into smaller, incremental phases',
        impact: 7,
        effort: 6,
        priority: 'high'
      });

      strategies.push({
        riskType: 'time',
        strategy: `Add ${Math.ceil(timeRisk.bufferTime / 60)} hour buffer to timeline`,
        impact: 6,
        effort: 2,
        priority: 'medium'
      });
    }

    if (complexity.testing.coveragePercentage < 50) {
      strategies.push({
        riskType: 'time',
        strategy: 'Prioritize test creation to reduce debugging time',
        impact: 5,
        effort: 7,
        priority: 'medium'
      });
    }

    // Complexity risk mitigation
    if (complexityRisk.probability > 60) {
      strategies.push({
        riskType: 'complexity',
        strategy: 'Start with architectural analysis before code changes',
        impact: 7,
        effort: 4,
        priority: 'high'
      });

      if (complexity.dependencies.outdatedDependencies > 5) {
        strategies.push({
          riskType: 'complexity',
          strategy: 'Update critical dependencies first to reduce risk',
          impact: 6,
          effort: 8,
          priority: 'medium'
        });
      }
    }

    if (complexity.architecture.technicalDebtHours > 50) {
      strategies.push({
        riskType: 'complexity',
        strategy: 'Address high-impact technical debt before new features',
        impact: 8,
        effort: 9,
        priority: 'medium'
      });
    }

    if (complexity.documentation.completenessPercentage < 40) {
      strategies.push({
        riskType: 'complexity',
        strategy: 'Review existing documentation before starting development',
        impact: 4,
        effort: 3,
        priority: 'low'
      });
    }

    // Sort strategies by priority and impact
    return strategies.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact - a.impact;
    });
  }

  private calculateOverallRisk(quotaRisk: QuotaRisk, timeRisk: TimeRisk, complexityRisk: ComplexityRisk): number {
    // Weighted average with quota risk having highest weight (safety critical)
    const weights = {
      quota: 0.50,  // Highest weight - quota safety is critical
      time: 0.30,   // Time overruns are important but manageable
      complexity: 0.20  // Complexity risks are longer-term
    };

    const weightedRisk = 
      quotaRisk.probability * weights.quota +
      timeRisk.probability * weights.time +
      complexityRisk.probability * weights.complexity;

    return Math.round(weightedRisk);
  }

  private projectUsageFromComplexity(complexity: ComplexityMetrics): { sonnet: number; opus: number } {
    // Base usage estimation from complexity score
    const baseHours = complexity.overall * 2; // 2 hours per complexity point
    
    // Distribution between Sonnet and Opus based on complexity characteristics
    let opusRatio = 0.3; // Default 30% Opus
    
    // Increase Opus usage for complex architecture work
    if (complexity.architecture.score > 7) opusRatio += 0.2;
    if (complexity.dependencies.score > 7) opusRatio += 0.15;
    if (complexity.codebase.cyclomaticComplexity > 15) opusRatio += 0.1;
    
    // Decrease Opus usage for well-documented, tested projects
    if (complexity.testing.coveragePercentage > 80) opusRatio -= 0.1;
    if (complexity.documentation.completenessPercentage > 70) opusRatio -= 0.05;
    
    opusRatio = Math.min(0.7, Math.max(0.1, opusRatio)); // Clamp between 10-70%
    
    return {
      opus: baseHours * opusRatio,
      sonnet: baseHours * (1 - opusRatio)
    };
  }

  private calculateTimeToLimit(current: { used: number; limit: number }, targetLimit: number): number {
    const remaining = targetLimit - current.used;
    if (remaining <= 0) return 0;
    
    // Assume current rate of consumption continues
    // This is simplified - in reality you'd use historical usage patterns
    const currentRate = 0.5; // hours per hour (rough estimate)
    
    return remaining / currentRate * 60; // Convert to minutes
  }

  private generateQuotaRecommendations(
    projectedSonnetPercent: number,
    projectedOpusPercent: number,
    complexity: ComplexityMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (projectedSonnetPercent > 90) {
      recommendations.push('🚨 CRITICAL: Projected Sonnet usage exceeds 90% limit');
      recommendations.push('Reduce scope or delay project to avoid quota breach');
    } else if (projectedSonnetPercent > 80) {
      recommendations.push('⚠️ HIGH: Sonnet usage approaching limit');
      recommendations.push('Consider using Sonnet for routine tasks instead of Opus');
    }

    if (projectedOpusPercent > 90) {
      recommendations.push('🚨 CRITICAL: Projected Opus usage exceeds 90% limit');
      recommendations.push('Switch complex tasks to Sonnet or reduce project scope');
    } else if (projectedOpusPercent > 80) {
      recommendations.push('⚠️ HIGH: Opus usage approaching limit');
      recommendations.push('Reserve Opus for only the most complex architectural decisions');
    }

    if (complexity.overall > 8) {
      recommendations.push('Consider breaking high-complexity project into phases');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Quota usage is within safe limits');
      recommendations.push('Continue with planned approach');
    }

    return recommendations;
  }

  private estimateDurationFromComplexity(complexity: ComplexityMetrics): number {
    // Base duration calculation in minutes
    let baseDuration = 60; // 1 hour minimum
    
    // Add time based on complexity factors
    baseDuration += complexity.codebase.score * 30;        // 30 min per complexity point
    baseDuration += complexity.dependencies.score * 20;    // 20 min per dependency complexity point
    baseDuration += complexity.architecture.score * 45;    // 45 min per architecture complexity point
    baseDuration += (10 - complexity.testing.score) * 15; // More time for poor testing
    baseDuration += (10 - complexity.documentation.score) * 10; // More time for poor docs
    
    // Factor in specific metrics
    if (complexity.codebase.fileCount > 500) baseDuration += 120;
    if (complexity.dependencies.totalDependencies > 100) baseDuration += 90;
    if (complexity.architecture.technicalDebtHours > 50) baseDuration += complexity.architecture.technicalDebtHours * 2;
    
    return Math.round(baseDuration);
  }

  // Public utility methods for integration
  async validateQuotaSafety(plannedUsage: { sonnet: number; opus: number }, currentQuotas: QuotaUsage): Promise<{
    isSafe: boolean;
    warnings: string[];
    adjustments: string[];
  }> {
    const projectedSonnet = currentQuotas.sonnet.used + plannedUsage.sonnet;
    const projectedOpus = currentQuotas.opus.used + plannedUsage.opus;
    
    const sonnetPercent = (projectedSonnet / this.WEEKLY_QUOTAS.sonnet) * 100;
    const opusPercent = (projectedOpus / this.WEEKLY_QUOTAS.opus) * 100;
    
    const isSafe = sonnetPercent <= 90 && opusPercent <= 90;
    const warnings: string[] = [];
    const adjustments: string[] = [];
    
    if (sonnetPercent > 90) {
      warnings.push(`Sonnet usage would exceed 90% safety limit (${sonnetPercent.toFixed(1)}%)`);
      adjustments.push(`Reduce Sonnet usage by ${(projectedSonnet - this.WEEKLY_QUOTAS.sonnet * 0.9).toFixed(1)} hours`);
    }
    
    if (opusPercent > 90) {
      warnings.push(`Opus usage would exceed 90% safety limit (${opusPercent.toFixed(1)}%)`);
      adjustments.push(`Reduce Opus usage by ${(projectedOpus - this.WEEKLY_QUOTAS.opus * 0.9).toFixed(1)} hours`);
    }
    
    return { isSafe, warnings, adjustments };
  }

  async getQuotaStatus(currentQuotas: QuotaUsage): Promise<{
    sonnet: { status: 'safe' | 'warning' | 'critical'; remaining: number };
    opus: { status: 'safe' | 'warning' | 'critical'; remaining: number };
  }> {
    const sonnetPercent = currentQuotas.sonnet.percentage;
    const opusPercent = currentQuotas.opus.percentage;
    
    const getSafetyStatus = (percent: number) => {
      if (percent >= 90) return 'critical';
      if (percent >= 80) return 'warning';
      return 'safe';
    };
    
    return {
      sonnet: {
        status: getSafetyStatus(sonnetPercent),
        remaining: this.WEEKLY_QUOTAS.sonnet * 0.9 - currentQuotas.sonnet.used
      },
      opus: {
        status: getSafetyStatus(opusPercent),
        remaining: this.WEEKLY_QUOTAS.opus * 0.9 - currentQuotas.opus.used
      }
    };
  }
}