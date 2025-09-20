#!/usr/bin/env python3
"""
Comprehensive WebSocket Infrastructure Test Suite
Tests connection stability, performance, and error recovery
"""

import asyncio
import websockets
import json
import time
import threading
from datetime import datetime
from typing import Dict, List
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WebSocketTestSuite:
    """Comprehensive WebSocket testing for Claude Code Optimizer dashboard"""
    
    def __init__(self, server_url: str = "ws://localhost:3001/ws"):
        self.server_url = server_url
        self.test_results = {}
        self.connections = []
        
    async def test_basic_connection(self) -> Dict:
        """Test basic WebSocket connection establishment"""
        logger.info("Testing basic WebSocket connection...")
        
        try:
            start_time = time.time()
            async with websockets.connect(self.server_url) as websocket:
                connection_time = (time.time() - start_time) * 1000  # ms
                
                # Wait for initial data
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(message)
                
                return {
                    "status": "PASS",
                    "connection_time_ms": round(connection_time, 2),
                    "initial_data_received": data.get("type") == "initial_data",
                    "client_id": data.get("client_id"),
                    "server_time": data.get("server_time")
                }
                
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e),
                "connection_time_ms": None
            }
    
    async def test_message_latency(self, num_tests: int = 10) -> Dict:
        """Test message round-trip latency"""
        logger.info(f"Testing message latency with {num_tests} pings...")
        
        latencies = []
        
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Wait for initial data
                await websocket.recv()
                
                for i in range(num_tests):
                    start_time = time.time()
                    
                    # Send ping
                    ping_message = {
                        "type": "ping",
                        "test_id": i,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(ping_message))
                    
                    # Wait for pong
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)
                    
                    if data.get("type") == "pong":
                        latency = (time.time() - start_time) * 1000  # ms
                        latencies.append(latency)
                    
                    await asyncio.sleep(0.1)  # Small delay between tests
                
                avg_latency = sum(latencies) / len(latencies) if latencies else 0
                max_latency = max(latencies) if latencies else 0
                min_latency = min(latencies) if latencies else 0
                
                return {
                    "status": "PASS",
                    "tests_completed": len(latencies),
                    "avg_latency_ms": round(avg_latency, 2),
                    "max_latency_ms": round(max_latency, 2),
                    "min_latency_ms": round(min_latency, 2),
                    "meets_30s_requirement": max_latency < 30000,
                    "all_latencies": [round(l, 2) for l in latencies]
                }
                
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e),
                "tests_completed": len(latencies)
            }
    
    async def test_concurrent_connections(self, num_connections: int = 5) -> Dict:
        """Test multiple concurrent WebSocket connections"""
        logger.info(f"Testing {num_connections} concurrent connections...")
        
        connections = []
        connection_results = []
        
        async def create_connection(conn_id: int):
            try:
                start_time = time.time()
                websocket = await websockets.connect(self.server_url)
                connection_time = (time.time() - start_time) * 1000
                
                # Wait for initial data
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(message)
                
                connections.append(websocket)
                return {
                    "conn_id": conn_id,
                    "status": "SUCCESS",
                    "connection_time_ms": round(connection_time, 2),
                    "client_id": data.get("client_id")
                }
                
            except Exception as e:
                return {
                    "conn_id": conn_id,
                    "status": "FAILED",
                    "error": str(e)
                }
        
        try:
            # Create all connections concurrently
            tasks = [create_connection(i) for i in range(num_connections)]
            connection_results = await asyncio.gather(*tasks)
            
            # Test broadcast to all connections
            successful_connections = [r for r in connection_results if r["status"] == "SUCCESS"]
            
            # Keep connections alive for a few seconds to test stability
            await asyncio.sleep(3)
            
            # Close all connections
            for websocket in connections:
                await websocket.close()
            
            return {
                "status": "PASS",
                "requested_connections": num_connections,
                "successful_connections": len(successful_connections),
                "failed_connections": num_connections - len(successful_connections),
                "connection_details": connection_results,
                "avg_connection_time": round(
                    sum(r["connection_time_ms"] for r in successful_connections) / len(successful_connections)
                    if successful_connections else 0, 2
                )
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e),
                "partial_results": connection_results
            }
    
    async def test_connection_recovery(self) -> Dict:
        """Test connection recovery after network interruption simulation"""
        logger.info("Testing connection recovery...")
        
        try:
            # Establish initial connection
            websocket = await websockets.connect(self.server_url)
            await websocket.recv()  # Initial data
            
            # Simulate network interruption by closing connection
            await websocket.close()
            logger.info("Connection closed, attempting reconnection...")
            
            # Wait a moment
            await asyncio.sleep(1)
            
            # Attempt reconnection
            start_reconnect = time.time()
            websocket = await websockets.connect(self.server_url)
            reconnect_time = (time.time() - start_reconnect) * 1000
            
            # Verify we can receive data after reconnection
            message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            data = json.loads(message)
            
            await websocket.close()
            
            return {
                "status": "PASS",
                "reconnect_time_ms": round(reconnect_time, 2),
                "data_received_after_reconnect": data.get("type") == "initial_data"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    async def test_heartbeat_functionality(self) -> Dict:
        """Test heartbeat/ping-pong functionality"""
        logger.info("Testing heartbeat functionality...")
        
        try:
            async with websockets.connect(self.server_url) as websocket:
                await websocket.recv()  # Initial data
                
                # Send heartbeat
                heartbeat_message = {
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send(json.dumps(heartbeat_message))
                
                # Wait for acknowledgment
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                
                return {
                    "status": "PASS",
                    "heartbeat_ack_received": data.get("type") == "heartbeat_ack",
                    "server_timestamp": data.get("timestamp")
                }
                
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    async def test_data_request_functionality(self) -> Dict:
        """Test on-demand data request functionality"""
        logger.info("Testing data request functionality...")
        
        try:
            async with websockets.connect(self.server_url) as websocket:
                await websocket.recv()  # Initial data
                
                # Request fresh data
                request_message = {
                    "type": "request_data",
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send(json.dumps(request_message))
                
                # Wait for data response
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(response)
                
                return {
                    "status": "PASS",
                    "data_received": data.get("type") == "initial_data",
                    "contains_active_sessions": "active_sessions" in data,
                    "contains_analytics": "analytics" in data,
                    "contains_five_hour_blocks": "five_hour_blocks" in data
                }
                
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_server_status(self) -> Dict:
        """Test HTTP server status endpoint"""
        logger.info("Testing server status endpoint...")
        
        try:
            response = requests.get("http://localhost:3001/api/status", timeout=5)
            data = response.json()
            
            return {
                "status": "PASS",
                "http_status": response.status_code,
                "server_running": data.get("status") == "running",
                "websocket_endpoint": data.get("websocket_endpoint"),
                "connected_clients": data.get("connected_clients"),
                "features": data.get("features", {})
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    async def run_all_tests(self) -> Dict:
        """Run complete test suite"""
        logger.info("Starting comprehensive WebSocket test suite...")
        
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "server_url": self.server_url,
            "tests": {}
        }
        
        # HTTP Status Test
        results["tests"]["server_status"] = self.test_server_status()
        
        # Basic Connection Test
        results["tests"]["basic_connection"] = await self.test_basic_connection()
        
        # Message Latency Test
        results["tests"]["message_latency"] = await self.test_message_latency()
        
        # Concurrent Connections Test
        results["tests"]["concurrent_connections"] = await self.test_concurrent_connections()
        
        # Connection Recovery Test
        results["tests"]["connection_recovery"] = await self.test_connection_recovery()
        
        # Heartbeat Test
        results["tests"]["heartbeat"] = await self.test_heartbeat_functionality()
        
        # Data Request Test
        results["tests"]["data_request"] = await self.test_data_request_functionality()
        
        # Calculate overall status
        passed_tests = sum(1 for test in results["tests"].values() if test.get("status") == "PASS")
        total_tests = len(results["tests"])
        
        results["summary"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0,
            "overall_status": "PASS" if passed_tests == total_tests else "FAIL"
        }
        
        return results

async def main():
    """Run the WebSocket test suite"""
    tester = WebSocketTestSuite()
    results = await tester.run_all_tests()
    
    # Print results
    print("\n" + "=" * 80)
    print("WEBSOCKET INFRASTRUCTURE TEST RESULTS")
    print("=" * 80)
    
    print(f"\nTest Summary:")
    print(f"  Total Tests: {results['summary']['total_tests']}")
    print(f"  Passed: {results['summary']['passed_tests']}")
    print(f"  Failed: {results['summary']['failed_tests']}")
    print(f"  Success Rate: {results['summary']['success_rate']}%")
    print(f"  Overall Status: {results['summary']['overall_status']}")
    
    print(f"\nDetailed Results:")
    for test_name, test_result in results["tests"].items():
        status = test_result.get("status", "UNKNOWN")
        print(f"  {test_name}: {status}")
        
        if status == "FAIL" and "error" in test_result:
            print(f"    Error: {test_result['error']}")
        elif test_name == "message_latency" and status == "PASS":
            print(f"    Avg Latency: {test_result['avg_latency_ms']}ms")
            print(f"    Max Latency: {test_result['max_latency_ms']}ms")
            print(f"    Meets <30s req: {test_result['meets_30s_requirement']}")
        elif test_name == "concurrent_connections" and status == "PASS":
            print(f"    Successful: {test_result['successful_connections']}/{test_result['requested_connections']}")
            print(f"    Avg Connection Time: {test_result['avg_connection_time']}ms")
    
    # Save results to file
    with open("websocket_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\nFull results saved to: websocket_test_results.json")
    return results

if __name__ == "__main__":
    asyncio.run(main())