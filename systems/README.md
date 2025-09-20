# ⚙️ Vibe Coder Systems

Core infrastructure systems for Claude Code optimization and the dual-path AI strategy.

## System Components

### Menu Bar App (`menubar-app/`)
Native macOS application for real-time quota monitoring and session management.
- Real-time quota display (480h Sonnet, 40h Opus weekly)
- 5-hour session timer with intelligent alerts
- Cross-platform usage aggregation (Desktop + Code + Web)
- Emergency provider switching controls

### Multi-Config System (`multi-config/`)
Seamless provider switching between Claude Max Plan and OpenRouter stacks.
- One-click provider switching with context preservation
- Intelligent routing based on quota and cost optimization
- Emergency fallback protocols
- Configuration management across all tools

### Usage Tracker (`usage-tracker/`)
Cross-platform token usage monitoring and analytics.
- Real-time token consumption tracking
- Cross-platform data aggregation
- Predictive analytics and quota forecasting
- Cost optimization recommendations

### Provider Integrations (`provider-integrations/`)
API integrations and routing logic for all AI providers.
- Anthropic API integration (Claude Desktop, Claude Code)
- OpenRouter API integration (Goose Desktop, Claude Code Router)
- Provider health monitoring and failover
- Cost tracking and optimization

## Architecture Philosophy

All systems follow the dual-path strategy:
- **Primary Path**: Claude Desktop + Claude Code (Max Plan)
- **Fallback Path**: Goose Desktop + Claude Code Router (OpenRouter)

The goal is seamless switching with zero workflow disruption, intelligent cost optimization, and never losing access to AI assistance.
