import { NextResponse } from 'next/server';

// Use environment variable or fallback to local dashboard server
const API_BASE_URL = process.env.DASHBOARD_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    // Fetch stats from the existing dashboard server
    const response = await fetch(`${API_BASE_URL}/api/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache in development
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Dashboard API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Return the data with additional calculated fields
    return NextResponse.json({
      totalActivities: data.totalActivities || 0,
      todayActivities: data.todayActivities || 0,
      claudeCodeCount: data.sources?.['claude-code'] || 0,
      claudeDesktopCount: data.sources?.['claude-desktop'] || 0,
      systemCount: data.sources?.['system'] || 0,
      sources: data.sources || {},
      recentActivities: data.recentActivities || []
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    
    // Return empty data if the dashboard server is not available
    return NextResponse.json({
      totalActivities: 0,
      todayActivities: 0,
      claudeCodeCount: 0,
      claudeDesktopCount: 0,
      systemCount: 0,
      sources: {},
      recentActivities: []
    });
  }
}
