# 🚀 Claude Monitor Dashboard - Vercel Edition

Beautiful Moonlock-style UI with **REAL Claude monitoring data** - no mock data!

## ✨ Features

### **Moonlock-Inspired UI**
- 🎨 Glassmorphism cards with blur effects
- ✨ Particle field animations
- 🌈 Gradient backgrounds
- 📊 Animated metrics
- 💫 Smooth transitions

### **Real-Time Data**
- 📝 Claude Code activity tracking
- 🖥️ Claude Desktop monitoring
- ⚡ WebSocket live updates
- 📈 Activity statistics
- 🔄 Auto-refreshing metrics

## 🎯 UI Components

### **Status Cards** (Top Section)
- Total Activities counter
- Today's Activities
- Claude Code events count  
- Claude Desktop events count
- Activity rate per hour

### **Live Activity Feed**
- Real-time activity stream
- Color-coded source indicators
- Timestamp for each activity
- Smooth animations

### **Session Statistics**
- Active sessions count
- Messages per hour
- Most active application
- System uptime status

### **Monitoring Health**
- WebSocket connection status
- Database connection
- Monitor process status

## 🛠️ Setup

### **1. Install Dependencies**
```bash
cd vercel-dashboard
npm install
```

### **2. Configure Environment**
Create `.env.local`:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001
DATABASE_PATH=../dashboard-server/claude-monitor.db
```

### **3. Run Development Server**
```bash
npm run dev
```
Visit: http://localhost:3000

## 🚀 Deploy to Vercel

### **Option 1: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Option 2: Using Deploy Script**
```bash
chmod +x deploy.sh
./deploy.sh
```

### **Option 3: GitHub Integration**
1. Push to GitHub
2. Import project in Vercel Dashboard
3. Configure environment variables
4. Deploy automatically

## ⚙️ Environment Variables

Set these in Vercel Dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `wss://your-ws-server.com` |
| `DATABASE_PATH` | Path to SQLite database | `/data/claude-monitor.db` |

## 📁 Project Structure

```
vercel-dashboard/
├── app/
│   ├── page.tsx          # Main dashboard component
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   └── api/
│       └── stats/
│           └── route.ts  # API endpoint for stats
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies
├── vercel.json          # Vercel configuration
└── deploy.sh            # Deployment script
```

## 🎨 UI Customization

### **Change Colors**
Edit gradient colors in `page.tsx`:
```tsx
// Background gradient
from-purple-900/90 via-blue-900/90 to-indigo-900/90

// Particle color
<ParticleField density={30} color="#60A5FA" />
```

### **Adjust Card Styles**
Modify `GlassCard` component:
```tsx
bg-white/5 backdrop-blur-xl border-white/10
```

### **Animation Speed**
Update in `globals.css`:
```css
.animate-float {
  animation: float 15s ease-in-out infinite;
}
```

## 🔌 API Endpoints

### **GET /api/stats**
Returns real-time statistics from SQLite database:
```json
{
  "totalActivities": 150,
  "todayActivities": 45,
  "claudeCodeCount": 89,
  "claudeDesktopCount": 61,
  "recentActivities": [...]
}
```

## 🐛 Troubleshooting

### **Database Connection Issues**
- Ensure SQLite database exists at specified path
- Check file permissions
- Verify DATABASE_PATH environment variable

### **WebSocket Not Connecting**
- Confirm WebSocket server is running
- Check NEXT_PUBLIC_WS_URL is correct
- Ensure no CORS issues

### **Build Errors**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## 📊 Real Data Integration

The dashboard connects to your existing monitoring infrastructure:

1. **SQLite Database** - Reads from `claude-monitor.db`
2. **WebSocket Server** - Connects to port 3001 for live updates
3. **Monitor Scripts** - Works with existing monitoring processes

No mock data - everything displayed is real activity from your Claude usage!

## 🎉 Features Coming Soon

- 📈 Historical charts
- 🔍 Activity search
- 📁 Export functionality
- 🎯 Custom alerts
- 🌙 Dark/Light theme toggle

---

**Built with the Moonlock UI style you love, powered by real Claude monitoring data!** 🚀
