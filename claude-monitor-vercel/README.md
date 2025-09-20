# Claude Monitor Dashboard - Vercel Edition

A beautiful, real-time monitoring dashboard for Claude Code and Claude Desktop with glass morphism UI inspired by the Moonlock design.

## Features

- 🎨 **Beautiful Glass Morphism UI** - Stunning visual effects with particle animations
- 📊 **Real-time Metrics** - Live activity counts and statistics
- 🔄 **WebSocket Updates** - Instant activity feed updates
- 📱 **Responsive Design** - Works on all screen sizes
- ⚡ **Real Data Only** - No mock data, connects to actual monitoring backend

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

#### Option 1: Using Deploy Script
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option 2: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Option 3: Deploy Button
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/claude-monitor-vercel)

## Environment Variables

Set these in Vercel Dashboard or `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
MONITOR_API_URL=http://localhost:3001
```

For production, replace with your monitoring server URLs.

## Architecture

```
┌─────────────────────────┐
│   Vercel Dashboard      │
│   (Next.js + React)     │
└────────┬────────────────┘
         │ WebSocket + API
         ▼
┌─────────────────────────┐
│  Monitoring Server      │
│  (Express + SQLite)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Claude Monitor Script  │
│  (fswatch + bash)       │
└─────────────────────────┘
```

## UI Components

- **ParticleField** - Animated background particles
- **PulseOrb** - Connection status indicator
- **GlassCard** - Glass morphism card component
- **MetricCard** - Statistics display with progress bars
- **ActivityItem** - Live activity feed items

## Real-time Data

The dashboard connects to your monitoring server to display:
- Total activities count
- Today's activities
- Claude Code usage
- Claude Desktop usage
- Live activity feed
- Connection status

## Deployment Options

### Vercel (Recommended)
```bash
vercel --prod
```

### Self-hosted
```bash
npm run build
npm start
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Customization

### Colors
Edit `app/globals.css` to change the gradient:
```css
--background-start-rgb: 88, 28, 135;  /* Purple */
--background-end-rgb: 30, 58, 138;    /* Blue */
```

### Particles
Adjust density in `app/page.tsx`:
```tsx
<ParticleField density={30} color="#60A5FA" />
```

## Troubleshooting

### Connection Issues
- Ensure monitoring server is running on port 3001
- Check WebSocket connection in browser console
- Verify environment variables are set correctly

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

## License

MIT

## Credits

UI design inspired by Moonlock's beautiful glass morphism interface.
