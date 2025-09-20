/**
 * ValidationService - Data Validation Engine
 * 
 * Provides comprehensive data validation and integrity checking capabilities:
 * - Data consistency validation across all storage layers
 * - Backup and restore testing
 * - Session persistence validation
 * - Database consistency checks
 * - Data format and schema validation
 * - Cross-reference integrity validation
 * 
 * This service ensures data reliability and consistency across the system.
 */

import {
  DataConsistencyReport,
  DataInconsistency,
  BackupRestoreTestResult,
  SessionPersistenceReport,
  SessionPersistenceIssue,
  DatabaseConsistencyReport,
  TableConsistency,
  RepairAction,
  DataIntegrityReport,
  DataIntegrityIssue
} from '../../contracts/AgentInterfaces.js';

import { JsonDatabaseManager } from './JsonDatabaseManager.js';
import { BackupService } from './BackupService.js';
import { SessionManager } from './SessionManager.js';
import { TokenMonitor } from './TokenMonitor.js';
import { Session, TokenUsage, Checkpoint } from '../../shared/types/index.js';
import { performance } from 'perf_hooks';

export class ValidationService {
  private database: JsonDatabaseManager;
  private backupService: BackupService;
  private sessionManager?: SessionManager;
  private tokenMonitor?: TokenMonitor;

  constructor(
    database: JsonDatabaseManager,
    backupService: BackupService,
    sessionManager?: SessionManager,
    tokenMonitor?: TokenMonitor
  ) {
    this.database = database;
    this.backupService = backupService;
    this.sessionManager = sessionManager;
    this.tokenMonitor = tokenMonitor;
  }

  /**
   * Validate data consistency across all storage layers
   */
  async validateDataConsistency(): Promise<DataConsistencyReport> {
    const report: DataConsistencyReport = {
      timestamp: Date.now(),
      consistencyScore: 0,
      issues: [],
      validatedRecords: 0,
      corruptedRecords: 0,
      recommendations: []
    };

    try {
      // Get all sessions for validation
      const sessions = await this.database.getAllSessions();
      let totalValidations = 0;
      let passedValidations = 0;

      for (const session of sessions) {
        // Validate session data integrity
        const sessionValidation = await this.validateSessionData(session);
        totalValidations += sessionValidation.validations;
        passedValidations += sessionValidation.passed;
        report.issues.push(...sessionValidation.issues);

        // Validate token usage consistency
        const tokenValidation = await this.validateTokenConsistency(session.id);
        totalValidations += tokenValidation.validations;
        passedValidations += tokenValidation.passed;
        report.issues.push(...tokenValidation.issues);

        // Validate checkpoint consistency
        const checkpointValidation = await this.validateCheckpointConsistency(session.id);
        totalValidations += checkpointValidation.validations;
        passedValidations += checkpointValidation.passed;
        report.issues.push(...checkpointValidation.issues);
      }

      report.validatedRecords = totalValidations;
      report.corruptedRecords = totalValidations - passedValidations;
      report.consistencyScore = totalValidations > 0 ? (passedValidations / totalValidations) * 100 : 100;

      // Generate recommendations
      if (report.consistencyScore < 95) {
        report.recommendations.push('Consider running data repair procedures');
      }
      if (report.issues.length > 0) {
        const criticalIssues = report.issues.filter(i => i.severity === 'critical').length;
        if (criticalIssues > 0) {
          report.recommendations.push(`Address ${criticalIssues} critical data issues immediately`);
        }
      }
      if (report.consistencyScore === 100) {
        report.recommendations.push('Data consistency is excellent - no action required');
      }

    } catch (error) {
      report.issues.push({
        type: 'invalid_format',
        severity: 'critical',
        description: `Data consistency validation failed: ${error.message}`,
        affectedRecords: 0
      });
    }

    return report;
  }

