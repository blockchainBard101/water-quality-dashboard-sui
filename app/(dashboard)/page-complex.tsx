'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DeviceQueryBar } from '@/components/DeviceQueryBar';
import { KpiCards } from '@/components/KpiCards';
import { ReadingChart } from '@/components/ReadingChart';
import { ReadingTable } from '@/components/ReadingTable';
import { ExportMenu } from '@/components/ExportMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reading } from '@/lib/transform';

interface QueryState {
  deviceId: string;
  fromMs: number;
  toMs: number;
}

interface ReadingsResponse {
  data: Reading[];
  nextCursor?: string;
}

export default function Dashboard() {
  const [queryState, setQueryState] = useState<QueryState | null>(null);
  const [allReadings, setAllReadings] = useState<Reading[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Query for latest reading
  const { data: latestReading, isLoading: isLoadingLatest } = useQuery({
    queryKey: ['latest-reading', queryState?.deviceId],
    queryFn: async () => {
      if (!queryState?.deviceId) return null;
      
      const response = await fetch(`/api/latest?deviceId=${encodeURIComponent(queryState.deviceId)}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch latest reading');
      }
      
      const result = await response.json();
      return result.data as Reading;
    },
    enabled: !!queryState?.deviceId,
    staleTime: 30000, // 30 seconds
  });

  // Query for readings
  const { data: readingsData, isLoading: isLoadingReadings, error } = useQuery({
    queryKey: ['readings', queryState],
    queryFn: async (): Promise<ReadingsResponse> => {
      if (!queryState) throw new Error('No query state');
      
      const params = new URLSearchParams({
        deviceId: queryState.deviceId,
        fromMs: queryState.fromMs.toString(),
        toMs: queryState.toMs.toString(),
        limit: '5000',
      });

      const response = await fetch(`/api/readings?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch readings');
      }
      
      return response.json();
    },
    enabled: !!queryState,
    staleTime: 60000, // 1 minute
  });

  // Update readings when new data comes in
  useEffect(() => {
    if (readingsData) {
      setAllReadings(readingsData.data);
      setNextCursor(readingsData.nextCursor);
    }
  }, [readingsData]);

  const handleQuery = (deviceId: string, fromMs: number, toMs: number) => {
    setQueryState({ deviceId, fromMs, toMs });
    setAllReadings([]);
    setNextCursor(undefined);
  };

  const handleLoadMore = async () => {
    if (!nextCursor || !queryState) return;

    try {
      const params = new URLSearchParams({
        deviceId: queryState.deviceId,
        fromMs: queryState.fromMs.toString(),
        toMs: queryState.toMs.toString(),
        limit: '5000',
        cursor: nextCursor,
      });

      const response = await fetch(`/api/readings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch more readings');
      
      const result = await response.json();
      setAllReadings(prev => [...prev, ...result.data]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Failed to load more readings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Water Quality Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and analyze water quality readings from Sui blockchain
          </p>
        </div>

        <DeviceQueryBar 
          onQuery={handleQuery} 
          isLoading={isLoadingReadings || isLoadingLatest}
        />

        {queryState && (
          <>
            <KpiCards 
              latestReading={latestReading || null} 
              isLoading={isLoadingLatest}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ReadingChart 
                readings={allReadings} 
                isLoading={isLoadingReadings}
              />
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Data Export</CardTitle>
                  <ExportMenu 
                    readings={allReadings} 
                    disabled={isLoadingReadings}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Export filtered data as CSV or JSON. 
                    {allReadings.length > 0 && (
                      <span className="block mt-2">
                        Current dataset: {allReadings.length} readings
                        {nextCursor && ' (more available)'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <ReadingTable 
              readings={allReadings}
              isLoading={isLoadingReadings}
              onLoadMore={nextCursor ? handleLoadMore : undefined}
              hasMore={!!nextCursor}
            />

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="text-destructive">
                    Error: {error instanceof Error ? error.message : 'Unknown error occurred'}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!queryState && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Enter a device ID and time range to start querying water quality data
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
