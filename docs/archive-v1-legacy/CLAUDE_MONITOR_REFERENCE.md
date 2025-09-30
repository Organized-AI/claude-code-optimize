# Claude Monitor System - Complete Reference Guide

## 📋 Overview
A real-time monitoring system that tracks all Claude activity across both Claude Code (CLI) and Claude Desktop applications, with a beautiful web dashboard for visualization.

### Deployment Options
1. **Local Only** - Everything runs on your Mac (default)
2. **Hybrid** - Local monitor → Cloud dashboard (recommended)
3. **Full Cloud** - Monitor and dashboard on Vercel (coming soon)

## 🏗️ Architecture

### System Components
```
┌─────────────────────────────────────────────────────┐
│                   MONITORING LAYER                   │
├───────────────────────────┬─────────────────────────┤
│   Claude Code Monitor     │   Claude Desktop Monitor │
│   (JSONL File Watcher)    │   (IndexedDB Watcher)    │
└───────────────────────────┴─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              DASHBOARD SERVER (Port 3001)            │
│         Express.js + WebSocket + SQLite              │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│               WEB DASHBOARD (Browser)                │
│     Real-time Activity Feed + Process Status Bar     │
└─────────────────────────────────────────────────────┘
```

---

*This is a comprehensive reference guide for the Claude Monitor System architecture and implementation.*
