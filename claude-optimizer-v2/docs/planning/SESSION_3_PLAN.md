# Session 3: Real-Time Dashboard Implementation

**Status**: 📋 PLANNED - Ready to Begin
**Estimated Time**: 4-6 hours
**Prerequisites**: ✅ Session 2.5 Complete

---

## Executive Summary

Build a real-time web dashboard that visualizes Claude Code Optimizer sessions. The dashboard will display:
- Live session progress
- Token usage and cost tracking
- Objective completion timeline
- Tool usage statistics
- Historical session data

**Architecture**: LogMonitor events → WebSocket Server → React Dashboard

---

## Session 3 Objectives

### Primary Goals
1. **WebSocket Server** - Broadcast LogMonitor events in real-time
2. **React Dashboard** - Modern UI for session monitoring
3. **Data Visualization** - Charts and graphs for metrics
4. **Session History** - Store and display past sessions

### Success Criteria
- ✅ Dashboard receives real-time updates from LogMonitor
- ✅ Token usage visualized with live chart
- ✅ Objectives displayed with completion status
- ✅ Cost tracking shows running total
- ✅ Multiple clients can connect simultaneously
- ✅ Works on localhost and deployed (optional)

---

## Architecture Design

###  Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Claude Code Optimizer                     │
│  (Node.js - Backend)                                         │
│                                                               │
│  ┌─────────────────┐      ┌──────────────────┐             │
│  │ CalendarWatcher │─────→│  LogMonitor      │             │
│  └─────────────────┘      └────────┬─────────┘             │
│                                     │                         │
│                                     │ Events                  │
│                                     ↓                         │
│                          ┌──────────────────┐               │
│                          │ WebSocket Server │               │
│                          └────────┬─────────┘               │
└───────────────────────────────────┼───────────────────────────┘
                                    │
                                    │ ws://localhost:3001
                                    ↓
┌──────────────────────────────────────────────────────────────┐
│                      React Dashboard                          │
│  (Next.js/React - Frontend)                                  │
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐│
│  │ Session View  │  │ Metrics Card │  │ Objectives List  ││
│  └───────────────┘  └──────────────┘  └──────────────────┘│
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐│
│  │ Token Chart   │  │ Cost Tracker │  │ Tool Usage Stats ││
│  └───────────────┘  └──────────────┘  └──────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
LogMonitor Event
  ↓
{ type: 'objective-complete', objective: 'Build auth' }
  ↓
WebSocket.broadcast(event)
  ↓
Dashboard.handleEvent(event)
  ↓
React State Update
  ↓
UI Re-render (Real-time)
```

---

## Phase Breakdown

### Phase 1: WebSocket Server (1-1.5 hours)

**Objective**: Create WebSocket server that broadcasts LogMonitor events

**Tasks**:
1. Set up Express + Socket.io
2. Create WebSocketServer class
3. Integrate with CalendarWatcher
4. Add connection management
5. Handle multiple clients
6. Add heartbeat/reconnection

**Files to Create**:
- `src/websocket-server.ts` (~200 lines)
- `src/server.ts` (entry point, ~100 lines)

**Key Features**:
```typescript
export class WebSocketServer {
  private io: Server;
  private port: number;

  async start(): Promise<void>
  stop(): void
  broadcast(event: SessionEvent): void
  private handleConnection(socket: Socket): void
  getConnectedClients(): number
}
```

**Events to Broadcast**:
- `session:start` - Session launched
- `session:objective` - Objective completed
- `session:tokens` - Token update
- `session:tool` - Tool used
- `session:complete` - Session finished
- `session:error` - Error occurred

**Integration**:
```typescript
// In CalendarWatcher.setupLogMonitorHandlers()
this.logMonitor.on('objective-complete', (objective) => {
  this.emit('session-update', { type: 'objective', content: objective });

  // NEW: Broadcast to dashboard
  this.websocketServer?.broadcast({
    type: 'session:objective',
    data: { objective, timestamp: new Date() }
  });
});
```

---

### Phase 2: React Dashboard Foundation (1.5-2 hours)

**Objective**: Create Next.js app with basic layout and WebSocket connection

**Tasks**:
1. Initialize Next.js project in `/dashboard`
2. Set up Tailwind CSS
3. Create WebSocket hook (`useSession`)
4. Build layout component
5. Add connection status indicator

**Files to Create**:
```
dashboard/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── SessionView.tsx
│   ├── ConnectionStatus.tsx
│   └── Layout.tsx
├── hooks/
│   └── useSession.ts
├── lib/
│   └── socket.ts
└── types/
    └── session.ts
```

**useSession Hook**:
```typescript
export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('ws://localhost:3001');

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('session:start', (data) => {
      setSession({ ...data, objectives: [], metrics: {} });
    });

    socket.on('session:objective', (data) => {
      setSession(prev => ({
        ...prev,
        objectives: [...prev.objectives, data.objective]
      }));
    });

    // ... more event handlers

    return () => socket.disconnect();
  }, []);

  return { session, connected };
}
```

**Layout**:
```tsx
export default function DashboardLayout() {
  const { session, connected } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header connected={connected} />

      {session ? (
        <SessionView session={session} />
      ) : (
        <EmptyState message="No active session" />
      )}
    </div>
  );
}
```

---

### Phase 3: Session Visualization (1.5-2 hours)

**Objective**: Build components to display session data

**Components to Build**:

#### 1. SessionHeader
```tsx
<SessionHeader
  projectName="My Project"
  phase="Implementation"
  model="sonnet"
  startTime={new Date()}
  status="running"
