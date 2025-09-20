/**
 * Integration tests for Project Analysis Architect system
 * Tests the complete pipeline from complexity analysis to session planning
 */

import { ProjectAnalyzer } from '../src/server/services/ProjectAnalyzer.js';
import { ProjectAnalysisService } from '../src/server/services/ProjectAnalysisService.js';
import { RiskAssessmentService } from '../src/server/services/RiskAssessmentService.js';
import { SessionPlanningService } from '../src/server/services/SessionPlanningService.js';
import { HistoricalInsightsService } from '../src/server/services/HistoricalInsightsService.js';
import { describe, test, expect, beforeEach } from 'vitest';
import { QuotaUsage, AnalysisOptions } from '../src/contracts/AgentInterfaces.js';

describe('Project Analysis Architect Integration', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockQuotas: QuotaUsage;

  beforeEach(() => {
    projectAnalyzer = new ProjectAnalyzer();
    mockQuotas = {
      sonnet: {
        used: 234,
        limit: 480,
        percentage: 48.75
      },
      opus: {
        used: 18.5,
        limit: 40,
        percentage: 46.25
      }
    };
  });

  test('should perform complete project analysis pipeline', async () => {
    // Use the current project as test subject
    const projectPath = process.cwd();
    const options: AnalysisOptions = {
      includeTests: true,
      includeDocs: true,
      includeNodeModules: false,
      maxDepth: 5
    };

    console.log('🚀 Testing complete analysis pipeline...');
    
    const analysis = await projectAnalyzer.performCompleteAnalysis(projectPath, options);
    
    // Verify all components are present
    expect(analysis).toBeDefined();
    expect(analysis.complexity).toBeDefined();
    expect(analysis.risk).toBeDefined();
    expect(analysis.plan).toBeDefined();
    expect(analysis.insights).toBeDefined();
    expect(analysis.prediction).toBeDefined();
    expect(analysis.summary).toBeDefined();

    // Verify complexity analysis
    expect(analysis.complexity.overall).toBeGreaterThan(0);
    expect(analysis.complexity.overall).toBeLessThanOrEqual(10);
    expect(analysis.complexity.codebase.fileCount).toBeGreaterThan(0);
    expect(analysis.complexity.dependencies.totalDependencies).toBeGreaterThanOrEqual(0);

    // Verify risk assessment
    expect(analysis.risk.overall).toBeGreaterThanOrEqual(0);
    expect(analysis.risk.overall).toBeLessThanOrEqual(100);
    expect(analysis.risk.quotaRisk.probability).toBeGreaterThanOrEqual(0);
    expect(analysis.risk.timeRisk.probability).toBeGreaterThanOrEqual(0);
    expect(analysis.risk.complexityRisk.probability).toBeGreaterThanOrEqual(0);

    // Verify session planning
    expect(analysis.plan.sessionSequence.length).toBeGreaterThan(0);
    expect(analysis.plan.totalEstimatedTime).toBeGreaterThan(0);
    expect(analysis.plan.modelAllocation.sonnet.percentage + analysis.plan.modelAllocation.opus.percentage).toBe(100);
    expect(analysis.plan.confidence).toBeGreaterThan(0);
    expect(analysis.plan.confidence).toBeLessThanOrEqual(100);

    // Verify historical insights
    expect(analysis.insights.similarProjects).toBeDefined();
    expect(analysis.insights.successPrediction.probability).toBeGreaterThanOrEqual(0);
    expect(analysis.insights.successPrediction.probability).toBeLessThanOrEqual(100);
    expect(analysis.insights.optimizations.length).toBeGreaterThanOrEqual(0);

    // Verify prediction
    expect(analysis.prediction.probability).toBeGreaterThanOrEqual(0);
    expect(analysis.prediction.probability).toBeLessThanOrEqual(100);
    expect(analysis.prediction.confidence).toBeGreaterThanOrEqual(0);

    // Verify quota safety
    expect(analysis.summary.quotaSafety.sonnet).toBeDefined();
    expect(analysis.summary.quotaSafety.opus).toBeDefined();

    console.log('✅ Complete analysis pipeline test passed');
    console.log(`📊 Analysis Results:`);
    console.log(`   Complexity: ${analysis.summary.overallComplexity}/10`);
    console.log(`   Risk: ${analysis.summary.riskLevel}%`);
    console.log(`   Estimated Time: ${analysis.summary.estimatedHours} hours`);
    console.log(`   Success Probability: ${analysis.summary.successProbability}%`);
    console.log(`   Quota Safety: Sonnet=${analysis.summary.quotaSafety.sonnet}, Opus=${analysis.summary.quotaSafety.opus}`);
  }, 30000); // 30 second timeout for complex analysis

  test('should enforce quota safety limits', async () => {
    // Create high-risk quota scenario
    const highRiskQuotas: QuotaUsage = {
      sonnet: {
        used: 430, // 89.6% of 480h limit
        limit: 480,
        percentage: 89.6
      },
      opus: {
        used: 35, // 87.5% of 40h limit
        limit: 40,
        percentage: 87.5
      }
    };

    const projectPath = process.cwd();
    
    // Mock high complexity to trigger quota risk
    const complexity = await projectAnalyzer.analyzeComplexity(projectPath);
    const risk = await projectAnalyzer.assessRisk(complexity, highRiskQuotas);
    
    // Should detect high quota risk
    expect(risk.quotaRisk.probability).toBeGreaterThan(70);
    
    // Plan should be automatically adjusted for safety
    const plan = await projectAnalyzer.planSessions(complexity, risk);
    
    // Verify plan respects quota limits
    const projectedSonnet = highRiskQuotas.sonnet.used + (plan.modelAllocation.sonnet.estimatedTime / 60);
    const projectedOpus = highRiskQuotas.opus.used + (plan.modelAllocation.opus.estimatedTime / 60);
    
    expect(projectedSonnet).toBeLessThanOrEqual(432); // 90% of 480h
    expect(projectedOpus).toBeLessThanOrEqual(36);    // 90% of 40h

    console.log('✅ Quota safety enforcement test passed');
  });

  test('should validate session plans correctly', async () => {
    const projectPath = process.cwd();
    const analysis = await projectAnalyzer.performCompleteAnalysis(projectPath);
    
    const validation = await projectAnalyzer.validatePlan(analysis.plan, mockQuotas);
    
    expect(validation).toBeDefined();
    expect(validation.isValid).toBeDefined();
    expect(validation.warnings).toBeDefined();
    expect(validation.errors).toBeDefined();
    expect(validation.suggestions).toBeDefined();

    console.log('✅ Plan validation test passed');
    console.log(`   Valid: ${validation.isValid}`);
    console.log(`   Warnings: ${validation.warnings.length}`);
    console.log(`   Errors: ${validation.errors.length}`);
  });

  test('should generate personalized recommendations', async () => {
    const projectPath = process.cwd();
    const complexity = await projectAnalyzer.analyzeComplexity(projectPath);
    
    const projectContext = {
      projectType: 'nodejs-dashboard',
      complexity,
      currentQuotas: mockQuotas,
      timeConstraints: {
        availableHours: 8
      },
      preferences: {
        riskTolerance: 'medium' as const
      }
    };

    const recommendations = await projectAnalyzer.getRecommendations(projectContext);
    
    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    
    // Each recommendation should have required fields
    recommendations.forEach(rec => {
      expect(rec.type).toBeDefined();
      expect(rec.recommendation).toBeDefined();
      expect(rec.expectedImprovement).toBeGreaterThan(0);
      expect(rec.priority).toBeDefined();
    });

    console.log('✅ Personalized recommendations test passed');
    console.log(`   Generated ${recommendations.length} recommendations`);
  });

  test('should handle quota status monitoring', async () => {
    const quotaStatus = await projectAnalyzer.getQuotaStatus();
    
    expect(quotaStatus).toBeDefined();
    expect(quotaStatus.currentQuotas).toBeDefined();
    expect(quotaStatus.safetyStatus).toBeDefined();
    expect(quotaStatus.recommendations).toBeDefined();

    // Verify quota structure
    expect(quotaStatus.currentQuotas.sonnet.used).toBeGreaterThanOrEqual(0);
    expect(quotaStatus.currentQuotas.opus.used).toBeGreaterThanOrEqual(0);
    expect(quotaStatus.currentQuotas.sonnet.percentage).toBeGreaterThanOrEqual(0);
    expect(quotaStatus.currentQuotas.opus.percentage).toBeGreaterThanOrEqual(0);

    console.log('✅ Quota status monitoring test passed');
    console.log(`   Sonnet: ${quotaStatus.currentQuotas.sonnet.percentage}%`);
    console.log(`   Opus: ${quotaStatus.currentQuotas.opus.percentage}%`);
  });

  test('should optimize session allocation', async () => {
    const projectPath = process.cwd();
    const analysis = await projectAnalyzer.performCompleteAnalysis(projectPath);
    
    const constraints = {
      maxSonnetTime: 180, // 3 hours in minutes
      maxOpusTime: 60,    // 1 hour in minutes
      quotaBuffer: 15,    // 15% buffer
      preferredModel: 'sonnet' as const
    };

    const optimizedPlan = await projectAnalyzer.optimizeAllocation(analysis.plan, constraints);
    
    expect(optimizedPlan).toBeDefined();
    expect(optimizedPlan.modelAllocation.sonnet.estimatedTime).toBeLessThanOrEqual(constraints.maxSonnetTime);
    expect(optimizedPlan.modelAllocation.opus.estimatedTime).toBeLessThanOrEqual(constraints.maxOpusTime);

    console.log('✅ Session allocation optimization test passed');
    console.log(`   Original Sonnet: ${analysis.plan.modelAllocation.sonnet.estimatedTime} min`);
    console.log(`   Optimized Sonnet: ${optimizedPlan.modelAllocation.sonnet.estimatedTime} min`);
  });

  test('should record and learn from outcomes', async () => {
    const sessionOutcome = {
      sessionId: 'test-session-001',
      plannedDuration: 180, // 3 hours
      actualDuration: 210,  // 3.5 hours (overrun)
      plannedTokens: 5000,
      actualTokens: 5500,
      model: 'sonnet' as const,
      success: true,
      complexity: 6.5,
      tasks: ['Code analysis', 'Implementation'],
      issues: ['Unexpected dependency conflicts'],
      learnings: ['Need more time for dependency resolution']
    };

    // Should not throw error
    await expect(projectAnalyzer.recordOutcome(sessionOutcome.sessionId, sessionOutcome))
      .resolves
      .not.toThrow();

    console.log('✅ Outcome recording and learning test passed');
  });
});

