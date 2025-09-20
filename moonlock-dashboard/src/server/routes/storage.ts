import { Router, Request, Response } from 'express';
import { StorageService } from '../services/StorageService.js';
import { 
  SessionData, 
  SessionContext, 
  SessionFilter,
  DetailedQuotaUsage,
  QuotaPeriod,
  AppState,
  UserPreferences,
  AnalyticsEvent,
  AnalyticsQuery,
  SearchQuery,
  AnalyticsSearchQuery,
  ExportFormat,
  ImportData,
  ReportType,
  DataFilter
} from '../../contracts/AgentInterfaces.js';

const router = Router();

/**
 * Storage API endpoints for the Claude Code Optimizer Dashboard
 * Provides REST API access to all persistence functionality
 */

// Initialize storage service (would typically be dependency injected)
let storageService: StorageService | null = null;

const getStorageService = (): StorageService => {
  if (!storageService) {
    storageService = new StorageService();
  }
  return storageService;
};

// Error handling middleware
const handleError = (res: Response, error: any, operation: string) => {
  console.error(`Storage API error in ${operation}:`, error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    operation
  });
};

// ============================================================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================================================

// Get all sessions with optional filtering
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const filter: SessionFilter = {
      status: req.query.status ? (req.query.status as string).split(',') : undefined,
      model: req.query.model ? (req.query.model as string).split(',') : undefined,
      dateRange: req.query.startTime && req.query.endTime ? {
        start: parseInt(req.query.startTime as string),
        end: parseInt(req.query.endTime as string)
      } : undefined,
      complexity: req.query.minComplexity || req.query.maxComplexity ? {
        min: req.query.minComplexity ? parseFloat(req.query.minComplexity as string) : undefined,
        max: req.query.maxComplexity ? parseFloat(req.query.maxComplexity as string) : undefined
      } : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const sessions = await getStorageService().getAllSessions(filter);
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
      filter
    });
  } catch (error) {
    handleError(res, error, 'getAllSessions');
  }
});

// Get a specific session
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const session = await getStorageService().getSession(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Session ${req.params.sessionId} not found`
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    handleError(res, error, 'getSession');
  }
});

// Create or update a session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const sessionData: SessionData = req.body;
    
    // Validate required fields
    if (!sessionData.id || !sessionData.model || !sessionData.startTime) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: id, model, startTime'
      });
    }

    await getStorageService().saveSession(sessionData);
    
    res.status(201).json({
      success: true,
      message: 'Session saved successfully',
      sessionId: sessionData.id
    });
  } catch (error) {
    handleError(res, error, 'saveSession');
  }
});

// Update a session
router.patch('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    await getStorageService().updateSession(req.params.sessionId, updates);
    
    res.json({
      success: true,
      message: 'Session updated successfully'
    });
  } catch (error) {
    handleError(res, error, 'updateSession');
  }
});

// Delete a session
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    await getStorageService().deleteSession(req.params.sessionId);
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'deleteSession');
  }
});

// Search sessions
router.post('/sessions/search', async (req: Request, res: Response) => {
  try {
    const query: SearchQuery = req.body;
    const sessions = await getStorageService().searchSessions(query);
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
      query
    });
  } catch (error) {
    handleError(res, error, 'searchSessions');
  }
});

// ============================================================================
// SESSION CONTEXT ENDPOINTS
// ============================================================================

// Get session context
router.get('/sessions/:sessionId/context', async (req: Request, res: Response) => {
  try {
    const context = await getStorageService().getSessionContext(req.params.sessionId);
    
    if (!context) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Session context for ${req.params.sessionId} not found`
      });
    }

    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    handleError(res, error, 'getSessionContext');
  }
});

// Save session context
router.post('/sessions/:sessionId/context', async (req: Request, res: Response) => {
  try {
    const context: SessionContext = req.body;
    context.sessionId = req.params.sessionId;
    
    await getStorageService().saveSessionContext(req.params.sessionId, context);
    
    res.json({
      success: true,
      message: 'Session context saved successfully'
    });
  } catch (error) {
    handleError(res, error, 'saveSessionContext');
  }
});

// Delete session context
router.delete('/sessions/:sessionId/context', async (req: Request, res: Response) => {
  try {
    await getStorageService().deleteSessionContext(req.params.sessionId);
    
    res.json({
      success: true,
      message: 'Session context deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'deleteSessionContext');
  }
});

// ============================================================================
// QUOTA MANAGEMENT ENDPOINTS
// ============================================================================

// Get current quota usage
router.get('/quota/usage', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as QuotaPeriod) || 'week';
    const usage = await getStorageService().getQuotaUsage(period);
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    handleError(res, error, 'getQuotaUsage');
  }
});

// Save quota usage data
router.post('/quota/usage', async (req: Request, res: Response) => {
  try {
    const usage: DetailedQuotaUsage = req.body;
    await getStorageService().saveQuotaUsage(usage);
    
    res.json({
      success: true,
      message: 'Quota usage saved successfully'
    });
  } catch (error) {
    handleError(res, error, 'saveQuotaUsage');
  }
});

// Get quota history
router.get('/quota/history', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as QuotaPeriod) || 'week';
    const history = await getStorageService().getQuotaHistory(period);
    
    res.json({
      success: true,
      data: history,
      period
    });
  } catch (error) {
    handleError(res, error, 'getQuotaHistory');
  }
});

// Get quota analytics
router.get('/quota/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await getStorageService().getQuotaAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    handleError(res, error, 'getQuotaAnalytics');
  }
});

// ============================================================================
// APPLICATION STATE ENDPOINTS
// ============================================================================

