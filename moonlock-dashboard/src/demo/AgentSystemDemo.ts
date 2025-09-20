/**
 * Claude Code Optimizer Agent System Demo
 * Comprehensive demonstration of the agent infrastructure and capabilities
 */

import { AgentSpawner } from '../agents/AgentSpawner'
import { TodoListAgent } from '../agents/TodoListAgent'
import { TokenTrackingService } from '../backend/TokenTrackingService'
import { SessionDetectionService } from '../backend/SessionDetectionService'
import { Task, ProjectConfig, Constraints } from '../agents/types'

class AgentSystemDemo {
  private spawner: AgentSpawner
  private tokenService: TokenTrackingService
  private sessionService: SessionDetectionService

  constructor() {
    this.spawner = new AgentSpawner()
    this.tokenService = new TokenTrackingService()
    this.sessionService = new SessionDetectionService()
  }

  async runComprehensiveDemo(): Promise<void> {
    console.log('🚀 Claude Code Optimizer Agent System Demo')
    console.log('================================================\n')

    try {
      // Phase 1: Initialize the agent spawner
      await this.demonstrateAgentSpawning()

      // Phase 2: Demonstrate task generation and management
      await this.demonstrateTaskManagement()

      // Phase 3: Show token tracking capabilities
      await this.demonstrateTokenTracking()

      // Phase 4: Demonstrate session detection
      await this.demonstrateSessionDetection()

      // Phase 5: Show Claude hooks integration
      await this.demonstrateClaudeHooks()

      // Phase 6: Demonstrate calendar integration
      await this.demonstrateCalendarIntegration()

      // Phase 7: Demonstrate system health monitoring
      await this.demonstrateSystemHealth()

      console.log('\n✅ Demo completed successfully!')
      console.log('The Claude Code Optimizer agent system is ready for production use.')

    } catch (error) {
      console.error('❌ Demo failed:', error)
    } finally {
      await this.cleanup()
    }
  }

  private async demonstrateAgentSpawning(): Promise<void> {
    console.log('📦 Phase 1: Agent Spawning and Infrastructure')
    console.log('--------------------------------------------')

    // Start the agent spawner
    await this.spawner.start()
    console.log('✓ Agent spawner initialized')

    // Spawn a TodoListAgent
    const todoAgent = await this.spawner.spawnAgent('todo-generator', {
      name: 'Primary Todo Generator',
      tokenBudget: 1000,
      maxConcurrentTasks: 3
    })
    console.log('✓ TodoListAgent spawned:', todoAgent.id)

    // Spawn a TokenTrackerAgent
    const tokenAgent = await this.spawner.spawnAgent('token-tracker', {
      name: 'Primary Token Tracker',
      tokenBudget: 500,
      maxConcurrentTasks: 5
    })
    console.log('✓ TokenTrackerAgent spawned:', tokenAgent.id)

    // Spawn Claude Hooks Agent
    const hooksAgent = await this.spawner.spawnAgent('claude-hooks', {
      name: 'Claude Hooks Manager',
      tokenBudget: 300,
      maxConcurrentTasks: 2
    })
    console.log('✓ ClaudeHooksAgent spawned:', hooksAgent.id)

    console.log(`\n📊 System Status:`)
    console.log(`   Active Agents: ${this.spawner.activeAgentCount}`)
    console.log(`   Total Agents: ${this.spawner.totalAgentCount}`)
    console.log('')
  }

