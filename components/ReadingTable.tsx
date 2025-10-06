'use client';

import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Reading } from '@/lib/transform';
import { formatTimestamp } from '@/lib/utils';

interface ReadingTableProps {
  readings: Reading[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ReadingTable({ readings, isLoading, onLoadMore, hasMore }: ReadingTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: readings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  if (isLoading && readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Quality Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Quality Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No data available for the selected time range
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Quality Data ({readings.length} readings)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="overflow-auto max-h-96" ref={parentRef}>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const reading = readings[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="flex items-center px-4 py-3 border-b hover:bg-muted/50">
                      <div className="grid grid-cols-6 gap-4 w-full text-sm">
                        <div className="font-mono text-xs">
                          {formatTimestamp(reading.timestampMs)}
                        </div>
                        <div className="text-right">
                          {reading.temperature.toFixed(2)}°C
                        </div>
                        <div className="text-right">
                          {reading.dissolvedOxygen.toFixed(2)} mg/L
                        </div>
                        <div className="text-right">
                          {reading.ph.toFixed(2)}
                        </div>
                        <div className="text-right">
                          {reading.turbidity.toFixed(2)} NTU
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          {reading.by.slice(0, 8)}...{reading.by.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {hasMore && onLoadMore && (
            <div className="p-4 border-t">
              <button
                onClick={onLoadMore}
                className="w-full py-2 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
