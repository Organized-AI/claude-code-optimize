import { Router } from 'express';
import { CalendarIntegrationService } from '../services/CalendarIntegrationService.js';
import { ExtendedSessionManager } from '../services/ExtendedSessionManager.js';
import { WebSocketManager } from '../services/WebSocketManager.js';

export function createCalendarRouter(
  sessionManager: ExtendedSessionManager,
  wsManager: WebSocketManager
): Router {
  const router = Router();
  const calendarService = new CalendarIntegrationService(sessionManager, wsManager);
  
  // Create calendar event for session
  router.post('/sessions/:sessionId/calendar-event', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await sessionManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const event = await calendarService.createCalendarEvent(session, req.body);
      res.json(event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ 
        error: 'Failed to create calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Generate iCal file for sessions
  router.post('/calendar/export/ical', async (req, res) => {
    try {
      const { sessionIds } = req.body;
      
      if (!Array.isArray(sessionIds)) {
        return res.status(400).json({ error: 'Session IDs array required' });
      }
      
      const events = await Promise.all(
        sessionIds.map(async (id) => {
          const session = await sessionManager.getSession(id);
          return session ? calendarService.createCalendarEvent(session) : null;
        })
      );
      
      const validEvents = events.filter(e => e !== null);
      const icalContent = await calendarService.generateICalFile(validEvents);
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="moonlock-sessions.ics"');
      res.send(icalContent);
    } catch (error) {
      console.error('Error generating iCal:', error);
      res.status(500).json({ 
        error: 'Failed to generate iCal file',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Setup Google Calendar integration
  router.post('/calendar/google/setup', async (req, res) => {
    try {
      const { authCode } = req.body;
      
      if (!authCode) {
        return res.status(400).json({ error: 'Authorization code required' });
      }
      
      const integration = await calendarService.setupGoogleCalendarIntegration(authCode);
      res.json(integration);
    } catch (error) {
      console.error('Error setting up Google Calendar:', error);
      res.status(500).json({ 
        error: 'Failed to setup Google Calendar',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Sync event to Google Calendar
  router.post('/calendar/google/sync', async (req, res) => {
    try {
      const { event } = req.body;
      
      if (!event) {
        return res.status(400).json({ error: 'Event data required' });
      }
      
      await calendarService.syncToGoogleCalendar(event);
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      res.status(500).json({ 
        error: 'Failed to sync to Google Calendar',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Generate calendar URLs
  router.post('/calendar/generate-url', async (req, res) => {
    try {
      const { event, provider } = req.body;
      
      if (!event || !provider) {
        return res.status(400).json({ error: 'Event and provider required' });
      }
      
      if (!['google', 'outlook', 'yahoo'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }
      
      const url = await calendarService.generateCalendarUrl(
        event, 
        provider as 'google' | 'outlook' | 'yahoo'
      );
      
      res.json({ url });
    } catch (error) {
      console.error('Error generating calendar URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate calendar URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get upcoming sessions
  router.get('/calendar/upcoming', async (req, res) => {
    try {
      const events = await calendarService.getUpcomingSessions();
      res.json(events);
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
      res.status(500).json({ 
        error: 'Failed to get upcoming sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}