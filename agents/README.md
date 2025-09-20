# 🤖 Vibe Coder Agents

Specialized AI agents for Claude Code optimization and dual-path AI strategy.

## Agent Departments

### Infrastructure Agents (`infrastructure/`)
Core system management for quota optimization and provider switching.
- **quota-monitor** - Real-time quota tracking and predictive management
- **provider-router** - Intelligent provider switching and routing
- **session-manager** - 5-hour session optimization and boundary management
- **cost-optimizer** - Model selection and budget optimization
- **emergency-responder** - Crisis management and rapid recovery

### Development Agents (`development/`)
Workflow automation for efficient development processes.
- **project-analyzer** - Codebase complexity assessment and planning
- **task-planner** - Goal decomposition and effort estimation
- **code-reviewer** - Quality assurance and automated review
- **documentation-generator** - Auto-documentation and guides
- **test-coordinator** - Testing workflow automation

### Coordination Agents (`coordination/`)
Advanced orchestration for multi-system coordination.
- **calendar-integrator** - Automated session scheduling
- **team-coordinator** - Multi-developer synchronization
- **performance-analyst** - Efficiency optimization and analytics
- **workflow-optimizer** - Process improvement and automation

### Specialized Agents (`specialized/`)
Domain-specific expertise for advanced use cases.
- **ai-research-assistant** - AI/ML development support
- **deployment-manager** - Production deployment coordination
- **security-auditor** - Security analysis and compliance
- **ux-optimizer** - User experience improvement

## Agent Framework

Each agent follows the standard format:
- **YAML frontmatter** with name, description, examples, color, and tools
- **Detailed system prompt** optimized for the dual-path AI strategy
- **Real-world examples** with context and commentary
- **Integration points** with other agents and systems

## Usage

Agents are automatically triggered by context or can be explicitly invoked. All agents are optimized for the dual-path strategy: Claude Max Plan (primary) → OpenRouter (fallback).
