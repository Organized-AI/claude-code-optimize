/**
 * UI Testing Setup for React Components
 * Configures testing environment for dashboard components
 */

import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock SVG getBBox
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  writable: true,
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Setup fake timers before each test
beforeEach(() => {
  vi.useFakeTimers();
});

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const mockIcon = vi.fn(() => 'MockIcon');
  
  return {
    Play: mockIcon,
    Square: mockIcon,
    Plus: mockIcon,
    ChevronUp: mockIcon,
    ChevronDown: mockIcon,
    Zap: mockIcon,
    Brain: mockIcon,
    Clock: mockIcon,
    Hash: mockIcon,
    Download: mockIcon,
    Upload: mockIcon,
    Flame: mockIcon,
    TrendingUp: mockIcon,
    TrendingDown: mockIcon,
    Activity: mockIcon,
    AlertCircle: mockIcon,
    X: mockIcon,
    AlertTriangle: mockIcon,
    Target: mockIcon,
    Layout: mockIcon,
    Code: mockIcon,
    Bug: mockIcon,
    FileText: mockIcon,
    Check: mockIcon,
    ChevronRight: mockIcon,
    Calendar: mockIcon,
    ExternalLink: mockIcon,
    Bell: mockIcon,
    Shield: mockIcon,
    HardDrive: mockIcon,
    Cpu: mockIcon,
    Wifi: mockIcon,
    Smartphone: mockIcon,
    Pause: mockIcon,
    RotateCcw: mockIcon,
    Eye: mockIcon,
    Timer: mockIcon,
    BarChart3: mockIcon,
  };
});

// Cleanup after each test
beforeEach(() => {
  vi.clearAllMocks();
});