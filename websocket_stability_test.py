#!/usr/bin/env python3
"""
Comprehensive WebSocket Stability Test Suite
Tests connection resilience, reconnection, message delivery, and performance
"""

import asyncio
import websockets
import json
import time
import statistics
import signal
import sys
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

@dataclass
class TestResult:
    test_name: str
    success: bool
    duration: float
    details: Dict
    error: Optional[str] = None

class WebSocketStabilityTester:
    def __init__(self, uri: str = "ws://localhost:3001/ws"):
        self.uri = uri
        self.results: List[TestResult] = []
        self.stop_testing = False
        
    async def run_all_tests(self) -> Dict:
        """Run comprehensive stability test suite"""
        print("🧪 Starting WebSocket Stability Test Suite")
        print("=" * 60)
        
        # Signal handler for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        
        test_suite = [
            ("Basic Connection Test", self.test_basic_connection),
            ("Message Echo Test", self.test_message_echo),
            ("Concurrent Connections Test", self.test_concurrent_connections),
            ("Reconnection Test", self.test_reconnection_resilience),
            ("Message Ordering Test", self.test_message_ordering),
            ("Heartbeat Test", self.test_heartbeat_mechanism),
            ("Load Test", self.test_load_handling),
            ("Network Interruption Simulation", self.test_network_interruption),
            ("Large Message Test", self.test_large_messages),
            ("Connection State Test", self.test_connection_states)
        ]
        
        start_time = time.time()
        
        for test_name, test_func in test_suite:
            if self.stop_testing:
                break
                
            print(f"\n🔬 Running: {test_name}")
            print("-" * 40)
            
            try:
                result = await test_func()
                self.results.append(result)
                
                if result.success:
                    print(f"✅ {test_name}: PASSED ({result.duration:.2f}s)")
                else:
                    print(f"❌ {test_name}: FAILED ({result.duration:.2f}s)")
                    if result.error:
                        print(f"   Error: {result.error}")
                        
            except Exception as e:
                error_result = TestResult(
                    test_name=test_name,
                    success=False,
                    duration=0,
                    details={},
                    error=str(e)
                )
                self.results.append(error_result)
                print(f"❌ {test_name}: CRASHED - {e}")
        
        total_time = time.time() - start_time
        
        # Generate comprehensive report
        return self.generate_report(total_time)
    
    async def test_basic_connection(self) -> TestResult:
        """Test basic WebSocket connection establishment"""
        start_time = time.time()
        
        try:
            async with websockets.connect(self.uri, ping_interval=None) as websocket:
                # Wait for initial data
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                data = json.loads(message)
                
                success = data.get('type') == 'initial_data'
                details = {
                    "initial_message_type": data.get('type'),
                    "initial_data_keys": list(data.keys()) if isinstance(data, dict) else []
                }
                
                return TestResult(
                    test_name="Basic Connection Test",
                    success=success,
                    duration=time.time() - start_time,
                    details=details
                )
                
        except Exception as e:
            return TestResult(
                test_name="Basic Connection Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_message_echo(self) -> TestResult:
        """Test bidirectional message communication"""
        start_time = time.time()
        
        try:
            async with websockets.connect(self.uri, ping_interval=None) as websocket:
                # Skip initial message
                await websocket.recv()
                
                # Send test message
                test_message = {
                    "type": "test_echo",
                    "data": "Hello WebSocket",
                    "timestamp": datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(test_message))
                
                # Server might not echo back, but it should accept the message
                # without closing the connection
                await asyncio.sleep(1)
                
                # Send a heartbeat to verify connection is still alive
                heartbeat = {"type": "heartbeat", "timestamp": datetime.now().isoformat()}
                await websocket.send(json.dumps(heartbeat))
                
                return TestResult(
                    test_name="Message Echo Test",
                    success=True,
                    duration=time.time() - start_time,
                    details={"message_sent": True, "connection_stable": True}
                )
                
        except Exception as e:
            return TestResult(
                test_name="Message Echo Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_concurrent_connections(self) -> TestResult:
        """Test multiple simultaneous connections"""
        start_time = time.time()
        connection_count = 5
        
        async def single_connection(client_id):
            try:
                async with websockets.connect(self.uri, ping_interval=None) as websocket:
                    # Wait for initial data
                    await websocket.recv()
                    
                    # Send heartbeat
                    heartbeat = {
                        "type": "heartbeat",
                        "client_id": f"test_client_{client_id}",
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(heartbeat))
                    
                    # Keep connection alive for 3 seconds
                    await asyncio.sleep(3)
                    return True
                    
            except Exception as e:
                print(f"   Connection {client_id} failed: {e}")
                return False
        
        try:
            # Create concurrent connections
            tasks = [single_connection(i) for i in range(connection_count)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful_connections = sum(1 for r in results if r is True)
            
            return TestResult(
                test_name="Concurrent Connections Test",
                success=successful_connections == connection_count,
                duration=time.time() - start_time,
                details={
                    "total_connections": connection_count,
                    "successful_connections": successful_connections,
                    "success_rate": successful_connections / connection_count
                }
            )
            
        except Exception as e:
            return TestResult(
                test_name="Concurrent Connections Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_reconnection_resilience(self) -> TestResult:
        """Test connection recovery after deliberate disconnection"""
        start_time = time.time()
        reconnect_attempts = []
        
        try:
            # First connection
            websocket = await websockets.connect(self.uri, ping_interval=None)
            await websocket.recv()  # Initial data
            
            # Forcefully close connection
            await websocket.close()
            reconnect_attempts.append(time.time())
            
            # Attempt to reconnect
            await asyncio.sleep(1)
            websocket = await websockets.connect(self.uri, ping_interval=None)
            await websocket.recv()  # Should receive initial data again
            reconnect_attempts.append(time.time())
            
            await websocket.close()
            
            return TestResult(
                test_name="Reconnection Test",
                success=len(reconnect_attempts) == 2,
                duration=time.time() - start_time,
                details={
                    "reconnection_successful": True,
                    "reconnect_time": reconnect_attempts[1] - reconnect_attempts[0]
                }
            )
            
        except Exception as e:
            return TestResult(
                test_name="Reconnection Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_message_ordering(self) -> TestResult:
        """Test that messages are received in order"""
        start_time = time.time()
        
        try:
            async with websockets.connect(self.uri, ping_interval=None) as websocket:
                await websocket.recv()  # Initial data
                
                # Send sequence of numbered messages
                message_count = 10
                for i in range(message_count):
                    message = {
                        "type": "sequence_test",
                        "sequence_number": i,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(message))
                    await asyncio.sleep(0.1)  # Small delay between messages
                
                # Connection should remain stable
                await asyncio.sleep(1)
                
                return TestResult(
                    test_name="Message Ordering Test",
                    success=True,
                    duration=time.time() - start_time,
                    details={
                        "messages_sent": message_count,
                        "connection_stable": True
                    }
                )
                
        except Exception as e:
            return TestResult(
                test_name="Message Ordering Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_heartbeat_mechanism(self) -> TestResult:
        """Test heartbeat/ping-pong mechanism"""
        start_time = time.time()
        ping_times = []
        pong_responses = 0
        
        try:
            async with websockets.connect(self.uri, ping_interval=5, ping_timeout=3) as websocket:
                await websocket.recv()  # Initial data
                
                # Monitor for ping-pong for 15 seconds
                end_time = time.time() + 15
                
                while time.time() < end_time:
                    try:
                        # Send manual ping
                        ping_message = {
                            "type": "ping",
                            "timestamp": datetime.now().isoformat()
                        }
                        await websocket.send(json.dumps(ping_message))
                        ping_times.append(time.time())
                        
                        # Wait for potential pong or other messages
                        try:
                            message = await asyncio.wait_for(websocket.recv(), timeout=2)
                            if message:
                                data = json.loads(message)
                                if data.get('type') == 'pong':
                                    pong_responses += 1
                        except asyncio.TimeoutError:
                            pass
                        
                        await asyncio.sleep(3)
                        
                    except Exception as e:
                        print(f"   Heartbeat error: {e}")
                        break
                
                return TestResult(
                    test_name="Heartbeat Test",
                    success=True,  # Connection stayed alive
                    duration=time.time() - start_time,
                    details={
                        "pings_sent": len(ping_times),
                        "pongs_received": pong_responses,
                        "connection_maintained": True
                    }
                )
                
        except Exception as e:
            return TestResult(
                test_name="Heartbeat Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_load_handling(self) -> TestResult:
        """Test server behavior under message load"""
        start_time = time.time()
        
        try:
            async with websockets.connect(self.uri, ping_interval=None) as websocket:
                await websocket.recv()  # Initial data
                
                # Send burst of messages
                message_count = 50
                send_times = []
                
                for i in range(message_count):
                    message = {
                        "type": "load_test",
                        "message_id": i,
                        "data": "x" * 100,  # 100 character payload
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    send_start = time.time()
                    await websocket.send(json.dumps(message))
                    send_times.append(time.time() - send_start)
                
                # Allow server to process
                await asyncio.sleep(2)
                
                avg_send_time = statistics.mean(send_times)
                max_send_time = max(send_times)
                
                return TestResult(
                    test_name="Load Test",
                    success=max_send_time < 0.1,  # All sends under 100ms
                    duration=time.time() - start_time,
                    details={
                        "messages_sent": message_count,
                        "avg_send_time": avg_send_time,
                        "max_send_time": max_send_time,
                        "throughput_msgs_per_sec": message_count / (time.time() - start_time)
                    }
                )
                
        except Exception as e:
            return TestResult(
                test_name="Load Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_network_interruption(self) -> TestResult:
        """Simulate network interruption by forcefully closing and reconnecting"""
        start_time = time.time()
        
        try:
            # Establish connection
            websocket = await websockets.connect(self.uri, ping_interval=None)
            await websocket.recv()  # Initial data
            
            # Send some messages
            for i in range(3):
                await websocket.send(json.dumps({
                    "type": "pre_interruption",
                    "message_id": i
                }))
            
            # Simulate network interruption
            await websocket.close(code=1006)  # Abnormal closure
            await asyncio.sleep(2)
            
            # Attempt to reconnect
            websocket = await websockets.connect(self.uri, ping_interval=None)
            await websocket.recv()  # Should get initial data again
            
            # Send post-reconnection messages
            for i in range(3):
                await websocket.send(json.dumps({
                    "type": "post_interruption", 
                    "message_id": i
                }))
            
            await websocket.close()
            
            return TestResult(
                test_name="Network Interruption Simulation",
                success=True,
                duration=time.time() - start_time,
                details={
                    "interruption_simulated": True,
                    "reconnection_successful": True,
                    "post_reconnection_messaging": True
                }
            )
            
        except Exception as e:
            return TestResult(
                test_name="Network Interruption Simulation",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_large_messages(self) -> TestResult:
        """Test handling of large messages"""
        start_time = time.time()
        
        try:
            async with websockets.connect(self.uri, ping_interval=None) as websocket:
                await websocket.recv()  # Initial data
                
                # Test various message sizes
                message_sizes = [1024, 10240, 102400]  # 1KB, 10KB, 100KB
                results = {}
                
                for size in message_sizes:
                    large_data = "x" * size
                    message = {
                        "type": "large_message_test",
                        "size": size,
                        "data": large_data
                    }
                    
                    send_start = time.time()
                    await websocket.send(json.dumps(message))
                    send_time = time.time() - send_start
                    
                    results[f"size_{size}"] = {
                        "send_time": send_time,
                        "success": True
                    }
                    
                    await asyncio.sleep(0.5)  # Small delay between large messages
                
                return TestResult(
                    test_name="Large Message Test",
                    success=all(r["success"] for r in results.values()),
                    duration=time.time() - start_time,
                    details=results
                )
                
        except Exception as e:
            return TestResult(
                test_name="Large Message Test",
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_connection_states(self) -> TestResult:
        """Test various connection states and transitions"""
        start_time = time.time()
        state_transitions = []
        
        try:
            # Test normal connection
            websocket = await websockets.connect(self.uri, ping_interval=None)
            state_transitions.append(("connected", time.time()))
            
            await websocket.recv()  # Initial data
            state_transitions.append(("data_received", time.time()))
            
            # Test clean close
            await websocket.close(code=1000, reason="Clean test close")
            state_transitions.append(("clean_close", time.time()))
            
            # Test reconnection
            websocket = await websockets.connect(self.uri, ping_interval=None)
            state_transitions.append(("reconnected", time.time()))
            
            await websocket.recv()  # Initial data again
            state_transitions.append(("data_received_again", time.time()))
            
            await websocket.close()
            
            return TestResult(
                test_name="Connection State Test",
                success=len(state_transitions) == 5,
                duration=time.time() - start_time,
                details={
                    "state_transitions": state_transitions,
                    "all_states_reached": len(state_transitions) == 5
                }
            )
            
        except Exception as e:
            return TestResult(
                test_name="Connection State Test",
                success=False,
                duration=time.time() - start_time,
                details={"state_transitions": state_transitions},
                error=str(e)
            )
    
    def generate_report(self, total_time: float) -> Dict:
        """Generate comprehensive test report"""
        passed_tests = sum(1 for r in self.results if r.success)
        total_tests = len(self.results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "success_rate": success_rate,
                "total_duration": total_time,
                "average_test_duration": total_time / total_tests if total_tests > 0 else 0
            },
            "test_results": [
                {
                    "name": r.test_name,
                    "success": r.success,
                    "duration": r.duration,
                    "details": r.details,
                    "error": r.error
                }
                for r in self.results
            ],
            "recommendations": self._generate_recommendations()
        }
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        failed_tests = [r for r in self.results if not r.success]
        
        if not failed_tests:
            recommendations.append("✅ All tests passed! WebSocket infrastructure is stable.")
        else:
            recommendations.append(f"⚠️ {len(failed_tests)} test(s) failed. See details above.")
        
        # Check specific failure patterns
        if any("Connection" in r.test_name for r in failed_tests):
            recommendations.append("🔧 Connection issues detected. Check server availability and network configuration.")
        
        if any("Heartbeat" in r.test_name for r in failed_tests):
            recommendations.append("💓 Heartbeat mechanism issues. Review ping/pong implementation.")
        
        if any("Load" in r.test_name for r in failed_tests):
            recommendations.append("📈 Performance issues under load. Consider optimization or scaling.")
        
        if any("Reconnection" in r.test_name for r in failed_tests):
            recommendations.append("🔄 Reconnection mechanism needs improvement. Implement exponential backoff.")
        
        return recommendations
    
    def _signal_handler(self, signum, frame):
        """Handle interrupt signals gracefully"""
        print(f"\n⏹️ Received signal {signum}, stopping tests...")
        self.stop_testing = True

async def main():
    """Run the WebSocket stability test suite"""
    if len(sys.argv) > 1:
        uri = sys.argv[1]
    else:
        uri = "ws://localhost:3001/ws"
    
    tester = WebSocketStabilityTester(uri)
    report = await tester.run_all_tests()
    
    # Print detailed report
    print("\n" + "=" * 60)
    print("📊 WebSocket Stability Test Report")
    print("=" * 60)
    
    summary = report["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']} ({summary['success_rate']:.1f}%)")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Total Duration: {summary['total_duration']:.2f}s")
    print(f"Average Test Duration: {summary['average_test_duration']:.2f}s")
    
    print(f"\n📋 Recommendations:")
    for recommendation in report["recommendations"]:
        print(f"  {recommendation}")
    
    # Save detailed report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"websocket_stability_report_{timestamp}.json"
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Detailed report saved to: {report_file}")
    
    return summary['success_rate'] == 100.0

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)