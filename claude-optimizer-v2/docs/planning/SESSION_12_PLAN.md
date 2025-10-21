# Session 12: Calendar Integration Automation & CLI Workflow

**Status**: 🟢 READY TO START
**Estimated Time**: 3-4 hours
**Estimated Tokens**: 55-75k tokens (28-38% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 125-145k buffer)
**Prerequisites**: Phase 1 iCal validation complete (SESSION 11)
**Created**: 2025-10-21
**Model**: Haiku 4.5 (cost-effective for CLI/automation work)

---

## Executive Summary

**Current State** (Post-Phase 1):
- ✅ iCal export generates RFC 5545-compliant files
- ✅ Session timing tracked via SessionMonitor (5-hour windows)
- ✅ Token usage tracked via QuotaTracker (rolling 5-hour limit)
- ✅ SmartSessionPlanner creates sessions with token budgets
- ✅ Validation framework ensures quality

**What's Missing**:
- ❌ No CLI command to schedule sessions from plans
- ❌ Token-to-hours conversion not calibrated
- ❌ Calendar events don't auto-update when quota changes
- ❌ No unified workflow from "analyze project" → "calendar"
- ❌ Session plans (SESSION_X_PLAN.md) not connected to calendar

**This Session Delivers**:
- ✅ `calendar schedule SESSION_10_PLAN` - Direct CLI scheduling
- ✅ Calibrated token-to-hours estimates based on real data
- ✅ Auto-update calendar when sessions rescheduled
- ✅ Unified workflow: analyze → plan → schedule → export
- ✅ Integration tests for full calendar pipeline
- ✅ User documentation with practical examples

---

## Session Objectives

1. **CLI Calendar Commands** - Complete the calendar workflow
2. **Token Budget Calibration** - Accurate time estimates from token budgets
3. **Auto-Update Mechanism** - Dynamic calendar event updates
4. **SESSION Plan Integration** - Direct scheduling from markdown plans
5. **Testing Framework** - Automated tests for calendar + quota
6. **Documentation** - End-to-end user guide

---

## Phase Breakdown

### Phase 1: CLI Calendar Scheduling (45 min, 12-18k tokens)

**Objective**: Enable direct scheduling of SESSION plans via CLI

**Implementation**:

1. **Create `src/commands/calendar-schedule.ts`**
   ```typescript
   // Usage: node dist/cli.js calendar schedule SESSION_10_PLAN
   export async function calendarSchedule(planName: string, options?: {
     startTime?: Date;
     duration?: number;  // Override auto-calculated duration
     exportIcal?: boolean;
   }) {
     // 1. Find and parse SESSION plan
     const plan = await findSessionPlan(planName);
     const metadata = await parseSessionPlanMetadata(plan);

     // 2. Check quota availability
     const quotaCheck = quotaTracker.canStartSession(metadata.estimatedTokens);

     // 3. Schedule or start immediately
     if (quotaCheck.canStart) {
       console.log('✅ Quota available - session can start now');
     } else {
       console.log(`⏰ Scheduling for ${quotaCheck.scheduleFor}`);
     }

     // 4. Create calendar event
     const event = await calendarService.createEventFromPlan(metadata, startTime);

     // 5. Optionally export to .ics
     if (options?.exportIcal) {
       await calendarService.exportToIcal(`${planName}.ics`);
     }

     return event;
   }
   ```

2. **Create `src/session-plan-parser.ts`**
   ```typescript
   export interface SessionPlanMetadata {
     name: string;              // 'SESSION_10_PLAN'
     title: string;             // Extracted from # heading
     estimatedHours: number;    // From **Estimated Time**
     estimatedTokens: number;   // From **Estimated Tokens**
     objectives: string[];      // Extracted from objectives section
     prerequisites: string[];   // From **Prerequisites**
     phase: string;             // Planning/Implementation/Testing/Polish
   }

   export async function findSessionPlan(name: string): Promise<string> {
     // Search in docs/planning/SESSION_X_PLAN.md
     const possiblePaths = [
       `docs/planning/${name}.md`,
       `docs/planning/${name}_PLAN.md`,
       `docs/sessions/${name}.md`
     ];
     // ... find and return file path
   }

   export async function parseSessionPlanMetadata(path: string): Promise<SessionPlanMetadata> {
     // Parse markdown file for metadata
     // Extract time/token estimates from frontmatter or headers
     // Extract objectives list
     // Return structured metadata
   }
   ```

