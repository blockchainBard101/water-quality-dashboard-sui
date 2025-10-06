export type Reading = {
  deviceId: string;
  timestampMs: number;   // from event.timestamp_ms
  dayUtc: number;        // floor(timestampMs / 86_400_000)
  minuteIndex: number;   // 0..1439
  temperature: number;   // scaled back from *_x100 to decimal (e.g., 27.53)
  dissolvedOxygen: number; // decimal
  ph: number;              // decimal
  turbidity: number;       // decimal
  by: string;              // address
};

export function eventToReading(ev: any): Reading | null {
  const pj = ev.parsedJson;
  if (!pj) return null;
  
  return {
    deviceId: pj.device_id,
    timestampMs: Number(pj.timestamp_ms),
    dayUtc: Number(pj.day_utc),
    minuteIndex: Number(pj.minute_index),
    temperature: Number(pj.temperature_x100) / 100,
    dissolvedOxygen: Number(pj.dissolved_oxygen_x100) / 100,
    ph: Number(pj.ph_x100) / 100,
    turbidity: Number(pj.turbidity_x100) / 100,
    by: pj.by,
  };
}
