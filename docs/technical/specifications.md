# 🔧 Technical Specifications: Claude Code Token Tracking

**Document**: Technical Implementation Details  
**System**: Real-Time Token Capture & Learning System  
**Date**: July 31, 2025  

---

## 🎯 **Custom Hook System Architecture**

### **Hook Interface Definition**
```typescript
// @types/claude-code-hooks.d.ts
declare namespace ClaudeCode {
  interface TokenTrackingHook {
    // Lifecycle hooks
    onSessionStart(sessionId: string, projectPath?: string): Promise<void>;
    onSessionEnd(sessionId: string, finalMetrics: SessionMetrics): Promise<void>;
    
    // Real-time token tracking
    onTokenUpdate(currentCount: number, increment: number, timestamp: Date): Promise<void>;
    onTokenMilestone(milestone: number, currentCount: number): Promise<void>;
    
    // Task management
    onTaskStart(taskId: string, description: string, estimate?: TaskEstimate): Promise<void>;
    onTaskComplete(taskId: string, outcome: TaskOutcome, metrics: TaskMetrics): Promise<void>;
    
    // Project events
    onProjectCheckpoint(checkpointData: CheckpointData): Promise<void>;
    onPhaseTransition(fromPhase: string, toPhase: string): Promise<void>;
  }

  interface SessionMetrics {
    totalTokens: number;
    sessionDuration: number; // minutes
    tasksCompleted: number;
    averageEfficiency: number; // tokens per minute
    peakEfficiency: number;
    modelUsed: string;
  }

  interface TaskEstimate {
    estimatedTokens: number;
    estimatedMinutes: number;
    complexity: 'simple' | 'medium' | 'complex';
    confidence: number; // 0-1
  }

  interface TaskOutcome {
    actualTokens: number;
    actualMinutes: number;
    success: boolean;
    quality: number; // 0-10
    notes?: string;
  }

  interface TaskMetrics {
    efficiency: number;
    tokenVariance: number;
    timeVariance: number;
    complexityRating: 'simple' | 'medium' | 'complex';
  }

  interface CheckpointData {
    checkpointId: string;
    timestamp: Date;
    cumulativeTokens: number;
    currentPhase: string;
    currentTask: string;
    notes?: string;
  }
}
```