3. **Update `src/cli.ts`**
   ```typescript
   // Add calendar schedule command
   .command('calendar schedule <plan>')
   .description('Schedule a session from a SESSION plan')
   .option('-t, --time <time>', 'Start time (default: now or next available)')
   .option('-d, --duration <hours>', 'Override estimated duration')
   .option('-e, --export', 'Export to .ics file after scheduling')
   .action(async (plan, options) => {
     await calendarSchedule(plan, options);
   });
   ```

**Deliverables**:
- CLI command working: `calendar schedule SESSION_10_PLAN`
- Parses markdown plan files automatically
- Schedules based on quota availability
- Creates calendar event with all metadata

**Test Cases**:
```bash
# Test 1: Schedule SESSION_10_PLAN
node dist/cli.js calendar schedule SESSION_10_PLAN

# Test 2: Schedule with custom start time
node dist/cli.js calendar schedule SESSION_11_PLAN --time "2025-10-22 14:00"

# Test 3: Schedule and export to .ics
node dist/cli.js calendar schedule SESSION_12_PLAN --export

# Test 4: Override duration estimate
node dist/cli.js calendar schedule SESSION_10_PLAN --duration 2.5
```

**Success Criteria**:
- [x] Finds SESSION plan files in docs/planning/
- [x] Parses metadata (time, tokens, objectives)
- [x] Checks quota before scheduling
- [x] Creates calendar event with correct timing
- [x] Optionally exports to .ics file

---

### Phase 2: Token-to-Hours Calibration (30 min, 8-12k tokens)

**Objective**: Accurate time estimates based on real usage data

**Background**:
Current estimates are based on guesses. We need calibration from actual sessions to improve accuracy.

**Implementation**:

1. **Create `src/token-time-calibrator.ts`**
   ```typescript
   export interface SessionCalibrationData {
     sessionId: string;
     estimatedTokens: number;
     actualTokens: number;
     estimatedHours: number;
     actualHours: number;
     variance: number;  // % difference
   }

   export class TokenTimeCalibrator {
     // Load historical session data
     loadSessionHistory(): SessionCalibrationData[]

     // Calculate average tokens per hour
     calculateTokensPerHour(): number

     // Calculate variance (how accurate are estimates?)
     calculateVariance(): number

     // Generate recommendations
     suggestCalibration(): {
       currentRatio: number;  // e.g., 25000 tokens/hour
       recommendedRatio: number;
       confidence: number;  // Based on sample size
     }
   }
   ```

2. **Update `src/session-monitor.ts`**
   ```typescript
   // After session ends, save calibration data
   private handleSessionEnd(event: SessionEvent): void {
     // ... existing code ...

     // Save for calibration
     const calibrationData = {
       sessionId: session.id,
       estimatedTokens: session.estimatedTokens || 0,
       actualTokens: tokensUsed,
       estimatedHours: session.estimatedHours || 0,
       actualHours: duration / 3600,
       variance: ((actualTokens - estimatedTokens) / estimatedTokens) * 100
     };

     this.saveCalibrationData(calibrationData);
   }
   ```

3. **Add CLI command**
   ```typescript
   .command('calibrate')
   .description('Analyze session history and calibrate token-to-hours estimates')
   .action(async () => {
     const calibrator = new TokenTimeCalibrator();
     const analysis = calibrator.suggestCalibration();

     console.log('Token-to-Hours Calibration Analysis:');
     console.log(`Current ratio: ${analysis.currentRatio} tokens/hour`);
     console.log(`Recommended: ${analysis.recommendedRatio} tokens/hour`);
     console.log(`Confidence: ${analysis.confidence}%`);
   });
   ```

**Deliverables**:
- Calibration system tracking actual vs estimated
- CLI command to analyze and report accuracy
- Recommendations for improving estimates

**Test**:
```bash
# Run calibration analysis
node dist/cli.js calibrate

# Expected output:
# Token-to-Hours Calibration Analysis:
# Current ratio: 25000 tokens/hour
# Recommended: 18500 tokens/hour (based on 15 sessions)
# Confidence: 78%
#
# Recommendation: Update estimates to be 26% more conservative
```

