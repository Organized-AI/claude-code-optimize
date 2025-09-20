/**
 * CalendarSyncService: Calendar integration and session planning
 * Provides Google Calendar and Apple Calendar integration with optimized session scheduling
 */

import { EventEmitter } from 'events'
import { WeeklyQuota, SessionInfo } from '../agents/types'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string[]
  type: 'claude-session' | 'meeting' | 'block' | 'personal'
  metadata?: {
    sessionId?: string
    projectName?: string
    estimatedTokens?: number
    modelType?: 'sonnet' | 'opus'
  }
}

export interface TimeSlot {
  startTime: Date
  endTime: Date
  duration: number // minutes
  quality: 'peak' | 'good' | 'fair' | 'poor'
  available: boolean
  conflictLevel: number // 0-1, 0 = no conflicts
}

export interface Schedule {
  weekStart: Date
  weekEnd: Date
  sessions: CalendarEvent[]
  totalDuration: number
  totalTokens: number
  efficiency: number
  quotaUtilization: {
    sonnet: number // percentage of weekly quota
    opus: number
  }
}

export interface CalendarProvider {
  type: 'google' | 'apple' | 'outlook' | 'caldav'
  name: string
  credentials?: any
  connected: boolean
  lastSync?: Date
}

export interface OptimizationPreferences {
  preferredTimeSlots: {
    startHour: number
    endHour: number
    daysOfWeek: number[] // 0-6, Sunday = 0
  }[]
  minimumSessionDuration: number // minutes
  maximumSessionDuration: number // minutes
  breakBetweenSessions: number // minutes
  productivityPeakHours: {
    startHour: number
    endHour: number
  }
  avoidMeetingConflicts: boolean
  bufferTime: number // minutes before/after meetings
}

export class CalendarSyncService extends EventEmitter {
  private providers: Map<string, CalendarProvider> = new Map()
  private cachedEvents: Map<string, CalendarEvent[]> = new Map()
  private lastSyncTime: Date | null = null
  private syncInterval: NodeJS.Timeout | null = null
  
  private defaultPreferences: OptimizationPreferences = {
    preferredTimeSlots: [
      { startHour: 9, endHour: 12, daysOfWeek: [1, 2, 3, 4, 5] }, // Weekday mornings
      { startHour: 14, endHour: 17, daysOfWeek: [1, 2, 3, 4, 5] }, // Weekday afternoons
      { startHour: 10, endHour: 16, daysOfWeek: [0, 6] } // Weekend flexibility
    ],
    minimumSessionDuration: 30,
    maximumSessionDuration: 240,
    breakBetweenSessions: 15,
    productivityPeakHours: { startHour: 9, endHour: 11 },
    avoidMeetingConflicts: true,
    bufferTime: 10
  }

  constructor() {
    super()
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Google Calendar provider
    this.providers.set('google', {
      type: 'google',
      name: 'Google Calendar',
      connected: false
    })

    // Apple Calendar provider (macOS only)
    if (process.platform === 'darwin') {
      this.providers.set('apple', {
        type: 'apple',
        name: 'Apple Calendar',
        connected: false
      })
    }

    // Outlook provider
    this.providers.set('outlook', {
      type: 'outlook',
      name: 'Microsoft Outlook',
      connected: false
    })
  }

  async connectProvider(providerType: 'google' | 'apple' | 'outlook', credentials?: any): Promise<boolean> {
    try {
      const provider = this.providers.get(providerType)
      if (!provider) {
        throw new Error(`Provider ${providerType} not found`)
      }

      // Simulate connection process
      // In production, this would handle OAuth flows, API connections, etc.
      provider.credentials = credentials
      provider.connected = true
      provider.lastSync = new Date()

      this.emit('provider_connected', { provider: providerType })
      
      // Start automatic syncing
      await this.syncCalendars()
      
      return true
    } catch (error) {
      this.emit('provider_error', { provider: providerType, error: error.message })
      return false
    }
  }

