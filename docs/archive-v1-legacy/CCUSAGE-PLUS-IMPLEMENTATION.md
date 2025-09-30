# 🎯 Claude Code Optimizer: ccusage Plus Implementation

**Mission:** Transform your excellent Claude Code foundation into "ccusage with superpowers"

**Philosophy:** ccusage simplicity + essential power features = maximum daily value

---

## 🔥 ONE-WEEK IMPLEMENTATION PLAN

### **What You Have (Excellent Foundation!)** ✅
- Professional React dashboard with real-time monitoring
- ccusage-compatible API endpoints (`/api/reports/daily`, `/api/reports/weekly`)
- Comprehensive SQLite session tracking database
- 5-hour block detection and weekly quota management
- LiveSessionExtractor with WebSocket real-time updates

### **What to Add (Simple but Powerful)** 🎯
- Enhanced CLI that feels exactly like ccusage but with planning features
- Simple project complexity detection using file analysis (no AI)
- Traffic light weekly quota system (🟢🟡🔴)
- Dashboard "Simple Mode" toggle for ccusage-style minimalist view
- Basic session optimization recommendations

---

## 📋 IMPLEMENTATION CHECKLIST

### **Day 1-2: Enhanced CLI Foundation**
```bash
# Create src/cli/cco.py - ccusage-compatible with power features
□ cco daily                    # ccusage compatible + efficiency metrics
□ cco weekly                   # ccusage compatible + quota warnings  
□ cco sessions                 # ccusage compatible + project grouping
□ cco status                   # Current session + block remaining time
□ cco --format json            # JSON output for automation
```

### **Day 2-3: Essential Power Commands**
```bash
# Add planning features without complexity
□ cco limits                   # 🟢🟡🔴 Weekly quota traffic lights
□ cco plan [project-path]      # Simple project analysis (file count + languages)
□ cco recommend [task-desc]    # Rule-based model selection
□ cco optimize                 # Session efficiency tips from data
□ cco blocks                   # 5-hour block status and recommendations
```

### **Day 3-4: Simple Planning Logic**
```python
# Create src/planning/simple_rules.py - No AI, just good heuristics
□ Project complexity detection (file count, languages, frameworks)
□ Weekly quota traffic light system using existing data
□ Basic model recommendations based on task patterns
□ Session timing suggestions based on historical efficiency
□ 5-hour block optimization with break recommendations
```

### **Day 4-5: Dashboard Simple Mode**
```typescript
# Add to existing dashboard - toggle between modes
□ Simple Mode toggle button on existing dashboard
□ Minimalist view inspired by ccusage terminal output
□ Essential metrics: current session, weekly status, quick actions
□ Preserve existing advanced dashboard for power users
```

---

## 🛠️ TECHNICAL IMPLEMENTATION

### **CLI Structure (Uses Existing APIs)**
```python
# src/cli/cco.py
import click
import requests
from rich.console import Console
from rich.table import Table

@click.group()
def cli():
    """Claude Code Optimizer - ccusage with superpowers"""

@cli.command()
@click.option('--format', default='table')
def daily(format):
    """Daily usage report - ccusage compatible + efficiency"""
    # Use existing /api/reports/daily endpoint
    data = requests.get('http://localhost:3001/api/reports/daily').json()
    
    if format == 'json':
        print(json.dumps(data, indent=2))
    else:
        # ccusage-style table output with efficiency metrics
        display_daily_table(data)

@cli.command()
def limits():
    """🟢🟡🔴 Weekly quota status with traffic lights"""
    # Use existing /api/limits/weekly endpoint
    quota = requests.get('http://localhost:3001/api/limits/weekly').json()
    display_traffic_light_status(quota)

@cli.command()
@click.argument('project_path', required=False, default='.')
def plan(project_path):
    """Simple project planning with file-based analysis"""
    analyzer = SimpleProjectAnalyzer()
    complexity = analyzer.analyze(project_path)
    display_project_plan(complexity)
```

### **Simple Planning Logic (No AI)**
```python
# src/planning/simple_rules.py
class SimpleProjectAnalyzer:
    def analyze(self, project_path):
        """Simple heuristics-based project analysis"""
        files = self._count_files(project_path)
        languages = self._detect_languages(project_path)
        frameworks = self._detect_frameworks(project_path)
        
        complexity_score = 0
        complexity_score += min(files // 10, 5)  # File count factor
        complexity_score += min(len(languages) - 1, 3)  # Language diversity
        complexity_score += len(frameworks)  # Framework complexity
        
        if complexity_score >= 6:
            return {
                'level': 'complex',
                'estimated_hours': '4-6 hours',
                'recommended_model': 'opus',
                'suggested_sessions': 2,
                'reasoning': f'{files} files, {len(languages)} languages'
            }
        elif complexity_score >= 3:
            return {
                'level': 'medium', 
                'estimated_hours': '2-4 hours',
                'recommended_model': 'sonnet',
                'suggested_sessions': 1,
                'reasoning': f'{files} files, moderate complexity'
            }
        else:
            return {
                'level': 'simple',
                'estimated_hours': '1-2 hours',
                'recommended_model': 'sonnet', 
                'suggested_sessions': 1,
                'reasoning': f'{files} files, straightforward'
            }

class SimpleQuotaManager:
    def get_traffic_light_status(self):
        """Simple traffic light system for weekly quotas"""
        # Use existing database/API to get usage
        usage = self._get_weekly_usage()
        
        sonnet_percent = usage['sonnet_hours'] / 432 * 100
        opus_percent = usage['opus_hours'] / 36 * 100
        max_percent = max(sonnet_percent, opus_percent)
        
        if max_percent > 85:
            return {
                'status': '🔴 RED',
                'message': 'Critical - Use with extreme caution',
                'recommendation': 'Switch to Haiku for simple tasks'
            }
        elif max_percent > 70:
            return {
                'status': '🟡 YELLOW', 
                'message': 'Warning - Plan sessions carefully',
                'recommendation': 'Prefer Sonnet over Opus'
            }
        else:
            return {
                'status': '🟢 GREEN',
                'message': 'Safe - Normal usage recommended',
                'recommendation': 'All models available'
            }
```

