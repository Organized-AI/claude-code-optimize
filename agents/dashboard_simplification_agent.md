# Dashboard Simplification Specialist Agent

**Agent ID:** dashboard_simplification  
**Specialization:** React/TypeScript, UI/UX design, component architecture  
**Mission:** Add Simple Mode toggle providing ccusage-style minimalist views

## EXISTING FOUNDATION

You are enhancing a complete, professional React/TypeScript dashboard system:

### Current Dashboard Implementation
- **Main Component:** `dashboard-server/ClaudeCodeDashboard.tsx`
- **Real-time Monitoring:** LiveSessionExtractor with WebSocket connections
- **Design System:** Glass card components with Tailwind CSS
- **Analytics:** Comprehensive session tracking and token analytics
- **Performance:** Optimized rendering with React hooks and context

### Component Architecture
```
dashboard-server/
├── ClaudeCodeDashboard.tsx     # Main dashboard component
├── components/
│   ├── SessionCard.tsx         # Current session display
│   ├── QuotaCard.tsx          # Weekly limits tracking
│   ├── HistoryCard.tsx        # Session history
│   ├── AnalyticsCard.tsx      # Usage analytics
│   └── StatusIndicator.tsx    # Real-time status
├── utils/
│   ├── LiveSessionExtractor.js # Real-time data extraction
│   └── api.js                 # API utilities
└── styles/
    └── dashboard.css          # Custom styling
```

### Data Flow
- Real-time session monitoring via LiveSessionExtractor
- WebSocket connections for live updates
- REST API integration for historical data
- State management with React Context
- Responsive design for mobile/desktop

## SIMPLE MODE REQUIREMENTS

### Core Concept
Create a toggle that switches between:
- **Advanced Mode:** Current full-featured dashboard (existing)
- **Simple Mode:** ccusage-inspired minimalist interface (new)

### Simple Mode Design Principles

#### 1. ccusage-Inspired Minimalism
- Clean, focused layout reminiscent of terminal output
- Essential metrics only: current session, weekly status, limits
- Reduced visual complexity while maintaining professionalism
- Information hierarchy: most important data first

#### 2. Essential Information Only
```
Simple Mode Layout:
┌─────────────────────────────────────────┐
│ 🟢 Current Session: 2.3h │ Sonnet      │ ← Current Status
├─────────────────────────────────────────┤
│ 🟡 Weekly: 78% used │ 25.2h/432h      │ ← Traffic Light Quota
├─────────────────────────────────────────┤
│ Recent Sessions (3)                     │ ← Quick History
│ • claude-optimizer: 2.8h │ Today       │
│ • documentation: 1.4h    │ Yesterday   │
│ • agent-system: 0.9h     │ Yesterday   │
├─────────────────────────────────────────┤
│ Quick Actions                           │ ← Essential Actions
│ [Plan Session] [Check Limits] [History]│
└─────────────────────────────────────────┘
```

#### 3. Mode Switching
- Prominent toggle switch in top-right corner
- Smooth transition animations between modes
- User preference persistence across sessions
- No loss of context or data during switching

## TECHNICAL IMPLEMENTATION

### Component Structure
```
src/components/simple/
├── SimpleDashboard.tsx         # Main simple mode container
├── SimpleStatusCard.tsx        # Current session status
├── SimpleQuotaCard.tsx         # Weekly limits with traffic light
├── SimpleHistoryCard.tsx       # Recent sessions (last 3-5)
├── SimpleActionsCard.tsx       # Quick action buttons
├── ModeToggle.tsx             # Switch between modes
└── SimpleLayout.tsx           # Layout wrapper for simple mode
```

### Mode Toggle Implementation
```typescript
// ModeToggle.tsx structure
interface ModeToggleProps {
  currentMode: 'simple' | 'advanced';
  onModeChange: (mode: 'simple' | 'advanced') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="mode-toggle">
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={currentMode === 'advanced'}
          onChange={(e) => onModeChange(e.target.checked ? 'advanced' : 'simple')}
        />
        <span className="slider">
          <span className="toggle-label">
            {currentMode === 'simple' ? '📊 Simple' : '🔧 Advanced'}
          </span>
        </span>
      </label>
    </div>
  );
};
```

### Simple Mode Components

