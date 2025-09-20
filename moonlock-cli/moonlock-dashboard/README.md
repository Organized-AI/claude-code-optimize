# Moonlock Dashboard

Real-time monitoring dashboard for Moonlock CLI sessions with live data integration.

## Live URL

🚀 **Production Dashboard**: https://moonlock-dashboard-fwo3d49zn-jordaaans-projects.vercel.app

## Features

- **Real Session Data**: Displays actual session data from `~/.moonlock/` directory
- **Live Updates**: Auto-refreshes every 10 seconds to show current CLI usage
- **Active Sessions**: Shows currently running sessions with real-time status
- **Session History**: Browse completed and paused sessions
- **Token Usage Analytics**: Visual charts showing token consumption over time
- **Statistics Dashboard**: Daily, monthly, and total usage metrics
- **Provider Breakdown**: Usage statistics by AI provider (OpenAI, Anthropic, etc.)

## Data Sources

The dashboard reads real data from your local Moonlock CLI installation:

- **Sessions**: `~/.moonlock/sessions/`
- **Token Usage**: `~/.moonlock/tokens/`
- **Active Session**: `~/.moonlock/active-session`
- **Configuration**: `~/.moonlock/config.json`

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

The dashboard is deployed on Vercel and configured for serverless operation:

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

## API Endpoints

The dashboard provides several API endpoints for data access:

- `GET /api/sessions` - List all sessions
- `GET /api/sessions?id={sessionId}` - Get specific session
- `GET /api/tokens` - Get all token usage
- `GET /api/tokens?sessionId={id}` - Get tokens for specific session
- `GET /api/active-session` - Get current active session
- `GET /api/statistics` - Get aggregated statistics

## Environment Variables

Create a `.env.local` file for custom configuration:

```env
# Optional: Custom Moonlock data directory
MOONLOCK_DATA_DIR=/custom/path/to/moonlock

# Optional: API rate limiting
API_RATE_LIMIT=60

# Optional: Enable debug logging
DEBUG=true
```

## Technology Stack

- **Framework**: Next.js 14.2.3
- **UI**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Deployment**: Vercel

## Features in Detail

### Real-Time Data Integration
- Reads directly from Moonlock CLI's data storage
- No mock data - all information is live
- Automatic detection of new sessions and updates

### Session Management
- View active, paused, and completed sessions
- Session metadata including model, provider, and project path
- Token usage breakdown (input/output/total)

### Analytics Dashboard
- 7-day token usage trend chart
- Provider-specific usage statistics
- Daily and monthly quota tracking
- Total token consumption metrics

### Auto-Refresh
- Dashboard refreshes every 10 seconds
- Manual refresh button available
- Real-time status indicators

## Requirements

- Node.js 18+ 
- Moonlock CLI installed and configured
- Sessions data in `~/.moonlock/` directory

## License

MIT