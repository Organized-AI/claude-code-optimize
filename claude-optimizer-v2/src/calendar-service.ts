/**
 * Calendar Service
 * Manages Google Calendar integration for session scheduling
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { OAuthHelper } from './utils/oauth-helper.js';
import type {
  CalendarEvent,
  SchedulePreferences,
  TimeSlot,
  ProjectAnalysis,
  SessionPhase
} from './types.js';

export class CalendarService {
  private calendar: any;
  private auth: OAuth2Client;
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
}