// Get application state
router.get('/app-state', async (req: Request, res: Response) => {
  try {
    const state = await getStorageService().getAppState();
    
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    handleError(res, error, 'getAppState');
  }
});

// Save application state
router.post('/app-state', async (req: Request, res: Response) => {
  try {
    const state: AppState = req.body;
    await getStorageService().saveAppState(state);
    
    res.json({
      success: true,
      message: 'Application state saved successfully'
    });
  } catch (error) {
    handleError(res, error, 'saveAppState');
  }
});

// Get user preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const preferences = await getStorageService().getUserPreferences();
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    handleError(res, error, 'getUserPreferences');
  }
});

// Save user preferences
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const preferences: UserPreferences = req.body;
    await getStorageService().saveUserPreferences(preferences);
    
    res.json({
      success: true,
      message: 'User preferences saved successfully'
    });
  } catch (error) {
    handleError(res, error, 'saveUserPreferences');
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Save analytics event
router.post('/analytics/events', async (req: Request, res: Response) => {
  try {
    const event: AnalyticsEvent = req.body;
    
    // Validate required fields
    if (!event.id || !event.type || !event.timestamp) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: id, type, timestamp'
      });
    }

    await getStorageService().saveAnalyticsEvent(event);
    
    res.status(201).json({
      success: true,
      message: 'Analytics event saved successfully'
    });
  } catch (error) {
    handleError(res, error, 'saveAnalyticsEvent');
  }
});

// Get analytics data
router.post('/analytics/query', async (req: Request, res: Response) => {
  try {
    const query: AnalyticsQuery = req.body;
    
    // Validate required fields
    if (!query.timeRange || !query.timeRange.start || !query.timeRange.end) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: timeRange with start and end'
      });
    }

    const result = await getStorageService().getAnalytics(query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    handleError(res, error, 'getAnalytics');
  }
});

// Search analytics events
router.post('/analytics/search', async (req: Request, res: Response) => {
  try {
    const query: AnalyticsSearchQuery = req.body;
    
    // Validate required fields
    if (!query.timeRange || !query.timeRange.start || !query.timeRange.end) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: timeRange with start and end'
      });
    }

    const events = await getStorageService().searchAnalytics(query);
    
    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    handleError(res, error, 'searchAnalytics');
  }
});

// Generate analytics report
router.post('/analytics/reports', async (req: Request, res: Response) => {
  try {
    const { type, period } = req.body;
    
    if (!type || !period) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: type, period'
      });
    }

    const report = await getStorageService().generateReport(type as ReportType, period as QuotaPeriod);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    handleError(res, error, 'generateReport');
  }
});

// ============================================================================
// BACKUP AND RECOVERY ENDPOINTS
// ============================================================================

// Create backup
router.post('/backup', async (req: Request, res: Response) => {
  try {
    const manifest = await getStorageService().createBackup();
    
    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: manifest
    });
  } catch (error) {
    handleError(res, error, 'createBackup');
  }
});

// List backups
router.get('/backup', async (req: Request, res: Response) => {
  try {
    const backups = await getStorageService().listBackups();
    
    res.json({
      success: true,
      data: backups,
      count: backups.length
    });
  } catch (error) {
    handleError(res, error, 'listBackups');
  }
});

// Restore backup
router.post('/backup/:backupId/restore', async (req: Request, res: Response) => {
  try {
    await getStorageService().restoreBackup(req.params.backupId);
    
    res.json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error) {
    handleError(res, error, 'restoreBackup');
  }
});

// Delete backup
router.delete('/backup/:backupId', async (req: Request, res: Response) => {
  try {
    await getStorageService().deleteBackup(req.params.backupId);
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'deleteBackup');
  }
});

// Validate data integrity
router.get('/integrity', async (req: Request, res: Response) => {
  try {
    const report = await getStorageService().validateDataIntegrity();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    handleError(res, error, 'validateDataIntegrity');
  }
});

// ============================================================================
// DATA EXPORT/IMPORT ENDPOINTS
// ============================================================================

// Export data
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { format, filter } = req.body;
    
    if (!format) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: format'
      });
    }

    const result = await getStorageService().exportData(format as ExportFormat, filter as DataFilter);
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-File-Size', result.size.toString());
    res.setHeader('X-File-Checksum', result.checksum);
    
    res.send(result.data);
  } catch (error) {
    handleError(res, error, 'exportData');
  }
});

// Import data
router.post('/import', async (req: Request, res: Response) => {
  try {
    const importData: ImportData = req.body;
    
    if (!importData.format || !importData.data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: format, data'
      });
    }

    const result = await getStorageService().importData(importData);
    
    res.json({
      success: true,
      message: 'Data imported successfully',
      data: result
    });
  } catch (error) {
    handleError(res, error, 'importData');
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Storage service is healthy',
    timestamp: Date.now()
  });
});

// Storage statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // This would typically aggregate various statistics
    const stats = {
      totalSessions: 0, // Would be calculated from actual data
      totalEvents: 0,
      totalBackups: 0,
      dataSize: 0,
      lastBackup: null,
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(res, error, 'getStats');
  }
});

// Storage configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = {
      version: '1.0.0',
      features: [
        'session_management',
        'quota_tracking',
        'analytics',
        'backup_recovery',
        'data_export_import',
        'full_text_search'
      ],
      limits: {
        maxSessions: 10000,
        maxBackups: 10,
        maxExportSize: 100 * 1024 * 1024 // 100MB
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    handleError(res, error, 'getConfig');
  }
});

export default router;