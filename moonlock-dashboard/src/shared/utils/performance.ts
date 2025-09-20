// Performance monitoring and optimization utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(label);

    // Store metric
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);

    // Keep only last 100 measurements
    const measurements = this.metrics.get(label)!;
    if (measurements.length > 100) {
      measurements.shift();
    }

    return duration;
  }

  getAverageTime(label: string): number {
    const measurements = this.metrics.get(label);
    if (!measurements || measurements.length === 0) {
      return 0;
    }

    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  getMetrics(): { [key: string]: { avg: number; count: number; last: number } } {
    const result: { [key: string]: { avg: number; count: number; last: number } } = {};

    for (const [label, measurements] of this.metrics.entries()) {
      if (measurements.length > 0) {
        result[label] = {
          avg: this.getAverageTime(label),
          count: measurements.length,
          last: measurements[measurements.length - 1],
        };
      }
    }

    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Decorator for automatic performance monitoring
export function monitor(label?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitorLabel = label || `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      monitor.startTimer(monitorLabel);
      
      const result = method.apply(this, args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          monitor.endTimer(monitorLabel);
        });
      } else {
        monitor.endTimer(monitorLabel);
        return result;
      }
    };
  };
}

// Memory usage tracker
export class MemoryTracker {
  static getUsage(): { used: number; total: number; percentage: number } {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    
    // Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        percentage: (usage.heapUsed / usage.heapTotal) * 100,
      };
    }

    return { used: 0, total: 0, percentage: 0 };
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}