describe('Individual Service Tests', () => {
  test('should analyze project complexity', async () => {
    const service = new ProjectAnalysisService();
    const complexity = await service.analyzeComplexity(process.cwd(), {
      includeTests: true,
      includeDocs: true,
      maxDepth: 3
    });

    expect(complexity.overall).toBeGreaterThan(0);
    expect(complexity.codebase.fileCount).toBeGreaterThan(0);
    
    console.log('✅ Project complexity analysis test passed');
  });

  test('should assess project risks', async () => {
    const analysisService = new ProjectAnalysisService();
    const riskService = new RiskAssessmentService();
    
    const complexity = await analysisService.analyzeComplexity(process.cwd());
    const risk = await riskService.assessRisk(complexity, {
      sonnet: { used: 234, limit: 480, percentage: 48.75 },
      opus: { used: 18.5, limit: 40, percentage: 46.25 }
    });

    expect(risk.overall).toBeGreaterThanOrEqual(0);
    expect(risk.mitigationStrategies.length).toBeGreaterThan(0);
    
    console.log('✅ Risk assessment test passed');
  });

  test('should create session plans', async () => {
    const analysisService = new ProjectAnalysisService();
    const riskService = new RiskAssessmentService();
    const planningService = new SessionPlanningService();
    
    const complexity = await analysisService.analyzeComplexity(process.cwd());
    const risk = await riskService.assessRisk(complexity, {
      sonnet: { used: 234, limit: 480, percentage: 48.75 },
      opus: { used: 18.5, limit: 40, percentage: 46.25 }
    });
    const plan = await planningService.planSessions(complexity, risk);

    expect(plan.sessionSequence.length).toBeGreaterThan(0);
    expect(plan.totalEstimatedTime).toBeGreaterThan(0);
    
    console.log('✅ Session planning test passed');
  });

  test('should generate historical insights', async () => {
    const analysisService = new ProjectAnalysisService();
    const insightsService = new HistoricalInsightsService();
    
    const complexity = await analysisService.analyzeComplexity(process.cwd());
    const insights = await insightsService.getHistoricalInsights(complexity);

    expect(insights.successPrediction.probability).toBeGreaterThanOrEqual(0);
    expect(insights.optimizations.length).toBeGreaterThanOrEqual(0);
    
    console.log('✅ Historical insights test passed');
  });
});