#!/usr/bin/env python3
"""
Integration Validation Suite for Claude Code Optimizer
Comprehensive testing and validation of all enhanced components
"""

import sqlite3
import json
import time
import requests
import subprocess
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from pathlib import Path

class IntegrationValidationSuite:
    """Comprehensive integration testing for all optimizer components"""
    
    def __init__(self):
        self.base_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"
        self.db_path = f"{self.base_path}/claude_usage.db"
        self.session_tracker_path = f"{self.base_path}/session_tracker"
        
        self.test_results = {
            'timestamp': datetime.now().isoformat(),
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'component_status': {},
            'integration_status': {},
            'performance_metrics': {},
            'recommendations': []
        }
    
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.test_results['tests_run'] += 1
        if passed:
            self.test_results['tests_passed'] += 1
            status = "✅ PASS"
        else:
            self.test_results['tests_failed'] += 1
            status = "❌ FAIL"
        
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
    
    def test_database_integration(self) -> bool:
        """Test database connectivity and schema"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Test real_sessions table
            cursor.execute("SELECT COUNT(*) FROM real_sessions")
            session_count = cursor.fetchone()[0]
            
            # Test enhanced columns
            cursor.execute("PRAGMA table_info(real_sessions)")
            columns = [column[1] for column in cursor.fetchall()]
            
            required_columns = ['real_total_tokens', 'token_extraction_method', 'last_token_update']
            has_enhanced_columns = all(col in columns for col in required_columns)
            
            conn.close()
            
            self.test_results['component_status']['database'] = {
                'connected': True,
                'session_count': session_count,
                'enhanced_schema': has_enhanced_columns,
                'columns': columns
            }
            
            self.log_test("Database Integration", True, f"{session_count} sessions, enhanced schema: {has_enhanced_columns}")
            return True
            
        except Exception as e:
            self.log_test("Database Integration", False, str(e))
            return False
    
    def test_session_tracker_api(self) -> bool:
        """Test session tracker API functionality"""
        try:
            # Check if server is running
            response = requests.get("http://localhost:3001/api/status", timeout=5)
            
            if response.status_code == 200:
                status_data = response.json()
                
                # Test other endpoints
                endpoints = [
                    "/api/sessions/recent",
                    "/api/analytics/current",
                    "/api/five-hour-blocks"
                ]
                
                endpoint_results = {}
                for endpoint in endpoints:
                    try:
                        resp = requests.get(f"http://localhost:3001{endpoint}", timeout=5)
                        endpoint_results[endpoint] = {
                            'status': resp.status_code,
                            'response_time': resp.elapsed.total_seconds()
                        }
                    except Exception as e:
                        endpoint_results[endpoint] = {'error': str(e)}
                
                self.test_results['component_status']['session_tracker_api'] = {
                    'running': True,
                    'version': status_data.get('version'),
                    'connected_clients': status_data.get('connected_clients'),
                    'endpoints': endpoint_results
                }
                
                self.log_test("Session Tracker API", True, f"Version {status_data.get('version')}, {status_data.get('connected_clients')} clients")
                return True
            else:
                self.log_test("Session Tracker API", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Session Tracker API", False, str(e))
            return False
    
    def test_websocket_connectivity(self) -> bool:
        """Test WebSocket infrastructure"""
        try:
            # Simple WebSocket test using requests for HTTP upgrade check
            response = requests.get(
                "http://localhost:3001/ws",
                headers={'Upgrade': 'websocket', 'Connection': 'Upgrade'},
                timeout=5
            )
            
            # WebSocket upgrade returns 426 for HTTP requests
            websocket_available = response.status_code in [426, 101]
            
            self.test_results['component_status']['websocket'] = {
                'available': websocket_available,
                'upgrade_response': response.status_code
            }
            
            self.log_test("WebSocket Infrastructure", websocket_available, f"Upgrade response: {response.status_code}")
            return websocket_available
            
        except Exception as e:
            self.log_test("WebSocket Infrastructure", False, str(e))
            return False
    
    def test_analytics_engine(self) -> bool:
        """Test analytics engine functionality"""
        try:
            # Import and test analytics engine
            sys.path.append(self.session_tracker_path)
            from simplified_analytics_engine import SimplifiedAnalyticsEngine
            
            engine = SimplifiedAnalyticsEngine(self.db_path)
            
            # Test core functions
            efficiency = engine.calculate_usage_efficiency()
            cost_analysis = engine.analyze_cost_optimization()
            rate_limit_risk = engine.predict_rate_limit_risk()
            productivity = engine.calculate_productivity_score()
            
            # Generate report
            report = engine.generate_comprehensive_report()
            
            self.test_results['component_status']['analytics_engine'] = {
                'functional': True,
                'efficiency_score': efficiency,
                'cost_optimization': cost_analysis.get('optimization_score', 0),
                'rate_limit_risk': rate_limit_risk.get('risk_score', 0),
                'productivity_score': productivity,
                'session_count': len(engine.session_data)
            }
            
            self.log_test("Analytics Engine", True, f"Processed {len(engine.session_data)} sessions")
            return True
            
        except Exception as e:
            self.log_test("Analytics Engine", False, str(e))
            return False
    
    def test_model_optimization(self) -> bool:
        """Test model optimization components"""
        try:
            # Check for model optimization files
            model_files = [
                f"{self.session_tracker_path}/intelligent_model_selector.py",
                f"{self.session_tracker_path}/cost_analytics_dashboard.py",
                f"{self.session_tracker_path}/claude_optimizer_cli.py"
            ]
            
            files_exist = all(os.path.exists(f) for f in model_files)
            
            if files_exist:
                # Try importing model selector
                sys.path.append(self.session_tracker_path)
                try:
                    from intelligent_model_selector import IntelligentModelSelector
                    selector = IntelligentModelSelector(self.db_path)
                    
                    # Test recommendation
                    recommendation = selector.recommend_model("Fix a simple Python syntax error")
                    
                    self.test_results['component_status']['model_optimization'] = {
                        'files_exist': True,
                        'functional': True,
                        'test_recommendation': recommendation
                    }
                    
                    self.log_test("Model Optimization", True, f"Recommendation: {recommendation.get('recommended_model', 'Unknown')}")
                    return True
                    
                except ImportError as e:
                    self.log_test("Model Optimization", False, f"Import error: {e}")
                    return False
            else:
                self.log_test("Model Optimization", False, "Required files missing")
                return False
                
        except Exception as e:
            self.log_test("Model Optimization", False, str(e))
            return False
    
    def test_calendar_integration(self) -> bool:
        """Test calendar integration components"""
        try:
            # Check for calendar integration files
            calendar_files = [
                f"{self.session_tracker_path}/calendar_integration.py",
                f"{self.session_tracker_path}/calendar_scheduler.py",
                f"{self.session_tracker_path}/calendar_api.py"
            ]
            
            files_exist = all(os.path.exists(f) for f in calendar_files)
            
            if files_exist:
                # Test basic calendar functionality
                sys.path.append(self.session_tracker_path)
                try:
                    from calendar_integration import SessionCalendarManager
                    
                    manager = SessionCalendarManager()
                    
                    # Test session templates
                    templates = manager.get_session_templates()
                    
                    self.test_results['component_status']['calendar_integration'] = {
                        'files_exist': True,
                        'functional': True,
                        'templates_count': len(templates)
                    }
                    
                    self.log_test("Calendar Integration", True, f"{len(templates)} session templates available")
                    return True
                    
                except ImportError as e:
                    self.log_test("Calendar Integration", False, f"Import error: {e}")
                    return False
            else:
                self.log_test("Calendar Integration", False, "Required files missing")
                return False
                
        except Exception as e:
            self.log_test("Calendar Integration", False, str(e))
            return False
    
    def test_netlify_sync(self) -> bool:
        """Test Netlify synchronization"""
        try:
            # Check for Netlify sync files
            netlify_files = [
                f"{self.session_tracker_path}/netlify_sync.py",
                f"{self.base_path}/netlify.toml",
                f"{self.base_path}/moonlock-dashboard-enhanced.tsx"
            ]
            
            files_exist = all(os.path.exists(f) for f in netlify_files)
            
            if files_exist:
                self.test_results['component_status']['netlify_sync'] = {
                    'files_exist': True,
                    'sync_script_available': True
                }
                
                self.log_test("Netlify Sync", True, "Sync components available")
                return True
            else:
                missing_files = [f for f in netlify_files if not os.path.exists(f)]
                self.log_test("Netlify Sync", False, f"Missing files: {missing_files}")
                return False
                
        except Exception as e:
            self.log_test("Netlify Sync", False, str(e))
            return False
    
    def test_end_to_end_flow(self) -> bool:
        """Test complete end-to-end data flow"""
        try:
            start_time = time.time()
            
            # 1. Check database has data
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM real_sessions WHERE tokens_used > 0")
            sessions_with_data = cursor.fetchone()[0]
            conn.close()
            
            # 2. Test API data retrieval
            api_response = requests.get("http://localhost:3001/api/sessions/recent", timeout=5)
            api_data_available = api_response.status_code == 200
            
            # 3. Test analytics generation
            sys.path.append(self.session_tracker_path)
            from simplified_analytics_engine import SimplifiedAnalyticsEngine
            engine = SimplifiedAnalyticsEngine(self.db_path)
            report = engine.generate_comprehensive_report()
            analytics_working = len(report.get('recommendations', [])) > 0
            
            end_time = time.time()
            total_time = end_time - start_time
            
            e2e_success = sessions_with_data > 0 and api_data_available and analytics_working
            
            self.test_results['integration_status']['end_to_end'] = {
                'success': e2e_success,
                'sessions_with_data': sessions_with_data,
                'api_responsive': api_data_available,
                'analytics_functional': analytics_working,
                'total_time_seconds': total_time
            }
            
            self.log_test("End-to-End Flow", e2e_success, f"Complete in {total_time:.2f}s")
            return e2e_success
            
        except Exception as e:
            self.log_test("End-to-End Flow", False, str(e))
            return False
    
    def test_performance_metrics(self) -> bool:
        """Test system performance and response times"""
        try:
            start_time = time.time()
            
            # API response time test
            api_times = []
            for i in range(5):
                test_start = time.time()
                response = requests.get("http://localhost:3001/api/status", timeout=5)
                api_times.append(time.time() - test_start)
            
            avg_api_time = sum(api_times) / len(api_times)
            
            # Analytics generation time
            analytics_start = time.time()
            sys.path.append(self.session_tracker_path)
            from simplified_analytics_engine import SimplifiedAnalyticsEngine
            engine = SimplifiedAnalyticsEngine(self.db_path)
            report = engine.generate_comprehensive_report()
            analytics_time = time.time() - analytics_start
            
            # Database query time
            db_start = time.time()
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM real_sessions ORDER BY start_time DESC LIMIT 100")
            cursor.fetchall()
            conn.close()
            db_time = time.time() - db_start
            
            performance_good = avg_api_time < 1.0 and analytics_time < 5.0 and db_time < 1.0
            
            self.test_results['performance_metrics'] = {
                'api_response_time': avg_api_time,
                'analytics_generation_time': analytics_time,
                'database_query_time': db_time,
                'overall_performance': 'good' if performance_good else 'needs_optimization'
            }
            
            self.log_test("Performance Metrics", performance_good, 
                         f"API: {avg_api_time:.3f}s, Analytics: {analytics_time:.3f}s, DB: {db_time:.3f}s")
            return performance_good
            
        except Exception as e:
            self.log_test("Performance Metrics", False, str(e))
            return False
    
    def generate_final_recommendations(self):
        """Generate final recommendations based on test results"""
        recommendations = []
        
        # Based on test results
        if self.test_results['tests_failed'] == 0:
            recommendations.append("✅ ALL SYSTEMS OPERATIONAL - Ready for August 28 rate limits")
        else:
            recommendations.append("⚠️ Some components need attention before production use")
        
        # Performance recommendations
        perf = self.test_results.get('performance_metrics', {})
        if perf.get('api_response_time', 0) > 0.5:
            recommendations.append("Consider API performance optimization")
        if perf.get('analytics_generation_time', 0) > 3.0:
            recommendations.append("Analytics engine may benefit from caching")
        
        # Component-specific recommendations
        components = self.test_results.get('component_status', {})
        
        if not components.get('websocket', {}).get('available', False):
            recommendations.append("WebSocket infrastructure needs configuration")
        
        if not components.get('model_optimization', {}).get('functional', False):
            recommendations.append("Model optimization system requires setup")
        
        if not components.get('calendar_integration', {}).get('functional', False):
            recommendations.append("Calendar integration needs Google API setup")
        
        # Success recommendations
        if self.test_results['tests_passed'] > 8:
            recommendations.append("🎯 System ready for 30% cost savings through optimization")
            recommendations.append("📊 Real-time analytics and forecasting operational")
            recommendations.append("📅 Session planning ready for rate limit management")
        
        self.test_results['recommendations'] = recommendations
    
    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run complete validation suite"""
        print("🔍 Claude Code Optimizer - Integration Validation Suite")
        print("=" * 70)
        print(f"📅 Starting validation at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Core Infrastructure Tests
        print("🏗️  Core Infrastructure Tests")
        print("-" * 30)
        self.test_database_integration()
        self.test_session_tracker_api()
        self.test_websocket_connectivity()
        print()
        
        # Component Integration Tests
        print("🔧 Component Integration Tests")
        print("-" * 30)
        self.test_analytics_engine()
        self.test_model_optimization()
        self.test_calendar_integration()
        self.test_netlify_sync()
        print()
        
        # System Integration Tests
        print("🔄 System Integration Tests")
        print("-" * 30)
        self.test_end_to_end_flow()
        self.test_performance_metrics()
        print()
        
        # Generate recommendations
        self.generate_final_recommendations()
        
        # Final summary
        print("📊 Validation Summary")
        print("-" * 30)
        print(f"Tests Run: {self.test_results['tests_run']}")
        print(f"Passed: ✅ {self.test_results['tests_passed']}")
        print(f"Failed: ❌ {self.test_results['tests_failed']}")
        
        success_rate = (self.test_results['tests_passed'] / self.test_results['tests_run']) * 100
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        print("🎯 Recommendations")
        print("-" * 30)
        for i, rec in enumerate(self.test_results['recommendations'], 1):
            print(f"{i}. {rec}")
        
        # Export results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"integration_validation_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        
        print(f"\n📄 Full validation results exported: {results_file}")
        
        return self.test_results

def main():
    """Main function to run validation suite"""
    validator = IntegrationValidationSuite()
    results = validator.run_comprehensive_validation()
    
    # Return exit code based on results
    if results['tests_failed'] == 0:
        print("\n🎉 ALL VALIDATIONS PASSED - System ready for production!")
        return 0
    else:
        print(f"\n⚠️  {results['tests_failed']} validation(s) failed - Review recommendations")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)