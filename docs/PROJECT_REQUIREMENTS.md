# Claude Code Optimizer - Project Requirements

## 🎯 Project Overview
Transform existing Claude Code Optimizer into comprehensive platform with ccusage-style reporting, modern dashboard UI, and maintained real-time advantages.

## 📊 Current Assets (DO NOT BREAK)
- ✅ FastAPI backend (localhost:3001) - PRESERVE
- ✅ SQLite database with session tracking - ENHANCE  
- ✅ Real-time monitoring scripts - PRESERVE
- ✅ Basic dashboard interface - UPGRADE
- ✅ WebSocket infrastructure - ENHANCE

## 🎯 Target Capabilities

### ccusage Compatibility Requirements
- Daily reports: `/api/reports/daily` with JSON output
- Weekly reports: `/api/reports/weekly` 
- Monthly reports: `/api/reports/monthly`
- Session reports: `/api/reports/sessions`
- Blocks reports: `/api/reports/blocks` (5-hour block tracking)
- Export formats: JSON, CSV

### Real-time Advantages (UNIQUE TO US)
- Live JSONL monitoring during active sessions
- WebSocket updates for dashboard
- Multi-application tracking (CLI + Desktop)
- Real-time token counting and burn rate calculation

### Visual Design Requirements
- Dark theme: #0f1729 background, #1e293b cards
- Status indicators: SAFE (green), WARNING (yellow), DANGER (red)
- Live status badges with "REAL-TIME MONITORING"
- Colorful analytics cards (teal, purple, blue gradients)
- Professional card design with rounded corners and shadows

## 🚀 Success Criteria
- All ccusage report types functional
- Real-time monitoring preserved and enhanced
- Modern dashboard matching visual design
- Export functionality working
- Performance: <3s load, <100ms updates
- Backward compatibility maintained