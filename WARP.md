# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Claude Code Optimizer is a professional AI development suite designed to transform Claude users into "Vibe Coders" - developers who never hit AI rate limits through intelligent provider switching, real-time monitoring, and autonomous agent coordination. The project implements a dual-path strategy with seamless fallback between Anthropic's direct API and OpenRouter.

## Development Commands

### Dashboard Server (Express.js)
```bash
# Start the dashboard server
cd dashboard-server
npm install
npm start                    # Production mode
npm run dev                  # Development mode with nodemon

# The server runs on localhost:3001 by default
```

### Vercel Dashboard (Next.js)
```bash
# Start the Next.js dashboard
cd claude-monitor-vercel
npm install
npm run dev                  # Development server
npm run build               # Production build
npm run start               # Production server
npm run lint                # ESLint checking

# Deploy to Vercel
./deploy.sh
```

### Python Monitoring Services
```bash
# Start the unified Claude monitor
python3 continuous_monitor.py

# Start session coordination
python3 SessionCoordinator.py

# Run Claude Code session monitoring
python3 claude-code-session-monitor.py

# Simple tracking
python3 cco_simple.py
```

### Shell Scripts and System Setup
```bash
# Complete system setup
./complete-setup.sh

# Check system status
./check-status.sh

# Dashboard status check
./check-dashboard-status.sh

# Audio diagnostics
./audio-diagnostic.sh
```

### Agent System
```bash
# Individual agents can be run directly
python3 agents/dashboard-agent.py
python3 agents/detection-agent.py
python3 agents/timer-agent.py
python3 agents/token-agent.py
python3 agents/validation-agent.py
```

## Architecture Overview

### Core Components

**Dual-Path Provider Strategy**: The system implements seamless switching between Anthropic's direct API (primary) and OpenRouter (fallback) to prevent rate limit interruptions.

**Real-time Monitoring System**: Unified tracking of both Claude Code (CLI) and Claude Desktop (App) usage through process monitoring, JSONL message tracking, and activity detection.

**Agent Coordination Framework**: Autonomous agents handle quota monitoring, emergency response, task planning, and system coordination with inter-agent communication via message bus.

**Multi-Platform Dashboard**: Express.js backend (localhost:3001) with Next.js frontend deployable to Vercel, featuring WebSocket real-time updates and Netlify sync capabilities.

### Data Flow Architecture

```
Claude Desktop/Code → Process Monitor → Session Tracker (localhost:3001)
                                           ↓
                    WebSocket Updates → Dashboard Frontend
                                           ↓
                    Netlify Sync (30s) → Live Dashboard (Vercel/Netlify)
```

### Key Services

- **Session Tracker**: Core API at localhost:3001 with endpoints for `/api/sessions/active`, `/api/analytics/current`, `/api/five-hour-blocks`
- **Sync Service**: Automated bidirectional sync between localhost and live dashboard every 30 seconds
- **WebSocket Server**: Real-time updates for active sessions and analytics
- **Agent Orchestra**: Coordinated autonomous agents for system management

## Configuration

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `NETLIFY_API_SECRET`: Secure API key for Netlify functions
- `SUPABASE_URL` & `SUPABASE_ANON_KEY`: Optional database configuration
- `NETLIFY_FUNCTION_URL`: Live dashboard sync endpoint
- `SYNC_INTERVAL`: Data sync frequency (default: 30 seconds)

### Database
- Primary: SQLite local storage with encrypted session history
- Optional: Supabase integration for cloud persistence
- Fallback: In-memory cache for resilience

## Byterover MCP Integration

This project integrates with Byterover MCP tools for enhanced development workflow:

### Critical Workflow Rules
- **ALWAYS USE** `byterover-retrieve-knowledge` for each task to gather necessary context
- **IMMEDIATELY CALL** `byterover-save-implementation-plan` when a plan is approved
- **MUST USE** `byterover-store-knowledge` to save critical insights after implementation
- Include phrases like "According to Byterover memory layer" to reference MCP sources

### Key MCP Tools
- `byterover-check-handbook-existence` & `byterover-create-handbook`: Documentation management
- `byterover-retrieve-active-plans` & `byterover-update-plan-progress`: Plan management
- `byterover-search-modules` & `byterover-update-modules`: Module knowledge tracking
- `byterover-reflect-context` & `byterover-assess-context`: Context validation

## Testing and Monitoring

### Health Checks
```bash
# Test integration
python3 test-integration.py

# Analyze available data
python3 analyze_available_data.py

# Check dashboard status
./check-dashboard-status.sh
```

### Monitoring Endpoints
- `GET /api/status`: Server health and status
- `GET /api/sessions/active`: Currently active sessions
- `GET /api/analytics/current`: Real-time analytics
- `WebSocket /ws`: Live session updates

## Deployment

### Netlify Deployment
1. Configure environment variables in Netlify dashboard
2. Update function URLs in sync services
3. Deploy using `netlify deploy --prod`

### Local Development
1. Start dashboard server: `npm start` (dashboard-server)
2. Start sync service: `python3 session_tracker/netlify_sync.py`
3. Optional: Start Next.js dashboard for UI development

## Session Management

The system tracks Claude usage in 5-hour blocks to optimize the rate limit management:
- **Active Session Tracking**: Real-time monitoring of Claude Code and Desktop sessions
- **Token Estimation**: Intelligent usage prediction and quota management
- **Automatic Switching**: Seamless provider fallback when approaching limits
- **Session Persistence**: Complete session history with metadata and analytics

## Agent Specializations

Located in `agents/` directory with specialized roles:
- **Infrastructure**: Quota monitoring, emergency response, cost optimization
- **Development**: Task planning, code analysis, testing coordination
- **Coordination**: Calendar integration, team management, performance tracking
- **Specialized**: AI/ML expertise, security, deployment automation

Each agent follows the MCP integration patterns and contributes to the unified monitoring system.

<citations>
<document>
    <document_type>WEB_PAGE</document_type>
    <document_id>https://github.com/Organized-AI/claude-code-optimize</document_id>
</document>
</citations>
