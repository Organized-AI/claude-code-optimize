import { PrecisionTimer } from '../utils/PrecisionTimer.js';
import { Session, Checkpoint } from '../../shared/types/index.js';
import { JsonDatabaseManager as DatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private activeSessions: Map<string, SessionInstance> = new Map();
  private db: DatabaseManager;
  private wsManager: WebSocketManager;
  
  constructor(db: DatabaseManager, wsManager: WebSocketManager) {
    this.db = db;
    this.wsManager = wsManager;
  }
  
  async createSession(params: {
    name?: string;
    duration: number;
    tokenBudget?: number;
  }): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      name: params.name,
      startTime: Date.now(),
      duration: params.duration,
      tokenBudget: params.tokenBudget,
      tokensUsed: 0,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Save to database
    await this.db.createSession(session);
    
    // Create session instance with precision timer
    const timer = new PrecisionTimer(params.duration);
    const instance = new SessionInstance(session, timer, this.db, this.wsManager);
    
    this.activeSessions.set(session.id, instance);
    
    // Start the timer
    instance.start();
    
    return session;
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    const instance = this.activeSessions.get(sessionId);
    if (instance) {
      return instance.getSession();
    }
    
    // Try to load from database
    return await this.db.getSession(sessionId);
  }
  
  async pauseSession(sessionId: string): Promise<void> {
    const instance = this.activeSessions.get(sessionId);
    if (!instance) {
      throw new Error('Session not found or not active');
    }
    
    await instance.pause();
  }
  
  async resumeSession(sessionId: string): Promise<void> {
    const instance = this.activeSessions.get(sessionId);
    if (!instance) {
      // Try to recover from database
      const session = await this.db.getSession(sessionId);
      if (!session || session.status === 'completed') {
        throw new Error('Session not found or already completed');
      }
      
      // Recreate session instance
      const remainingTime = session.duration - (Date.now() - session.startTime);
      if (remainingTime <= 0) {
        throw new Error('Session time has expired');
      }
      
      const timer = new PrecisionTimer(remainingTime);
      const newInstance = new SessionInstance(session, timer, this.db, this.wsManager);
      this.activeSessions.set(sessionId, newInstance);
      newInstance.start();
      return;
    }
    
    await instance.resume();
  }
  
  async completeSession(sessionId: string): Promise<void> {
    const instance = this.activeSessions.get(sessionId);
    if (instance) {
      await instance.complete();
      this.activeSessions.delete(sessionId);
    }
  }
  
  async addCheckpoint(sessionId: string, checkpoint: Omit<Checkpoint, 'id' | 'sessionId' | 'timestamp'>): Promise<Checkpoint> {
    const instance = this.activeSessions.get(sessionId);
    if (!instance) {
      throw new Error('Session not found or not active');
    }
    
    return await instance.addCheckpoint(checkpoint);
  }
  
  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }
  
  async shutdown(): Promise<void> {
    // Save all active sessions before shutdown
    const savePromises = Array.from(this.activeSessions.values()).map(instance => 
      instance.saveState()
    );
    
    await Promise.all(savePromises);
    this.activeSessions.clear();
  }
}

class SessionInstance {
  private session: Session;
  private timer: PrecisionTimer;
  private db: DatabaseManager;
  private wsManager: WebSocketManager;
  private checkpoints: Checkpoint[] = [];
  
  constructor(session: Session, timer: PrecisionTimer, db: DatabaseManager, wsManager: WebSocketManager) {
    this.session = session;
    this.timer = timer;
    this.db = db;
    this.wsManager = wsManager;
  }
  
  start(): void {
    this.timer.start(
      (elapsed, remaining) => this.onTimerUpdate(elapsed, remaining),
      () => this.onTimerComplete()
    );
  }
  
  async pause(): Promise<void> {
    this.timer.pause();
    this.session.status = 'paused';
    this.session.updatedAt = Date.now();
    
    await this.db.updateSession(this.session);
    
    this.wsManager.broadcast({
      type: 'timer_update',
      sessionId: this.session.id,
      elapsed: this.timer.getElapsed(),
      remaining: this.timer.getRemaining(),
      status: 'paused',
    });
  }
  
  async resume(): Promise<void> {
    this.timer.start(
      (elapsed, remaining) => this.onTimerUpdate(elapsed, remaining),
      () => this.onTimerComplete()
    );
    
    this.session.status = 'active';
    this.session.updatedAt = Date.now();
    
    await this.db.updateSession(this.session);
  }
  
  async complete(): Promise<void> {
    this.timer.stop();
    this.session.status = 'completed';
    this.session.endTime = Date.now();
    this.session.updatedAt = Date.now();
    
    await this.db.updateSession(this.session);
    
    this.wsManager.broadcast({
      type: 'timer_update',
      sessionId: this.session.id,
      elapsed: this.timer.getElapsed(),
      remaining: 0,
      status: 'completed',
    });
  }
  
  async addCheckpoint(checkpointData: Omit<Checkpoint, 'id' | 'sessionId' | 'timestamp'>): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: uuidv4(),
      sessionId: this.session.id,
      timestamp: Date.now(),
      tokensUsed: this.session.tokensUsed,
      ...checkpointData,
    };
    
    await this.db.createCheckpoint(checkpoint);
    this.checkpoints.push(checkpoint);
    
    this.wsManager.broadcast({
      type: 'checkpoint',
      sessionId: this.session.id,
      phase: checkpoint.phase,
      promptCount: checkpoint.promptCount,
      timestamp: checkpoint.timestamp,
    });
    
    return checkpoint;
  }
  
  getSession(): Session {
    return { ...this.session };
  }
  
  async saveState(): Promise<void> {
    this.session.updatedAt = Date.now();
    await this.db.updateSession(this.session);
  }
  
  private onTimerUpdate(elapsed: number, remaining: number): void {
    this.wsManager.broadcast({
      type: 'timer_update',
      sessionId: this.session.id,
      elapsed,
      remaining,
      status: this.session.status,
    });
  }
  
  private async onTimerComplete(): Promise<void> {
    await this.complete();
  }
}