**Success Criteria**:
- [x] Tracks actual session token usage
- [x] Compares to estimates
- [x] Calculates variance and suggests improvements
- [x] Provides actionable calibration data

---

### Phase 3: Auto-Update Calendar Events (40 min, 10-15k tokens)

**Objective**: Dynamic updates when sessions get rescheduled

**Current Problem**:
- Session scheduled for 2:00 PM
- Quota runs out, session auto-rescheduled to 7:00 PM
- Calendar still shows 2:00 PM (stale data)

**Implementation**:

1. **Update `src/calendar-service.ts`**
   ```typescript
   /**
    * Update an existing calendar event
    */
   async updateEvent(eventId: string, updates: {
     start?: Date;
     end?: Date;
     description?: string;
   }): Promise<void> {
     await this.initialize();

     const event = await this.calendar.events.get({
       calendarId: 'primary',
       eventId: eventId
     });

     const updatedEvent = {
       ...event.data,
       start: updates.start ? {
         dateTime: updates.start.toISOString(),
         timeZone: event.data.start.timeZone
       } : event.data.start,
       end: updates.end ? {
         dateTime: updates.end.toISOString(),
         timeZone: event.data.end.timeZone
       } : event.data.end,
       description: updates.description || event.data.description
     };

     await this.calendar.events.update({
       calendarId: 'primary',
       eventId: eventId,
       requestBody: updatedEvent
     });

     console.log(`✅ Calendar event updated: ${eventId}`);
   }
   ```

2. **Update `src/smart-session-planner.ts`**
   ```typescript
   scheduleSession(
     session: Session,
     scheduleFor: Date,
     reason: 'quota_exceeded' | 'low_quota' | 'user_scheduled' | 'dependency'
   ): void {
     // ... existing scheduling logic ...

     // NEW: Update calendar if event exists
     if (session.calendarEventId) {
       const calendarService = new CalendarService();
       calendarService.updateEvent(session.calendarEventId, {
         start: scheduleFor,
         end: new Date(scheduleFor.getTime() + session.estimatedHours * 3600000),
         description: this.buildUpdatedDescription(session, reason)
       });

       console.log('📅 Calendar event automatically updated');
     }
   }
   ```

3. **Add rescheduling notifications**
   ```typescript
   private buildUpdatedDescription(session: Session, reason: string): string {
     return `
   ⚠️ RESCHEDULED: ${reason}

   Original time: ${session.originalScheduledFor?.toLocaleString()}
   New time: ${session.scheduledFor?.toLocaleString()}
   Reason: ${this.formatReason(reason)}

   [... rest of description ...]
     `;
   }
   ```

**Deliverables**:
- Calendar events update automatically when rescheduled
- Shows reschedule reason in event description
- Preserves all other event metadata

**Test**:
```bash
# Test 1: Manually reschedule a session
node dist/cli.js session reschedule session-123 "2025-10-22 15:00"
# Verify calendar event updated

# Test 2: Trigger auto-reschedule via quota
# Start high-token session when quota low
# Verify calendar updates automatically
```

**Success Criteria**:
- [x] Calendar events update in Google Calendar
- [x] Updated times reflected immediately
- [x] Reschedule reason shown in description
- [x] No duplicate events created

---

### Phase 4: Unified Workflow Command (30 min, 8-12k tokens)

**Objective**: One command from project analysis to calendar export

**Implementation**:

