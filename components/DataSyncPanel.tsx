'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Play, Square, Database, Zap } from 'lucide-react';
import { SyncService, SyncStatus } from '@/lib/syncService';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

interface DataSyncPanelProps {
  onDataUpdate?: () => void;
}

export function DataSyncPanel({ onDataUpdate }: DataSyncPanelProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    totalSynced: 0,
    totalFailed: 0
  });
  const [simulateDeviceId, setSimulateDeviceId] = useState('');
  const [simulateCount, setSimulateCount] = useState(10);
  const [isSimulating, setIsSimulating] = useState(false);
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Subscribe to sync status updates
  useEffect(() => {
    const unsubscribe = SyncService.subscribeToSyncStatus(setSyncStatus);
    return unsubscribe;
  }, []);

  const handleStartSync = async () => {
    try {
      const result = await SyncService.syncToBlockchain(signAndExecuteTransaction, {
        batchSize: 5,
        maxRetries: 3
      });

      if (result.success) {
        alert(`Sync completed! Synced: ${result.synced}, Failed: ${result.failed}`);
        onDataUpdate?.();
      } else {
        alert(`Sync failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to start sync');
    }
  };

  const handleStopSync = () => {
    SyncService.stopSync();
  };

  const handleSimulateData = async () => {
    if (!simulateDeviceId.trim()) {
      alert('Please enter a device ID');
      return;
    }

    setIsSimulating(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate',
          deviceId: simulateDeviceId.trim(),
          count: simulateCount
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Generated ${result.readingIds.length} simulated readings`);
        onDataUpdate?.();
      } else {
        alert(`Simulation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Failed to simulate data');
    } finally {
      setIsSimulating(false);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className={`font-medium ${syncStatus.isRunning ? 'text-green-600' : 'text-gray-600'}`}>
                {syncStatus.isRunning ? 'Running' : 'Idle'}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Synced</Label>
              <div className="font-medium">{syncStatus.totalSynced}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Failed</Label>
              <div className="font-medium text-red-600">{syncStatus.totalFailed}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Sync</Label>
              <div className="font-medium">{formatTime(syncStatus.lastSyncTime)}</div>
            </div>
          </div>

          {syncStatus.isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{syncStatus.currentBatch || 0} / {syncStatus.totalBatches || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: syncStatus.totalBatches 
                      ? `${((syncStatus.currentBatch || 0) / syncStatus.totalBatches) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleStartSync}
              disabled={syncStatus.isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Sync
            </Button>
            <Button
              onClick={handleStopSync}
              disabled={!syncStatus.isRunning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ESP32 Simulation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            ESP32 Data Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="simulateDeviceId">Device ID</Label>
              <Input
                id="simulateDeviceId"
                placeholder="Enter device ID"
                value={simulateDeviceId}
                onChange={(e) => setSimulateDeviceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simulateCount">Number of Readings</Label>
              <Input
                id="simulateCount"
                type="number"
                min="1"
                max="100"
                value={simulateCount}
                onChange={(e) => setSimulateCount(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <Button
            onClick={handleSimulateData}
            disabled={isSimulating || !simulateDeviceId.trim()}
            className="w-full flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {isSimulating ? 'Generating...' : 'Generate Test Data'}
          </Button>

          <div className="text-sm text-muted-foreground">
            This will generate simulated water quality readings for testing purposes.
            Data will be saved to Firebase and can be synced to the blockchain.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
