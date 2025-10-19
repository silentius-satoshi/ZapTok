import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validates if a video event has at least one potentially working source
 * Filters out events with undefined, empty, or clearly invalid video URLs
 * 
 * This prevents "Video not available no working source found" errors
 * by filtering invalid videos at the feed level before rendering.
 */
export function hasValidVideoSource(event: NostrEvent & { videoUrl?: string; hash?: string }): boolean {
  // Reject if no videoUrl and no hash
  if (!event.videoUrl && !event.hash) {
    if (import.meta.env.DEV) {
      console.log('[hasValidVideoSource] ❌ Rejected - no videoUrl or hash:', event.id?.slice(0, 8));
    }
    return false;
  }

  // Reject if videoUrl is explicitly undefined, empty, or the string "undefined"
  if (event.videoUrl && (
    event.videoUrl === 'undefined' || 
    event.videoUrl.trim() === '' ||
    event.videoUrl.includes('Instance of ') // Reject malformed string representations
  )) {
    if (import.meta.env.DEV) {
      console.log('[hasValidVideoSource] ❌ Rejected - invalid videoUrl string:', event.videoUrl?.slice(0, 50));
    }
    return false;
  }

  // If there's a videoUrl, validate it
  if (event.videoUrl) {
    try {
      const url = new URL(event.videoUrl);
      
      // Must have a protocol and host
      if (!url.protocol || !url.host) {
        if (import.meta.env.DEV) {
          console.log('[hasValidVideoSource] ❌ Rejected - missing protocol/host:', event.videoUrl?.slice(0, 50));
        }
        return false;
      }
      
      // Additional check: reject localhost URLs in production
      if (import.meta.env.PROD && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        if (import.meta.env.DEV) {
          console.log('[hasValidVideoSource] ❌ Rejected - localhost in production');
        }
        return false;
      }
      
      return true;
    } catch {
      if (import.meta.env.DEV) {
        console.log('[hasValidVideoSource] ❌ Rejected - invalid URL:', event.videoUrl?.slice(0, 50));
      }
      return false;
    }
  }

  // If we only have a hash (no videoUrl), accept it
  // The VideoCard/useVideoUrlFallback will construct Blossom URLs to try
  if (event.hash) {
    if (import.meta.env.DEV) {
      console.log('[hasValidVideoSource] ✅ Accepted - has hash:', event.hash.slice(0, 16));
    }
    return true;
  }

  // Fallback: reject
  return false;
}

/**
 * Filters an array of video events to only include those with valid sources
 * Use this in feed components to prevent rendering broken videos
 */
export function filterValidVideos<T extends NostrEvent & { videoUrl?: string; hash?: string }>(
  events: T[]
): T[] {
  return events.filter(hasValidVideoSource);
}
