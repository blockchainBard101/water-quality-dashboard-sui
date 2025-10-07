import { useState, useCallback } from 'react';
import { Reading } from './transform';

interface UseWaterQualityDataReturn {
  readings: Reading[];
  isLoading: boolean;
  error: string | null;
  dataSource: 'unified' | 'firebase' | 'blockchain';
  firebaseCount: number;
  blockchainCount: number;
  fetchData: (deviceId: string, fromMs: number, toMs: number, source?: 'unified' | 'firebase' | 'blockchain') => Promise<void>;
  clearData: () => void;
}

export function useWaterQualityData(): UseWaterQualityDataReturn {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'unified' | 'firebase' | 'blockchain'>('unified');
  const [firebaseCount, setFirebaseCount] = useState(0);
  const [blockchainCount, setBlockchainCount] = useState(0);

  const fetchData = useCallback(async (
    deviceId: string, 
    fromMs: number, 
    toMs: number, 
    source: 'unified' | 'firebase' | 'blockchain' = 'unified'
  ) => {
    setIsLoading(true);
    setError(null);
    setDataSource(source);

    try {
      let endpoint = '';
      let params = new URLSearchParams({
        deviceId,
        fromMs: fromMs.toString(),
        toMs: toMs.toString(),
        limit: '1000'
      });

      switch (source) {
        case 'unified':
          endpoint = '/api/unified';
          break;
        case 'firebase':
          endpoint = '/api/esp32';
          break;
        case 'blockchain':
          endpoint = '/api/readings';
          break;
      }

      const response = await fetch(`${endpoint}?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      if (source === 'unified') {
        setReadings(result.data || []);
        setFirebaseCount(result.firebaseCount || 0);
        setBlockchainCount(result.blockchainCount || 0);
      } else {
        setReadings(result.data || []);
        setFirebaseCount(0);
        setBlockchainCount(0);
      }

    } catch (err) {
      console.error('Error fetching water quality data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setReadings([]);
      setFirebaseCount(0);
      setBlockchainCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setReadings([]);
    setError(null);
    setFirebaseCount(0);
    setBlockchainCount(0);
  }, []);

  return {
    readings,
    isLoading,
    error,
    dataSource,
    firebaseCount,
    blockchainCount,
    fetchData,
    clearData
  };
}
