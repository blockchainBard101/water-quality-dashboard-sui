'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileJson } from 'lucide-react';
import { Reading } from '@/lib/transform';
import Papa from 'papaparse';

interface ExportMenuProps {
  readings: Reading[];
  disabled?: boolean;
}

export function ExportMenu({ readings, disabled }: ExportMenuProps) {
  const exportToCSV = () => {
    if (readings.length === 0) return;

    const csvData = readings.map(reading => ({
      timestamp_iso: new Date(reading.timestampMs).toISOString(),
      temperature_c: reading.temperature.toFixed(2),
      dissolved_oxygen_mg_per_l: reading.dissolvedOxygen.toFixed(2),
      ph: reading.ph.toFixed(2),
      turbidity_ntu: reading.turbidity.toFixed(2),
      device_id: reading.deviceId,
      day_utc: reading.dayUtc,
      minute_index: reading.minuteIndex,
      by: reading.by,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `water-quality-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (readings.length === 0) return;

    const jsonData = {
      exported_at: new Date().toISOString(),
      total_readings: readings.length,
      readings: readings.map(reading => ({
        deviceId: reading.deviceId,
        timestampMs: reading.timestampMs,
        timestampIso: new Date(reading.timestampMs).toISOString(),
        dayUtc: reading.dayUtc,
        minuteIndex: reading.minuteIndex,
        temperature: reading.temperature,
        dissolvedOxygen: reading.dissolvedOxygen,
        ph: reading.ph,
        turbidity: reading.turbidity,
        by: reading.by,
      })),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `water-quality-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || readings.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export ({readings.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} disabled={readings.length === 0}>
          <FileText className="h-4 w-4 mr-2" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} disabled={readings.length === 0}>
          <FileJson className="h-4 w-4 mr-2" />
          Download JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