1. **Create `src/commands/schedule-workflow.ts`**
   ```typescript
   // Usage: node dist/cli.js schedule-workflow /path/to/project
   export async function scheduleWorkflow(projectPath: string, options?: {
     export?: boolean;
     autoStart?: boolean;
   }) {
     console.log('🚀 Starting full scheduling workflow...\n');

     // Step 1: Analyze project
     console.log('1️⃣ Analyzing project...');
     const analyzer = new ProjectAnalyzer();
     const analysis = await analyzer.analyzeProject(projectPath);
     console.log(`   Found ${analysis.phases.length} phases`);

     // Step 2: Generate session queue
     console.log('\n2️⃣ Generating session queue...');
     const planner = new SmartSessionPlanner();
     const queue = await planner.generateSessionQueue(analysis);
     console.log(`   Created ${queue.sessions.length} sessions`);

     // Step 3: Schedule sessions based on quota
     console.log('\n3️⃣ Checking quota and scheduling...');
     for (const session of queue.sessions) {
       const decision = await planner.findNextSession(queue, {
         availableHours: 5,
         respectQuota: true
       });

       if (decision.action === 'schedule') {
         planner.scheduleSession(session, decision.scheduleFor!, 'quota_exceeded');
       }
     }

     // Step 4: Create calendar events
     console.log('\n4️⃣ Creating calendar events...');
     const calendarService = new CalendarService();
     await calendarService.createSessionSchedule(analysis, {
       startDate: new Date(),
       daysOfWeek: [1, 2, 3, 4, 5],  // Mon-Fri
       workingHours: { start: 9, end: 18 },
       sessionLength: 3
     });

     // Step 5: Export to .ics if requested
     if (options?.export) {
       console.log('\n5️⃣ Exporting to iCal...');
       await calendarService.exportToIcal('project-schedule.ics');
       console.log('   ✅ Exported to: project-schedule.ics');
     }

     console.log('\n✅ Workflow complete!');
     console.log('📅 Check your calendar for scheduled sessions');
   }
   ```

2. **Update `src/cli.ts`**
   ```typescript
   .command('schedule-workflow <project>')
   .description('Complete workflow: analyze → plan → schedule → export')
   .option('-e, --export', 'Export to .ics file')
   .option('-a, --auto-start', 'Auto-start sessions at scheduled times')
   .action(async (project, options) => {
     await scheduleWorkflow(project, options);
   });
   ```

**Deliverables**:
- Single command handles entire workflow
- Interactive progress output
- Creates calendar events + optionally exports .ics

**Test**:
```bash
# Full workflow test
node dist/cli.js schedule-workflow ~/my-project --export

# Expected output:
# 🚀 Starting full scheduling workflow...
#
# 1️⃣ Analyzing project...
#    Found 4 phases
#
# 2️⃣ Generating session queue...
#    Created 6 sessions
#
# 3️⃣ Checking quota and scheduling...
#    ✅ Session 1: Can start now
#    ⏰ Session 2: Scheduled for 7:00 PM (quota low)
#    ⏰ Session 3: Scheduled for tomorrow 9:00 AM
#
# 4️⃣ Creating calendar events...
#    📅 Created 6 events
#
# 5️⃣ Exporting to iCal...
#    ✅ Exported to: project-schedule.ics
#
# ✅ Workflow complete!
```

**Success Criteria**:
- [x] Single command orchestrates full flow
- [x] Clear progress output at each step
- [x] Handles errors gracefully
- [x] Works with or without .ics export

---

### Phase 5: Integration Testing (35 min, 10-14k tokens)

**Objective**: Automated tests for calendar + quota integration

**Implementation**:

1. **Create `tests/calendar-workflow.test.ts`**
   ```typescript
   describe('Calendar Workflow Integration', () => {
     it('schedules SESSION plan via CLI', async () => {
       const result = await calendarSchedule('SESSION_10_PLAN');
       expect(result.eventId).toBeDefined();
       expect(result.sessionConfig.tokenBudget).toBeGreaterThan(0);
     });

     it('respects quota limits when scheduling', async () => {
       // Set quota to 10k tokens remaining
       quotaTracker.setQuota({ remaining: 10000 });

       // Try to schedule 75k token session
       const result = await calendarSchedule('SESSION_10_PLAN');

       // Should be scheduled for later
       expect(result.scheduled).toBe(true);
       expect(result.scheduleFor).toBeInstanceOf(Date);
     });

     it('updates calendar when session rescheduled', async () => {
       const session = await createTestSession();
       const originalTime = session.scheduledFor;

       // Reschedule
       await planner.scheduleSession(session, new Date(), 'quota_exceeded');

       // Verify calendar updated
       const event = await calendarService.getEvent(session.calendarEventId);
       expect(event.start).not.toEqual(originalTime);
     });

     it('calibrates token-to-hours from history', async () => {
       // Create fake session history
       saveSessionHistory([
         { estimatedTokens: 50000, actualTokens: 45000, estimatedHours: 2, actualHours: 1.8 },
         { estimatedTokens: 75000, actualTokens: 82000, estimatedHours: 3, actualHours: 3.3 }
       ]);

       const calibrator = new TokenTimeCalibrator();
       const result = calibrator.suggestCalibration();

       expect(result.recommendedRatio).toBeGreaterThan(0);
       expect(result.confidence).toBeGreaterThan(0);
     });
   });
   ```

