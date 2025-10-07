'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ExportMenu } from '@/components/ExportMenu';
import { DeviceQueryBar } from '@/components/DeviceQueryBar';
import { KpiCards } from '@/components/KpiCards';
import { ReadingChart } from '@/components/ReadingChart';
import { ReadingTable } from '@/components/ReadingTable';
import { useWaterQualityData } from '@/lib/useWaterQualityData';

const ENABLE_FIREBASE = process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true';
const DataSyncPanel = ENABLE_FIREBASE
  ? dynamic(() => import('@/components/DataSyncPanel').then(m => m.DataSyncPanel), { ssr: false })
  : null as any;

export default function Dashboard() {
  const {
    readings,
    isLoading,
    error,
    dataSource,
    firebaseCount,
    blockchainCount,
    fetchData,
    clearData
  } = useWaterQualityData();

  const latestReading = useMemo(() => {
    if (readings.length === 0) return null;
    return [...readings].sort((a, b) => b.timestampMs - a.timestampMs)[0];
  }, [readings]);

  const handleQuery = async (
    deviceId: string,
    fromMs: number,
    toMs: number,
    source?: 'unified' | 'firebase' | 'blockchain'
  ) => {
    await fetchData(deviceId, fromMs, toMs, source);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Water Quality Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Query readings from Firebase and Sui blockchain, and sync new ESP32 data to chain.
        </p>
      </div>

      <DeviceQueryBar onQuery={handleQuery} isLoading={isLoading} dataSource={ENABLE_FIREBASE ? 'unified' : 'blockchain'} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          </div>
      )}

      <KpiCards latestReading={latestReading} isLoading={isLoading} />

      <ReadingChart readings={readings} isLoading={isLoading} />

      <ReadingTable readings={readings} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between rounded-md border p-3 text-sm text-muted-foreground">
            <div>
              Data source: <span className="font-medium">{dataSource}</span>
              {dataSource === 'unified' && (
                <span> • Firebase: {firebaseCount} • Blockchain: {blockchainCount}</span>
              )}
            </div>
            <ExportMenu readings={readings} disabled={isLoading || readings.length === 0} />
          </div>
        </div>
        {ENABLE_FIREBASE && DataSyncPanel && (
          <div>
            <DataSyncPanel onDataUpdate={() => { /* refresh stats after sync if needed */ }} />
          </div>
        )}
      </div>
    </div>
  );
}
