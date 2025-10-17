/**
 * Calendar Service
 * Manages Google Calendar integration for session scheduling
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { OAuthHelper } from './utils/oauth-helper.js';
import { IcalValidator } from './ical-validator.js';
import type {
  CalendarEvent,
  SchedulePreferences,
  TimeSlot,
  ProjectAnalysis,
  SessionPhase
} from './types.js';

export class CalendarService {
  private calendar: any;
  private auth!: OAuth2Client; // Initialized in initialize()
  private oauthHelper: OAuthHelper;

  constructor() {
    this.oauthHelper = new OAuthHelper();
  }

  /**
   * Initialize calendar service with authentication
   */
  async initialize(): Promise<void> {
    this.auth = await this.oauthHelper.getAuthenticatedClient();
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * Create full session schedule from project analysis
   */
  async createSessionSchedule(
    analysis: ProjectAnalysis,
    preferences: SchedulePreferences
  ): Promise<CalendarEvent[]> {
    await this.initialize();

    console.log('  📅 Creating calendar schedule...\n');

    // 1. Find available time slots
    const slots = await this.findAvailableSlots(
      preferences.startDate || new Date(),
      analysis.phases.length,
      preferences
    );

    if (slots.length < analysis.phases.length) {
      throw new Error(
        `Not enough available slots found. Need ${analysis.phases.length}, found ${slots.length}.\n` +
        'Try extending the search period or adjusting working hours.'
      );
    }

    // 2. Create calendar event for each phase
    const events: CalendarEvent[] = [];

    for (let i = 0; i < analysis.phases.length; i++) {
      const phase = analysis.phases[i];
      const slot = slots[i];

      console.log(`  📌 Creating event ${i + 1}/${analysis.phases.length}: ${phase.name}`);

      const event = await this.createSessionEvent(
        analysis.projectPath,
        phase,
        slot,
        preferences.timezone || 'America/Los_Angeles'
      );

      events.push(event);
    }

    console.log(`\n  ✅ Created ${events.length} calendar events\n`);
    return events;
  }

  /**
   * Create a single session event in calendar
   */
  private async createSessionEvent(
    projectPath: string,
    phase: SessionPhase,
    slot: TimeSlot,
    timezone: string
  ): Promise<CalendarEvent> {
    const projectName = projectPath.split('/').pop() || 'Unknown Project';

    const eventBody = {
      summary: `🤖 Claude Session: ${phase.name}`,
      description: this.formatEventDescription(phase, projectPath),
      start: {
        dateTime: slot.start.toISOString(),
        timeZone: timezone
      },
      end: {
        dateTime: slot.end.toISOString(),
        timeZone: timezone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'popup', minutes: 5 }
        ]
      },
      colorId: '9', // Blue color for Claude sessions
      // Store session config in event metadata
      extendedProperties: {
        private: {
          claudeOptimizer: 'true',
          projectPath: projectPath,
          projectName: projectName,
          phase: phase.name,
          model: phase.suggestedModel,
          tokenBudget: phase.tokenBudget.toString(),
          tools: JSON.stringify(phase.requiredTools),
          objectives: JSON.stringify(phase.objectives)
        }
      }
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventBody
    });

    return {
      id: response.data.id,
      summary: response.data.summary,
      description: response.data.description,
      start: new Date(response.data.start.dateTime),
      end: new Date(response.data.end.dateTime),
      sessionConfig: {
        projectPath,
        projectName,
        phase: phase.name,
        model: phase.suggestedModel,
        tokenBudget: phase.tokenBudget,
        tools: phase.requiredTools,
        objectives: phase.objectives
      }
    };
  }

  /**
   * Find available time slots for scheduling
   */
  private async findAvailableSlots(
    startDate: Date,
    slotsNeeded: number,
    preferences: SchedulePreferences
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const searchEndDate = new Date(startDate);
    searchEndDate.setDate(searchEndDate.getDate() + 30); // Search up to 30 days ahead

    // 1. Get busy times from calendar
    const busyTimes = await this.getFreeBusy(startDate, searchEndDate);

    // 2. Generate candidate slots
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (slots.length < slotsNeeded && currentDate < searchEndDate) {
      // Skip if not a preferred day of week
      if (!preferences.daysOfWeek.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Try to schedule within working hours
      const slotStart = new Date(currentDate);
      slotStart.setHours(preferences.workingHours.start, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + preferences.sessionLength);

      // Check if slot fits within working hours
      if (slotEnd.getHours() > preferences.workingHours.end) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check if slot conflicts with busy times
      const hasConflict = busyTimes.some(busy =>
        (slotStart >= busy.start && slotStart < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end) ||
        (slotStart <= busy.start && slotEnd >= busy.end)
      );

      if (!hasConflict) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Get free/busy information from calendar
   */
  private async getFreeBusy(start: Date, end: Date): Promise<TimeSlot[]> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: 'primary' }]
        }
      });

      const busySlots: TimeSlot[] = [];
      const calendars = response.data.calendars;

      if (calendars && calendars.primary && calendars.primary.busy) {
        for (const busy of calendars.primary.busy) {
          busySlots.push({
            start: new Date(busy.start),
            end: new Date(busy.end)
          });
        }
      }

      return busySlots;
    } catch (error) {
      console.error('  ⚠️  Failed to fetch free/busy data, assuming all slots available');
      return [];
    }
  }

  /**
   * Format event description with phase details
   */
  private formatEventDescription(phase: SessionPhase, projectPath: string): string {
    return `
🤖 **Claude Code Optimizer - Automated Session**

**Project**: ${projectPath}
**Phase**: ${phase.name}
**Duration**: ${phase.estimatedHours.toFixed(1)} hours
**Model**: ${phase.suggestedModel}
**Token Budget**: ${phase.tokenBudget.toLocaleString()}

**Description**:
${phase.description}

**Objectives**:
${phase.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**Required Tools**:
${phase.requiredTools.join(', ')}

---

This event was automatically created by Claude Code Optimizer.
The session will start automatically at the scheduled time.
    `.trim();
  }

  /**
   * List upcoming Claude session events
   */
  async listUpcomingSessions(): Promise<CalendarEvent[]> {
    await this.initialize();

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 30);

    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events: CalendarEvent[] = [];

    for (const event of response.data.items || []) {
      // Filter for Claude Optimizer events
      if (event.extendedProperties?.private?.claudeOptimizer === 'true') {
        events.push({
          id: event.id,
          summary: event.summary,
          description: event.description,
          start: new Date(event.start.dateTime),
          end: new Date(event.end.dateTime),
          sessionConfig: {
            projectPath: event.extendedProperties.private.projectPath,
            projectName: event.extendedProperties.private.projectName,
            phase: event.extendedProperties.private.phase,
            model: event.extendedProperties.private.model as 'sonnet' | 'opus' | 'haiku',
            tokenBudget: parseInt(event.extendedProperties.private.tokenBudget),
            tools: JSON.parse(event.extendedProperties.private.tools),
            objectives: JSON.parse(event.extendedProperties.private.objectives)
          }
        });
      }
    }

    return events;
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    await this.initialize();

    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const event = response.data;

      if (event.extendedProperties?.private?.claudeOptimizer !== 'true') {
        return null;
      }

      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        sessionConfig: {
          projectPath: event.extendedProperties.private.projectPath,
          projectName: event.extendedProperties.private.projectName,
          phase: event.extendedProperties.private.phase,
          model: event.extendedProperties.private.model as 'sonnet' | 'opus' | 'haiku',
          tokenBudget: parseInt(event.extendedProperties.private.tokenBudget),
          tools: JSON.parse(event.extendedProperties.private.tools),
          objectives: JSON.parse(event.extendedProperties.private.objectives)
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.initialize();

    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.oauthHelper.isAuthenticated();
  }

  /**
   * Clear authentication
   */
  async logout(): Promise<void> {
    await this.oauthHelper.clearToken();
  }

  /**
   * Export sessions to iCal format (.ics file)
   * For use with Apple Calendar, iPhone, Google Calendar, etc.
   */
  async exportToIcal(outputPath: string): Promise<void> {
    await this.initialize();

    const sessions = await this.listUpcomingSessions();

    if (sessions.length === 0) {
      throw new Error('No upcoming sessions to export');
    }

    // Build iCal format
    const icalLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Claude Code Optimizer//Calendar Integration//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Claude Code Sessions',
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:Automated Claude Code Optimizer Sessions'
    ];

    for (const session of sessions) {
      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:${session.id}@claude-optimizer`);
      icalLines.push(`DTSTAMP:${this.formatIcalDate(new Date())}`);
      icalLines.push(`DTSTART:${this.formatIcalDate(session.start)}`);
      icalLines.push(`DTEND:${this.formatIcalDate(session.end)}`);
      icalLines.push(`SUMMARY:${this.escapeIcalText(session.summary || 'Claude Session')}`);

      // Add description with session details
      const description = this.formatIcalDescription(session);
      icalLines.push(`DESCRIPTION:${this.escapeIcalText(description)}`);

      // Add location (project path)
      icalLines.push(`LOCATION:${this.escapeIcalText(session.sessionConfig.projectPath)}`);

      // Add URL for one-click session launch (iPhone-friendly)
      const sessionUrl = this.generateSessionUrl(session);
      icalLines.push(`URL:${sessionUrl}`);

      // Add reminders (VALARM)
      icalLines.push('BEGIN:VALARM');
      icalLines.push('TRIGGER:-PT30M');
      icalLines.push('ACTION:DISPLAY');
      icalLines.push('DESCRIPTION:Claude session starting in 30 minutes');
      icalLines.push('END:VALARM');

      icalLines.push('BEGIN:VALARM');
      icalLines.push('TRIGGER:-PT5M');
      icalLines.push('ACTION:DISPLAY');
      icalLines.push('DESCRIPTION:Claude session starting in 5 minutes');
      icalLines.push('END:VALARM');

      // Add categories
      icalLines.push('CATEGORIES:Claude Code,Development,AI');

      // Add color (blue)
      icalLines.push('COLOR:blue');

      icalLines.push('END:VEVENT');
    }

    icalLines.push('END:VCALENDAR');

    // Write to file
    const fs = await import('fs/promises');
    const icalContent = icalLines.join('\r\n');
    await fs.writeFile(outputPath, icalContent, 'utf-8');

    // Validate the generated iCal file
    const validator = new IcalValidator();
    const validation = validator.validateIcal(icalContent);

    if (!validation.valid) {
      console.warn('\n⚠️  Warning: Generated iCal file has validation issues:');
      validation.errors.forEach(error => console.warn(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.warn('\n⚠️  iCal validation warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  }

  /**
   * Validate an iCal file
   */
  validateIcalFile(content: string): boolean {
    const validator = new IcalValidator();
    const validation = validator.validateIcal(content);
    return validation.valid;
  }

  /**
   * Get iCal validation report
   */
  getIcalValidationReport(content: string): string {
    const validator = new IcalValidator();
    return validator.generateReport(content);
  }

  /**
   * Format date for iCal (UTC format: YYYYMMDDTHHmmssZ)
   */
  private formatIcalDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape special characters for iCal text fields
   */
  private escapeIcalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  /**
   * Fold long iCal lines to comply with RFC 5545 (max 75 chars per line)
   */
  // @ts-ignore - TODO: Will be used when implementing line folding
  private foldIcalLine(line: string): string {
    // TODO(human): Implement line folding for iCal compliance
    // RFC 5545 requires lines to be max 75 characters (including CRLF)
    // Lines exceeding this must be folded by inserting CRLF + space
    // Example: "DESCRIPTION:very long text..." becomes:
    // "DESCRIPTION:very long te\r\n xt..."
    //
    // Requirements:
    // 1. If line.length <= 75, return line unchanged
    // 2. Otherwise, split at 75 chars and insert '\r\n ' (CRLF + space)
    // 3. Continue folding remaining text in 74-char chunks (accounting for leading space)
    // 4. Return the folded line
    return line;
  }

  /**
   * Generate session launch URL for calendar events
   * Creates a custom URL scheme that can be registered to launch Claude Code
   */
  private generateSessionUrl(session: CalendarEvent): string {
    // Extract session plan name from phase if available
    const planMatch = session.sessionConfig.phase.match(/SESSION[_ ](\d+[A-Z]?)/i);
    const planName = planMatch ? planMatch[1] : null;

    const projectPath = session.sessionConfig.projectPath;
    const encodedPath = encodeURIComponent(projectPath);
    const encodedPhase = encodeURIComponent(session.sessionConfig.phase);

    // Create custom URL scheme
    if (planName) {
      // claude-session://start?plan=11&project=/path/to/project
      return `claude-session://start?plan=${planName}&project=${encodedPath}`;
    } else {
      // claude-session://start?phase=Planning&project=/path/to/project
      return `claude-session://start?phase=${encodedPhase}&project=${encodedPath}`;
    }
  }

  /**
   * Format session description for iCal with actionable commands
   */
  private formatIcalDescription(session: CalendarEvent): string {
    // Extract SESSION plan name from phase if available
    const planMatch = session.sessionConfig.phase.match(/SESSION[_ ](\d+[A-Z]?)/i);
    const planName = planMatch ? planMatch[1] : null;

    const projectPath = session.sessionConfig.projectPath;
    const encodedPath = encodeURIComponent(projectPath);

    const lines = [
      '🚀 QUICK START',
      '═══════════════════════════════════════',
      ''
    ];

    // Add URL scheme for Mac (if plan name detected)
    if (planName) {
      lines.push('🖥️  Mac (One-Click):');
      lines.push(`   claude-session://start?plan=${planName}&project=${encodedPath}`);
      lines.push('');
    }

    // Add manual command for all platforms
    lines.push('💻 Manual Command:');
    lines.push(`   cd ${projectPath}`);
    if (planName) {
      lines.push(`   node dist/cli.js session start ${planName}`);
    } else {
      lines.push('   # Start Claude Code session manually');
    }
    lines.push('');

    // Add session details
    lines.push('📋 SESSION DETAILS');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`Project: ${session.sessionConfig.projectName}`);
    lines.push(`Phase: ${session.sessionConfig.phase}`);
    lines.push(`Model: ${session.sessionConfig.model}`);
    lines.push(`Token Budget: ${session.sessionConfig.tokenBudget.toLocaleString()}`);
    lines.push('');

    // Add objectives
    if (session.sessionConfig.objectives.length > 0) {
      lines.push('🎯 Objectives:');
      session.sessionConfig.objectives.forEach((obj, i) => {
        lines.push(`   ${i + 1}. ${obj}`);
      });
      lines.push('');
    }

    // Add automation note
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push('📱 iPhone: Copy the manual command above');
    lines.push('🖥️  Mac: Click the URL or use calendar watcher');
    lines.push('🤖 Auto: Run "calendar watch" to auto-start');

    return lines.join('\\n');
  }
}
