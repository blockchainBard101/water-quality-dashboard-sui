import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  updateDoc,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Reading } from './transform';

export interface ESP32Reading {
  deviceId: string;
  timestamp: Timestamp;
  temperature: number;
  dissolvedOxygen: number;
  ph: number;
  turbidity: number;
  rawData?: any; // Store original ESP32 payload
  syncedToBlockchain?: boolean;
  blockchainTxHash?: string;
  createdAt: Timestamp;
}

export interface ESP32ReadingQuery {
  deviceId: string;
  fromMs: number;
  toMs: number;
  limit?: number;
  startAfterDoc?: QueryDocumentSnapshot;
}

export class FirebaseService {
  private static readonly COLLECTIONS = {
    ESP32_READINGS: 'esp32_readings',
    DEVICES: 'devices',
    SYNC_QUEUE: 'sync_queue'
  };

  /**
   * Save ESP32 reading data to Firebase
   */
  static async saveESP32Reading(reading: Omit<ESP32Reading, 'createdAt' | 'syncedToBlockchain'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTIONS.ESP32_READINGS), {
      ...reading,
      createdAt: Timestamp.now(),
      syncedToBlockchain: false
    });
    
    console.log('ESP32 reading saved with ID:', docRef.id);
    return docRef.id;
    } catch (error) {
      console.error('Error saving ESP32 reading:', error);
      throw new Error('Failed to save ESP32 reading');
    }
  }

  /**
   * Get ESP32 readings from Firebase
   */
  static async getESP32Readings(queryParams: ESP32ReadingQuery): Promise<{
    readings: ESP32Reading[];
    lastDoc?: QueryDocumentSnapshot;
    hasMore: boolean;
  }> {
    try {
      const { deviceId, fromMs, toMs, limit: queryLimit = 1000, startAfterDoc } = queryParams;
      
      const fromTimestamp = Timestamp.fromMillis(fromMs);
      const toTimestamp = Timestamp.fromMillis(toMs);
      
      let q = query(
        collection(db, this.COLLECTIONS.ESP32_READINGS),
        where('deviceId', '==', deviceId),
        where('timestamp', '>=', fromTimestamp),
        where('timestamp', '<=', toTimestamp),
        orderBy('timestamp', 'desc'),
        limit(queryLimit)
      );

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(q);
      const readings: ESP32Reading[] = [];
      
      snapshot.forEach((doc) => {
        readings.push({ id: doc.id, ...doc.data() } as ESP32Reading);
      });

      return {
        readings,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === queryLimit
      };
    } catch (error) {
      console.error('Error fetching ESP32 readings:', error);
      throw new Error('Failed to fetch ESP32 readings');
    }
  }

  /**
   * Get latest ESP32 reading for a device
   */
  static async getLatestESP32Reading(deviceId: string): Promise<ESP32Reading | null> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.ESP32_READINGS),
        where('deviceId', '==', deviceId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ESP32Reading;
    } catch (error) {
      console.error('Error fetching latest ESP32 reading:', error);
      throw new Error('Failed to fetch latest ESP32 reading');
    }
  }

  /**
   * Mark reading as synced to blockchain
   */
  static async markAsSyncedToBlockchain(
    readingId: string, 
    txHash: string
  ): Promise<void> {
    try {
      const readingRef = doc(db, this.COLLECTIONS.ESP32_READINGS, readingId);
      await updateDoc(readingRef, {
        syncedToBlockchain: true,
        blockchainTxHash: txHash
      });
    } catch (error) {
      console.error('Error marking reading as synced:', error);
      throw new Error('Failed to mark reading as synced');
    }
  }

  /**
   * Get readings that need to be synced to blockchain
   */
  static async getUnsyncedReadings(limit: number = 100): Promise<ESP32Reading[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.ESP32_READINGS),
        where('syncedToBlockchain', '==', false),
        orderBy('createdAt', 'asc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      const readings: ESP32Reading[] = [];
      
      snapshot.forEach((doc) => {
        readings.push({ id: doc.id, ...doc.data() } as ESP32Reading);
      });

      return readings;
    } catch (error) {
      console.error('Error fetching unsynced readings:', error);
      throw new Error('Failed to fetch unsynced readings');
    }
  }

  /**
   * Convert ESP32 reading to blockchain format
   */
  static convertToBlockchainFormat(reading: ESP32Reading): Reading {
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
   * Register a new device
   */
  static async registerDevice(deviceId: string, deviceInfo: {
    name: string;
    location?: string;
    description?: string;
    owner: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, this.COLLECTIONS.DEVICES), {
        deviceId,
        ...deviceInfo,
        createdAt: Timestamp.now(),
        isActive: true
      });
    } catch (error) {
      console.error('Error registering device:', error);
      throw new Error('Failed to register device');
    }
  }

  /**
   * Get device information
   */
  static async getDevice(deviceId: string): Promise<any> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.DEVICES),
        where('deviceId', '==', deviceId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error fetching device:', error);
      throw new Error('Failed to fetch device');
    }
  }
}
