'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search } from 'lucide-react';

interface DeviceQueryBarProps {
  onQuery: (deviceId: string, fromMs: number, toMs: number, dataSource?: 'unified' | 'firebase' | 'blockchain') => void;
  isLoading: boolean;
  dataSource?: 'unified' | 'firebase' | 'blockchain';
}

export function DeviceQueryBar({ onQuery, isLoading, dataSource = 'unified' }: DeviceQueryBarProps) {
  const defaultDeviceId = process.env.NEXT_PUBLIC_DEFAULT_DEVICE_ID ?? '';
  const [deviceId, setDeviceId] = useState(defaultDeviceId);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState<'unified' | 'firebase' | 'blockchain'>(dataSource);
  const ENABLE_FIREBASE = process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true';

  // Load last-used device ID if env var isn't provided
  useEffect(() => {
    if (!defaultDeviceId) {
      try {
        const saved = localStorage.getItem('wqd:lastDeviceId');
        if (saved) setDeviceId(saved);
      } catch {}
    }
  }, [defaultDeviceId]);

  // Persist device ID for future sessions
  useEffect(() => {
    try {
      if (deviceId) localStorage.setItem('wqd:lastDeviceId', deviceId);
    } catch {}
  }, [deviceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceId.trim()) {
      alert('Please enter a device ID');
      return;
    }

    if (!fromDate || !toDate) {
      alert('Please select both start and end dates');
      return;
    }

    const fromMs = new Date(fromDate).getTime();
    const toMs = new Date(toDate).getTime();

    if (fromMs >= toMs) {
      alert('Start date must be before end date');
      return;
    }

    onQuery(deviceId.trim(), fromMs, toMs, selectedDataSource);
  };

  const handleQuickRange = (hours: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    setFromDate(from.toISOString().slice(0, 16));
    setToDate(now.toISOString().slice(0, 16));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Query Water Quality Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Data Source</Label>
            <div className="flex gap-2">
              {ENABLE_FIREBASE && (
                <>
                  <Button
                    type="button"
                    variant={selectedDataSource === 'unified' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDataSource('unified')}
                  >
                    Unified (Firebase + Blockchain)
                  </Button>
                  <Button
                    type="button"
                    variant={selectedDataSource === 'firebase' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDataSource('firebase')}
                  >
                    Firebase Only
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant={selectedDataSource === 'blockchain' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDataSource('blockchain')}
              >
                Blockchain Only
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                placeholder="Enter device ID"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fromDate">Start Date (UTC)</Label>
              <Input
                id="fromDate"
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="toDate">End Date (UTC)</Label>
              <Input
                id="toDate"
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange(24)}
            >
              Last 24h
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange(168)}
            >
              Last 7d
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange(720)}
            >
              Last 30d
            </Button>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Querying...' : 'Query Data'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
