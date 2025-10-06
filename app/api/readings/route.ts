import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { client, EVENT_TYPE } from '@/lib/sui';
import { eventToReading, Reading } from '@/lib/transform';

const querySchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  fromMs: z.string().transform(Number).refine(n => !isNaN(n), 'Invalid fromMs'),
  toMs: z.string().transform(Number).refine(n => !isNaN(n), 'Invalid toMs'),
  limit: z.string().transform(Number).refine(n => !isNaN(n) && n > 0, 'Invalid limit').optional().default('5000'),
  cursor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { deviceId, fromMs, toMs, limit, cursor } = querySchema.parse({
      deviceId: searchParams.get('deviceId'),
      fromMs: searchParams.get('fromMs'),
      toMs: searchParams.get('toMs'),
      limit: searchParams.get('limit'),
      cursor: searchParams.get('cursor'),
    });

    const readings: Reading[] = [];
    let nextCursor: string | undefined = cursor;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore && totalFetched < limit) {
      const result = await client.queryEvents({
        query: {
          MoveEventType: EVENT_TYPE,
        },
        cursor: nextCursor as any,
        order: 'descending',
        limit: 100, // Sui page size
      });

      if (!result.data || result.data.length === 0) {
        hasMore = false;
        break;
      }

      // Filter events by device_id and timestamp range
      for (const event of result.data) {
        if (totalFetched >= limit) break;

        const reading = eventToReading(event);
        if (!reading) continue;

        // Check if this event matches our criteria
        if (reading.deviceId === deviceId && 
            reading.timestampMs >= fromMs && 
            reading.timestampMs <= toMs) {
          readings.push(reading);
          totalFetched++;
        }

        // If we've gone past our time range, we can stop
        if (reading.timestampMs < fromMs) {
          hasMore = false;
          break;
        }
      }

      nextCursor = result.nextCursor as string | undefined;
      if (!nextCursor) {
        hasMore = false;
      }
    }

    return NextResponse.json({
      data: readings,
      nextCursor: nextCursor && totalFetched < limit ? nextCursor : undefined,
    });

  } catch (error) {
    console.error('Error fetching readings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch readings' },
      { status: 500 }
    );
  }
}
