import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/syncService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options } = body;

    switch (action) {
      case 'start':
        // This would require a signer, which should be handled on the client side
        return NextResponse.json({
          success: false,
          error: 'Sync must be started from the client side with wallet connection'
        }, { status: 400 });

      case 'status':
        const status = SyncService.getSyncStatus();
        return NextResponse.json({
          success: true,
          status
        });

      case 'stop':
        SyncService.stopSync();
        return NextResponse.json({
          success: true,
          message: 'Sync stopped'
        });

      case 'simulate':
        const { deviceId, count = 10 } = body;
        if (!deviceId) {
          return NextResponse.json({
            success: false,
            error: 'Device ID is required for simulation'
          }, { status: 400 });
        }

        const readingIds = await SyncService.simulateESP32Data(deviceId, count);
        return NextResponse.json({
          success: true,
          message: `Generated ${readingIds.length} simulated readings`,
          readingIds
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: start, status, stop, or simulate'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in sync API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = SyncService.getSyncStatus();
    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get sync status' 
      },
      { status: 500 }
    );
  }
}
