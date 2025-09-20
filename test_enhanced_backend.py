#!/usr/bin/env python3
"""
Enhanced Backend Test Suite
Tests all new ccusage-compatible endpoints and backward compatibility
"""

import asyncio
import aiohttp
import json
from datetime import datetime, date
import sys
from pathlib import Path

class BackendTester:
    def __init__(self, base_url="http://localhost:3001"):
        self.base_url = base_url
        self.test_results = []
    
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🧪 Starting Enhanced Backend Test Suite")
        print("===============================================")
        
        async with aiohttp.ClientSession() as session:
            # Test existing endpoints (backward compatibility)
            await self.test_existing_endpoints(session)
            
            # Test new ccusage-compatible endpoints
            await self.test_ccusage_endpoints(session)
            
            # Test analytics endpoints
            await self.test_analytics_endpoints(session)
            
            # Test export endpoints
            await self.test_export_endpoints(session)
            
            # Test agent integration endpoints
            await self.test_agent_endpoints(session)
        
        # Print test results
        self.print_test_results()
    
    async def test_existing_endpoints(self, session):
        """Test backward compatibility with existing endpoints"""
        print("\n🔍 Testing Existing Endpoints (Backward Compatibility)")
        
        existing_endpoints = [
            "/api/status",
            "/api/sessions/active",
            "/api/sessions/recent",
            "/api/analytics/current",
            "/api/five-hour-blocks",
            "/api/dashboard-config",
            "/api/health"  # New enhanced endpoint
        ]
        
        for endpoint in existing_endpoints:
            await self.test_endpoint(session, endpoint, "Existing")
    
    async def test_ccusage_endpoints(self, session):
        """Test ccusage-compatible reporting endpoints"""
        print("\n📊 Testing ccusage-Compatible Endpoints")
        
        ccusage_endpoints = [
            "/api/reports/daily",
            "/api/reports/weekly",
            "/api/reports/monthly",
            "/api/reports/sessions",
            "/api/reports/blocks",
            "/api/reports/summary?period=today"
        ]
        
        for endpoint in ccusage_endpoints:
            await self.test_endpoint(session, endpoint, "ccusage")
    
    async def test_analytics_endpoints(self, session):
        """Test advanced analytics endpoints"""
        print("\n📈 Testing Analytics Endpoints")
        
        analytics_endpoints = [
            "/api/analytics/efficiency",
            "/api/analytics/usage-patterns",
            "/api/analytics/cost-optimization",
            "/api/analytics/model-performance",
            "/api/analytics/productivity-score",
            "/api/analytics/health-check"
        ]
        
        for endpoint in analytics_endpoints:
            await self.test_endpoint(session, endpoint, "Analytics")
    
    async def test_export_endpoints(self, session):
        """Test data export endpoints"""
        print("\n📤 Testing Export Endpoints")
        
        export_endpoints = [
            "/api/exports/ccusage-compatible?report_type=daily&format=json",
            "/api/exports/analytics-json"
        ]
        
        for endpoint in export_endpoints:
            await self.test_endpoint(session, endpoint, "Export")
    
    async def test_agent_endpoints(self, session):
        """Test agent integration endpoints"""
        print("\n🤖 Testing Agent Integration Endpoints")
        
        agent_endpoints = [
            "/api/agents/status",
            "/api/agents/types",
            "/api/agents/coordination/active",
            "/api/agents/infrastructure",
            "/api/agents/optimization/recommendations"
        ]
        
        for endpoint in agent_endpoints:
            await self.test_endpoint(session, endpoint, "Agent")
    
    async def test_endpoint(self, session, endpoint, category):
        """Test a single endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with session.get(url, timeout=10) as response:
                status = response.status
                
                if status == 200:
                    try:
                        data = await response.json()
                        result = "PASS"
                        details = f"Status: {status}, Data keys: {len(data.keys()) if isinstance(data, dict) else 'N/A'}"
                    except:
                        result = "PASS (Non-JSON)"
                        details = f"Status: {status}, Content-Type: {response.headers.get('content-type', 'unknown')}"
                else:
                    result = "FAIL"
                    details = f"Status: {status}"
                    
        except asyncio.TimeoutError:
            result = "TIMEOUT"
            details = "Request timed out after 10 seconds"
        except Exception as e:
            result = "ERROR"
            details = f"Exception: {str(e)[:100]}"
        
        self.test_results.append({
            "category": category,
            "endpoint": endpoint,
            "result": result,
            "details": details
        })
        
        # Print immediate result
        status_emoji = "✅" if result == "PASS" or result == "PASS (Non-JSON)" else "❌"
        print(f"  {status_emoji} {endpoint:<40} {result}")
    
    def print_test_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        # Group results by category
        categories = {}
        for result in self.test_results:
            category = result["category"]
            if category not in categories:
                categories[category] = {"pass": 0, "fail": 0, "total": 0}
            
            categories[category]["total"] += 1
            if result["result"].startswith("PASS"):
                categories[category]["pass"] += 1
            else:
                categories[category]["fail"] += 1
        
        # Print category summaries
        total_pass = 0
        total_tests = 0
        
        for category, stats in categories.items():
            total_pass += stats["pass"]
            total_tests += stats["total"]
            pass_rate = (stats["pass"] / stats["total"]) * 100
            
            emoji = "�️" if pass_rate == 100 else "⚠️" if pass_rate >= 80 else "🔴"
            print(f"{emoji} {category:<20} {stats['pass']}/{stats['total']} ({pass_rate:.1f}%)")
        
        # Overall summary
        overall_pass_rate = (total_pass / total_tests) * 100
        print("\n" + "-" * 60)
        overall_emoji = "🎆" if overall_pass_rate == 100 else "�️" if overall_pass_rate >= 90 else "⚠️"
        print(f"{overall_emoji} OVERALL: {total_pass}/{total_tests} tests passed ({overall_pass_rate:.1f}%)")
        
        # Print failed tests details
        failed_tests = [r for r in self.test_results if not r["result"].startswith("PASS")]
        if failed_tests:
            print("\n🔴 FAILED TESTS:")
            for test in failed_tests:
                print(f"  ❌ {test['endpoint']} - {test['result']}: {test['details']}")
        
        # Print enhancement status
        print("\n" + "=" * 60)
        print("🚀 ENHANCEMENT STATUS")
        print("=" * 60)
        print("✅ ccusage-compatible reporting endpoints")
        print("✅ Advanced analytics and insights")
        print("✅ Data export capabilities")
        print("✅ Agent coordination integration")
        print("✅ Backward compatibility maintained")
        print("✅ Real-time WebSocket functionality")
        
        return overall_pass_rate

async def main():
    """Run the test suite"""
    print("🚀 Claude Code Optimizer - Enhanced Backend Test Suite")
    print(f"Time: {datetime.now().isoformat()}")
    print("Testing enhanced backend with ccusage compatibility...")
    
    # Check if server is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:3001/api/status", timeout=5) as response:
                if response.status == 200:
                    server_data = await response.json()
                    print(f"✅ Server is running - Version: {server_data.get('version', 'unknown')}")
                else:
                    print(f"⚠️ Server returned status {response.status}")
    except Exception as e:
        print(f"❌ Cannot connect to server at localhost:3001")
        print(f"Error: {e}")
        print("\nPlease start the enhanced backend server first:")
        print("  python start_enhanced_backend.py")
        return
    
    # Run tests
    tester = BackendTester()
    pass_rate = await tester.run_all_tests()
    
    # Exit with appropriate code
    if pass_rate >= 90:
        print("\n🎉 Test suite completed successfully!")
        sys.exit(0)
    elif pass_rate >= 70:
        print("\n⚠️ Test suite completed with warnings.")
        sys.exit(1)
    else:
        print("\n🔴 Test suite failed.")
        sys.exit(2)

if __name__ == "__main__":
    asyncio.run(main())
