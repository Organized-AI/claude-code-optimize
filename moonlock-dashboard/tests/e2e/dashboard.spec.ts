/**
 * E2E Tests for Claude Code Dashboard
 * Comprehensive end-to-end testing of dashboard functionality
 */

import { test, expect, Page } from '@playwright/test';

// Test data and helpers
const DASHBOARD_ELEMENTS = {
  header: 'MoonLock Dashboard',
  subtitle: 'AI Session Monitoring & Token Tracking',
  sessionTimer: 'Session Timer',
  tokenUsage: 'Token Usage',
  phaseProgress: 'Phase Progress',
  usageTrend: 'Usage Trend'
};

const PHASE_NAMES = ['Architecture', 'Implementation', 'Testing'];

class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDashboardLoad() {
    await this.page.waitForSelector('text=MoonLock Dashboard', { timeout: 10000 });
    await this.page.waitForSelector('text=Session Timer', { timeout: 5000 });
  }

  async getTimerValue() {
    const timerElement = this.page.locator('text=/\\d+:\\d{2}/').first();
    return await timerElement.textContent();
  }

  async getEfficiencyValue() {
    const efficiencyElement = this.page.locator('text=/\\d+%/').first();
    return await efficiencyElement.textContent();
  }

  async clickTab(tabName: string) {
    await this.page.click(`button:has-text("${tabName}")`);
  }

  async takeFullPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `./test-screenshots/${name}.png`, 
      fullPage: true 
    });
  }
}

test.describe('Dashboard Core Functionality', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();
  });

  test('should load dashboard with all main components', async ({ page }) => {
    // Check header elements
    await expect(page.locator('text=MoonLock Dashboard')).toBeVisible();
    await expect(page.locator('text=AI Session Monitoring & Token Tracking')).toBeVisible();

    // Check main panels
    await expect(page.locator('text=Session Timer')).toBeVisible();
    await expect(page.locator('text=Token Usage')).toBeVisible();
    await expect(page.locator('text=Phase Progress')).toBeVisible();
    await expect(page.locator('text=Usage Trend')).toBeVisible();

    // Check active session banner
    await expect(page.locator('text=Claude Code Session Active')).toBeVisible();
  });

  test('should display session timer correctly', async ({ page }) => {
    // Check timer displays in correct format (M:SS)
    const timerValue = await dashboard.getTimerValue();
    expect(timerValue).toMatch(/^\d+:\d{2}$/);

    // Check timer status
    await expect(page.locator('text=ACTIVE')).toBeVisible();

    // Check timer circle is present
    await expect(page.locator('svg circle')).toBeVisible();
  });

  test('should display token usage metrics', async ({ page }) => {
    // Check all token usage labels
    await expect(page.locator('text=TOKENS USED')).toBeVisible();
    await expect(page.locator('text=CURRENT RATE')).toBeVisible();
    await expect(page.locator('text=PROJECTED TOTAL')).toBeVisible();
    await expect(page.locator('text=EFFICIENCY')).toBeVisible();

    // Check efficiency percentage is displayed
    const efficiency = await dashboard.getEfficiencyValue();
    expect(efficiency).toMatch(/^\d+%$/);
  });

  test('should display phase progress correctly', async ({ page }) => {
    // Check all phase names are present
    for (const phase of PHASE_NAMES) {
      await expect(page.locator(`text=${phase}`)).toBeVisible();
    }

    // Check progress percentages are displayed
    await expect(page.locator('text=/\\d+\\/\\d+ \\d+%/')).toHaveCount(3);

    // Check under budget percentages
    await expect(page.locator('text=/\\d+% under budget/')).toHaveCount(3);
  });

  test('should display usage trend chart', async ({ page }) => {
    // Check trend section is present
    await expect(page.locator('text=Usage Trend')).toBeVisible();
    await expect(page.locator('text=PEAK')).toBeVisible();
    await expect(page.locator('text=AVG')).toBeVisible();
    await expect(page.locator('text=Token Usage Over Time')).toBeVisible();

    // Check chart metrics
    await expect(page.locator('text=145')).toBeVisible(); // Peak value
    await expect(page.locator('text=100')).toBeVisible(); // Average value
  });

  test('should render particle animation background', async ({ page }) => {
    // Check that particles are rendered (they have animation classes)
    const particles = page.locator('.animate-float');
    const particleCount = await particles.count();
    expect(particleCount).toBeGreaterThan(0);
  });
});

