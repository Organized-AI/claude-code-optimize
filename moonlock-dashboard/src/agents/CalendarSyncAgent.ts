/**
 * CalendarSyncAgent: Calendar integration and session planning
 * Manages calendar synchronization and optimized session scheduling
 */

import { BaseAgent } from './BaseAgent'
import { Task, WeeklyQuota } from './types'
import { CalendarSyncService, Schedule, CalendarProvider, OptimizationPreferences } from '../backend/CalendarSyncService'

export class CalendarSyncAgent extends BaseAgent {
  private calendarService: CalendarSyncService
  private isInitialized: boolean = false

  constructor(config: any) {
    super(config)
    this.calendarService = new CalendarSyncService()
    this.setupEventListeners()
  }

  async initialize(): Promise<void> {
    this.log('info', 'Initializing CalendarSyncAgent...')
    
    try {
      // Start auto-sync for connected providers
      this.calendarService.startAutoSync(30) // Sync every 30 minutes
      
      // Attempt to connect to default providers
      await this.connectDefaultProviders()
      
      this.isInitialized = true
      this.log('info', 'CalendarSyncAgent initialized successfully')
      
      this.emit('agent_ready', {
        agentId: this.id,
        capabilities: ['calendar-sync', 'schedule-optimization', 'event-management']
      })
    } catch (error) {
      this.log('error', `Failed to initialize CalendarSyncAgent: ${error.message}`)
      throw error
    }
  }

  private setupEventListeners(): void {
    this.calendarService.on('provider_connected', (data) => {
      this.log('info', `Calendar provider connected: ${data.provider}`)
      this.emit('provider_status_changed', data)
    })

    this.calendarService.on('provider_disconnected', (data) => {
      this.log('info', `Calendar provider disconnected: ${data.provider}`)
      this.emit('provider_status_changed', data)
    })

    this.calendarService.on('calendar_synced', (data) => {
      this.log('info', `Calendar synced: ${data.provider} (${data.eventCount} events)`)
      this.emit('calendar_updated', data)
    })

    this.calendarService.on('schedule_synced', (data) => {
      this.log('info', `Schedule synced to ${data.provider}: ${data.sessionCount} sessions`)
      this.emit('schedule_created', data)
    })

    this.calendarService.on('sync_error', (data) => {
      this.log('error', `Calendar sync error for ${data.provider}: ${data.error}`)
      this.emit('sync_error', data)
    })
  }

  private async connectDefaultProviders(): Promise<void> {
    // Try to connect to Google Calendar (most common)
    try {
      await this.calendarService.connectProvider('google')
      this.log('info', 'Connected to Google Calendar')
    } catch (error) {
      this.log('warn', 'Could not connect to Google Calendar (credentials needed)')
    }

    // Try to connect to Apple Calendar on macOS
    if (process.platform === 'darwin') {
      try {
        await this.calendarService.connectProvider('apple')
        this.log('info', 'Connected to Apple Calendar')
      } catch (error) {
        this.log('warn', 'Could not connect to Apple Calendar')
      }
    }
  }

