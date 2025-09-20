import { NextResponse } from 'next/server';
import { getStatistics } from '@/app/lib/data-reader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await getStatistics();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in statistics API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}