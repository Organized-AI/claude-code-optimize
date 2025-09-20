# Moonlock CLI

A powerful command-line interface for Claude Code optimization and token tracking.

## Features

- 📊 **Token Tracking**: Monitor your Claude Code usage across sessions
- 🕒 **Session Management**: Start, stop, and track development sessions
- 📈 **Usage Analytics**: Detailed breakdowns of token consumption
- ⚠️ **Quota Monitoring**: Real-time quota status and warnings
- ⚙️ **Configuration**: Customizable settings and preferences
- 🔄 **API Integration**: Sync data with remote services
- 📱 **Cross-Platform**: Works on macOS, Linux, and Windows

## Quick Start

### Installation

**Option 1: One-line installer (Recommended)**
```bash
curl -fsSL https://raw.githubusercontent.com/moonlock/cli/main/install.sh | bash
```

**Option 2: Manual installation**
1. Download the binary for your platform from [releases](https://github.com/moonlock/cli/releases)
2. Make it executable: `chmod +x moonlock`
3. Move to PATH: `mv moonlock /usr/local/bin/`

**Option 3: npm (if you have Node.js)**
```bash
npm install -g moonlock-cli
```

### First Steps

```bash
# Check installation
moonlock --version

# View help
moonlock --help

# Check current status
moonlock status

# Start a new session
moonlock session --start

# View token usage
moonlock tokens --current
```

## Commands

### Status
```bash
moonlock status              # Show overall status
```

### Session Management
```bash
moonlock session --start    # Start new session
moonlock session --end      # End current session  
moonlock session --list     # List recent sessions
moonlock session            # Interactive session menu
```

### Token Tracking
```bash
moonlock tokens --current   # Show current usage
moonlock tokens --history   # Show usage history
moonlock tokens --reset     # Reset token counters
moonlock tokens             # Interactive token menu
```

### Configuration
```bash
moonlock config --list                    # Show all settings
moonlock config --get tracking.enabled    # Get specific setting
moonlock config --set tracking.enabled=true  # Set specific setting
moonlock config                           # Interactive config menu
```

## Configuration

Moonlock CLI stores its configuration in `~/.moonlock/config.json`. Key settings include:

```json
{
  "tracking": {
    "enabled": true,
    "autoStart": false,
    "saveHistory": true,
    "maxHistoryItems": 100
  },
  "notifications": {
    "quotaWarnings": true,
    "sessionReminders": false,
    "dailySummary": false
  },
  "display": {
    "theme": "auto",
    "verbose": false,
    "showProgress": true
  }
}
```

## Data Storage

- **Configuration**: `~/.moonlock/config.json`
- **Sessions**: `~/.moonlock/sessions/`
- **Token Usage**: `~/.moonlock/tokens/`
- **Active Session**: `~/.moonlock/active-session`

## Development

### Prerequisites
- Node.js 18+
- TypeScript
- npm

### Setup
```bash
git clone https://github.com/moonlock/cli.git
cd cli/moonlock-cli
npm install
```

### Development Commands
```bash
npm run dev              # Run in development mode
npm run build            # Build the project
npm run test             # Run tests
npm run package          # Create distribution packages
npm run clean            # Clean build artifacts
```

### Project Structure
```
moonlock-cli/
├── src/
│   ├── commands/        # CLI command implementations
│   ├── services/        # Core business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── cli.ts          # Main CLI entry point
├── scripts/            # Build and deployment scripts
├── dist/              # Compiled output
└── packages/          # Distribution packages
```

## API Integration

Moonlock CLI can integrate with remote APIs for data synchronization:

```bash
# Set API endpoint
moonlock config --set apiEndpoint=https://api.your-service.com

# Set API key
moonlock config --set apiKey=your-api-key

# Test connection
moonlock api test
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 Documentation: [GitHub Wiki](https://github.com/moonlock/cli/wiki)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/moonlock/cli/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/moonlock/cli/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.