### **Hook Registration System**
```typescript
// claude-code-token-tracker.ts
import { ClaudeCode } from '@types/claude-code-hooks';

class TokenTrackingHook implements ClaudeCode.TokenTrackingHook {
  private dataManager: TokenDataManager;
  private learningEngine: EstimationLearningEngine;
  private currentSession: SessionState;

  constructor(projectPath: string) {
    this.dataManager = new TokenDataManager(projectPath);
    this.learningEngine = new EstimationLearningEngine();
    this.currentSession = new SessionState();
  }

  async onSessionStart(sessionId: string, projectPath?: string): Promise<void> {
    console.log(`🚀 Token tracking started: ${sessionId}`);
    this.currentSession.start(sessionId, projectPath);
    
    // Load existing project data
    if (projectPath) {
      await this.dataManager.loadProject(projectPath);
    }
    
    // Generate initial estimates for planned tasks
    const plannedTasks = await this.dataManager.getPlannedTasks();
    for (const task of plannedTasks) {
      const estimate = await this.learningEngine.generateEstimate(task);
      await this.dataManager.storeEstimate(task.id, estimate);
    }
  }

  async onTokenUpdate(currentCount: number, increment: number, timestamp: Date): Promise<void> {
    // Real-time token tracking
    this.currentSession.updateTokens(currentCount, increment, timestamp);
    
    // Check for milestone alerts
    const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
    const previousCount = currentCount - increment;
    
    for (const milestone of milestones) {
      if (previousCount < milestone && currentCount >= milestone) {
        await this.onTokenMilestone(milestone, currentCount);
      }
    }
    
    // Auto-save current state
    await this.dataManager.updateCurrentState(this.currentSession.getState());
  }

  async onTokenMilestone(milestone: number, currentCount: number): Promise<void> {
    console.log(`🎯 Token milestone reached: ${milestone.toLocaleString()}`);
    
    // Calculate current efficiency
    const efficiency = this.currentSession.getCurrentEfficiency();
    const projectedTotal = this.calculateProjectedUsage(currentCount, efficiency);
    
    // Budget alert if needed
    if (projectedTotal > 1400000) { // Claude Max limit
      console.log(`⚠️  Budget alert: Projected usage ${projectedTotal.toLocaleString()} tokens`);
    }
    
    // Update tracking file
    await this.dataManager.updateMilestone(milestone, currentCount, efficiency);
  }

  async onTaskStart(taskId: string, description: string, estimate?: TaskEstimate): Promise<void> {
    console.log(`📋 Task started: ${taskId} - ${description}`);
    
    // Generate estimate if not provided
    if (!estimate) {
      estimate = await this.learningEngine.generateEstimate({
        id: taskId,
        description,
        context: this.currentSession.getContext()
      });
    }
    
    // Record task start
    this.currentSession.startTask(taskId, description, estimate);
    await this.dataManager.recordTaskStart(taskId, estimate);
  }

  async onTaskComplete(taskId: string, outcome: TaskOutcome, metrics: TaskMetrics): Promise<void> {
    console.log(`✅ Task completed: ${taskId}`);
    console.log(`📊 Tokens: ${outcome.actualTokens} | Time: ${outcome.actualMinutes} min | Efficiency: ${metrics.efficiency} tok/min`);
    
    // Complete task in session
    this.currentSession.completeTask(taskId, outcome, metrics);
    
    // Store completion data
    await this.dataManager.recordTaskCompletion(taskId, outcome, metrics);
    
    // Update learning model
    const taskData = this.currentSession.getTaskData(taskId);
    await this.learningEngine.updateFromCompletion(taskData);
    
    // Generate variance analysis
    const analysis = this.analyzeTaskVariance(taskData);
    console.log(`📈 Variance Analysis: ${JSON.stringify(analysis)}`);
    
    // Update tracking file
    await this.dataManager.updateTokenTracker(taskId, outcome, metrics, analysis);
  }

  async onProjectCheckpoint(checkpointData: CheckpointData): Promise<void> {
    console.log(`🔍 Checkpoint: ${checkpointData.checkpointId}`);
    
    // Store checkpoint data
    await this.dataManager.recordCheckpoint(checkpointData);
    
    // Generate progress report
    const progress = this.currentSession.getProgressReport();
    await this.dataManager.updateProgressReport(progress);
    
    // Update TOKEN_USAGE_TRACKER.md
    await this.dataManager.updateMarkdownTracker(checkpointData, progress);
  }

  async onSessionEnd(sessionId: string, finalMetrics: SessionMetrics): Promise<void> {
    console.log(`🏁 Session completed: ${sessionId}`);
    console.log(`📊 Final metrics: ${JSON.stringify(finalMetrics)}`);
    
    // Complete session
    this.currentSession.end(finalMetrics);
    
    // Store final session data
    await this.dataManager.recordSessionCompletion(sessionId, finalMetrics);
    
    // Generate final analysis
    const analysis = await this.generateSessionAnalysis(finalMetrics);
    await this.dataManager.storeFinalAnalysis(analysis);
    
    // Update learning models with session data
    await this.learningEngine.updateFromSession(this.currentSession.getAllData());
  }

  private analyzeTaskVariance(taskData: TaskData): VarianceAnalysis {
    const tokenVariance = (taskData.actual.tokens - taskData.estimate.tokens) / taskData.estimate.tokens;
    const timeVariance = (taskData.actual.minutes - taskData.estimate.minutes) / taskData.estimate.minutes;
    
    return {
      tokenVariance: Math.round(tokenVariance * 100), // percentage
      timeVariance: Math.round(timeVariance * 100),
      efficiencyRating: taskData.actual.tokens / taskData.actual.minutes,
      accuracyScore: this.calculateAccuracyScore(tokenVariance, timeVariance),
      improvementSuggestions: this.generateImprovementSuggestions(taskData)
    };
  }

  private calculateProjectedUsage(currentTokens: number, efficiency: number): number {
    const remainingTasks = this.currentSession.getRemainingTasks();
    const estimatedRemainingTokens = remainingTasks.reduce((sum, task) => sum + task.estimatedTokens, 0);
    return currentTokens + estimatedRemainingTokens;
  }
}

// Registration function
export function registerTokenTracking(claudeCode: any, projectPath: string): void {
  const hook = new TokenTrackingHook(projectPath);
  claudeCode.registerHook('token-tracking', hook);
  console.log('🎯 Token tracking hook registered successfully');
}
```

