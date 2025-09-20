#!/usr/bin/env python3
"""
Master Service Coordinator for Claude Code Optimizer
Manages all monitoring services with health checking and auto-recovery
"""
import subprocess
import time
import json
import sqlite3
import os
import signal
import sys
import threading
import datetime
from pathlib import Path

class ServiceCoordinator:
    def __init__(self):
        self.services = {}
        self.running = True
        self.health_check_interval = 30  # seconds
        self.restart_attempts = {}
        self.max_restart_attempts = 3
        self.log_file = "service_coordinator.log"
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        
        try:
            with open(self.log_file, "a") as f:
                f.write(log_entry + "\n")
        except:
            pass
    
    def register_service(self, name, command, description, health_check_func=None, dependencies=None):
        """Register a service to be managed"""
        self.services[name] = {
            'command': command,
            'description': description,
            'process': None,
            'pid': None,
            'status': 'stopped',
            'health_check': health_check_func,
            'dependencies': dependencies or [],
            'last_health_check': None,
            'restart_count': 0,
            'last_restart': None
        }
        self.restart_attempts[name] = 0
        self.log(f"Registered service: {name} - {description}")
    
    def check_database_health(self):
        """Health check for database connectivity"""
        try:
            conn = sqlite3.connect('claude_usage.db', timeout=5)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM sessions")
            conn.close()
            return True
        except:
            return False
    
    def check_live_data_freshness(self):
        """Health check for live data freshness"""
        try:
            if not os.path.exists('.live_session_metrics.json'):
                return False
                
            with open('.live_session_metrics.json', 'r') as f:
                data = json.load(f)
            
            last_update = data.get('current_session', {}).get('last_update')
            if not last_update:
                return False
            
            # Parse timestamp and check if it's recent (within 10 minutes)
            from datetime import datetime
            try:
                last_dt = datetime.fromisoformat(last_update.replace('Z', ''))
                now_dt = datetime.now()
                age_minutes = (now_dt - last_dt).total_seconds() / 60
                return age_minutes < 10  # Fresh if updated within 10 minutes
            except:
                return False
                
        except:
            return False
    
    def check_process_health(self, service_name):
        """Check if a service process is running and healthy"""
        service = self.services.get(service_name)
        if not service or not service['process']:
            return False
        
        try:
            # Check if process is still running
            poll_result = service['process'].poll()
            if poll_result is not None:
                # Process has terminated
                return False
            
            # Process is running, run custom health check if available
            if service['health_check']:
                return service['health_check']()
            
            return True
            
        except:
            return False
    
    def start_service(self, service_name):
        """Start a specific service"""
        service = self.services.get(service_name)
        if not service:
            self.log(f"Unknown service: {service_name}")
            return False
        
        if service['status'] == 'running':
            self.log(f"Service {service_name} already running")
            return True
        
        # Check dependencies first
        for dep in service['dependencies']:
            if not self.is_service_healthy(dep):
                self.log(f"Dependency {dep} not healthy, cannot start {service_name}")
                return False
        
        try:
            self.log(f"Starting service: {service_name}")
            
            # Start the process
            process = subprocess.Popen(
                service['command'],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid  # Create new process group
            )
            
            service['process'] = process
            service['pid'] = process.pid
            service['status'] = 'running'
            service['restart_count'] += 1
            service['last_restart'] = datetime.datetime.now()
            
            self.log(f"Started {service_name} (PID: {process.pid})")
            return True
            
        except Exception as e:
            self.log(f"Failed to start {service_name}: {e}")
            service['status'] = 'failed'
            return False
    
    def stop_service(self, service_name):
        """Stop a specific service"""
        service = self.services.get(service_name)
        if not service:
            return False
        
        if service['status'] != 'running' or not service['process']:
            return True
        
        try:
            self.log(f"Stopping service: {service_name}")
            
            # Try graceful shutdown first
            service['process'].terminate()
            
            # Wait up to 10 seconds for graceful shutdown
            try:
                service['process'].wait(timeout=10)
            except subprocess.TimeoutExpired:
                # Force kill if graceful shutdown failed
                os.killpg(os.getpgid(service['process'].pid), signal.SIGKILL)
            
            service['process'] = None
            service['pid'] = None
            service['status'] = 'stopped'
            
            self.log(f"Stopped {service_name}")
            return True
            
        except Exception as e:
            self.log(f"Error stopping {service_name}: {e}")
            return False
    
    def is_service_healthy(self, service_name):
        """Check if a service is healthy"""
        service = self.services.get(service_name)
        if not service:
            return False
        
        if service['status'] != 'running':
            return False
        
        # Check process health
        if not self.check_process_health(service_name):
            service['status'] = 'unhealthy'
            return False
        
        service['last_health_check'] = datetime.datetime.now()
        return True
    
    def restart_service(self, service_name):
        """Restart a service"""
        attempts = self.restart_attempts.get(service_name, 0)
        
        if attempts >= self.max_restart_attempts:
            self.log(f"Max restart attempts reached for {service_name}, giving up")
            return False
        
        self.log(f"Restarting {service_name} (attempt {attempts + 1}/{self.max_restart_attempts})")
        
        self.stop_service(service_name)
        time.sleep(2)  # Brief pause
        
        success = self.start_service(service_name)
        
        if success:
            self.restart_attempts[service_name] = 0  # Reset on successful restart
        else:
            self.restart_attempts[service_name] += 1
        
        return success
    
    def health_check_loop(self):
        """Main health checking loop"""
        while self.running:
            try:
                self.log("Running health checks...")
                
                for service_name in self.services:
                    if not self.is_service_healthy(service_name):
                        service = self.services[service_name]
                        
                        if service['status'] == 'running':
                            self.log(f"Service {service_name} is unhealthy, restarting...")
                            self.restart_service(service_name)
                        elif service['status'] in ['stopped', 'failed']:
                            self.log(f"Service {service_name} is {service['status']}, attempting to start...")
                            self.start_service(service_name)
                
                # Sleep until next health check
                time.sleep(self.health_check_interval)
                
            except Exception as e:
                self.log(f"Error in health check loop: {e}")
                time.sleep(5)
    
    def start_all_services(self):
        """Start all registered services in dependency order"""
        self.log("Starting all services...")
        
        # Simple dependency resolution (topological sort would be better for complex deps)
        started = set()
        max_iterations = len(self.services) * 2
        
        for _ in range(max_iterations):
            made_progress = False
            
            for service_name, service in self.services.items():
                if service_name in started:
                    continue
                
                # Check if all dependencies are started
                deps_ready = all(dep in started for dep in service['dependencies'])
                
                if deps_ready:
                    if self.start_service(service_name):
                        started.add(service_name)
                        made_progress = True
            
            if not made_progress:
                break
        
        self.log(f"Started {len(started)}/{len(self.services)} services")
    
    def stop_all_services(self):
        """Stop all services"""
        self.log("Stopping all services...")
        
        for service_name in self.services:
            self.stop_service(service_name)
    
    def get_status(self):
        """Get status of all services"""
        status = {
            'timestamp': datetime.datetime.now().isoformat(),
            'services': {},
            'system_health': {
                'database': self.check_database_health(),
                'live_data': self.check_live_data_freshness()
            }
        }
        
        for name, service in self.services.items():
            status['services'][name] = {
                'status': service['status'],
                'pid': service['pid'],
                'restart_count': service['restart_count'],
                'last_restart': service['last_restart'].isoformat() if service['last_restart'] else None,
                'last_health_check': service['last_health_check'].isoformat() if service['last_health_check'] else None
            }
        
        return status
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.log(f"Received signal {signum}, shutting down...")
        self.running = False
        self.stop_all_services()
        sys.exit(0)
    
    def run(self):
        """Main coordinator loop"""
        # Register signal handlers
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)
        
        # Register services
        self.register_service(
            'session_monitor',
            'python3 claude-code-session-monitor.py',
            'Live session monitoring and data collection',
            health_check_func=self.check_live_data_freshness
        )
        
        self.register_service(
            'database',
            'echo "Database service (always running)"',
            'SQLite database connectivity',
            health_check_func=self.check_database_health
        )
        
        # Start all services
        self.start_all_services()
        
        # Start health checking in background thread
        health_thread = threading.Thread(target=self.health_check_loop, daemon=True)
        health_thread.start()
        
        self.log("Service coordinator started, press Ctrl+C to stop")
        
        try:
            # Main loop - just keep the coordinator running
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.signal_handler(signal.SIGINT, None)

def main():
    """Main entry point"""
    coordinator = ServiceCoordinator()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'status':
            # Quick status check
            coordinator.register_service('database', 'echo "test"', 'Database', coordinator.check_database_health)
            status = coordinator.get_status()
            
            print("🔍 Service Coordinator Status")
            print("=" * 40)
            print(f"Timestamp: {status['timestamp']}")
            print()
            print("System Health:")
            print(f"  Database: {'✅' if status['system_health']['database'] else '❌'}")
            print(f"  Live Data: {'✅' if status['system_health']['live_data'] else '❌'}")
            print()
            
            return
        
        elif command == 'stop':
            # Stop all services
            print("Stopping all services...")
            coordinator.stop_all_services()
            return
    
    # Default: run the coordinator
    coordinator.run()

if __name__ == "__main__":
    main()