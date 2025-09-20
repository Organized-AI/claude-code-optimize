#!/usr/bin/env python3
"""
Integration Test Suite for Netlify Dashboard Sync
Tests the complete data flow from localhost to Netlify dashboard
"""

import json
import time
import requests
import asyncio
import websocket
from datetime import datetime
from typing import Dict, Any, List

# Test Configuration
LOCALHOST_API = "http://localhost:3001/api"
NETLIFY_FUNCTION = "https://claude-code-optimizer-dashboard.netlify.app/.netlify/functions/session-sync"
API_SECRET = "development-secret"
WEBSOCKET_URL = "ws://localhost:3001/ws"

class IntegrationTester:
    """Complete integration test suite"""
    
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': API_SECRET
        })
    
    def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        })
    
    def test_localhost_api(self) -> bool:
        """Test localhost API availability and endpoints"""
        print("\\n🔍 Testing Localhost API...")
        
        # Test status endpoint
        try:
            response = self.session.get(f"{LOCALHOST_API}/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Localhost Status", True, f"Version {data.get('version')}, {data.get('connected_clients')} clients")
            else:
                self.log_test("Localhost Status", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Localhost Status", False, f"Connection error: {e}")
            return False
        
        # Test all data endpoints
        endpoints = [
            "/sessions/active",
            "/sessions/recent",
            "/analytics/current",
            "/five-hour-blocks",
            "/dashboard-config"
        ]
        
        all_passed = True
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{LOCALHOST_API}{endpoint}", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    data_size = len(data) if isinstance(data, list) else len(str(data))
                    self.log_test(f"Endpoint {endpoint}", True, f"{data_size} items/chars")
                else:
                    self.log_test(f"Endpoint {endpoint}", False, f"HTTP {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Endpoint {endpoint}", False, f"Error: {e}")
                all_passed = False
        
        return all_passed
    
    def test_websocket_connection(self) -> bool:
        """Test WebSocket real-time connection"""
        print("\\n🔗 Testing WebSocket Connection...")
        
        try:
            import websocket
            
            messages_received = []
            connection_success = False
            
            def on_message(ws, message):
                try:
                    data = json.loads(message)
                    messages_received.append(data)
                    print(f"   📨 Received: {data.get('type', 'unknown')}")
                except:
                    pass
            
            def on_open(ws):
                nonlocal connection_success
                connection_success = True
                print("   🔌 WebSocket connected")
                # Send ping to test bidirectional communication
                ws.send(json.dumps({"type": "ping", "test": True}))
            
            def on_error(ws, error):
                print(f"   ⚠️ WebSocket error: {error}")
            
            ws = websocket.WebSocketApp(
                WEBSOCKET_URL,
                on_message=on_message,
                on_open=on_open,
                on_error=on_error
            )
            
            # Run WebSocket for 10 seconds
            import threading
            wst = threading.Thread(target=ws.run_forever)
            wst.daemon = True
            wst.start()
            
            time.sleep(10)
            ws.close()
            
            if connection_success:
                self.log_test("WebSocket Connection", True, f"Connected, received {len(messages_received)} messages")
                return True
            else:
                self.log_test("WebSocket Connection", False, "Failed to connect")
                return False
                
        except ImportError:
            self.log_test("WebSocket Connection", False, "websocket-client not installed")
            return False
        except Exception as e:
            self.log_test("WebSocket Connection", False, f"Error: {e}")
            return False
    
    def test_netlify_function(self) -> bool:
        """Test Netlify Function endpoints"""
        print("\\n☁️ Testing Netlify Function...")
        
        # Test GET endpoints
        get_endpoints = [
            "/status",
            "/sessions/active", 
            "/sessions/recent",
            "/analytics/current",
            "/five-hour-blocks",
            "/dashboard-config"
        ]
        
        get_success = True
        for endpoint in get_endpoints:
            try:
                response = self.session.get(f"{NETLIFY_FUNCTION}{endpoint}", timeout=10)
                if response.status_code == 200:
                    self.log_test(f"Netlify GET {endpoint}", True, "Response received")
                else:
                    self.log_test(f"Netlify GET {endpoint}", False, f"HTTP {response.status_code}")
                    get_success = False
            except Exception as e:
                self.log_test(f"Netlify GET {endpoint}", False, f"Error: {e}")
                get_success = False
        
        # Test POST sync endpoint
        try:
            test_data = {
                "source": "integration_test",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "active_sessions": [{"id": "test", "session_type": "test"}],
                    "analytics": {"test": True},
                    "five_hour_blocks": []
                }
            }
            
            response = self.session.post(NETLIFY_FUNCTION, json=test_data, timeout=15)
            if response.status_code == 200:
                self.log_test("Netlify POST Sync", True, "Test data accepted")
            else:
                self.log_test("Netlify POST Sync", False, f"HTTP {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Netlify POST Sync", False, f"Error: {e}")
            return False
        
        return get_success
    
    def test_end_to_end_sync(self) -> bool:
        """Test complete data flow from localhost to Netlify"""
        print("\\n🔄 Testing End-to-End Sync...")
        
        try:
            # 1. Fetch data from localhost
            localhost_data = {}
            endpoints = ["sessions/recent", "analytics/current", "five-hour-blocks"]
            
            for endpoint in endpoints:
                response = self.session.get(f"{LOCALHOST_API}/{endpoint}", timeout=5)
                if response.status_code == 200:
                    localhost_data[endpoint.replace("/", "_")] = response.json()
                else:
                    self.log_test("E2E: Localhost Data", False, f"Failed to fetch {endpoint}")
                    return False
            
            self.log_test("E2E: Localhost Data", True, f"Fetched {len(localhost_data)} datasets")
            
            # 2. Push to Netlify
            sync_payload = {
                "source": "integration_test_e2e",
                "timestamp": datetime.now().isoformat(),
                "data": localhost_data
            }
            
            response = self.session.post(NETLIFY_FUNCTION, json=sync_payload, timeout=15)
            if response.status_code != 200:
                self.log_test("E2E: Netlify Sync", False, f"HTTP {response.status_code}")
                return False
            
            self.log_test("E2E: Netlify Sync", True, "Data pushed successfully")
            
            # 3. Verify data appears in Netlify
            time.sleep(2)  # Allow time for processing
            
            for endpoint in ["sessions/recent", "analytics/current", "five-hour-blocks"]:
                response = self.session.get(f"{NETLIFY_FUNCTION}/{endpoint}", timeout=10)
                if response.status_code == 200:
                    netlify_data = response.json()
                    self.log_test(f"E2E: Netlify {endpoint}", True, f"Retrieved {len(netlify_data) if isinstance(netlify_data, list) else 'data'}")
                else:
                    self.log_test(f"E2E: Netlify {endpoint}", False, f"HTTP {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_test("E2E: Complete Flow", False, f"Error: {e}")
            return False
    
    def test_performance_timing(self) -> bool:
        """Test sync timing to ensure <30 second requirement"""
        print("\\n⏱️ Testing Performance Timing...")
        
        try:
            # Time a complete sync cycle
            start_time = time.time()
            
            # Fetch from localhost
            response = self.session.get(f"{LOCALHOST_API}/sessions/recent", timeout=5)
            localhost_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Performance: Localhost", False, "Failed to fetch data")
                return False
            
            # Sync to Netlify
            netlify_start = time.time()
            sync_data = {
                "source": "performance_test",
                "timestamp": datetime.now().isoformat(),
                "data": {"recent_sessions": response.json()}
            }
            
            netlify_response = self.session.post(NETLIFY_FUNCTION, json=sync_data, timeout=15)
            netlify_time = time.time() - netlify_start
            total_time = time.time() - start_time
            
            if netlify_response.status_code != 200:
                self.log_test("Performance: Netlify", False, "Failed to sync")
                return False
            
            # Verify retrieval
            retrieval_start = time.time()
            verify_response = self.session.get(f"{NETLIFY_FUNCTION}/sessions/recent", timeout=10)
            retrieval_time = time.time() - retrieval_start
            
            # Check timing requirements
            timing_ok = total_time < 30  # Must be under 30 seconds
            
            self.log_test("Performance: Timing", timing_ok, 
                         f"Total: {total_time:.2f}s, Localhost: {localhost_time:.2f}s, "
                         f"Netlify: {netlify_time:.2f}s, Retrieval: {retrieval_time:.2f}s")
            
            return timing_ok
            
        except Exception as e:
            self.log_test("Performance: Timing", False, f"Error: {e}")
            return False
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Integration Test Suite")
        print("=" * 50)
        
        # Run tests in order
        tests = [
            ("Localhost API", self.test_localhost_api),
            ("WebSocket Connection", self.test_websocket_connection),
            ("Netlify Function", self.test_netlify_function),
            ("End-to-End Sync", self.test_end_to_end_sync),
            ("Performance Timing", self.test_performance_timing)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result:
                    passed += 1
            except Exception as e:
                self.log_test(test_name, False, f"Test crashed: {e}")
        
        # Print summary
        print("\\n" + "=" * 50)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Integration is working correctly.")
            print("✅ Real session data should appear on live dashboard within 30 seconds")
        else:
            print("⚠️ Some tests failed. Check the output above for details.")
            print("🔧 Common issues:")
            print("   - Ensure localhost:3001 is running (python3 session_tracker/dashboard_server.py)")
            print("   - Check API secret matches in environment variables")
            print("   - Verify Netlify deployment is live")
            print("   - Test network connectivity")
        
        return passed == total

def main():
    """Run integration tests"""
    tester = IntegrationTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("integration_test_results.json", "w") as f:
        json.dump({
            "test_run": datetime.now().isoformat(),
            "success": success,
            "results": tester.test_results
        }, f, indent=2)
    
    print(f"\\n📄 Detailed results saved to integration_test_results.json")
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)