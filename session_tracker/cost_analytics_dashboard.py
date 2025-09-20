#!/usr/bin/env python3
"""
Cost Analytics Dashboard for Claude Code Optimizer

This module provides real-time cost analytics, optimization tracking,
and interactive dashboard for achieving 30% cost savings.

Features:
- Real-time cost monitoring and alerts
- Model usage analytics with optimization recommendations
- Rate limit planning for August 28, 2025
- Interactive web dashboard with live updates
- Historical cost trends and projections
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
import threading
import time
from flask import Flask, render_template_string, jsonify, request
from dataclasses import asdict

from intelligent_model_selector import IntelligentModelSelector, ModelType, MODEL_PRICING


class CostAnalytics:
    """Real-time cost analytics and monitoring system."""
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        self.model_selector = IntelligentModelSelector(database_path)
        
        # Analytics state
        self.current_metrics = {}
        self.cost_alerts = []
        self.optimization_recommendations = []
        
        # Rate limit planning
        self.weekly_limit_date = datetime(2025, 8, 28)
        self.target_savings = 30.0  # 30% cost reduction target
        
    def calculate_real_time_metrics(self) -> Dict[str, Any]:
        """Calculate real-time cost and usage metrics."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get recent usage data (last 24 hours)
            cursor.execute("""
                SELECT 
                    models_used,
                    real_input_tokens,
                    real_output_tokens,
                    real_total_tokens,
                    start_time
                FROM real_sessions 
                WHERE start_time > datetime('now', '-24 hours')
                AND real_total_tokens > 0
                ORDER BY start_time DESC
            """)
            
            recent_sessions = cursor.fetchall()
            
            # Calculate current costs by model
            model_costs = {model.value: 0.0 for model in ModelType}
            model_tokens = {model.value: 0 for model in ModelType}
            total_cost_24h = 0.0
            total_tokens_24h = 0
            
            for model_used, input_tokens, output_tokens, total_tokens, start_time in recent_sessions:
                if not model_used or not input_tokens or not output_tokens:
                    continue
                    
                # Parse model type
                model_type = self.model_selector._parse_model_type(model_used)
                if model_type:
                    cost = MODEL_PRICING[model_type].calculate_cost(input_tokens, output_tokens)
                    model_costs[model_type.value] += cost
                    model_tokens[model_type.value] += total_tokens
                    total_cost_24h += cost
                    total_tokens_24h += total_tokens
            
            # Get historical comparison (previous 24 hours)
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as prev_tokens
                FROM real_sessions 
                WHERE start_time BETWEEN datetime('now', '-48 hours') AND datetime('now', '-24 hours')
                AND real_total_tokens > 0
            """)
            
            prev_result = cursor.fetchone()
            prev_tokens_24h = prev_result[0] if prev_result and prev_result[0] else 0
            
            # Calculate trends
            token_trend = ((total_tokens_24h - prev_tokens_24h) / max(prev_tokens_24h, 1)) * 100
            
            # Get monthly totals for projections
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as monthly_tokens,
                    COUNT(*) as monthly_sessions
                FROM real_sessions 
                WHERE start_time > datetime('now', '-30 days')
                AND real_total_tokens > 0
            """)
            
            monthly_result = cursor.fetchone()
            monthly_tokens = monthly_result[0] if monthly_result and monthly_result[0] else 0
            monthly_sessions = monthly_result[1] if monthly_result and monthly_result[1] else 0
            
            conn.close()
            
            # Calculate optimization metrics
            optimization_analysis = self.model_selector.analyze_cost_optimization_opportunities()
            
            # Project to rate limit date
            days_to_limit = max((self.weekly_limit_date - datetime.now()).days, 0)
            daily_average_tokens = monthly_tokens / 30 if monthly_tokens > 0 else 0
            projected_usage = daily_average_tokens * days_to_limit
            
            metrics = {
                'current_usage': {
                    'total_cost_24h': round(total_cost_24h, 4),
                    'total_tokens_24h': total_tokens_24h,
                    'model_distribution': model_costs,
                    'token_distribution': model_tokens,
                    'sessions_24h': len(recent_sessions)
                },
                'trends': {
                    'token_change_24h': round(token_trend, 2),
                    'cost_trend': 'increasing' if token_trend > 5 else 'stable' if token_trend > -5 else 'decreasing'
                },
                'optimization': {
                    'potential_savings_pct': optimization_analysis.get('analysis_summary', {}).get('savings_percentage', 0),
                    'target_achievement': optimization_analysis.get('analysis_summary', {}).get('target_achieved', False),
                    'opportunities_count': optimization_analysis.get('optimization_opportunities', {}).get('high_impact_sessions', 0)
                },
                'rate_limit_planning': {
                    'days_to_limit': days_to_limit,
                    'daily_average_tokens': round(daily_average_tokens, 0),
                    'projected_usage_to_limit': round(projected_usage, 0),
                    'monthly_sessions': monthly_sessions,
                    'efficiency_status': self._calculate_efficiency_status(optimization_analysis)
                },
                'last_updated': datetime.now().isoformat()
            }
            
            self.current_metrics = metrics
            self._update_alerts_and_recommendations(metrics)
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error calculating real-time metrics: {e}")
            return {'error': str(e)}
    
    def _calculate_efficiency_status(self, optimization_analysis: Dict) -> str:
        """Calculate current efficiency status for rate limit planning."""
        if 'analysis_summary' not in optimization_analysis:
            return 'unknown'
            
        savings_pct = optimization_analysis['analysis_summary'].get('savings_percentage', 0)
        
        if savings_pct >= 30:
            return 'excellent'
        elif savings_pct >= 20:
            return 'good'
        elif savings_pct >= 10:
            return 'fair'
        else:
            return 'poor'
    
    def _update_alerts_and_recommendations(self, metrics: Dict):
        """Update cost alerts and optimization recommendations."""
        alerts = []
        recommendations = []
        
        # Cost alerts
        cost_24h = metrics['current_usage']['total_cost_24h']
        if cost_24h > 10.0:  # High daily cost threshold
            alerts.append({
                'type': 'high_cost',
                'severity': 'warning',
                'message': f"High daily cost: ${cost_24h:.2f} in last 24 hours",
                'timestamp': datetime.now().isoformat()
            })
        
        # Usage trend alerts
        token_trend = metrics['trends']['token_change_24h']
        if token_trend > 50:  # 50% increase
            alerts.append({
                'type': 'usage_spike',
                'severity': 'warning',
                'message': f"Usage spike: {token_trend:.1f}% increase in token usage",
                'timestamp': datetime.now().isoformat()
            })
        
        # Rate limit alerts
        days_to_limit = metrics['rate_limit_planning']['days_to_limit']
        if days_to_limit <= 14:  # 2 weeks warning
            efficiency = metrics['rate_limit_planning']['efficiency_status']
            if efficiency in ['poor', 'fair']:
                alerts.append({
                    'type': 'rate_limit_warning',
                    'severity': 'critical',
                    'message': f"Rate limits in {days_to_limit} days - optimization needed ({efficiency} efficiency)",
                    'timestamp': datetime.now().isoformat()
                })
        
        # Optimization recommendations
        savings_pct = metrics['optimization']['potential_savings_pct']
        if savings_pct < self.target_savings:
            gap = self.target_savings - savings_pct
            recommendations.append({
                'type': 'savings_gap',
                'priority': 'high',
                'message': f"Need {gap:.1f}% more savings to reach 30% target",
                'action': "Review model selection patterns and implement stricter complexity thresholds"
            })
        
        opportunities = metrics['optimization']['opportunities_count']
        total_sessions = metrics['current_usage']['sessions_24h']
        if opportunities > 0 and total_sessions > 0:
            opp_rate = (opportunities / total_sessions) * 100
            if opp_rate > 20:
                recommendations.append({
                    'type': 'frequent_overuse',
                    'priority': 'medium',
                    'message': f"{opp_rate:.1f}% of recent sessions used suboptimal models",
                    'action': "Enable real-time model recommendations and user education"
                })
        
        # Model distribution recommendations
        model_dist = metrics['current_usage']['token_distribution']
        total_tokens = sum(model_dist.values())
        if total_tokens > 0:
            opus_percentage = (model_dist.get('claude-3-opus', 0) / total_tokens) * 100
            if opus_percentage > 30:  # Too much Opus usage
                recommendations.append({
                    'type': 'opus_overuse',
                    'priority': 'high',
                    'message': f"Opus usage at {opus_percentage:.1f}% (recommend <20%)",
                    'action': "Implement task complexity analysis to reduce unnecessary Opus usage"
                })
        
        self.cost_alerts = alerts
        self.optimization_recommendations = recommendations
    
    def get_cost_breakdown_by_timeframe(self, timeframe: str = '7d') -> Dict[str, Any]:
        """Get detailed cost breakdown for specified timeframe."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Determine time filter
            time_filters = {
                '24h': "datetime('now', '-24 hours')",
                '7d': "datetime('now', '-7 days')",
                '30d': "datetime('now', '-30 days')",
                '90d': "datetime('now', '-90 days')"
            }
            
            time_filter = time_filters.get(timeframe, time_filters['7d'])
            
            cursor.execute(f"""
                SELECT 
                    DATE(start_time) as date,
                    models_used,
                    SUM(real_input_tokens) as input_tokens,
                    SUM(real_output_tokens) as output_tokens,
                    SUM(real_total_tokens) as total_tokens,
                    COUNT(*) as sessions
                FROM real_sessions 
                WHERE start_time > {time_filter}
                AND real_total_tokens > 0
                GROUP BY DATE(start_time), models_used
                ORDER BY date DESC, models_used
            """)
            
            daily_data = cursor.fetchall()
            conn.close()
            
            # Process data for chart display
            breakdown = {}
            daily_totals = {}
            model_totals = {model.value: {'cost': 0, 'tokens': 0, 'sessions': 0} for model in ModelType}
            
            for date, model_used, input_tokens, output_tokens, total_tokens, sessions in daily_data:
                if not model_used:
                    continue
                    
                model_type = self.model_selector._parse_model_type(model_used)
                if not model_type:
                    continue
                    
                cost = MODEL_PRICING[model_type].calculate_cost(input_tokens or 0, output_tokens or 0)
                
                # Daily breakdown
                if date not in breakdown:
                    breakdown[date] = {}
                breakdown[date][model_type.value] = {
                    'cost': round(cost, 4),
                    'tokens': total_tokens or 0,
                    'sessions': sessions
                }
                
                # Daily totals
                if date not in daily_totals:
                    daily_totals[date] = {'cost': 0, 'tokens': 0, 'sessions': 0}
                daily_totals[date]['cost'] += cost
                daily_totals[date]['tokens'] += total_tokens or 0
                daily_totals[date]['sessions'] += sessions
                
                # Model totals
                model_totals[model_type.value]['cost'] += cost
                model_totals[model_type.value]['tokens'] += total_tokens or 0
                model_totals[model_type.value]['sessions'] += sessions
            
            # Calculate summary statistics
            total_cost = sum(data['cost'] for data in daily_totals.values())
            total_tokens = sum(data['tokens'] for data in daily_totals.values())
            total_sessions = sum(data['sessions'] for data in daily_totals.values())
            
            # Calculate average daily cost
            days_with_data = len(daily_totals)
            avg_daily_cost = total_cost / max(days_with_data, 1)
            
            return {
                'timeframe': timeframe,
                'summary': {
                    'total_cost': round(total_cost, 4),
                    'total_tokens': total_tokens,
                    'total_sessions': total_sessions,
                    'average_daily_cost': round(avg_daily_cost, 4),
                    'days_with_data': days_with_data
                },
                'daily_breakdown': breakdown,
                'daily_totals': daily_totals,
                'model_totals': model_totals,
                'cost_efficiency': {
                    'cost_per_token': round(total_cost / max(total_tokens, 1) * 1000, 4),  # Cost per 1K tokens
                    'cost_per_session': round(total_cost / max(total_sessions, 1), 4)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting cost breakdown: {e}")
            return {'error': str(e)}
    
    def generate_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive optimization report."""
        try:
            # Get current metrics
            metrics = self.calculate_real_time_metrics()
            
            # Get optimization analysis
            optimization = self.model_selector.analyze_cost_optimization_opportunities()
            
            # Get usage projection
            projection = self.model_selector.generate_usage_projection(30)
            
            # Get cost breakdown
            cost_breakdown = self.get_cost_breakdown_by_timeframe('30d')
            
            # Calculate key performance indicators
            kpis = self._calculate_optimization_kpis(metrics, optimization, cost_breakdown)
            
            report = {
                'report_generated': datetime.now().isoformat(),
                'executive_summary': {
                    'current_savings_potential': optimization.get('analysis_summary', {}).get('savings_percentage', 0),
                    'target_achievement_status': 'Achieved' if optimization.get('analysis_summary', {}).get('target_achieved', False) else 'In Progress',
                    'rate_limit_readiness': metrics['rate_limit_planning']['efficiency_status'],
                    'days_to_rate_limits': metrics['rate_limit_planning']['days_to_limit'],
                    'monthly_cost': cost_breakdown['summary']['total_cost'],
                    'monthly_tokens': cost_breakdown['summary']['total_tokens']
                },
                'key_metrics': metrics,
                'optimization_analysis': optimization,
                'cost_projections': projection,
                'cost_breakdown': cost_breakdown,
                'performance_indicators': kpis,
                'alerts': self.cost_alerts,
                'recommendations': self.optimization_recommendations,
                'action_plan': self._generate_action_plan(metrics, optimization)
            }
            
            return report
            
        except Exception as e:
            self.logger.error(f"Error generating optimization report: {e}")
            return {'error': str(e)}
    
    def _calculate_optimization_kpis(self, metrics: Dict, optimization: Dict, cost_breakdown: Dict) -> Dict[str, Any]:
        """Calculate key performance indicators for optimization tracking."""
        kpis = {}
        
        # Cost efficiency KPIs
        if 'summary' in cost_breakdown:
            summary = cost_breakdown['summary']
            kpis['cost_per_1k_tokens'] = round((summary['total_cost'] / max(summary['total_tokens'], 1)) * 1000, 4)
            kpis['cost_per_session'] = round(summary['total_cost'] / max(summary['total_sessions'], 1), 4)
        
        # Optimization KPIs
        if 'analysis_summary' in optimization:
            opt_summary = optimization['analysis_summary']
            kpis['optimization_score'] = min(100, opt_summary.get('savings_percentage', 0) / 30 * 100)  # Score out of 100
            kpis['target_progress'] = min(100, (opt_summary.get('savings_percentage', 0) / 30) * 100)
        
        # Model distribution efficiency
        if 'current_usage' in metrics:
            token_dist = metrics['current_usage']['token_distribution']
            total_tokens = sum(token_dist.values())
            if total_tokens > 0:
                kpis['model_distribution_score'] = self._calculate_distribution_score(token_dist, total_tokens)
        
        # Rate limit readiness
        efficiency_status = metrics['rate_limit_planning']['efficiency_status']
        efficiency_scores = {'excellent': 100, 'good': 80, 'fair': 60, 'poor': 40, 'unknown': 0}
        kpis['rate_limit_readiness_score'] = efficiency_scores.get(efficiency_status, 0)
        
        return kpis
    
    def _calculate_distribution_score(self, token_dist: Dict, total_tokens: int) -> int:
        """Calculate model distribution efficiency score."""
        # Ideal distribution: 40% Haiku, 45% Sonnet, 15% Opus
        ideal_dist = {
            'claude-3-haiku': 0.40,
            'claude-3-sonnet': 0.45,
            'claude-3-opus': 0.15
        }
        
        actual_dist = {
            model: tokens / total_tokens for model, tokens in token_dist.items()
        }
        
        # Calculate deviation from ideal
        total_deviation = 0
        for model, ideal_pct in ideal_dist.items():
            actual_pct = actual_dist.get(model, 0)
            total_deviation += abs(ideal_pct - actual_pct)
        
        # Convert to score (lower deviation = higher score)
        score = max(0, 100 - (total_deviation * 100))
        return round(score)
    
    def _generate_action_plan(self, metrics: Dict, optimization: Dict) -> List[Dict[str, Any]]:
        """Generate prioritized action plan for optimization."""
        actions = []
        
        # Priority 1: Critical rate limit preparation
        days_to_limit = metrics['rate_limit_planning']['days_to_limit']
        if days_to_limit <= 30:
            efficiency = metrics['rate_limit_planning']['efficiency_status']
            if efficiency in ['poor', 'fair']:
                actions.append({
                    'priority': 1,
                    'category': 'rate_limit_preparation',
                    'action': 'Implement immediate model selection optimization',
                    'description': f"Rate limits in {days_to_limit} days with {efficiency} efficiency",
                    'timeline': 'immediate',
                    'impact': 'critical'
                })
        
        # Priority 2: Address savings gap
        if 'analysis_summary' in optimization:
            savings_pct = optimization['analysis_summary'].get('savings_percentage', 0)
            if savings_pct < 30:
                gap = 30 - savings_pct
                actions.append({
                    'priority': 2,
                    'category': 'cost_optimization',
                    'action': f'Close {gap:.1f}% savings gap to reach 30% target',
                    'description': 'Review and optimize model selection for recent high-cost sessions',
                    'timeline': '1-2 weeks',
                    'impact': 'high'
                })
        
        # Priority 3: Model distribution optimization
        if 'current_usage' in metrics:
            token_dist = metrics['current_usage']['token_distribution']
            total_tokens = sum(token_dist.values())
            if total_tokens > 0:
                opus_pct = (token_dist.get('claude-3-opus', 0) / total_tokens) * 100
                if opus_pct > 25:  # Too much Opus usage
                    actions.append({
                        'priority': 3,
                        'category': 'model_optimization',
                        'action': f'Reduce Opus usage from {opus_pct:.1f}% to <20%',
                        'description': 'Implement task complexity analysis to reduce unnecessary Opus usage',
                        'timeline': '2-3 weeks',
                        'impact': 'medium'
                    })
        
        # Priority 4: Monitoring and alerts
        if len(self.cost_alerts) == 0:  # No current monitoring
            actions.append({
                'priority': 4,
                'category': 'monitoring',
                'action': 'Set up real-time cost monitoring and alerts',
                'description': 'Implement automated cost tracking with threshold alerts',
                'timeline': '1 week',
                'impact': 'medium'
            })
        
        return actions


