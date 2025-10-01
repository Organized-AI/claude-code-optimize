/**
 * Smart Session Planner - Quota-aware scheduling with calendar integration
 * Automatically schedules sessions based on:
 * - Available quota
 * - User time availability
 * - Task complexity
 * - Session dependencies
 */

import { QuotaTracker } from './quota-tracker.js';
import type { ProjectAnalysis } from './types.js';

export interface Session {
  id: string;
  phase: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedHours: number;
  estimatedTokens: number;
  agent: string;
  objectives: string[];
  status: 'ready' | 'blocked' | 'in_progress' | 'complete' | 'scheduled';
  dependencies: string[];
  scheduledFor?: Date;
  scheduleReason?: 'quota_exceeded' | 'low_quota' | 'user_scheduled' | 'dependency';
}

export interface SessionQueue {
  projectPath: string;
  projectName: string;
  analyzedAt: Date;
  totalEstimate: number;
  sessions: Session[];
}

export interface ScheduleOptions {
  availableHours: number;
  preferredTime?: Date;
  respectQuota: boolean;
}

export class SmartSessionPlanner {
  private quotaTracker: QuotaTracker;

  constructor() {
    this.quotaTracker = new QuotaTracker();
  }

  /**
   * Find the next best session to start
   */
  async findNextSession(
    queue: SessionQueue,
    options: ScheduleOptions
  ): Promise<{
    session: Session | null;
    action: 'start' | 'schedule' | 'none';
    reason: string;
    scheduleFor?: Date;
  }> {
    const quotaStatus = this.quotaTracker.getStatus();

    // Filter to ready sessions
    const readySessions = queue.sessions.filter(s =>
      s.status === 'ready' &&
      s.estimatedHours <= options.availableHours
    );

    if (readySessions.length === 0) {
      return {
        session: null,
        action: 'none',
        reason: 'No sessions available. Check dependencies or time constraints.'
      };
    }

    // Sort by priority
    const sortedSessions = readySessions.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Then by token efficiency
      return a.estimatedTokens - b.estimatedTokens;
    });

    const bestSession = sortedSessions[0];

    // Check if it fits quota
    const quotaCheck = this.quotaTracker.canStartSession(bestSession.estimatedTokens);

    if (quotaCheck.canStart) {
      return {
        session: bestSession,
        action: 'start',
        reason: `✅ Starting: ${bestSession.phase} (${bestSession.estimatedTokens.toLocaleString()} tokens, ${quotaStatus.remaining.toLocaleString()} available)`
      };
    }

    // Doesn't fit - can we find a smaller session?
    const smallerSession = sortedSessions.find(s =>
      s.estimatedTokens <= quotaStatus.remaining
    );

    if (smallerSession && quotaStatus.remaining > 30000) {
      return {
        session: smallerSession,
        action: 'start',
        reason: `✅ Starting smaller task: ${smallerSession.phase} (fits quota: ${smallerSession.estimatedTokens.toLocaleString()} tokens)`
      };
    }

    // Nothing fits - schedule for after quota reset
    const scheduleFor = quotaCheck.scheduleFor!;

    return {
      session: bestSession,
      action: 'schedule',
      reason: `⏰ Scheduling for ${scheduleFor.toLocaleTimeString()} when quota resets (needs ${bestSession.estimatedTokens.toLocaleString()}, have ${quotaStatus.remaining.toLocaleString()})`,
      scheduleFor
    };
  }

  /**
   * Schedule a session for future execution
   */
  scheduleSession(
    session: Session,
    scheduleFor: Date,
    reason: 'quota_exceeded' | 'low_quota' | 'user_scheduled' | 'dependency'
  ): void {
    session.status = 'scheduled';
    session.scheduledFor = scheduleFor;
    session.scheduleReason = reason;

    // Register with quota tracker
    // Map our reasons to quota tracker reasons
    const quotaReason = reason === 'dependency' ? 'user_scheduled' : reason;
    this.quotaTracker.scheduleSession(session.id, session.estimatedTokens, quotaReason);

    console.log(`📅 Session scheduled:`);
    console.log(`   ${session.phase}`);
    console.log(`   Time: ${scheduleFor.toLocaleTimeString()} on ${scheduleFor.toLocaleDateString()}`);
    console.log(`   Reason: ${this.formatReason(reason)}`);
  }

  /**
   * Create calendar events for scheduled sessions
   */
  async createCalendarEvents(queue: SessionQueue): Promise<void> {
    const scheduledSessions = queue.sessions.filter(s => s.status === 'scheduled');

    if (scheduledSessions.length === 0) {
      console.log('No sessions to schedule');
      return;
    }

    console.log(`\n📅 Creating ${scheduledSessions.length} calendar events...\n`);

    for (const session of scheduledSessions) {
      await this.createICalEvent(session, queue.projectPath);
    }

    console.log('✅ Calendar events created!');
    console.log('   Import the .ics files to your calendar app');
  }

  /**
   * Create iCal event for a session
   */
  private async createICalEvent(session: Session, projectPath: string): Promise<void> {
    const start = session.scheduledFor!;
    const end = new Date(start.getTime() + session.estimatedHours * 60 * 60 * 1000);

    // Format dates for iCal (YYYYMMDDTHHmmssZ)
    const formatDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Claude Code Optimizer//EN
BEGIN:VEVENT
UID:${session.id}@claude-optimizer
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:Claude Session: ${session.phase}
DESCRIPTION:Automated Claude Code session\\n\\nObjectives:\\n${session.objectives.map(o => `- ${o}`).join('\\n')}\\n\\nToken Budget: ${session.estimatedTokens.toLocaleString()}\\n\\nAgent: ${session.agent}\\n\\nProject: ${projectPath}
LOCATION:${projectPath}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Claude session starts in 30 minutes
END:VALARM
BEGIN:VALARM
TRIGGER:-PT5M
ACTION:DISPLAY
DESCRIPTION:Claude session starts in 5 minutes
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const fs = require('fs');
    const icsPath = `.claude/calendar/${session.id}.ics`;
    const dir = require('path').dirname(icsPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(icsPath, ical);
    console.log(`   ✓ ${session.phase} → ${icsPath}`);
  }

  /**
   * Auto-start scheduled sessions
   */
  async checkScheduledSessions(queue: SessionQueue): Promise<Session | null> {
    const now = new Date();
    const scheduledSessions = queue.sessions.filter(s =>
      s.status === 'scheduled' &&
      s.scheduledFor &&
      new Date(s.scheduledFor).getTime() <= now.getTime()
    );

    if (scheduledSessions.length === 0) {
      return null;
    }

    // Start the first scheduled session that's due
    const session = scheduledSessions[0];

    console.log(`\n⏰ Scheduled session is ready to start!`);
    console.log(`   ${session.phase}`);
    console.log(`   Scheduled for: ${session.scheduledFor!.toLocaleTimeString()}`);
    console.log('');

    // Check quota again before starting
    const quotaCheck = this.quotaTracker.canStartSession(session.estimatedTokens);

    if (!quotaCheck.canStart) {
      console.log(`⚠️  Quota still insufficient. Rescheduling for ${quotaCheck.scheduleFor!.toLocaleTimeString()}`);
      this.scheduleSession(session, quotaCheck.scheduleFor!, 'quota_exceeded');
      return null;
    }

    return session;
  }

  /**
   * Generate session queue from project analysis
   */
  async generateSessionQueue(analysis: ProjectAnalysis): Promise<SessionQueue> {
    const sessions: Session[] = [];
    let sessionCounter = 1;

    // Always start with planning
    const planningPhase = analysis.phases.find(p => p.name.toLowerCase().includes('planning'));
    if (planningPhase) {
      sessions.push({
        id: `session-${sessionCounter++}`,
        phase: planningPhase.name,
        priority: 'HIGH',
        estimatedHours: planningPhase.estimatedHours,
        estimatedTokens: planningPhase.tokenBudget,
        agent: '.claude/agents/planning-agent.md',
        objectives: planningPhase.objectives,
        status: 'ready',
        dependencies: []
      });
    }

    // Break implementation into multiple sessions (max 5 hours each)
    const implPhase = analysis.phases.find(p => p.name.toLowerCase().includes('implementation'));
    if (implPhase) {
      const sessionCount = Math.ceil(implPhase.estimatedHours / 5);
      const tokensPerSession = Math.floor(implPhase.tokenBudget / sessionCount);
      const objectivesPerSession = Math.ceil(implPhase.objectives.length / sessionCount);

      for (let i = 0; i < sessionCount; i++) {
        const startIdx = i * objectivesPerSession;
        const endIdx = Math.min(startIdx + objectivesPerSession, implPhase.objectives.length);

        sessions.push({
          id: `session-${sessionCounter++}`,
          phase: `${implPhase.name} - Part ${i + 1}/${sessionCount}`,
          priority: i === 0 ? 'HIGH' : 'MEDIUM',
          estimatedHours: Math.min(5, implPhase.estimatedHours - i * 5),
          estimatedTokens: tokensPerSession,
          agent: '.claude/agents/implementation-agent.md',
          objectives: implPhase.objectives.slice(startIdx, endIdx),
          status: i === 0 ? 'blocked' : 'blocked',
          dependencies: i === 0 ? ['session-1'] : [`session-${sessionCounter - 2}`]
        });
      }
    }

    // Testing session
    const testingPhase = analysis.phases.find(p => p.name.toLowerCase().includes('testing'));
    if (testingPhase) {
      sessions.push({
        id: `session-${sessionCounter++}`,
        phase: testingPhase.name,
        priority: 'MEDIUM',
        estimatedHours: testingPhase.estimatedHours,
        estimatedTokens: testingPhase.tokenBudget,
        agent: '.claude/agents/testing-agent.md',
        objectives: testingPhase.objectives,
        status: 'blocked',
        dependencies: [`session-${sessionCounter - 2}`]
      });
    }

    // Polish session
    const polishPhase = analysis.phases.find(p => p.name.toLowerCase().includes('polish'));
    if (polishPhase) {
      sessions.push({
        id: `session-${sessionCounter++}`,
        phase: polishPhase.name,
        priority: 'LOW',
        estimatedHours: polishPhase.estimatedHours,
        estimatedTokens: polishPhase.tokenBudget,
        agent: '.claude/agents/polish-agent.md',
        objectives: polishPhase.objectives,
        status: 'blocked',
        dependencies: [`session-${sessionCounter - 2}`]
      });
    }

    return {
      projectPath: analysis.projectPath,
      projectName: this.getProjectName(analysis.projectPath),
      analyzedAt: analysis.timestamp,
      totalEstimate: analysis.estimatedHours,
      sessions
    };
  }

  /**
   * Mark session complete and unblock dependents
   */
  completeSession(queue: SessionQueue, sessionId: string): void {
    const session = queue.sessions.find(s => s.id === sessionId);
    if (!session) return;

    session.status = 'complete';

    // Unblock dependent sessions
    queue.sessions.forEach(s => {
      if (s.dependencies.includes(sessionId)) {
        const allDepsMet = s.dependencies.every(depId =>
          queue.sessions.find(dep => dep.id === depId)?.status === 'complete'
        );

        if (allDepsMet) {
          s.status = 'ready';
        }
      }
    });
  }

  private formatReason(reason: string): string {
    const reasons: Record<string, string> = {
      quota_exceeded: 'Token quota exceeded - waiting for reset',
      low_quota: 'Low token quota - scheduled for later',
      dependency: 'Waiting for previous session to complete',
      user_scheduled: 'Scheduled by user preference'
    };
    return reasons[reason] || reason;
  }

  private getProjectName(projectPath: string): string {
    return require('path').basename(projectPath);
  }
}
