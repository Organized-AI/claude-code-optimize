#!/usr/bin/env python3
"""
Simplified Analytics Engine for Claude Code Optimizer
Provides predictive modeling and insights without external dependencies
"""

import sqlite3
import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple

class SimplifiedAnalyticsEngine:
    """Lightweight analytics engine for session optimization and insights"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.db_connection = sqlite3.connect(db_path, check_same_thread=False)
        self.db_connection.row_factory = sqlite3.Row
        
        # Load session data
        self.session_data = self._load_session_data()
        
    def _load_session_data(self) -> List[Dict]:
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
            cursor = self.db_connection.execute(query)
            rows = cursor.fetchall()
            
            sessions = []
            for row in rows:
                session = dict(row)
                
                # Parse timestamps
                if session['start_time']:
                    session['start_time'] = datetime.fromisoformat(session['start_time'].replace('Z', '+00:00'))
                if session['end_time']:
                    session['end_time'] = datetime.fromisoformat(session['end_time'].replace('Z', '+00:00'))
                if session['created_at']:
                    session['created_at'] = datetime.fromisoformat(session['created_at'].replace('Z', '+00:00'))
                
                # Calculate duration
                if session['start_time'] and session['end_time']:
                    duration_delta = session['end_time'] - session['start_time']
                    session['duration_minutes'] = duration_delta.total_seconds() / 60
                else:
                    session['duration_minutes'] = 0
                
                # Use real tokens if available, fallback to estimated
                session['tokens_used'] = session['real_total_tokens'] or session['estimated_tokens'] or 0
                
                sessions.append(session)
                
            return sessions
        except Exception as e:
            print(f"Error loading session data: {e}")
            return []
    
    def calculate_usage_efficiency(self) -> float:
        """Calculate usage efficiency score (0-1)"""
        if not self.session_data:
            return 0.0
            
        # Efficiency based on tokens per minute
        valid_sessions = [s for s in self.session_data if s['duration_minutes'] > 0]
        if not valid_sessions:
            return 0.0
            
        tokens_per_minute_values = [
            s['tokens_used'] / s['duration_minutes'] 
            for s in valid_sessions if s['tokens_used'] > 0
        ]
        
        if not tokens_per_minute_values:
            return 0.0
            
        # Calculate efficiency relative to target (100 tokens/minute)
        target_rate = 100
        avg_rate = sum(tokens_per_minute_values) / len(tokens_per_minute_values)
        efficiency = min(avg_rate / target_rate, 1.0)
        
        return efficiency
    
    def predict_rate_limit_risk(self, days_ahead: int = 13) -> Dict[str, Any]:
        """Predict rate limit risk for August 28 weekly limits"""
        if not self.session_data:
            return {
                'risk_score': 0.0,
                'daily_projection': 0,
                'weekly_projection': 0,
                'recommendations': []
            }
        
        # Calculate daily average from recent data
        now = datetime.now()
        recent_cutoff = now - timedelta(days=7)
        
        recent_sessions = [
            s for s in self.session_data 
            if s['start_time'] and s['start_time'] >= recent_cutoff
        ]
        
        if not recent_sessions:
            daily_avg = 0
        else:
            total_tokens = sum(s['tokens_used'] for s in recent_sessions)
            # Count unique days
            unique_dates = set(s['start_time'].date() for s in recent_sessions if s['start_time'])
            days_active = len(unique_dates) if unique_dates else 1
            daily_avg = total_tokens / days_active
        
        # Project to weekly usage
        weekly_projection = daily_avg * 7
        
        # Rate limit assumptions (weekly limits starting Aug 28)
        weekly_limit = 500000  # Conservative estimate
        risk_score = weekly_projection / weekly_limit if weekly_limit > 0 else 0
        
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
        if not self.session_data:
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
        
        for session in self.session_data:
            tokens = session['tokens_used']
            if tokens <= 0:
                continue
                
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
        if not self.session_data:
            return 0.0
            
        scores = []
        
        # 1. Session frequency (consistent usage is better)
        if len(self.session_data) >= 3:
            dates = [s['start_time'].date() for s in self.session_data if s['start_time']]
            if dates:
                date_range = (max(dates) - min(dates)).days
                if date_range > 0:
                    frequency_score = min(len(set(dates)) / date_range, 1.0)
                    scores.append(frequency_score)
        
        # 2. Session duration optimization
        durations = [s['duration_minutes'] for s in self.session_data if s['duration_minutes'] > 0]
        if durations:
            optimal_duration = 120  # 2 hours
            duration_scores = [
                max(0, 1.0 - abs(d - optimal_duration) / optimal_duration)
                for d in durations
            ]
            scores.append(sum(duration_scores) / len(duration_scores))
        
        # 3. Token efficiency
        efficiency = self.calculate_usage_efficiency()
        scores.append(efficiency)
        
        return sum(scores) / len(scores) if scores else 0.0
    
    def generate_trend_analysis(self) -> Dict[str, Any]:
        """Generate trend analysis and forecasting"""
        if not self.session_data:
            return {'trends': {}, 'forecasts': {}}
        
        # Group by date and sum tokens
        daily_usage = {}
        for session in self.session_data:
            if session['start_time']:
                date = session['start_time'].date()
                daily_usage[date] = daily_usage.get(date, 0) + session['tokens_used']
        
        if not daily_usage:
            return {'trends': {}, 'forecasts': {}}
        
        # Calculate trend direction
        dates = sorted(daily_usage.keys())
        if len(dates) >= 2:
            # Simple linear trend
            x_values = list(range(len(dates)))
            y_values = [daily_usage[date] for date in dates]
            
            # Calculate slope manually
            n = len(x_values)
            sum_x = sum(x_values)
            sum_y = sum(y_values)
            sum_xy = sum(x * y for x, y in zip(x_values, y_values))
            sum_x2 = sum(x * x for x in x_values)
            
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            trend_direction = 'increasing' if slope > 0 else 'decreasing'
        else:
            trend_direction = 'stable'
        
        # Weekly forecast
        usage_values = list(daily_usage.values())
        recent_avg = sum(usage_values[-7:]) / min(7, len(usage_values))
        weekly_forecast = recent_avg * 7
        
        return {
            'trends': {
                'direction': trend_direction,
                'daily_average': sum(usage_values) / len(usage_values),
                'recent_daily_average': recent_avg,
                'peak_usage_day': max(dates, key=lambda d: daily_usage[d]) if dates else None
            },
            'forecasts': {
                'next_week_tokens': int(weekly_forecast),
                'next_month_tokens': int(weekly_forecast * 4.3),
                'august_28_readiness': weekly_forecast < 350000  # Conservative weekly limit
            }
        }
    
    def generate_comprehensive_report(self) -> Dict[str, Any]:
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
        
        return {
            'usage_efficiency': efficiency,
            'cost_optimization_potential': cost_analysis['optimization_score'],
            'rate_limit_risk_score': rate_limit_risk['risk_score'],
            'productivity_score': productivity,
            'recommendations': list(set(recommendations)),  # Remove duplicates
            'cost_analysis': cost_analysis,
            'rate_limit_analysis': rate_limit_risk,
            'trends': trends
        }
    
    def export_analytics_data(self, output_path: str = None) -> str:
        """Export analytics data to JSON file"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"analytics_report_{timestamp}.json"
        
        report = self.generate_comprehensive_report()
        report.update({
            'generated_at': datetime.now().isoformat(),
            'data_summary': {
                'total_sessions': len(self.session_data),
                'total_tokens': sum(s['tokens_used'] for s in self.session_data),
                'date_range': {
                    'start': min(s['start_time'] for s in self.session_data if s['start_time']).isoformat() if self.session_data else None,
                    'end': max(s['start_time'] for s in self.session_data if s['start_time']).isoformat() if self.session_data else None
                }
            }
        })
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        return output_path

def main():
    """Main function for testing the analytics engine"""
    db_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    engine = SimplifiedAnalyticsEngine(db_path)
    
    print("🔍 Simplified Analytics Engine")
    print("=" * 50)
    
    # Generate comprehensive report
    report = engine.generate_comprehensive_report()
    
    print(f"📊 Usage Efficiency: {report['usage_efficiency']:.2f}")
    print(f"💰 Cost Optimization Potential: {report['cost_optimization_potential']:.2f}")
    print(f"⚠️  Rate Limit Risk: {report['rate_limit_risk_score']:.2f}")
    print(f"🎯 Productivity Score: {report['productivity_score']:.2f}")
    
    print(f"\n📝 Recommendations:")
    for i, rec in enumerate(report['recommendations'], 1):
        print(f"  {i}. {rec}")
    
    # Show data summary
    print(f"\n📈 Data Summary:")
    print(f"  Total Sessions: {len(engine.session_data)}")
    print(f"  Total Tokens: {sum(s['tokens_used'] for s in engine.session_data):,}")
    
    # Export full report
    report_file = engine.export_analytics_data()
    print(f"\n📄 Full report exported: {report_file}")

if __name__ == "__main__":
    main()