test.describe('Dashboard Responsiveness', () => {
  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Check that main elements are still visible on mobile
    await expect(page.locator('text=MoonLock Dashboard')).toBeVisible();
    await expect(page.locator('text=Session Timer')).toBeVisible();
    await expect(page.locator('text=Token Usage')).toBeVisible();

    // Take mobile screenshot
    await dashboard.takeFullPageScreenshot('mobile-dashboard');
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Check grid layout adapts to tablet
    await expect(page.locator('text=MoonLock Dashboard')).toBeVisible();
    
    // Take tablet screenshot
    await dashboard.takeFullPageScreenshot('tablet-dashboard');
  });

  test('should maintain functionality across different screen sizes', async ({ page }) => {
    const viewportSizes = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];

    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      
      const dashboard = new DashboardPage(page);
      await dashboard.goto();
      await dashboard.waitForDashboardLoad();

      // Core functionality should work at all sizes
      await expect(page.locator('text=MoonLock Dashboard')).toBeVisible();
      await expect(page.locator('text=Session Timer')).toBeVisible();
      await expect(page.locator('text=ACTIVE')).toBeVisible();
    }
  });
});

test.describe('Dashboard Interactions', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();
  });

  test('should handle tab switching between Current Session and History', async ({ page }) => {
    // Check current session tab is active by default
    await expect(page.locator('button:has-text("Current Session")')).toBeVisible();
    await expect(page.locator('button:has-text("History")')).toBeVisible();

    // Switch to History tab
    await dashboard.clickTab('History');
    
    // Should show history content (weekly quotas, recent sessions)
    await expect(page.locator('text=Weekly Quota Status')).toBeVisible();
    await expect(page.locator('text=Recent Sessions')).toBeVisible();

    // Switch back to Current Session
    await dashboard.clickTab('Current Session');
    
    // Should show current session content
    await expect(page.locator('text=Session Timer')).toBeVisible();
  });

  test('should display weekly quota information', async ({ page }) => {
    // Switch to History tab to see quotas
    await dashboard.clickTab('History');

    // Check quota bars are present
    await expect(page.locator('text=Claude Sonnet 4')).toBeVisible();
    await expect(page.locator('text=Claude Opus 4')).toBeVisible();
    
    // Check estimated sessions
    await expect(page.locator('text=Estimated sessions remaining')).toBeVisible();
    await expect(page.locator('text=23-28')).toBeVisible();
  });

  test('should display recent sessions history', async ({ page }) => {
    // Switch to History tab
    await dashboard.clickTab('History');

    // Check recent sessions section
    await expect(page.locator('text=Recent Sessions')).toBeVisible();
    await expect(page.locator('text=/\\d+ sessions/')).toBeVisible();

    // Check that session items are displayed
    const sessionItems = page.locator('[class*="space-y-3"] > div');
    const sessionCount = await sessionItems.count();
    expect(sessionCount).toBeGreaterThan(0);
  });
});

test.describe('Dashboard Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    // Should not have any console errors
    expect(consoleErrors).toEqual([]);
  });

  test('should handle network conditions gracefully', async ({ page, context }) => {
    // Simulate slow network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Should still function properly with slow network
    await expect(page.locator('text=MoonLock Dashboard')).toBeVisible();
    await expect(page.locator('text=Session Timer')).toBeVisible();
  });
});

test.describe('Visual Regression Tests', () => {
  test('should match dashboard visual appearance', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Wait for animations to settle
    await page.waitForTimeout(1000);

    // Full page screenshot comparison
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match individual panel appearances', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Timer panel screenshot
    const timerPanel = page.locator('text=Session Timer').locator('..').locator('..');
    await expect(timerPanel).toHaveScreenshot('timer-panel.png');

    // Token usage panel screenshot
    const tokenPanel = page.locator('text=Token Usage').locator('..').locator('..');
    await expect(tokenPanel).toHaveScreenshot('token-panel.png');
  });
});

test.describe('Accessibility Tests', () => {
  test('should have proper heading structure', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Check main heading
    await expect(page.locator('h1:has-text("MoonLock Dashboard")')).toBeVisible();

    // Check section headings
    const sectionHeadings = page.locator('h3');
    const headingCount = await sectionHeadings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('should have proper button labels', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Check tab buttons have proper labels
    await expect(page.locator('button[role="button"]:has-text("Current Session")')).toBeVisible();
    await expect(page.locator('button[role="button"]:has-text("History")')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to activate buttons with Enter/Space
    const focusedElement = await page.locator(':focus').first();
    if (await focusedElement.count() > 0) {
      await page.keyboard.press('Enter');
    }
  });
});