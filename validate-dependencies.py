#!/usr/bin/env python3
"""
Claude Code Optimizer Dependency Validator
Quick validation script demonstrating dependency-checker agent functionality
"""

import sys
import subprocess
import importlib
import os
import json
from pathlib import Path

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_status(item, status, details=""):
    status_symbol = "✅" if status else "❌"
    print(f"{status_symbol} {item}")
    if details:
        print(f"   {details}")

def check_system_requirements():
    print_header("SYSTEM REQUIREMENTS")
    
    # Python version
    python_ok = sys.version_info >= (3, 8)
    print_status(f"Python {sys.version.split()[0]}", python_ok, 
                f"Minimum Python 3.8 required" if not python_ok else "")
    
    # Node.js
    try:
        node_version = subprocess.check_output(['node', '--version'], text=True).strip()
        node_ok = True
        print_status(f"Node.js {node_version}", node_ok)
    except (subprocess.CalledProcessError, FileNotFoundError):
        node_ok = False
        print_status("Node.js", node_ok, "Node.js not found - required for dashboard")
    
    # npm
    try:
        npm_version = subprocess.check_output(['npm', '--version'], text=True).strip()
        npm_ok = True
        print_status(f"npm {npm_version}", npm_ok)
    except (subprocess.CalledProcessError, FileNotFoundError):
        npm_ok = False
        print_status("npm", npm_ok, "npm not found - required for dashboard")
    
    return python_ok, node_ok, npm_ok

def check_python_dependencies():
    print_header("PYTHON DEPENDENCIES")
    
    required_packages = {
        'fastapi': 'Web framework for dashboard server',
        'uvicorn': 'ASGI server (needs [standard] for WebSocket)',
        'psutil': 'Process monitoring for Claude detection', 
        'websockets': 'WebSocket communication',
        'requests': 'HTTP client for API calls',
        'watchdog': 'File system monitoring',
        'sqlite3': 'Database support (built-in)',
        'pathlib': 'Path handling (built-in)',
        'json': 'JSON processing (built-in)',
    }
    
    missing_packages = []
    
    for package, description in required_packages.items():
        try:
            importlib.import_module(package)
            print_status(package, True, description)
        except ImportError:
            print_status(package, False, f"MISSING: {description}")
            missing_packages.append(package)
    
    return missing_packages

def check_node_dependencies():
    print_header("NODE.JS DEPENDENCIES")
    
    dashboard_path = Path("moonlock-dashboard")
    if not dashboard_path.exists():
        print_status("moonlock-dashboard directory", False, "Dashboard directory not found")
        return False
    
    package_json = dashboard_path / "package.json"
    if not package_json.exists():
        print_status("package.json", False, "package.json not found in dashboard")
        return False
    
    print_status("moonlock-dashboard directory", True)
    print_status("package.json", True)
    
    # Check if node_modules exists
    node_modules = dashboard_path / "node_modules"
    if node_modules.exists():
        print_status("node_modules", True, "Dependencies appear to be installed")
    else:
        print_status("node_modules", False, "Dependencies not installed - run 'npm install'")
    
    return node_modules.exists()

def check_service_dependencies():
    print_header("SERVICE DEPENDENCIES")
    
    # Check WebSocket port
    try:
        import subprocess
        result = subprocess.run(['lsof', '-i', ':3001'], capture_output=True, text=True)
        if result.returncode == 0:
            print_status("Port 3001", True, "Port in use (dashboard server running)")
        else:
            print_status("Port 3001", True, "Port available for WebSocket server")
    except Exception:
        print_status("Port 3001", False, "Cannot check port availability")
    
    # Check Claude Desktop processes
    try:
        import psutil
        claude_processes = []
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if 'claude' in proc.info['name'].lower():
                    claude_processes.append(proc.info['name'])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        if claude_processes:
            print_status("Claude Desktop", True, f"Found {len(claude_processes)} Claude processes")
        else:
            print_status("Claude Desktop", False, "No Claude processes detected")
    except ImportError:
        print_status("Claude Desktop", False, "Cannot check - psutil not available")
    
    # Check conversation file access
    conv_path = Path.home() / "Library/Application Support/Claude/conversations"
    if conv_path.exists():
        print_status("Claude conversations", True, "Conversation directory accessible")
    else:
        print_status("Claude conversations", False, "Conversation directory not found")

def generate_installation_plan(missing_packages):
    print_header("INSTALLATION PLAN")
    
    if not missing_packages:
        print("✅ All Python dependencies are satisfied!")
        return
    
    print("📦 Missing Python packages detected. Installation commands:")
    print()
    
    for package in missing_packages:
        if package == 'uvicorn':
            print(f"pip3 install 'uvicorn[standard]'  # WebSocket support")
        else:
            print(f"pip3 install {package}")
    
    print()
    print("🔧 Complete installation command:")
    install_cmd = "pip3 install " + " ".join(
        f"'uvicorn[standard]'" if pkg == 'uvicorn' else pkg 
        for pkg in missing_packages
    )
    print(install_cmd)

def main():
    print("🔍 Claude Code Optimizer Dependency Validation")
    print("📋 Checking all system requirements and dependencies...")
    
    # System requirements
    python_ok, node_ok, npm_ok = check_system_requirements()
    
    # Python dependencies
    missing_packages = check_python_dependencies()
    
    # Node.js dependencies
    node_deps_ok = check_node_dependencies()
    
    # Service dependencies
    check_service_dependencies()
    
    # Installation plan
    generate_installation_plan(missing_packages)
    
    # Summary
    print_header("DEPLOYMENT READINESS SUMMARY")
    
    total_checks = 5
    passed_checks = sum([
        python_ok,
        node_ok and npm_ok,
        len(missing_packages) == 0,
        node_deps_ok,
        True  # Service checks are informational
    ])
    
    readiness_pct = (passed_checks / total_checks) * 100
    
    if readiness_pct >= 80:
        print(f"🎯 Deployment Readiness: {readiness_pct:.0f}% - READY FOR ENHANCEMENT")
    elif readiness_pct >= 60:
        print(f"⚠️  Deployment Readiness: {readiness_pct:.0f}% - MINOR ISSUES TO RESOLVE")
    else:
        print(f"❌ Deployment Readiness: {readiness_pct:.0f}% - SIGNIFICANT DEPENDENCIES MISSING")
    
    print("\n🚀 Next Steps:")
    if missing_packages:
        print("1. Install missing Python packages using commands above")
    if not node_deps_ok:
        print("2. Run 'cd moonlock-dashboard && npm install'")
    if readiness_pct >= 80:
        print("3. Execute Claude Code Optimizer refactor prompt")
    
    print("\n📖 For detailed dependency management, use:")
    print("claude --dangerously-skip-permissions --agent dependency-checker")

if __name__ == "__main__":
    main()