  async disconnectProvider(providerType: string): Promise<void> {
    const provider = this.providers.get(providerType)
    if (provider) {
      provider.connected = false
      provider.credentials = null
      this.cachedEvents.delete(providerType)
      this.emit('provider_disconnected', { provider: providerType })
    }
  }

  async syncCalendars(): Promise<void> {
    const connectedProviders = Array.from(this.providers.values()).filter(p => p.connected)
    
    for (const provider of connectedProviders) {
      try {
        const events = await this.fetchEventsFromProvider(provider)
        this.cachedEvents.set(provider.type, events)
        provider.lastSync = new Date()
        
        this.emit('calendar_synced', { 
          provider: provider.type, 
          eventCount: events.length 
        })
      } catch (error) {
        this.emit('sync_error', { 
          provider: provider.type, 
          error: error.message 
        })
      }
    }

    this.lastSyncTime = new Date()
    this.emit('sync_completed', { timestamp: this.lastSyncTime })
  }

  private async fetchEventsFromProvider(provider: CalendarProvider): Promise<CalendarEvent[]> {
    // Mock calendar events for demo
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const mockEvents: CalendarEvent[] = [
      {
        id: `${provider.type}_meeting_1`,
        title: 'Team Standup',
        startTime: new Date(weekStart.getTime() + 1 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
        endTime: new Date(weekStart.getTime() + 1 * 24 * 60 * 60 * 1000 + 9.5 * 60 * 60 * 1000),
        type: 'meeting',
        attendees: ['team@company.com']
      },
      {
        id: `${provider.type}_block_1`,
        title: 'Deep Work Block',
        startTime: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        endTime: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
        type: 'block'
      },
      {
        id: `${provider.type}_claude_1`,
        title: 'Claude Code Session - Dashboard Development',
        description: 'Working on calendar integration features',
        startTime: new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
        endTime: new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
        type: 'claude-session',
        metadata: {
          sessionId: 'session_123',
          projectName: 'MoonLock Dashboard',
          estimatedTokens: 15000,
          modelType: 'sonnet'
        }
      }
    ]

    return mockEvents
  }

  async getAvailableTimeSlots(date: Date, preferences?: Partial<OptimizationPreferences>): Promise<TimeSlot[]> {
    const prefs = { ...this.defaultPreferences, ...preferences }
    const slots: TimeSlot[] = []
    
    // Get all events for the day
    const dayEvents = await this.getEventsForDate(date)
    
    // Generate potential time slots based on preferences
    for (const timeSlot of prefs.preferredTimeSlots) {
      if (timeSlot.daysOfWeek.includes(date.getDay())) {
        const slotStart = new Date(date)
        slotStart.setHours(timeSlot.startHour, 0, 0, 0)
        
        const slotEnd = new Date(date)
        slotEnd.setHours(timeSlot.endHour, 0, 0, 0)
        
        // Break down into smaller slots
        let currentTime = slotStart.getTime()
        while (currentTime < slotEnd.getTime()) {
          const slotStartTime = new Date(currentTime)
          const slotEndTime = new Date(currentTime + prefs.minimumSessionDuration * 60 * 1000)
          
          if (slotEndTime.getTime() <= slotEnd.getTime()) {
            const conflicts = this.calculateConflicts(slotStartTime, slotEndTime, dayEvents)
            const quality = this.calculateTimeSlotQuality(slotStartTime, prefs)
            
            slots.push({
              startTime: slotStartTime,
              endTime: slotEndTime,
              duration: prefs.minimumSessionDuration,
              quality,
              available: conflicts === 0,
              conflictLevel: conflicts
            })
          }
          
          currentTime += 30 * 60 * 1000 // Move in 30-minute increments
        }
      }
    }
    
    return slots.sort((a, b) => {
      // Sort by availability, then quality, then time
      if (a.available !== b.available) return a.available ? -1 : 1
      if (a.quality !== b.quality) {
        const qualityOrder = { peak: 0, good: 1, fair: 2, poor: 3 }
        return qualityOrder[a.quality] - qualityOrder[b.quality]
      }
      return a.startTime.getTime() - b.startTime.getTime()
    })
  }

  private calculateConflicts(startTime: Date, endTime: Date, events: CalendarEvent[]): number {
    let conflicts = 0
    
    for (const event of events) {
      if (this.timeSlotsOverlap(startTime, endTime, event.startTime, event.endTime)) {
        conflicts += event.type === 'meeting' ? 1 : 0.5
      }
    }
    
    return conflicts
  }

  private timeSlotsOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1.getTime() < end2.getTime() && end1.getTime() > start2.getTime()
  }

