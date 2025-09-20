#!/usr/bin/env python3
"""
Intelligent Model Selection Engine for Claude Code Optimizer

This module provides intelligent model selection to achieve 30% cost savings
through precision model recommendations based on task complexity analysis.

Features:
- Task complexity analysis framework
- Cost calculation engine with current pricing
- Real-time model recommendations  
- Historical usage optimization
- Rate limit planning for August 28, 2025
"""

import sqlite3
import json
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import statistics


class ModelType(Enum):
    """Claude model types with pricing information."""
    HAIKU = "claude-3-haiku"
    SONNET = "claude-3-sonnet" 
    OPUS = "claude-3-opus"


@dataclass
class ModelPricing:
    """Model pricing structure per 1K tokens."""
    input_cost: float  # Cost per 1K input tokens
    output_cost: float  # Cost per 1K output tokens
    
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate total cost for given token usage."""
        return (input_tokens / 1000 * self.input_cost) + (output_tokens / 1000 * self.output_cost)


# Current Claude pricing as of August 2025
MODEL_PRICING = {
    ModelType.HAIKU: ModelPricing(input_cost=0.25, output_cost=1.25),
    ModelType.SONNET: ModelPricing(input_cost=3.00, output_cost=15.00),
    ModelType.OPUS: ModelPricing(input_cost=15.00, output_cost=75.00)
}


@dataclass
class TaskComplexityFactors:
    """Factors that determine task complexity."""
    code_lines: int = 0
    file_count: int = 0
    architecture_changes: bool = False
    debugging_required: bool = False
    security_analysis: bool = False
    performance_optimization: bool = False
    cross_platform_needs: bool = False
    legacy_code_involved: bool = False
    ml_or_ai_components: bool = False
    complex_business_logic: bool = False
    
    def calculate_complexity_score(self) -> int:
        """Calculate complexity score from 1-10."""
        score = 1
        
        # Code volume factor
        if self.code_lines > 1000:
            score += 3
        elif self.code_lines > 500:
            score += 2
        elif self.code_lines > 100:
            score += 1
            
        # File complexity
        if self.file_count > 10:
            score += 2
        elif self.file_count > 5:
            score += 1
            
        # High complexity indicators
        high_complexity_factors = [
            self.architecture_changes,
            self.security_analysis,
            self.performance_optimization,
            self.ml_or_ai_components,
            self.complex_business_logic
        ]
        score += sum(high_complexity_factors) * 2
        
        # Medium complexity indicators  
        medium_complexity_factors = [
            self.debugging_required,
            self.cross_platform_needs,
            self.legacy_code_involved
        ]
        score += sum(medium_complexity_factors)
        
        return min(score, 10)


@dataclass  
class ModelRecommendation:
    """Model recommendation with rationale and cost analysis."""
    recommended_model: ModelType
    confidence: float  # 0.0 to 1.0
    complexity_score: int  # 1-10
    estimated_cost: float
    potential_savings: float
    rationale: str
    risk_assessment: str
    alternative_model: Optional[ModelType] = None


class TaskPatternAnalyzer:
    """Analyzes task patterns to extract complexity indicators."""
    
    # Task type patterns that indicate complexity
    SIMPLE_PATTERNS = [
        r'\bformat\b', r'\bsyntax\b', r'\btypo\b', r'\bspelling\b',
        r'\bindent\b', r'\bwhitespace\b', r'\bcomment\b', r'\bdocstring\b',
        r'\bbasic\s+query\b', r'\bsimple\s+question\b', r'\bquick\s+fix\b'
    ]
    
    MODERATE_PATTERNS = [
        r'\brefactor\b', r'\boptimize\b', r'\btest\b', r'\bdebug\b',
        r'\bapi\s+integration\b', r'\bcrud\b', r'\bdatabase\b',
        r'\bvalidation\b', r'\berror\s+handling\b'
    ]
    
    COMPLEX_PATTERNS = [
        r'\barchitecture\b', r'\bdesign\s+pattern\b', r'\bmachine\s+learning\b',
        r'\bsecurity\b', r'\bperformance\b', r'\bscalability\b',
        r'\bmicroservices\b', r'\bmigration\b', r'\blegacy\s+code\b',
        r'\bcross.platform\b', r'\balgorithm\b'
    ]
    
    def analyze_task_text(self, task_text: str) -> TaskComplexityFactors:
        """Analyze task description text to determine complexity factors."""
        text_lower = task_text.lower()
        factors = TaskComplexityFactors()
        
        # Estimate code lines from description
        if re.search(r'\b(large|huge|massive|thousands|many\s+files)\b', text_lower):
            factors.code_lines = 1500
        elif re.search(r'\b(multiple\s+files|several\s+classes|moderate)\b', text_lower):
            factors.code_lines = 300
        elif re.search(r'\b(single\s+file|small|simple)\b', text_lower):
            factors.code_lines = 50
        else:
            factors.code_lines = 150  # Default assumption
            
        # Estimate file count
        file_mentions = len(re.findall(r'\bfile\b', text_lower))
        factors.file_count = max(file_mentions, 1)
        
        # Check for specific complexity indicators
        factors.architecture_changes = bool(re.search(r'\b(architecture|design|structure|framework)\b', text_lower))
        factors.debugging_required = bool(re.search(r'\b(debug|fix|error|bug|issue)\b', text_lower))
        factors.security_analysis = bool(re.search(r'\b(security|auth|encrypt|secure|vulnerability)\b', text_lower))
        factors.performance_optimization = bool(re.search(r'\b(performance|optimize|speed|faster|slow)\b', text_lower))
        factors.cross_platform_needs = bool(re.search(r'\b(cross.platform|multi.platform|windows|mac|linux)\b', text_lower))
        factors.legacy_code_involved = bool(re.search(r'\b(legacy|old|deprecated|outdated)\b', text_lower))
        factors.ml_or_ai_components = bool(re.search(r'\b(machine\s+learning|ai|neural|model|training)\b', text_lower))
        factors.complex_business_logic = bool(re.search(r'\b(business\s+logic|complex\s+rules|workflow|process)\b', text_lower))
        
        return factors


class IntelligentModelSelector:
    """
    Main class for intelligent model selection and cost optimization.
    
    Provides real-time model recommendations, cost analysis, and usage optimization
    to achieve 30% cost savings target.
    """
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        self.pattern_analyzer = TaskPatternAnalyzer()
        
        # Cost optimization targets
        self.target_savings_percentage = 30.0
        self.rate_limit_date = datetime(2025, 8, 28)
        
    def recommend_model(self, task_description: str, 
                       user_context: Optional[Dict] = None) -> ModelRecommendation:
        """
        Recommend optimal model for a given task.
        
        Args:
            task_description: Description of the task to be performed
            user_context: Optional context about user's current usage patterns
            
        Returns:
            ModelRecommendation with detailed analysis and cost implications
        """
        # Analyze task complexity
        complexity_factors = self.pattern_analyzer.analyze_task_text(task_description)
        complexity_score = complexity_factors.calculate_complexity_score()
        
        # Get user's current usage patterns if available
        if user_context is None:
            user_context = self._get_user_context()
            
        # Determine recommended model based on complexity
        recommended_model = self._select_model_by_complexity(complexity_score)
        
        # Calculate cost implications
        estimated_tokens = self._estimate_token_usage(complexity_factors)
        estimated_cost = MODEL_PRICING[recommended_model].calculate_cost(
            estimated_tokens['input'], estimated_tokens['output']
        )
        
        # Calculate potential savings vs most expensive model
        opus_cost = MODEL_PRICING[ModelType.OPUS].calculate_cost(
            estimated_tokens['input'], estimated_tokens['output']
        )
        potential_savings = opus_cost - estimated_cost
        
        # Generate recommendation with rationale
        return ModelRecommendation(
            recommended_model=recommended_model,
            confidence=self._calculate_confidence(complexity_score, complexity_factors),
            complexity_score=complexity_score,
            estimated_cost=estimated_cost,
            potential_savings=potential_savings,
            rationale=self._generate_rationale(complexity_score, recommended_model, complexity_factors),
            risk_assessment=self._assess_risk(complexity_score, recommended_model),
            alternative_model=self._suggest_alternative(recommended_model, complexity_score)
        )
    
    def _select_model_by_complexity(self, complexity_score: int) -> ModelType:
        """Select appropriate model based on complexity score."""
        if complexity_score <= 3:
            return ModelType.HAIKU
        elif complexity_score <= 6:
            return ModelType.SONNET
        else:
            return ModelType.OPUS
    
    def _estimate_token_usage(self, factors: TaskComplexityFactors) -> Dict[str, int]:
        """Estimate token usage based on task complexity factors."""
        base_input = 100
        base_output = 200
        
        # Scale based on code complexity
        if factors.code_lines > 1000:
            multiplier = 3.0
        elif factors.code_lines > 500:
            multiplier = 2.0
        elif factors.code_lines > 100:
            multiplier = 1.5
        else:
            multiplier = 1.0
            
        # Adjust for high complexity factors
        complexity_multiplier = 1.0
        if factors.architecture_changes:
            complexity_multiplier += 0.5
        if factors.ml_or_ai_components:
            complexity_multiplier += 0.8
        if factors.security_analysis:
            complexity_multiplier += 0.4
        if factors.performance_optimization:
            complexity_multiplier += 0.3
            
        estimated_input = int(base_input * multiplier * complexity_multiplier)
        estimated_output = int(base_output * multiplier * complexity_multiplier)
        
        return {'input': estimated_input, 'output': estimated_output}
    
    def _calculate_confidence(self, complexity_score: int, factors: TaskComplexityFactors) -> float:
        """Calculate confidence level for the recommendation."""
        base_confidence = 0.85
        
        # Higher confidence for clear complexity indicators
        if complexity_score <= 3 or complexity_score >= 8:
            base_confidence += 0.1
            
        # Adjust based on specific factors
        if factors.architecture_changes or factors.ml_or_ai_components:
            base_confidence += 0.05  # Very clear high complexity
        
        return min(base_confidence, 1.0)
    
    def _generate_rationale(self, complexity_score: int, model: ModelType, 
                          factors: TaskComplexityFactors) -> str:
        """Generate human-readable rationale for the recommendation."""
        if complexity_score <= 3:
            return f"Simple task (complexity {complexity_score}/10) suitable for Haiku. " \
                   f"Involves basic operations with minimal complexity factors."
        elif complexity_score <= 6:
            return f"Moderate complexity task (complexity {complexity_score}/10) best handled by Sonnet. " \
                   f"Balances capability with cost-efficiency for standard development work."
        else:
            high_factors = []
            if factors.architecture_changes:
                high_factors.append("architectural changes")
            if factors.ml_or_ai_components:
                high_factors.append("ML/AI components")
            if factors.security_analysis:
                high_factors.append("security analysis")
            if factors.performance_optimization:
                high_factors.append("performance optimization")
                
            factor_text = ", ".join(high_factors) if high_factors else "complex requirements"
            return f"High complexity task (complexity {complexity_score}/10) requiring Opus. " \
                   f"Involves {factor_text} that benefit from advanced reasoning capabilities."
    
    def _assess_risk(self, complexity_score: int, model: ModelType) -> str:
        """Assess risks of using the recommended model."""
        if model == ModelType.HAIKU and complexity_score > 4:
            return "Medium risk: Task may require more sophisticated reasoning than Haiku provides. " \
                   "Monitor output quality and consider upgrading to Sonnet if needed."
        elif model == ModelType.SONNET and complexity_score > 7:
            return "Low-Medium risk: Complex task may benefit from Opus's advanced capabilities. " \
                   "Try Sonnet first, escalate to Opus if results are insufficient."
        elif model == ModelType.OPUS and complexity_score < 6:
            return "Low risk: Using premium model for moderate complexity. " \
                   "Consider Sonnet for cost optimization if quality requirements allow."
        else:
            return "Low risk: Model appropriately matched to task complexity."
    
    def _suggest_alternative(self, recommended: ModelType, complexity_score: int) -> Optional[ModelType]:
        """Suggest alternative model for cost/quality trade-offs."""
        if recommended == ModelType.OPUS and complexity_score <= 7:
            return ModelType.SONNET
        elif recommended == ModelType.SONNET and complexity_score >= 4:
            return ModelType.OPUS
        elif recommended == ModelType.HAIKU and complexity_score >= 3:
            return ModelType.SONNET
        return None
    
    def _get_user_context(self) -> Dict[str, Any]:
        """Get user's current usage patterns from database."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get recent usage patterns
            cursor.execute("""
                SELECT 
                    models_used,
                    SUM(real_total_tokens) as total_tokens,
                    COUNT(*) as session_count
                FROM real_sessions 
                WHERE start_time > datetime('now', '-30 days')
                GROUP BY models_used
            """)
            
            usage_patterns = {}
            total_sessions = 0
            total_tokens = 0
            
            for model, tokens, count in cursor.fetchall():
                if model:
                    usage_patterns[model] = {'tokens': tokens or 0, 'sessions': count}
                    total_sessions += count
                    total_tokens += tokens or 0
            
            conn.close()
            
            return {
                'usage_patterns': usage_patterns,
                'total_sessions': total_sessions,
                'total_tokens': total_tokens,
                'daily_average': total_tokens / 30 if total_tokens > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"Error getting user context: {e}")
            return {}
    
    def analyze_cost_optimization_opportunities(self) -> Dict[str, Any]:
        """Analyze historical usage to identify cost optimization opportunities."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get all sessions with model and token data
            cursor.execute("""
                SELECT 
                    models_used,
                    real_input_tokens,
                    real_output_tokens,
                    real_total_tokens,
                    metadata
                FROM real_sessions 
                WHERE real_total_tokens > 0 
                AND models_used IS NOT NULL
                ORDER BY start_time DESC
                LIMIT 1000
            """)
            
            sessions = cursor.fetchall()
            conn.close()
            
            if not sessions:
                return {'error': 'No session data available for analysis'}
            
            # Analyze each session for optimization potential
            total_current_cost = 0
            total_optimized_cost = 0
            optimization_opportunities = []
            
            for model_used, input_tokens, output_tokens, total_tokens, metadata in sessions:
                if not model_used or not input_tokens or not output_tokens:
                    continue
                    
                # Parse model type
                current_model = self._parse_model_type(model_used)
                if not current_model:
                    continue
                    
                # Calculate current cost
                current_cost = MODEL_PRICING[current_model].calculate_cost(input_tokens, output_tokens)
                total_current_cost += current_cost
                
                # Simulate what our recommender would suggest
                # This is a simplified simulation - in practice we'd need the original task description
                estimated_complexity = self._estimate_complexity_from_tokens(total_tokens)
                recommended_model = self._select_model_by_complexity(estimated_complexity)
                
                # Calculate optimized cost
                optimized_cost = MODEL_PRICING[recommended_model].calculate_cost(input_tokens, output_tokens)
                total_optimized_cost += optimized_cost
                
                # Track significant optimization opportunities
                if current_cost > optimized_cost * 1.2:  # 20%+ savings opportunity
                    optimization_opportunities.append({
                        'current_model': current_model.value,
                        'recommended_model': recommended_model.value,
                        'current_cost': current_cost,
                        'optimized_cost': optimized_cost,
                        'savings': current_cost - optimized_cost,
                        'tokens': total_tokens
                    })
            
            # Calculate overall optimization metrics
            potential_savings = total_current_cost - total_optimized_cost
            savings_percentage = (potential_savings / total_current_cost * 100) if total_current_cost > 0 else 0
            
            # Summarize by model transition patterns
            model_transitions = {}
            for opp in optimization_opportunities:
                transition = f"{opp['current_model']} → {opp['recommended_model']}"
                if transition not in model_transitions:
                    model_transitions[transition] = {'count': 0, 'total_savings': 0}
                model_transitions[transition]['count'] += 1
                model_transitions[transition]['total_savings'] += opp['savings']
            
            return {
                'analysis_summary': {
                    'sessions_analyzed': len(sessions),
                    'current_total_cost': round(total_current_cost, 4),
                    'optimized_total_cost': round(total_optimized_cost, 4),
                    'potential_savings': round(potential_savings, 4),
                    'savings_percentage': round(savings_percentage, 2),
                    'target_achieved': savings_percentage >= self.target_savings_percentage
                },
                'optimization_opportunities': {
                    'high_impact_sessions': len(optimization_opportunities),
                    'total_opportunity_savings': round(sum(opp['savings'] for opp in optimization_opportunities), 4)
                },
                'model_transition_recommendations': model_transitions,
                'recommendations': self._generate_optimization_recommendations(
                    savings_percentage, len(optimization_opportunities), len(sessions)
                )
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing cost optimization: {e}")
            return {'error': str(e)}
    
    def _parse_model_type(self, model_string: str) -> Optional[ModelType]:
        """Parse model type from model string."""
        model_lower = model_string.lower()
        if 'haiku' in model_lower:
            return ModelType.HAIKU
        elif 'sonnet' in model_lower:
            return ModelType.SONNET
        elif 'opus' in model_lower:
            return ModelType.OPUS
        return None
    
    def _estimate_complexity_from_tokens(self, total_tokens: int) -> int:
        """Estimate task complexity from token usage (rough heuristic)."""
        if total_tokens < 500:
            return 2  # Simple
        elif total_tokens < 2000:
            return 5  # Moderate
        else:
            return 8  # Complex
    
    def _generate_optimization_recommendations(self, savings_percentage: float, 
                                             opportunities: int, total_sessions: int) -> List[str]:
        """Generate actionable optimization recommendations."""
        recommendations = []
        
        if savings_percentage >= self.target_savings_percentage:
            recommendations.append(
                f"✓ Target achieved: {savings_percentage:.1f}% potential savings identified"
            )
        else:
            gap = self.target_savings_percentage - savings_percentage
            recommendations.append(
                f"Gap to target: {gap:.1f}% additional savings needed to reach 30% goal"
            )
        
        opportunity_rate = (opportunities / total_sessions * 100) if total_sessions > 0 else 0
        if opportunity_rate > 20:
            recommendations.append(
                f"High optimization potential: {opportunity_rate:.1f}% of sessions show significant savings opportunities"
            )
        elif opportunity_rate > 10:
            recommendations.append(
                f"Moderate optimization potential: {opportunity_rate:.1f}% of sessions could be optimized"
            )
        else:
            recommendations.append(
                f"Current model selection is relatively efficient: only {opportunity_rate:.1f}% major optimization opportunities"
            )
        
        # Rate limiting recommendations
        days_to_limit = (self.rate_limit_date - datetime.now()).days
        if days_to_limit > 0:
            recommendations.append(
                f"📅 {days_to_limit} days until rate limits (Aug 28) - implement optimization now"
            )
        
        return recommendations
    
    def generate_usage_projection(self, days_ahead: int = 30) -> Dict[str, Any]:
        """Generate usage and cost projection for rate limit planning."""
        try:
            user_context = self._get_user_context()
            daily_average = user_context.get('daily_average', 0)
            
            if daily_average == 0:
                return {'error': 'Insufficient historical data for projection'}
            
            # Project usage
            projected_tokens = daily_average * days_ahead
            
            # Calculate costs under different model strategies
            strategies = {
                'current_pattern': self._project_current_pattern_cost(projected_tokens, user_context),
                'optimized_selection': self._project_optimized_cost(projected_tokens),
                'all_haiku': MODEL_PRICING[ModelType.HAIKU].calculate_cost(projected_tokens * 0.4, projected_tokens * 0.6),
                'all_sonnet': MODEL_PRICING[ModelType.SONNET].calculate_cost(projected_tokens * 0.4, projected_tokens * 0.6),
                'all_opus': MODEL_PRICING[ModelType.OPUS].calculate_cost(projected_tokens * 0.4, projected_tokens * 0.6)
            }
            
            # Calculate potential savings
            current_cost = strategies['current_pattern']
            optimized_cost = strategies['optimized_selection']
            potential_savings = current_cost - optimized_cost
            savings_percentage = (potential_savings / current_cost * 100) if current_cost > 0 else 0
            
            return {
                'projection_period': f"{days_ahead} days",
                'projected_token_usage': int(projected_tokens),
                'cost_strategies': {k: round(v, 4) for k, v in strategies.items()},
                'optimization_impact': {
                    'current_cost': round(current_cost, 4),
                    'optimized_cost': round(optimized_cost, 4),
                    'potential_savings': round(potential_savings, 4),
                    'savings_percentage': round(savings_percentage, 2)
                },
                'rate_limit_readiness': {
                    'days_to_limit': (self.rate_limit_date - datetime.now()).days,
                    'projected_daily_cost': round(optimized_cost / days_ahead, 4),
                    'optimization_status': 'Ready' if savings_percentage >= 25 else 'Needs Improvement'
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating usage projection: {e}")
            return {'error': str(e)}
    
    def _project_current_pattern_cost(self, total_tokens: int, user_context: Dict) -> float:
        """Project cost based on current usage patterns."""
        usage_patterns = user_context.get('usage_patterns', {})
        total_cost = 0.0
        
        for model_name, data in usage_patterns.items():
            model_type = self._parse_model_type(model_name)
            if model_type:
                # Distribute tokens proportionally
                token_share = data['tokens'] / user_context.get('total_tokens', 1)
                model_tokens = total_tokens * token_share
                # Assume 40% input, 60% output ratio
                cost = MODEL_PRICING[model_type].calculate_cost(
                    int(model_tokens * 0.4), int(model_tokens * 0.6)
                )
                total_cost += cost
        
        return total_cost
    
    def _project_optimized_cost(self, total_tokens: int) -> float:
        """Project cost with optimized model selection."""
        # Simulate optimal distribution based on complexity patterns
        # These percentages are based on typical development task distributions
        haiku_share = 0.4  # Simple tasks
        sonnet_share = 0.45  # Moderate tasks  
        opus_share = 0.15  # Complex tasks
        
        total_cost = 0.0
        
        # Calculate cost for each model tier
        for model, share in [(ModelType.HAIKU, haiku_share), 
                           (ModelType.SONNET, sonnet_share),
                           (ModelType.OPUS, opus_share)]:
            model_tokens = total_tokens * share
            cost = MODEL_PRICING[model].calculate_cost(
                int(model_tokens * 0.4), int(model_tokens * 0.6)
            )
            total_cost += cost
            
        return total_cost


def main():
    """Main function for testing the intelligent model selector."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Intelligent Model Selection for Claude Code Optimizer')
    parser.add_argument('database', help='Path to the SQLite database')
    parser.add_argument('--recommend', type=str, help='Get model recommendation for task description')
    parser.add_argument('--analyze-optimization', action='store_true', help='Analyze cost optimization opportunities')
    parser.add_argument('--project-usage', type=int, metavar='DAYS', help='Project usage and costs for N days')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    selector = IntelligentModelSelector(args.database)
    
    if args.recommend:
        print("=== MODEL RECOMMENDATION ===")
        recommendation = selector.recommend_model(args.recommend)
        print(f"Task: {args.recommend}")
        print(f"Recommended Model: {recommendation.recommended_model.value}")
        print(f"Confidence: {recommendation.confidence:.1%}")
        print(f"Complexity Score: {recommendation.complexity_score}/10")
        print(f"Estimated Cost: ${recommendation.estimated_cost:.4f}")
        print(f"Potential Savings: ${recommendation.potential_savings:.4f}")
        print(f"Rationale: {recommendation.rationale}")
        print(f"Risk Assessment: {recommendation.risk_assessment}")
        if recommendation.alternative_model:
            print(f"Alternative: {recommendation.alternative_model.value}")
            
    elif args.analyze_optimization:
        print("=== COST OPTIMIZATION ANALYSIS ===")
        analysis = selector.analyze_cost_optimization_opportunities()
        if 'error' in analysis:
            print(f"Error: {analysis['error']}")
        else:
            summary = analysis['analysis_summary']
            print(f"Sessions Analyzed: {summary['sessions_analyzed']}")
            print(f"Current Total Cost: ${summary['current_total_cost']:.4f}")
            print(f"Optimized Total Cost: ${summary['optimized_total_cost']:.4f}")
            print(f"Potential Savings: ${summary['potential_savings']:.4f} ({summary['savings_percentage']:.1f}%)")
            print(f"Target Achievement: {'✓' if summary['target_achieved'] else '✗'}")
            
            print("\nRecommendations:")
            for rec in analysis['recommendations']:
                print(f"- {rec}")
                
    elif args.project_usage:
        print(f"=== USAGE PROJECTION ({args.project_usage} days) ===")
        projection = selector.generate_usage_projection(args.project_usage)
        if 'error' in projection:
            print(f"Error: {projection['error']}")
        else:
            print(f"Projected Token Usage: {projection['projected_token_usage']:,}")
            
            print("\nCost Strategies:")
            strategies = projection['cost_strategies']
            for strategy, cost in strategies.items():
                print(f"- {strategy}: ${cost:.4f}")
                
            optimization = projection['optimization_impact']
            print(f"\nOptimization Impact:")
            print(f"- Current Pattern Cost: ${optimization['current_cost']:.4f}")
            print(f"- Optimized Cost: ${optimization['optimized_cost']:.4f}")
            print(f"- Potential Savings: ${optimization['potential_savings']:.4f} ({optimization['savings_percentage']:.1f}%)")
            
            readiness = projection['rate_limit_readiness']
            print(f"\nRate Limit Readiness:")
            print(f"- Days to Limit: {readiness['days_to_limit']}")
            print(f"- Projected Daily Cost: ${readiness['projected_daily_cost']:.4f}")
            print(f"- Optimization Status: {readiness['optimization_status']}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()