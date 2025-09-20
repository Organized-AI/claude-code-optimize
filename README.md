# Claude Code Optimizer: Professional AI Development Suite

## 🎯 Mission
Transform Claude users into **Vibe Coders** - developers who never hit AI rate limits, always have backup providers ready, and leverage autonomous sub-agents to maximize productivity while minimizing costs.

**Core Philosophy**: *"The best developers don't just code fast—they code strategically."*

## 🏗️ Project Structure

### 🤖 [`agents/`](./agents/) - Specialized AI Agents
Autonomous agents for intelligent development coordination:
- **Infrastructure**: Core system management (quota, routing, sessions, cost, emergency)
- **Development**: Workflow automation (planning, analysis, review, testing, docs)
- **Coordination**: Advanced orchestration (calendar, team, performance, workflow)
- **Specialized**: Domain expertise (AI/ML, security, deployment, UX)

### ⚙️ [`systems/`](./systems/) - Core Infrastructure
Foundational systems for the dual-path AI strategy:
- **Menu Bar App**: Real-time quota monitoring and session management
- **Multi-Config**: Seamless provider switching (Claude ↔ OpenRouter)
- **Usage Tracker**: Cross-platform token monitoring and analytics
- **Provider Integrations**: API connections and intelligent routing
- **[Unified Monitor](./UNIFIED_MONITOR_SETUP.md)**: Real-time tracking of both Claude Code & Desktop usage

### 📚 [`docs/`](./docs/) - Comprehensive Documentation
Complete guides and technical documentation:
- **Getting Started**: Installation and setup guides
- **User Guides**: Best practices and optimization strategies
- **Technical**: Architecture and implementation details
- **Integration**: External tool and service connections
- **Community**: Contributing guidelines and success stories

### 🧪 [`development/`](./development/) - Source Code & Tools
Development environment and implementation:
- **Source Code**: Agent implementations and system code
- **Tests**: Comprehensive testing suites
- **Tools**: Development utilities and generators
- **Environments**: Configuration for different deployment stages

### 📦 [`deployments/`](./deployments/) - Configuration & Distribution
Ready-to-deploy configurations and installers:
- **Configurations**: OpenRouter, Goose Desktop, Claude Code Router setups
- **Installers**: macOS, Homebrew, and GitHub releases
- **Docker**: Containerization for complex deployments
- **Automation**: CI/CD and deployment monitoring

### 🎯 [`examples/`](./examples/) - Practical Workflows
Real-world usage scenarios and configuration examples:
- **Workflows**: Complete development workflow examples
- **Configurations**: Setup examples for different use cases
- **Use Cases**: Industry-specific and role-specific patterns

## 🎪 The Dual-Path Strategy

Never lose access to AI assistance through intelligent provider switching:

### **Primary Path (Claude Max Plan)**
- **Chat Interface**: Claude Desktop → Anthropic Direct (480h Sonnet, 40h Opus weekly)
- **Agentic Coding**: Claude Code → Anthropic Direct (5-hour sessions)

### **Fallback Path (OpenRouter)**
- **Chat Interface**: Goose Desktop → OpenRouter API (unlimited, pay-per-use)
- **Agentic Coding**: Claude Code Router → OpenRouter API (same interface, different backend)

### **Intelligent Switching**
- **Automatic triggers**: Quota thresholds, cost limits, API failures
- **Context preservation**: Seamless transitions with zero information loss
- **Cost optimization**: Always use the most efficient model for each task
- **Emergency protocols**: Instant failover during critical situations

## 📊 Real-time Monitoring

### **Unified Claude Monitoring System** ✨ NEW
Track both Claude Code (CLI) and Claude Desktop (App) usage in real-time:

```bash
# Quick start monitoring
cd "Claude Code Optimizer"
./monitors/unified-claude-monitor.sh
```

**Features:**
- 📝 Full JSONL message tracking from Claude Code
- 🖥️ Activity detection for Claude Desktop
- ⚙️ Process monitoring for both applications
- 📈 Real-time dashboard integration
- 📁 Complete setup guide: [UNIFIED_MONITOR_SETUP.md](./UNIFIED_MONITOR_SETUP.md)

## 🚀 Quick Start

### 1. **Installation**
```bash
# Clone the project
git clone https://github.com/organized-ai/claude-code-optimizer.git
cd claude-code-optimizer

# Set up environment
./deployments/configurations/setup.sh
```

### 2. **Configuration**
```bash
# Add your API keys
cp deployments/configurations/.env.example .env
# Edit .env with: ANTHROPIC_API_KEY, OPENROUTER_API_KEY

# Configure providers
./deployments/configurations/setup.sh --configure
```

