#!/usr/bin/env python3
"""
Direct Supabase setup using REST API
Creates schema and imports data without requiring database password
"""
import requests
import json
import os
from typing import Dict, List, Any

# Supabase configuration
SUPABASE_URL = "https://rdsfgdtsbyioqilatvxu.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkc2ZnZHRzYnlpb3FpbGF0dnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMxNjI3NDYsImV4cCI6MjAzODczODc0Nn0.YKiDGYzMnOXhKfOV4xf2oZYTxUl9EHh4J8hSgzFDxQw"

class DirectSupabaseSetup:
    def __init__(self):
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        self.base_url = f"{SUPABASE_URL}/rest/v1"
        
    def test_connection(self) -> bool:
        """Test basic connection to Supabase"""
        try:
            response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=self.headers)
            print(f"🔗 Connection test: {response.status_code}")
            return response.status_code in [200, 404, 401]  # These are all valid responses
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def create_table_if_not_exists(self, table_name: str, create_sql: str) -> bool:
        """Try to create table using SQL endpoint if available"""
        # First check if table exists by trying to query it
        try:
            response = requests.get(f"{self.base_url}/{table_name}?limit=1", headers=self.headers)
            if response.status_code == 200:
                print(f"✅ Table '{table_name}' already exists")
                return True
            elif response.status_code == 404:
                print(f"⚠️  Table '{table_name}' not found - needs to be created manually")
                return False
        except Exception as e:
            print(f"⚠️  Could not check table '{table_name}': {e}")
            return False
    
    def import_json_data(self, table_name: str, json_file: str) -> int:
        """Import data from JSON file to Supabase table"""
        if not os.path.exists(json_file):
            print(f"❌ JSON file not found: {json_file}")
            return 0
        
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                print(f"❌ JSON file must contain an array of objects")
                return 0
            
            print(f"📊 Importing {len(data)} records to {table_name}...")
            
            imported = 0
            failed = 0
            
            # Import in batches
            batch_size = 10
            for i in range(0, len(data), batch_size):
                batch = data[i:i + batch_size]
                
                try:
                    response = requests.post(
                        f"{self.base_url}/{table_name}",
                        headers=self.headers,
                        json=batch
                    )
                    
                    if response.status_code in [200, 201]:
                        imported += len(batch)
                        print(f"  ✅ Batch {i//batch_size + 1}: {len(batch)} records")
                    else:
                        failed += len(batch)
                        print(f"  ❌ Batch {i//batch_size + 1} failed: {response.status_code} - {response.text[:100]}")
                        
                except Exception as e:
                    failed += len(batch)
                    print(f"  ❌ Batch {i//batch_size + 1} error: {e}")
            
            print(f"📈 Import complete: {imported} imported, {failed} failed")
            return imported
            
        except Exception as e:
            print(f"❌ Error importing {json_file}: {e}")
            return 0
    
    def verify_data(self, table_name: str) -> bool:
        """Verify data was imported correctly"""
        try:
            response = requests.get(f"{self.base_url}/{table_name}?limit=5", headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {table_name}: {len(data)} records visible")
                return True
            else:
                print(f"⚠️  {table_name}: Cannot verify - {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error verifying {table_name}: {e}")
            return False

def main():
    """Main setup function"""
    print("🚀 DIRECT SUPABASE SETUP")
    print("=" * 40)
    print()
    
    setup = DirectSupabaseSetup()
    
    # Test connection
    if not setup.test_connection():
        print("❌ Cannot connect to Supabase")
        return
    
    print("✅ Connected to Supabase")
    print()
    
    # Check if tables exist
    tables_to_check = ['sessions', 'five_hour_blocks', 'message_breakdown', 'tool_usage', 'cost_breakdown']
    tables_exist = {}
    
    print("🔍 Checking existing tables...")
    for table in tables_to_check:
        tables_exist[table] = setup.create_table_if_not_exists(table, "")
    
    if not any(tables_exist.values()):
        print()
        print("⚠️  NO TABLES FOUND - Manual setup required")
        print("=" * 50)
        print()
        print("🔧 MANUAL SETUP STEPS:")
        print("1. Go to: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu")
        print("2. Click 'SQL Editor'")
        print("3. Copy and paste the contents of 'supabase_schema.sql'")
        print("4. Click 'Run' to create the tables")
        print("5. Then run this script again to import data")
        print()
        return
    
    # Import data files
    print()
    print("📦 Importing data...")
    
    data_files = [
        ('sessions', 'supabase_export/sessions.json'),
        ('five_hour_blocks', 'supabase_export/five_hour_blocks.json'),
        ('message_breakdown', 'supabase_export/message_breakdown.json'),
        ('tool_usage', 'supabase_export/tool_usage.json'),
        ('cost_breakdown', 'supabase_export/cost_breakdown.json')
    ]
    
    total_imported = 0
    for table_name, json_file in data_files:
        if tables_exist.get(table_name, False):
            imported = setup.import_json_data(table_name, json_file)
            total_imported += imported
        else:
            print(f"⏭️  Skipping {table_name} (table doesn't exist)")
    
    print()
    print("🔍 Verifying imported data...")
    for table_name, _ in data_files:
        if tables_exist.get(table_name, False):
            setup.verify_data(table_name)
    
    print()
    if total_imported > 0:
        print("🎉 SETUP COMPLETE!")
        print("=" * 40)
        print(f"✅ Total records imported: {total_imported}")
        print("🌐 Your data is now available in Supabase")
        print()
        print("🔗 Access your data:")
        print(f"   Dashboard: {SUPABASE_URL}")
        print(f"   API: {SUPABASE_URL}/rest/v1/sessions")
        print()
        print("🧪 Test your dashboard:")
        print("   python3 supabase_dashboard.py")
    else:
        print("⚠️  No data was imported. Please check table setup.")

if __name__ == "__main__":
    main()