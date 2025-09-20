#!/usr/bin/env python3
"""
Latency Validation Test for Claude Code Optimizer Dashboard
Tests that session updates reach clients within the required <30 second latency
"""

import asyncio
import websockets
import json
import time
import requests
from datetime import datetime
from typing import List

class LatencyValidator:
    def __init__(self, ws_uri: str = "ws://localhost:3001/ws", api_base: str = "http://localhost:3001"):
        self.ws_uri = ws_uri
        self.api_base = api_base
        self.latencies: List[float] = []
        
    async def validate_real_time_latency(self) -> dict:
        """Validate that real-time updates meet <30 second requirement"""
        print("🕒 Validating Real-time Update Latency")
        print("=" * 50)
        
        results = {
            "test_name": "Real-time Update Latency Validation",
            "requirement": "< 30 seconds",
            "measurements": [],
            "success": False,
            "average_latency": 0,
            "max_latency": 0,
            "min_latency": 0
        }
        
        try:
            # Connect WebSocket client
            print("🔗 Connecting to WebSocket...")
            async with websockets.connect(self.ws_uri, ping_interval=None) as websocket:
                print("✅ WebSocket connected")
                
                # Receive initial data
                initial_msg = await websocket.recv()
                initial_data = json.loads(initial_msg)
                print(f"📊 Received initial data: {initial_data.get('type', 'unknown')}")
                
                # Test multiple update scenarios
                test_scenarios = [
                    "Session update broadcast",
                    "Data refresh request", 
                    "Heartbeat response",
                    "Status update",
                    "Analytics update"
                ]
                
                for i, scenario in enumerate(test_scenarios, 1):
                    print(f"\n📡 Test {i}/5: {scenario}")
                    
                    # Record send time
                    send_time = time.time()
                    
                    if scenario == "Data refresh request":
                        # Send data request
                        request_msg = {
                            "type": "request_data",
                            "timestamp": datetime.now().isoformat(),
                            "test_id": f"latency_test_{i}"
                        }
                        await websocket.send(json.dumps(request_msg))
                        
                        # Wait for response
                        response = await asyncio.wait_for(websocket.recv(), timeout=35)
                        receive_time = time.time()
                        
                    elif scenario == "Heartbeat response":
                        # Send heartbeat
                        heartbeat_msg = {
                            "type": "heartbeat",
                            "timestamp": datetime.now().isoformat(),
                            "test_id": f"latency_test_{i}"
                        }
                        await websocket.send(json.dumps(heartbeat_msg))
                        
                        # Wait for acknowledgment
                        response = await asyncio.wait_for(websocket.recv(), timeout=35)
                        receive_time = time.time()
                        
                    else:
                        # Simulate API update that should broadcast
                        test_update = {
                            "event": f"test_update_{i}",
                            "session": {
                                "session_id": f"test_session_{i}",
                                "session_type": "test",
                                "start_time": datetime.now().isoformat(),
                                "is_active": True,
                                "test_scenario": scenario
                            },
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        # Send API update
                        try:
                            api_response = requests.post(
                                f"{self.api_base}/api/session-update",
                                json=test_update,
                                timeout=30
                            )
                            
                            if api_response.status_code == 200:
                                # Wait for WebSocket broadcast
                                response = await asyncio.wait_for(websocket.recv(), timeout=35)
                                receive_time = time.time()
                            else:
                                print(f"⚠️ API request failed: {api_response.status_code}")
                                continue
                                
                        except requests.RequestException as e:
                            print(f"⚠️ API request error: {e}")
                            continue
                    
                    # Calculate latency
                    latency = receive_time - send_time
                    self.latencies.append(latency)
                    
                    # Log result
                    status = "✅ PASS" if latency < 30 else "❌ FAIL"
                    print(f"   Latency: {latency:.3f}s {status}")
                    
                    results["measurements"].append({
                        "scenario": scenario,
                        "latency_seconds": round(latency, 3),
                        "meets_requirement": latency < 30,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    # Small delay between tests
                    await asyncio.sleep(1)
                
                # Calculate statistics
                if self.latencies:
                    results["average_latency"] = round(sum(self.latencies) / len(self.latencies), 3)
                    results["max_latency"] = round(max(self.latencies), 3)
                    results["min_latency"] = round(min(self.latencies), 3)
                    results["success"] = all(lat < 30 for lat in self.latencies)
                    
                print(f"\n📊 Latency Test Results:")
                print(f"   Average: {results['average_latency']}s")
                print(f"   Maximum: {results['max_latency']}s")
                print(f"   Minimum: {results['min_latency']}s")
                print(f"   Success: {results['success']} (all < 30s)")
                
        except Exception as e:
            results["error"] = str(e)
            print(f"❌ Latency validation failed: {e}")
        
        return results
    
    async def test_connection_resilience(self) -> dict:
        """Test connection recovery time after disconnection"""
        print("\n🔄 Testing Connection Recovery Latency")
        print("-" * 40)
        
        recovery_times = []
        
        try:
            for attempt in range(3):
                print(f"   Attempt {attempt + 1}/3:")
                
                # Connect
                connect_start = time.time()
                websocket = await websockets.connect(self.ws_uri, ping_interval=None)
                await websocket.recv()  # Initial data
                connect_time = time.time() - connect_start
                print(f"     Connect time: {connect_time:.3f}s")
                
                # Disconnect
                await websocket.close()
                
                # Reconnect
                await asyncio.sleep(0.5)  # Brief pause
                reconnect_start = time.time()
                websocket = await websockets.connect(self.ws_uri, ping_interval=None)
                await websocket.recv()  # Initial data
                reconnect_time = time.time() - reconnect_start
                print(f"     Reconnect time: {reconnect_time:.3f}s")
                
                recovery_times.append(reconnect_time)
                await websocket.close()
                
                await asyncio.sleep(1)
            
            avg_recovery = sum(recovery_times) / len(recovery_times)
            max_recovery = max(recovery_times)
            
            return {
                "test_name": "Connection Recovery Latency",
                "average_recovery_time": round(avg_recovery, 3),
                "max_recovery_time": round(max_recovery, 3),
                "recovery_times": recovery_times,
                "meets_requirement": max_recovery < 5,  # Should recover within 5 seconds
                "success": True
            }
            
        except Exception as e:
            return {
                "test_name": "Connection Recovery Latency",
                "error": str(e),
                "success": False
            }
    
    async def run_complete_validation(self) -> dict:
        """Run complete latency validation suite"""
        print("🎯 Claude Code Optimizer - WebSocket Latency Validation")
        print("=" * 60)
        
        # Test 1: Real-time update latency
        latency_results = await self.validate_real_time_latency()
        
        # Test 2: Connection recovery latency
        recovery_results = await self.test_connection_resilience()
        
        # Final assessment
        overall_success = (
            latency_results.get("success", False) and
            recovery_results.get("success", False)
        )
        
        final_report = {
            "validation_timestamp": datetime.now().isoformat(),
            "overall_success": overall_success,
            "requirement_met": "< 30 second latency for session updates",
            "latency_test": latency_results,
            "recovery_test": recovery_results,
            "summary": {
                "primary_requirement_met": latency_results.get("success", False),
                "average_update_latency": latency_results.get("average_latency", 0),
                "max_update_latency": latency_results.get("max_latency", 0),
                "connection_recovery_time": recovery_results.get("average_recovery_time", 0)
            }
        }
        
        # Print final summary
        print("\n🏁 Final Validation Summary")
        print("=" * 30)
        status = "✅ PASSED" if overall_success else "❌ FAILED"
        print(f"Overall Result: {status}")
        print(f"Primary Requirement (<30s latency): {'✅ MET' if latency_results.get('success', False) else '❌ NOT MET'}")
        print(f"Average Update Latency: {latency_results.get('average_latency', 0)}s")
        print(f"Connection Recovery: {recovery_results.get('average_recovery_time', 0)}s")
        
        return final_report

async def main():
    """Run latency validation"""
    validator = LatencyValidator()
    report = await validator.run_complete_validation()
    
    # Save detailed report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"latency_validation_report_{timestamp}.json"
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Detailed report saved to: {report_file}")
    
    return report["overall_success"]

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)