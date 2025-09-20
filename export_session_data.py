#!/usr/bin/env python3
"""
Export Claude Code session data for Supabase import
Creates JSON files that can be imported via Supabase dashboard
"""
import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Any

def convert_to_iso_datetime(dt_str):
    """Convert datetime string to ISO format for Supabase"""
    if not dt_str:
        return None
    
    try:
        # Try to parse various datetime formats
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S.%f"
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(dt_str, fmt)
                # Assume UTC if no timezone info
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue
        
        # If all formats fail, try fromisoformat
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.isoformat()
        
    except Exception as e:
        print(f"⚠️  Could not parse datetime '{dt_str}': {e}")
        return dt_str

def export_sqlite_data(db_path: str) -> Dict[str, List[Dict]]:
    """Export data from SQLite database"""
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return {}
    
    print(f"📊 Exporting from {db_path}...")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    data = {}
    
    # Export sessions
    try:
        cursor.execute("""
            SELECT * FROM sessions 
            ORDER BY start_time DESC 
            LIMIT 100
        """)
        
        sessions = []
        for row in cursor.fetchall():
            session = dict(row)
            # Convert datetime fields
            for field in ['start_time', 'end_time', 'last_token_update', 'created_at', 'updated_at']:
                if session.get(field):
                    session[field] = convert_to_iso_datetime(session[field])
            
            # Convert boolean fields
            session['is_active'] = bool(session.get('is_active', 0))
            
            sessions.append(session)
        
        data['sessions'] = sessions
        print(f"  ✅ Exported {len(sessions)} sessions")
        
    except Exception as e:
        print(f"  ⚠️  Error exporting sessions: {e}")
        data['sessions'] = []
    
    # Export five_hour_blocks
    try:
        cursor.execute("""
            SELECT * FROM five_hour_blocks 
            ORDER BY start_time DESC 
            LIMIT 50
        """)
        
        blocks = []
        for row in cursor.fetchall():
            block = dict(row)
            # Convert datetime fields
            for field in ['start_time', 'end_time', 'created_at', 'updated_at']:
                if block.get(field):
                    block[field] = convert_to_iso_datetime(block[field])
            
            block['is_complete'] = bool(block.get('is_complete', 0))
            blocks.append(block)
        
        data['five_hour_blocks'] = blocks
        print(f"  ✅ Exported {len(blocks)} five-hour blocks")
        
    except Exception as e:
        print(f"  ⚠️  Error exporting blocks: {e}")
        data['five_hour_blocks'] = []
    
    # Export message_breakdown (recent only)
    try:
        cursor.execute("""
            SELECT mb.* FROM message_breakdown mb 
            JOIN sessions s ON mb.session_id = s.id 
            WHERE s.start_time >= datetime('now', '-7 days')
            ORDER BY mb.timestamp DESC 
            LIMIT 500
        """)
        
        messages = []
        for row in cursor.fetchall():
            message = dict(row)
            if message.get('timestamp'):
                message['timestamp'] = convert_to_iso_datetime(message['timestamp'])
            messages.append(message)
        
        data['message_breakdown'] = messages
        print(f"  ✅ Exported {len(messages)} message breakdowns")
        
    except Exception as e:
        print(f"  ⚠️  Error exporting messages: {e}")
        data['message_breakdown'] = []
    
    # Export tool_usage (recent only)
    try:
        cursor.execute("""
            SELECT tu.* FROM tool_usage tu 
            JOIN sessions s ON tu.session_id = s.id 
            WHERE s.start_time >= datetime('now', '-7 days')
        """)
        
        tools = []
        for row in cursor.fetchall():
            tool = dict(row)
            for field in ['first_used', 'last_used']:
                if tool.get(field):
                    tool[field] = convert_to_iso_datetime(tool[field])
            tools.append(tool)
        
        data['tool_usage'] = tools
        print(f"  ✅ Exported {len(tools)} tool usage records")
        
    except Exception as e:
        print(f"  ⚠️  Error exporting tools: {e}")
        data['tool_usage'] = []
    
    # Export cost_breakdown (recent only)
    try:
        cursor.execute("""
            SELECT cb.* FROM cost_breakdown cb 
            JOIN sessions s ON cb.session_id = s.id 
            WHERE s.start_time >= datetime('now', '-7 days')
        """)
        
        costs = []
        for row in cursor.fetchall():
            cost = dict(row)
            if cost.get('cost_calculation_date'):
                cost['cost_calculation_date'] = convert_to_iso_datetime(cost['cost_calculation_date'])
            costs.append(cost)
        
        data['cost_breakdown'] = costs
        print(f"  ✅ Exported {len(costs)} cost breakdown records")
        
    except Exception as e:
        print(f"  ⚠️  Error exporting costs: {e}")
        data['cost_breakdown'] = []
    
    conn.close()
    return data

