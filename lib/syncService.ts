import { FirebaseService, ESP32Reading } from './firebaseService';
import { BlockchainService, SyncResult } from './blockchainService';
import { Reading } from './transform';

export interface SyncStatus {
  isRunning: boolean;
  lastSyncTime?: Date;
  totalSynced: number;
  totalFailed: number;
  currentBatch?: number;
  totalBatches?: number;
}

export interface SyncOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class SyncService {
  private static syncStatus: SyncStatus = {
    isRunning: false,
    totalSynced: 0,
    totalFailed: 0
  };

  private static listeners: ((status: SyncStatus) => void)[] = [];

  /**
   * Subscribe to sync status updates
   */
  static subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.syncStatus); // Send current status immediately
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update sync status and notify listeners
   */
  private static updateStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.listeners.forEach(listener => listener(this.syncStatus));
  }

  /**
   * Sync unsynced readings from Firebase to blockchain
   */
  static async syncToBlockchain(
    signAndExecuteTransaction: (args: any) => Promise<any>,
    options: SyncOptions = {}
  ): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const {
      batchSize = 10,
      maxRetries = 3,
      retryDelay = 1000
    } = options;

    if (this.syncStatus.isRunning) {
      throw new Error('Sync is already running');
    }

    this.updateStatus({
      isRunning: true,
      totalSynced: 0,
      totalFailed: 0,
      currentBatch: 0,
      totalBatches: 0
    });

    const errors: string[] = [];
    let totalSynced = 0;
    let totalFailed = 0;

    try {
      // Get all unsynced readings
      const unsyncedReadings = await FirebaseService.getUnsyncedReadings(1000);
      
      if (unsyncedReadings.length === 0) {
        this.updateStatus({
          isRunning: false,
          lastSyncTime: new Date()
        });
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

      const totalBatches = Math.ceil(unsyncedReadings.length / batchSize);
      this.updateStatus({ totalBatches });

      // Process in batches
      for (let i = 0; i < unsyncedReadings.length; i += batchSize) {
        const batch = unsyncedReadings.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        this.updateStatus({ currentBatch: batchNumber });

        let retryCount = 0;
        let batchSuccess = false;

        while (retryCount < maxRetries && !batchSuccess) {
          try {
            const results = await BlockchainService.batchSyncToBlockchain(batch, signAndExecuteTransaction);
            
            // Process results
            for (let j = 0; j < results.length; j++) {
              const result = results[j];
              const reading = batch[j];
              
              if (result.success && result.txHash) {
                // Mark as synced in Firebase
                await FirebaseService.markAsSyncedToBlockchain(
                  reading.id!,
                  result.txHash
                );
                totalSynced++;
              } else {
                totalFailed++;
                errors.push(`Reading ${reading.id}: ${result.error || 'Unknown error'}`);
              }
            }

            batchSuccess = true;
          } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`Batch ${batchNumber} failed, retrying... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
            } else {
              console.error(`Batch ${batchNumber} failed after ${maxRetries} retries:`, error);
              totalFailed += batch.length;
              errors.push(`Batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        this.updateStatus({
          totalSynced,
          totalFailed
        });
      }

      this.updateStatus({
        isRunning: false,
        lastSyncTime: new Date()
      });

      return {
        success: totalFailed === 0,
        synced: totalSynced,
        failed: totalFailed,
        errors
      };

    } catch (error) {
      this.updateStatus({
        isRunning: false
      });
      
      console.error('Sync failed:', error);
      return {
        success: false,
        synced: totalSynced,
        failed: totalFailed + 1,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get data from both Firebase and blockchain, with Firebase as primary source
   */
  static async getUnifiedReadings(
    deviceId: string,
    fromMs: number,
    toMs: number,
    limit: number = 1000
  ): Promise<{
    readings: Reading[];
    source: 'firebase' | 'blockchain' | 'mixed';
    firebaseCount: number;
    blockchainCount: number;
  }> {
    try {
      // Get from Firebase first (most recent data)
      const firebaseResult = await FirebaseService.getESP32Readings({
        deviceId,
        fromMs,
        toMs,
        limit: Math.floor(limit * 0.7) // 70% from Firebase
      });

      // Get from blockchain for any gaps
      const blockchainResult = await BlockchainService.getReadings({
        deviceId,
        fromMs,
        toMs,
        limit: Math.floor(limit * 0.3) // 30% from blockchain
      });

      // Convert Firebase readings to unified format
      const firebaseReadings: Reading[] = firebaseResult.readings.map(reading => ({
        deviceId: reading.deviceId,
        timestampMs: reading.timestamp.toMillis(),
        dayUtc: Math.floor(reading.timestamp.toMillis() / 86_400_000),
        minuteIndex: Math.floor((reading.timestamp.toMillis() % 86_400_000) / 60_000),
        temperature: reading.temperature,
        dissolvedOxygen: reading.dissolvedOxygen,
        ph: reading.ph,
        turbidity: reading.turbidity,
        by: 'firebase'
      }));

      // Merge and deduplicate readings
      const allReadings = [...firebaseReadings, ...blockchainResult.readings];
      const uniqueReadings = this.deduplicateReadings(allReadings);

      // Sort by timestamp (newest first)
      uniqueReadings.sort((a, b) => b.timestampMs - a.timestampMs);

      // Determine source
      let source: 'firebase' | 'blockchain' | 'mixed' = 'firebase';
      if (firebaseReadings.length === 0 && blockchainResult.readings.length > 0) {
        source = 'blockchain';
      } else if (firebaseReadings.length > 0 && blockchainResult.readings.length > 0) {
        source = 'mixed';
      }

      return {
        readings: uniqueReadings.slice(0, limit),
        source,
        firebaseCount: firebaseReadings.length,
        blockchainCount: blockchainResult.readings.length
      };

    } catch (error) {
      console.error('Error getting unified readings:', error);
      throw new Error('Failed to get unified readings');
    }
  }

  /**
   * Deduplicate readings based on deviceId and timestamp
   */
  private static deduplicateReadings(readings: Reading[]): Reading[] {
    const seen = new Set<string>();
    return readings.filter(reading => {
      const key = `${reading.deviceId}-${reading.timestampMs}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Stop sync if running
   */
  static stopSync(): void {
    if (this.syncStatus.isRunning) {
      this.updateStatus({
        isRunning: false
      });
    }
  }

  /**
   * Simulate ESP32 data for testing
   */
  static async simulateESP32Data(
    deviceId: string,
    count: number = 10
  ): Promise<string[]> {
    const readingIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const now = new Date();
      const timestamp = new Date(now.getTime() - i * 60 * 1000); // 1 minute intervals
      
      const reading: Omit<ESP32Reading, 'createdAt' | 'syncedToBlockchain'> = {
        deviceId,
        timestamp: timestamp as any, // Will be converted to Timestamp in service
        temperature: 20 + Math.random() * 10, // 20-30°C
        dissolvedOxygen: 6 + Math.random() * 4, // 6-10 mg/L
        ph: 6.5 + Math.random() * 2, // 6.5-8.5
        turbidity: 0 + Math.random() * 5, // 0-5 NTU
        rawData: {
          sensorVersion: '1.0',
          batteryLevel: 85 + Math.random() * 15,
          signalStrength: -50 - Math.random() * 30
        }
      };

      try {
        const id = await FirebaseService.saveESP32Reading(reading);
        readingIds.push(id);
      } catch (error) {
        console.error('Error simulating ESP32 data:', error);
      }
    }

    return readingIds;
  }
}
