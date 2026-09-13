import { NextResponse } from 'next/server';
import { generateDataset } from '../../../lib/dataGenerator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get('size') || '1000', 10);
  const seed = parseInt(searchParams.get('seed') || '42', 10);

  const clampedSize = Math.min(Math.max(1, size), 100000);
  const data = generateDataset(clampedSize, seed);

  return NextResponse.json({
    data,
    meta: {
      count: data.length,
      seed,
      generatedAt: Date.now(),
    },
  });
}
