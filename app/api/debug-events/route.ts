import { NextRequest, NextResponse } from 'next/server';
import { EVENT_TYPE, PACKAGE_ID, DEBUG } from '@/lib/sui';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || EVENT_TYPE;
    const moduleName = searchParams.get('module') || 'fms';
    const limit = Number(searchParams.get('limit') || '5');

    const rpc = process.env.NEXT_PUBLIC_SUI_RPC_URL as string;

    // 1) Try exact MoveEventType
    const bodyType = {
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_queryEvents',
      params: [
        { MoveEventType: type },
        null,
        limit,
        false,
      ],
    };
    const r1 = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyType) });
    const j1 = await r1.json();

    // 2) Also try MoveModule for comparison
    const bodyModule = {
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_queryEvents',
      params: [
        { MoveModule: { package: PACKAGE_ID, module: moduleName } },
        null,
        limit,
        false,
      ],
    };
    const r2 = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyModule) });
    const j2 = await r2.json();

    return NextResponse.json({
      info: { EVENT_TYPE, PACKAGE_ID, rpc },
      byType: {
        error: j1.error || null,
        count: j1?.result?.data?.length || 0,
        nextCursor: j1?.result?.nextCursor || null,
        sample: (j1?.result?.data || []).slice(0, 2),
      },
      byModule: {
        error: j2.error || null,
        count: j2?.result?.data?.length || 0,
        nextCursor: j2?.result?.nextCursor || null,
        sample: (j2?.result?.data || []).slice(0, 2),
      },
    });
  } catch (error) {
    console.error('[debug-events] error', error);
    return NextResponse.json({ error: 'Failed to fetch debug events' }, { status: 500 });
  }
}


