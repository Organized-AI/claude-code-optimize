import { NextResponse } from 'next/server';

export async function GET() {
  // For development, proxy to local monitoring server
  const MONITOR_API = process.env.MONITOR_API_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${MONITOR_API}/api/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    
    // Return default stats if server is unavailable
    return NextResponse.json({
      totalActivities: 0,
      todayActivities: 0,
      sessionCount: 0,
      sources: {
        'claude-code': 0,
        'claude-desktop': 0,
        'system': 0
      },
      recentActivities: []
    });
  }
}