/>
```

**Displays**: Project name, phase, model, elapsed time, status badge

#### 2. MetricsCard
```tsx
<MetricsCard
  tokens={12500}
  cost={0.15}
  toolCalls={25}
  messages={50}
/>
```

**Features**: Big numbers, progress bars, change indicators

#### 3. ObjectivesList
```tsx
<ObjectivesList
  objectives={[
    { text: 'Build auth', completed: true, timestamp: ... },
    { text: 'Write tests', completed: false }
  ]}
/>
```

**Features**: Checkmarks, timestamps, completion animation

#### 4. TokenChart
```tsx
<TokenChart
  data={[
    { time: '10:00', input: 500, output: 200 },
    { time: '10:05', input: 800, output: 350 },
    // ...
  ]}
/>
```

**Library**: Recharts or Chart.js
**Features**: Real-time line chart, input/output breakdown

#### 5. CostTracker
```tsx
<CostTracker
  current={0.15}
  budget={2.00}
  model="sonnet"
/>
```

**Features**: Progress bar, percentage, budget warning

#### 6. ToolUsageStats
```tsx
<ToolUsageStats
  tools={[
    { name: 'Edit', count: 15 },
    { name: 'Read', count: 8 },
    { name: 'Bash', count: 2 }
  ]}
/>
```

**Features**: Bar chart or pie chart, tool icons

---

### Phase 4: Historical Sessions (1 hour)

**Objective**: Store and display past sessions

**Tasks**:
1. Add session persistence to SQLite
2. Create sessions list view
3. Add session detail view
4. Build comparison feature (optional)

**Database Schema**:
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  project_path TEXT,
  project_name TEXT,
  phase TEXT,
  model TEXT,
  start_time INTEGER,
  end_time INTEGER,
  status TEXT,
  tokens_used INTEGER,
  cost REAL,
  objectives_completed INTEGER
);

CREATE TABLE session_events (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  type TEXT,
  data TEXT,  -- JSON
  timestamp INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

**API Endpoints**:
```typescript
GET  /api/sessions          // List all sessions
GET  /api/sessions/:id      // Get session detail
POST /api/sessions/:id/end  // Mark session complete
```

**Sessions List Component**:
```tsx
<SessionsList
  sessions={[
    {
      id: 'abc-123',
      projectName: 'My Project',
      phase: 'Implementation',
      startTime: new Date(),
      duration: '45m',
      cost: 0.15,
      status: 'completed'
    },
    // ...
  ]}
  onSelect={(id) => navigate(`/sessions/${id}`)}
/>
```

---

## Technology Stack

### Backend
- **Node.js** - Runtime
- **Express** - HTTP server
- **Socket.io** - WebSocket server
- **better-sqlite3** - Database (already installed)
- **TypeScript** - Language

### Frontend
- **Next.js 14** - React framework (App Router)
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **Socket.io-client** - WebSocket client
- **Recharts** - Charts and graphs
- **Lucide React** - Icons
- **date-fns** - Date formatting

### Dev Tools
- **TypeScript** - Type safety
- **ESLint** - Linting
- **Prettier** - Formatting

---

## Implementation Steps

### Step 1: Set Up WebSocket Server

```bash
cd claude-optimizer-v2

# Install dependencies
npm install express socket.io cors

# Create server files
mkdir -p src/server
touch src/websocket-server.ts
touch src/server.ts
```

**src/websocket-server.ts**:
```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

export class WebSocketServer {
  private io: Server;
  private httpServer: any;
  private app: express.Application;

  constructor(port: number = 3001) {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: { origin: '*' }
    });

    this.setupHandlers();
  }

  async start(): Promise<void> {
    this.httpServer.listen(3001, () => {
      console.log('WebSocket server listening on :3001');
    });
  }

  broadcast(event: SessionEvent): void {
    this.io.emit(event.type, event.data);
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
}
```

### Step 2: Initialize Dashboard

```bash
# Create Next.js app
npx create-next-app@latest dashboard --typescript --tailwind --app

cd dashboard

# Install dependencies
npm install socket.io-client recharts lucide-react date-fns

# Create directory structure
mkdir -p components hooks lib types
```

### Step 3: Connect Dashboard to Server

**dashboard/lib/socket.ts**:
```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
  }
  return socket;
}
```

### Step 4: Build Core Components

See Phase 3 above for component details.

### Step 5: Test Integration

```bash
# Terminal 1: Start optimizer
npm run build
node dist/server.js

# Terminal 2: Start dashboard
cd dashboard
npm run dev