  async execute(task: Task): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('CalendarSyncAgent not initialized')
    }

    this.log('info', `Executing task: ${task.name}`)
    
    try {
      switch (task.name) {
        case 'connect-calendar':
          return await this.handleConnectCalendar(task)
        
        case 'disconnect-calendar':
          return await this.handleDisconnectCalendar(task)
        
        case 'sync-calendars':
          return await this.handleSyncCalendars(task)
        
        case 'create-optimized-schedule':
          return await this.handleCreateOptimizedSchedule(task)
        
        case 'sync-schedule-to-calendar':
          return await this.handleSyncScheduleToCalendar(task)
        
        case 'get-available-slots':
          return await this.handleGetAvailableSlots(task)
        
        case 'get-calendar-events':
          return await this.handleGetCalendarEvents(task)
        
        case 'get-sync-status':
          return await this.handleGetSyncStatus(task)
        
        case 'update-optimization-preferences':
          return await this.handleUpdateOptimizationPreferences(task)
        
        default:
          throw new Error(`Unknown task: ${task.name}`)
      }
    } catch (error) {
      this.log('error', `Task execution failed: ${error.message}`)
      throw error
    }
  }

  private async handleConnectCalendar(task: Task): Promise<{ connected: boolean; provider: string }> {
    const { providerType, credentials } = task.metadata || {}
    
    if (!providerType) {
      throw new Error('Provider type required for calendar connection')
    }

    const connected = await this.calendarService.connectProvider(providerType, credentials)
    
    if (connected) {
      // Perform initial sync
      await this.calendarService.syncCalendars()
    }

    return { connected, provider: providerType }
  }

  private async handleDisconnectCalendar(task: Task): Promise<{ disconnected: boolean; provider: string }> {
    const { providerType } = task.metadata || {}
    
    if (!providerType) {
      throw new Error('Provider type required for calendar disconnection')
    }

    await this.calendarService.disconnectProvider(providerType)
    return { disconnected: true, provider: providerType }
  }

  private async handleSyncCalendars(task: Task): Promise<{ synced: boolean; timestamp: Date }> {
    await this.calendarService.syncCalendars()
    return { synced: true, timestamp: new Date() }
  }

  private async handleCreateOptimizedSchedule(task: Task): Promise<Schedule> {
    const { weeklyQuota, preferences } = task.metadata || {}
    
    if (!weeklyQuota) {
      throw new Error('Weekly quota required for schedule optimization')
    }

    const schedule = await this.calendarService.createOptimizedSchedule(
      weeklyQuota as WeeklyQuota,
      preferences as Partial<OptimizationPreferences>
    )

    this.log('info', `Created optimized schedule with ${schedule.sessions.length} sessions`)
    return schedule
  }

  private async handleSyncScheduleToCalendar(task: Task): Promise<{ synced: boolean; sessionCount: number }> {
    const { schedule, providerType = 'google' } = task.metadata || {}
    
    if (!schedule) {
      throw new Error('Schedule required for calendar sync')
    }

    await this.calendarService.syncToCalendar(schedule as Schedule, providerType)
    
    return { 
      synced: true, 
      sessionCount: (schedule as Schedule).sessions.length 
    }
  }

  private async handleGetAvailableSlots(task: Task): Promise<any> {
    const { date, preferences } = task.metadata || {}
    
    if (!date) {
      throw new Error('Date required for available slots query')
    }

    const slots = await this.calendarService.getAvailableTimeSlots(
      new Date(date),
      preferences as Partial<OptimizationPreferences>
    )

    return {
      date: new Date(date),
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.available).length,
      peakSlots: slots.filter(s => s.quality === 'peak').length,
      slots: slots.slice(0, 10) // Return top 10 slots
    }
  }

  private async handleGetCalendarEvents(task: Task): Promise<any> {
    const { date, week } = task.metadata || {}
    
    if (date) {
      const events = await this.calendarService.getEventsForDate(new Date(date))
      return { date: new Date(date), eventCount: events.length, events }
    }
    
    if (week) {
      const events = await this.calendarService.getEventsForWeek(new Date(week))
      return { week: new Date(week), eventCount: events.length, events }
    }
    
    throw new Error('Date or week required for calendar events query')
  }

  private async handleGetSyncStatus(task: Task): Promise<any> {
    const status = this.calendarService.getSyncStatus()
    const providers = this.calendarService.getConnectedProviders()
    
    return {
      ...status,
      providers: providers.map(p => ({
        type: p.type,
        name: p.name,
        connected: p.connected,
        lastSync: p.lastSync
      }))
    }
  }

  private async handleUpdateOptimizationPreferences(task: Task): Promise<{ updated: boolean }> {
    const { preferences } = task.metadata || {}
    
    if (!preferences) {
      throw new Error('Preferences required for optimization update')
    }

    // Store preferences (in production, this would persist to database)
    this.log('info', 'Updated optimization preferences')
    
    return { updated: true }
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down CalendarSyncAgent...')
    
    try {
      this.calendarService.stopAutoSync()
      this.calendarService.removeAllListeners()
      this.isInitialized = false
      
      this.log('info', 'CalendarSyncAgent shutdown completed')
    } catch (error) {
      this.log('error', `Error during CalendarSyncAgent shutdown: ${error.message}`)
    }
  }

  // Public API methods for direct integration
  async connectCalendar(providerType: 'google' | 'apple' | 'outlook', credentials?: any): Promise<boolean> {
    return await this.calendarService.connectProvider(providerType, credentials)
  }

  async getOptimizedSchedule(weeklyQuota: WeeklyQuota, preferences?: Partial<OptimizationPreferences>): Promise<Schedule> {
    return await this.calendarService.createOptimizedSchedule(weeklyQuota, preferences)
  }

  async syncSchedule(schedule: Schedule, providerType: string = 'google'): Promise<void> {
    await this.calendarService.syncToCalendar(schedule, providerType)
  }

  getCalendarService(): CalendarSyncService {
    return this.calendarService
  }
}