#### SimpleStatusCard.tsx
```typescript
interface SimpleStatusCardProps {
  sessionData: {
    duration: number;
    model: string;
    status: 'active' | 'idle';
    tokensUsed: number;
  };
}

// Display format:
// 🟢 Current Session: 2.3h | Sonnet | 15,240 tokens
// 🔴 No active session
```

#### SimpleQuotaCard.tsx  
```typescript
interface SimpleQuotaCardProps {
  quotaData: {
    sonnetUsed: number;
    opusUsed: number;
    sonnetLimit: number;
    opusLimit: number;
    weekStart: Date;
  };
}

// Display format with traffic light:
// 🟢 Weekly: Safe | 25.2h/432h Sonnet | 3.3h/36h Opus
// 🟡 Weekly: Warning | 78% used
// 🔴 Weekly: Critical | 91% used
```

#### SimpleHistoryCard.tsx
```typescript
interface SimpleHistoryCardProps {
  recentSessions: Array<{
    projectName: string;
    duration: number;
    date: Date;
    model: string;
  }>;
  maxSessions?: number; // Default: 3
}

// Display format:
// Recent Sessions (3)
// • claude-optimizer: 2.8h | Today | Sonnet
// • documentation: 1.4h | Yesterday | Sonnet  
// • agent-system: 0.9h | Yesterday | Haiku
```

#### SimpleActionsCard.tsx
```typescript
interface SimpleActionsCardProps {
  onPlanSession: () => void;
  onCheckLimits: () => void;
  onViewHistory: () => void;
  onOptimize: () => void;
}

// Clean button layout:
// [📅 Plan] [⚡ Limits] [📊 History] [🎯 Optimize]
```

### Layout and Styling

#### Simple Mode Layout (SimpleDashboard.tsx)
```typescript
const SimpleDashboard: React.FC = () => {
  const { sessionData, quotaData, recentSessions } = useContext(DashboardContext);
  
  return (
    <div className="simple-dashboard">
      {/* Header with mode toggle */}
      <header className="simple-header">
        <h1>Claude Code Optimizer</h1>
        <ModeToggle currentMode="simple" onModeChange={handleModeChange} />
      </header>
      
      {/* Main content - single column, stacked cards */}
      <main className="simple-content">
        <SimpleStatusCard sessionData={sessionData} />
        <SimpleQuotaCard quotaData={quotaData} />
        <SimpleHistoryCard recentSessions={recentSessions} maxSessions={3} />
        <SimpleActionsCard 
          onPlanSession={() => window.open('/cli-help#plan')}
          onCheckLimits={() => setShowLimitsModal(true)}
          onViewHistory={() => setShowHistoryModal(true)}
          onOptimize={() => window.open('/cli-help#optimize')}
        />
      </main>
    </div>
  );
};
```

#### Simple Mode Styling
```css
/* Simple mode specific styles */
.simple-dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.simple-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.simple-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

.simple-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 500;
}

.traffic-light {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.simple-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.simple-button {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.simple-button:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}
```

### Integration with Existing Dashboard

#### Main Dashboard Update (ClaudeCodeDashboard.tsx)
```typescript
// Add mode state and toggle
const [dashboardMode, setDashboardMode] = useState<'simple' | 'advanced'>('simple');

// Load user preference
useEffect(() => {
  const savedMode = localStorage.getItem('dashboard_mode') as 'simple' | 'advanced';
  if (savedMode) {
    setDashboardMode(savedMode);
  }
}, []);

// Save user preference
const handleModeChange = (mode: 'simple' | 'advanced') => {
  setDashboardMode(mode);
  localStorage.setItem('dashboard_mode', mode);
};

// Conditional rendering
return (
  <div className="claude-dashboard">
    {dashboardMode === 'simple' ? (
      <SimpleDashboard onModeChange={handleModeChange} />
    ) : (
      <AdvancedDashboard onModeChange={handleModeChange} />
    )}
  </div>
);
```

### Responsive Design

#### Mobile Optimization
```css
@media (max-width: 768px) {
  .simple-dashboard {
    padding: 1rem 0.5rem;
  }
  
  .simple-actions {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .simple-card {
    padding: 1rem;
  }
}
```

#### Touch-Friendly Interface
- Larger button targets (minimum 44px)
- Improved spacing for mobile interaction
- Swipe gestures for mode switching (optional)

## DATA INTEGRATION

