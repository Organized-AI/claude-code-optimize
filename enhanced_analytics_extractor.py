#!/usr/bin/env python3
"""
Enhanced Analytics Extractor for Claude Code Dashboard
====================================================

Extracts detailed analytics from JSONL files and system data
to provide rich dashboard insights.
"""

import json
import os
import sqlite3
import psutil
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import Dict, List, Any, Optional
import glob

class EnhancedAnalyticsExtractor:
    """Extract comprehensive analytics from all data sources"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.jsonl_patterns = [
            "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/claude-backup/projects/**/*.jsonl",
            "/Users/jordaaan/.claude/projects/**/*.jsonl"
        ]
    
    def extract_conversation_analytics(self, jsonl_file: str) -> Dict[str, Any]:
        """Extract detailed conversation analytics from JSONL"""
        
        analytics = {
            'session_id': None,
            'total_messages': 0,
            'user_messages': 0,
            'assistant_messages': 0,
            'response_times': [],
            'token_usage_timeline': [],
            'model_distribution': Counter(),
            'cache_analytics': {
                'total_creation': 0,
                'total_read': 0,
                'cache_hit_rate': 0,
                'cache_types': Counter()
            },
            'content_analysis': {
                'types': Counter(),
                'avg_input_length': 0,
                'avg_output_length': 0
            },
            'efficiency_metrics': {
                'tokens_per_response': 0,
                'input_output_ratio': 0,
                'cost_per_response': 0
            },
            'session_timeline': [],
            'working_directories': set(),
            'claude_versions': set()
        }
        
        if not os.path.exists(jsonl_file):
            return analytics
        
        conversation_flow = []
        prev_user_timestamp = None
        total_input_chars = 0
        total_output_chars = 0
        
        with open(jsonl_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    
                    # Basic session info
                    if 'sessionId' in data:
                        analytics['session_id'] = data['sessionId']
                    
                    # Working directory tracking
                    if 'cwd' in data:
                        analytics['working_directories'].add(data['cwd'])
                    
                    # Version tracking
                    if 'version' in data:
                        analytics['claude_versions'].add(data['version'])
                    
                    # Message counting and timeline
                    msg_type = data.get('type')
                    timestamp = data.get('timestamp')
                    
                    analytics['total_messages'] += 1
                    
                    if msg_type == 'user':
                        analytics['user_messages'] += 1
                        prev_user_timestamp = timestamp
                        
                        # Track user message content length
                        if 'message' in data and 'content' in data['message']:
                            total_input_chars += len(str(data['message']['content']))
                    
                    elif msg_type == 'assistant':
                        analytics['assistant_messages'] += 1
                        message = data.get('message', {})
                        
                        # Model tracking
                        if 'model' in message:
                            analytics['model_distribution'][message['model']] += 1
                        
                        # Response time calculation
                        if prev_user_timestamp and timestamp:
                            try:
                                user_time = datetime.fromisoformat(prev_user_timestamp.replace('Z', '+00:00'))
                                assistant_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                response_time = (assistant_time - user_time).total_seconds()
                                if 0 < response_time < 300:  # Reasonable response times only
                                    analytics['response_times'].append(response_time)
                            except:
                                pass
                        
                        # Token usage analysis
                        if 'usage' in message:
                            usage = message['usage']
                            
                            token_data = {
                                'timestamp': timestamp,
                                'input_tokens': usage.get('input_tokens', 0),
                                'output_tokens': usage.get('output_tokens', 0),
                                'cache_creation': usage.get('cache_creation_input_tokens', 0),
                                'cache_read': usage.get('cache_read_input_tokens', 0),
                                'service_tier': usage.get('service_tier', 'standard')
                            }
                            analytics['token_usage_timeline'].append(token_data)
                            
                            # Cache analytics
                            analytics['cache_analytics']['total_creation'] += token_data['cache_creation']
                            analytics['cache_analytics']['total_read'] += token_data['cache_read']
                            
                            # Cache type analysis
                            if 'cache_creation' in usage and isinstance(usage['cache_creation'], dict):
                                for cache_type, tokens in usage['cache_creation'].items():
                                    analytics['cache_analytics']['cache_types'][cache_type] += tokens
                        
                        # Content analysis
                        if 'content' in message and isinstance(message['content'], list):
                            for content_item in message['content']:
                                if isinstance(content_item, dict):
                                    content_type = content_item.get('type', 'unknown')
                                    analytics['content_analysis']['types'][content_type] += 1
                                    
                                    if content_type == 'text' and 'text' in content_item:
                                        total_output_chars += len(content_item['text'])
                    
                    # Timeline entry
                    analytics['session_timeline'].append({
                        'timestamp': timestamp,
                        'type': msg_type,
                        'uuid': data.get('uuid')
                    })
                
                except json.JSONDecodeError:
                    continue
        
        # Calculate derived metrics
        if analytics['assistant_messages'] > 0:
            # Average response time
            if analytics['response_times']:
                analytics['avg_response_time'] = sum(analytics['response_times']) / len(analytics['response_times'])
                analytics['min_response_time'] = min(analytics['response_times'])
                analytics['max_response_time'] = max(analytics['response_times'])
            
            # Token efficiency
            total_tokens = sum(t['input_tokens'] + t['output_tokens'] for t in analytics['token_usage_timeline'])
            analytics['efficiency_metrics']['tokens_per_response'] = total_tokens / analytics['assistant_messages']
            
            # Cache hit rate
            total_cache = analytics['cache_analytics']['total_creation'] + analytics['cache_analytics']['total_read']
            if total_cache > 0:
                analytics['cache_analytics']['cache_hit_rate'] = analytics['cache_analytics']['total_read'] / total_cache
            
            # Content length averages
            analytics['content_analysis']['avg_input_length'] = total_input_chars / analytics['user_messages'] if analytics['user_messages'] > 0 else 0
            analytics['content_analysis']['avg_output_length'] = total_output_chars / analytics['assistant_messages']
            
            # Input/output ratio
            total_input_tokens = sum(t['input_tokens'] for t in analytics['token_usage_timeline'])
            total_output_tokens = sum(t['output_tokens'] for t in analytics['token_usage_timeline'])
            if total_input_tokens > 0:
                analytics['efficiency_metrics']['input_output_ratio'] = total_output_tokens / total_input_tokens
        
        return analytics
    
    def get_system_performance(self) -> Dict[str, Any]:
        """Get real-time system performance metrics"""
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent,
            'network_io': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv
            },
            'claude_processes': self.get_claude_process_info(),
            'timestamp': datetime.now().isoformat()
        }
    
    def get_claude_process_info(self) -> List[Dict[str, Any]]:
        """Get detailed Claude process information"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'create_time', 'cwd']):
            try:
                if proc.info['name'] == 'claude':
                    processes.append({
                        'pid': proc.info['pid'],
                        'cpu_percent': proc.info['cpu_percent'],
                        'memory_percent': proc.info['memory_percent'],
                        'runtime_hours': (datetime.now().timestamp() - proc.info['create_time']) / 3600,
                        'cwd': proc.info['cwd']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return processes
    
    def generate_complete_analytics(self) -> Dict[str, Any]:
        """Generate complete analytics for dashboard"""
        
        # Find most recent JSONL file
        jsonl_files = []
        for pattern in self.jsonl_patterns:
            jsonl_files.extend(glob.glob(pattern, recursive=True))
        
        if jsonl_files:
            # Get most recent file
            jsonl_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            latest_jsonl = jsonl_files[0]
            
            conversation_analytics = self.extract_conversation_analytics(latest_jsonl)
        else:
            conversation_analytics = {}
        
        # Get system performance
        system_performance = self.get_system_performance()
        
        # Get database session info
        db_analytics = self.get_database_analytics()
        
        # Combine all analytics
        complete_analytics = {
            'conversation': conversation_analytics,
            'system': system_performance,
            'database': db_analytics,
            'summary': {
                'total_active_processes': len(system_performance.get('claude_processes', [])),
                'current_session_id': conversation_analytics.get('session_id'),
                'last_response_time': conversation_analytics.get('avg_response_time', 0),
                'cache_efficiency': conversation_analytics.get('cache_analytics', {}).get('cache_hit_rate', 0),
                'tokens_per_response': conversation_analytics.get('efficiency_metrics', {}).get('tokens_per_response', 0)
            },
            'generated_at': datetime.now().isoformat()
        }
        
        return complete_analytics
    
    def get_database_analytics(self) -> Dict[str, Any]:
        """Get analytics from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get session count by type
            cursor.execute("SELECT session_type, COUNT(*) FROM real_sessions GROUP BY session_type")
            session_counts = dict(cursor.fetchall())
            
            # Get latest session details
            cursor.execute("""
                SELECT id, real_total_tokens, models_used, start_time 
                FROM real_sessions 
                WHERE session_type = 'claude_code' 
                ORDER BY start_time DESC 
                LIMIT 1
            """)
            latest_session = cursor.fetchone()
            
            conn.close()
            
            return {
                'session_counts': session_counts,
                'latest_session': {
                    'id': latest_session[0] if latest_session else None,
                    'tokens': latest_session[1] if latest_session else 0,
                    'model': latest_session[2] if latest_session else None,
                    'start_time': latest_session[3] if latest_session else None
                } if latest_session else None
            }
        except Exception as e:
            return {'error': str(e)}

def generate_enhanced_analytics_json():
    """Generate enhanced analytics JSON for dashboard"""
    extractor = EnhancedAnalyticsExtractor('claude_usage.db')
    analytics = extractor.generate_complete_analytics()
    
    # Save to file
    output_file = 'moonlock-dashboard/enhanced-analytics.json'
    with open(output_file, 'w') as f:
        json.dump(analytics, f, indent=2)
    
    return analytics

if __name__ == "__main__":
    analytics = generate_enhanced_analytics_json()
    
    print("📊 ENHANCED ANALYTICS GENERATED")
    print("=" * 40)
    print()
    
    if 'conversation' in analytics and analytics['conversation']:
        conv = analytics['conversation']
        print("🔸 Conversation Analytics:")
        print(f"  • Session ID: {conv.get('session_id', 'N/A')}")
        print(f"  • Total Messages: {conv.get('total_messages', 0)}")
        print(f"  • Average Response Time: {conv.get('avg_response_time', 0):.1f}s")
        print(f"  • Tokens per Response: {conv.get('efficiency_metrics', {}).get('tokens_per_response', 0):.0f}")
        print(f"  • Cache Hit Rate: {conv.get('cache_analytics', {}).get('cache_hit_rate', 0):.1%}")
    
    if 'system' in analytics:
        sys = analytics['system']
        print()
        print("🔸 System Performance:")
        print(f"  • CPU Usage: {sys.get('cpu_percent', 0):.1f}%")
        print(f"  • Memory Usage: {sys.get('memory_percent', 0):.1f}%")
        print(f"  • Active Claude Processes: {len(sys.get('claude_processes', []))}")
    
    print()
    print(f"📄 Analytics saved to: enhanced-analytics.json")
