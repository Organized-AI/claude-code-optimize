import {
  ProjectAnalyzer as IProjectAnalyzer,
  ComplexityMetrics,
  RiskAssessment,
  SessionPlan,
  HistoricalInsights,
  SuccessPrediction,
  QuotaUsage,
  AnalysisOptions,
  AllocationConstraints,
  ValidationResult,
  SessionOutcome,
  ProjectContext,
  OptimizationRecommendation
} from '../../contracts/AgentInterfaces.js';

import { ProjectAnalysisService } from './ProjectAnalysisService.js';
import { RiskAssessmentService } from './RiskAssessmentService.js';
import { SessionPlanningService } from './SessionPlanningService.js';
import { HistoricalInsightsService } from './HistoricalInsightsService.js';
import { ClaudeCodeIntegration } from './ClaudeCodeIntegration.js';

/**
 * Main ProjectAnalyzer service that orchestrates all project analysis components
 * This is the primary interface for the Claude Code Optimizer Dashboard
 */
export class ProjectAnalyzer implements IProjectAnalyzer {
  private projectAnalysisService: ProjectAnalysisService;
  private riskAssessmentService: RiskAssessmentService;
  private sessionPlanningService: SessionPlanningService;
  private historicalInsightsService: HistoricalInsightsService;
  private claudeCodeIntegration?: ClaudeCodeIntegration;

  constructor(claudeCodeIntegration?: ClaudeCodeIntegration) {
    console.log('🧠 Initializing Project Analysis Architect...');
    
    this.projectAnalysisService = new ProjectAnalysisService();
    this.riskAssessmentService = new RiskAssessmentService();
    this.sessionPlanningService = new SessionPlanningService();
    this.historicalInsightsService = new HistoricalInsightsService();
    this.claudeCodeIntegration = claudeCodeIntegration;
    
    console.log('✅ Project Analysis Architect initialized');
  }

  /**
   * Perform comprehensive project complexity analysis
   */
  async analyzeComplexity(projectPath: string, options?: AnalysisOptions): Promise<ComplexityMetrics> {
    console.log(`🔍 Starting comprehensive complexity analysis for: ${projectPath}`);
    
    try {
      const complexity = await this.projectAnalysisService.analyzeComplexity(projectPath, options);
      
      // Log key insights
      console.log(`📊 Complexity Analysis Results:`);
      console.log(`   Overall Complexity: ${complexity.overall}/10`);
      console.log(`   Codebase Score: ${complexity.codebase.score}/10 (${complexity.codebase.fileCount} files)`);
      console.log(`   Dependencies: ${complexity.dependencies.score}/10 (${complexity.dependencies.totalDependencies} deps)`);
      console.log(`   Architecture: ${complexity.architecture.score}/10 (${complexity.architecture.technicalDebtHours}h debt)`);
      console.log(`   Testing: ${complexity.testing.score}/10 (${complexity.testing.coveragePercentage.toFixed(1)}% coverage)`);
      console.log(`   Documentation: ${complexity.documentation.score}/10 (${complexity.documentation.completenessPercentage.toFixed(1)}% complete)`);
      
      return complexity;
    } catch (error) {
      console.error('❌ Complexity analysis failed:', error);
      throw new Error(`Complexity analysis failed: ${error.message}`);
    }
  }

