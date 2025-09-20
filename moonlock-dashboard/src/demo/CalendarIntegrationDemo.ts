/**
 * Calendar Integration Demo
 * Comprehensive demonstration of calendar sync and session optimization capabilities
 */

import { CalendarSyncAgent } from '../agents/CalendarSyncAgent'
import { CalendarSyncService, OptimizationPreferences } from '../backend/CalendarSyncService'
import { WeeklyQuota } from '../agents/types'

export class CalendarIntegrationDemo {
  private calendarAgent: CalendarSyncAgent
  private calendarService: CalendarSyncService

  constructor() {
    this.calendarAgent = new CalendarSyncAgent({
      name: 'Demo Calendar Agent',
      tokenBudget: 1000,
      maxConcurrentTasks: 3
    })
    this.calendarService = this.calendarAgent.getCalendarService()
  }

  async runComprehensiveDemo(): Promise<void> {
    console.log('📅 Calendar Integration Demo')
    console.log('===============================\n')

    try {
      // Phase 1: Initialize and connect calendars
      await this.demonstrateCalendarConnection()

      // Phase 2: Show calendar synchronization
      await this.demonstrateCalendarSync()

      // Phase 3: Demonstrate available time slot detection
      await this.demonstrateTimeSlotDetection()

      // Phase 4: Create optimized schedule
      await this.demonstrateScheduleOptimization()

      // Phase 5: Show calendar event management
      await this.demonstrateEventManagement()

      // Phase 6: Demonstrate advanced optimization
      await this.demonstrateAdvancedOptimization()

      console.log('\n✅ Calendar Integration Demo completed successfully!')
      console.log('The calendar system is ready for production use.')

    } catch (error) {
      console.error('❌ Demo failed:', error.message)
    } finally {
      await this.cleanup()
    }
  }

  private async demonstrateCalendarConnection(): Promise<void> {
    console.log('🔗 Phase 1: Calendar Connection and Setup')
    console.log('------------------------------------------')

    // Initialize the calendar agent
    await this.calendarAgent.initialize()
    console.log('✓ Calendar agent initialized')

    // Connect to Google Calendar
    const googleConnected = await this.calendarAgent.connectCalendar('google')
    console.log(`✓ Google Calendar connection: ${googleConnected ? 'Success' : 'Failed (credentials needed)'}`)

    // Connect to Apple Calendar (macOS only)
    if (process.platform === 'darwin') {
      const appleConnected = await this.calendarAgent.connectCalendar('apple')
      console.log(`✓ Apple Calendar connection: ${appleConnected ? 'Success' : 'Failed'}`)
    }

    // Show connection status
    const connectedProviders = this.calendarService.getConnectedProviders()
    console.log(`📊 Connected Providers: ${connectedProviders.length}`)
    connectedProviders.forEach(provider => {
      console.log(`   - ${provider.name} (${provider.type})`)
    })

    console.log('')
  }

  private async demonstrateCalendarSync(): Promise<void> {
    console.log('🔄 Phase 2: Calendar Synchronization')
    console.log('------------------------------------')

    // Perform calendar sync
    console.log('✓ Starting calendar synchronization...')
    await this.calendarService.syncCalendars()

    // Show sync status
    const syncStatus = this.calendarService.getSyncStatus()
    console.log(`📊 Sync Status:`)
    console.log(`   Last Sync: ${syncStatus.lastSync?.toLocaleString() || 'Never'}`)
    console.log(`   Connected Providers: ${syncStatus.connectedProviders}`)
    console.log(`   Total Events: ${syncStatus.totalEvents}`)
    console.log(`   Auto-Sync: ${syncStatus.autoSyncEnabled ? 'Enabled' : 'Disabled'}`)

    // Show events for today
    const today = new Date()
    const todayEvents = await this.calendarService.getEventsForDate(today)
    console.log(`\n📅 Today's Events (${today.toDateString()}): ${todayEvents.length}`)
    todayEvents.forEach((event, index) => {
      const startTime = event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const endTime = event.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      console.log(`   ${index + 1}. ${event.title} (${startTime} - ${endTime}) [${event.type}]`)
    })

    console.log('')
  }