---

## 💬 **Slash Command System**

### **Command Registry Implementation**
```typescript
// slash-commands.ts
interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[], context: CommandContext) => Promise<string>;
}

class TokenTrackingCommands {
  private tracker: TokenTrackingHook;
  private dataManager: TokenDataManager;

  constructor(tracker: TokenTrackingHook, dataManager: TokenDataManager) {
    this.tracker = tracker;
    this.dataManager = dataManager;
  }

  getCommands(): SlashCommand[] {
    return [
      {
        name: '/track-start',
        description: 'Start token tracking for a project phase',
        usage: '/track-start <project> <phase> <task>',
        handler: this.handleTrackStart.bind(this)
      },
      {
        name: '/track-checkpoint',
        description: 'Capture current token usage checkpoint',
        usage: '/track-checkpoint <task-id> [notes]',
        handler: this.handleTrackCheckpoint.bind(this)
      },
      {
        name: '/track-estimate',
        description: 'Set or update task estimates',
        usage: '/track-estimate <task-id> <tokens> <minutes> [complexity]',
        handler: this.handleTrackEstimate.bind(this)
      },
      {
        name: '/track-complete',
        description: 'Mark task as complete with actual metrics',
        usage: '/track-complete <task-id> <actual-tokens> <actual-minutes> [quality]',
        handler: this.handleTrackComplete.bind(this)
      },
      {
        name: '/track-compare',
        description: 'Compare estimates vs actuals for task type',
        usage: '/track-compare <task-type> [time-period]',
        handler: this.handleTrackCompare.bind(this)
      },
      {
        name: '/track-report',
        description: 'Generate comprehensive tracking report',
        usage: '/track-report [project] [format]',
        handler: this.handleTrackReport.bind(this)
      },
      {
        name: '/track-learn',
        description: 'Update estimation algorithms with new data',
        usage: '/track-learn [task-type]',
        handler: this.handleTrackLearn.bind(this)
      },
      {
        name: '/track-export',
        description: 'Export tracking data in specified format',
        usage: '/track-export <format> [project]',
        handler: this.handleTrackExport.bind(this)
      },
      {
        name: '/track-status',
        description: 'Show current tracking status and budget',
        usage: '/track-status',
        handler: this.handleTrackStatus.bind(this)
      },
      {
        name: '/track-config',
        description: 'Configure tracking settings',
        usage: '/track-config <setting> <value>',
        handler: this.handleTrackConfig.bind(this)
      }
    ];
  }

  private async handleTrackStart(args: string[], context: CommandContext): Promise<string> {
    const [project, phase, task] = args;
    
    if (!project || !phase || !task) {
      return '❌ Usage: /track-start <project> <phase> <task>';
    }

    // Initialize tracking
    await this.tracker.onSessionStart(context.sessionId, context.projectPath);
    await this.tracker.onTaskStart(task, `${phase} - ${task}`);
    
    return `✅ Started tracking: ${project} > Phase ${phase} > Task ${task}`;
  }

  private async handleTrackCheckpoint(args: string[], context: CommandContext): Promise<string> {
    const [taskId, ...notesParts] = args;
    const notes = notesParts.join(' ');
    
    if (!taskId) {
      return '❌ Usage: /track-checkpoint <task-id> [notes]';
    }

    // Capture current state
    const currentTokens = context.getCurrentTokenCount();
    const checkpointData: CheckpointData = {
      checkpointId: `${taskId}-${Date.now()}`,
      timestamp: new Date(),
      cumulativeTokens: currentTokens,
      currentPhase: context.currentPhase,
      currentTask: taskId,
      notes
    };

    await this.tracker.onProjectCheckpoint(checkpointData);
    
    return `📊 Checkpoint captured: ${taskId} - ${currentTokens.toLocaleString()} tokens`;
  }

  private async handleTrackCompare(args: string[], context: CommandContext): Promise<string> {
    const [taskType, timePeriod = 'all'] = args;
    
    if (!taskType) {
      return '❌ Usage: /track-compare <task-type> [time-period]';
    }

    // Generate comparison report
    const comparison = await this.dataManager.generateComparisonReport(taskType, timePeriod);
    
    return `📈 Estimation Accuracy for ${taskType}:
    
