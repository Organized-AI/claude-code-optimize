#!/usr/bin/env node

/**
 * Update Calendar Event
 * Updates the "Testing & Integration" event with better iPhone-friendly content
 */

import { CalendarService } from './dist/calendar-service.js';

async function updateEvent() {
  const calendarService = new CalendarService();

  try {
    console.log('📅 Fetching upcoming sessions...\n');

    // Get the upcoming sessions
    const sessions = await calendarService.listUpcomingSessions();

    if (sessions.length === 0) {
      console.log('❌ No sessions found to update');
      process.exit(1);
    }

    // Find the "Testing & Integration" session
    const session = sessions.find(s =>
      s.sessionConfig.phase.includes('Testing') ||
      s.summary?.includes('Testing')
    );

    if (!session) {
      console.log('❌ Could not find "Testing & Integration" session');
      console.log('\nAvailable sessions:');
      sessions.forEach(s => console.log(`  - ${s.summary}`));
      process.exit(1);
    }

    console.log(`✅ Found session: ${session.summary}`);
    console.log(`   Event ID: ${session.id}`);
    console.log(`   Start: ${session.start.toLocaleString()}`);
    console.log();

    // Create enhanced description for iPhone
    const projectPath = session.sessionConfig.projectPath;
    const projectName = session.sessionConfig.projectName;
    const phase = session.sessionConfig.phase;
    const objectives = session.sessionConfig.objectives || [];

    const enhancedDescription = `
🚀 QUICK START - iPhone Workflow
═══════════════════════════════════════

📱 ON YOUR IPHONE:
   1. Open this event
   2. Copy the command below
   3. AirDrop or text it to your Mac

💻 ON YOUR MAC:
   1. Open Terminal
   2. Paste the command
   3. Press Enter to start Claude Code

📋 COPY THIS COMMAND:
═══════════════════════════════════════
cd "${projectPath}" && claude
═══════════════════════════════════════

🎯 SESSION CONTEXT
═══════════════════════════════════════

Project: ${projectName}
Phase: ${phase}
Model: ${session.sessionConfig.model}
Budget: ${session.sessionConfig.tokenBudget.toLocaleString()} tokens

📝 What to work on:
${objectives.map((obj, i) => `   ${i + 1}. ${obj}`).join('\n')}

═══════════════════════════════════════

💡 TIP: Add this to iPhone Notes or Shortcuts for quick access
    `.trim();

    console.log('🔄 Updating event with enhanced description...\n');

    // Initialize the calendar service (needed for API access)
    await calendarService.initialize();

    // Update the event using the Google Calendar API
    // Access private calendar property (we know it exists after initialize())
    const calendar = calendarService.calendar;

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: session.id,
      requestBody: {
        description: enhancedDescription
      }
    });

    console.log('✅ Event updated successfully!');
    console.log();
    console.log('📱 Next steps:');
    console.log('   1. Open the event on your iPhone');
    console.log('   2. You\'ll see the simplified command to copy');
    console.log('   3. AirDrop or message it to your Mac');
    console.log();

  } catch (error) {
    console.error('❌ Error updating event:', error.message);
    process.exit(1);
  }
}

updateEvent();