  private async demonstrateTimeSlotDetection(): Promise<void> {
    console.log('🎯 Phase 3: Available Time Slot Detection')
    console.log('------------------------------------------')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get available time slots with default preferences
    console.log('✓ Analyzing available time slots...')
    const timeSlots = await this.calendarService.getAvailableTimeSlots(tomorrow)

    console.log(`📊 Time Slot Analysis for ${tomorrow.toDateString()}:`)
    console.log(`   Total Slots: ${timeSlots.length}`)
    console.log(`   Available Slots: ${timeSlots.filter(s => s.available).length}`)
    console.log(`   Peak Quality Slots: ${timeSlots.filter(s => s.quality === 'peak').length}`)
    console.log(`   Good Quality Slots: ${timeSlots.filter(s => s.quality === 'good').length}`)

    // Show top 5 available slots
    const topSlots = timeSlots.filter(s => s.available).slice(0, 5)
    console.log('\n🌟 Top 5 Available Time Slots:')
    topSlots.forEach((slot, index) => {
      const startTime = slot.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const endTime = slot.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      console.log(`   ${index + 1}. ${startTime} - ${endTime} (${slot.quality} quality, ${slot.duration}min)`)
    })

    console.log('')
  }

  private async demonstrateScheduleOptimization(): Promise<void> {
    console.log('⚡ Phase 4: Schedule Optimization')
    console.log('---------------------------------')

    // Define weekly quota (example from implementation plan)
    const weeklyQuota: WeeklyQuota = {
      sonnet: {
        limit: 432, // 432 hours per week limit
        used: 120,  // 120 hours used so far
        remaining: 312
      },
      opus: {
        limit: 36,  // 36 hours per week limit
        used: 8,    // 8 hours used so far
        remaining: 28
      }
    }

    // Define optimization preferences
    const preferences: Partial<OptimizationPreferences> = {
      preferredTimeSlots: [
        { startHour: 9, endHour: 12, daysOfWeek: [1, 2, 3, 4, 5] }, // Weekday mornings
        { startHour: 14, endHour: 17, daysOfWeek: [1, 2, 3, 4, 5] } // Weekday afternoons
      ],
      minimumSessionDuration: 60,  // 1 hour minimum
      maximumSessionDuration: 180, // 3 hours maximum
      productivityPeakHours: { startHour: 9, endHour: 11 },
      avoidMeetingConflicts: true,
      bufferTime: 15
    }

    console.log('✓ Creating optimized schedule...')
    const optimizedSchedule = await this.calendarAgent.getOptimizedSchedule(weeklyQuota, preferences)

    console.log(`📊 Optimized Schedule Results:`)
    console.log(`   Week: ${optimizedSchedule.weekStart.toDateString()} - ${optimizedSchedule.weekEnd.toDateString()}`)
    console.log(`   Total Sessions: ${optimizedSchedule.sessions.length}`)
    console.log(`   Total Duration: ${Math.round(optimizedSchedule.totalDuration / 60)} hours`)
    console.log(`   Estimated Tokens: ${optimizedSchedule.totalTokens.toLocaleString()}`)
    console.log(`   Efficiency Score: ${optimizedSchedule.efficiency.toFixed(1)}%`)
    console.log(`   Sonnet Quota Usage: ${optimizedSchedule.quotaUtilization.sonnet.toFixed(1)}%`)
    console.log(`   Opus Quota Usage: ${optimizedSchedule.quotaUtilization.opus.toFixed(1)}%`)

    // Show scheduled sessions
    console.log('\n📅 Scheduled Sessions:')
    optimizedSchedule.sessions.forEach((session, index) => {
      const day = session.startTime.toLocaleDateString([], { weekday: 'short' })
      const startTime = session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const endTime = session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60))
      const modelType = session.metadata?.modelType || 'sonnet'
      const tokens = session.metadata?.estimatedTokens || 0
      
      console.log(`   ${index + 1}. ${day} ${startTime} - ${endTime} (${duration}min, ${modelType.toUpperCase()}, ${tokens.toLocaleString()} tokens)`)
    })

    console.log('')
  }

  private async demonstrateEventManagement(): Promise<void> {
    console.log('📝 Phase 5: Calendar Event Management')
    console.log('-------------------------------------')

    // Get the current week's events
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    console.log('✓ Retrieving week events...')
    const weekEvents = await this.calendarService.getEventsForWeek(weekStart)

    console.log(`📊 Week Overview (${weekStart.toDateString()}):`)
    console.log(`   Total Events: ${weekEvents.length}`)
    console.log(`   Meetings: ${weekEvents.filter(e => e.type === 'meeting').length}`)
    console.log(`   Claude Sessions: ${weekEvents.filter(e => e.type === 'claude-session').length}`)
    console.log(`   Work Blocks: ${weekEvents.filter(e => e.type === 'block').length}`)
    console.log(`   Personal: ${weekEvents.filter(e => e.type === 'personal').length}`)

    // Show Claude sessions specifically
    const claudeSessions = weekEvents.filter(e => e.type === 'claude-session')
    if (claudeSessions.length > 0) {
      console.log('\n🤖 Claude Code Sessions:')
      claudeSessions.forEach((session, index) => {
        const day = session.startTime.toLocaleDateString([], { weekday: 'short', day: 'numeric' })
        const startTime = session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60))
        const project = session.metadata?.projectName || 'Unknown Project'
        const model = session.metadata?.modelType || 'sonnet'
        
        console.log(`   ${index + 1}. ${day} ${startTime} (${duration}min) - ${project} [${model.toUpperCase()}]`)
      })
    }

    console.log('')
  }

  private async demonstrateAdvancedOptimization(): Promise<void> {
    console.log('🧠 Phase 6: Advanced Optimization Features')
    console.log('------------------------------------------')

    // Custom optimization preferences for different scenarios
    const scenarios = [
      {
        name: 'Early Bird Developer',
        preferences: {
          preferredTimeSlots: [
            { startHour: 6, endHour: 10, daysOfWeek: [1, 2, 3, 4, 5] }
          ],
          productivityPeakHours: { startHour: 6, endHour: 8 },
          minimumSessionDuration: 90,
          maximumSessionDuration: 180
        }
      },
      {
        name: 'Night Owl Developer',
        preferences: {
          preferredTimeSlots: [
            { startHour: 20, endHour: 23, daysOfWeek: [1, 2, 3, 4, 5] },
            { startHour: 10, endHour: 18, daysOfWeek: [0, 6] }
          ],
          productivityPeakHours: { startHour: 21, endHour: 23 },
          minimumSessionDuration: 120,
          maximumSessionDuration: 240
        }
      },
      {
        name: 'Balanced Schedule',
        preferences: {
          preferredTimeSlots: [
            { startHour: 9, endHour: 12, daysOfWeek: [1, 2, 3, 4, 5] },
            { startHour: 14, endHour: 17, daysOfWeek: [1, 2, 3, 4, 5] },
            { startHour: 10, endHour: 16, daysOfWeek: [0, 6] }
          ],
          productivityPeakHours: { startHour: 9, endHour: 11 },
          minimumSessionDuration: 60,
          maximumSessionDuration: 180,
          breakBetweenSessions: 30
        }
      }
    ]

    console.log('✓ Testing optimization scenarios...')

    for (const scenario of scenarios) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const slots = await this.calendarService.getAvailableTimeSlots(tomorrow, scenario.preferences)
      const availableSlots = slots.filter(s => s.available)
      const peakSlots = availableSlots.filter(s => s.quality === 'peak')

      console.log(`\n📊 ${scenario.name}:`)
      console.log(`   Available Slots: ${availableSlots.length}`)
      console.log(`   Peak Quality Slots: ${peakSlots.length}`)
      console.log(`   Optimal Time Range: ${scenario.preferences.productivityPeakHours.startHour}:00 - ${scenario.preferences.productivityPeakHours.endHour}:00`)

      if (peakSlots.length > 0) {
        const bestSlot = peakSlots[0]
        const timeRange = `${bestSlot.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${bestSlot.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        console.log(`   Best Slot: ${timeRange}`)
      }
    }

    // Show system recommendations
    console.log('\n💡 System Recommendations:')
    console.log('   • Schedule Sonnet sessions during peak productivity hours for maximum efficiency')
    console.log('   • Reserve Opus sessions for complex architectural decisions and strategic planning')
    console.log('   • Maintain 15-minute buffers between sessions to avoid context switching overhead')
    console.log('   • Use automated calendar sync to keep schedules updated in real-time')
    console.log('   • Monitor token usage patterns to optimize session length and frequency')

    console.log('')
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up demo resources...')
    
    try {
      await this.calendarAgent.shutdown()
      console.log('✓ Calendar agent shutdown completed')
    } catch (error) {
      console.warn('⚠ Some cleanup operations failed:', error.message)
    }
  }
}

// Demo execution function
export async function runCalendarIntegrationDemo(): Promise<void> {
  const demo = new CalendarIntegrationDemo()
  await demo.runComprehensiveDemo()
}

// Run demo if this file is executed directly
if (require.main === module) {
  runCalendarIntegrationDemo().catch(console.error)
}