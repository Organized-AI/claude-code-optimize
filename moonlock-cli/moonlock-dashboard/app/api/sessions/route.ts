import { NextResponse } from 'next/server';
import { getSessions, getSessionById } from '@/app/lib/data-reader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    
    if (sessionId) {
      const session = await getSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(session);
    }
    
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}