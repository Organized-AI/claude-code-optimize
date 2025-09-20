#!/usr/bin/env python3
"""
Analytics Dashboard Integration
Provides real-time analytics API endpoints for the live dashboard
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from enhanced_analytics_engine import EnhancedAnalyticsEngine
import uvicorn

class AnalyticsDashboardAPI:
    """API server for analytics dashboard integration"""
    
    def __init__(self, db_path: str, port: int = 3002):
        self.db_path = db_path
        self.port = port
        self.analytics_engine = EnhancedAnalyticsEngine(db_path)
        self.app = FastAPI(title="Claude Analytics Dashboard", version="1.0.0")
        
        self._setup_middleware()
        self._setup_routes()
    
    def _setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes for analytics data"""
        
        @self.app.get("/api/analytics/overview")
        async def get_analytics_overview():
            """Get comprehensive analytics overview"""
            try:
                metrics = self.analytics_engine.generate_comprehensive_report()
                cost_analysis = self.analytics_engine.analyze_cost_optimization()
                rate_limit_analysis = self.analytics_engine.predict_rate_limit_risk()
                trends = self.analytics_engine.generate_trend_analysis()
                
                return {
                    "status": "success",
                    "data": {
                        "metrics": {
                            "usage_efficiency": round(metrics.usage_efficiency, 3),
                            "cost_optimization_potential": round(metrics.cost_optimization_potential, 3),
                            "rate_limit_risk_score": round(metrics.rate_limit_risk_score, 3),
                            "productivity_score": round(metrics.productivity_score, 3)
                        },
                        "cost_analysis": cost_analysis,
                        "rate_limit_analysis": rate_limit_analysis,
                        "trends": trends,
                        "recommendations": metrics.recommendations
                    },
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/efficiency")
        async def get_efficiency_metrics():
            """Get detailed efficiency metrics"""
            try:
                efficiency = self.analytics_engine.calculate_usage_efficiency()
                productivity = self.analytics_engine.calculate_productivity_score()
                
                # Additional efficiency breakdown
                session_data = self.analytics_engine.session_data
                
                metrics = {
                    "overall_efficiency": round(efficiency, 3),
                    "productivity_score": round(productivity, 3),
                    "total_sessions": len(session_data),
                    "average_session_duration": 0,
                    "tokens_per_minute": 0
                }
                
                if not session_data.empty:
                    valid_durations = session_data[session_data['duration_minutes'] > 0]
                    if not valid_durations.empty:
                        metrics["average_session_duration"] = round(
                            valid_durations['duration_minutes'].mean(), 2
                        )
                        metrics["tokens_per_minute"] = round(
                            (valid_durations['tokens_used'] / valid_durations['duration_minutes']).mean(), 2
                        )
                
                return {
                    "status": "success",
                    "data": metrics,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/cost-optimization")
        async def get_cost_optimization():
            """Get detailed cost optimization analysis"""
            try:
                analysis = self.analytics_engine.analyze_cost_optimization()
                return {
                    "status": "success",
                    "data": analysis,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/rate-limit-forecast")
        async def get_rate_limit_forecast():
            """Get rate limit forecasting for August 28"""
            try:
                forecast = self.analytics_engine.predict_rate_limit_risk()
                return {
                    "status": "success",
                    "data": forecast,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/trends")
        async def get_trend_analysis():
            """Get trend analysis and forecasting"""
            try:
                trends = self.analytics_engine.generate_trend_analysis()
                return {
                    "status": "success",
                    "data": trends,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/recommendations")
        async def get_recommendations():
            """Get AI-powered optimization recommendations"""
            try:
                metrics = self.analytics_engine.generate_comprehensive_report()
                cost_analysis = self.analytics_engine.analyze_cost_optimization()
                rate_limit_analysis = self.analytics_engine.predict_rate_limit_risk()
                
                # Categorize recommendations
                categorized_recommendations = {
                    "cost_optimization": cost_analysis.get('recommendations', []),
                    "rate_limit_management": rate_limit_analysis.get('recommendations', []),
                    "general_optimization": metrics.recommendations
                }
                
                # Add priority scoring
                high_priority = []
                medium_priority = []
                low_priority = []
                
                for category, recs in categorized_recommendations.items():
                    for rec in recs:
                        if any(word in rec.upper() for word in ['HIGH', 'CRITICAL', 'URGENT']):
                            high_priority.append({"text": rec, "category": category})
                        elif any(word in rec.upper() for word in ['MEDIUM', 'CONSIDER']):
                            medium_priority.append({"text": rec, "category": category})
                        else:
                            low_priority.append({"text": rec, "category": category})
                
                return {
                    "status": "success",
                    "data": {
                        "by_category": categorized_recommendations,
                        "by_priority": {
                            "high": high_priority,
                            "medium": medium_priority,
                            "low": low_priority
                        },
                        "total_recommendations": sum(len(recs) for recs in categorized_recommendations.values())
                    },
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/dashboard-widgets")
        async def get_dashboard_widgets():
            """Get widget data optimized for dashboard display"""
            try:
                metrics = self.analytics_engine.generate_comprehensive_report()
                cost_analysis = self.analytics_engine.analyze_cost_optimization()
                rate_limit_analysis = self.analytics_engine.predict_rate_limit_risk()
                trends = self.analytics_engine.generate_trend_analysis()
                
                # Format for dashboard widgets
                widgets = {
                    "efficiency_gauge": {
                        "value": round(metrics.usage_efficiency * 100, 1),
                        "max": 100,
                        "unit": "%",
                        "status": "good" if metrics.usage_efficiency > 0.7 else "warning" if metrics.usage_efficiency > 0.4 else "danger"
                    },
                    "cost_savings": {
                        "potential": round(cost_analysis.get('savings_percentage', 0), 1),
                        "amount": round(cost_analysis.get('potential_savings', 0) * 30, 2),
                        "unit": "$",
                        "status": "good" if cost_analysis.get('savings_percentage', 0) > 15 else "warning"
                    },
                    "rate_limit_risk": {
                        "value": round(rate_limit_analysis['risk_score'] * 100, 1),
                        "max": 100,
                        "unit": "%",
                        "status": "danger" if rate_limit_analysis['risk_score'] > 0.8 else "warning" if rate_limit_analysis['risk_score'] > 0.6 else "good",
                        "days_remaining": rate_limit_analysis.get('days_until_limits', 13)
                    },
                    "productivity": {
                        "value": round(metrics.productivity_score * 100, 1),
                        "max": 100,
                        "unit": "%",
                        "status": "good" if metrics.productivity_score > 0.7 else "warning"
                    },
                    "daily_usage": {
                        "current": rate_limit_analysis.get('daily_projection', 0),
                        "trend": trends['trends']['direction'],
                        "unit": "tokens"
                    },
                    "recommendations_count": len(metrics.recommendations)
                }
                
                return {
                    "status": "success",
                    "data": widgets,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/analytics/health")
        async def get_analytics_health():
            """Health check endpoint for analytics API"""
            return {
                "status": "healthy",
                "service": "Claude Analytics Dashboard API",
                "version": "1.0.0",
                "database_connected": True,
                "timestamp": datetime.now().isoformat()
            }
    
    def run(self):
        """Start the analytics API server"""
        print(f"🚀 Starting Claude Analytics Dashboard API on port {self.port}")
        print(f"📊 Analytics endpoints available at http://localhost:{self.port}/api/analytics/")
        uvicorn.run(self.app, host="0.0.0.0", port=self.port)

def main():
    """Main function to start the analytics dashboard API"""
    db_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    api = AnalyticsDashboardAPI(db_path)
    api.run()

if __name__ == "__main__":
    main()