# Moonlock Dashboard Architecture

## System Overview
The Moonlock Dashboard is a real-time monitoring system for AI session management with precise timing and token tracking capabilities.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS with dark theme
- **Real-time**: WebSocket client for live updates
- **Charts**: Chart.js for token usage visualization
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **WebSocket**: ws library for real-time communication
- **Database**: SQLite with better-sqlite3
- **API**: RESTful endpoints + WebSocket events

### Database Schema
- **sessions**: id, start_time, end_time, total_tokens, status
- **token_usage**: id, session_id, timestamp, tokens_used, cumulative_total
- **checkpoints**: id, session_id, phase, prompt_count, timestamp

## Core Components

### 1. Session Manager
- High-precision 5-hour countdown timer (millisecond accuracy)
- Session state persistence and recovery
- Checkpoint system for progress tracking
- Real-time WebSocket updates

### 2. Token Monitor
- Real-time token consumption tracking
- Predictive analytics for remaining budget
- Alert system for approaching limits
- Historical usage pattern analysis

### 3. Dashboard UI
- Enhanced Moonlock interface with metrics grid
- Real-time session timer display
- Token usage visualization charts
- Phase progress indicators
- Responsive design optimized for development workflows

### 4. Data Persistence Layer
- SQLite database for session history
- Token usage analytics storage
- Export/import functionality for data portability
- Automated backup system

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Express API   │    │   SQLite DB     │
│                 │    │                 │    │                 │
│ - Dashboard UI  │◄──►│ - REST Routes   │◄──►│ - Sessions      │
│ - Timer Display │    │ - WebSocket     │    │ - Token Usage   │
│ - Token Charts  │    │ - Session Mgmt  │    │ - Checkpoints   │
│ - Progress View │    │ - Token Monitor │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲
         │                       │
         └───── WebSocket ───────┘
```

## Data Flow
1. **Session Start**: Timer begins, database record created
2. **Token Tracking**: Real-time updates via WebSocket
3. **Checkpoint Save**: Progress persisted at milestones
4. **Dashboard Update**: UI reflects current state instantly
5. **Session End**: Final analytics generated and stored

## Performance Requirements
- Timer accuracy: <1 second drift over 5 hours
- Token tracking: ±1% accuracy
- UI updates: <100ms latency
- Database operations: <50ms average response time