'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Reading } from '@/lib/transform';
import { formatTimestamp } from '@/lib/utils';

interface ReadingChartProps {
  readings: Reading[];
  isLoading: boolean;
}

type Metric = 'temperature' | 'dissolvedOxygen' | 'ph' | 'turbidity';

const metricConfig = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    color: '#ef4444',
    key: 'temperature' as keyof Reading,
  },
  dissolvedOxygen: {
    label: 'Dissolved Oxygen',
    unit: 'mg/L',
    color: '#3b82f6',
    key: 'dissolvedOxygen' as keyof Reading,
  },
  ph: {
    label: 'pH',
    unit: '',
    color: '#10b981',
    key: 'ph' as keyof Reading,
  },
  turbidity: {
    label: 'Turbidity',
    unit: 'NTU',
    color: '#f59e0b',
    key: 'turbidity' as keyof Reading,
  },
};

export function ReadingChart({ readings, isLoading }: ReadingChartProps) {
  const [activeMetric, setActiveMetric] = useState<Metric>('temperature');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Quality Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Quality Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            No data available for the selected time range
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort readings by timestamp for proper chart display
  const sortedReadings = [...readings].sort((a, b) => a.timestampMs - b.timestampMs);

  const chartData = sortedReadings.map(reading => ({
    timestamp: reading.timestampMs,
    time: formatTimestamp(reading.timestampMs),
    temperature: reading.temperature,
    dissolvedOxygen: reading.dissolvedOxygen,
    ph: reading.ph,
    turbidity: reading.turbidity,
  }));

  const activeConfig = metricConfig[activeMetric];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Quality Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMetric} onValueChange={(value: string) => setActiveMetric(value as Metric)}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(metricConfig).map(([key, config]) => (
              <TabsTrigger key={key} value={key}>
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(metricConfig).map(([key, config]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: `${config.label} (${config.unit})`, angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [value.toFixed(2), config.label]}
                    />
                    <Line
                      type="monotone"
                      dataKey={config.key}
                      stroke={config.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
