#!/usr/bin/env python3
"""
Generate Auto-Refreshing Dashboard with Rate Limits at Top
Creates a dashboard that auto-updates every 10 seconds
"""

import json
import sqlite3
from datetime import datetime, timedelta
from live_data_api_fixed import LiveDataAPI

def calculate_cache_efficiency(session_data, rate_limit_data):
    """Calculate comprehensive cache efficiency metrics"""
    
    try:
        # Get cache data from current session
        session = session_data['sessionData']
        cache_creation = session.get('cacheCreationTokens', 0)
        cache_read = session.get('cacheReadTokens', 0) 
        total_cache = session.get('totalCacheTokens', 0)
        billable_tokens = session.get('billableTokens', 0)
        real_tokens = session.get('realTokens', 0)
        
        # Calculate cache metrics
        cache_hit_rate = 0
        cache_savings_percentage = 0
        cache_cost_savings = 0
        
        if real_tokens > 0:
            cache_hit_rate = (cache_read / real_tokens) * 100
            
        if billable_tokens > 0 and total_cache > 0:
            # Assume cache reads cost 10% of normal tokens (typical for Claude)
            normal_cost = billable_tokens * 0.003  # $3 per 1M tokens average
            cache_cost = cache_read * 0.0003  # $0.30 per 1M cached tokens
            potential_full_cost = (billable_tokens + cache_read) * 0.003
            cache_cost_savings = potential_full_cost - (normal_cost + cache_cost)
            cache_savings_percentage = (cache_cost_savings / potential_full_cost) * 100 if potential_full_cost > 0 else 0
        
        # Efficiency grade
        if cache_hit_rate >= 40:
            efficiency_grade = "A+"
            efficiency_color = "#10b981"  # Green
        elif cache_hit_rate >= 25:
            efficiency_grade = "A"
            efficiency_color = "#34d399"  # Light green
        elif cache_hit_rate >= 15:
            efficiency_grade = "B"
            efficiency_color = "#fbbf24"  # Yellow
        elif cache_hit_rate >= 5:
            efficiency_grade = "C"
            efficiency_color = "#f59e0b"  # Orange
        else:
            efficiency_grade = "D"
            efficiency_color = "#dc2626"  # Red
            
        return {
            "cacheCreationTokens": cache_creation,
            "cacheReadTokens": cache_read,
            "totalCacheTokens": total_cache,
            "cacheHitRate": round(cache_hit_rate, 1),
            "cacheSavingsPercentage": round(cache_savings_percentage, 1),
            "cacheCostSavings": round(cache_cost_savings, 2),
            "efficiencyGrade": efficiency_grade,
            "efficiencyColor": efficiency_color,
            "cacheToTotalRatio": round((total_cache / real_tokens) * 100, 1) if real_tokens > 0 else 0,
            "creationToReadRatio": round(cache_creation / cache_read, 2) if cache_read > 0 else 0
        }
        
    except Exception as e:
        print(f"⚠️ Error calculating cache efficiency: {e}")
        return {
            "cacheCreationTokens": 0,
            "cacheReadTokens": 0,
            "totalCacheTokens": 0,
            "cacheHitRate": 0,
            "cacheSavingsPercentage": 0,
            "cacheCostSavings": 0,
            "efficiencyGrade": "N/A",
            "efficiencyColor": "#64748b",
            "cacheToTotalRatio": 0,
            "creationToReadRatio": 0
        }

def generate_auto_refresh_dashboard():
    """Generate an auto-refreshing dashboard with rate limits at top"""
    
    print("🔄 Generating auto-refresh dashboard with rate limits prioritized...")
    
    # Get real data from API
    api = LiveDataAPI()
    session_data = api._get_dashboard_data()
    rate_limit_data = api._get_rate_limit_data()
    analytics_data = api._get_analytics_data()
    
    # Calculate cache efficiency
    cache_efficiency = calculate_cache_efficiency(session_data, rate_limit_data)
    
    # Combine all data
    embedded_data = {
        "sessionData": session_data,
        "rateLimitData": rate_limit_data,
        "analyticsData": analytics_data,
        "cacheEfficiency": cache_efficiency,
        "generatedAt": datetime.now().isoformat(),
        "dataSource": "auto_refresh_embedded_data"
    }
    
    print(f"📊 Session: {session_data['sessionData']['activeSessionId'][:20]}...")
    print(f"💰 Cost: ${session