### Real-time Updates
- Use existing LiveSessionExtractor for current session data
- WebSocket connection for real-time quota updates
- Efficient re-rendering with React.memo for performance

### API Integration
```typescript
// Custom hooks for simple mode data
const useSimpleSessionData = () => {
  const { currentSession } = useContext(DashboardContext);
  
  return useMemo(() => ({
    duration: currentSession?.duration || 0,
    model: currentSession?.model || 'idle',
    status: currentSession?.isActive ? 'active' : 'idle',
    tokensUsed: currentSession?.totalTokens || 0
  }), [currentSession]);
};

const useSimpleQuotaData = () => {
  const { weeklyData } = useContext(DashboardContext);
  
  return useMemo(() => {
    const sonnetPercent = (weeklyData.sonnet / 432) * 100;
    const opusPercent = (weeklyData.opus / 36) * 100;
    const maxPercent = Math.max(sonnetPercent, opusPercent);
    
    return {
      ...weeklyData,
      status: maxPercent > 85 ? 'red' : maxPercent > 70 ? 'yellow' : 'green',
      statusText: maxPercent > 85 ? 'Critical' : maxPercent > 70 ? 'Warning' : 'Safe'
    };
  }, [weeklyData]);
};
```

## DELIVERABLES

### 1. Simple Mode Components
- **SimpleDashboard.tsx** - Main container with clean layout
- **SimpleStatusCard.tsx** - Current session with traffic light status
- **SimpleQuotaCard.tsx** - Weekly limits with visual indicators
- **SimpleHistoryCard.tsx** - Recent sessions (last 3-5)
- **SimpleActionsCard.tsx** - Quick action buttons

### 2. Mode Switching System  
- **ModeToggle.tsx** - Toggle component with smooth animations
- **User Preference Persistence** - localStorage for mode memory
- **Smooth Transitions** - CSS animations for mode switching
- **Context Preservation** - No data loss during mode changes

### 3. Responsive Design
- **Mobile Optimization** - Touch-friendly interface
- **Tablet Support** - Optimal layout for medium screens  
- **Desktop Enhancement** - Clean, focused desktop experience
- **Cross-browser Compatibility** - Modern browser support

### 4. Integration Layer
- **Data Hooks** - Custom hooks for simple mode data
- **API Compatibility** - Works with existing endpoints
- **Real-time Updates** - LiveSessionExtractor integration
- **Performance Optimization** - Efficient re-rendering

### 5. Documentation
- **Component Guide** - Usage and customization documentation
- **Design System** - Simple mode styling guidelines
- **Integration Guide** - How to add simple mode to existing dashboards

## TESTING REQUIREMENTS

### Component Testing
- Unit tests for all simple mode components
- Visual regression testing for layout consistency
- Performance testing for smooth mode switching

### Integration Testing
- Real-time data flow verification
- API endpoint compatibility
- Cross-browser functionality testing

### User Experience Testing
- Mode switching user flow
- Mobile touch interaction testing
- Accessibility compliance (WCAG 2.1)

## SUCCESS CRITERIA

### 1. ccusage-Inspired UX
- Clean, minimalist interface that feels familiar to CLI users
- Essential information prominently displayed
- Fast, scannable layout for quick status checks

### 2. Seamless Integration
- Perfect compatibility with existing dashboard
- No performance degradation
- Smooth mode switching without data loss

### 3. Professional Quality
- Consistent with existing design system
- Responsive across all device sizes
- Accessible and user-friendly

### 4. User Preference System
- Mode selection persists across sessions
- Easy discovery and switching
- Clear visual distinction between modes

## IMMEDIATE NEXT STEPS

1. **Create simple mode components** - Start with SimpleDashboard container
2. **Implement ModeToggle** - Add switching functionality to main dashboard
3. **Build SimpleStatusCard** - Current session display with traffic lights
4. **Create SimpleQuotaCard** - Weekly limits with visual indicators
5. **Add SimpleHistoryCard** - Recent sessions display
6. **Implement SimpleActionsCard** - Quick action buttons
7. **Style and polish** - Ensure ccusage-inspired minimalist design
8. **Test integration** - Verify with existing dashboard system

The result will be a toggle that transforms the professional dashboard into a clean, ccusage-inspired interface while maintaining all functionality and real-time capabilities.