### 3. **Launch Systems**
```bash
# Start menu bar app (macOS)
open systems/menubar-app/build/Claude-Quota-Tracker.app

# Verify dual-path setup
./deployments/configurations/verify-setup.sh
```

### 4. **First Development Session**
Follow the [New Project Setup Guide](./examples/workflows/new-project-setup.md) for a complete walkthrough.

## 🤖 Agent System Overview

The agent system provides autonomous coordination for all aspects of AI-optimized development:

### **Core Infrastructure Agents**
- **[quota-monitor](./agents/infrastructure/quota-monitor.md)**: Real-time quota tracking and predictive management
- **[emergency-responder](./agents/coordination/emergency-responder.md)**: Crisis management and rapid recovery
- **[task-planner](./agents/development/task-planner.md)**: Intelligent project decomposition and optimization

### **Intelligent Coordination**
Agents work together to provide:
- 🔄 **Seamless provider switching** with context preservation
- 📊 **Predictive quota management** to prevent surprises
- 💰 **Cost optimization** across all AI providers
- 🚨 **Emergency response** for critical situations
- 📅 **Session planning** optimized for 5-hour limits

## 📊 Success Metrics

### **User Experience Goals**
- ✅ **Zero quota surprises**: 100% proactive alert success rate
- ✅ **Seamless switching**: <30 seconds provider transition time
- ✅ **Cost optimization**: 50% reduction in overflow API costs
- ✅ **Productivity gain**: 3x faster development with agent assistance

### **Technical Performance**
- ✅ **Real-time accuracy**: 99%+ quota tracking precision
- ✅ **System reliability**: 99.9% uptime across all components
- ✅ **Context preservation**: 99%+ accuracy in provider switches
- ✅ **Resource efficiency**: <5% system overhead

## 🛠️ Technical Architecture

### **Native macOS Integration**
- **Menu Bar App**: Swift/SwiftUI with real-time system integration
- **System Hooks**: Direct Claude Desktop and Claude Code monitoring
- **Local Database**: Encrypted SQLite for usage history and patterns

### **Multi-Provider API Management**
- **Anthropic Integration**: Direct Max Plan API with quota tracking
- **OpenRouter Integration**: 50+ model access with cost optimization
- **Intelligent Routing**: AI-powered provider selection and failover
- **Context Bridges**: Seamless state preservation across switches

### **Agent Coordination Framework**
- **Message Bus**: Real-time inter-agent communication
- **State Synchronization**: Unified system state across all agents
- **Task Orchestration**: Intelligent workload distribution
- **Performance Monitoring**: Real-time agent efficiency tracking

## 🤝 Contributing

### **Getting Started**
1. Review the [Contributing Guide](./docs/community/contributing.md)
2. Check the [Development Setup](./development/README.md)
3. Explore the [Agent Framework](./agents/README.md)
4. Join the [Vibe Coders Community](https://discord.gg/vibe-coders)

### **Priority Development Areas**
- 🔥 **Menu Bar App**: Native macOS development (Swift/SwiftUI)
- 🔥 **Agent System**: Python coordination and AI integration
- 🔥 **Provider Switching**: Seamless context preservation
- 🔥 **Documentation**: User guides and tutorials

## 🔮 Future Vision

### **Short-term (3 months)**
- ✅ Complete menu bar app with real-time monitoring
- ✅ Seamless dual-path provider switching
- ✅ Core agent coordination system
- ✅ Community adoption among Claude power users

### **Medium-term (6 months)**
- 🎯 Advanced predictive quota management
- 🎯 Team coordination and organization features
- 🎯 Integration with popular development tools
- 🎯 Cross-platform support (Windows, Linux)

### **Long-term (1 year)**
- 🚀 Fully autonomous AI development teams
- 🚀 Enterprise organization management
- 🚀 AI development workflow standardization
- 🚀 Industry-wide adoption and ecosystem

## 📞 Support & Community

- 📚 **Documentation**: Comprehensive guides in [`docs/`](./docs/)
- 💬 **Community**: [Vibe Coders Discord](https://discord.gg/vibe-coders)
- 🐛 **Issues**: [GitHub Issues](https://github.com/organized-ai/claude-code-optimizer/issues)
- 💡 **Discussions**: [GitHub Discussions](https://github.com/organized-ai/claude-code-optimizer/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Anthropic** - For Claude's exceptional development capabilities
- **OpenRouter** - For providing access to multiple AI providers  
- **Goose Desktop** - For open-source AI desktop interface
- **Contains Studio** - For inspiring professional agent organization
- **Vibe Coder Community** - For feedback and real-world testing

---

*Built with ❤️ by the Organized AI team and the Vibe Coder community*

**Remember**: With weekly rate limits, precision beats speed. This toolkit ensures you maximize every token and never hit a wall. 🚀
