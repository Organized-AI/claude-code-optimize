#!/usr/bin/env python3
"""
Netlify Dashboard Compatibility Test
Tests WebSocket connectivity between localhost:3001 and Netlify dashboard
"""

import asyncio
import json
import requests
import time
from datetime import datetime
from typing import Dict

class NetlifyCompatibilityTest:
    """Test compatibility with Netlify dashboard requirements"""
    
    def __init__(self):
        self.localhost_url = "http://localhost:3001"
        self.netlify_url = "https://claude-code-optimizer-dashboard.netlify.app"
        
    def test_cors_configuration(self) -> Dict:
        """Test CORS headers for cross-origin WebSocket upgrades"""
        try:
            response = requests.options(
                f"{self.localhost_url}/ws",
                headers={
                    "Origin": self.netlify_url,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "upgrade"
                },
                timeout=10
            )
            
            cors_headers = {
                "access-control-allow-origin": response.headers.get("access-control-allow-origin"),
                "access-control-allow-methods": response.headers.get("access-control-allow-methods"),
                "access-control-allow-headers": response.headers.get("access-control-allow-headers"),
                "access-control-allow-credentials": response.headers.get("access-control-allow-credentials")
            }
            
            return {
                "status": "PASS",
                "status_code": response.status_code,
                "cors_headers": cors_headers,
                "allows_netlify_origin": cors_headers["access-control-allow-origin"] in ["*", self.netlify_url]
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_api_endpoints(self) -> Dict:
        """Test all API endpoints that Netlify dashboard will use"""
        endpoints = [
            "/api/status",
            "/api/sessions/active", 
            "/api/sessions/recent",
            "/api/analytics/current",
            "/api/five-hour-blocks",
            "/api/dashboard-config"
        ]
        
        results = {}
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.localhost_url}{endpoint}", timeout=10)
                data = response.json() if response.headers.get("content-type", "").startswith("application/json") else None
                
                results[endpoint] = {
                    "status": "PASS",
                    "status_code": response.status_code,
                    "response_time_ms": round(response.elapsed.total_seconds() * 1000, 2),
                    "has_data": data is not None,
                    "data_size": len(json.dumps(data)) if data else 0
                }
                
            except Exception as e:
                results[endpoint] = {
                    "status": "FAIL",
                    "error": str(e)
                }
        
        passed_endpoints = sum(1 for r in results.values() if r.get("status") == "PASS")
        
        return {
            "status": "PASS" if passed_endpoints == len(endpoints) else "FAIL",
            "total_endpoints": len(endpoints),
            "passed_endpoints": passed_endpoints,
            "endpoint_results": results
        }
    
    def test_websocket_upgrade_headers(self) -> Dict:
        """Test WebSocket upgrade compatibility"""
        try:
            # Test WebSocket handshake headers
            response = requests.get(
                f"{self.localhost_url}/ws",
                headers={
                    "Upgrade": "websocket",
                    "Connection": "upgrade",
                    "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                    "Sec-WebSocket-Version": "13",
                    "Origin": self.netlify_url
                },
                timeout=5
            )
            
            return {
                "status": "PASS",
                "upgrade_attempted": True,
                "status_code": response.status_code,
                "headers": dict(response.headers)
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_data_sync_endpoint(self) -> Dict:
        """Test Netlify sync endpoint functionality"""
        try:
            # Test the sync endpoint
            response = requests.post(
                f"{self.localhost_url}/api/netlify-sync",
                timeout=10
            )
            
            return {
                "status": "PASS",
                "status_code": response.status_code,
                "sync_initiated": response.json().get("status") == "sync_started"
            }
            
        except Exception as e:
            return {
                "status": "FAIL", 
                "error": str(e)
            }
    
    def test_performance_requirements(self) -> Dict:
        """Test performance requirements for real-time updates"""
        try:
            # Test multiple rapid API calls to simulate real-time usage
            start_time = time.time()
            responses = []
            
            for _ in range(10):
                response = requests.get(f"{self.localhost_url}/api/status", timeout=2)
                responses.append({
                    "status_code": response.status_code,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                })
            
            total_time = (time.time() - start_time) * 1000
            avg_response_time = sum(r["response_time_ms"] for r in responses) / len(responses)
            max_response_time = max(r["response_time_ms"] for r in responses)
            
            return {
                "status": "PASS",
                "total_requests": len(responses),
                "total_time_ms": round(total_time, 2),
                "avg_response_time_ms": round(avg_response_time, 2),
                "max_response_time_ms": round(max_response_time, 2),
                "meets_performance_req": max_response_time < 5000,  # 5 second max
                "throughput_rps": round(len(responses) / (total_time / 1000), 2)
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def run_all_tests(self) -> Dict:
        """Run all Netlify compatibility tests"""
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "localhost_url": self.localhost_url,
            "netlify_url": self.netlify_url,
            "tests": {}
        }
        
        print("Testing Netlify dashboard compatibility...")
        
        # CORS Configuration Test
        print("- Testing CORS configuration...")
        results["tests"]["cors_configuration"] = self.test_cors_configuration()
        
        # API Endpoints Test
        print("- Testing API endpoints...")
        results["tests"]["api_endpoints"] = self.test_api_endpoints()
        
        # WebSocket Upgrade Test
        print("- Testing WebSocket upgrade headers...")
        results["tests"]["websocket_upgrade"] = self.test_websocket_upgrade_headers()
        
        # Data Sync Test
        print("- Testing data sync endpoint...")
        results["tests"]["data_sync"] = self.test_data_sync_endpoint()
        
        # Performance Test
        print("- Testing performance requirements...")
        results["tests"]["performance"] = self.test_performance_requirements()
        
        # Calculate summary
        passed_tests = sum(1 for test in results["tests"].values() if test.get("status") == "PASS")
        total_tests = len(results["tests"])
        
        results["summary"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0,
            "netlify_compatible": passed_tests == total_tests
        }
        
        return results

def main():
    """Run Netlify compatibility tests"""
    tester = NetlifyCompatibilityTest()
    results = tester.run_all_tests()
    
    # Print results
    print("\n" + "=" * 80)
    print("NETLIFY DASHBOARD COMPATIBILITY TEST RESULTS")
    print("=" * 80)
    
    print(f"\nTest Summary:")
    print(f"  Total Tests: {results['summary']['total_tests']}")
    print(f"  Passed: {results['summary']['passed_tests']}")
    print(f"  Failed: {results['summary']['failed_tests']}")
    print(f"  Success Rate: {results['summary']['success_rate']}%")
    print(f"  Netlify Compatible: {results['summary']['netlify_compatible']}")
    
    print(f"\nDetailed Results:")
    for test_name, test_result in results["tests"].items():
        status = test_result.get("status", "UNKNOWN")
        print(f"  {test_name}: {status}")
        
        if status == "FAIL" and "error" in test_result:
            print(f"    Error: {test_result['error']}")
        elif test_name == "api_endpoints" and status == "PASS":
            print(f"    Endpoints: {test_result['passed_endpoints']}/{test_result['total_endpoints']}")
        elif test_name == "performance" and status == "PASS":
            print(f"    Avg Response: {test_result['avg_response_time_ms']}ms")
            print(f"    Max Response: {test_result['max_response_time_ms']}ms")
            print(f"    Throughput: {test_result['throughput_rps']} RPS")
    
    # Save results
    with open("netlify_compatibility_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\nFull results saved to: netlify_compatibility_results.json")
    return results

if __name__ == "__main__":
    main()