#!/usr/bin/env python3
"""
Rate Limit Calculator for Claude Code Optimizer
==============================================

Calculates real-time progress toward 5-hour and weekly rate limits
based on actual Claude Code session data.
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any

class RateLimitCalculator:
    """Calculate rate limit progress for Claude Code Max Plan"""
    
    def __init__(self, db_path: str, plan_type: str = "max_5x"):
        self.db_path = db_path
        self.plan_type = plan_type
        
        # Rate limits for Max 5x Pro plan ($100/month)
        self.limits = {
            "max_5x": {
                "five_hour": {
                    "max_prompts": 150,        # Conservative estimate
                    "max_tokens": 300000,      # ~2000 tokens per prompt
                    "sonnet_weight": 1.0,      # Sonnet counts as 1x
                    "opus_weight": 2.5,        # Opus counts as 2.5x
                },
                "weekly": {
                    "max_prompts": 1000,       # Conservative weekly estimate
                    "max_tokens": 2000000,     # ~2000 tokens per prompt
                    "sonnet_hours": 280,       # From documentation
                    "opus_hours": 35,          # From documentation
                }
            }
        }
    
    def get_current_five_hour_block(self) -> Tuple[datetime, datetime]:
        """Get the current 5-hour block boundaries"""
        now = datetime.now()
        
        # 5-hour blocks: 0-5, 5-10, 10-15, 15-20, 20-24 (then reset)
        current_hour = now.hour
        block_start_hour = (current_hour // 5) * 5
        
        block_start = now.replace(hour=block_start_hour, minute=0, second=0, microsecond=0)
        block_end = block_start + timedelta(hours=5)
        
        return block_start, block_end
    
    def get_current_week_boundaries(self) -> Tuple[datetime, datetime]:
        """Get the current week boundaries (Monday to Monday)"""
        now = datetime.now()
        
        # Find last Monday
        days_since_monday = now.weekday()  # 0 = Monday
        week_start = now - timedelta(days=days_since_monday)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Next Monday
        week_end = week_start + timedelta(days=7)
        
        return week_start, week_end
    
    def get_sessions_in_period(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """Get all Claude Code sessions within a time period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, session_type, start_time, end_time, 
                   real_input_tokens, real_output_tokens, real_total_tokens,
                   models_used, total_messages, estimated_tokens
            FROM real_sessions 
            WHERE session_type = 'claude_code' 
            AND start_time >= ? AND start_time <= ?
            ORDER BY start_time DESC
        """, (start_time.isoformat(), end_time.isoformat()))
        
        sessions = []
        for row in cursor.fetchall():
            session_id, session_type, start_time, end_time, input_tokens, output_tokens, total_tokens, model, messages, estimated = row
            
            sessions.append({
                'id': session_id,
                'start_time': start_time,
                'end_time': end_time,
                'input_tokens': input_tokens or 0,
                'output_tokens': output_tokens or 0,
                'total_tokens': total_tokens or estimated or 0,
                'model': model or 'claude-sonnet-4',
                'messages': messages or 0,
                'estimated_prompts': max(1, (messages or 1))  # At least 1 prompt per session
            })
        
        conn.close()
        return sessions
    
    def calculate_model_weight(self, model_name: str) -> float:
        """Calculate the weight multiplier for different models"""
        if not model_name:
            return 1.0
        
        model_lower = model_name.lower()
        if 'opus' in model_lower:
            return self.limits[self.plan_type]["five_hour"]["opus_weight"]
        else:
            return self.limits[self.plan_type]["five_hour"]["sonnet_weight"]
    
    def calculate_five_hour_usage(self) -> Dict[str, Any]:
        """Calculate usage for the current 5-hour block"""
        block_start, block_end = self.get_current_five_hour_block()
        sessions = self.get_sessions_in_period(block_start, block_end)
        
        total_tokens = 0
        total_prompts = 0
        weighted_prompts = 0
        model_breakdown = {}
        
        for session in sessions:
            tokens = session['total_tokens']
            prompts = session['estimated_prompts']
            model = session['model']
            weight = self.calculate_model_weight(model)
            
            total_tokens += tokens
            total_prompts += prompts
            weighted_prompts += prompts * weight
            
            model_key = 'opus' if 'opus' in model.lower() else 'sonnet'
            model_breakdown[model_key] = model_breakdown.get(model_key, 0) + prompts
        
        limits = self.limits[self.plan_type]["five_hour"]
        
        # Calculate percentages based on both tokens and prompts
        token_percentage = (total_tokens / limits["max_tokens"]) * 100
        prompt_percentage = (weighted_prompts / limits["max_prompts"]) * 100
        
        # Use the higher percentage as the limiting factor
        usage_percentage = max(token_percentage, prompt_percentage)
        
        return {
            'period_start': block_start.isoformat(),
            'period_end': block_end.isoformat(),
            'total_tokens': total_tokens,
            'total_prompts': total_prompts,
            'weighted_prompts': weighted_prompts,
            'usage_percentage': min(usage_percentage, 100),  # Cap at 100%
            'token_percentage': token_percentage,
            'prompt_percentage': prompt_percentage,
            'sessions_count': len(sessions),
            'model_breakdown': model_breakdown,
            'limits': limits,
            'time_remaining_minutes': max(0, int((block_end - datetime.now()).total_seconds() / 60)),
            'status': self.get_status_level(usage_percentage)
        }
    
    def calculate_weekly_usage(self) -> Dict[str, Any]:
        """Calculate usage for the current week"""
        week_start, week_end = self.get_current_week_boundaries()
        sessions = self.get_sessions_in_period(week_start, week_end)
        
        total_tokens = 0
        total_sessions = len(sessions)
        total_prompts = 0
        model_breakdown = {'sonnet': 0, 'opus': 0}
        daily_breakdown = {}
        
        for session in sessions:
            tokens = session['total_tokens']
            prompts = session['estimated_prompts']
            model = session['model']
            session_date = datetime.fromisoformat(session['start_time']).date()
            
            total_tokens += tokens
            total_prompts += prompts
            
            model_key = 'opus' if 'opus' in model.lower() else 'sonnet'
            model_breakdown[model_key] += prompts
            
            # Daily breakdown
            date_str = session_date.isoformat()
            if date_str not in daily_breakdown:
                daily_breakdown[date_str] = {'tokens': 0, 'prompts': 0, 'sessions': 0}
            daily_breakdown[date_str]['tokens'] += tokens
            daily_breakdown[date_str]['prompts'] += prompts
            daily_breakdown[date_str]['sessions'] += 1
        
        limits = self.limits[self.plan_type]["weekly"]
        
        # Calculate percentages
        token_percentage = (total_tokens / limits["max_tokens"]) * 100
        session_percentage = (total_sessions / limits["max_prompts"]) * 100
        
        usage_percentage = max(token_percentage, session_percentage)
        
        return {
            'period_start': week_start.isoformat(),
            'period_end': week_end.isoformat(),
            'total_tokens': total_tokens,
            'total_sessions': total_sessions,
            'total_prompts': total_prompts,
            'usage_percentage': min(usage_percentage, 100),
            'token_percentage': token_percentage,
            'session_percentage': session_percentage,
            'model_breakdown': model_breakdown,
            'daily_breakdown': daily_breakdown,
            'limits': limits,
            'days_remaining': (week_end.date() - datetime.now().date()).days,
            'status': self.get_status_level(usage_percentage)
        }
    
    def get_status_level(self, percentage: float) -> str:
        """Get status level based on usage percentage"""
        if percentage < 70:
            return 'safe'
        elif percentage < 90:
            return 'warning'
        else:
            return 'danger'
    
    def get_complete_status(self) -> Dict[str, Any]:
        """Get complete rate limit status for dashboard"""
        five_hour = self.calculate_five_hour_usage()
        weekly = self.calculate_weekly_usage()
        
        return {
            'plan_type': self.plan_type,
            'plan_name': 'Max 5x Pro ($100/month)',
            'five_hour_block': five_hour,
            'weekly_limit': weekly,
            'last_updated': datetime.now().isoformat(),
            'overall_status': 'danger' if (five_hour['status'] == 'danger' or weekly['status'] == 'danger') else 
                            'warning' if (five_hour['status'] == 'warning' or weekly['status'] == 'warning') else 'safe'
        }

def update_rate_limit_json(db_path: str):
    """Update the rate limit JSON file for the dashboard"""
    calculator = RateLimitCalculator(db_path)
    status = calculator.get_complete_status()
    
    output_file = "moonlock-dashboard/rate-limit-status.json"
    with open(output_file, 'w') as f:
        json.dump(status, f, indent=2)
    
    print(f"📊 Rate limit status updated:")
    print(f"   5-Hour Block: {status['five_hour_block']['usage_percentage']:.1f}% ({status['five_hour_block']['status'].upper()})")
    print(f"   Weekly Limit: {status['weekly_limit']['usage_percentage']:.1f}% ({status['weekly_limit']['status'].upper()})")
    print(f"   Output: {output_file}")
    
    return status

if __name__ == "__main__":
    db_path = "claude_usage.db"
    status = update_rate_limit_json(db_path)
    
    # Pretty print the status
    print("\n🎯 COMPLETE RATE LIMIT STATUS:")
    print("=" * 40)
    print(json.dumps(status, indent=2))
