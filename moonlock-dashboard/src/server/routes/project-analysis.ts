import express, { Request, Response } from 'express';
import { ProjectAnalysisService } from '../services/ProjectAnalysisService.js';
import { RiskAssessmentService } from '../services/RiskAssessmentService.js';
import { SessionPlanningService } from '../services/SessionPlanningService.js';
import { HistoricalInsightsService } from '../services/HistoricalInsightsService.js';
import {
  ComplexityMetrics,
  RiskAssessment,
  SessionPlan,
  HistoricalInsights,
  QuotaUsage,
  ProjectContext,
  AnalysisOptions,
  AllocationConstraints,
  ValidationResult,
  SessionOutcome
} from '../../contracts/AgentInterfaces.js';

const router = express.Router();

// Initialize services
const projectAnalysisService = new ProjectAnalysisService();
const riskAssessmentService = new RiskAssessmentService();
const sessionPlanningService = new SessionPlanningService();
const historicalInsightsService = new HistoricalInsightsService();

// Mock current quota for demonstration
const getMockCurrentQuotas = (): QuotaUsage => ({
  sonnet: {
    used: 234, // hours
    limit: 480,
    percentage: 48.75
  },
  opus: {
    used: 18.5, // hours
    limit: 40,
    percentage: 46.25
  }
});

/**
 * POST /api/project-analysis/analyze
 * Analyze project complexity
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { projectPath, options = {} } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'projectPath is required'
      });
    }

    console.log(`🔍 Starting complexity analysis for: ${projectPath}`);
    
    const analysisOptions: AnalysisOptions = {
      includeTests: options.includeTests !== false,
      includeDocs: options.includeDocs !== false,
      includeNodeModules: options.includeNodeModules === true,
      maxDepth: options.maxDepth || 10,
      customPatterns: options.customPatterns || []
    };

    const complexity = await projectAnalysisService.analyzeComplexity(projectPath, analysisOptions);
    
    res.json({
      success: true,
      data: complexity
    });

  } catch (error) {
    console.error('Error in complexity analysis:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/assess-risk
 * Assess project risks based on complexity
 */