**Average Variance:**
• Tokens: ${comparison.avgTokenVariance}%
• Time: ${comparison.avgTimeVariance}%

**Improvement Trend:**
• Last 10 tasks: ${comparison.recentAccuracy}%
• Overall accuracy: ${comparison.overallAccuracy}%

**Recommendations:**
${comparison.recommendations.map(r => `• ${r}`).join('\n')}`;
  }

  private async handleTrackStatus(args: string[], context: CommandContext): Promise<string> {
    const status = await this.dataManager.getCurrentStatus();
    const currentTokens = context.getCurrentTokenCount();
    const budgetUsed = (currentTokens / 1400000) * 100;
    
    return `📊 **Token Tracking Status**
    
**Current Session:**
• Tokens Used: ${currentTokens.toLocaleString()}
• Budget Consumed: ${budgetUsed.toFixed(2)}%
• Session Duration: ${status.sessionDuration} minutes
• Current Efficiency: ${status.currentEfficiency} tok/min

**Project Progress:**
• Phase: ${status.currentPhase}
• Task: ${status.currentTask}
• Tasks Completed: ${status.tasksCompleted}
• Estimated Remaining: ${status.estimatedRemaining.toLocaleString()} tokens

**Accuracy Metrics:**
• Recent Estimate Accuracy: ${status.recentAccuracy}%
• Learning Confidence: ${status.learningConfidence}%`;
  }
}

// Command registration
export function registerSlashCommands(claudeCode: any, tracker: TokenTrackingHook): void {
  const commands = new TokenTrackingCommands(tracker, tracker.dataManager);
  
  for (const command of commands.getCommands()) {
    claudeCode.registerCommand(command.name, command.handler);
  }
  
  console.log('💬 Token tracking slash commands registered');
}
```

---

## 📊 **Data Management System**

### **Token Data Manager**
```typescript
// token-data-manager.ts
interface ProjectData {
  projectId: string;
  projectName: string;
  createdAt: Date;
  phases: PhaseData[];
  totalEstimatedTokens: number;
  totalActualTokens: number;
  overallAccuracy: number;
}

interface PhaseData {
  phaseId: string;
  phaseName: string;
  tasks: TaskData[];
  estimatedTokens: number;
  actualTokens: number;
  startTime: Date;
  endTime?: Date;
}

interface TaskData {
  taskId: string;
  description: string;
  taskType: string;
  estimate: TaskEstimate;
  actual?: TaskActual;
  variance?: VarianceAnalysis;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
}

class TokenDataManager {
  private projectPath: string;
  private dataFile: string;
  private trackerFile: string;
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.dataFile = path.join(projectPath, '.claude-code', 'token-data.json');
    this.trackerFile = path.join(projectPath, 'TOKEN_USAGE_TRACKER.md');
  }

  async loadProject(projectPath: string): Promise<ProjectData> {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = await fs.readFile(this.dataFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log(`Creating new project data for ${projectPath}`);
    }
    
    // Create new project
    const projectData: ProjectData = {
      projectId: uuidv4(),
      projectName: path.basename(projectPath),
      createdAt: new Date(),
      phases: [],
      totalEstimatedTokens: 0,
      totalActualTokens: 0,
      overallAccuracy: 0
    };
    
    await this.saveProjectData(projectData);
    return projectData;
  }

  async updateTokenTracker(taskId: string, outcome: TaskOutcome, metrics: TaskMetrics, analysis: VarianceAnalysis): Promise<void> {
    // Update the TOKEN_USAGE_TRACKER.md file with real data
    const template = await this.generateTrackerMarkdown(taskId, outcome, metrics, analysis);
    await fs.writeFile(this.trackerFile, template, 'utf8');
    
    console.log(`✅ Updated TOKEN_USAGE_TRACKER.md with task ${taskId} data`);
  }

  private async generateTrackerMarkdown(taskId: string, outcome: TaskOutcome, metrics: TaskMetrics, analysis: VarianceAnalysis): Promise<string> {
    const projectData = await this.loadProject(this.projectPath);
    const currentTask = this.findTask(projectData, taskId);
    
    return `# 🎯 PROJECT TOKEN USAGE TRACKER - REAL DATA