  private calculateTimeSlotQuality(startTime: Date, preferences: OptimizationPreferences): 'peak' | 'good' | 'fair' | 'poor' {
    const hour = startTime.getHours()
    const dayOfWeek = startTime.getDay()
    
    // Peak productivity hours
    if (hour >= preferences.productivityPeakHours.startHour && 
        hour < preferences.productivityPeakHours.endHour &&
        dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 'peak'
    }
    
    // Good working hours on weekdays
    if (hour >= 9 && hour < 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 'good'
    }
    
    // Fair hours (evenings, weekends)
    if ((hour >= 18 && hour < 21) || (dayOfWeek === 0 || dayOfWeek === 6)) {
      return 'fair'
    }
    
    // Poor hours (very early morning, late night)
    return 'poor'
  }

  async createOptimizedSchedule(weeklyQuota: WeeklyQuota, preferences?: Partial<OptimizationPreferences>): Promise<Schedule> {
    const prefs = { ...this.defaultPreferences, ...preferences }
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    
    const sessions: CalendarEvent[] = []
    let totalDuration = 0
    let totalTokens = 0
    
    // Calculate optimal session distribution
    const sonnetSessions = Math.floor(weeklyQuota.sonnet.used / 2) // Assume 2-hour average sessions
    const opusSessions = Math.floor(weeklyQuota.opus.used / 1.5) // Assume 1.5-hour average sessions
    
    // Generate Sonnet sessions
    for (let i = 0; i < sonnetSessions && i < 5; i++) {
      const sessionDate = new Date(weekStart)
      sessionDate.setDate(weekStart.getDate() + i + 1) // Monday to Friday
      
      const availableSlots = await this.getAvailableTimeSlots(sessionDate, prefs)
      const bestSlot = availableSlots.find(slot => slot.available && slot.quality === 'peak') ||
                     availableSlots.find(slot => slot.available && slot.quality === 'good') ||
                     availableSlots.find(slot => slot.available)
      
      if (bestSlot) {
        const duration = 120 // 2 hours
        const sessionEnd = new Date(bestSlot.startTime.getTime() + duration * 60 * 1000)
        const estimatedTokens = 12000
        
        sessions.push({
          id: `optimized_sonnet_${i}`,
          title: `Claude Code Session (Sonnet) - Day ${i + 1}`,
          description: 'Optimized development session using Claude Sonnet 4',
          startTime: bestSlot.startTime,
          endTime: sessionEnd,
          type: 'claude-session',
          metadata: {
            estimatedTokens,
            modelType: 'sonnet'
          }
        })
        
        totalDuration += duration
        totalTokens += estimatedTokens
      }
    }
    
    // Generate Opus sessions (fewer, more strategic)
    for (let i = 0; i < opusSessions && i < 2; i++) {
      const sessionDate = new Date(weekStart)
      sessionDate.setDate(weekStart.getDate() + i * 3 + 1) // Spread out Opus sessions
      
      const availableSlots = await this.getAvailableTimeSlots(sessionDate, prefs)
      const bestSlot = availableSlots.find(slot => 
        slot.available && 
        slot.quality === 'peak' &&
        !sessions.some(s => this.timeSlotsOverlap(s.startTime, s.endTime, slot.startTime, slot.endTime))
      )
      
      if (bestSlot) {
        const duration = 90 // 1.5 hours for intensive Opus sessions
        const sessionEnd = new Date(bestSlot.startTime.getTime() + duration * 60 * 1000)
        const estimatedTokens = 18000
        
        sessions.push({
          id: `optimized_opus_${i}`,
          title: `Claude Code Session (Opus) - Strategic Planning`,
          description: 'High-intensity development session using Claude Opus 4',
          startTime: bestSlot.startTime,
          endTime: sessionEnd,
          type: 'claude-session',
          metadata: {
            estimatedTokens,
            modelType: 'opus'
          }
        })
        
        totalDuration += duration
        totalTokens += estimatedTokens
      }
    }
    
    const efficiency = sessions.length > 0 ? 
      (sessions.filter(s => s.metadata?.modelType).length / sessions.length) * 100 : 0
    
    return {
      weekStart,
      weekEnd,
      sessions: sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      totalDuration,
      totalTokens,
      efficiency,
      quotaUtilization: {
        sonnet: Math.min((totalDuration / (weeklyQuota.sonnet.limit * 60)) * 100, 100),
        opus: Math.min((totalDuration / (weeklyQuota.opus.limit * 60)) * 100, 100)
      }
    }
  }

