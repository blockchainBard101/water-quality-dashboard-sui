import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SyncService } from '@/lib/syncService';

const querySchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  fromMs: z.string().transform(Number).refine(n => !isNaN(n), 'Invalid fromMs'),
  toMs: z.string().transform(Number).refine(n => !isNaN(n), 'Invalid toMs'),
  limit: z.string().transform(Number).refine(n => !isNaN(n) && n > 0, 'Invalid limit').optional().default('1000'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { deviceId, fromMs, toMs, limit } = querySchema.parse({
      deviceId: searchParams.get('deviceId'),
      fromMs: searchParams.get('fromMs'),
      toMs: searchParams.get('toMs'),
      limit: searchParams.get('limit'),
    });

    const result = await SyncService.getUnifiedReadings(deviceId, fromMs, toMs, limit);

    return NextResponse.json({
      success: true,
      data: result.readings,
      source: result.source,
      firebaseCount: result.firebaseCount,
      blockchainCount: result.blockchainCount,
      totalCount: result.readings.length
    });

  } catch (error) {
    console.error('Error fetching unified readings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid query parameters', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch unified readings' 
      },
      { status: 500 }
    );
  }
}
