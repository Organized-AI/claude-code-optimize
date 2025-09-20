#!/usr/bin/env python3
"""
Comprehensive Data Analysis for Claude Code Optimizer
====================================================
Analyzes all available data sources to determine what can be displayed on dashboard
"""

import json
import sqlite3
import glob
import os
from datetime import datetime
from collections import defaultdict, Counter

def analyze_jsonl_files():
    """Analyze JSONL files to see all available data"""
    print("📄 CLAUDE CODE JSONL FILES ANALYSIS:")
    print("=" * 50)
    
    # Find all recent JSONL files
    patterns = [
        "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/claude-backup/projects/**/*.jsonl",
        "/Users/jordaaan/.claude/projects/**/*.jsonl"
    ]
    
    jsonl_files = []
    for pattern in patterns:
        files = glob.glob(pattern, recursive=True)
        for file in files:
            if os.path.exists(file) and os.path.getmtime(file) > (datetime.now().timestamp() - 86400):
                jsonl_files.append(file)
    
    if not jsonl_files:
        print("❌ No recent JSONL files found")
        return {}
    
    # Analyze the most recent file
    latest_file = max(jsonl_files, key=lambda x: os.path.getmtime(x))
    print(f"📁 Analyzing: {os.path.basename(latest_file)}")
    
    all_fields = set()
    usage_fields = set()
    message_fields = set()
    models_seen = set()
    conversation_data = []
    token_breakdown = defaultdict(int)
    
    try:
        with open(latest_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    
                    # Collect all fields
                    all_fields.update(data.keys())
                    
                    # Analyze messages
                    if 'message' in data:
                        message = data['message']
                        message_fields.update(message.keys())
                        
                        # Model information
                        if 'model' in message:
                            models_seen.add(message['model'])
                        
                        # Usage analysis
                        if 'usage' in message:
                            usage = message['usage']
                            usage_fields.update(usage.keys())
                            
                            # Aggregate token data
                            for token_type, count in usage.items():
                                if isinstance(count, (int, float)):
                                    token_breakdown[token_type] += count
                    
                    # Store conversation flow data
                    conversation_data.append({
                        'type': data.get('type'),
                        'timestamp': data.get('timestamp'),
                        'session_id': data.get('sessionId'),
                        'version': data.get('version'),
                        'cwd': data.get('cwd'),
                        'git_branch': data.get('gitBranch'),
                        'request_id': data.get('requestId'),
                        'parent_uuid': data.get('parentUuid'),
                        'user_type': data.get('userType')
                    })
                    
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"❌ Error reading JSONL: {e}")
        return {}
    
    # Print analysis results
    print(f"\n🔍 JSONL FIELD ANALYSIS:")
    print(f"   📊 Total Records: {len(conversation_data)}")
    print(f"   🤖 Models Used: {', '.join(models_seen)}")
    print(f"   📅 Date Range: Available in timestamps")
    
    print(f"\n📋 ALL AVAILABLE TOP-LEVEL FIELDS:")
    for field in sorted(all_fields):
        print(f"   • {field}")
    
    print(f"\n💬 MESSAGE STRUCTURE FIELDS:")
    for field in sorted(message_fields):
        print(f"   • message.{field}")
    
    print(f"\n💰 TOKEN USAGE BREAKDOWN:")
    for field in sorted(usage_fields):
        total = token_breakdown.get(field, 0)
        print(f"   • usage.{field}: {total:,} total")
    
    return {
        'all_fields': list(all_fields),
        'message_fields': list(message_fields),
        'usage_fields': list(usage_fields),
        'models': list(models_seen),
        'conversation_count': len(conversation_data),
        'token_breakdown': dict(token_breakdown),
        'conversation_data': conversation_data[:5]  # Sample data
    }

def analyze_database():
    """Analyze database structure and available data"""
    print(f"\n🗄️ DATABASE STRUCTURE ANALYSIS:")
    print("=" * 50)
    
    try:
        conn = sqlite3.connect('claude_usage.db')
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        db_analysis = {}
        
        for table_name, in tables:
            print(f"\n📊 TABLE: {table_name}")
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            print("   Columns:")
            for col in columns:
                col_name, col_type, not_null, default, pk = col[1], col[2], col[3], col[4], col[5]
                print(f"     • {col_name} ({col_type})")
            
            # Get sample data
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"   Records: {count}")
            
            if count > 0:
                # Get sample record
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
                sample = cursor.fetchone()
                if sample:
                    print("   Sample data available ✅")
            
            db_analysis[table_name] = {
                'columns': [col[1] for col in columns],
                'count': count
            }
        
        conn.close()
        return db_analysis
        
    except Exception as e:
        print(f"❌ Error analyzing database: {e}")
        return {}