  /**
   * Test backup and restore functionality
   */
  async testBackupRestore(): Promise<BackupRestoreTestResult> {
    const result: BackupRestoreTestResult = {
      backupCreated: false,
      backupSize: 0,
      backupTime: 0,
      restoreSuccessful: false,
      restoreTime: 0,
      dataIntegrityAfterRestore: 0,
      issues: []
    };

    try {
      // Create test data for backup testing
      const testSession = await this.createTestSession();
      
      // Create backup
      const backupStart = performance.now();
      const backup = await this.backupService.createBackup();
      result.backupTime = performance.now() - backupStart;
      result.backupCreated = true;
      result.backupSize = backup.size;

      // Modify original data to test restore
      const originalName = testSession.name;
      testSession.name = 'MODIFIED_FOR_RESTORE_TEST';
      await this.database.updateSession(testSession);

      // Restore from backup
      const restoreStart = performance.now();
      const restoreResponse = await this.backupService.restoreBackup(backup.id);
      result.restoreTime = performance.now() - restoreStart;
      result.restoreSuccessful = restoreResponse.success;

      if (result.restoreSuccessful) {
        // Validate data integrity after restore
        const restoredSession = await this.database.getSession(testSession.id);
        const integrityChecks = [];

        // Check if session was restored correctly
        integrityChecks.push(restoredSession?.name === originalName);
        integrityChecks.push(restoredSession?.id === testSession.id);
        
        // Check token usage restoration
        const tokenHistory = await this.database.getTokenUsageHistory(testSession.id);
        integrityChecks.push(tokenHistory.length > 0);

        const passedChecks = integrityChecks.filter(check => check).length;
        result.dataIntegrityAfterRestore = (passedChecks / integrityChecks.length) * 100;

        if (result.dataIntegrityAfterRestore < 100) {
          result.issues.push('Some data may not have been restored correctly');
        }
      } else {
        result.issues.push('Backup restore operation failed');
      }

      // Clean up test data
      await this.cleanupTestSession(testSession.id);

    } catch (error) {
      result.issues.push(`Backup/restore test failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate session persistence across system restarts
   */
  async validateSessionPersistence(): Promise<SessionPersistenceReport> {
    const report: SessionPersistenceReport = {
      totalSessions: 0,
      persistedSessions: 0,
      lostSessions: 0,
      corruptedSessions: 0,
      recoveredSessions: 0,
      persistenceRate: 0,
      issues: []
    };

    try {
      const sessions = await this.database.getAllSessions();
      report.totalSessions = sessions.length;

      for (const session of sessions) {
        try {
          // Validate session data completeness
          const isComplete = this.validateSessionCompleteness(session);
          
          if (isComplete) {
            report.persistedSessions++;
          } else {
            report.corruptedSessions++;
            report.issues.push({
              sessionId: session.id,
              issue: 'inconsistent_state',
              severity: 'medium',
              recoverable: true,
              description: 'Session data is incomplete but recoverable'
            });
          }

          // Check for orphaned data
          const hasOrphanedData = await this.checkForOrphanedData(session.id);
          if (hasOrphanedData) {
            report.issues.push({
              sessionId: session.id,
              issue: 'orphaned_data',
              severity: 'low',
              recoverable: true,
              description: 'Orphaned data found but does not affect functionality'
            });
          }

        } catch (error) {
          report.lostSessions++;
          report.issues.push({
            sessionId: session.id,
            issue: 'data_loss',
            severity: 'high',
            recoverable: false,
            description: `Session data could not be accessed: ${error.message}`
          });
        }
      }

      report.persistenceRate = report.totalSessions > 0 
        ? (report.persistedSessions / report.totalSessions) * 100 
        : 100;

    } catch (error) {
      report.issues.push({
        sessionId: 'unknown',
        issue: 'corruption',
        severity: 'high',
        recoverable: false,
        description: `Session persistence validation failed: ${error.message}`
      });
    }

    return report;
  }

  /**
   * Test database consistency and referential integrity
   */
  async testDatabaseConsistency(): Promise<DatabaseConsistencyReport> {
    const report: DatabaseConsistencyReport = {
      timestamp: Date.now(),
      tables: [],
      foreignKeyViolations: 0,
      orphanedRecords: 0,
      duplicateKeys: 0,
      consistencyScore: 0,
      repairActions: []
    };

    try {
      // Validate sessions table
      const sessionConsistency = await this.validateSessionsTable();
      report.tables.push(sessionConsistency.table);
      report.repairActions.push(...sessionConsistency.repairActions);

      // Validate token usage table
      const tokenConsistency = await this.validateTokenUsageTable();
      report.tables.push(tokenConsistency.table);
      report.repairActions.push(...tokenConsistency.repairActions);
      report.foreignKeyViolations += tokenConsistency.foreignKeyViolations;
      report.orphanedRecords += tokenConsistency.orphanedRecords;

      // Validate checkpoints table
      const checkpointConsistency = await this.validateCheckpointsTable();
      report.tables.push(checkpointConsistency.table);
      report.repairActions.push(...checkpointConsistency.repairActions);
      report.foreignKeyViolations += checkpointConsistency.foreignKeyViolations;
      report.orphanedRecords += checkpointConsistency.orphanedRecords;

      // Calculate overall consistency score
      const totalRecords = report.tables.reduce((sum, table) => sum + table.recordCount, 0);
      const validRecords = report.tables.reduce((sum, table) => sum + table.validRecords, 0);
      report.consistencyScore = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 100;

    } catch (error) {
      report.repairActions.push({
        action: 'Critical Error',
        description: `Database consistency check failed: ${error.message}`,
        severity: 'critical',
        autoExecutable: false
      });
    }

    return report;
  }

  /**
   * Comprehensive data integrity validation
   */
  async validateDataIntegrity(): Promise<DataIntegrityReport> {
    const report: DataIntegrityReport = {
      timestamp: Date.now(),
      score: 0,
      validatedTables: [],
      issues: [],
      recommendations: [],
      autoRepaired: 0,
      manualRepairRequired: 0
    };

    try {
      // Run all validation checks
      const consistencyReport = await this.validateDataConsistency();
      const persistenceReport = await this.validateSessionPersistence();
      const databaseReport = await this.testDatabaseConsistency();

      // Aggregate results
      const scores = [
        consistencyReport.consistencyScore,
        persistenceReport.persistenceRate,
        databaseReport.consistencyScore
      ];

      report.score = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      report.validatedTables = ['sessions', 'token_usage', 'checkpoints'];

      // Aggregate issues
      consistencyReport.issues.forEach(issue => {
        report.issues.push({
          table: 'cross_reference',
          issue: issue.description,
          severity: issue.severity,
          count: issue.affectedRecords,
          autoRepairable: issue.severity !== 'critical'
        });
      });

      persistenceReport.issues.forEach(issue => {
        report.issues.push({
          table: 'sessions',
          issue: issue.description,
          severity: issue.severity,
          count: 1,
          autoRepairable: issue.recoverable
        });
      });

      databaseReport.repairActions.forEach(action => {
        if (action.severity === 'critical') {
          report.issues.push({
            table: 'database',
            issue: action.description,
            severity: 'critical',
            count: 1,
            autoRepairable: action.autoExecutable
          });
        }
      });

      // Count repairable issues
      report.autoRepaired = report.issues.filter(issue => issue.autoRepairable).length;
      report.manualRepairRequired = report.issues.filter(issue => !issue.autoRepairable).length;

      // Generate recommendations
      if (report.score >= 95) {
        report.recommendations.push('Data integrity is excellent');
      } else if (report.score >= 85) {
        report.recommendations.push('Data integrity is good with minor issues');
      } else {
        report.recommendations.push('Data integrity issues detected - investigation required');
      }

      if (report.manualRepairRequired > 0) {
        report.recommendations.push(`${report.manualRepairRequired} issues require manual repair`);
      }

    } catch (error) {
      report.issues.push({
        table: 'system',
        issue: `Data integrity validation failed: ${error.message}`,
        severity: 'critical',
        count: 1,
        autoRepairable: false
      });
    }

    return report;
  }

  // Private helper methods

  private async validateSessionData(session: Session): Promise<{ validations: number; passed: number; issues: DataInconsistency[] }> {
    const result = { validations: 0, passed: 0, issues: [] as DataInconsistency[] };

    // Validate session ID format
    result.validations++;
    if (session.id && typeof session.id === 'string' && session.id.length > 0) {
      result.passed++;
    } else {
      result.issues.push({
        type: 'invalid_format',
        severity: 'high',
        description: `Invalid session ID format: ${session.id}`,
        affectedRecords: 1
      });
    }

    // Validate timestamps
    result.validations++;
    if (session.startTime > 0 && session.createdAt > 0 && session.updatedAt > 0) {
      result.passed++;
    } else {
      result.issues.push({
        type: 'invalid_format',
        severity: 'medium',
        description: 'Invalid timestamp values in session data',
        affectedRecords: 1
      });
    }

    // Validate status
    result.validations++;
    if (['active', 'paused', 'completed'].includes(session.status)) {
      result.passed++;
    } else {
      result.issues.push({
        type: 'invalid_format',
        severity: 'high',
        description: `Invalid session status: ${session.status}`,
        affectedRecords: 1
      });
    }

    return result;
  }

  private async validateTokenConsistency(sessionId: string): Promise<{ validations: number; passed: number; issues: DataInconsistency[] }> {
    const result = { validations: 0, passed: 0, issues: [] as DataInconsistency[] };

    try {
      const tokenHistory = await this.database.getTokenUsageHistory(sessionId);
      const session = await this.database.getSession(sessionId);

      if (!session) {
        result.issues.push({
          type: 'missing_reference',
          severity: 'critical',
          description: `Session not found for token usage records: ${sessionId}`,
          affectedRecords: tokenHistory.length
        });
        return result;
      }

      // Validate token usage records reference valid session
      result.validations++;
      const validReferences = tokenHistory.filter(token => token.sessionId === sessionId).length;
      if (validReferences === tokenHistory.length) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'missing_reference',
          severity: 'high',
          description: 'Token usage records with invalid session references',
          affectedRecords: tokenHistory.length - validReferences
        });
      }

      // Validate cumulative totals
      result.validations++;
      let isValidCumulative = true;
      let runningTotal = 0;
      
      const sortedTokens = tokenHistory.sort((a, b) => a.timestamp - b.timestamp);
      for (const token of sortedTokens) {
        runningTotal += token.tokensUsed;
        if (token.cumulativeTotal !== runningTotal) {
          isValidCumulative = false;
          break;
        }
      }

      if (isValidCumulative) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'data_mismatch',
          severity: 'medium',
          description: 'Cumulative token totals are inconsistent',
          affectedRecords: tokenHistory.length,
          repairSuggestion: 'Recalculate cumulative totals'
        });
      }

      // Validate session total matches token history
      result.validations++;
      const historyTotal = tokenHistory.reduce((sum, token) => sum + token.tokensUsed, 0);
      if (session.tokensUsed === historyTotal) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'data_mismatch',
          severity: 'medium',
          description: `Session token total (${session.tokensUsed}) doesn't match history total (${historyTotal})`,
          affectedRecords: 1,
          repairSuggestion: 'Update session total to match history'
        });
      }

    } catch (error) {
      result.issues.push({
        type: 'invalid_format',
        severity: 'critical',
        description: `Token consistency validation failed: ${error.message}`,
        affectedRecords: 0
      });
    }

    return result;
  }

  private async validateCheckpointConsistency(sessionId: string): Promise<{ validations: number; passed: number; issues: DataInconsistency[] }> {
    const result = { validations: 0, passed: 0, issues: [] as DataInconsistency[] };

    try {
      const checkpoints = await this.database.getCheckpoints(sessionId);
      const session = await this.database.getSession(sessionId);

      if (!session) {
        result.issues.push({
          type: 'missing_reference',
          severity: 'critical',
          description: `Session not found for checkpoint records: ${sessionId}`,
          affectedRecords: checkpoints.length
        });
        return result;
      }

      // Validate checkpoint references
      result.validations++;
      const validReferences = checkpoints.filter(cp => cp.sessionId === sessionId).length;
      if (validReferences === checkpoints.length) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'missing_reference',
          severity: 'high',
          description: 'Checkpoint records with invalid session references',
          affectedRecords: checkpoints.length - validReferences
        });
      }

      // Validate checkpoint ordering
      result.validations++;
      const sortedCheckpoints = checkpoints.sort((a, b) => a.timestamp - b.timestamp);
      let isValidOrdering = true;
      
      for (let i = 1; i < sortedCheckpoints.length; i++) {
        if (sortedCheckpoints[i].tokensUsed < sortedCheckpoints[i - 1].tokensUsed) {
          isValidOrdering = false;
          break;
        }
      }

      if (isValidOrdering) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'data_mismatch',
          severity: 'low',
          description: 'Checkpoint token usage values are not in ascending order',
          affectedRecords: checkpoints.length
        });
      }

    } catch (error) {
      result.issues.push({
        type: 'invalid_format',
        severity: 'critical',
        description: `Checkpoint consistency validation failed: ${error.message}`,
        affectedRecords: 0
      });
    }

    return result;
  }

  private async validateSessionsTable(): Promise<{ table: TableConsistency; repairActions: RepairAction[] }> {
    const table: TableConsistency = {
      name: 'sessions',
      recordCount: 0,
      validRecords: 0,
      invalidRecords: 0,
      issues: []
    };

    const repairActions: RepairAction[] = [];

    try {
      const sessions = await this.database.getAllSessions();
      table.recordCount = sessions.length;

      for (const session of sessions) {
        if (this.validateSessionCompleteness(session)) {
          table.validRecords++;
        } else {
          table.invalidRecords++;
          table.issues.push(`Invalid session data: ${session.id}`);
        }
      }

      if (table.invalidRecords > 0) {
        repairActions.push({
          action: 'Repair Session Data',
          description: `Fix ${table.invalidRecords} invalid session records`,
          severity: 'warning',
          autoExecutable: false
        });
      }

    } catch (error) {
      table.issues.push(`Sessions table validation failed: ${error.message}`);
      repairActions.push({
        action: 'Critical Repair',
        description: 'Sessions table is corrupted',
        severity: 'critical',
        autoExecutable: false
      });
    }

    return { table, repairActions };
  }

  private async validateTokenUsageTable(): Promise<{ 
    table: TableConsistency; 
    repairActions: RepairAction[];
    foreignKeyViolations: number;
    orphanedRecords: number;
  }> {
    const table: TableConsistency = {
      name: 'token_usage',
      recordCount: 0,
      validRecords: 0,
      invalidRecords: 0,
      issues: []
    };

    const repairActions: RepairAction[] = [];
    let foreignKeyViolations = 0;
    let orphanedRecords = 0;

    try {
      const sessions = await this.database.getAllSessions();
      const sessionIds = new Set(sessions.map(s => s.id));

      for (const session of sessions) {
        const tokenHistory = await this.database.getTokenUsageHistory(session.id);
        table.recordCount += tokenHistory.length;

        for (const token of tokenHistory) {
          if (sessionIds.has(token.sessionId) && token.tokensUsed > 0) {
            table.validRecords++;
          } else {
            table.invalidRecords++;
            if (!sessionIds.has(token.sessionId)) {
              foreignKeyViolations++;
              orphanedRecords++;
            }
          }
        }
      }

      if (foreignKeyViolations > 0) {
        repairActions.push({
          action: 'Clean Orphaned Records',
          description: `Remove ${orphanedRecords} orphaned token usage records`,
          severity: 'warning',
          autoExecutable: true
        });
      }

    } catch (error) {
      table.issues.push(`Token usage table validation failed: ${error.message}`);
    }

    return { table, repairActions, foreignKeyViolations, orphanedRecords };
  }

  private async validateCheckpointsTable(): Promise<{ 
    table: TableConsistency; 
    repairActions: RepairAction[];
    foreignKeyViolations: number;
    orphanedRecords: number;
  }> {
    const table: TableConsistency = {
      name: 'checkpoints',
      recordCount: 0,
      validRecords: 0,
      invalidRecords: 0,
      issues: []
    };

    const repairActions: RepairAction[] = [];
    let foreignKeyViolations = 0;
    let orphanedRecords = 0;

    try {
      const sessions = await this.database.getAllSessions();
      const sessionIds = new Set(sessions.map(s => s.id));

      for (const session of sessions) {
        const checkpoints = await this.database.getCheckpoints(session.id);
        table.recordCount += checkpoints.length;

        for (const checkpoint of checkpoints) {
          if (sessionIds.has(checkpoint.sessionId) && checkpoint.phase && checkpoint.promptCount > 0) {
            table.validRecords++;
          } else {
            table.invalidRecords++;
            if (!sessionIds.has(checkpoint.sessionId)) {
              foreignKeyViolations++;
              orphanedRecords++;
            }
          }
        }
      }

      if (foreignKeyViolations > 0) {
        repairActions.push({
          action: 'Clean Orphaned Checkpoints',
          description: `Remove ${orphanedRecords} orphaned checkpoint records`,
          severity: 'warning',
          autoExecutable: true
        });
      }

    } catch (error) {
      table.issues.push(`Checkpoints table validation failed: ${error.message}`);
    }

    return { table, repairActions, foreignKeyViolations, orphanedRecords };
  }

  private validateSessionCompleteness(session: Session): boolean {
    return !!(
      session.id &&
      session.startTime > 0 &&
      session.duration > 0 &&
      ['active', 'paused', 'completed'].includes(session.status) &&
      session.createdAt > 0 &&
      session.updatedAt > 0 &&
      typeof session.tokensUsed === 'number' &&
      session.tokensUsed >= 0
    );
  }

  private async checkForOrphanedData(sessionId: string): Promise<boolean> {
    try {
      const session = await this.database.getSession(sessionId);
      if (!session) {
        // If session doesn't exist but we're checking for it, there might be orphaned data
        const tokenHistory = await this.database.getTokenUsageHistory(sessionId);
        const checkpoints = await this.database.getCheckpoints(sessionId);
        return tokenHistory.length > 0 || checkpoints.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async createTestSession(): Promise<Session> {
    const testSession: Session = {
      id: `test-session-${Date.now()}`,
      name: 'Validation Test Session',
      startTime: Date.now(),
      duration: 60000,
      tokenBudget: 1000,
      tokensUsed: 150,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.database.createSession(testSession);

    // Add some test token usage
    const tokenUsage: TokenUsage = {
      id: `test-token-${Date.now()}`,
      sessionId: testSession.id,
      tokensUsed: 150,
      operation: 'validation-test',
      timestamp: Date.now(),
      cumulativeTotal: 150
    };

    await this.database.recordTokenUsage(tokenUsage);

    return testSession;
  }

  private async cleanupTestSession(sessionId: string): Promise<void> {
    try {
      // In a real implementation, you would delete the test session and related data
      // For this mock, we'll just mark it as completed
      const session = await this.database.getSession(sessionId);
      if (session) {
        session.status = 'completed';
        await this.database.updateSession(session);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}