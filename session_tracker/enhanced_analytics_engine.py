#!/usr/bin/env python3
"""
Enhanced Analytics Engine for Claude Code Optimizer
Provides predictive modeling, trend analysis, and optimization insights
"""

import sqlite3
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

@dataclass
class AnalyticsMetrics:
    """Container for analytics metrics"""
    usage_efficiency: float
    cost_optimization_potential: float
    rate_limit_risk_score: float
    productivity_score: float
    recommendations: List[str]

class EnhancedAnalyticsEngine:
    """Advanced analytics engine for session optimization and insights"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.db_connection = sqlite3.connect(db_path, check_same_thread=False)
        self.db_connection.row_factory = sqlite3.Row
        
        # Initialize analytics data
        self.session_data = self._load_session_data()
        self.analytics_cache = {}
        
    def _load_session_data(self) -> pd.DataFrame:
        """Load and prepare session data for analysis"""
        query = """
        SELECT 
            id, session_type, start_time, end_time,
            estimated_tokens, real_total_tokens, models_used,
            metadata, five_hour_block_id, created_at
        FROM real_sessions 
        ORDER BY start_time DESC
        """
        
        try:
            df = pd.read_sql_query(query, self.db_connection)
            
            # Convert timestamps
            if not df.empty:
                df['start_time'] = pd.to_datetime(df['start_time'])
                df['end_time'] = pd.to_datetime(df['end_time'])
                df['created_at'] = pd.to_datetime(df['created_at'])
                
                # Calculate session duration
                df['duration_minutes'] = (df['end_time'] - df['start_time']).dt.total_seconds() / 60
                
                # Use real tokens if available, fallback to estimated
                df['tokens_used'] = df['real_total_tokens'].fillna(df['estimated_tokens'])
                
            return df
        except Exception as e:
            print(f"Error loading session data: {e}")
            return pd.DataFrame()
    
    def calculate_usage_efficiency(self) -> float:
        """Calculate usage efficiency score (0-1)"""
        if self.session_data.empty:
            return 0.0
            
        # Efficiency based on tokens per minute
        df = self.session_data[self.session_data['duration_minutes'] > 0]
        if df.empty:
            return 0.0
            
        df['tokens_per_minute'] = df['tokens_used'] / df['duration_minutes']
        
        # Calculate efficiency relative to target (100 tokens/minute)
        target_rate = 100
        actual_rates = df['tokens_per_minute'].dropna()
        
        if actual_rates.empty:
            return 0.0
            
        efficiency = min(actual_rates.mean() / target_rate, 1.0)
        return efficiency
    
    def predict_rate_limit_risk(self, days_ahead: int = 13) -> Dict[str, Any]:
        """Predict rate limit risk for August 28 weekly limits"""
        if self.session_data.empty:
            return {
                'risk_score': 0.0,
                'daily_projection': 0,
                'weekly_projection': 0,
                'recommendations': []
            }
        
        # Calculate daily average
        recent_data = self.session_data[
            self.session_data['start_time'] >= datetime.now() - timedelta(days=7)
        ]
        
        if recent_data.empty:
            daily_avg = 0
        else:
            total_tokens = recent_data['tokens_used'].sum()
            days_active = recent_data['start_time'].dt.date.nunique()
            daily_avg = total_tokens / max(days_active, 1)
        
        # Project to weekly usage
        weekly_projection = daily_avg * 7
        
        # Rate limit assumptions (weekly limits starting Aug 28)
        weekly_limit = 500000  # Conservative estimate
        risk_score = weekly_projection / weekly_limit
        
        recommendations = []
        if risk_score > 0.8:
            recommendations.append("HIGH RISK: Reduce daily usage by 30%")
            recommendations.append("Switch to Haiku for simple tasks")
            recommendations.append("Implement session time limits")
        elif risk_score > 0.6:
            recommendations.append("MEDIUM RISK: Monitor usage closely")
            recommendations.append("Consider model optimization")
        else:
            recommendations.append("LOW RISK: Current usage sustainable")
            
        return {
            'risk_score': risk_score,
            'daily_projection': int(daily_avg),
            'weekly_projection': int(weekly_projection),
            'days_until_limits': days_ahead,
            'recommendations': recommendations
        }
    
    def analyze_cost_optimization(self) -> Dict[str, Any]:
        """Analyze cost optimization opportunities"""
        if self.session_data.empty:
            return {
                'potential_savings': 0.0,
                'optimization_score': 0.0,
                'recommendations': []
            }
        
        # Model cost per token (approximate)
        model_costs = {
            'haiku': 0.25 / 1000000,  # $0.25 per 1M tokens
            'sonnet': 3.0 / 1000000,   # $3.00 per 1M tokens
            'opus': 15.0 / 1000000     # $15.00 per 1M tokens
        }
        
        total_cost = 0
        potential_savings = 0
        
        for _, session in self.session_data.iterrows():
            tokens = session['tokens_used'] or 0
            
            # Estimate current cost (assume mixed usage)
            current_cost = tokens * model_costs['sonnet']  # Default to Sonnet
            total_cost += current_cost
            
            # Calculate potential savings with optimization
            # Assume 60% could use Haiku, 30% Sonnet, 10% Opus
            optimized_cost = (
                tokens * 0.6 * model_costs['haiku'] +
                tokens * 0.3 * model_costs['sonnet'] +
                tokens * 0.1 * model_costs['opus']
            )
            potential_savings += (current_cost - optimized_cost)
        
        savings_percentage = (potential_savings / total_cost * 100) if total_cost > 0 else 0
        
        recommendations = []
        if savings_percentage > 20:
            recommendations.append(f"HIGH POTENTIAL: {savings_percentage:.1f}% savings possible")
            recommendations.append("Implement intelligent model selection")
            recommendations.append("Audit high-cost sessions for optimization")
        elif savings_percentage > 10:
            recommendations.append(f"MEDIUM POTENTIAL: {savings_percentage:.1f}% savings possible")
            recommendations.append("Consider task complexity analysis")
        else:
            recommendations.append("Usage appears optimized")
            
        return {
            'potential_savings': potential_savings,
            'current_monthly_cost': total_cost * 30,  # Rough monthly estimate
            'optimization_score': min(savings_percentage / 30, 1.0),
            'savings_percentage': savings_percentage,
            'recommendations': recommendations
        }
    
    def calculate_productivity_score(self) -> float:
        """Calculate productivity score based on session patterns"""
        if self.session_data.empty:
            return 0.0
            
        # Factors for productivity scoring
        scores = []
        
        # 1. Session frequency (consistent usage is better)
        if len(self.session_data) >= 3:
            dates = self.session_data['start_time'].dt.date
            date_range = (dates.max() - dates.min()).days
            if date_range > 0:
                frequency_score = min(len(dates) / date_range, 1.0)
                scores.append(frequency_score)
        
        # 2. Session duration optimization (not too short, not too long)
        durations = self.session_data['duration_minutes'].dropna()
        if not durations.empty:
            optimal_duration = 120  # 2 hours
            duration_scores = [
                1.0 - abs(d - optimal_duration) / optimal_duration 
                for d in durations if d > 0
            ]
            if duration_scores:
                scores.append(np.mean(duration_scores))
        
        # 3. Token efficiency
        efficiency = self.calculate_usage_efficiency()
        scores.append(efficiency)
        
        return np.mean(scores) if scores else 0.0
    
    def generate_trend_analysis(self) -> Dict[str, Any]:
        """Generate trend analysis and forecasting"""
        if self.session_data.empty:
            return {'trends': {}, 'forecasts': {}}
        
        df = self.session_data.copy()
        df['date'] = df['start_time'].dt.date
        
        # Daily usage trends
        daily_usage = df.groupby('date')['tokens_used'].sum()
        
        # Calculate trend direction
        if len(daily_usage) >= 2:
            x = np.arange(len(daily_usage))
            y = daily_usage.values
            slope = np.polyfit(x, y, 1)[0]
            trend_direction = 'increasing' if slope > 0 else 'decreasing'
        else:
            trend_direction = 'stable'
        
        # Weekly forecast
        recent_avg = daily_usage.tail(7).mean() if len(daily_usage) >= 7 else daily_usage.mean()
        weekly_forecast = recent_avg * 7
        
        return {
            'trends': {
                'direction': trend_direction,
                'daily_average': float(daily_usage.mean()),
                'recent_daily_average': float(recent_avg),
                'peak_usage_day': daily_usage.idxmax() if not daily_usage.empty else None
            },
            'forecasts': {
                'next_week_tokens': int(weekly_forecast),
                'next_month_tokens': int(weekly_forecast * 4.3),
                'august_28_readiness': weekly_forecast < 350000  # Conservative weekly limit
            }
        }
    
    def generate_comprehensive_report(self) -> AnalyticsMetrics:
        """Generate comprehensive analytics report"""
        efficiency = self.calculate_usage_efficiency()
        cost_analysis = self.analyze_cost_optimization()
        rate_limit_risk = self.predict_rate_limit_risk()
        productivity = self.calculate_productivity_score()
        trends = self.generate_trend_analysis()
        
        # Compile recommendations
        recommendations = []
        recommendations.extend(cost_analysis['recommendations'])
        recommendations.extend(rate_limit_risk['recommendations'])
        
        # Add trend-based recommendations
        if trends['trends']['direction'] == 'increasing':
            recommendations.append("Usage trending upward - monitor rate limits")
        
        # Performance recommendations
        if efficiency < 0.5:
            recommendations.append("Consider shorter, more focused sessions")
        if productivity < 0.6:
            recommendations.append("Establish regular session schedule")
        
        return AnalyticsMetrics(
            usage_efficiency=efficiency,
            cost_optimization_potential=cost_analysis['optimization_score'],
            rate_limit_risk_score=rate_limit_risk['risk_score'],
            productivity_score=productivity,
            recommendations=list(set(recommendations))  # Remove duplicates
        )
    
    def export_analytics_data(self, output_path: str = None) -> str:
        """Export analytics data to JSON file"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"analytics_report_{timestamp}.json"
        
        metrics = self.generate_comprehensive_report()
        cost_analysis = self.analyze_cost_optimization()
        rate_limit_analysis = self.predict_rate_limit_risk()
        trends = self.generate_trend_analysis()
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'metrics': {
                'usage_efficiency': metrics.usage_efficiency,
                'cost_optimization_potential': metrics.cost_optimization_potential,
                'rate_limit_risk_score': metrics.rate_limit_risk_score,
                'productivity_score': metrics.productivity_score
            },
            'cost_analysis': cost_analysis,
            'rate_limit_analysis': rate_limit_analysis,
            'trends': trends,
            'recommendations': metrics.recommendations,
            'data_summary': {
                'total_sessions': len(self.session_data),
                'total_tokens': int(self.session_data['tokens_used'].sum()),
                'date_range': {
                    'start': self.session_data['start_time'].min().isoformat() if not self.session_data.empty else None,
                    'end': self.session_data['start_time'].max().isoformat() if not self.session_data.empty else None
                }
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        return output_path

def main():
    """Main function for testing the analytics engine"""
    db_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    engine = EnhancedAnalyticsEngine(db_path)
    
    print("🔍 Enhanced Analytics Engine")
    print("=" * 50)
    
    # Generate comprehensive report
    metrics = engine.generate_comprehensive_report()
    
    print(f"📊 Usage Efficiency: {metrics.usage_efficiency:.2f}")
    print(f"💰 Cost Optimization Potential: {metrics.cost_optimization_potential:.2f}")
    print(f"⚠️  Rate Limit Risk: {metrics.rate_limit_risk_score:.2f}")
    print(f"🎯 Productivity Score: {metrics.productivity_score:.2f}")
    
    print(f"\n📝 Recommendations:")
    for i, rec in enumerate(metrics.recommendations, 1):
        print(f"  {i}. {rec}")
    
    # Export full report
    report_file = engine.export_analytics_data()
    print(f"\n📄 Full report exported: {report_file}")

if __name__ == "__main__":
    main()