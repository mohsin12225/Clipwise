/**
 * Formats seconds into MM:SS display.
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';

  const totalSeconds = Math.floor(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds into HH:MM:SS display (for longer durations).
 */
export function formatTimecode(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00:00';

  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats a start–end time range into a readable string.
 */
export function formatTimeRange(startTime: number, endTime: number): string {
  return `${formatTimecode(startTime)} – ${formatTimecode(endTime)}`;
}

/**
 * Formats seconds into a human-friendly "Xm Ys" display.
 */
export function formatDurationHuman(seconds: number): string {
  if (!seconds || seconds < 0) return '0s';

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}