  async syncToCalendar(schedule: Schedule, providerType: string = 'google'): Promise<void> {
    const provider = this.providers.get(providerType)
    if (!provider || !provider.connected) {
      throw new Error(`Provider ${providerType} not connected`)
    }
    
    try {
      // In production, this would use the calendar API to create events
      for (const session of schedule.sessions) {
        await this.createCalendarEvent(session, provider)
      }
      
      this.emit('schedule_synced', { 
        provider: providerType, 
        sessionCount: schedule.sessions.length,
        schedule 
      })
    } catch (error) {
      this.emit('sync_error', { 
        provider: providerType, 
        error: error.message 
      })
      throw error
    }
  }

  private async createCalendarEvent(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    // Mock calendar event creation
    console.log(`Creating calendar event: ${event.title} on ${provider.name}`)
    console.log(`  Time: ${event.startTime.toLocaleString()} - ${event.endTime.toLocaleString()}`)
    console.log(`  Type: ${event.type}`)
    if (event.metadata) {
      console.log(`  Metadata:`, event.metadata)
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async getEventsForDate(date: Date): Promise<CalendarEvent[]> {
    const allEvents: CalendarEvent[] = []
    
    for (const [providerType, events] of this.cachedEvents) {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startTime)
        return eventDate.toDateString() === date.toDateString()
      })
      allEvents.push(...dayEvents)
    }
    
    return allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  async getEventsForWeek(weekStart: Date): Promise<CalendarEvent[]> {
    const allEvents: CalendarEvent[] = []
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    
    for (const [providerType, events] of this.cachedEvents) {
      const weekEvents = events.filter(event => 
        event.startTime >= weekStart && event.startTime < weekEnd
      )
      allEvents.push(...weekEvents)
    }
    
    return allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  startAutoSync(intervalMinutes: number = 30): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    this.syncInterval = setInterval(() => {
      this.syncCalendars().catch(error => {
        this.emit('auto_sync_error', error)
      })
    }, intervalMinutes * 60 * 1000)
    
    this.emit('auto_sync_started', { intervalMinutes })
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      this.emit('auto_sync_stopped')
    }
  }

  getConnectedProviders(): CalendarProvider[] {
    return Array.from(this.providers.values()).filter(p => p.connected)
  }

  getSyncStatus(): {
    lastSync: Date | null
    connectedProviders: number
    totalEvents: number
    autoSyncEnabled: boolean
  } {
    let totalEvents = 0
    for (const events of this.cachedEvents.values()) {
      totalEvents += events.length
    }
    
    return {
      lastSync: this.lastSyncTime,
      connectedProviders: this.getConnectedProviders().length,
      totalEvents,
      autoSyncEnabled: this.syncInterval !== null
    }
  }
}