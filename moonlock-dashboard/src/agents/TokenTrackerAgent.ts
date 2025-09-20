/**
 * TokenTrackerAgent: Agent wrapper for TokenTrackingService
 * Provides agent interface for token tracking functionality
 */

import { BaseAgent } from './BaseAgent'
import { Task } from './types'
import { TokenTrackingService } from '../backend/TokenTrackingService'

export class TokenTrackerAgent extends BaseAgent {
  private tokenService: TokenTrackingService

  constructor(config: any) {
    super(config)
    this.tokenService = new TokenTrackingService()
  }

  async initialize(): Promise<void> {
    this.log('info', 'Initializing TokenTrackerAgent...')
    
    this.registerCapability({
      name: 'token-tracking',
      description: 'Track token usage with high precision',
      tokenCost: 5,
      estimatedDuration: 10000,
      requirements: ['session-id'],
      outputType: 'token-metrics'
    })
  }

  async execute(task: Task): Promise<any> {
    this.log('info', `Executing task: ${task.name}`)
    
    switch (task.name) {
      case 'track-tokens':
        return await this.tokenService.trackTokenUsage(task.metadata?.sessionId)
      case 'start-tracking':
        return await this.tokenService.startTracking(task.metadata?.sessionId)
      case 'stop-tracking':
        return await this.tokenService.stopTracking(task.metadata?.sessionId)
      default:
        return { status: 'unknown-task' }
    }
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down TokenTrackerAgent...')
  }
}