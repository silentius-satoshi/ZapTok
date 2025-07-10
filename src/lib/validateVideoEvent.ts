import type { NostrEvent } from '@nostrify/nostrify';

export interface VideoEvent extends NostrEvent {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  hash?: string;
  duration?: number;
}

/**
 * Enhanced video event validation based on Nostr video standards
 * Follows the pattern from the reference implementation
 */
export function validateVideoEvent(event: NostrEvent): VideoEvent | null {
  const tags = event.tags || [];
  
  // Check if this is a potential video event
  // Must have either:
  // 1. An 'x' tag (hash tag for video files)
  // 2. A 'url' tag pointing to video content
  // 3. Content that looks like a video URL
  const hasHashTag = tags.some(tag => tag[0] === 'x');
  const hasUrlTag = tags.some(tag => tag[0] === 'url');
  const hasVideoInContent = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(event.content) ||
                           event.content.includes('youtube.com') ||
                           event.content.includes('youtu.be') ||
                           event.content.includes('vimeo.com');
  const hasVideoTag = tags.some(([tagName, tagValue]) => 
    tagName === 't' && tagValue?.toLowerCase().includes('video')
  );

  // Must meet at least one video criteria
  if (!hasHashTag && !hasUrlTag && !hasVideoInContent && !hasVideoTag) {
    return null;
  }

  // Extract video metadata from tags
  const videoData: VideoEvent = {
    ...event,
    description: event.content
  };

  // Parse tags for video metadata
  for (const tag of tags) {
    switch (tag[0]) {
      case 'title': {
        videoData.title = tag[1];
        break;
      }
      case 'x': {
        videoData.hash = tag[1];
        break;
      }
      case 'url': {
        videoData.videoUrl = tag[1];
        break;
      }
      case 'thumb': {
        videoData.thumbnail = tag[1];
        break;
      }
      case 'duration': {
        const duration = parseInt(tag[1]);
        if (!isNaN(duration) && duration > 0) {
          videoData.duration = duration;
        }
        break;
      }
    }
  }

  // If no URL in tags, try to extract from content
  if (!videoData.videoUrl) {
    // Extract video URL from content
    const urlMatch = event.content.match(/(https?:\/\/[^\s]+\.(mp4|webm|mov|avi|mkv))/i);
    if (urlMatch) {
      videoData.videoUrl = urlMatch[0];
    } else if (event.content.includes('youtube.com') || event.content.includes('youtu.be')) {
      // For YouTube videos, use the content as-is for now
      videoData.videoUrl = event.content.trim();
    } else if (videoData.hash) {
      // If we have a hash but no URL, construct Blossom URL
      videoData.videoUrl = `https://blossom.primal.net/${videoData.hash}`;
    }
  }

  // Set title if not provided
  if (!videoData.title) {
    // Use first line of content, or generate a title
    const firstLine = event.content.split('\n')[0];
    videoData.title = firstLine && firstLine.length < 100 ? firstLine : 'Video Post';
  }

  // Clean up description (remove title if it's duplicated)
  if (videoData.title && videoData.description?.startsWith(videoData.title)) {
    videoData.description = videoData.description.substring(videoData.title.length).trim();
  }

  // Must have either a URL or hash to be considered valid
  if (!videoData.videoUrl && !videoData.hash) {
    return null;
  }

  return videoData;
}

/**
 * Helper function to check if an event contains video content
 * Lightweight check for filtering before full validation
 */
export function hasVideoContent(event: NostrEvent): boolean {
  const tags = event.tags || [];
  
  // Quick checks for video indicators
  const hasHashTag = tags.some(tag => tag[0] === 'x');
  const hasUrlTag = tags.some(tag => tag[0] === 'url');
  const hasVideoTag = tags.some(([tagName, tagValue]) => 
    tagName === 't' && tagValue?.toLowerCase().includes('video')
  );
  const hasVideoInContent = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(event.content) ||
                           event.content.includes('youtube.com') ||
                           event.content.includes('youtu.be') ||
                           event.content.includes('vimeo.com');

  return hasHashTag || hasUrlTag || hasVideoTag || hasVideoInContent;
}

/**
 * Normalize video URL for comparison (removes query params and fragments)
 * This helps deduplicate videos that have the same base URL but different parameters
 */
export function normalizeVideoUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query parameters and fragment for comparison
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, return the original URL
    return url;
  }
}
