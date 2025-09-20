import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return tokens.toString();
  }
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
  } else {
    return `$${cost.toFixed(4)}`;
  }
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  
  if (percentage >= 95) {
    return chalk.red(`${percentage.toFixed(1)}%`);
  } else if (percentage >= 80) {
    return chalk.yellow(`${percentage.toFixed(1)}%`);
  } else if (percentage >= 60) {
    return chalk.blue(`${percentage.toFixed(1)}%`);
  } else {
    return chalk.green(`${percentage.toFixed(1)}%`);
  }
}

export function formatDate(date: Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'relative':
      return formatRelativeTime(date);
    default:
      return date.toISOString();
  }
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

export function createProgressBar(current: number, total: number, width: number = 20): string {
  if (total === 0) return '─'.repeat(width);
  
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;
  
  let color = chalk.green;
  if (percentage >= 0.8) color = chalk.red;
  else if (percentage >= 0.6) color = chalk.yellow;
  
  return color('█'.repeat(filled)) + chalk.gray('─'.repeat(empty));
}

export function generateId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function getConfigDir(): string {
  return path.join(os.homedir(), '.moonlock');
}

export function getTempDir(): string {
  return path.join(os.tmpdir(), 'moonlock');
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
}

export function parseTimeString(timeStr: string): number {
  const regex = /^(\d+)([smhd])$/;
  const match = timeStr.match(regex);
  
  if (!match) {
    throw new Error('Invalid time format. Use: 30s, 5m, 2h, 1d');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error('Invalid time unit');
  }
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (remainingAttempts: number) => {
      fn()
        .then(resolve)
        .catch(error => {
          if (remainingAttempts > 1) {
            setTimeout(() => attempt(remainingAttempts - 1), delay);
          } else {
            reject(error);
          }
        });
    };
    
    attempt(attempts);
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }
  
  off(event: string, callback: Function): void {
    this.events.get(event)?.delete(callback);
  }
  
  emit(event: string, ...args: any[]): void {
    const eventCallbacks = this.events.get(event);
    if (eventCallbacks) {
      eventCallbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export function createTable(
  headers: string[],
  rows: string[][],
  options: {
    padding?: number;
    maxWidth?: number;
    colors?: {
      header?: (text: string) => string;
      border?: (text: string) => string;
      cell?: (text: string) => string;
    };
  } = {}
): string {
  const padding = options.padding || 1;
  const maxWidth = options.maxWidth || 80;
  const colors = {
    header: options.colors?.header || chalk.bold.blue,
    border: options.colors?.border || chalk.gray,
    cell: options.colors?.cell || ((text: string) => text)
  };
  
  // Calculate column widths
  const colWidths = headers.map((header, i) => {
    const maxContentWidth = Math.max(
      header.length,
      ...rows.map(row => (row[i] || '').length)
    );
    return Math.min(maxContentWidth + padding * 2, Math.floor(maxWidth / headers.length));
  });
  
  const separator = colors.border('─'.repeat(colWidths.reduce((sum, width) => sum + width + 1, 0) - 1));
  
  let result = separator + '\n';
  
  // Header row
  const headerRow = headers.map((header, i) => {
    const padded = header.padEnd(colWidths[i] - padding * 2);
    return colors.header(' '.repeat(padding) + truncateText(padded, colWidths[i] - padding * 2) + ' '.repeat(padding));
  }).join(colors.border('│'));
  
  result += colors.border('│') + headerRow + colors.border('│') + '\n';
  result += separator + '\n';
  
  // Data rows
  rows.forEach(row => {
    const dataRow = row.map((cell, i) => {
      const padded = (cell || '').padEnd(colWidths[i] - padding * 2);
      return colors.cell(' '.repeat(padding) + truncateText(padded, colWidths[i] - padding * 2) + ' '.repeat(padding));
    }).join(colors.border('│'));
    
    result += colors.border('│') + dataRow + colors.border('│') + '\n';
  });
  
  result += separator;
  
  return result;
}