class CostAnalyticsDashboard:
    """Web-based dashboard for cost analytics and optimization tracking."""
    
    def __init__(self, database_path: str, host: str = 'localhost', port: int = 5001):
        self.database_path = database_path
        self.analytics = CostAnalytics(database_path)
        self.host = host
        self.port = port
        
        # Initialize Flask app
        self.app = Flask(__name__)
        self.setup_routes()
        
        # Background monitoring
        self.monitoring_active = False
        self.monitor_thread = None
        
    def setup_routes(self):
        """Set up Flask routes for the dashboard."""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string(DASHBOARD_TEMPLATE)
        
        @self.app.route('/api/metrics')
        def api_metrics():
            """Get current metrics."""
            return jsonify(self.analytics.calculate_real_time_metrics())
        
        @self.app.route('/api/cost-breakdown/<timeframe>')
        def api_cost_breakdown(timeframe):
            """Get cost breakdown for timeframe."""
            return jsonify(self.analytics.get_cost_breakdown_by_timeframe(timeframe))
        
        @self.app.route('/api/optimization-report')
        def api_optimization_report():
            """Get full optimization report."""
            return jsonify(self.analytics.generate_optimization_report())
        
        @self.app.route('/api/recommend-model', methods=['POST'])
        def api_recommend_model():
            """Get model recommendation for task."""
            data = request.get_json()
            task_description = data.get('task_description', '')
            
            if not task_description:
                return jsonify({'error': 'Task description required'}), 400
            
            recommendation = self.analytics.model_selector.recommend_model(task_description)
            return jsonify(asdict(recommendation))
        
        @self.app.route('/api/alerts')
        def api_alerts():
            """Get current alerts and recommendations."""
            return jsonify({
                'alerts': self.analytics.cost_alerts,
                'recommendations': self.analytics.optimization_recommendations
            })
    
    def start_dashboard(self, debug: bool = False):
        """Start the web dashboard."""
        self.start_background_monitoring()
        print(f"Starting Cost Analytics Dashboard at http://{self.host}:{self.port}")
        self.app.run(host=self.host, port=self.port, debug=debug, threaded=True)
    
    def start_background_monitoring(self):
        """Start background monitoring for real-time updates."""
        if self.monitoring_active:
            return
            
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
    
    def _monitoring_loop(self):
        """Background monitoring loop."""
        while self.monitoring_active:
            try:
                # Update metrics every 30 seconds
                self.analytics.calculate_real_time_metrics()
                time.sleep(30)
            except Exception as e:
                logging.error(f"Error in monitoring loop: {e}")
                time.sleep(60)  # Wait longer on error


