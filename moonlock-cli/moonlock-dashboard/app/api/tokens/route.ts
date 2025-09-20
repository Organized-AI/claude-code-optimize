import { NextResponse } from 'next/server';
import { getTokenUsage } from '@/app/lib/data-reader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    const tokenUsage = await getTokenUsage(sessionId || undefined);
    return NextResponse.json(tokenUsage);
  } catch (error) {
    console.error('Error in tokens API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    );
  }
}