  private async demonstrateTaskManagement(): Promise<void> {
    console.log('📋 Phase 2: Task Generation and Management')
    console.log('------------------------------------------')

    // Generate initial tasks using TodoListAgent
    const projectConfig: ProjectConfig = {
      name: 'Claude Code Optimizer Dashboard',
      type: 'web-app',
      complexity: 'complex',
      technologies: ['typescript', 'react', 'electron', 'websocket'],
      estimatedTokens: 500,
      priority: 'high'
    }

    const generateTasksTask: Task = {
      id: 'generate-tasks-demo',
      name: 'generate-initial-tasks',
      description: 'Generate comprehensive task list for the project',
      priority: 'high',
      tokens: 50,
      estimatedDuration: 120,
      dependencies: [],
      status: 'pending',
      metadata: { projectConfig }
    }

    // Find TodoListAgent and assign task
    const agents = Array.from((this.spawner as any).agentRegistry.values())
    const todoAgent = agents.find(agent => agent.type === 'todo-generator')

    if (todoAgent) {
      console.log('✓ Assigning task generation to TodoListAgent...')
      const generatedTasks = await todoAgent.assignTask(generateTasksTask)
      console.log(`✓ Generated ${generatedTasks.length} initial tasks`)
      
      // Show first few tasks
      console.log('\n📝 Sample Generated Tasks:')
      generatedTasks.slice(0, 5).forEach((task: Task, index: number) => {
        console.log(`   ${index + 1}. ${task.name} (${task.priority} priority, ${task.tokens} tokens)`)
      })

      // Demonstrate work distribution
      const workPlan = this.spawner.distributeWork(generatedTasks)
      console.log(`\n📊 Work Plan Created:`)
      console.log(`   Immediate Tasks: ${workPlan.immediate.length}`)
      console.log(`   Background Tasks: ${workPlan.background.length}`)
      console.log(`   Scheduled Tasks: ${workPlan.scheduled.length}`)
      console.log(`   Total Token Budget: ${workPlan.totalTokens}`)
      console.log(`   Estimated Duration: ${Math.round(workPlan.estimatedDuration / 60)} hours`)
    }

    console.log('')
  }

  private async demonstrateTokenTracking(): Promise<void> {
    console.log('🎯 Phase 3: Token Tracking and Analytics')
    console.log('----------------------------------------')

    const sessionId = `demo_session_${Date.now()}`

    // Start token tracking
    console.log('✓ Starting token tracking...')
    await this.tokenService.startTracking(sessionId)

    // Simulate token usage
    console.log('✓ Simulating token usage...')
    const mockTokenUsage = await this.tokenService.trackTokenUsage(sessionId)

    console.log(`📊 Token Metrics:`)
    console.log(`   Total Tokens: ${mockTokenUsage.totalTokens}`)
    console.log(`   Prompt Count: ${mockTokenUsage.promptCount}`)
    console.log(`   Average Tokens/Prompt: ${mockTokenUsage.averageTokensPerPrompt.toFixed(1)}`)
    console.log(`   Efficiency: ${mockTokenUsage.efficiency}%`)
    console.log(`   Projected Total: ${mockTokenUsage.projectedTotal}`)
    console.log(`   Remaining Budget: ${mockTokenUsage.remainingBudget}`)

    // Demonstrate advanced analytics
    const analytics = this.tokenService.getTokenAnalytics(sessionId)
    console.log(`\n📈 Advanced Analytics:`)
    console.log(`   Overall Efficiency: ${analytics.current.efficiency}%`)
    console.log(`   Optimization Recommendations: ${analytics.recommendations.length}`)

    if (analytics.recommendations.length > 0) {
      console.log(`   🔧 Recommendations:`)
      analytics.recommendations.forEach((rec: string, index: number) => {
        console.log(`      ${index + 1}. ${rec}`)
      })
    }

    // Stop tracking
    await this.tokenService.stopTracking(sessionId)
    console.log('✓ Token tracking stopped')
    console.log('')
  }

  private async demonstrateSessionDetection(): Promise<void> {
    console.log('🔍 Phase 4: Session Detection and Monitoring')
    console.log('---------------------------------------------')

    // Start session detection
    console.log('✓ Starting session detection...')
    await this.sessionService.startDetection(2000) // Check every 2 seconds

    // Simulate session detection
    console.log('✓ Running session detection cycle...')
    const detectedSession = await this.sessionService.detectClaudeCodeSession()

    if (detectedSession) {
      console.log(`📍 Session Detected:`)
      console.log(`   ID: ${detectedSession.id}`)
      console.log(`   Project: ${detectedSession.projectName}`)
      console.log(`   Directory: ${detectedSession.workingDirectory}`)
      console.log(`   Model: ${detectedSession.model}`)
      console.log(`   Status: ${detectedSession.status}`)
      console.log(`   Files: ${detectedSession.files.length}`)
    } else {
      console.log('📍 No active Claude Code session detected')
      console.log('   (This is expected in demo mode)')
    }

    // Show session history
    const recentSessions = this.sessionService.recentSessions
    console.log(`\n📚 Session History: ${recentSessions.length} recent sessions`)

    // Stop detection
    await this.sessionService.stopDetection()
    console.log('✓ Session detection stopped')
    console.log('')
  }