def export_live_session_data() -> Dict:
    """Export current live session data"""
    live_file = '.live_session_metrics.json'
    if not os.path.exists(live_file):
        return {}
    
    try:
        with open(live_file, 'r') as f:
            live_data = json.load(f)
        
        current_session = live_data.get('current_session', {})
        
        if current_session.get('session_id'):
            # Convert to Supabase format
            session = {
                'id': current_session['session_id'],
                'session_type': 'claude-code',
                'start_time': convert_to_iso_datetime(current_session.get('start_time')),
                'duration_minutes': current_session.get('duration_minutes', 0),
                'estimated_tokens': current_session.get('total_tokens', 0),
                'estimated_cost': current_session.get('estimated_cost', 0.0),
                'files_created': current_session.get('files_created', 0),
                'files_modified': current_session.get('files_modified', 0),
                'efficiency_score': current_session.get('efficiency_score', 0.0),
                'is_active': True,
                'last_token_update': convert_to_iso_datetime(current_session.get('last_update')),
                'total_messages': len(live_data.get('breakdown', [])),
                'created_at': convert_to_iso_datetime(current_session.get('last_update')),
                'updated_at': convert_to_iso_datetime(current_session.get('last_update'))
            }
            
            return {'live_session': session, 'live_data': live_data}
    
    except Exception as e:
        print(f"⚠️  Error exporting live session data: {e}")
    
    return {}

def save_json_files(data: Dict[str, List[Dict]], output_dir: str = "supabase_export"):
    """Save data as JSON files for Supabase import"""
    
    os.makedirs(output_dir, exist_ok=True)
    
    files_created = []
    
    for table_name, records in data.items():
        if not records:
            continue
            
        filename = f"{table_name}.json"
        filepath = os.path.join(output_dir, filename)
        
        try:
            with open(filepath, 'w') as f:
                json.dump(records, f, indent=2, default=str)
            
            files_created.append(filepath)
            print(f"💾 Saved {len(records)} records to {filepath}")
            
        except Exception as e:
            print(f"⚠️  Error saving {table_name}: {e}")
    
    # Create import instructions
    instructions_file = os.path.join(output_dir, "IMPORT_INSTRUCTIONS.md")
    with open(instructions_file, 'w') as f:
        f.write("""# Supabase Import Instructions

## 1. Set up Schema
1. Go to your Supabase project: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu
2. Navigate to SQL Editor
3. Run the contents of `supabase_schema.sql` to create tables

## 2. Import Data
You can import the JSON data in several ways:

### Option A: Using Supabase Dashboard
1. Go to Table Editor in your Supabase dashboard
2. Select each table (sessions, five_hour_blocks, etc.)
3. Use "Import data" feature to upload the corresponding JSON file

### Option B: Using SQL Editor
1. Go to SQL Editor
2. Use INSERT statements to add the data

### Option C: Using Supabase API
Use the REST API to POST the data to each table endpoint.

## 3. Files to Import
""")
        
        for filepath in files_created:
            filename = os.path.basename(filepath)
            table_name = filename.replace('.json', '')
            f.write(f"- `{filename}` → Table: `{table_name}`\n")
        
        f.write(f"""
## 4. Verify Import
After importing, run this query in SQL Editor to verify:

```sql
SELECT 
    'sessions' as table_name, COUNT(*) as record_count 
FROM sessions
UNION ALL
SELECT 
    'five_hour_blocks', COUNT(*) 
FROM five_hour_blocks
UNION ALL
SELECT 
    'message_breakdown', COUNT(*) 
FROM message_breakdown
UNION ALL
SELECT 
    'tool_usage', COUNT(*) 
FROM tool_usage
UNION ALL
SELECT 
    'cost_breakdown', COUNT(*) 
FROM cost_breakdown;
```

## 5. Dashboard Access
Once imported, your dashboard can access the data via:
- API: https://rdsfgdtsbyioqilatvxu.supabase.co/rest/v1/sessions
- Function: https://rdsfgdtsbyioqilatvxu.supabase.co/rest/v1/rpc/get_current_session_status
""")
    
    print(f"📋 Created import instructions: {instructions_file}")
    
    return files_created

def main():
    """Main export function"""
    print("📦 CLAUDE CODE OPTIMIZER - DATA EXPORT FOR SUPABASE")
    print("=" * 60)
    print()
    
    # Export SQLite data
    sqlite_data = export_sqlite_data('claude_usage.db')
    
    # Export live session data
    live_data = export_live_session_data()
    
    # Merge live session into main data
    if 'live_session' in live_data:
        sqlite_data.setdefault('sessions', [])
        # Update or add live session
        live_session = live_data['live_session']
        
        # Remove existing session with same ID and add the live one
        sqlite_data['sessions'] = [
            s for s in sqlite_data['sessions'] 
            if s.get('id') != live_session['id']
        ]
        sqlite_data['sessions'].insert(0, live_session)
        
        print(f"📱 Added current live session: {live_session['id']}")
    
    # Save as JSON files
    output_dir = "supabase_export"
    created_files = save_json_files(sqlite_data, output_dir)
    
    print(f"\n🎉 EXPORT COMPLETE!")
    print("=" * 60)
    print(f"📁 Export directory: {output_dir}/")
    print(f"📄 Files created: {len(created_files)}")
    
    total_records = sum(len(records) for records in sqlite_data.values() if isinstance(records, list))
    print(f"📊 Total records: {total_records}")
    
    print(f"\n🔗 Next Steps:")
    print(f"1. Run the schema: supabase_schema.sql in your Supabase SQL Editor")
    print(f"2. Import the JSON files using Supabase Dashboard")
    print(f"3. See {output_dir}/IMPORT_INSTRUCTIONS.md for detailed steps")
    print(f"4. Access your data at: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu")

if __name__ == "__main__":
    main()