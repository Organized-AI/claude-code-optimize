#!/usr/bin/env python3
"""
Production Analytics Wrapper
Optimized for performance and compatibility
"""

import sqlite3
import json
from datetime import datetime, timedelta

class ProductionAnalyticsEngine:
    """Production-ready analytics engine"""
    
    def __init__(self, db_path):
        self.db_path = db_path
    
    def get_usage_summary(self):
        """Get quick usage summary"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Use view if available, fallback to table
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens
                FROM real_sessions 
                WHERE start_time >= date('now', '-7 days')
            """)
            row = cursor.fetchone()
            
            summary = {
                'total_sessions': row[0] if row else 0,
                'total_tokens': row[1] if row else 0,
                'avg_tokens_per_session': row[2] if row else 0,
                'daily_projection': (row[1] or 0) / 7,
                'weekly_projection': row[1] or 0
            }
            
        except Exception as e:
            summary = {'error': str(e), 'total_sessions': 0, 'total_tokens': 0}
        
        conn.close()
        return summary
    
    def get_rate_limit_forecast(self):
        """Get rate limit forecast for August 28"""
        summary = self.get_usage_summary()
        weekly_projection = summary.get('weekly_projection', 0)
        
        # Conservative weekly limit estimate
        weekly_limit = 500000
        risk_score = weekly_projection / weekly_limit if weekly_limit > 0 else 0
        
        return {
            'weekly_projection': int(weekly_projection),
            'weekly_limit': weekly_limit,
            'risk_score': risk_score,
            'status': 'low_risk' if risk_score < 0.6 else 'medium_risk' if risk_score < 0.8 else 'high_risk',
            'days_until_limits': 13,
            'recommendation': 'Current usage sustainable' if risk_score < 0.6 else 'Monitor usage closely'
        }

# Global instance for easy import
analytics = ProductionAnalyticsEngine("/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db")
