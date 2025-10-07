import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { client, EVENT_TYPE, DEBUG } from '@/lib/sui';
import { eventToReading, Reading } from '@/lib/transform';

const querySchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { deviceId } = querySchema.parse({
      deviceId: searchParams.get('deviceId'),
    });

    if (DEBUG) {
      console.log('[latest] Input', { deviceId, EVENT_TYPE });
    }

    let nextCursor: string | undefined;
    let hasMore = true;
    let latestReading: Reading | null = null;

    // Fetch recent events starting from newest
    while (hasMore && !latestReading) {
      const result = await client.queryEvents({
        query: {
          MoveEventType: EVENT_TYPE,
        },
        cursor: nextCursor as any,
        order: 'descending',
        limit: 100,
      });

      if (DEBUG) {
        console.log('[latest] Page', {
          pageSize: result.data?.length,
          nextCursor: result.nextCursor,
        });
      }

      if (!result.data || result.data.length === 0) {
        hasMore = false;
        break;
      }

      // Look for the first matching device_id
      for (const event of result.data) {
        const reading = eventToReading(event);
        if (!reading) continue;

        if (reading.deviceId === deviceId) {
          latestReading = reading;
          break;
        }
      }

      nextCursor = result.nextCursor as string | undefined;
      if (!nextCursor) {
        hasMore = false;
      }
    }

    if (!latestReading) {
      return NextResponse.json(
        { error: 'No readings found for device' },
        { status: 404 }
      );
    }

    if (DEBUG) {
      console.log('[latest] Done', { found: !!latestReading });
    }

    return NextResponse.json({ data: latestReading });

  } catch (error) {
    console.error('Error fetching latest reading:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch latest reading' },
      { status: 500 }
    );
  }
}
