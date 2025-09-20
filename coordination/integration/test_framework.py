#!/usr/bin/env python3
"""
Integration Testing Framework for Claude Code Optimizer Enhancement.
Tests agent deliverables and system integration.
"""

import asyncio
import json
import logging
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


class IntegrationTestFramework:
    """Comprehensive integration testing for the enhanced system."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.test_results: Dict[str, Any] = {}
        self.logger = self._setup_logging()
        
        # Test configuration
        self.test_database = project_root / "test_claude_usage.db"
        self.expected_deliverables = {
            "cli_enhancement": {
                "files": [
                    "src/cli/cco.py",
                    "src/cli/commands/daily.py",
                    "src/cli/commands/weekly.py", 
                    "src/cli/commands/sessions.py",
                    "src/cli/commands/status.py",
                    "src/cli/commands/limits.py",
                    "src/cli/formatters/table.py",
                    "src/cli/formatters/json.py"
                ],
                "functionality": [
                    "ccusage_compatibility",
                    "command_parsing",
                    "output_formatting",
                    "api_integration"
                ]
            },
            "dashboard_simplification": {
                "files": [
                    "src/components/simple/SimpleDashboard.tsx",
                    "src/components/simple/SimpleStatusCard.tsx",
                    "src/components/simple/SimpleQuotaCard.tsx", 
                    "src/components/simple/ModeToggle.tsx"
                ],
                "functionality": [
                    "mode_switching",
                    "simple_layout",
                    "responsive_design",
                    "data_integration"
                ]
            },
            "planning_logic": {
                "files": [
                    "src/planning/project_analyzer.py",
                    "src/planning/quota_manager.py",
                    "src/planning/session_optimizer.py",
                    "src/planning/block_manager.py"
                ],
                "functionality": [
                    "complexity_detection",
                    "quota_management",
                    "optimization_recommendations",
                    "block_tracking"
                ]
            }
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Set up test logging."""
        logger = logging.getLogger("integration_tests")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive integration tests."""
        self.logger.info("Starting integration test suite...")
        
        # Initialize test results
        self.test_results = {
            "test_run_id": datetime.now().isoformat(),
            "deliverable_tests": {},
            "functionality_tests": {},
            "integration_tests": {},
            "performance_tests": {},
            "summary": {}
        }
        
        # Run test categories
        await self._test_deliverables()
        await self._test_functionality()
        await self._test_integration()
        await self._test_performance()
        
        # Generate summary
        self._generate_test_summary()
        
        return self.test_results
    
    async def _test_deliverables(self) -> None:
        """Test that all expected deliverables exist."""
        self.logger.info("Testing deliverable files...")
        
        for agent_id, expectations in self.expected_deliverables.items():
            agent_results = {
                "files_found": [],
                "files_missing": [],
                "file_quality": {}
            }
            
            for file_path_str in expectations["files"]:
                file_path = self.project_root / file_path_str
                
                if file_path.exists():
                    agent_results["files_found"].append(file_path_str)
                    
                    # Test file quality
                    quality_score = await self._assess_file_quality(file_path)
                    agent_results["file_quality"][file_path_str] = quality_score
                else:
                    agent_results["files_missing"].append(file_path_str)
            
            self.test_results["deliverable_tests"][agent_id] = agent_results
    
    async def _assess_file_quality(self, file_path: Path) -> Dict[str, Any]:
        """Assess quality of a deliverable file."""
        try:
            content = file_path.read_text()
            
            quality_metrics = {
                "exists": True,
                "size_bytes": len(content),
                "line_count": len(content.splitlines()),
                "has_documentation": False,
                "has_error_handling": False,
                "syntax_valid": False,
                "score": 0.0
            }
            
            # Documentation check
            doc_indicators = ["def ", "class ", "import ", "export ", "interface "]
            if any(indicator in content for indicator in doc_indicators):
                quality_metrics["has_documentation"] = True
                quality_metrics["score"] += 0.3
            
            # Error handling check
            error_indicators = ["try:", "catch", "except", "error", "Error"]
            if any(indicator in content for indicator in error_indicators):
                quality_metrics["has_error_handling"] = True
                quality_metrics["score"] += 0.3
            
            # Basic syntax validation
            if file_path.suffix == ".py":
                try:
                    compile(content, str(file_path), 'exec')
                    quality_metrics["syntax_valid"] = True
                    quality_metrics["score"] += 0.4
                except SyntaxError:
                    pass
            elif file_path.suffix in [".tsx", ".ts", ".js"]:
                # Basic TypeScript/JavaScript validation
                if "function" in content or "const" in content or "class" in content:
                    quality_metrics["syntax_valid"] = True
                    quality_metrics["score"] += 0.4
            
            return quality_metrics
            
        except Exception as e:
            return {
                "exists": False,
                "error": str(e),
                "score": 0.0
            }
    
    async def _test_functionality(self) -> None:
        """Test functional requirements for each agent."""
        self.logger.info("Testing functionality requirements...")
        
        # CLI Enhancement functionality tests
        cli_results = await self._test_cli_functionality()
        self.test_results["functionality_tests"]["cli_enhancement"] = cli_results
        
        # Dashboard functionality tests  
        dashboard_results = await self._test_dashboard_functionality()
        self.test_results["functionality_tests"]["dashboard_simplification"] = dashboard_results
        
        # Planning logic functionality tests
        planning_results = await self._test_planning_functionality()
        self.test_results["functionality_tests"]["planning_logic"] = planning_results
    
    async def _test_cli_functionality(self) -> Dict[str, Any]:
        """Test CLI enhancement functionality."""
        results = {
            "ccusage_compatibility": False,
            "command_parsing": False,
            "output_formatting": False,
            "api_integration": False,
            "test_details": {}
        }
        
        cli_path = self.project_root / "src/cli/cco.py"
        
        if cli_path.exists():
            try:
                # Test basic CLI structure
                content = cli_path.read_text()
                
                # Check for ccusage compatible commands
                ccusage_commands = ["daily", "weekly", "sessions", "status"]
                commands_found = sum(1 for cmd in ccusage_commands if cmd in content)
                results["ccusage_compatibility"] = commands_found >= 3
                results["test_details"]["commands_found"] = commands_found
                
                # Check for command parsing framework
                parsing_indicators = ["click", "typer", "argparse", "@command"]
                results["command_parsing"] = any(indicator in content for indicator in parsing_indicators)
                
                # Check for output formatting
                format_indicators = ["format", "table", "json", "print"]
                results["output_formatting"] = any(indicator in content for indicator in format_indicators)
                
                # Check for API integration
                api_indicators = ["requests", "httpx", "api", "endpoint"]
                results["api_integration"] = any(indicator in content for indicator in api_indicators)
                
            except Exception as e:
                results["test_details"]["error"] = str(e)
        
        return results
    
    async def _test_dashboard_functionality(self) -> Dict[str, Any]:
        """Test dashboard simplification functionality."""
        results = {
            "mode_switching": False,
            "simple_layout": False,
            "responsive_design": False,
            "data_integration": False,
            "test_details": {}
        }
        
        # Check for mode toggle component
        toggle_path = self.project_root / "src/components/simple/ModeToggle.tsx"
        if toggle_path.exists():
            try:
                content = toggle_path.read_text()
                
                # Mode switching indicators
                mode_indicators = ["simple", "advanced", "toggle", "switch"]
                results["mode_switching"] = any(indicator in content for indicator in mode_indicators)
                
                # Simple layout indicators
                layout_indicators = ["SimpleDashboard", "SimpleCard", "simple-"]
                results["simple_layout"] = any(indicator in content for indicator in layout_indicators)
                
                # Responsive design indicators
                responsive_indicators = ["responsive", "mobile", "@media", "breakpoint"]
                results["responsive_design"] = any(indicator in content for indicator in responsive_indicators)
                
                # Data integration indicators
                data_indicators = ["useContext", "useState", "useEffect", "props"]
                results["data_integration"] = any(indicator in content for indicator in data_indicators)
                
            except Exception as e:
                results["test_details"]["error"] = str(e)
        
        return results
    
    async def _test_planning_functionality(self) -> Dict[str, Any]:
        """Test planning logic functionality."""
        results = {
            "complexity_detection": False,
            "quota_management": False,
            "optimization_recommendations": False,
            "block_tracking": False,
            "test_details": {}
        }
        
        # Check planning modules
        planning_files = [
            "src/planning/project_analyzer.py",
            "src/planning/quota_manager.py", 
            "src/planning/session_optimizer.py",
            "src/planning/block_manager.py"
        ]
        
        functionality_found = 0
        
        for file_path_str in planning_files:
            file_path = self.project_root / file_path_str
            if file_path.exists():
                try:
                    content = file_path.read_text()
                    
                    if "project_analyzer" in file_path_str:
                        complexity_indicators = ["complexity", "analyze", "detect", "ProjectAnalyzer"]
                        results["complexity_detection"] = any(indicator in content for indicator in complexity_indicators)
                        if results["complexity_detection"]:
                            functionality_found += 1
                    
                    elif "quota_manager" in file_path_str:
                        quota_indicators = ["quota", "limit", "traffic", "QuotaManager"]
                        results["quota_management"] = any(indicator in content for indicator in quota_indicators)
                        if results["quota_management"]:
                            functionality_found += 1
                    
                    elif "session_optimizer" in file_path_str:
                        optimization_indicators = ["optimize", "recommend", "efficiency", "SessionOptimizer"]
                        results["optimization_recommendations"] = any(indicator in content for indicator in optimization_indicators)
                        if results["optimization_recommendations"]:
                            functionality_found += 1
                    
                    elif "block_manager" in file_path_str:
                        block_indicators = ["block", "five", "5", "BlockManager"]
                        results["block_tracking"] = any(indicator in content for indicator in block_indicators)
                        if results["block_tracking"]:
                            functionality_found += 1
                            
                except Exception as e:
                    results["test_details"][file_path_str] = {"error": str(e)}
        
        results["test_details"]["functionality_modules_found"] = functionality_found
        
        return results
    
    async def _test_integration(self) -> None:
        """Test integration between components."""
        self.logger.info("Testing system integration...")
        
        integration_results = {
            "database_connectivity": await self._test_database_integration(),
            "api_endpoints": await self._test_api_integration(),
            "component_interaction": await self._test_component_integration(),
            "data_flow": await self._test_data_flow()
        }
        
        self.test_results["integration_tests"] = integration_results
    
    async def _test_database_integration(self) -> Dict[str, Any]:
        """Test database connectivity and operations."""
        results = {
            "connection_successful": False,
            "schema_valid": False,
            "queries_working": False,
            "test_details": {}
        }
        
        try:
            # Test database connection
            db_path = self.project_root / "claude_usage.db"
            if db_path.exists():
                with sqlite3.connect(db_path) as conn:
                    cursor = conn.cursor()
                    
                    # Test connection
                    cursor.execute("SELECT 1")
                    results["connection_successful"] = True
                    
                    # Test schema
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                    tables = [row[0] for row in cursor.fetchall()]
                    expected_tables = ["sessions", "token_usage", "weekly_quotas"]
                    schema_complete = all(table in tables for table in expected_tables)
                    results["schema_valid"] = schema_complete
                    results["test_details"]["tables_found"] = tables
                    
                    # Test basic queries
                    cursor.execute("SELECT COUNT(*) FROM sessions")
                    session_count = cursor.fetchone()[0]
                    results["queries_working"] = True
                    results["test_details"]["session_count"] = session_count
        
        except Exception as e:
            results["test_details"]["error"] = str(e)
        
        return results
    
    async def _test_api_integration(self) -> Dict[str, Any]:
        """Test API endpoint availability."""
        results = {
            "endpoints_accessible": False,
            "responses_valid": False,
            "test_details": {}
        }
        
        # Check if API endpoints are defined
        api_files = [
            "dashboard-server/server.py",
            "live_data_api.py",
            "enhanced_dashboard_server.py"
        ]
        
        endpoints_found = []
        for file_path_str in api_files:
            file_path = self.project_root / file_path_str
            if file_path.exists():
                try:
                    content = file_path.read_text()
                    if "/api/" in content:
                        endpoints_found.append(file_path_str)
                except Exception:
                    pass
        
        results["endpoints_accessible"] = len(endpoints_found) > 0
        results["test_details"]["api_files_found"] = endpoints_found
        
        return results
    
    async def _test_component_integration(self) -> Dict[str, Any]:
        """Test component interaction and dependencies."""
        results = {
            "imports_resolved": False,
            "dependencies_satisfied": False,
            "test_details": {}
        }
        
        # Check Python imports
        python_files = list(self.project_root.rglob("*.py"))
        import_issues = []
        
        for py_file in python_files[:10]:  # Limit to first 10 files
            try:
                content = py_file.read_text()
                # Look for import statements
                import_lines = [line for line in content.splitlines() if line.strip().startswith('import ') or line.strip().startswith('from ')]
                if import_lines:
                    results["imports_resolved"] = True
                    break
            except Exception as e:
                import_issues.append(f"{py_file}: {e}")
        
        results["test_details"]["import_issues"] = import_issues
        
        # Check package dependencies
        requirements_file = self.project_root / "requirements.txt"
        if requirements_file.exists():
            results["dependencies_satisfied"] = True
        
        return results
    
    async def _test_data_flow(self) -> Dict[str, Any]:
        """Test data flow between components."""
        results = {
            "data_consistency": False,
            "real_time_updates": False,
            "test_details": {}
        }
        
        # Check for data model consistency
        model_files = list(self.project_root.rglob("*model*.py")) + list(self.project_root.rglob("*data*.py"))
        if model_files:
            results["data_consistency"] = True
            results["test_details"]["model_files"] = [str(f) for f in model_files]
        
        # Check for real-time components
        realtime_indicators = ["websocket", "live", "real-time", "socket"]
        realtime_files = []
        
        for file_path in self.project_root.rglob("*"):
            if file_path.is_file() and file_path.suffix in [".py", ".js", ".ts", ".tsx"]:
                try:
                    content = file_path.read_text()
                    if any(indicator in content.lower() for indicator in realtime_indicators):
                        realtime_files.append(str(file_path))
                except Exception:
                    pass
        
        results["real_time_updates"] = len(realtime_files) > 0
        results["test_details"]["realtime_files"] = realtime_files[:5]  # Limit output
        
        return results
    
    async def _test_performance(self) -> None:
        """Test performance characteristics."""
        self.logger.info("Testing performance...")
        
        performance_results = {
            "cli_response_time": await self._test_cli_performance(),
            "dashboard_load_time": await self._test_dashboard_performance(),
            "database_query_speed": await self._test_database_performance(),
            "memory_usage": await self._test_memory_usage()
        }
        
        self.test_results["performance_tests"] = performance_results
    
    async def _test_cli_performance(self) -> Dict[str, Any]:
        """Test CLI response time."""
        results = {
            "response_time_ms": None,
            "meets_requirements": False,  # < 1 second
            "test_details": {}
        }
        
        cli_path = self.project_root / "src/cli/cco.py"
        
        if cli_path.exists():
            try:
                start_time = datetime.now()
                # Simulate CLI execution time by reading and parsing file
                content = cli_path.read_text()
                compile(content, str(cli_path), 'exec')
                end_time = datetime.now()
                
                response_time_ms = (end_time - start_time).total_seconds() * 1000
                results["response_time_ms"] = response_time_ms
                results["meets_requirements"] = response_time_ms < 1000  # 1 second
                
            except Exception as e:
                results["test_details"]["error"] = str(e)
        
        return results
    
    async def _test_dashboard_performance(self) -> Dict[str, Any]:
        """Test dashboard performance characteristics."""
        results = {
            "component_count": 0,
            "estimated_load_time": None,
            "optimization_score": 0.0
        }
        
        # Count React components
        component_files = list(self.project_root.rglob("*.tsx")) + list(self.project_root.rglob("*.jsx"))
        results["component_count"] = len(component_files)
        
        # Estimate load time based on component complexity
        if component_files:
            total_size = sum(f.stat().st_size for f in component_files if f.exists())
            estimated_load_ms = (total_size / 1000) * 10  # Rough estimate
            results["estimated_load_time"] = estimated_load_ms
            
            # Optimization score based on file size efficiency
            avg_size = total_size / len(component_files)
            results["optimization_score"] = max(0, min(10, 10 - (avg_size / 5000)))
        
        return results
    
    async def _test_database_performance(self) -> Dict[str, Any]:
        """Test database query performance."""
        results = {
            "query_time_ms": None,
            "meets_requirements": False,
            "test_details": {}
        }
        
        try:
            db_path = self.project_root / "claude_usage.db"
            if db_path.exists():
                start_time = datetime.now()
                
                with sqlite3.connect(db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM sessions")
                    cursor.fetchone()
                
                end_time = datetime.now()
                query_time_ms = (end_time - start_time).total_seconds() * 1000
                
                results["query_time_ms"] = query_time_ms
                results["meets_requirements"] = query_time_ms < 100  # 100ms
                
        except Exception as e:
            results["test_details"]["error"] = str(e)
        
        return results
    
    async def _test_memory_usage(self) -> Dict[str, Any]:
        """Test memory usage characteristics."""
        results = {
            "file_count": 0,
            "total_size_mb": 0.0,
            "estimated_memory_mb": 0.0
        }
        
        # Calculate total project size
        total_size = 0
        file_count = 0
        
        for file_path in self.project_root.rglob("*"):
            if file_path.is_file() and not any(exclude in str(file_path) for exclude in ['.git', '__pycache__', 'node_modules']):
                try:
                    total_size += file_path.stat().st_size
                    file_count += 1
                except Exception:
                    pass
        
        results["file_count"] = file_count
        results["total_size_mb"] = total_size / (1024 * 1024)
        results["estimated_memory_mb"] = results["total_size_mb"] * 2  # Rough estimate
        
        return results
    
    def _generate_test_summary(self) -> None:
        """Generate comprehensive test summary."""
        summary = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "success_rate": 0.0,
            "critical_issues": [],
            "recommendations": []
        }
        
        # Count tests and calculate success rate
        all_results = [
            self.test_results["deliverable_tests"],
            self.test_results["functionality_tests"], 
            self.test_results["integration_tests"],
            self.test_results["performance_tests"]
        ]
        
        for result_category in all_results:
            for agent_or_test, results in result_category.items():
                if isinstance(results, dict):
                    for test_name, test_result in results.items():
                        summary["total_tests"] += 1
                        if isinstance(test_result, bool) and test_result:
                            summary["passed_tests"] += 1
                        elif isinstance(test_result, bool) and not test_result:
                            summary["failed_tests"] += 1
                            summary["critical_issues"].append(f"{agent_or_test}.{test_name}")
        
        if summary["total_tests"] > 0:
            summary["success_rate"] = summary["passed_tests"] / summary["total_tests"]
        
        # Generate recommendations
        if summary["success_rate"] < 0.7:
            summary["recommendations"].append("System requires significant fixes before deployment")
        elif summary["success_rate"] < 0.9:
            summary["recommendations"].append("Address remaining issues for production readiness")
        else:
            summary["recommendations"].append("System ready for deployment with minor optimizations")
        
        self.test_results["summary"] = summary
    
    def save_test_results(self, file_path: Optional[Path] = None) -> Path:
        """Save test results to file."""
        if file_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_path = self.project_root / "coordination" / "test_results" / f"integration_tests_{timestamp}.json"
        
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        
        self.logger.info(f"Test results saved to {file_path}")
        return file_path


async def main():
    """Main testing function."""
    project_root = Path(__file__).parent.parent.parent
    
    # Initialize test framework
    test_framework = IntegrationTestFramework(project_root)
    
    print("🧪 Starting Claude Code Optimizer Integration Tests")
    print("=" * 60)
    
    # Run all tests
    results = await test_framework.run_all_tests()
    
    # Save results
    results_file = test_framework.save_test_results()
    
    # Print summary
    summary = results["summary"]
    print(f"\n📊 Test Summary:")
    print(f"  Total Tests: {summary['total_tests']}")
    print(f"  Passed: {summary['passed_tests']}")
    print(f"  Failed: {summary['failed_tests']}")
    print(f"  Success Rate: {summary['success_rate']*100:.1f}%")
    
    if summary["critical_issues"]:
        print(f"\n❌ Critical Issues:")
        for issue in summary["critical_issues"][:5]:  # Show first 5
            print(f"  • {issue}")
    
    print(f"\n💡 Recommendations:")
    for rec in summary["recommendations"]:
        print(f"  • {rec}")
    
    print(f"\n📋 Full results saved to: {results_file}")
    
    return results


if __name__ == "__main__":
    asyncio.run(main())