  private async demonstrateClaudeHooks(): Promise<void> {
    console.log('🪝 Phase 5: Claude Hooks Integration')
    console.log('------------------------------------')

    // Find Claude Hooks Agent
    const agents = Array.from((this.spawner as any).agentRegistry.values())
    const hooksAgent = agents.find(agent => agent.type === 'claude-hooks')

    if (hooksAgent) {
      console.log('✓ Setting up Claude Code hooks...')

      // Setup hooks
      const setupTask: Task = {
        id: 'setup-hooks-demo',
        name: 'setup-hooks',
        description: 'Setup Claude Code hooks configuration',
        priority: 'high',
        tokens: 20,
        estimatedDuration: 120,
        dependencies: [],
        status: 'pending'
      }

      const hooksConfig = await hooksAgent.assignTask(setupTask)
      console.log(`✓ Hooks configuration created with ${Object.keys(hooksConfig).length} hooks`)

      // Validate hooks
      const validateTask: Task = {
        id: 'validate-hooks-demo',
        name: 'validate-hooks',
        description: 'Validate hooks configuration',
        priority: 'medium',
        tokens: 10,
        estimatedDuration: 60,
        dependencies: [],
        status: 'pending'
      }

      const validation = await hooksAgent.assignTask(validateTask)
      console.log(`📊 Hooks Validation:`)
      console.log(`   Configuration Exists: ${validation.configurationExists}`)
      console.log(`   Valid Configuration: ${validation.validConfiguration}`)
      console.log(`   Scripts Exist: ${validation.scriptsExist}`)
      console.log(`   Hook Count: ${validation.hookCount}`)

      if (validation.issues.length > 0) {
        console.log(`   ⚠ Issues: ${validation.issues.length}`)
      }

      if (validation.recommendations.length > 0) {
        console.log(`   💡 Recommendations: ${validation.recommendations.length}`)
      }

      console.log(`✓ Claude Code hooks integration ready`)
    }

    console.log('')
  }