# Terminal 3: Trigger test session
claude-optimizer calendar watch
```

---

## File Structure

```
claude-optimizer-v2/
├── src/
│   ├── websocket-server.ts          # NEW
│   ├── server.ts                     # NEW
│   ├── session-launcher.ts           # ✅ Existing
│   ├── log-monitor.ts                # ✅ Existing
│   ├── calendar-watcher.ts           # ✅ Update to integrate WebSocket
│   └── ...
│
├── dashboard/                        # NEW
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── sessions/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── SessionView.tsx
│   │   ├── MetricsCard.tsx
│   │   ├── ObjectivesList.tsx
│   │   ├── TokenChart.tsx
│   │   ├── CostTracker.tsx
│   │   └── ToolUsageStats.tsx
│   ├── hooks/
│   │   └── useSession.ts
│   ├── lib/
│   │   └── socket.ts
│   └── types/
│       └── session.ts
│
└── package.json                      # Update with server script
```

---

## Testing Plan

### Unit Tests
- WebSocketServer connection handling
- Event broadcasting
- useSession hook logic
- Component rendering

### Integration Tests
- Server → Dashboard communication
- Real-time event delivery
- Multiple client support
- Reconnection handling

### End-to-End Tests
- Full session workflow
- UI updates on events
- Historical session viewing
- Navigation between views

---

## Deployment Options

### Option 1: Local Development
```bash
# Run together
npm run dev:all

# Separate terminals
npm run server    # Port 3001
npm run dashboard # Port 3000
```

### Option 2: Vercel (Dashboard Only)
```bash
cd dashboard
vercel deploy
```

**Note**: WebSocket server runs locally, dashboard on Vercel

### Option 3: Docker (Both)
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "run", "start:all"]
```

---

## Success Metrics

### Functional
- ✅ Real-time updates (<100ms latency)
- ✅ Accurate token tracking
- ✅ Correct cost calculations
- ✅ Objective detection works
- ✅ Tool usage displayed
- ✅ Session history accessible

### Performance
- ✅ Dashboard loads in <2 seconds
- ✅ WebSocket reconnects automatically
- ✅ Handles 10+ concurrent sessions
- ✅ No memory leaks
- ✅ Smooth animations

### UX
- ✅ Intuitive navigation
- ✅ Clear visual hierarchy
- ✅ Responsive design (mobile-friendly)
- ✅ Dark mode (optional)
- ✅ Accessibility (WCAG 2.1 AA)

---

## Timeline Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | WebSocket Server | 1-1.5h |
| 2 | Dashboard Foundation | 1.5-2h |
| 3 | Visualization Components | 1.5-2h |
| 4 | Historical Sessions | 1h |
| | **Total** | **5-6.5h** |

**Buffer**: +1 hour for testing and debugging

**Final Estimate**: 6-7.5 hours

---

## Risks & Mitigation

### Risk 1: WebSocket Connection Issues
**Impact**: High
**Probability**: Medium
**Mitigation**: Implement automatic reconnection, heartbeat, fallback to polling

### Risk 2: Real-Time Performance
**Impact**: Medium
**Probability**: Low
**Mitigation**: Throttle updates, batch events, use React.memo

### Risk 3: Chart Library Learning Curve
**Impact**: Low
**Probability**: Medium
**Mitigation**: Use Recharts (simple API), follow examples

### Risk 4: State Management Complexity
**Impact**: Medium
**Probability**: Medium
**Mitigation**: Keep state simple, use hooks, avoid premature optimization

---

## Future Enhancements (Post-Session 3)

### Phase 3.5: Advanced Features
- Session comparison view
- Export reports (PDF/CSV)
- Team collaboration features
- Slack/Discord notifications
- Mobile app (React Native)

### Phase 4: Analytics
- Trend analysis
- Cost forecasting
- Efficiency metrics
- Model performance comparison

### Phase 5: AI Features
- Automatic optimization suggestions
- Anomaly detection
- Predictive scheduling

---

## Prerequisites Checklist

Before starting Session 3:

- [x] Session 2.5 complete
- [x] Build passes (npm run build)
- [x] SessionLauncher working
- [x] LogMonitor emitting events
- [x] CalendarWatcher integrated
- [x] Type definitions correct
- [x] Documentation up-to-date

**Status**: ✅ ALL PREREQUISITES MET

---

## Next Steps

1. **Review this plan** - Confirm approach and scope
2. **Set up environment** - Install dependencies
3. **Start Phase 1** - Build WebSocket server
4. **Iterate rapidly** - Small commits, frequent testing
5. **Document as you go** - Update README, add comments

**Ready to begin**: ✅ YES

Let's build the dashboard! 🚀

---

**Session 3 Start Prompt**:
```
I'm ready to start Session 3: Real-Time Dashboard Implementation.

Objectives:
1. Create WebSocket server for broadcasting LogMonitor events
2. Build Next.js dashboard with real-time session visualization
3. Display token usage, costs, objectives, and tool stats
4. Add session history storage and viewing

Prerequisites checked:
- Session 2.5 architecture complete ✅
- SessionLauncher and LogMonitor working ✅
- Type definitions ready ✅

Let's begin with Phase 1: WebSocket Server.
```