2. **Create `tests/session-plan-parser.test.ts`**
   ```typescript
   describe('Session Plan Parser', () => {
     it('parses SESSION_10_PLAN.md correctly', async () => {
       const metadata = await parseSessionPlanMetadata('docs/planning/SESSION_10_PLAN.md');

       expect(metadata.name).toBe('SESSION_10');
       expect(metadata.estimatedHours).toBeGreaterThan(0);
       expect(metadata.estimatedTokens).toBeGreaterThan(0);
       expect(metadata.objectives.length).toBeGreaterThan(0);
     });

     it('handles missing plan files gracefully', async () => {
       await expect(findSessionPlan('NONEXISTENT')).rejects.toThrow();
     });
   });
   ```

**Deliverables**:
- Comprehensive integration tests
- Mocked quota/calendar services for testing
- Test coverage for all new features

**Test Execution**:
```bash
# Run all tests
npm test

# Run only calendar tests
npm test -- calendar-workflow

# Run with coverage
npm test -- --coverage
```

**Success Criteria**:
- [x] All tests pass
- [x] >80% code coverage for new features
- [x] Tests run in CI/CD pipeline
- [x] No flaky tests

---

### Phase 6: Documentation & User Guide (30 min, 6-10k tokens)

**Objective**: Complete user documentation for calendar workflows

**Implementation**:

1. **Create `docs/CALENDAR_WORKFLOW_GUIDE.md`**
   ```markdown
   # Calendar Workflow Guide

   ## Quick Start

   ### Schedule a SESSION Plan
   ```bash
   node dist/cli.js calendar schedule SESSION_10_PLAN
   ```

   ### Full Project Scheduling
   ```bash
   node dist/cli.js schedule-workflow ~/my-project --export
   ```

   ### Export to iPhone Calendar
   ```bash
   node dist/cli.js calendar export sessions.ics
   # AirDrop to iPhone or email to yourself
   ```

   ## Advanced Usage

   ### Custom Scheduling
   ```bash
   # Schedule for specific time
   node dist/cli.js calendar schedule SESSION_11_PLAN --time "2025-10-22 14:00"

   # Override duration estimate
   node dist/cli.js calendar schedule SESSION_10_PLAN --duration 2.5
   ```

   ### Calibration
   ```bash
   # Analyze your session history
   node dist/cli.js calibrate

   # Apply recommended calibration
   node dist/cli.js calibrate --apply
   ```

   ## Troubleshooting

   ### Calendar events not updating
   - Check Google Calendar authentication: `node dist/cli.js calendar auth`
   - Verify event ID exists: `node dist/cli.js calendar list`

   ### Token estimates inaccurate
   - Run calibration: `node dist/cli.js calibrate`
   - Review session history: `node dist/cli.js sessions history`
   ```

2. **Update `README.md`**
   Add calendar workflow section with quick examples

3. **Create `docs/CALENDAR_API.md`**
   Document the CalendarService API for developers

**Deliverables**:
- User-friendly workflow guide
- API documentation for developers
- Troubleshooting section
- Updated README

**Success Criteria**:
- [x] Clear step-by-step instructions
- [x] Examples for common use cases
- [x] Troubleshooting guide
- [x] API reference complete

---

## Testing Checklist

### Pre-Flight Checks
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] All existing tests still pass

### Feature Tests

**CLI Commands**:
- [ ] `calendar schedule SESSION_10_PLAN` works
- [ ] `schedule-workflow ~/project` completes successfully
- [ ] `calibrate` shows accurate analysis
- [ ] Calendar events created in Google Calendar

