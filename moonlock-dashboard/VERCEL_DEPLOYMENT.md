# Claude Code Optimizer Dashboard - Vercel Deployment

## 🚀 Deploy to dashboard.organizedai.vip

This guide will help you deploy the Claude Code Optimizer Dashboard to Vercel.

## 📋 Pre-Deployment Setup

### 1. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link Project (from project directory)
```bash
cd moonlock-dashboard
vercel link
```

## 🌐 Custom Domain Configuration

### 1. Deploy with Custom Domain
```bash
vercel --prod --domains dashboard.organizedai.vip
```

### 2. Or deploy first, then add domain
```bash
# Deploy to Vercel
vercel --prod

# Add custom domain
vercel domains add dashboard.organizedai.vip
```

## ⚙️ Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```bash
NODE_ENV=production
SONNET_WEEKLY_LIMIT=480
OPUS_WEEKLY_LIMIT=40
QUOTA_SAFETY_THRESHOLD=0.9
```

## 🏗️ Project Structure for Vercel

```
moonlock-dashboard/
├── api/                    # Vercel serverless functions
│   └── index.ts           # Main API handler
├── src/
│   ├── client/            # React frontend
│   │   ├── index.html     # Entry point
│   │   └── src/           # React components
│   └── server/            # Full-featured server (dev only)
├── vercel.json            # Vercel configuration
└── package.json           # Build scripts
```

## 🎯 Key Features Deployed

### ✅ Dashboard Interface
- **Three-state UI**: waiting/active/planning modes
- **Real-time quota monitoring** with 90% safety limits
- **Glass morphism design** with particle effects
- **Session history** with detailed analytics

### ✅ Quota Protection System
- **Hard limits**: Never exceed 432h Sonnet, 36h Opus weekly
- **Real-time validation** of all session requests
- **Emergency protocols** with automatic blocking
- **Visual warnings** at 80% and 90% thresholds

### ✅ API Endpoints
- `GET /api/health` - System health check
- `GET /api/claude-code/quota-status` - Current quota usage
- `GET /api/sessions/history` - Session history
- `POST /api/sessions/create` - Create new session (with quota validation)
- `POST /api/project-analysis/analyze` - Project complexity analysis

## 🔧 Deployment Commands

### Quick Deploy
```bash
# Deploy to Vercel with production settings
vercel --prod
```

### With Custom Domain
```bash
# Deploy with custom domain configuration
vercel --prod --domains dashboard.organizedai.vip
```

### Development Preview
```bash
# Deploy preview version for testing
vercel
```

## 📊 Post-Deployment Verification

### 1. Check Health Endpoint
```bash
curl https://dashboard.organizedai.vip/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1704321600000,
  "version": "1.0.0",
  "environment": "vercel",
  "services": {
    "database": "mock",
    "quotaProtection": "active",
    "dashboard": "ready"
  }
}
```

### 2. Test Quota Protection
```bash
curl -X POST https://dashboard.organizedai.vip/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{"tokenBudget": 2000, "model": "sonnet"}'
```

### 3. Verify Dashboard
Visit: https://dashboard.organizedai.vip

You should see:
- ✅ Loading dashboard with particle effects
- ✅ Quota bars showing Sonnet (23.5h/480h) and Opus (2.1h/40h)
- ✅ Session history with mock data
- ✅ Three action buttons: Start, Plan, Schedule
- ✅ Real-time system status

## 🛡️ Security & Performance

### Production Optimizations
- **Static asset optimization** via Vite build
- **API response caching** for quota data
- **Error boundary** handling for React components
- **Graceful degradation** for offline scenarios

### Monitoring
- **Health checks** available at `/api/health`
- **Error logging** via Vercel Functions
- **Performance metrics** tracked automatically
- **Uptime monitoring** recommended via external service

## 🎯 Demo Data

The deployed version includes realistic demo data:
- **2 completed sessions** with different efficiency ratings
- **Current quota usage**: 4.9% Sonnet, 5.25% Opus
- **Mock project analysis** with complexity scoring
- **Quota protection** actively preventing overruns

## 🚀 Going Live

Once deployed to dashboard.organizedai.vip, users can:

1. **Monitor quotas** in real-time with visual protection
2. **View session history** with detailed analytics
3. **Test quota protection** by attempting large sessions
4. **Analyze projects** for complexity and planning
5. **Experience the UI** with smooth animations and responsive design

## 🔄 Updates & Maintenance

### Deploy Updates
```bash
# Deploy latest changes
git push origin main
vercel --prod
```

### Roll Back
```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote [deployment-url]
```

### Monitor Performance
```bash
# View deployment logs
vercel logs
```

## 🎉 Success!

Your Claude Code Optimizer Dashboard is now live at **dashboard.organizedai.vip** with:

✅ **Bulletproof quota protection** preventing overruns  
✅ **Professional UI** with glass morphism design  
✅ **Real-time monitoring** with WebSocket fallbacks  
✅ **Production performance** optimized for Vercel  
✅ **Mobile responsive** design for all devices  

**The dashboard is ready to help power users maximize their Claude usage while staying safely within quota limits!**