  private async demonstrateCalendarIntegration(): Promise<void> {
    console.log('📅 Phase 6: Calendar Integration and Optimization')
    console.log('------------------------------------------------')

    // Find Calendar Sync Agent
    const agents = Array.from((this.spawner as any).agentRegistry.values())
    const calendarAgent = agents.find(agent => agent.type === 'calendar-sync')

    if (calendarAgent) {
      console.log('✓ Calendar integration system active')

      // Test calendar connection
      const connectTask: Task = {
        id: 'connect-calendar-demo',
        name: 'connect-calendar',
        description: 'Connect to calendar providers',
        priority: 'high',
        tokens: 10,
        estimatedDuration: 60,
        dependencies: [],
        status: 'pending',
        metadata: { providerType: 'google' }
      }

      const connectionResult = await calendarAgent.assignTask(connectTask)
      console.log(`✓ Calendar connection: ${connectionResult.connected ? 'Success' : 'Demo mode'}`)

      // Test schedule optimization
      const scheduleTask: Task = {
        id: 'optimize-schedule-demo',
        name: 'create-optimized-schedule',
        description: 'Create optimized Claude Code session schedule',
        priority: 'high',
        tokens: 50,
        estimatedDuration: 180,
        dependencies: [],
        status: 'pending',
        metadata: {
          weeklyQuota: {
            sonnet: { limit: 432, used: 120, remaining: 312 },
            opus: { limit: 36, used: 8, remaining: 28 }
          },
          preferences: {
            preferredTimeSlots: [
              { startHour: 9, endHour: 12, daysOfWeek: [1, 2, 3, 4, 5] }
            ],
            minimumSessionDuration: 60,
            maximumSessionDuration: 180,
            productivityPeakHours: { startHour: 9, endHour: 11 }
          }
        }
      }

      const optimizedSchedule = await calendarAgent.assignTask(scheduleTask)
      console.log(`📊 Optimized Schedule Created:`);
      console.log(`   Sessions: ${optimizedSchedule.sessions.length}`);
      console.log(`   Total Duration: ${Math.round(optimizedSchedule.totalDuration / 60)} hours`);
      console.log(`   Efficiency: ${optimizedSchedule.efficiency.toFixed(1)}%`);
      console.log(`   Sonnet Quota Usage: ${optimizedSchedule.quotaUtilization.sonnet.toFixed(1)}%`);

      // Test time slot analysis
      const slotsTask: Task = {
        id: 'analyze-slots-demo',
        name: 'get-available-slots',
        description: 'Analyze available time slots for tomorrow',
        priority: 'medium',
        tokens: 20,
        estimatedDuration: 120,
        dependencies: [],
        status: 'pending',
        metadata: {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }

      const slotsAnalysis = await calendarAgent.assignTask(slotsTask)
      console.log(`\n🎯 Time Slot Analysis:`);
      console.log(`   Total Slots: ${slotsAnalysis.totalSlots}`);
      console.log(`   Available Slots: ${slotsAnalysis.availableSlots}`);
      console.log(`   Peak Quality Slots: ${slotsAnalysis.peakSlots}`);

      // Get sync status
      const statusTask: Task = {
        id: 'sync-status-demo',
        name: 'get-sync-status',
        description: 'Get calendar synchronization status',
        priority: 'low',
        tokens: 5,
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending'
      }

      const syncStatus = await calendarAgent.assignTask(statusTask)
      console.log(`\n📊 Sync Status:`);
      console.log(`   Connected Providers: ${syncStatus.connectedProviders}`);
      console.log(`   Total Events: ${syncStatus.totalEvents}`);
      console.log(`   Auto-Sync: ${syncStatus.autoSyncEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   Last Sync: ${syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}`);

      console.log(`✓ Calendar integration system fully operational`);
    } else {
      console.log('⚠ Calendar agent not found - integration pending');
    }

    console.log('')
  }

  private async demonstrateSystemHealth(): Promise<void> {
    console.log('💊 Phase 7: System Health and Monitoring')
    console.log('-----------------------------------------')

    // Get comprehensive system health
    const systemHealth = this.spawner.getSystemHealth()

    console.log(`🔋 System Health Report:`)
    console.log(`   Overall Status: ${systemHealth.overall.toUpperCase()}`)
    console.log(`   Active Connections: ${systemHealth.activeConnections}`)
    console.log(`   Error Rate: ${(systemHealth.errorRate * 100).toFixed(2)}%`)
    console.log(`   Timestamp: ${systemHealth.timestamp.toISOString()}`)

    console.log(`\n🤖 Agent Performance:`)
    systemHealth.agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. Agent ${agent.agentId}:`)
      console.log(`      Tasks Completed: ${agent.tasksCompleted}`)
      console.log(`      Success Rate: ${(agent.successRate * 100).toFixed(1)}%`)
      console.log(`      Token Efficiency: ${(agent.tokenEfficiency * 100).toFixed(1)}%`)
      console.log(`      Last Active: ${new Date(agent.lastActive).toLocaleTimeString()}`)
    })

    console.log(`\n🖥️  System Load:`)
    console.log(`   CPU: ${systemHealth.systemLoad.cpu.toFixed(1)}%`)
    console.log(`   Memory: ${systemHealth.systemLoad.memory.toFixed(1)}%`)
    console.log(`   Disk: ${systemHealth.systemLoad.disk.toFixed(1)}%`)

    console.log('')
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up demo resources...')
    
    try {
      await this.spawner.stop()
      console.log('✓ Agent spawner stopped')
      
      if (this.sessionService.isDetectionActive) {
        await this.sessionService.stopDetection()
        console.log('✓ Session detection stopped')
      }
      
      console.log('✓ Demo cleanup completed')
    } catch (error) {
      console.warn('⚠ Some cleanup operations failed:', error.message)
    }
  }
}

// Demo execution function
export async function runAgentSystemDemo(): Promise<void> {
  const demo = new AgentSystemDemo()
  await demo.runComprehensiveDemo()
}

// Run demo if this file is executed directly
if (require.main === module) {
  runAgentSystemDemo().catch(console.error)
}