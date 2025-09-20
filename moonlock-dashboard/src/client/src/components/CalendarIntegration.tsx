import React, { useState, useEffect } from 'react';
import { CalendarEvent, Session } from '../../../shared/types';
import { useDataController } from '../hooks/useDataController';
import { Calendar, Download, ExternalLink, Clock, Bell } from 'lucide-react';

interface CalendarProvider {
  id: 'google' | 'outlook' | 'yahoo' | 'ical';
  name: string;
  icon: string;
}

const providers: CalendarProvider[] = [
  { id: 'google', name: 'Google Calendar', icon: '📅' },
  { id: 'outlook', name: 'Outlook', icon: '📧' },
  { id: 'yahoo', name: 'Yahoo', icon: '💜' },
  { id: 'ical', name: 'Download .ics', icon: '📥' }
];

export const CalendarIntegration: React.FC = () => {
  const { session } = useDataController();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [eventOptions, setEventOptions] = useState({
    title: '',
    description: '',
    reminders: [15, 5]
  });

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  useEffect(() => {
    if (session) {
      setEventOptions(prev => ({
        ...prev,
        title: `AI Coding: ${session.name || `Session ${session.id.slice(0, 8)}`}`,
        description: `Token Budget: ${session.tokenBudget?.toLocaleString() || 'Unlimited'}\nCurrent Usage: ${session.tokensUsed.toLocaleString()}`
      }));
    }
  }, [session]);

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/calendar/upcoming');
      if (response.ok) {
        const events = await response.json();
        setUpcomingEvents(events);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const createCalendarEvent = async () => {
    if (!session || !selectedProvider) return;

    try {
      setCreating(true);

      if (selectedProvider.id === 'ical') {
        // Download iCal file
        const response = await fetch('/api/calendar/export/ical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionIds: [session.id] })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'moonlock-session.ics';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        // Create event and get calendar URL
        const eventResponse = await fetch(`/api/calendar/sessions/${session.id}/calendar-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventOptions)
        });

        if (!eventResponse.ok) throw new Error('Failed to create event');
        const event = await eventResponse.json();

        // Generate calendar URL
        const urlResponse = await fetch('/api/calendar/generate-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, provider: selectedProvider.id })
        });

        if (!urlResponse.ok) throw new Error('Failed to generate URL');
        const { url } = await urlResponse.json();

        // Open in new tab
        window.open(url, '_blank');
      }

      // Refresh upcoming events
      await fetchUpcomingEvents();
    } catch (error) {
      console.error('Error creating calendar event:', error);
    } finally {
      setCreating(false);
      setSelectedProvider(null);
    }
  };

  const formatEventTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="metric-card">
      <h3 className="text-lg font-semibold text-dark-200 mb-4 flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-moonlock-400" />
        Calendar Integration
      </h3>

      {session && (
        <div className="space-y-4">
          {/* Event Creation */}
          <div className="bg-dark-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-dark-300 mb-3">
              Add Current Session to Calendar
            </h4>
            
            {/* Event Options */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-dark-400 mb-1 block">Event Title</label>
                <input
                  type="text"
                  value={eventOptions.title}
                  onChange={e => setEventOptions(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-dark-700 rounded px-3 py-2 text-sm text-dark-200 focus:outline-none focus:ring-1 focus:ring-moonlock-500"
                />
              </div>
              
              <div>
                <label className="text-xs text-dark-400 mb-1 block">Reminders (minutes before)</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 30].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => {
                        setEventOptions(prev => ({
                          ...prev,
                          reminders: prev.reminders.includes(minutes)
                            ? prev.reminders.filter(m => m !== minutes)
                            : [...prev.reminders, minutes]
                        }));
                      }}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        eventOptions.reminders.includes(minutes)
                          ? 'bg-moonlock-500 text-white'
                          : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="grid grid-cols-2 gap-2">
              {providers.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProvider(provider);
                    createCalendarEvent();
                  }}
                  disabled={creating}
                  className="flex items-center justify-center space-x-2 bg-dark-700 hover:bg-dark-600 rounded px-3 py-2 text-sm text-dark-200 transition-colors disabled:opacity-50"
                >
                  <span>{provider.icon}</span>
                  <span>{provider.name}</span>
                  {provider.id !== 'ical' && <ExternalLink className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming Sessions */}
          {upcomingEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-dark-300 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Upcoming Sessions
              </h4>
              <div className="space-y-2">
                {upcomingEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className="bg-dark-800 rounded-lg p-3 border border-dark-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-dark-200 text-sm">
                          {event.title}
                        </div>
                        <div className="text-xs text-dark-400 mt-1">
                          {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}
                        </div>
                        <div className="flex items-center mt-2 space-x-3 text-xs text-dark-500">
                          <span>
                            Budget: {event.metadata.tokenBudget.toLocaleString()}
                          </span>
                          {event.reminders.length > 0 && (
                            <span className="flex items-center">
                              <Bell className="w-3 h-3 mr-1" />
                              {event.reminders.join(', ')}m
                            </span>
                          )}
                        </div>
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-3 border-t border-dark-700">
            <button
              onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank')}
              className="text-xs text-moonlock-400 hover:text-moonlock-300 flex items-center"
            >
              <Download className="w-3 h-3 mr-1" />
              Export all sessions as calendar
            </button>
          </div>
        </div>
      )}

      {!session && (
        <div className="text-center py-8 text-dark-400 text-sm">
          Start a session to enable calendar integration
        </div>
      )}
    </div>
  );
};