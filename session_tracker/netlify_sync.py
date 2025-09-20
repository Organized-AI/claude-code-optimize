#!/usr/bin/env python3
"""
Netlify Dashboard Integration - Enhanced
Pushes real session data to the live Netlify dashboard with authentication
and error handling
"""

import json
import time
import requests
import os
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
NETLIFY_FUNCTION_URL = "https://claude-code-optimizer-dashboard.netlify.app/.netlify/functions/session-sync"
LOCALHOST_API = "http://localhost:3001/api"
API_SECRET = os.getenv('NETLIFY_API_SECRET', 'development-secret')
SYNC_INTERVAL = 30  # seconds
MAX_RETRIES = 3

class NetlifySync:
    """Enhanced Netlify sync with retry logic and error handling"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': API_SECRET,
            'User-Agent': 'Claude-Session-Tracker/1.0'
        })
        self.consecutive_failures = 0
        self.last_successful_sync = None
    
    def fetch_localhost_data(self) -> Optional[Dict[str, Any]]:
        """Fetch all data from localhost API"""
        try:
            # Test localhost connection first
            status_response = self.session.get(f"{LOCALHOST_API}/status", timeout=5)
            if status_response.status_code != 200:
                raise requests.RequestException(f"Localhost API not healthy: {status_response.status_code}")
            
            # Fetch all required data in parallel
            endpoints = {
                'recent_sessions': f"{LOCALHOST_API}/sessions/recent?limit=20",
                'active_sessions': f"{LOCALHOST_API}/sessions/active",
                'analytics': f"{LOCALHOST_API}/analytics/current",
                'five_hour_blocks': f"{LOCALHOST_API}/five-hour-blocks?limit=10"
            }
            
            data = {}
            for key, url in endpoints.items():
                response = self.session.get(url, timeout=5)
                response.raise_for_status()
                data[key] = response.json()
            
            return data
            
        except Exception as e:
            print(f"⚠️ Failed to fetch localhost data: {e}")
            return None
    
    def sync_to_netlify(self, data: Dict[str, Any]) -> bool:
        """Sync data to Netlify with retry logic"""
        payload = {
            "source": "localhost_automated_sync",
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.post(
                    NETLIFY_FUNCTION_URL,
                    json=payload,
                    timeout=15
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Synced to Netlify (attempt {attempt + 1}): "
                          f"{result.get('cached_items', {})}")
                    self.consecutive_failures = 0
                    self.last_successful_sync = datetime.now()
                    return True
                else:
                    print(f"⚠️ Netlify sync failed (attempt {attempt + 1}): {response.status_code}")
                    print(f"   Response: {response.text[:200]}...")
                    
            except requests.exceptions.Timeout:
                print(f"⏰ Netlify sync timeout (attempt {attempt + 1})")
            except Exception as e:
                print(f"⚠️ Netlify sync error (attempt {attempt + 1}): {e}")
            
            # Wait before retry (exponential backoff)
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt
                print(f"   Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        self.consecutive_failures += 1
        return False
    
    def run_sync_cycle(self):
        """Run a complete sync cycle"""
        print(f"🔄 Starting sync cycle at {datetime.now().isoformat()}")
        
        # Fetch data from localhost
        data = self.fetch_localhost_data()
        if not data:
            print("❌ No data to sync - localhost API unavailable")
            return False
        
        # Sync to Netlify
        success = self.sync_to_netlify(data)
        
        if success:
            session_count = len(data.get('active_sessions', []))
            recent_count = len(data.get('recent_sessions', []))
            blocks_count = len(data.get('five_hour_blocks', []))
            print(f"📊 Data summary: {session_count} active, {recent_count} recent, {blocks_count} blocks")
        
        return success

def main():
    """Main sync loop with enhanced error handling"""
    print(f"🚀 Starting enhanced Netlify sync service...")
    print(f"   Localhost API: {LOCALHOST_API}")
    print(f"   Netlify Function: {NETLIFY_FUNCTION_URL}")
    print(f"   Sync Interval: {SYNC_INTERVAL}s")
    print(f"   API Secret: {'*' * (len(API_SECRET) - 4) + API_SECRET[-4:]}")
    
    syncer = NetlifySync()
    
    # Test initial connection
    print("🔍 Testing initial connections...")
    initial_success = syncer.run_sync_cycle()
    if not initial_success:
        print("⚠️ Initial sync failed - continuing anyway")
    
    cycle_count = 0
    while True:
        try:
            cycle_count += 1
            print(f"\n--- Sync Cycle #{cycle_count} ---")
            
            success = syncer.run_sync_cycle()
            
            # Adaptive sleep based on failure rate
            if syncer.consecutive_failures > 5:
                sleep_time = SYNC_INTERVAL * 2  # Slow down if many failures
                print(f"⚠️ Multiple failures detected, slowing sync to {sleep_time}s")
            else:
                sleep_time = SYNC_INTERVAL
            
            print(f"💤 Waiting {sleep_time}s until next sync...")
            time.sleep(sleep_time)
            
        except KeyboardInterrupt:
            print("\n🛑 Stopping Netlify sync service...")
            break
        except Exception as e:
            print(f"❌ Unexpected error in sync loop: {e}")
            print("   Continuing in 10 seconds...")
            time.sleep(10)

if __name__ == "__main__":
    # Allow configuration via environment variables
    if os.getenv('SYNC_INTERVAL'):
        SYNC_INTERVAL = int(os.getenv('SYNC_INTERVAL'))
    if os.getenv('NETLIFY_FUNCTION_URL'):
        NETLIFY_FUNCTION_URL = os.getenv('NETLIFY_FUNCTION_URL')
    
    main()
