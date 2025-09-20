#!/bin/bash

# Dashboard Status Checker
# Check both port 3001 and 5173 status

echo "🔍 Claude Code Optimizer Dashboard Status"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Port 3001 (Backend)
echo -e "\n📊 ${BLUE}Backend Server (Port 3001):${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "   Status: ${GREEN}✅ Running${NC}"
    echo -e "   URL: ${BLUE}http://localhost:3001${NC}"
    
    # Test API endpoints
    echo -e "\n   🔗 Testing API endpoints:"
    
    # Health check
    health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
    if [ "$health_status" = "200" ]; then
        echo -e "   • /health: ${GREEN}✅ OK (200)${NC}"
    else
        echo -e "   • /health: ${RED}❌ Error ($health_status)${NC}"
    fi
    
    # Stats endpoint
    stats_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/stats)
    if [ "$stats_status" = "200" ]; then
        echo -e "   • /api/stats: ${GREEN}✅ OK (200)${NC}"
    else
        echo -e "   • /api/stats: ${RED}❌ Error ($stats_status)${NC}"
    fi
    
    # Claude sessions
    sessions_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/claude-sessions)
    if [ "$sessions_status" = "200" ]; then
        echo -e "   • /api/claude-sessions: ${GREEN}✅ OK (200)${NC}"
    else
        echo -e "   • /api/claude-sessions: ${RED}❌ Error ($sessions_status)${NC}"
    fi
    
else
    echo -e "   Status: ${RED}❌ Not responding${NC}"
    echo -e "   URL: ${RED}http://localhost:3001 (offline)${NC}"
fi

# Check Port 5173 (Frontend)
echo -e "\n🎨 ${BLUE}Frontend Dashboard (Port 5173):${NC}"
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "   Status: ${GREEN}✅ Running${NC}"
    echo -e "   URL: ${BLUE}http://localhost:5173${NC}"
    
    # Test if it's responding
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ --max-time 5)
    if [ "$frontend_status" = "200" ]; then
        echo -e "   Response: ${GREEN}✅ OK (200)${NC}"
    else
        echo -e "   Response: ${YELLOW}⚠️  Status: $frontend_status${NC}"
    fi
else
    echo -e "   Status: ${RED}❌ Not running${NC}"
    echo -e "   URL: ${RED}http://localhost:5173 (offline)${NC}"
fi

# Check processes
echo -e "\n⚙️  ${BLUE}Process Information:${NC}"
backend_pid=$(ps aux | grep "server.js" | grep -v grep | awk '{print $2}' | head -1)
frontend_pid=$(ps aux | grep "vite" | grep -v grep | awk '{print $2}' | head -1)

if [ -n "$backend_pid" ]; then
    echo -e "   Backend PID: ${GREEN}$backend_pid${NC}"
else
    echo -e "   Backend PID: ${RED}Not found${NC}"
fi

if [ -n "$frontend_pid" ]; then
    echo -e "   Frontend PID: ${GREEN}$frontend_pid${NC}"
else
    echo -e "   Frontend PID: ${RED}Not found${NC}"
fi

# Check logs
echo -e "\n📝 ${BLUE}Recent Logs:${NC}"
log_dir="/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/logs"

if [ -f "$log_dir/dashboard-server.log" ]; then
    error_count=$(tail -20 "$log_dir/dashboard-server.log" | grep -c "Error\|SyntaxError")
    if [ "$error_count" -gt 0 ]; then
        echo -e "   Backend: ${YELLOW}⚠️  $error_count recent errors${NC}"
    else
        echo -e "   Backend: ${GREEN}✅ Clean${NC}"
    fi
else
    echo -e "   Backend: ${YELLOW}⚠️  No log file${NC}"
fi

if [ -f "$log_dir/frontend.log" ]; then
    if grep -q "ready" "$log_dir/frontend.log"; then
        echo -e "   Frontend: ${GREEN}✅ Ready${NC}"
    else
        echo -e "   Frontend: ${YELLOW}⚠️  Starting${NC}"
    fi
else
    echo -e "   Frontend: ${YELLOW}⚠️  No log file${NC}"
fi

# Summary
echo -e "\n🎯 ${BLUE}Quick Access:${NC}"
echo -e "   🌐 Frontend Dashboard: ${BLUE}http://localhost:5173${NC}"
echo -e "   📊 Backend API: ${BLUE}http://localhost:3001${NC}"
echo -e "   🔍 Health Check: ${BLUE}http://localhost:3001/health${NC}"
echo -e "   📈 Session Data: ${BLUE}http://localhost:3001/api/claude-sessions${NC}"

echo -e "\n🛠️  ${BLUE}Management Commands:${NC}"
echo -e "   Start services: ${YELLOW}./start-services.sh${NC}"
echo -e "   Stop backend: ${YELLOW}kill $backend_pid${NC}"
echo -e "   Stop frontend: ${YELLOW}kill $frontend_pid${NC}"
echo -e "   View logs: ${YELLOW}tail -f logs/dashboard-server.log${NC}"

echo -e "\n=========================================="
