/**
 * Formats milliseconds into a swim time string: MM:SS.ms
 */
export const formatSwimTime = (ms: number): string => {
  if (!ms || ms <= 0) return "0.00";
  
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`;
  }
  return remainingSeconds.toFixed(2);
};

/**
 * Parses a swim time string (e.g., "1:23.45" or "50.00") into milliseconds
 */
export const parseSwimTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  
  // Handlers for "MM:SS.ms" and "SS.ms"
  const parts = timeStr.trim().split(':');
  
  if (parts.length === 2) {
    // MM:SS.ms
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds)) return 0;
    return Math.round((minutes * 60 + seconds) * 1000);
  } else if (parts.length === 1) {
    // SS.ms
    const seconds = parseFloat(parts[0]);
    if (isNaN(seconds)) return 0;
    return Math.round(seconds * 1000);
  }
  
  return 0;
};
