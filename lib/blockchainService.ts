import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { client, PACKAGE_ID, EVENT_TYPE, DEBUG, CLOCK_ID } from './sui';
import { Reading, eventToReading } from './transform';
import { ESP32Reading } from './firebaseService';

export interface BlockchainQuery {
  deviceId: string;
  fromMs: number;
  toMs: number;
  limit?: number;
  cursor?: string;
}

export interface SyncResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class BlockchainService {
  private static readonly MODULE_NAME = 'fms';
  private static readonly FUNCTION_NAME = 'submit_reading_x100';

  /**
   * Query readings from blockchain
   */
  static async getReadings(queryParams: BlockchainQuery): Promise<{
    readings: Reading[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      const { deviceId, fromMs, toMs, limit = 5000, cursor } = queryParams;
      
      const readings: Reading[] = [];
      let nextCursor: string | undefined = cursor;
      let hasMore = true;
      let totalFetched = 0;

      while (hasMore && totalFetched < limit) {
        const result = await client.queryEvents({
          query: {
            MoveEventType: EVENT_TYPE,
          },
          cursor: nextCursor as any,
          order: 'descending',
          limit: 100, // Sui page size
        });

        if (DEBUG) {
          console.log('[BlockchainService.getReadings] Page', {
            pageSize: result.data?.length,
            nextCursor: result.nextCursor,
          });
        }

        if (!result.data || result.data.length === 0) {
          hasMore = false;
          break;
        }

        // Filter events by device_id and timestamp range
        for (const event of result.data) {
          if (totalFetched >= limit) break;

          const reading = eventToReading(event);
          if (!reading) continue;

          // Check if this event matches our criteria
          if (reading.deviceId === deviceId && 
              reading.timestampMs >= fromMs && 
              reading.timestampMs <= toMs) {
            readings.push(reading);
            totalFetched++;
          }

          // If we've gone past our time range, we can stop
          if (reading.timestampMs < fromMs) {
            hasMore = false;
            break;
          }
        }

        nextCursor = result.nextCursor as string | undefined;
        if (!nextCursor) {
          hasMore = false;
        }
      }

      const out = {
        readings,
        nextCursor: nextCursor && totalFetched < limit ? nextCursor : undefined,
        hasMore
      };
      if (DEBUG) {
        console.log('[BlockchainService.getReadings] Done', { count: out.readings.length, nextCursor: out.nextCursor });
      }
      return out;
    } catch (error) {
      console.error('Error fetching blockchain readings:', error);
      throw new Error('Failed to fetch blockchain readings');
    }
  }

