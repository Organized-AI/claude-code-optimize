import express from 'express';
import cors from 'cors';
import { JsonDatabaseManager as DatabaseManager } from './services/JsonDatabaseManager.js';
import { WebSocketManager } from './services/WebSocketManager.js';
import { ExtendedSessionManager } from './services/ExtendedSessionManager.js';
import { TokenMonitor } from './services/TokenMonitor.js';
import { ClaudeCodeIntegration } from './services/ClaudeCodeIntegration.js';
import { AnthropicAPIService } from './services/AnthropicAPIService.js';
import { SessionBasedAnthropicService } from './services/SessionBasedAnthropicService.js';
import { createUnifiedAnthropicService } from './services/SessionAPIAdapter.js';
import { OpenRouterAPIService } from './services/OpenRouterAPIService.js';
import { HealthMonitoring } from './services/HealthMonitoring.js';
import { HookLoggingService } from './services/HookLoggingService.js';
import { ClaudeDesktopMonitor } from './services/ClaudeDesktopMonitor.js';
import { MultiAppSessionService } from './services/MultiAppSessionService.js';
import { ClaudeCodeMonitor } from './services/ClaudeCodeMonitor.js';
import { createSessionRoutes } from './routes/sessions.js';
import { createTokenRoutes } from './routes/tokens.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createHealthRoutes } from './routes/health.js';
import { createAnthropicRoutes } from './routes/anthropic.js';
import { createOpenRouterRoutes } from './routes/openrouter.js';
import projectAnalysisRoutes from './routes/project-analysis.js';
import { ProjectAnalyzer } from './services/ProjectAnalyzer.js';
import { createPredictionsRouter } from './routes/predictions.js';
import { createTemplatesRouter } from './routes/templates.js';
import { createCalendarRouter } from './routes/calendar.js';
import { createBurnRateRouter } from './routes/burnrate.js';
import { createClaudeCodeRoutes } from './routes/claude-code.js';

const PORT = process.env.PORT || 3002;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const db = new DatabaseManager();
const wsManager = new WebSocketManager();
const sessionManager = new ExtendedSessionManager(db, wsManager);

// Initialize TokenMonitor first (without API services)
const tokenMonitor = new TokenMonitor(db, wsManager);

// Initialize Session-Based Anthropic API service (uses Claude Code session authentication)
let sessionBasedAnthropicService: SessionBasedAnthropicService | undefined;
let anthropicAPIService: AnthropicAPIService | undefined;

try {
  // Try session-based authentication first (preferred for Max Plan users)
  sessionBasedAnthropicService = new SessionBasedAnthropicService(db, wsManager);
  console.log('✅ Session-based Anthropic API service initialized (Max Plan)');
} catch (error) {
  console.log('ℹ️ Session-based service failed, trying API key method...');
  
  // Fallback to API key-based service
  try {
    anthropicAPIService = new AnthropicAPIService(tokenMonitor, db, wsManager);
    console.log('✅ API key-based Anthropic API service initialized');
  } catch (error) {
    console.log('ℹ️ Anthropic API service not initialized (no API key or session)');
  }
}

// Initialize OpenRouter API service (optional - requires API key)
let openrouterAPIService: OpenRouterAPIService | undefined;
try {
  openrouterAPIService = new OpenRouterAPIService(tokenMonitor, db, wsManager);
  console.log('✅ OpenRouter API service initialized');
} catch (error) {
  console.log('ℹ️ OpenRouter API service not initialized (API key not provided)');
}

// Create unified Anthropic service
const unifiedAnthropicService = createUnifiedAnthropicService(sessionBasedAnthropicService, anthropicAPIService);

// Initialize command service (will be done in server startup)

// Update TokenMonitor with API service references
(tokenMonitor as any).anthropicAPIService = unifiedAnthropicService;
(tokenMonitor as any).sessionBasedAnthropicService = sessionBasedAnthropicService;
(tokenMonitor as any).openrouterAPIService = openrouterAPIService;
const healthMonitoring = new HealthMonitoring(sessionManager, tokenMonitor, wsManager, db);
const claudeCodeIntegration = new ClaudeCodeIntegration(sessionManager, tokenMonitor, db);
const projectAnalyzer = new ProjectAnalyzer(claudeCodeIntegration);

// Initialize Hook Logging Service
let hookLoggingService: HookLoggingService | undefined;
try {
  hookLoggingService = new HookLoggingService(db, wsManager);
  console.log('✅ Hook Logging Service initialized');
} catch (error) {
  console.log('ℹ️ Hook Logging Service not initialized:', error.message);
}

