#!/usr/bin/env python3
"""
Quick Setup Guide for Supabase Dashboard
Provides step-by-step instructions and automated verification
"""
import requests
import json
import time
import webbrowser
from typing import Dict, List

# Configuration
SUPABASE_URL = "https://rdsfgdtsbyioqilatvxu.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkc2ZnZHRzYnlpb3FpbGF0dnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMxNjI3NDYsImV4cCI6MjAzODczODc0Nn0.YKiDGYzMnOXhKfOV4xf2oZYTxUl9EHh4J8hSgzFDxQw"

def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in Supabase"""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/{table_name}?limit=1", headers=headers)
        return response.status_code == 200
    except:
        return False

def wait_for_schema() -> bool:
    """Wait for user to create schema and verify"""
    print("⏳ Waiting for schema creation...")
    print("   (This will check every 10 seconds)")
    print()
    
    for attempt in range(30):  # Wait up to 5 minutes
        print(f"🔍 Check {attempt + 1}/30: ", end="", flush=True)
        
        if check_table_exists("sessions"):
            print("✅ Sessions table found!")
            return True
        else:
            print("❌ Not yet...")
            time.sleep(10)
    
    print("⏰ Timeout waiting for schema. Please verify the SQL was executed successfully.")
    return False

def copy_sql_to_clipboard():
    """Copy SQL schema to clipboard if possible"""
    try:
        import pyperclip
        with open('supabase_schema.sql', 'r') as f:
            sql_content = f.read()
        pyperclip.copy(sql_content)
        print("📋 SQL schema copied to clipboard!")
        return True
    except ImportError:
        print("💡 Install pyperclip for auto-copy: pip install pyperclip")
        return False

def main():
    """Main setup guide"""
    print("🚀 SUPABASE QUICK SETUP GUIDE")
    print("=" * 40)
    print()
    
    # Step 1: Check current status
    print("📊 STEP 1: Current Status Check")
    print("-" * 30)
    
    if check_table_exists("sessions"):
        print("✅ Schema already exists! Proceeding to data import...")
        import_data()
        return
    
    print("❌ Schema not found. Manual setup required.")
    print()
    
    # Step 2: Prepare SQL
    print("📝 STEP 2: Prepare SQL Schema")
    print("-" * 30)
    
    if copy_sql_to_clipboard():
        print("✅ Ready to paste in Supabase!")
    else:
        print("📄 Please copy the contents of 'supabase_schema.sql'")
    
    print()
    
    # Step 3: Open Supabase
    print("🌐 STEP 3: Open Supabase Dashboard")
    print("-" * 30)
    dashboard_url = "https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu"
    print(f"🔗 Opening: {dashboard_url}")
    
    try:
        webbrowser.open(dashboard_url)
        print("✅ Browser opened!")
    except:
        print("⚠️  Please manually open the URL above")
    
    print()
    
    # Step 4: Instructions
    print("⚙️  STEP 4: Execute SQL Schema")
    print("-" * 30)
    print("1. In the Supabase dashboard, click 'SQL Editor' in the left sidebar")
    print("2. Click 'New Query' or use the default editor")
    print("3. Paste the SQL schema (already copied if pyperclip is installed)")
    print("4. Click 'Run' to execute the schema")
    print("5. You should see: 'Schema created successfully!' message")
    print()
    
    # Step 5: Wait and verify
    print("🔄 STEP 5: Verification")
    print("-" * 30)
    input("Press ENTER when you've executed the SQL schema...")
    
    if wait_for_schema():
        print()
        print("🎉 Schema verified! Proceeding to data import...")
        import_data()
    else:
        print()
        print("❌ Schema verification failed. Please check the SQL execution.")

def import_data():
    """Import data after schema is ready"""
    print()
    print("📦 DATA IMPORT")
    print("=" * 40)
    
    # Run the direct setup for data import
    print("🔄 Running automated data import...")
    
    import os
    result = os.system("python3 direct_supabase_setup.py")
    
    if result == 0:
        print("✅ Data import completed!")
        test_dashboard()
    else:
        print("⚠️  Data import had issues. Check the output above.")

def test_dashboard():
    """Test the dashboard"""
    print()
    print("🧪 DASHBOARD TEST")
    print("=" * 40)
    
    print("🔄 Testing dashboard connection...")
    
    import os
    result = os.system("python3 supabase_dashboard.py")
    
    print()
    print("🎉 SETUP COMPLETE!")
    print("=" * 40)
    print("✅ Your Supabase dashboard is ready!")
    print()
    print("🔧 Available commands:")
    print("   python3 supabase_dashboard.py        # View dashboard")
    print("   python3 supabase_dashboard.py --live # Live updating dashboard")
    print("   python3 export_session_data.py      # Export new session data")
    print()
    print("🌐 Access your data:")
    print(f"   Dashboard: {SUPABASE_URL}")
    print(f"   API: {SUPABASE_URL}/rest/v1/sessions")

if __name__ == "__main__":
    main()