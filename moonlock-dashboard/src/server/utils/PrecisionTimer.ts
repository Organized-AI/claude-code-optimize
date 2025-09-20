export class PrecisionTimer {
  private startTime: number = 0;
  private duration: number = 0;
  private pausedTime: number = 0;
  private status: 'idle' | 'running' | 'paused' | 'completed' = 'idle';
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate?: (elapsed: number, remaining: number) => void;
  private onComplete?: () => void;
  
  private readonly DRIFT_CORRECTION_THRESHOLD = 50; // ms
  private readonly UPDATE_INTERVAL = 1000; // 1 second updates
  
  constructor(durationMs: number) {
    this.duration = durationMs;
  }
  
  start(onUpdate?: (elapsed: number, remaining: number) => void, onComplete?: () => void): void {
    if (this.status === 'running') return;
    
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    
    if (this.status === 'idle') {
      this.startTime = this.getHighPrecisionTime();
      this.pausedTime = 0;
    } else if (this.status === 'paused') {
      // Resuming from pause - adjust start time to account for pause duration
      const pauseDuration = this.getHighPrecisionTime() - this.pausedTime;
      this.startTime += pauseDuration;
    }
    
    this.status = 'running';
    this.scheduleUpdate();
  }
  
  pause(): void {
    if (this.status !== 'running') return;
    
    this.status = 'paused';
    this.pausedTime = this.getHighPrecisionTime();
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }
  
  stop(): void {
    this.status = 'completed';
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    this.onComplete?.();
  }
  
  getElapsed(): number {
    if (this.status === 'idle') return 0;
    
    const currentTime = this.getHighPrecisionTime();
    
    if (this.status === 'paused') {
      return this.pausedTime - this.startTime;
    }
    
    return currentTime - this.startTime;
  }
  
  getRemaining(): number {
    const elapsed = this.getElapsed();
    return Math.max(0, this.duration - elapsed);
  }
  
  getStatus(): 'idle' | 'running' | 'paused' | 'completed' {
    return this.status;
  }
  
  getProgress(): number {
    return Math.min(1, this.getElapsed() / this.duration);
  }
  
  private getHighPrecisionTime(): number {
    // Use Date.now() for consistency with session timestamps
    // We still get millisecond precision which is sufficient
    return Date.now();
  }
  
  private scheduleUpdate(): void {
    if (this.status !== 'running') return;
    
    const elapsed = this.getElapsed();
    const remaining = this.getRemaining();
    
    // Check if timer is complete
    if (remaining <= 0) {
      this.stop();
      return;
    }
    
    // Call update callback
    this.onUpdate?.(elapsed, remaining);
    
    // Calculate next update time with drift correction
    const nextUpdateTime = this.calculateNextUpdateTime();
    
    this.intervalId = setTimeout(() => {
      this.scheduleUpdate();
    }, nextUpdateTime);
  }
  
  private calculateNextUpdateTime(): number {
    const elapsed = this.getElapsed();
    const expectedUpdateCount = Math.floor(elapsed / this.UPDATE_INTERVAL) + 1;
    const expectedNextUpdate = expectedUpdateCount * this.UPDATE_INTERVAL;
    const actualNextUpdate = expectedNextUpdate - elapsed;
    
    // Apply drift correction if needed
    const drift = actualNextUpdate - this.UPDATE_INTERVAL;
    if (Math.abs(drift) > this.DRIFT_CORRECTION_THRESHOLD) {
      return Math.max(0, this.UPDATE_INTERVAL - drift);
    }
    
    return Math.max(0, actualNextUpdate);
  }
  
  // Static utility methods
  static formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  static parseTimeString(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    
    if (parts.length === 2) {
      // MM:SS format
      return (parts[0] * 60 + parts[1]) * 1000;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    }
    
    throw new Error('Invalid time format. Use MM:SS or HH:MM:SS');
  }
}