# Enhanced analytics method for dashboard_server.py
# Replace the existing get_current_analytics method with this

@self.app.get("/api/analytics/current")
async def get_current_analytics():
    """Get current analytics with billable token focus"""
    try:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Today's stats - focus on billable tokens
        today = datetime.now().date()
        cursor.execute('''
            SELECT 
                session_type,
                COUNT(*) as session_count,
                SUM(COALESCE(billable_tokens, real_total_tokens, 0)) as billable_tokens,
                SUM(real_total_tokens) as total_tokens,
                SUM(COALESCE(input_output_tokens, 0)) as io_tokens,
                SUM(COALESCE(cache_creation_tokens, 0)) as cache_creation,
                SUM(COALESCE(cache_read_tokens, 0)) as cache_read,
                SUM(COALESCE(cost_estimate, 0)) as total_cost,
                AVG(total_messages) as avg_messages,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
            FROM real_sessions 
            WHERE DATE(start_time) = ?
            GROUP BY session_type
        ''', (today,))
        
        today_stats = {}
        for row in cursor.fetchall():
            today_stats[row[0]] = {
                "sessions": row[1],
                "billable_tokens": row[2] or 0,
                "total_tokens": row[3] or 0,
                "io_tokens": row[4] or 0,
                "cache_creation": row[5] or 0,
                "cache_read": row[6] or 0,
                "cost_estimate": row[7] or 0,
                "avg_messages": round(row[8] or 0, 1),
                "active": row[9]
            }
        
        # Current 5-hour block
        cursor.execute('''
            SELECT id, start_time, billable_tokens, total_tokens, is_complete 
            FROM five_hour_blocks 
            WHERE is_complete = FALSE 
            ORDER BY start_time DESC 
            LIMIT 1
        ''')
        
        current_block = cursor.fetchone()
        current_block_info = None
        
        if current_block:
            block_id, start_time_str, billable_tokens, total_tokens, is_complete = current_block
            start_time = datetime.fromisoformat(start_time_str)
            elapsed = datetime.now() - start_time
            elapsed_minutes = elapsed.total_seconds() / 60
            remaining_minutes = (5 * 60) - elapsed_minutes
            progress_percent = (elapsed_minutes / (5 * 60)) * 100
            
            current_block_info = {
                "id": block_id[:8],
                "start_time": start_time.strftime('%H:%M'),
                "end_time": (start_time + timedelta(hours=5)).strftime('%H:%M'),
                "elapsed_minutes": round(elapsed_minutes, 1),
                "remaining_minutes": round(max(remaining_minutes, 0), 1),
                "billable_tokens": billable_tokens or 0,
                "total_tokens": total_tokens or 0,
                "progress_percent": round(min(progress_percent, 100), 1),
                "status": "active" if remaining_minutes > 0 else "completed"
            }
        
        # Weekly quota analysis
        cursor.execute('''
            SELECT SUM(COALESCE(billable_tokens, real_total_tokens, 0))
            FROM real_sessions 
            WHERE start_time >= date('now', 'weekday 0', '-6 days')
        ''')
        
        weekly_billable_used = cursor.fetchone()[0] or 0
        quota_limit = 5_000_000  # Pro plan estimate
        quota_utilization = (weekly_billable_used / quota_limit) * 100
        
        weekly_quota_info = {
            "plan_type": "Pro ($20)",
            "used_billable": weekly_billable_used,
            "quota_limit": quota_limit,
            "utilization_percent": round(quota_utilization, 1),
            "remaining_tokens": quota_limit - weekly_billable_used,
            "alert_level": "critical" if quota_utilization >= 95 else 
                         "warning" if quota_utilization >= 80 else
                         "caution" if quota_utilization >= 60 else "good"
        }
        
        conn.close()
        
        return {
            "today": today_stats,
            "current_block": current_block_info,
            "weekly_quota": weekly_quota_info,
            "total_active_sessions": len(self._get_active_sessions()),
            "last_updated": datetime.now().isoformat(),
            "tracking_mode": "billable_tokens"
        }
        
    except Exception as e:
        print(f"Error in analytics: {e}")
        return {
            "error": str(e),
            "last_updated": datetime.now().isoformat()
        }