// Initialize Claude Desktop Monitor
let claudeDesktopMonitor: ClaudeDesktopMonitor | undefined;
try {
  claudeDesktopMonitor = new ClaudeDesktopMonitor(db, wsManager);
  console.log('✅ Claude Desktop Monitor initialized');
} catch (error) {
  console.log('ℹ️ Claude Desktop Monitor not initialized:', error.message);
}

// Initialize Multi-App Session Service
let multiAppSessionService: MultiAppSessionService | undefined;
try {
  multiAppSessionService = new MultiAppSessionService(
    db, 
    wsManager, 
    sessionBasedAnthropicService, 
    claudeDesktopMonitor
  );
  console.log('✅ Multi-App Session Service initialized');
} catch (error) {
  console.log('ℹ️ Multi-App Session Service not initialized:', error.message);
}

// Initialize Claude Code Monitor
let claudeCodeMonitor: ClaudeCodeMonitor | undefined;
try {
  claudeCodeMonitor = new ClaudeCodeMonitor();
  console.log('✅ Claude Code Monitor initialized');
  
  // Set up real-time WebSocket broadcasting
  claudeCodeMonitor.on('session-updated', (data) => {
    wsManager.broadcast('claude-code-session-updated', data);
  });
  
  claudeCodeMonitor.on('live-status', (status) => {
    wsManager.broadcast('claude-code-live-status', status);
  });
  
  claudeCodeMonitor.on('session-expired', (data) => {
    wsManager.broadcast('claude-code-session-expired', data);
  });
  
} catch (error) {
  console.log('ℹ️ Claude Code Monitor not initialized:', error.message);
}

// Routes
app.use('/api/sessions', createSessionRoutes(sessionManager, tokenMonitor));
app.use('/api/tokens', createTokenRoutes(tokenMonitor));
app.use('/api/analytics', createAnalyticsRoutes(db));
app.use('/api/health', createHealthRoutes(healthMonitoring, hookLoggingService));
app.use('/api/anthropic', createAnthropicRoutes(unifiedAnthropicService, tokenMonitor));
app.use('/api/openrouter', createOpenRouterRoutes(openrouterAPIService, tokenMonitor));
app.use('/api/project-analysis', projectAnalysisRoutes);

// Enhancement routes
// We'll use the sessionManager directly since it already handles session storage
app.use('/api/predictions', createPredictionsRouter(sessionManager, wsManager));
app.use('/api/templates', createTemplatesRouter(sessionManager, wsManager));
app.use('/api/calendar', createCalendarRouter(sessionManager, wsManager));
app.use('/api/burnrate', createBurnRateRouter(sessionManager, wsManager));

// Claude Code monitoring routes
if (claudeCodeMonitor) {
  app.use('/api/claude-code', createClaudeCodeRoutes(claudeCodeMonitor, wsManager));
}

// Claude Code integration endpoint
app.get('/api/claude-code/status', async (req, res) => {
  try {
    const status = await claudeCodeIntegration.getCurrentSessionInfo();
    res.json(status);
  } catch (error) {
    console.error('Failed to get Claude Code status:', error);
    res.status(500).json({ error: 'Failed to get Claude Code status' });
  }
});

// Claude Code command endpoints
app.get('/api/claude/commands', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Command service not available' });
    }
    const commands = anthropicAPIService.getAvailableSlashCommands();
    res.json(commands);
  } catch (error) {
    console.error('Failed to get available commands:', error);
    res.status(500).json({ error: 'Failed to get available commands' });
  }
});

app.get('/api/claude/commands/history', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Command service not available' });
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const history = anthropicAPIService.getCommandHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Failed to get command history:', error);
    res.status(500).json({ error: 'Failed to get command history' });
  }
});

app.post('/api/claude/commands/execute', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Command service not available' });
    }
    
    const { command, args = [], sessionId } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    const result = await anthropicAPIService.executeSlashCommand({
      command,
      args,
      sessionId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Failed to execute command:', error);
    res.status(500).json({ error: error.message || 'Failed to execute command' });
  }
});

// Plan mode endpoints
app.get('/api/claude/plan-sessions', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Plan mode service not available' });
    }
    const sessions = anthropicAPIService.getAllPlanModeSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Failed to get plan sessions:', error);
    res.status(500).json({ error: 'Failed to get plan sessions' });
  }
});

app.post('/api/claude/plan-mode/create', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Plan mode service not available' });
    }
    
    const { title, description, steps, autoExecute, sessionId } = req.body;
    
    if (!title || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Title and steps are required' });
    }
    
    const result = await anthropicAPIService.createPlanModeSession({
      title,
      description: description || '',
      steps,
      autoExecute: autoExecute || false,
      sessionId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Failed to create plan mode session:', error);
    res.status(500).json({ error: error.message || 'Failed to create plan mode session' });
  }
});

