#!/usr/bin/env node

/**
 * Test script to generate and validate sample .ics file
 * This creates a test calendar export without requiring Google Calendar authentication
 */

import { IcalValidator } from '../src/ical-validator.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface TestEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  sessionConfig: {
    projectPath: string;
    projectName: string;
    phase: string;
    model: string;
    tokenBudget: number;
    objectives: string[];
  };
}

/**
 * Generate test iCal content
 */
function generateTestIcal(): string {
  // Create test event (simulating SESSION 10 from the plans)
  const testEvent: TestEvent = {
    id: 'test-session-10',
    summary: '🤖 Claude Session: SESSION 10 - Real Data Integration',
    start: new Date('2025-10-03T14:00:00Z'),
    end: new Date('2025-10-03T17:00:00Z'),
    sessionConfig: {
      projectPath: '/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer',
      projectName: 'Claude Code Optimizer',
      phase: 'SESSION 10 - Real Data Integration & Dashboard Enhancement',
      model: 'claude-sonnet-4',
      tokenBudget: 75000,
      objectives: [
        'Integrate real Google Calendar data into dashboard',
        'Add frontend WebSocket handlers for live updates',
        'Implement session status tracking',
        'Enhance dashboard UI with real-time metrics'
      ]
    }
  };

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

  // Format event
  icalLines.push('BEGIN:VEVENT');
  icalLines.push(`UID:${testEvent.id}@claude-optimizer`);
  icalLines.push(`DTSTAMP:${formatIcalDate(new Date())}`);
  icalLines.push(`DTSTART:${formatIcalDate(testEvent.start)}`);
  icalLines.push(`DTEND:${formatIcalDate(testEvent.end)}`);
  icalLines.push(`SUMMARY:${escapeIcalText(testEvent.summary)}`);

  // Add description with session details
  const description = formatIcalDescription(testEvent);
  icalLines.push(`DESCRIPTION:${escapeIcalText(description)}`);

  // Add location
  icalLines.push(`LOCATION:${escapeIcalText(testEvent.sessionConfig.projectPath)}`);

  // Add reminders
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

  // Add color
  icalLines.push('COLOR:blue');

  icalLines.push('END:VEVENT');
  icalLines.push('END:VCALENDAR');

  return icalLines.join('\r\n');
}

/**
 * Format date for iCal (UTC format: YYYYMMDDTHHmmssZ)
 */
function formatIcalDate(date: Date): string {
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
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Format session description for iCal
 */
function formatIcalDescription(event: TestEvent): string {
  const planMatch = event.sessionConfig.phase.match(/SESSION[_ ](\d+[A-Z]?)/i);
  const planName = planMatch ? planMatch[1] : null;

  const projectPath = event.sessionConfig.projectPath;
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
  lines.push(`Project: ${event.sessionConfig.projectName}`);
  lines.push(`Phase: ${event.sessionConfig.phase}`);
  lines.push(`Model: ${event.sessionConfig.model}`);
  lines.push(`Token Budget: ${event.sessionConfig.tokenBudget.toLocaleString()}`);
  lines.push('');

  // Add objectives
  if (event.sessionConfig.objectives.length > 0) {
    lines.push('🎯 Objectives:');
    event.sessionConfig.objectives.forEach((obj, i) => {
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

/**
 * Main execution
 */
async function main() {
  console.log('🧪 iCal Test Generator & Validator\n');
  console.log('Generating test .ics file...\n');

  // Generate test iCal content
  const icalContent = generateTestIcal();

  // Write to file
  const outputPath = join(process.cwd(), 'test-session.ics');
  await writeFile(outputPath, icalContent, 'utf-8');

  console.log(`✅ Generated: ${outputPath}\n`);

  // Validate
  console.log('Running validation...\n');
  const validator = new IcalValidator();
  const report = validator.generateReport(icalContent);

  console.log(report);

  // Show sample of the content
  console.log('\n' + '='.repeat(60));
  console.log('Sample Content (first 20 lines):');
  console.log('='.repeat(60) + '\n');
  const lines = icalContent.split('\r\n');
  console.log(lines.slice(0, 20).join('\n'));
  console.log('\n...(truncated)...\n');

  console.log('='.repeat(60));
  console.log('Testing Instructions:');
  console.log('='.repeat(60));
  console.log('\n1. Mac Testing:');
  console.log(`   open ${outputPath}`);
  console.log('   - Should open Calendar.app');
  console.log('   - Click "Add" to import event');
  console.log('   - Check if URLs are clickable in event description\n');

  console.log('2. iPhone Testing:');
  console.log('   - AirDrop the .ics file to your iPhone');
  console.log('   - Or email it to yourself');
  console.log('   - Tap to import');
  console.log('   - Check if text formatting is preserved\n');

  console.log('3. Google Calendar Testing:');
  console.log('   - Go to calendar.google.com');
  console.log('   - Settings → Import & Export → Import');
  console.log(`   - Upload ${outputPath}`);
  console.log('   - Check if event displays correctly\n');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
