import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseService } from '@/lib/firebaseService';

const esp32ReadingSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  timestamp: z.number().optional(), // Unix timestamp in milliseconds
  temperature: z.number().min(-50).max(100, 'Temperature must be between -50 and 100°C'),
  dissolvedOxygen: z.number().min(0).max(20, 'Dissolved oxygen must be between 0 and 20 mg/L'),
  ph: z.number().min(0).max(14, 'pH must be between 0 and 14'),
  turbidity: z.number().min(0).max(1000, 'Turbidity must be between 0 and 1000 NTU'),
  rawData: z.any().optional(), // Additional sensor data
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = esp32ReadingSchema.parse(body);

    // Use current timestamp if not provided
    const timestamp = validatedData.timestamp 
      ? new Date(validatedData.timestamp)
      : new Date();

    const reading: Omit<import('@/lib/firebaseService').ESP32Reading, 'createdAt' | 'syncedToBlockchain'> = {
      deviceId: validatedData.deviceId,
      timestamp: timestamp as any, // Will be converted to Timestamp in service
      temperature: validatedData.temperature,
      dissolvedOxygen: validatedData.dissolvedOxygen,
      ph: validatedData.ph,
      turbidity: validatedData.turbidity,
      rawData: validatedData.rawData
    };

    const readingId = await FirebaseService.saveESP32Reading(reading);

    return NextResponse.json({
      success: true,
      readingId,
      message: 'ESP32 reading saved successfully'
    });

  } catch (error) {
    console.error('Error saving ESP32 reading:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid data format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save ESP32 reading' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const fromMs = searchParams.get('fromMs');
    const toMs = searchParams.get('toMs');
    const limit = searchParams.get('limit');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    if (!fromMs || !toMs) {
      return NextResponse.json(
        { success: false, error: 'fromMs and toMs are required' },
        { status: 400 }
      );
    }

    const result = await FirebaseService.getESP32Readings({
      deviceId,
      fromMs: parseInt(fromMs),
      toMs: parseInt(toMs),
      limit: limit ? parseInt(limit) : 1000
    });

    return NextResponse.json({
      success: true,
      data: result.readings,
      hasMore: result.hasMore,
      lastDoc: result.lastDoc?.id
    });

  } catch (error) {
    console.error('Error fetching ESP32 readings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch ESP32 readings' 
      },
      { status: 500 }
    );
  }
}
