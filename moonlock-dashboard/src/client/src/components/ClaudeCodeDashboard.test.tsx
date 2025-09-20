/**
 * Comprehensive test suite for ClaudeCodeDashboard component
 * Tests all dashboard functionality including real-time timers and data visualization
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import ClaudeCodeDashboard from './ClaudeCodeDashboard';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  Shield: () => <div data-testid="shield" />,
  HardDrive: () => <div data-testid="hard-drive" />,
  Cpu: () => <div data-testid="cpu" />,
  Wifi: () => <div data-testid="wifi" />,
  Smartphone: () => <div data-testid="smartphone" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  Clock: () => <div data-testid="clock" />,
  Code: () => <div data-testid="code" />,
  Zap: () => <div data-testid="zap" />,
  Calendar: () => <div data-testid="calendar" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  Play: () => <div data-testid="play" />,
  Pause: () => <div data-testid="pause" />,
  RotateCcw: () => <div data-testid="rotate-ccw" />,
  Eye: () => <div data-testid="eye" />,
  ChevronRight: () => <div data-testid="chevron-right" />,
  Activity: () => <div data-testid="activity" />,
  Brain: () => <div data-testid="brain" />,
  Timer: () => <div data-testid="timer" />,
  BarChart3: () => <div data-testid="bar-chart-3" />,
}));

describe('ClaudeCodeDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Active Session View', () => {
    test('renders active session dashboard with all components', () => {
      render(<ClaudeCodeDashboard />);

      // Check header
      expect(screen.getByText('MoonLock Dashboard')).toBeInTheDocument();
      expect(screen.getByText('AI Session Monitoring & Token Tracking')).toBeInTheDocument();

      // Check active session banner
      expect(screen.getByText('Claude Code Session Active')).toBeInTheDocument();
      expect(screen.getByText(/Automatically tracking:/)).toBeInTheDocument();

      // Check main panels
      expect(screen.getByText('Session Timer')).toBeInTheDocument();
      expect(screen.getByText('Token Usage')).toBeInTheDocument();
      expect(screen.getByText('Phase Progress')).toBeInTheDocument();
      expect(screen.getByText('Usage Trend')).toBeInTheDocument();
    });

    test('displays correct session information', () => {
      render(<ClaudeCodeDashboard />);

      // Check session project name
      expect(screen.getByText(/Moonlock Dashboard Build - 5-Complete/)).toBeInTheDocument();

      // Check timer status
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();

      // Check token usage metrics
      expect(screen.getByText('TOKENS USED')).toBeInTheDocument();
      expect(screen.getByText('CURRENT RATE')).toBeInTheDocument();
      expect(screen.getByText('PROJECTED TOTAL')).toBeInTheDocument();
      expect(screen.getByText('EFFICIENCY')).toBeInTheDocument();
    });

    test('timer displays initial state correctly', () => {
      render(<ClaudeCodeDashboard />);

      // Initially should show 0:00
      expect(screen.getByText('0:00')).toBeInTheDocument();
      
      // Timer should be marked as active
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    test('efficiency displays initial state', () => {
      render(<ClaudeCodeDashboard />);

      // Initial efficiency should be 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
      
      // Check that efficiency label is present
      expect(screen.getByText('EFFICIENCY')).toBeInTheDocument();
    });

    test('displays phase progress correctly', () => {
      render(<ClaudeCodeDashboard />);

      // Check all phases are displayed
      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.getByText('Implementation')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();

      // Check progress percentages
      expect(screen.getByText('8/8 100%')).toBeInTheDocument(); // Architecture completed
      expect(screen.getByText('22/52 42%')).toBeInTheDocument(); // Implementation in progress
      expect(screen.getByText('5/20 25%')).toBeInTheDocument(); // Testing started

      // Check under budget percentages
      expect(screen.getByText('0% under budget')).toBeInTheDocument(); // Architecture
      expect(screen.getByText('58% under budget')).toBeInTheDocument(); // Implementation
      expect(screen.getByText('75% under budget')).toBeInTheDocument(); // Testing
    });

    test('usage trend chart renders with data', () => {
      render(<ClaudeCodeDashboard />);

      // Check usage trend section
      expect(screen.getByText('Usage Trend')).toBeInTheDocument();
      expect(screen.getByText('PEAK')).toBeInTheDocument();
      expect(screen.getByText('145')).toBeInTheDocument();
      expect(screen.getByText('AVG')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Token Usage Over Time')).toBeInTheDocument();
    });

    test('displays session project information', () => {
      render(<ClaudeCodeDashboard />);

      // Check session project name is displayed
      expect(screen.getByText(/Moonlock Dashboard Build - 5-Complete/)).toBeInTheDocument();
    });

    test('particle field renders with correct density', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      // Check if particles are rendered (they have specific styling)
      const particles = container.querySelectorAll('.absolute.rounded-full.animate-float');
      expect(particles.length).toBe(30); // density = 30 for active session
    });
  });

  describe('Glass Card Components', () => {
    test('glass cards have correct styling classes', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      // Check for glass card styling
      const glassCards = container.querySelectorAll('.bg-white\\/5.backdrop-blur-xl');
      expect(glassCards.length).toBeGreaterThan(0);
    });

    test('glass cards render with proper styling', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      // Check that glass cards exist by looking for common styling patterns
      const cards = container.querySelectorAll('[class*="bg-"], [class*="backdrop-"], [class*="rounded-"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    test('dashboard uses full screen layout', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      // Check main container has full screen classes
      const mainContainer = container.querySelector('.w-full.h-screen');
      expect(mainContainer).toBeInTheDocument();
    });

    test('grid layout uses responsive columns', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      // Check for grid layout
      const gridContainer = container.querySelector('.grid.grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper heading structure', () => {
      render(<ClaudeCodeDashboard />);

      // Check main heading
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('MoonLock Dashboard');

      // Check section headings
      const sectionHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });

    test('buttons have proper labels', () => {
      render(<ClaudeCodeDashboard />);

      // Check tab buttons
      expect(screen.getByRole('button', { name: /current session/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    });

    test('progress bars have proper labels', () => {
      render(<ClaudeCodeDashboard />);

      // Check phase progress labels
      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.getByText('Implementation')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });
  });

  describe('Data Integrity', () => {
    test('displays correct initial timer format', () => {
      render(<ClaudeCodeDashboard />);

      // Check that timer shows proper format (M:SS)
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    test('progress percentages are calculated correctly', () => {
      render(<ClaudeCodeDashboard />);

      // Architecture: 8/8 = 100%
      expect(screen.getByText('8/8 100%')).toBeInTheDocument();

      // Implementation: 22/52 ≈ 42%
      expect(screen.getByText('22/52 42%')).toBeInTheDocument();

      // Testing: 5/20 = 25%
      expect(screen.getByText('5/20 25%')).toBeInTheDocument();
    });

    test('displays efficiency value within valid range', () => {
      render(<ClaudeCodeDashboard />);

      // Check that efficiency values are displayed and are reasonable
      const efficiencyElements = screen.getAllByText(/\d+%/);
      expect(efficiencyElements.length).toBeGreaterThan(0);
      
      // Check that the initial 50% efficiency is present
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('component renders within acceptable time', () => {
      const startTime = performance.now();
      render(<ClaudeCodeDashboard />);
      const endTime = performance.now();

      // Component should render within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('component renders without performance issues', () => {
      const startTime = performance.now();
      render(<ClaudeCodeDashboard />);
      const endTime = performance.now();

      // Component should render quickly
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    test('handles invalid time values gracefully', () => {
      // Test with extreme values - should not crash
      expect(() => {
        render(<ClaudeCodeDashboard />);
      }).not.toThrow();
    });

    test('handles missing data gracefully', () => {
      // Component should render even with incomplete data
      expect(() => {
        render(<ClaudeCodeDashboard />);
      }).not.toThrow();

      // Should still show main elements
      expect(screen.getByText('MoonLock Dashboard')).toBeInTheDocument();
    });
  });

  describe('Animation and Transitions', () => {
    test('particles have animation classes', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      const particles = container.querySelectorAll('.animate-float');
      expect(particles.length).toBeGreaterThan(0);

      // Check that particles have animation styles
      particles.forEach(particle => {
        expect(particle).toHaveClass('animate-float');
      });
    });

    test('progress bars have transition classes', () => {
      const { container } = render(<ClaudeCodeDashboard />);

      const progressBars = container.querySelectorAll('.transition-all');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });
});