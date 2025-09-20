import { CalendarEvent, CalendarIntegration, Session } from '../../shared/types/index.js';
import { ExtendedSessionManager } from './ExtendedSessionManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { v4 as uuidv4 } from 'uuid';

export class CalendarIntegrationService {
  private sessionManager: ExtendedSessionManager;
  private wsManager: WebSocketManager;
  private integrations: Map<string, CalendarIntegration> = new Map();
  
  constructor(sessionManager: ExtendedSessionManager, wsManager: WebSocketManager) {
    this.sessionManager = sessionManager;
    this.wsManager = wsManager;
  }
  
  async createCalendarEvent(session: Session, options?: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: uuidv4(),
      sessionId: session.id,
      title: options?.title || `AI Coding Session: ${session.name || session.id}`,
      description: options?.description || this.generateEventDescription(session),
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : this.calculateEndTime(session),
      isAllDay: false,
      reminders: options?.reminders || [15, 5], // 15 and 5 minutes before
      color: this.getEventColor(session),
      metadata: {
        tokenBudget: session.tokenBudget || 0,
        sessionType: this.detectSessionType(session),
        estimatedTokens: session.tokensUsed
      },
      ...options
    };
    
    return event;
  }
  
  async generateICalFile(events: CalendarEvent[]): Promise<string> {
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Moonlock Dashboard//AI Session Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:AI Coding Sessions',
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:AI coding sessions tracked by Moonlock Dashboard'
    ];
    
    for (const event of events) {
      icalContent.push(...this.createVEvent(event));
    }
    
    icalContent.push('END:VCALENDAR');
    
    return icalContent.join('\r\n');
  }
  
  private createVEvent(event: CalendarEvent): string[] {
    const vevent = [
      'BEGIN:VEVENT',
      `UID:${event.id}@moonlock.ai`,
      `DTSTAMP:${this.formatICalDate(new Date())}`,
      `DTSTART:${this.formatICalDate(event.startTime)}`,
      `DTEND:${this.formatICalDate(event.endTime)}`,
      `SUMMARY:${this.escapeICalText(event.title)}`,
      `DESCRIPTION:${this.escapeICalText(event.description)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE'
    ];
    
    // Add reminders
    for (const reminderMinutes of event.reminders) {
      vevent.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `TRIGGER:-PT${reminderMinutes}M`,
        `DESCRIPTION:Reminder: ${event.title}`,
        'END:VALARM'
      );
    }
    
    // Add custom properties
    vevent.push(
      `X-MOONLOCK-SESSION-ID:${event.sessionId}`,
      `X-MOONLOCK-TOKEN-BUDGET:${event.metadata.tokenBudget}`,
      `X-MOONLOCK-SESSION-TYPE:${event.metadata.sessionType}`,
      'END:VEVENT'
    );
    
    return vevent;
  }
  
  async setupGoogleCalendarIntegration(authCode: string): Promise<CalendarIntegration> {
    // In a production environment, this would:
    // 1. Exchange auth code for access token
    // 2. Store refresh token securely
    // 3. Set up calendar API access
    
    const integration: CalendarIntegration = {
      provider: 'google',
      isConnected: true,
      lastSync: Date.now(),
      syncEnabled: true,
      calendarId: 'primary' // Default to primary calendar
    };
    
    this.integrations.set('google', integration);
    
    // Notify about successful integration
    this.wsManager.broadcastCalendarSync('completed', 'Google Calendar connected successfully');
    
    return integration;
  }
  
  async syncToGoogleCalendar(event: CalendarEvent): Promise<void> {
    const integration = this.integrations.get('google');
    if (!integration || !integration.isConnected) {
      throw new Error('Google Calendar not connected');
    }
    
    // Notify sync start
    this.wsManager.broadcastCalendarSync('syncing', 'Syncing event to Google Calendar...');
    
    try {
      // In production, this would use Google Calendar API
      // to create the event
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update last sync time
      integration.lastSync = Date.now();
      
      // Notify sync complete
      this.wsManager.broadcastCalendarSync('completed', 'Event synced to Google Calendar');
    } catch (error) {
      this.wsManager.broadcastCalendarSync('error', 'Failed to sync to Google Calendar');
      throw error;
    }
  }
  
  async generateCalendarUrl(event: CalendarEvent, provider: 'google' | 'outlook' | 'yahoo'): Promise<string> {
    const params = new URLSearchParams();
    
    switch (provider) {
      case 'google':
        params.append('action', 'TEMPLATE');
        params.append('text', event.title);
        params.append('details', event.description);
        params.append('dates', `${this.formatGoogleDate(event.startTime)}/${this.formatGoogleDate(event.endTime)}`);
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
        
      case 'outlook':
        params.append('path', '/calendar/action/compose');
        params.append('subject', event.title);
        params.append('body', event.description);
        params.append('startdt', event.startTime.toISOString());
        params.append('enddt', event.endTime.toISOString());
        return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
        
      case 'yahoo':
        params.append('v', '60');
        params.append('title', event.title);
        params.append('desc', event.description);
        params.append('st', this.formatYahooDate(event.startTime));
        params.append('et', this.formatYahooDate(event.endTime));
        return `https://calendar.yahoo.com/?${params.toString()}`;
    }
  }
  
  async getUpcomingSessions(): Promise<CalendarEvent[]> {
    const sessions = await this.sessionManager.getAllSessions();
    const now = Date.now();
    
    // Find sessions that are scheduled for the future or ongoing
    const upcomingSessions = sessions.filter(session => {
      const endTime = session.endTime || (session.startTime + (2 * 60 * 60 * 1000)); // Default 2 hours
      return endTime > now;
    });
    
    // Convert to calendar events
    const events = await Promise.all(
      upcomingSessions.map(session => this.createCalendarEvent(session))
    );
    
    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  private generateEventDescription(session: Session): string {
    const lines = [
      `AI Coding Session`,
      `Session ID: ${session.id}`,
      `Status: ${session.status}`,
      `Tokens Used: ${session.tokensUsed.toLocaleString()}`
    ];
    
    if (session.tokenBudget) {
      lines.push(`Token Budget: ${session.tokenBudget.toLocaleString()}`);
      const percentage = (session.tokensUsed / session.tokenBudget * 100).toFixed(1);
      lines.push(`Budget Usage: ${percentage}%`);
    }
    
    lines.push('', 'Generated by Moonlock Dashboard');
    
    return lines.join('\n');
  }
  
  private calculateEndTime(session: Session): Date {
    // If session is active, estimate end time based on token usage rate
    if (session.status === 'active') {
      const elapsed = Date.now() - session.startTime;
      const rate = session.tokensUsed / elapsed;
      
      if (session.tokenBudget) {
        const remainingTokens = session.tokenBudget - session.tokensUsed;
        const estimatedTimeRemaining = remainingTokens / rate;
        return new Date(Date.now() + estimatedTimeRemaining);
      } else {
        // Default to 2 hours from start
        return new Date(session.startTime + (2 * 60 * 60 * 1000));
      }
    }
    
    // If completed, use actual end time or estimate
    return new Date(session.endTime || session.startTime + session.duration);
  }
  
  private getEventColor(session: Session): string {
    // Color based on token usage percentage
    if (!session.tokenBudget) return '#4F46E5'; // Default indigo
    
    const percentage = session.tokensUsed / session.tokenBudget;
    
    if (percentage >= 0.9) return '#DC2626'; // Red - critical
    if (percentage >= 0.7) return '#F59E0B'; // Amber - warning
    if (percentage >= 0.5) return '#3B82F6'; // Blue - normal
    return '#10B981'; // Green - good
  }
  
  private detectSessionType(session: Session): string {
    // Simple heuristic based on session characteristics
    const duration = session.duration || (Date.now() - session.startTime);
    const hoursSpent = duration / (60 * 60 * 1000);
    
    if (session.tokensUsed > 100000 && hoursSpent > 3) return 'heavy_refactoring';
    if (session.tokensUsed > 50000) return 'feature_development';
    if (hoursSpent < 2) return 'bug_fixes';
    return 'general_development';
  }
  
  private formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  
  private formatGoogleDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  
  private formatYahooDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0];
  }
  
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}