router.post('/assess-risk', async (req: Request, res: Response) => {
  try {
    const { complexity, currentQuotas } = req.body;
    
    if (!complexity) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'complexity metrics are required'
      });
    }

    const quotas = currentQuotas || getMockCurrentQuotas();
    
    console.log('🎯 Starting risk assessment...');
    
    const riskAssessment = await riskAssessmentService.assessRisk(complexity, quotas);
    
    res.json({
      success: true,
      data: riskAssessment
    });

  } catch (error) {
    console.error('Error in risk assessment:', error);
    res.status(500).json({
      error: 'Risk assessment failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/plan-sessions
 * Create optimal session plan
 */
router.post('/plan-sessions', async (req: Request, res: Response) => {
  try {
    const { complexity, riskAssessment } = req.body;
    
    if (!complexity || !riskAssessment) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'complexity and riskAssessment are required'
      });
    }

    console.log('📋 Creating session plan...');
    
    const sessionPlan = await sessionPlanningService.planSessions(complexity, riskAssessment);
    
    res.json({
      success: true,
      data: sessionPlan
    });

  } catch (error) {
    console.error('Error in session planning:', error);
    res.status(500).json({
      error: 'Session planning failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/historical-insights
 * Get historical insights and predictions
 */
router.post('/historical-insights', async (req: Request, res: Response) => {
  try {
    const { complexity } = req.body;
    
    if (!complexity) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'complexity metrics are required'
      });
    }

    console.log('🔮 Generating historical insights...');
    
    const insights = await historicalInsightsService.getHistoricalInsights(complexity);
    
    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      error: 'Insights generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/full-analysis
 * Complete end-to-end analysis pipeline
 */
router.post('/full-analysis', async (req: Request, res: Response) => {
  try {
    const { projectPath, options = {}, currentQuotas } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'projectPath is required'
      });
    }

    console.log(`🚀 Starting full project analysis pipeline for: ${projectPath}`);
    
    const analysisOptions: AnalysisOptions = {
      includeTests: options.includeTests !== false,
      includeDocs: options.includeDocs !== false,
      includeNodeModules: options.includeNodeModules === true,
      maxDepth: options.maxDepth || 10,
      customPatterns: options.customPatterns || []
    };

    const quotas = currentQuotas || getMockCurrentQuotas();

    // Step 1: Analyze complexity
    console.log('📊 Step 1: Analyzing complexity...');
    const complexity = await projectAnalysisService.analyzeComplexity(projectPath, analysisOptions);
    
    // Step 2: Assess risks
    console.log('⚠️  Step 2: Assessing risks...');
    const riskAssessment = await riskAssessmentService.assessRisk(complexity, quotas);
    
    // Step 3: Plan sessions
    console.log('📋 Step 3: Planning sessions...');
    const sessionPlan = await sessionPlanningService.planSessions(complexity, riskAssessment);
    
    // Step 4: Get historical insights
    console.log('🔮 Step 4: Generating insights...');
    const insights = await historicalInsightsService.getHistoricalInsights(complexity);
    
    // Step 5: Predict outcome
    console.log('🎯 Step 5: Predicting outcome...');
    const prediction = await historicalInsightsService.predictOutcome(sessionPlan, insights);

    res.json({
      success: true,
      data: {
        complexity,
        riskAssessment,
        sessionPlan,
        insights,
        prediction,
        summary: {
          overallComplexity: complexity.overall,
          riskLevel: riskAssessment.overall,
          estimatedTime: Math.round(sessionPlan.totalEstimatedTime / 60), // hours
          successProbability: prediction.probability,
          confidence: sessionPlan.confidence,
          quotaSafety: {
            sonnet: riskAssessment.quotaRisk.projectedUsage.sonnet.percentage <= 90,
            opus: riskAssessment.quotaRisk.projectedUsage.opus.percentage <= 90
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in full analysis:', error);
    res.status(500).json({
      error: 'Full analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/optimize-plan
 * Optimize existing session plan with constraints
 */
router.post('/optimize-plan', async (req: Request, res: Response) => {
  try {
    const { sessionPlan, constraints = {} } = req.body;
    
    if (!sessionPlan) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'sessionPlan is required'
      });
    }

    console.log('⚡ Optimizing session plan...');
    
    const allocationConstraints: AllocationConstraints = {
      maxSonnetTime: constraints.maxSonnetTime,
      maxOpusTime: constraints.maxOpusTime,
      quotaBuffer: constraints.quotaBuffer || 10, // 10% buffer by default
      preferredModel: constraints.preferredModel
    };

    const optimizedPlan = await sessionPlanningService.optimizeAllocation(sessionPlan, allocationConstraints);
    
    res.json({
      success: true,
      data: optimizedPlan
    });

  } catch (error) {
    console.error('Error optimizing plan:', error);
    res.status(500).json({
      error: 'Plan optimization failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/validate-plan
 * Validate session plan against quota limits
 */
router.post('/validate-plan', async (req: Request, res: Response) => {
  try {
    const { sessionPlan, currentQuotas } = req.body;
    
    if (!sessionPlan) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'sessionPlan is required'
      });
    }

    const quotas = currentQuotas || getMockCurrentQuotas();
    
    console.log('✅ Validating session plan...');
    
    const validation = await sessionPlanningService.validatePlan(sessionPlan, quotas);
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating plan:', error);
    res.status(500).json({
      error: 'Plan validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/project-analysis/quota-status
 * Get current quota status and safety check
 */
router.get('/quota-status', async (req: Request, res: Response) => {
  try {
    const currentQuotas = getMockCurrentQuotas(); // In production, get from database
    
    const status = await riskAssessmentService.getQuotaStatus(currentQuotas);
    
    res.json({
      success: true,
      data: {
        currentQuotas,
        status,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Error getting quota status:', error);
    res.status(500).json({
      error: 'Quota status check failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/record-outcome
 * Record session outcome for learning
 */
router.post('/record-outcome', async (req: Request, res: Response) => {
  try {
    const { sessionId, outcome } = req.body;
    
    if (!sessionId || !outcome) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'sessionId and outcome are required'
      });
    }

    console.log(`📝 Recording outcome for session: ${sessionId}`);
    
    await historicalInsightsService.recordOutcome(sessionId, outcome);
    
    res.json({
      success: true,
      message: 'Outcome recorded successfully'
    });

  } catch (error) {
    console.error('Error recording outcome:', error);
    res.status(500).json({
      error: 'Outcome recording failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/recommendations
 * Get personalized recommendations based on context
 */
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { projectContext } = req.body;
    
    if (!projectContext) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'projectContext is required'
      });
    }

    console.log('💡 Generating personalized recommendations...');
    
    const recommendations = await historicalInsightsService.getRecommendations(projectContext);
    
    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      error: 'Recommendation generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/project-analysis/validate-quota-safety
 * Validate if planned usage is within quota safety limits
 */
router.post('/validate-quota-safety', async (req: Request, res: Response) => {
  try {
    const { plannedUsage, currentQuotas } = req.body;
    
    if (!plannedUsage) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'plannedUsage is required'
      });
    }

    const quotas = currentQuotas || getMockCurrentQuotas();
    
    console.log('🛡️  Validating quota safety...');
    
    const validation = await riskAssessmentService.validateQuotaSafety(plannedUsage, quotas);
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating quota safety:', error);
    res.status(500).json({
      error: 'Quota safety validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/project-analysis/health
 * Health check for project analysis services
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    services: {
      projectAnalysis: 'healthy',
      riskAssessment: 'healthy',
      sessionPlanning: 'healthy',
      historicalInsights: 'healthy'
    },
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

export default router;