**Integration**:
- [ ] SESSION plan parsing extracts correct metadata
- [ ] Quota checking prevents over-scheduling
- [ ] Calendar updates when sessions rescheduled
- [ ] .ics export includes all session data

**Accuracy**:
- [ ] Token-to-hours estimates reasonable
- [ ] Calibration suggestions actionable
- [ ] Event timing matches quota availability

### Manual Testing
```bash
# Test 1: Schedule from plan
node dist/cli.js calendar schedule SESSION_10_PLAN --export
open SESSION_10_PLAN.ics

# Test 2: Full workflow
node dist/cli.js schedule-workflow . --export
ls -la project-schedule.ics

# Test 3: Calibration
node dist/cli.js calibrate

# Test 4: Update event (reschedule)
# Manually trigger quota exceeded scenario
# Verify calendar auto-updates
```

---

## Success Metrics

**Functionality**:
- ✅ CLI commands work end-to-end
- ✅ Calendar events created accurately
- ✅ Quota integration prevents over-scheduling
- ✅ Auto-updates work when rescheduling

**Quality**:
- ✅ >80% test coverage
- ✅ No TypeScript errors
- ✅ All linting passes
- ✅ Documentation complete

**Usability**:
- ✅ Single command handles full workflow
- ✅ Clear error messages
- ✅ Progress output at each step
- ✅ Works on Mac (primary platform)

---

## Risk Assessment

### Low Risk
- CLI command structure (well-established pattern)
- Session plan parsing (straightforward markdown)
- Documentation (no dependencies)

### Medium Risk
- Calendar auto-update (Google API reliability)
- Token-to-hours calibration (needs historical data)
- Integration tests (may need mocking setup)

### Mitigation Strategies
- Cache calendar API responses
- Provide manual fallback for updates
- Use realistic defaults for calibration
- Mock external services in tests

---

## Post-Session Deliverables

**Code**:
- [ ] `src/commands/calendar-schedule.ts`
- [ ] `src/session-plan-parser.ts`
- [ ] `src/token-time-calibrator.ts`
- [ ] `src/commands/schedule-workflow.ts`
- [ ] `tests/calendar-workflow.test.ts`
- [ ] `tests/session-plan-parser.test.ts`

**Documentation**:
- [ ] `docs/CALENDAR_WORKFLOW_GUIDE.md`
- [ ] `docs/CALENDAR_API.md`
- [ ] Updated `README.md`

**Tests**:
- [ ] Integration test suite passing
- [ ] >80% code coverage
- [ ] All manual tests verified

---

## Next Session Preview (SESSION 13)

**Potential Focus Areas**:
1. **Mac URL Handler (Phase 2)** - One-click session launch
2. **Calendar Watcher** - Auto-start sessions at scheduled times
3. **Dashboard Integration** - Show upcoming scheduled sessions
4. **Mobile Optimization** - Better iPhone workflows
5. **Advanced Analytics** - Session success metrics

**Dependencies**:
- SESSION 12 complete (this session)
- Phase 1 iCal validation proven

---

## Quick Reference

### Key Commands
```bash
# Schedule from plan
calendar schedule SESSION_10_PLAN

# Full workflow
schedule-workflow ~/project --export

# Calibrate estimates
calibrate

# Update calendar
calendar update <event-id> --time "2025-10-22 15:00"
```

### Key Files
- `src/commands/calendar-schedule.ts` - Main scheduling command
- `src/session-plan-parser.ts` - Parse SESSION_X_PLAN.md files
- `src/token-time-calibrator.ts` - Calibration system
- `src/calendar-service.ts` - Calendar API wrapper

### Key Tests
```bash
# Run all tests
npm test

# Run calendar tests only
npm test -- calendar-workflow

# Manual verification
node dist/cli.js schedule-workflow . --export
open project-schedule.ics
```

---

**Session 12 Status**: 🟢 READY FOR IMPLEMENTATION

**Best Model for This Session**: Haiku 4.5
- Reason: CLI/automation work, straightforward parsing, cost-effective
- Token budget fits well within Haiku's capabilities
- No complex reasoning required

**Recommended by**: Claude (Sonnet 4.5) - Analysis session
**Ready for**: Cursor + Haiku 4.5 implementation

---

🚀 **Let's build the missing CLI workflow and complete the calendar integration!**