  /**
   * Assess project risks with quota safety protection
   */
  async assessRisk(complexity: ComplexityMetrics, currentQuotas: QuotaUsage): Promise<RiskAssessment> {
    console.log('⚠️  Starting comprehensive risk assessment...');
    
    try {
      const riskAssessment = await this.riskAssessmentService.assessRisk(complexity, currentQuotas);
      
      // Enforce quota safety - never allow exceeding 90% of weekly limits
      const quotaSafety = await this.riskAssessmentService.validateQuotaSafety(
        {
          sonnet: riskAssessment.quotaRisk.projectedUsage.sonnet.used - currentQuotas.sonnet.used,
          opus: riskAssessment.quotaRisk.projectedUsage.opus.used - currentQuotas.opus.used
        },
        currentQuotas
      );

      if (!quotaSafety.isSafe) {
        console.log('🚨 QUOTA SAFETY VIOLATION DETECTED:');
        quotaSafety.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
        quotaSafety.adjustments.forEach(adjustment => console.log(`   🔧 ${adjustment}`));
        
        // Increase quota risk probability to maximum
        riskAssessment.quotaRisk.probability = 95;
        riskAssessment.overall = Math.max(riskAssessment.overall, 90);
      }

      console.log(`📈 Risk Assessment Results:`);
      console.log(`   Overall Risk: ${riskAssessment.overall}%`);
      console.log(`   Quota Risk: ${riskAssessment.quotaRisk.probability}%`);
      console.log(`   Time Risk: ${riskAssessment.timeRisk.probability}%`);
      console.log(`   Complexity Risk: ${riskAssessment.complexityRisk.probability}%`);
      console.log(`   Mitigation Strategies: ${riskAssessment.mitigationStrategies.length}`);
      
      return riskAssessment;
    } catch (error) {
      console.error('❌ Risk assessment failed:', error);
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  /**
   * Create optimal session plan with intelligent model allocation
   */
  async planSessions(complexity: ComplexityMetrics, risk: RiskAssessment): Promise<SessionPlan> {
    console.log('📋 Creating optimal session plan...');
    
    try {
      const sessionPlan = await this.sessionPlanningService.planSessions(complexity, risk);
      
      // Validate plan against quota safety
      const quotaValidation = await this.riskAssessmentService.validateQuotaSafety(
        {
          sonnet: sessionPlan.modelAllocation.sonnet.estimatedTime / 60, // convert minutes to hours
          opus: sessionPlan.modelAllocation.opus.estimatedTime / 60
        },
        risk.quotaRisk.currentUsage
      );

      if (!quotaValidation.isSafe) {
        console.log('🚨 Session plan violates quota safety - auto-adjusting...');
        
        // Auto-adjust the plan to ensure quota safety
        const constraints: AllocationConstraints = {
          maxSonnetTime: Math.max(0, (432 - risk.quotaRisk.currentUsage.sonnet.used) * 60), // 90% of 480h in minutes
          maxOpusTime: Math.max(0, (36 - risk.quotaRisk.currentUsage.opus.used) * 60), // 90% of 40h in minutes
          quotaBuffer: 10
        };
        
        const adjustedPlan = await this.sessionPlanningService.optimizeAllocation(sessionPlan, constraints);
        
        console.log('✅ Plan auto-adjusted for quota safety');
        console.log(`📊 Session Plan Results:`);
        console.log(`   Total Time: ${Math.round(adjustedPlan.totalEstimatedTime / 60)} hours`);
        console.log(`   Sonnet Allocation: ${adjustedPlan.modelAllocation.sonnet.percentage}% (${Math.round(adjustedPlan.modelAllocation.sonnet.estimatedTime / 60)}h)`);
        console.log(`   Opus Allocation: ${adjustedPlan.modelAllocation.opus.percentage}% (${Math.round(adjustedPlan.modelAllocation.opus.estimatedTime / 60)}h)`);
        console.log(`   Sessions: ${adjustedPlan.sessionSequence.length}`);
        console.log(`   Confidence: ${adjustedPlan.confidence}%`);
        
        return adjustedPlan;
      }

      console.log(`📊 Session Plan Results:`);
      console.log(`   Total Time: ${Math.round(sessionPlan.totalEstimatedTime / 60)} hours`);
      console.log(`   Sonnet Allocation: ${sessionPlan.modelAllocation.sonnet.percentage}% (${Math.round(sessionPlan.modelAllocation.sonnet.estimatedTime / 60)}h)`);
      console.log(`   Opus Allocation: ${sessionPlan.modelAllocation.opus.percentage}% (${Math.round(sessionPlan.modelAllocation.opus.estimatedTime / 60)}h)`);
      console.log(`   Sessions: ${sessionPlan.sessionSequence.length}`);
      console.log(`   Confidence: ${sessionPlan.confidence}%`);
      
      return sessionPlan;
    } catch (error) {
      console.error('❌ Session planning failed:', error);
      throw new Error(`Session planning failed: ${error.message}`);
    }
  }

  /**
   * Get historical insights and predictions
   */
  async getHistoricalInsights(complexity: ComplexityMetrics): Promise<HistoricalInsights> {
    console.log('🔮 Generating historical insights...');
    
    try {
      const insights = await this.historicalInsightsService.getHistoricalInsights(complexity);
      
      console.log(`🔍 Historical Insights Results:`);
      console.log(`   Similar Projects: ${insights.similarProjects.length}`);
      console.log(`   Success Prediction: ${insights.successPrediction.probability}% (confidence: ${insights.successPrediction.confidence}%)`);
      console.log(`   Optimizations: ${insights.optimizations.length}`);
      console.log(`   Trends: ${insights.trends.length}`);
      
      return insights;
    } catch (error) {
      console.error('❌ Historical insights generation failed:', error);
      throw new Error(`Historical insights generation failed: ${error.message}`);
    }
  }

  /**
   * Predict project outcome based on plan and historical data
   */
  async predictOutcome(plan: SessionPlan, insights: HistoricalInsights): Promise<SuccessPrediction> {
    console.log('🎯 Predicting project outcome...');
    
    try {
      const prediction = await this.historicalInsightsService.predictOutcome(plan, insights);
      
      console.log(`🔮 Outcome Prediction:`);
      console.log(`   Success Probability: ${prediction.probability}%`);
      console.log(`   Confidence: ${prediction.confidence}%`);
      console.log(`   Key Factors: ${prediction.factors.length}`);
      
      return prediction;
    } catch (error) {
      console.error('❌ Outcome prediction failed:', error);
      throw new Error(`Outcome prediction failed: ${error.message}`);
    }
  }

  /**
   * Optimize session allocation with constraints
   */
  async optimizeAllocation(plan: SessionPlan, constraints: AllocationConstraints): Promise<SessionPlan> {
    console.log('⚡ Optimizing session allocation...');
    
    try {
      const optimizedPlan = await this.sessionPlanningService.optimizeAllocation(plan, constraints);
      
      console.log(`📈 Allocation Optimization Results:`);
      console.log(`   Time Saved: ${Math.round((plan.totalEstimatedTime - optimizedPlan.totalEstimatedTime) / 60)} hours`);
      console.log(`   New Sonnet Allocation: ${optimizedPlan.modelAllocation.sonnet.percentage}%`);
      console.log(`   New Opus Allocation: ${optimizedPlan.modelAllocation.opus.percentage}%`);
      
      return optimizedPlan;
    } catch (error) {
      console.error('❌ Allocation optimization failed:', error);
      throw new Error(`Allocation optimization failed: ${error.message}`);
    }
  }

  /**
   * Validate session plan against quota and other constraints
   */
  async validatePlan(plan: SessionPlan, quotas: QuotaUsage): Promise<ValidationResult> {
    console.log('✅ Validating session plan...');
    
    try {
      const validation = await this.sessionPlanningService.validatePlan(plan, quotas);
      
      console.log(`🔍 Plan Validation Results:`);
      console.log(`   Valid: ${validation.isValid}`);
      console.log(`   Warnings: ${validation.warnings.length}`);
      console.log(`   Errors: ${validation.errors.length}`);
      console.log(`   Suggestions: ${validation.suggestions.length}`);
      
      if (!validation.isValid) {
        console.log('❌ Plan validation errors:');
        validation.errors.forEach(error => console.log(`   🚫 ${error}`));
      }
      
      if (validation.warnings.length > 0) {
        console.log('⚠️  Plan validation warnings:');
        validation.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
      }
      
      return validation;
    } catch (error) {
      console.error('❌ Plan validation failed:', error);
      throw new Error(`Plan validation failed: ${error.message}`);
    }
  }

  /**
   * Record session outcome for learning and model improvement
   */
  async recordOutcome(sessionId: string, outcome: SessionOutcome): Promise<void> {
    console.log(`📝 Recording session outcome: ${sessionId}`);
    
    try {
      await this.historicalInsightsService.recordOutcome(sessionId, outcome);
      
      console.log(`✅ Session outcome recorded for learning`);
      console.log(`   Session: ${sessionId}`);
      console.log(`   Success: ${outcome.success}`);
      console.log(`   Duration: ${Math.round(outcome.actualDuration / 60)} hours (planned: ${Math.round(outcome.plannedDuration / 60)}h)`);
      console.log(`   Tokens: ${outcome.actualTokens} (planned: ${outcome.plannedTokens})`);
      console.log(`   Model: ${outcome.model}`);
      
    } catch (error) {
      console.error('❌ Failed to record outcome:', error);
      throw new Error(`Failed to record outcome: ${error.message}`);
    }
  }

  /**
   * Update machine learning models with new data
   */
  async updateModels(outcomes: SessionOutcome[]): Promise<void> {
    console.log(`🧠 Updating learning models with ${outcomes.length} outcomes...`);
    
    try {
      await this.historicalInsightsService.updateModels(outcomes);
      console.log('✅ Learning models updated successfully');
    } catch (error) {
      console.error('❌ Failed to update models:', error);
      throw new Error(`Failed to update models: ${error.message}`);
    }
  }

  /**
   * Get personalized recommendations based on project context
   */
  async getRecommendations(context: ProjectContext): Promise<OptimizationRecommendation[]> {
    console.log('💡 Generating personalized recommendations...');
    
    try {
      const recommendations = await this.historicalInsightsService.getRecommendations(context);
      
      console.log(`📋 Generated ${recommendations.length} recommendations:`);
      recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.recommendation} (${rec.expectedImprovement}% improvement, ${rec.priority} priority)`);
      });
      
      return recommendations;
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  /**
   * Get current quota status and safety information
   */
  async getQuotaStatus(): Promise<{
    currentQuotas: QuotaUsage;
    safetyStatus: any;
    recommendations: string[];
  }> {
    console.log('📊 Checking quota status...');
    
    try {
      // Get current quotas from Claude Code integration if available
      let currentQuotas: QuotaUsage;
      
      if (this.claudeCodeIntegration) {
        const sessionInfo = await this.claudeCodeIntegration.getCurrentSessionInfo();
        // Convert session info to quota usage (mock implementation)
        currentQuotas = {
          sonnet: {
            used: 234, // Would be calculated from actual usage
            limit: 480,
            percentage: 48.75
          },
          opus: {
            used: 18.5,
            limit: 40,
            percentage: 46.25
          }
        };
      } else {
        // Mock current quotas for development
        currentQuotas = {
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
      }

      const safetyStatus = await this.riskAssessmentService.getQuotaStatus(currentQuotas);
      
      const recommendations: string[] = [];
      if (safetyStatus.sonnet.status === 'warning') {
        recommendations.push('⚠️ Sonnet usage approaching 80% - consider efficiency optimizations');
      }
      if (safetyStatus.sonnet.status === 'critical') {
        recommendations.push('🚨 Sonnet usage critical - switch complex tasks to Opus');
      }
      if (safetyStatus.opus.status === 'warning') {
        recommendations.push('⚠️ Opus usage approaching 80% - use Sonnet for routine tasks');
      }
      if (safetyStatus.opus.status === 'critical') {
        recommendations.push('🚨 Opus usage critical - avoid new complex projects');
      }

      return {
        currentQuotas,
        safetyStatus,
        recommendations
      };
    } catch (error) {
      console.error('❌ Failed to get quota status:', error);
      throw new Error(`Failed to get quota status: ${error.message}`);
    }
  }

  /**
   * Perform complete end-to-end project analysis
   */
  async performCompleteAnalysis(projectPath: string, options?: AnalysisOptions): Promise<{
    complexity: ComplexityMetrics;
    risk: RiskAssessment;
    plan: SessionPlan;
    insights: HistoricalInsights;
    prediction: SuccessPrediction;
    quotaStatus: any;
    summary: any;
  }> {
    console.log(`🚀 Starting complete project analysis for: ${projectPath}`);
    
    try {
      // Get current quota status
      const quotaInfo = await this.getQuotaStatus();
      
      // Step 1: Analyze complexity
      const complexity = await this.analyzeComplexity(projectPath, options);
      
      // Step 2: Assess risks
      const risk = await this.assessRisk(complexity, quotaInfo.currentQuotas);
      
      // Step 3: Plan sessions
      const plan = await this.planSessions(complexity, risk);
      
      // Step 4: Get historical insights
      const insights = await this.getHistoricalInsights(complexity);
      
      // Step 5: Predict outcome
      const prediction = await this.predictOutcome(plan, insights);

      // Generate executive summary
      const summary = {
        projectPath,
        timestamp: Date.now(),
        overallComplexity: complexity.overall,
        riskLevel: risk.overall,
        estimatedHours: Math.round(plan.totalEstimatedTime / 60),
        successProbability: prediction.probability,
        confidence: plan.confidence,
        quotaSafety: {
          sonnet: risk.quotaRisk.projectedUsage.sonnet.percentage <= 90,
          opus: risk.quotaRisk.projectedUsage.opus.percentage <= 90
        },
        modelAllocation: plan.modelAllocation,
        topRecommendations: risk.mitigationStrategies.slice(0, 3).map(s => s.strategy),
        keyRisks: risk.complexityRisk.riskFactors.slice(0, 3).map(r => r.name)
      };

      console.log(`🎉 Complete analysis finished successfully!`);
      console.log(`📈 Executive Summary:`);
      console.log(`   Complexity: ${summary.overallComplexity}/10`);
      console.log(`   Risk Level: ${summary.riskLevel}%`);
      console.log(`   Estimated Time: ${summary.estimatedHours} hours`);
      console.log(`   Success Probability: ${summary.successProbability}%`);
      console.log(`   Quota Safe: Sonnet=${summary.quotaSafety.sonnet}, Opus=${summary.quotaSafety.opus}`);

      return {
        complexity,
        risk,
        plan,
        insights,
        prediction,
        quotaStatus: quotaInfo,
        summary
      };
    } catch (error) {
      console.error('❌ Complete analysis failed:', error);
      throw new Error(`Complete analysis failed: ${error.message}`);
    }
  }
}