**Project**: ${projectData.projectName}  
**Budget**: $100 Claude Max Plan (~1.4M tokens estimated)  
**Start Date**: ${projectData.createdAt.toDateString()}  
**Last Updated**: ${new Date().toLocaleString()} - by Automated Token Tracker

## 📈 **Live Dashboard - ACTUAL vs ESTIMATED**

### **Current Status**
| Metric | Value | Target | Variance |
|--------|--------|--------|----------|
| **Total Tokens Used** | ${projectData.totalActualTokens.toLocaleString()} | 1,400,000 | ${(1400000 - projectData.totalActualTokens).toLocaleString()} remaining |
| **Budget Consumed** | ${((projectData.totalActualTokens / 1400000) * 100).toFixed(2)}% | 100% | ${(100 - (projectData.totalActualTokens / 1400000) * 100).toFixed(2)}% remaining |
| **Estimation Accuracy** | ${projectData.overallAccuracy.toFixed(1)}% | 90%+ | ${(projectData.overallAccuracy - 90).toFixed(1)}% variance |
| **Current Task** | ${taskId} | - | ${outcome.success ? '✅ Complete' : '🔄 In Progress'} |

### **Latest Task Analysis**
**Task ${taskId}**:
- **Estimated**: ${currentTask?.estimate.estimatedTokens.toLocaleString()} tokens, ${currentTask?.estimate.estimatedMinutes} min
- **Actual**: ${outcome.actualTokens.toLocaleString()} tokens, ${outcome.actualMinutes} min  
- **Variance**: ${analysis.tokenVariance}% tokens, ${analysis.timeVariance}% time
- **Efficiency**: ${metrics.efficiency} tokens/minute
- **Accuracy Score**: ${analysis.accuracyScore}/10

---

## 📊 **Estimation vs Actual Comparison**

${this.generatePhaseComparisonTable(projectData)}

---

## 🎯 **Learning Insights**

### **Pattern Recognition**
${this.generatePatternInsights(projectData)}

### **Estimation Improvements**
${this.generateImprovementSuggestions(analysis)}

---

*Real-time data captured with automated learning for improved future estimates*
*Next update: Task completion or checkpoint trigger*`;
  }

  private generatePhaseComparisonTable(projectData: ProjectData): string {
    return projectData.phases.map(phase => {
      const tasks = phase.tasks.filter(t => t.status === 'completed');
      const totalEstimated = tasks.reduce((sum, t) => sum + t.estimate.estimatedTokens, 0);
      const totalActual = tasks.reduce((sum, t) => sum + (t.actual?.tokens || 0), 0);
      const variance = totalEstimated > 0 ? ((totalActual - totalEstimated) / totalEstimated * 100) : 0;
      
      return `### **${phase.phaseName}**
| Task | Estimated | Actual | Variance | Efficiency | Status |
|------|-----------|--------|----------|------------|--------|
${tasks.map(task => 
  `| ${task.taskId} | ${task.estimate.estimatedTokens.toLocaleString()} | ${task.actual?.tokens.toLocaleString() || 'N/A'} | ${task.variance?.tokenVariance || 'N/A'}% | ${task.variance?.efficiencyRating.toFixed(0) || 'N/A'} tok/min | ${task.status === 'completed' ? '✅' : '🔄'} |`
).join('\n')}

**Phase Total**: Est. ${totalEstimated.toLocaleString()} | Act. ${totalActual.toLocaleString()} | Var. ${variance.toFixed(1)}%`;
    }).join('\n\n');
  }
}
```

---

## 🚀 **Quick Implementation Guide**

### **Step 1: Research Claude Code Integration**
```bash
# Research Claude Code's architecture
# Look for plugin/hook systems
# Check API documentation
# Contact Anthropic support if needed
```

### **Step 2: Create Prototype**
```typescript
// Create basic token capture prototype
// Test different integration approaches
// Validate data capture accuracy
// Measure performance impact
```

### **Step 3: Build Core System**
```typescript
// Implement hook registration
// Create data management system
// Build slash command interface
// Add learning algorithms
```

### **Step 4: Testing & Refinement**
```typescript
// Test with starter-stacks project
// Validate estimation improvements
// Refine learning algorithms
// Optimize performance
```

---

**This technical specification provides the foundation for building a comprehensive token tracking system that learns and improves estimation accuracy over time.** 🎯

*Document Version: 1.0*  
*Next Update: After Claude Code integration research*