  /**
   * Get latest reading from blockchain
   */
  static async getLatestReading(deviceId: string): Promise<Reading | null> {
    try {
      let nextCursor: string | undefined;
      let hasMore = true;

      // Fetch recent events starting from newest
      while (hasMore) {
        const result = await client.queryEvents({
          query: {
            MoveEventType: EVENT_TYPE,
          },
          cursor: nextCursor as any,
          order: 'descending',
          limit: 100,
        });

        if (!result.data || result.data.length === 0) {
          hasMore = false;
          break;
        }

        // Look for the first matching device_id
        for (const event of result.data) {
          const reading = eventToReading(event);
          if (!reading) continue;

          if (reading.deviceId === deviceId) {
            return reading;
          }
        }

        nextCursor = result.nextCursor as string | undefined;
        if (!nextCursor) {
          hasMore = false;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching latest blockchain reading:', error);
      throw new Error('Failed to fetch latest blockchain reading');
    }
  }

  /**
   * Sync ESP32 reading to blockchain
   */
  static async syncToBlockchain(
    reading: ESP32Reading,
    signAndExecuteTransaction: (args: any) => Promise<any>
  ): Promise<SyncResult> {
    try {
      const tx = new Transaction();
      
      // Convert ESP32 reading to blockchain format
      const blockchainReading = this.convertToBlockchainFormat(reading);
      
      // Call the smart contract function
      // submit_reading_x100(&mut Device, t_x100, do_x100, ph_x100, tu_x100, &Clock, &mut TxContext)
      tx.moveCall({
        target: `${PACKAGE_ID}::${this.MODULE_NAME}::${this.FUNCTION_NAME}`,
        arguments: [
          tx.object(blockchainReading.deviceId),
          tx.pure.u64(Math.round(blockchainReading.temperature * 100)),
          tx.pure.u64(Math.round(blockchainReading.dissolvedOxygen * 100)),
          tx.pure.u64(Math.round(blockchainReading.ph * 100)),
          tx.pure.u64(Math.round(blockchainReading.turbidity * 100)),
          tx.object(CLOCK_ID),
        ],
      });

      // Execute transaction via wallet
      const result = await signAndExecuteTransaction({
        transaction: tx,
        chain: 'sui:testnet',
        options: { showEffects: true, showEvents: true },
      });

      if (result.effects?.status?.status === 'success') {
        return {
          success: true,
          txHash: result.digest
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed'
        };
      }
    } catch (error) {
      console.error('Error syncing to blockchain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch sync multiple readings to blockchain
   */
  static async batchSyncToBlockchain(
    readings: ESP32Reading[],
    signAndExecuteTransaction: (args: any) => Promise<any>
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    // Process in batches to avoid gas limits
    const batchSize = 10;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      
      try {
        const tx = new Transaction();
        
        // Add all readings in the batch
        for (const reading of batch) {
          const blockchainReading = this.convertToBlockchainFormat(reading);
          
          tx.moveCall({
            target: `${PACKAGE_ID}::${this.MODULE_NAME}::${this.FUNCTION_NAME}`,
            arguments: [
              tx.object(blockchainReading.deviceId),
              tx.pure.u64(Math.round(blockchainReading.temperature * 100)),
              tx.pure.u64(Math.round(blockchainReading.dissolvedOxygen * 100)),
              tx.pure.u64(Math.round(blockchainReading.ph * 100)),
              tx.pure.u64(Math.round(blockchainReading.turbidity * 100)),
              tx.object(CLOCK_ID),
            ],
          });
        }

        const result = await signAndExecuteTransaction({
          transaction: tx,
          options: { showEffects: true, showEvents: true },
        });

        if (result.effects?.status?.status === 'success') {
          // All readings in batch succeeded
          batch.forEach(() => {
            results.push({
              success: true,
              txHash: result.digest
            });
          });
        } else {
          // All readings in batch failed
          batch.forEach(() => {
            results.push({
              success: false,
              error: 'Batch transaction failed'
            });
          });
        }
      } catch (error) {
        // All readings in batch failed
        batch.forEach(() => {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }
    }

    return results;
  }

  /**
   * Convert ESP32 reading to blockchain format
   */
  private static convertToBlockchainFormat(reading: ESP32Reading): Reading {
    return {
      deviceId: reading.deviceId,
      timestampMs: reading.timestamp.toMillis(),
      dayUtc: Math.floor(reading.timestamp.toMillis() / 86_400_000),
      minuteIndex: Math.floor((reading.timestamp.toMillis() % 86_400_000) / 60_000),
      temperature: reading.temperature,
      dissolvedOxygen: reading.dissolvedOxygen,
      ph: reading.ph,
      turbidity: reading.turbidity,
      by: 'system' // Will be replaced with actual user address
    };
  }

  /**
   * Get blockchain statistics
   */
  static async getBlockchainStats(): Promise<{
    totalEvents: number;
    lastEventTime?: number;
    uniqueDevices: string[];
  }> {
    try {
      const result = await client.queryEvents({
        query: {
          MoveEventType: EVENT_TYPE,
        },
        order: 'descending',
        limit: 1000, // Get recent events for stats
      });

      const uniqueDevices = new Set<string>();
      let lastEventTime: number | undefined;

      result.data?.forEach(event => {
        const reading = eventToReading(event);
        if (reading) {
          uniqueDevices.add(reading.deviceId);
          if (!lastEventTime || reading.timestampMs > lastEventTime) {
            lastEventTime = reading.timestampMs;
          }
        }
      });

      return {
        totalEvents: result.data?.length || 0,
        lastEventTime,
        uniqueDevices: Array.from(uniqueDevices)
      };
    } catch (error) {
      console.error('Error fetching blockchain stats:', error);
      throw new Error('Failed to fetch blockchain stats');
    }
  }
}
