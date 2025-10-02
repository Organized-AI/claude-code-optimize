# Claude Code Optimizer - Specialized Agents

This document defines the specialized Task agents available in the Claude Code Optimizer project. These agents can be invoked using the Task tool with specific `subagent_type` parameters.

---

## 🔍 gap-analysis-validator

**Purpose**: Validates session handoffs and completion documents by comparing planned objectives against actual implementation.

**When to Use**:
- Automatically after creating `SESSION_*_HANDOFF.md` files
- After creating `SESSION_*_COMPLETE.md` files
- Before starting a new session to verify prerequisites
- When you suspect features were missed or incomplete

**What It Does**:
1. **Reads Planning Documents**: SESSION_*_PLAN.md, SESSION_*_REVISED_APPROACH.md
2. **Analyzes Implementation**: Reviews actual code files created/modified
3. **Compares Planned vs Built**: Identifies gaps, missing features, incomplete work
4. **Finds Critical Issues**: Bugs, data mismatches, hardcoded values, broken integrations
5. **Generates Next Session Plan**: Creates detailed SESSION_N+1_PLAN.md with remediation steps
6. **Validates Success Criteria**: Checks if session goals were actually met

**Validation Checks**:
- ✅ Were all planned files created?
- ✅ Are all features from the plan implemented?
- ✅ Do implementations match the design specs?
- ✅ Are there any hardcoded values that should be dynamic?
- ✅ Do data structures match between components?
- ✅ Are all event handlers properly wired?
- ✅ Is there any mock data that needs real sources?
- ✅ Are there TODO comments or unfinished code?
- ✅ Do success criteria pass validation?

**Example Usage**:
```javascript
// After creating SESSION_9_HANDOFF.md
Task({
  subagent_type: 'gap-analysis-validator',
  description: 'Validate Session 9 handoff',
  prompt: `
    Validate the Session 9 handoff and create Session 10 plan.

    Session to validate: 9
    Handoff document: SESSION_9_HANDOFF.md

    Perform complete gap analysis:
    1. Read all Session 9 planning docs
    2. Review actual implementation files
    3. Identify gaps and issues
    4. Create SESSION_10_PLAN.md with remediation
  `
});
```

**Output**:
- Creates `SESSION_N+1_PLAN.md` with comprehensive gap analysis
- Reports critical issues found
- Categorizes missing features by priority
- Provides token/time estimates for fixes
- Includes ready-to-use kickoff prompt for next session

**Tools Available**: Read, Write, Edit, Grep, Glob, Bash (for git operations)

---

## 📊 analytics-insights-specialist

**Purpose**: Analyzes Claude Code usage patterns, generates insights from session data, creates predictive models for rate limit management.

**When to Use**:
- Understanding Claude Code usage patterns
- Getting optimization recommendations
- Predicting rate limits based on current usage
- Comparative analytics vs community averages
- Effectiveness scoring and trend analysis

**What It Does**:
- Analyzes usage patterns from session history
- Generates personalized optimization recommendations
- Creates predictive models for rate limit planning
- Provides comparative analytics against benchmarks
- Builds effectiveness scoring systems

**Example Usage**:
```javascript
Task({
  subagent_type: 'analytics-insights-specialist',
  description: 'Analyze usage patterns',
  prompt: 'Analyze my Claude Code usage patterns and provide optimization recommendations'
});
```

**Tools Available**: *, Grep, Glob, Bash, Read

---

## 🔧 dependency-validator-installer

**Purpose**: Validates, installs, and manages all system dependencies, Python packages, Node.js modules, and external service requirements.

**When to Use**:
- **FIRST** before any other agents or deployment
- Setting up new environments
- Troubleshooting deployment failures
- Before parallel agent execution
- When experiencing integration issues

**What It Does**:
- Validates all system dependencies
- Installs missing packages automatically
- Checks for version conflicts
- Verifies API connectivity
- Creates dependency health reports

**Example Usage**:
```javascript
Task({
  subagent_type: 'dependency-validator-installer',
  description: 'Validate dependencies',
  prompt: 'Validate and install all dependencies for Claude Code Optimizer deployment'
});
```

**Tools Available**: *, Bash, Read, Write

---

## 🚀 netlify-sync-specialist

**Purpose**: Establishes, configures, and troubleshoots data synchronization between local applications and Netlify-hosted dashboards.

**When to Use**:
- Setting up webhooks between localhost and Netlify
- Implementing authentication for data sync
- Handling CORS issues
- Creating fallback mechanisms
- Real-time data flow from localhost to production