app.post('/api/claude/plan-mode/:sessionId/execute', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Plan mode service not available' });
    }
    
    const { sessionId } = req.params;
    
    await anthropicAPIService.executePlanModeSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to execute plan mode session:', error);
    res.status(500).json({ error: error.message || 'Failed to execute plan mode session' });
  }
});

app.post('/api/claude/plan-mode/:sessionId/cancel', async (req, res) => {
  try {
    if (!anthropicAPIService) {
      return res.status(503).json({ error: 'Plan mode service not available' });
    }
    
    const { sessionId } = req.params;
    
    await anthropicAPIService.cancelPlanModeSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel plan mode session:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel plan mode session' });
  }
});

// Project Analyzer endpoint for complete analysis
app.post('/api/project-analyzer/complete', async (req, res) => {
  try {
    const { projectPath, options } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'projectPath is required'
      });
    }

    const analysis = await projectAnalyzer.performCompleteAnalysis(projectPath, options);
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Failed to perform complete analysis:', error);
    res.status(500).json({ 
      error: 'Complete analysis failed',
      message: error.message 
    });
  }
});

// Multi-app unified metrics endpoint
app.get('/api/multi-app/metrics', async (req, res) => {
  try {
    if (!multiAppSessionService) {
      return res.status(503).json({ error: 'Multi-app service not available' });
    }
    
    const metrics = await multiAppSessionService.getUnifiedUsageMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Failed to get multi-app metrics:', error);
    res.status(500).json({ error: 'Failed to get multi-app metrics' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      database: 'connected',
      websocket: `${wsManager.getConnectedClientsCount()} clients`,
      sessions: sessionManager.getActiveSessionIds().length,
    },
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    code: 500,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    code: 404,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  claudeCodeIntegration.shutdown();
  if (claudeCodeMonitor) {
    claudeCodeMonitor.shutdown();
  }
  healthMonitoring.stopMonitoring();
  healthMonitoring.stopCriticalMonitoring();
  if (hookLoggingService) {
    hookLoggingService.shutdown();
  }
  await sessionManager.shutdown();
  tokenMonitor.shutdown();
  wsManager.shutdown();
  db.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  claudeCodeIntegration.shutdown();
  if (claudeCodeMonitor) {
    claudeCodeMonitor.shutdown();
  }
  healthMonitoring.stopMonitoring();
  healthMonitoring.stopCriticalMonitoring();
  if (hookLoggingService) {
    hookLoggingService.shutdown();
  }
  await sessionManager.shutdown();
  tokenMonitor.shutdown();
  wsManager.shutdown();
  db.close();
  
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Moonlock Dashboard server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`💾 Database: JSON (./data/moonlock.json)`);
  
  // Initialize Claude Code integration
  await claudeCodeIntegration.initialize();
  
  // Initialize command service
  if (anthropicAPIService) {
    try {
      await anthropicAPIService.initializeCommandService();
      console.log('✅ Claude Code command service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize command service:', error);
    }
  }
  
  // Initialize Hook Logging Service
  if (hookLoggingService) {
    try {
      await hookLoggingService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize Hook Logging Service:', error);
    }
  }
  
  // Initialize Multi-App Session Service
  if (multiAppSessionService) {
    try {
      await multiAppSessionService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize Multi-App Session Service:', error);
    }
  }
  
  // Initialize Claude Code Monitor
  if (claudeCodeMonitor) {
    try {
      await claudeCodeMonitor.startMonitoring();
      console.log('🔍 Claude Code real-time monitoring active');
    } catch (error) {
      console.error('❌ Failed to start Claude Code monitoring:', error);
    }
  }
  
  // Start critical monitoring
  healthMonitoring.startCriticalMonitoring();
  
  console.log('🚨 Mission-critical monitoring active');
  
  const activeServices = [];
  if (unifiedAnthropicService) {
    if (sessionBasedAnthropicService) {
      activeServices.push('Anthropic API (Session-based Max Plan)');
    } else if (anthropicAPIService) {
      activeServices.push('Anthropic API (Key-based)');
    }
  }
  if (openrouterAPIService) {
    activeServices.push('OpenRouter API');
  }
  
  if (activeServices.length > 0) {
    console.log(`🤖 API integrations ready: ${activeServices.join(', ')}`);
    console.log('🔄 Multi-provider usage tracking enabled');
    
    if (sessionBasedAnthropicService) {
      console.log('🎯 Max Plan session authentication detected - no API key required!');
      console.log('💡 Using your existing Claude Code browser authentication');
    }
  } else {
    console.log('ℹ️ No API services configured - dashboard running in monitoring-only mode');
  }
});