# HTML template for the dashboard
DASHBOARD_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Optimizer - Cost Analytics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header h1 { color: #1d1d1f; font-size: 28px; margin-bottom: 8px; }
        .header .subtitle { color: #86868b; font-size: 16px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .card h3 { color: #1d1d1f; font-size: 18px; margin-bottom: 16px; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .metric-value { font-weight: 600; color: #007aff; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-excellent { background: #d1f2d1; color: #1e6e1e; }
        .status-good { background: #d4edda; color: #155724; }
        .status-fair { background: #fff3cd; color: #856404; }
        .status-poor { background: #f8d7da; color: #721c24; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
        .alert-warning { background: #f8d7da; border-color: #f5c6cb; }
        .alert-critical { background: #f8d7da; border-color: #f5c6cb; color: #721c24; }
        .progress-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #007aff; transition: width 0.3s ease; }
        .chart-container { position: relative; height: 300px; margin-top: 20px; }
        .model-recommend { margin-top: 20px; }
        .model-recommend input { width: 100%; padding: 12px; border: 1px solid #d2d2d7; border-radius: 8px; margin-bottom: 12px; }
        .btn { background: #007aff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
        .btn:hover { background: #0056cc; }
        .recommendation-result { background: #f8f9fa; border-radius: 8px; padding: 16px; margin-top: 12px; display: none; }
        .loading { text-align: center; color: #86868b; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cost Analytics Dashboard</h1>
            <p class="subtitle">Real-time cost monitoring and optimization for Claude Code usage</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>Current Usage (24h)</h3>
                <div id="current-usage" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h3>Optimization Status</h3>
                <div id="optimization-status" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h3>Rate Limit Planning</h3>
                <div id="rate-limit-planning" class="loading">Loading...</div>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>Cost Trends</h3>
                <div class="chart-container">
                    <canvas id="costChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <h3>Model Distribution</h3>
                <div class="chart-container">
                    <canvas id="modelChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>Alerts & Recommendations</h3>
            <div id="alerts-recommendations" class="loading">Loading...</div>
        </div>
        
        <div class="card">
            <h3>Model Recommendation Tool</h3>
            <div class="model-recommend">
                <input type="text" id="taskInput" placeholder="Describe your coding task..." />
                <button class="btn" onclick="getRecommendation()">Get Recommendation</button>
                <div id="recommendationResult" class="recommendation-result"></div>
            </div>
        </div>
    </div>

    <script>
        let costChart = null;
        let modelChart = null;
        
        async function loadDashboard() {
            try {
                const [metrics, costBreakdown, alerts] = await Promise.all([
                    fetch('/api/metrics').then(r => r.json()),
                    fetch('/api/cost-breakdown/7d').then(r => r.json()),
                    fetch('/api/alerts').then(r => r.json())
                ]);
                
                updateCurrentUsage(metrics);
                updateOptimizationStatus(metrics);
                updateRateLimitPlanning(metrics);
                updateCostChart(costBreakdown);
                updateModelChart(metrics);
                updateAlertsRecommendations(alerts);
                
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }
        
        function updateCurrentUsage(metrics) {
            const usage = metrics.current_usage;
            const html = `
                <div class="metric">
                    <span>Total Cost (24h)</span>
                    <span class="metric-value">$${usage.total_cost_24h.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span>Total Tokens</span>
                    <span class="metric-value">${usage.total_tokens_24h.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span>Sessions</span>
                    <span class="metric-value">${usage.sessions_24h}</span>
                </div>
                <div class="metric">
                    <span>Trend</span>
                    <span class="metric-value">${metrics.trends.token_change_24h > 0 ? '+' : ''}${metrics.trends.token_change_24h.toFixed(1)}%</span>
                </div>
            `;
            document.getElementById('current-usage').innerHTML = html;
        }
        
        function updateOptimizationStatus(metrics) {
            const opt = metrics.optimization;
            const statusClass = opt.target_achievement ? 'status-excellent' : 'status-fair';
            const html = `
                <div class="metric">
                    <span>Potential Savings</span>
                    <span class="metric-value">${opt.potential_savings_pct.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span>Target Progress</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, (opt.potential_savings_pct / 30) * 100)}%"></div>
                    </div>
                </div>
                <div class="metric">
                    <span>Status</span>
                    <span class="status-badge ${statusClass}">${opt.target_achievement ? 'Target Achieved' : 'In Progress'}</span>
                </div>
                <div class="metric">
                    <span>Opportunities</span>
                    <span class="metric-value">${opt.opportunities_count}</span>
                </div>
            `;
            document.getElementById('optimization-status').innerHTML = html;
        }
        
        function updateRateLimitPlanning(metrics) {
            const planning = metrics.rate_limit_planning;
            const statusClasses = {
                'excellent': 'status-excellent',
                'good': 'status-good', 
                'fair': 'status-fair',
                'poor': 'status-poor'
            };
            const html = `
                <div class="metric">
                    <span>Days to Limits</span>
                    <span class="metric-value">${planning.days_to_limit}</span>
                </div>
                <div class="metric">
                    <span>Daily Average</span>
                    <span class="metric-value">${planning.daily_average_tokens.toLocaleString()} tokens</span>
                </div>
                <div class="metric">
                    <span>Projected Usage</span>
                    <span class="metric-value">${planning.projected_usage_to_limit.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span>Efficiency</span>
                    <span class="status-badge ${statusClasses[planning.efficiency_status] || 'status-fair'}">${planning.efficiency_status}</span>
                </div>
            `;
            document.getElementById('rate-limit-planning').innerHTML = html;
        }
        
        function updateCostChart(costBreakdown) {
            const ctx = document.getElementById('costChart').getContext('2d');
            
            if (costChart) {
                costChart.destroy();
            }
            
            const dates = Object.keys(costBreakdown.daily_totals).reverse();
            const costs = dates.map(date => costBreakdown.daily_totals[date].cost);
            
            costChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Daily Cost ($)',
                        data: costs,
                        borderColor: '#007aff',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toFixed(4);
                                }
                            }
                        }
                    }
                }
            });
        }
        
        function updateModelChart(metrics) {
            const ctx = document.getElementById('modelChart').getContext('2d');
            
            if (modelChart) {
                modelChart.destroy();
            }
            
            const distribution = metrics.current_usage.token_distribution;
            const models = Object.keys(distribution);
            const tokens = Object.values(distribution);
            
            modelChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: models.map(m => m.replace('claude-3-', '')),
                    datasets: [{
                        data: tokens,
                        backgroundColor: ['#34c759', '#007aff', '#ff9500']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        function updateAlertsRecommendations(data) {
            const alerts = data.alerts || [];
            const recommendations = data.recommendations || [];
            
            let html = '';
            
            alerts.forEach(alert => {
                const alertClass = alert.severity === 'critical' ? 'alert-critical' : 
                                 alert.severity === 'warning' ? 'alert-warning' : 'alert';
                html += `<div class="${alertClass}"><strong>Alert:</strong> ${alert.message}</div>`;
            });
            
            recommendations.forEach(rec => {
                html += `<div class="alert"><strong>Recommendation:</strong> ${rec.message} - ${rec.action}</div>`;
            });
            
            if (!alerts.length && !recommendations.length) {
                html = '<p style="color: #86868b;">No current alerts or recommendations.</p>';
            }
            
            document.getElementById('alerts-recommendations').innerHTML = html;
        }
        
        async function getRecommendation() {
            const taskInput = document.getElementById('taskInput').value.trim();
            if (!taskInput) {
                alert('Please enter a task description');
                return;
            }
            
            const resultDiv = document.getElementById('recommendationResult');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = 'Getting recommendation...';
            
            try {
                const response = await fetch('/api/recommend-model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_description: taskInput })
                });
                
                const rec = await response.json();
                
                const html = `
                    <h4>Recommendation for: "${taskInput}"</h4>
                    <div class="metric">
                        <span>Recommended Model</span>
                        <span class="metric-value">${rec.recommended_model}</span>
                    </div>
                    <div class="metric">
                        <span>Confidence</span>
                        <span class="metric-value">${(rec.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span>Complexity Score</span>
                        <span class="metric-value">${rec.complexity_score}/10</span>
                    </div>
                    <div class="metric">
                        <span>Estimated Cost</span>
                        <span class="metric-value">$${rec.estimated_cost.toFixed(4)}</span>
                    </div>
                    <p><strong>Rationale:</strong> ${rec.rationale}</p>
                    <p><strong>Risk Assessment:</strong> ${rec.risk_assessment}</p>
                `;
                
                resultDiv.innerHTML = html;
                
            } catch (error) {
                resultDiv.innerHTML = 'Error getting recommendation: ' + error.message;
            }
        }
        
        // Load dashboard on page load
        document.addEventListener('DOMContentLoaded', loadDashboard);
        
        // Refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
'''


def main():
    """Main function for the cost analytics dashboard."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Cost Analytics Dashboard for Claude Code Optimizer')
    parser.add_argument('database', help='Path to the SQLite database')
    parser.add_argument('--host', default='localhost', help='Dashboard host (default: localhost)')
    parser.add_argument('--port', type=int, default=5001, help='Dashboard port (default: 5001)')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Start dashboard
    dashboard = CostAnalyticsDashboard(args.database, args.host, args.port)
    dashboard.start_dashboard(debug=args.debug)


if __name__ == "__main__":
    main()