**What It Does**:
- Sets up webhook infrastructure
- Implements bidirectional sync
- Handles CORS configuration
- Creates authentication layers
- Establishes real-time data flow

**Example Usage**:
```javascript
Task({
  subagent_type: 'netlify-sync-specialist',
  description: 'Sync localhost to Netlify',
  prompt: 'Implement bidirectional sync between local tracker and Netlify dashboard'
});
```

**Tools Available**: *, Bash, Read, Write, Edit

---

## 📅 calendar-integration-specialist

**Purpose**: Integrates calendar functionality for session planning, creates calendar events, handles timezone conversions, and automated scheduling.

**When to Use**:
- Scheduling coding sessions within rate limit blocks
- Creating iCal exports for sessions
- Setting up recurring session templates
- Timezone conversion for global teams
- Automated scheduling systems

**What It Does**:
- Google Calendar API integration
- iCal file generation
- Timezone handling
- Recurring event templates
- Session boundary sync

**Example Usage**:
```javascript
Task({
  subagent_type: 'calendar-integration-specialist',
  description: 'Schedule coding sessions',
  prompt: 'Create weekly recurring sessions for planning, coding, testing, and polish phases'
});
```

**Tools Available**: *, Bash, Read, Write

---

## 📖 model-selection-optimizer

**Purpose**: Analyzes task complexity and recommends optimal Claude model (Sonnet vs Opus) for cost-effective usage.

**When to Use**:
- **Before executing tasks** to determine appropriate model
- Reviewing usage patterns for optimization opportunities
- Generating cost analytics and projections
- Analyzing whether Opus is justified for complex tasks

**What It Does**:
- Evaluates task complexity
- Recommends Sonnet vs Opus
- Analyzes historical usage patterns
- Identifies cost-saving opportunities
- Generates cost projections

**Example Usage**:
```javascript
Task({
  subagent_type: 'model-selection-optimizer',
  description: 'Optimize model selection',
  prompt: 'Analyze this architecture design task and recommend Sonnet vs Opus'
});
```

**Tools Available**: *, Read, Grep

---

## 🎯 General Usage Guidelines

### When to Use Task Agents

**DO use Task agents when**:
- Task requires multiple steps and complex reasoning
- You need specialized domain knowledge
- Search requires multiple rounds of iteration
- Want automated validation and quality checks
- Need comprehensive analysis across many files

**DON'T use Task agents when**:
- Reading a specific known file path (use Read instead)
- Searching for specific class definition (use Glob instead)
- Searching within 2-3 specific files (use Read + Grep instead)
- Simple one-step operations

### Best Practices

1. **Launch Multiple Agents in Parallel**: When tasks are independent, use a single message with multiple Task calls
2. **Provide Clear Objectives**: Specify exactly what you want the agent to accomplish
3. **Specify Output Format**: Tell the agent what to return and where to save results
4. **Trust Agent Outputs**: Agents are designed to be autonomous and thorough
5. **Use Proactively**: Don't wait for issues - run gap-analysis-validator after every handoff

### Example: Parallel Agent Execution

```javascript
// Launch multiple agents in a single message
[
  Task({
    subagent_type: 'gap-analysis-validator',
    description: 'Validate Session 9',
    prompt: 'Validate SESSION_9_HANDOFF.md and create SESSION_10_PLAN.md'
  }),
  Task({
    subagent_type: 'dependency-validator-installer',
    description: 'Validate dependencies',
    prompt: 'Ensure all dependencies are installed for Session 10'
  })
]
```

---

## 🔄 Agent Workflow Patterns

### End-of-Session Workflow

```
1. Create handoff document (SESSION_N_HANDOFF.md)
2. Launch gap-analysis-validator agent
3. Review gap analysis output
4. Commit handoff + next session plan
5. (Optional) Launch dependency-validator-installer for next session
```

### Start-of-Session Workflow

```
1. Read SESSION_N_HANDOFF.md
2. Read SESSION_N_PLAN.md (from gap analysis)
3. Launch dependency-validator-installer if needed
4. Follow plan implementation phases
5. Create SESSION_N_COMPLETE.md when done
6. Launch gap-analysis-validator for SESSION_N+1
```

### Continuous Improvement Workflow

```
Weekly:
- Launch analytics-insights-specialist
- Review usage patterns
- Apply optimization recommendations

Monthly:
- Launch model-selection-optimizer
- Review cost analytics
- Adjust model usage strategy
```

---

**Last Updated**: 2025-10-02
**Agents Defined**: 6 specialized agents
**Status**: Active and ready for use

**Note**: These agents are designed to work autonomously. Provide clear prompts with specific objectives and let them work. Trust the analysis and recommendations they provide.
