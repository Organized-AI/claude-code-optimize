#!/usr/bin/env python3
"""
Enhanced Backend Startup Script
Starts the enhanced dashboard server with all new capabilities
Maintains 100% backward compatibility with existing systems
"""

import sys
import os
import asyncio
from pathlib import Path

# Add src/api directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent / "src" / "api"))

from enhanced_dashboard_server import EnhancedDashboardServer

async def main():
    """Start the enhanced backend server"""
    print("🚀 Starting Enhanced Claude Code Optimizer Backend")
    print("===================================================")
    print("✅ ccusage-compatible reporting API")
    print("✅ Advanced analytics and insights")
    print("✅ Data export capabilities (CSV, JSON)")
    print("✅ Agent coordination integration")
    print("✅ Real-time WebSocket dashboard")
    print("✅ Backward compatibility maintained")
    print("===================================================")
    
    # Initialize enhanced server
    server = EnhancedDashboardServer(port=3001)
    
    try:
        print("\n🔗 API Endpoints Available:")
        print("  📊 Reports: http://localhost:3001/api/reports/*")
        print("  📈 Analytics: http://localhost:3001/api/analytics/*")
        print("  📤 Exports: http://localhost:3001/api/exports/*")
        print("  🤖 Agents: http://localhost:3001/api/agents/*")
        print("  🔌 WebSocket: ws://localhost:3001/ws")
        print("  ⚡ Status: http://localhost:3001/api/status")
        print("\n🌐 Dashboard: http://localhost:3001")
        print("\n✨ Starting server...\n")
        
        await server.start()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down enhanced backend server...")
        print("👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