### **Dashboard Simple Mode**
```typescript
// Add to existing ClaudeCodeDashboard.tsx
const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

return (
  <div className="claude-dashboard">
    <div className="dashboard-header">
      <h1>Claude Code Optimizer</h1>
      <ModeToggle 
        mode={viewMode} 
        onChange={setViewMode}
        labels={{ simple: '📊 Simple', advanced: '🔧 Advanced' }}
      />
    </div>
    
    {viewMode === 'simple' ? <SimpleDashboard /> : <AdvancedDashboard />}
  </div>
);

// components/SimpleDashboard.tsx - ccusage-inspired view
const SimpleDashboard: React.FC = () => {
  const { currentSession, weeklyQuota } = useDashboardData();
  
  return (
    <div className="simple-dashboard">
      {/* Current Session Status */}
      <div className="simple-card">
        <h3>Current Session</h3>
        <div className="status-line">
          {currentSession.isActive ? '🟢' : '⚪'} 
          {currentSession.duration}h | {currentSession.model} | 
          {currentSession.tokens.toLocaleString()} tokens
        </div>
      </div>
      
      {/* Weekly Quota Status */}
      <div className="simple-card">
        <h3>Weekly Limits</h3>
        <div className="quota-line">
          {weeklyQuota.trafficLight} {weeklyQuota.message}
        </div>
        <div className="quota-details">
          Sonnet: {weeklyQuota.sonnet}h/432h | Opus: {weeklyQuota.opus}h/36h
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="simple-card">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => runCLI('cco plan')}>📋 Plan Session</button>
          <button onClick={() => runCLI('cco limits')}>⚡ Check Limits</button>
          <button onClick={() => runCLI('cco optimize')}>🎯 Optimize</button>
          <button onClick={() => setViewMode('advanced')}>🔧 Advanced View</button>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎯 SUCCESS CRITERIA

### **User Experience**
- ✅ CLI feels exactly like ccusage (familiar commands, output format)
- ✅ New features discoverable but not overwhelming
- ✅ <1 second response time for all commands
- ✅ Simple Mode dashboard scannable in <5 seconds

### **Technical Excellence**  
- ✅ Uses existing API infrastructure (no duplicate logic)
- ✅ Rule-based logic that's predictable and debuggable
- ✅ Clean separation between simple and advanced features
- ✅ Maintains existing dashboard functionality

### **Daily Value**
- ✅ Provides quota alerts before hitting limits
- ✅ Gives realistic project time estimates
- ✅ Suggests optimal model for common tasks
- ✅ Helps optimize session efficiency

---

## 🚀 IMPLEMENTATION COMMAND

```bash
cd "/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

claude --dangerously-skip-permissions

Build "ccusage Plus" - Claude Code Optimizer with ccusage simplicity + essential power features.

FOUNDATION (You have this - excellent!):
✅ Professional dashboard with real-time monitoring
✅ ccusage-compatible API endpoints 
✅ Comprehensive session tracking database
✅ Weekly quota management system

GOAL: Add ccusage-style CLI + simple planning features

WEEK 1 TASKS:
1. Enhanced CLI (src/cli/cco.py):
   - ccusage-compatible commands (daily/weekly/sessions/status)
   - Power features (limits/plan/recommend/optimize/blocks)
   - Rich terminal output with tables and colors
   - JSON format support for automation

2. Simple Planning (src/planning/simple_rules.py):
   - Project complexity detection (file count + language patterns)
   - Traffic light quota system (🟢🟡🔴)
   - Basic model recommendations (rule-based, not AI)
   - Session optimization tips from existing data

3. Dashboard Simple Mode:
   - Toggle between Simple/Advanced modes
   - ccusage-inspired minimalist view  
   - Essential metrics only
   - Quick action buttons

KEEP SIMPLE:
❌ No AI/ML complexity
❌ No calendar integration  
❌ No advanced automation
❌ No setup friction

PHILOSOPHY: "ccusage with superpowers"
- Familiar ccusage interface
- Essential planning features
- Maximum daily value
- Zero learning curve

Use organized codebase templates and ensure everything integrates with existing APIs and dashboard infrastructure.
```

---

This approach is **much better** because it:

1. **Builds on your excellent foundation** instead of starting over
2. **Respects ccusage philosophy** - simplicity that works
3. **Focuses on daily utility** - features you'll actually use
4. **Avoids complexity traps** - no AI overkill or feature creep  
5. **Maximizes adoption** - familiar interface with immediate value

The result: **"ccusage that magically knows about Claude Code optimization"** 🎯