def analyze_calculated_metrics():
    """Identify what metrics can be calculated from available data"""
    print(f"\n📈 CALCULABLE METRICS & ANALYTICS:")
    print("=" * 50)
    
    metrics = {
        "📊 Session Analytics": [
            "• Sessions per day/week/month",
            "• Average session duration",
            "• Session frequency patterns",
            "• Active hours heatmap",
            "• Session efficiency scoring",
            "• Conversation chain length analysis"
        ],
        
        "💰 Token Analytics": [
            "• Input vs Output token ratios",
            "• Cache hit rates (cache_read vs cache_creation)",
            "• Token efficiency per prompt",
            "• Cost per session/day/week",
            "• Token usage trends over time",
            "• Model-specific token consumption"
        ],
        
        "🤖 Model Usage Analytics": [
            "• Sonnet vs Opus usage breakdown",
            "• Model switching patterns",
            "• Model performance comparison",
            "• Cost optimization opportunities",
            "• Model recommendation accuracy"
        ],
        
        "📅 Time-based Analytics": [
            "• Peak usage hours",
            "• Day-of-week patterns",
            "• Session duration distributions",
            "• Rate limit approach warnings",
            "• Time-to-limit projections"
        ],
        
        "💻 Project/Context Analytics": [
            "• Most active projects (by CWD)",
            "• Git branch correlation",
            "• Claude Code version tracking",
            "• Project complexity correlation",
            "• Context switching patterns"
        ],
        
        "⚡ Performance Analytics": [
            "• Response time analysis",
            "• Request success rates",
            "• Cache performance metrics",
            "• Session reliability scoring",
            "• Error rate tracking"
        ],
        
        "🎯 Rate Limit Analytics": [
            "• 5-hour block utilization",
            "• Weekly usage prediction",
            "• Limit approach alerts",
            "• Usage optimization suggestions",
            "• Budget burn rate analysis"
        ]
    }
    
    for category, items in metrics.items():
        print(f"\n{category}")
        for item in items:
            print(f"  {item}")
    
    return metrics

def analyze_monitoring_data():
    """Check what monitoring/tracking data is available"""
    print(f"\n🔄 MONITORING & TRACKING DATA:")
    print("=" * 50)
    
    monitoring_files = [
        "moonlock-dashboard/real-session-data.json",
        "moonlock-dashboard/rate-limit-status.json",
        "session_tracker/dashboard.log",
        "session_tracker/enhanced_monitor_v3.log"
    ]
    
    available_data = {}
    
    for file_path in monitoring_files:
        if os.path.exists(file_path):
            try:
                file_size = os.path.getsize(file_path)
                mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                print(f"✅ {file_path}")
                print(f"   Size: {file_size:,} bytes")
                print(f"   Modified: {mod_time}")
                
                # Try to parse JSON files
                if file_path.endswith('.json'):
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        print(f"   Fields: {list(data.keys())}")
                        available_data[file_path] = data
                
            except Exception as e:
                print(f"⚠️ {file_path}: Error reading ({e})")
        else:
            print(f"❌ {file_path}: Not found")
    
    return available_data

def generate_dashboard_recommendations():
    """Generate recommendations for dashboard enhancements"""
    print(f"\n🎨 DASHBOARD ENHANCEMENT RECOMMENDATIONS:")
    print("=" * 50)
    
    recommendations = {
        "🔥 High Impact Additions": [
            "📊 Real-time token consumption rate (tokens/minute)",
            "⏰ Session duration with progress bar",
            "🎯 Efficiency score (output quality vs tokens used)",
            "📈 Usage trend chart (last 7 days)",
            "⚡ Cache hit rate percentage",
            "💡 Cost optimization suggestions"
        ],
        
        "📊 Advanced Analytics": [
            "📅 Weekly usage heatmap",
            "🤖 Model performance comparison chart",
            "📈 Token efficiency trends",
            "⏱️ Response time analytics", 
            "🔄 Session chaining analysis",
            "📊 Project-based usage breakdown"
        ],
        
        "🚨 Alert Systems": [
            "⚠️ Rate limit proximity warnings",
            "📊 Unusual usage pattern detection",
            "💰 Budget burn rate alerts",
            "⏰ Session duration warnings",
            "🎯 Efficiency drop notifications"
        ],
        
        "🎮 Interactive Features": [
            "🔍 Session deep-dive viewer",
            "📊 Custom date range filtering",
            "📈 Metric comparison tools",
            "⚙️ Threshold configuration",
            "📤 Usage report export"
        ]
    }
    
    for category, items in recommendations.items():
        print(f"\n{category}")
        for item in items:
            print(f"  {item}")

if __name__ == "__main__":
    print("🔍 COMPREHENSIVE DATA ANALYSIS FOR DASHBOARD")
    print("=" * 60)
    
    jsonl_data = analyze_jsonl_files()
    db_data = analyze_database()
    metrics = analyze_calculated_metrics()
    monitoring_data = analyze_monitoring_data()
    generate_dashboard_recommendations()
    
    print(f"\n✅ ANALYSIS COMPLETE!")
    print("=" * 60)
    print("📊 Data sources analyzed:")
    print(f"   • JSONL files: {len(jsonl_data)} field types")
    print(f"   • Database tables: {len(db_data)}")
    print(f"   • Monitoring files: {len(monitoring_data)}")
    print(f"   • Calculable metrics: {len(metrics)} categories")
