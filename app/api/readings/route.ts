import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { client, EVENT_TYPE, DEBUG, PACKAGE_ID } from '@/lib/sui';
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
      // Ensure optional cursor is undefined (not null) when missing
      cursor: searchParams.get('cursor') ?? undefined,
    });

    if (DEBUG) {
      console.log('[readings] Input', { deviceId, fromMs, toMs, limit, cursor, EVENT_TYPE });
    }

    const readings: Reading[] = [];
    let nextCursor: string | undefined = cursor;
    let hasMore = true;
    let totalFetched = 0;

    let usedFallback = false;
    let triedRpcEventType = false;
    while (hasMore && totalFetched < limit) {
      let result: any;
      if (!usedFallback) {
        result = await client.queryEvents({
          query: { MoveEventType: EVENT_TYPE },
          cursor: nextCursor as any,
          order: 'descending',
          limit: 200,
        });
        // If still empty on the first page, try ascending order as a quirk workaround
        if ((!result.data || result.data.length === 0) && !nextCursor) {
          const alt = await client.queryEvents({
            query: { MoveEventType: EVENT_TYPE },
            cursor: undefined as any,
            order: 'ascending',
            limit: 200,
          });
          if (alt?.data?.length) result = alt;
        }
      } else {
        // Raw RPC fallback using suix_queryEvents with MoveModule
        const rpc = process.env.NEXT_PUBLIC_SUI_RPC_URL as string;
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: 'suix_queryEvents',
          params: [
            { MoveModule: { package: PACKAGE_ID, module: 'fms' } },
            nextCursor ?? null,
            500,
            false,
          ],
        };
        const resp = await fetch(rpc, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await resp.json();
        if (json.error && DEBUG) {
          console.error('[readings] Raw RPC error', json.error);
        }
        result = json.result ?? { data: [], nextCursor: null, hasNextPage: false };
      }

      if (DEBUG) {
        console.log('[readings] Page', {
          pageSize: result.data?.length,
          nextCursor: result.nextCursor,
        });
      }

      if (!result.data || result.data.length === 0) {
        if (DEBUG && !usedFallback) {
          console.log('[readings] No results for MoveEventType, retrying with MoveModule filter (raw RPC)');
          usedFallback = true;
          continue;
        } else if (DEBUG && usedFallback && !triedRpcEventType) {
          // Final attempt: Raw RPC with MoveEventType (exact type)
          const rpc = process.env.NEXT_PUBLIC_SUI_RPC_URL as string;
          const body2 = {
            jsonrpc: '2.0',
            id: 1,
            method: 'suix_queryEvents',
            params: [
              { MoveEventType: EVENT_TYPE },
              nextCursor ?? null,
              500,
              false,
            ],
          };
          const resp2 = await fetch(rpc, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body2),
          });
          const json2 = await resp2.json();
          if (json2.error) {
            console.error('[readings] Raw RPC MoveEventType error', json2.error);
          } else {
            console.log('[readings] Raw RPC MoveEventType page', {
              pageSize: json2.result?.data?.length,
              nextCursor: json2.result?.nextCursor,
            });
            result = json2.result ?? { data: [], nextCursor: null, hasNextPage: false };
            triedRpcEventType = true;
            // Re-enter processing with this result
            if (!result.data || result.data.length === 0) {
              hasMore = false;
              break;
            }
          }
        } else {
          hasMore = false;
          break;
        }
      }

      // Filter events by device_id and timestamp range
      for (const event of result.data) {
        if (DEBUG && usedFallback) {
          // @ts-ignore
          const t = event.type || (event as any).type;
          if (t) console.log('[readings] Fallback event type:', t);
        }
        if (totalFetched >= limit) break;

        const reading = eventToReading(event);
        if (!reading) continue;

        const matchesType = usedFallback
          ? // @ts-ignore
            (event.type === EVENT_TYPE)
          : true;

        // Check if this event matches our criteria
        if (matchesType && reading.deviceId === deviceId && 
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

    if (DEBUG) {
      console.log('[readings] Done', { count: readings.length, nextCursor });
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
