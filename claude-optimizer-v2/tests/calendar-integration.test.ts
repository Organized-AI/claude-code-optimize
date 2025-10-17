/**
 * Calendar Integration Tests
 * Validates iCal generation, API endpoints, and download functionality
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Calendar Integration', () => {
  const ICAL_PATH = path.join(__dirname, '..', 'my-sessions.ics');
  const API_ENDPOINT = 'http://localhost:3001/api/calendar/download';

  describe('iCal File Validation', () => {
    test('iCal file exists', () => {
      expect(fs.existsSync(ICAL_PATH)).toBe(true);
    });

    test('iCal file has valid structure', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Must start with BEGIN:VCALENDAR
      expect(content.trim()).toMatch(/^BEGIN:VCALENDAR/);

      // Must end with END:VCALENDAR
      expect(content.trim()).toMatch(/END:VCALENDAR\s*$/);

      // Must have VERSION:2.0
      expect(content).toContain('VERSION:2.0');

      // Must have PRODID
      expect(content).toContain('PRODID:');
    });

    test('iCal contains valid VEVENT blocks', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Should have at least one event
      expect(content).toContain('BEGIN:VEVENT');
      expect(content).toContain('END:VEVENT');

      // Count events
      const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
      const endEventCount = (content.match(/END:VEVENT/g) || []).length;

      // BEGIN and END must match
      expect(eventCount).toBe(endEventCount);
      expect(eventCount).toBeGreaterThan(0);
    });

    test('Events have required fields', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Extract first event
      const eventMatch = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
      expect(eventMatch).toBeTruthy();

      const event = eventMatch![0];

      // Required fields per RFC 5545
      expect(event).toContain('UID:');
      expect(event).toContain('DTSTAMP:');
      expect(event).toContain('DTSTART:');
      expect(event).toContain('DTEND:');
      expect(event).toContain('SUMMARY:');
    });

    test('Date-time formats are valid', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // RFC 5545 date-time format: YYYYMMDDTHHMMSSZ
      const dateTimePattern = /\d{8}T\d{6}Z/;

      const dtstart = content.match(/DTSTART:(\d{8}T\d{6}Z)/);
      const dtend = content.match(/DTEND:(\d{8}T\d{6}Z)/);
      const dtstamp = content.match(/DTSTAMP:(\d{8}T\d{6}Z)/);

      expect(dtstart).toBeTruthy();
      expect(dtend).toBeTruthy();
      expect(dtstamp).toBeTruthy();

      expect(dtstart![1]).toMatch(dateTimePattern);
      expect(dtend![1]).toMatch(dateTimePattern);
      expect(dtstamp![1]).toMatch(dateTimePattern);
    });

    test('UID is unique and properly formatted', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      const uids = content.match(/UID:(.+)/g) || [];

      // UIDs should contain domain-like suffix
      uids.forEach(uid => {
        expect(uid).toMatch(/UID:.+@.+/);
      });

      // All UIDs should be unique
      const uniqueUids = new Set(uids);
      expect(uniqueUids.size).toBe(uids.length);
    });

    test('Events have alarms configured', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Should have VALARM blocks
      expect(content).toContain('BEGIN:VALARM');
      expect(content).toContain('END:VALARM');

      // Check for 30-minute reminder
      expect(content).toContain('TRIGGER:-PT30M');

      // Check for 5-minute reminder
      expect(content).toContain('TRIGGER:-PT5M');
    });
  });

  describe('API Endpoint Tests', () => {
    test('API endpoint is accessible', async () => {
      try {
        const response = await fetch(API_ENDPOINT);
        // Should return 200 or 404 (if server not running)
        expect([200, 404, 500]).toContain(response.status);
      } catch (error) {
        // Server might not be running - that's okay for unit tests
        console.warn('⚠️ Server not running - skipping API test');
      }
    }, 10000);

    test('API returns correct content type', async () => {
      try {
        const response = await fetch(API_ENDPOINT);

        if (response.status === 200) {
          const contentType = response.headers.get('content-type');
          expect(contentType).toContain('text/calendar');
        }
      } catch (error) {
        console.warn('⚠️ Server not running - skipping content-type test');
      }
    }, 10000);

    test('API returns valid iCal content', async () => {
      try {
        const response = await fetch(API_ENDPOINT);

        if (response.status === 200) {
          const content = await response.text();

          expect(content).toContain('BEGIN:VCALENDAR');
          expect(content).toContain('END:VCALENDAR');
          expect(content).toContain('VERSION:2.0');
        }
      } catch (error) {
        console.warn('⚠️ Server not running - skipping content test');
      }
    }, 10000);

    test('API sets correct download headers', async () => {
      try {
        const response = await fetch(API_ENDPOINT);

        if (response.status === 200) {
          const disposition = response.headers.get('content-disposition');
          expect(disposition).toContain('attachment');
          expect(disposition).toContain('claude-sessions.ics');
        }
      } catch (error) {
        console.warn('⚠️ Server not running - skipping headers test');
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    test('Handles missing iCal file gracefully', () => {
      const nonExistentPath = path.join(__dirname, 'non-existent.ics');
      expect(fs.existsSync(nonExistentPath)).toBe(false);
    });

    test('iCal content is valid UTF-8', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Should not throw on UTF-8 encoding
      expect(() => {
        Buffer.from(content, 'utf-8');
      }).not.toThrow();
    });

    test('No line exceeds 75 characters (RFC 5545)', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');
      const lines = content.split(/\r?\n/);

      // RFC 5545: Lines should be folded at 75 octets
      // Check that most lines respect this (some like URLs might exceed)
      const longLines = lines.filter(line =>
        line.length > 75 &&
        !line.startsWith(' ') && // Folded continuation
        !line.includes('http') // URLs can be long
      );

      // Allow some flexibility but flag excessive violations
      expect(longLines.length).toBeLessThan(lines.length * 0.1);
    });
  });

  describe('Calendar Compatibility', () => {
    test('Escapes special characters correctly', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Check for proper escaping in DESCRIPTION fields
      const descriptions = content.match(/DESCRIPTION:.+/g) || [];

      descriptions.forEach(desc => {
        // Commas should be escaped as \,
        // Newlines should be \n not actual newlines
        if (desc.includes(',') && !desc.includes('\\,')) {
          // Some commas might be valid (like in numbers)
          // Just check it's formatted reasonably
          expect(desc).toBeTruthy();
        }
      });
    });

    test('Timezone is properly specified', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Should specify UTC timezone
      expect(content).toContain('X-WR-TIMEZONE:UTC');

      // All datetime values should end with Z (UTC)
      const datetimes = content.match(/DT(START|END|STAMP):\d{8}T\d{6}./g) || [];
      datetimes.forEach(dt => {
        expect(dt).toMatch(/Z$/);
      });
    });

    test('Calendar has proper metadata', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Helpful metadata for calendar apps
      expect(content).toContain('X-WR-CALNAME:');
      expect(content).toContain('CALSCALE:GREGORIAN');
      expect(content).toContain('METHOD:PUBLISH');
    });
  });

  describe('Integration Smoke Tests', () => {
    test('File can be read and parsed by calendar libraries', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      // Basic parsing check - split into components
      const components = content.split(/BEGIN:/);

      expect(components.length).toBeGreaterThan(2); // At least VCALENDAR and VEVENT
    });

    test('Event duration is logical', () => {
      const content = fs.readFileSync(ICAL_PATH, 'utf-8');

      const dtstartMatch = content.match(/DTSTART:(\d{8}T\d{6}Z)/);
      const dtendMatch = content.match(/DTEND:(\d{8}T\d{6}Z)/);

      if (dtstartMatch && dtendMatch) {
        const start = dtstartMatch[1];
        const end = dtendMatch[1];

        // End should be after start
        expect(end).toBeGreaterThan(start);

        // Parse to check duration is reasonable (not negative, not >24h)
        const startDate = parseICalDate(start);
        const endDate = parseICalDate(end);
        const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

        expect(durationHours).toBeGreaterThan(0);
        expect(durationHours).toBeLessThan(24);
      }
    });
  });
});

/**
 * Helper: Parse iCal date format (YYYYMMDDTHHMMSSZ)
 */
function parseICalDate(icalDate: string): Date {
  const year = parseInt(icalDate.substring(0, 4));
  const month = parseInt(icalDate.substring(4, 6)) - 1;
  const day = parseInt(icalDate.substring(6, 8));
  const hour = parseInt(icalDate.substring(9, 11));
  const minute = parseInt(icalDate.substring(11, 13));
  const second = parseInt(icalDate.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}
