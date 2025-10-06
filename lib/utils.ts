import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}

export function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC';
}

export function getDayUtc(timestampMs: number): number {
  return Math.floor(timestampMs / 86_400_000);
}

export function getMinuteIndex(timestampMs: number): number {
  const dayMs = timestampMs % 86_400_000;
  return Math.floor(dayMs / 60_000);
}
