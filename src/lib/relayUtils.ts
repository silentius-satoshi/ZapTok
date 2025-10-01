/**
 * Normalize relay URL by adding wss:// if no protocol is present
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // If it already has a protocol, return as is
  if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
    return trimmed;
  }

  // Otherwise, add wss:// prefix
  return `wss://${trimmed}`;
}

/**
 * Check if a URL is a valid WebSocket URL
 */
export function isWebsocketUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'wss:' || urlObj.protocol === 'ws:';
  } catch {
    return false;
  }
}