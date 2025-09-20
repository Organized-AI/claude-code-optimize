import { NextResponse } from 'next/server';
import { getActiveSession, getSessionById } from '@/app/lib/data-reader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const activeSession = await getActiveSession();
    
    if (!activeSession) {
      return NextResponse.json(null);
    }
    
    // Get the full session details
    const session = await getSessionById(activeSession.sessionId);
    
    return NextResponse.json({
      ...activeSession,
      session
    });
  } catch (error) {
    console.error('Error in active-session API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}