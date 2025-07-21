import type { NostrEvent } from '@nostrify/nostrify';

export interface VideoEvent extends NostrEvent {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  hash?: string;
  duration?: number;
  published_at?: number; // NIP-71 published timestamp
  alt?: string; // NIP-71 accessibility description
}

/**
 * Enhanced video event validation based on Nostr video standards
 * Supports both legacy formats and NIP-71 video events
 */
export function validateVideoEvent(event: NostrEvent): VideoEvent | null {
  const tags = event.tags || [];
  
  // NIP-71 video events (kind 21 = normal videos, kind 22 = short videos)
  if (event.kind === 21 || event.kind === 22) {
    return validateNip71VideoEvent(event, tags);
  }
  
  // Legacy video event validation for kind 1 and 1063
  return validateLegacyVideoEvent(event, tags);
}

/**
 * Validate NIP-71 video events (kind 21 and 22)
 */
function validateNip71VideoEvent(event: NostrEvent, tags: string[][]): VideoEvent | null {
  const videoData: VideoEvent = {
    ...event,
    description: event.content
  };

  console.log('🔍 Validating NIP-71 video event:', {
    id: event.id,
    kind: event.kind,
    content: event.content.substring(0, 100),
    tags: tags.map(tag => `${tag[0]}: ${tag[1] || ''}`),
  });

  // Parse imeta tags first (primary video source in NIP-71)
  const imetaTags = tags.filter(tag => tag[0] === 'imeta');
  console.log('📋 Found imeta tags:', imetaTags.length, imetaTags);
  
  for (const imetaTag of imetaTags) {
    // Parse imeta tag properties
    const imetaProps: Record<string, string> = {};
    
    for (let i = 1; i < imetaTag.length; i++) {
      const prop = imetaTag[i];
      const spaceIndex = prop.indexOf(' ');
      if (spaceIndex > 0) {
        const key = prop.substring(0, spaceIndex);
        const value = prop.substring(spaceIndex + 1);
        imetaProps[key] = value;
      }
    }

    console.log('🏷️ Parsed imeta props:', imetaProps);

    // Extract video URL (prefer primary url over fallback)
    if (imetaProps.url && !videoData.videoUrl) {
      videoData.videoUrl = imetaProps.url;
      console.log('📹 Found video URL in imeta:', imetaProps.url);
    }
    
    // Extract thumbnail from image property
    if (imetaProps.image && !videoData.thumbnail) {
      videoData.thumbnail = imetaProps.image;
    }
    
    // Extract hash from x property
    if (imetaProps.x && !videoData.hash) {
      videoData.hash = imetaProps.x;
      console.log('🔗 Found video hash in imeta:', imetaProps.x);
    }
  }

  // Parse other NIP-71 tags
  for (const tag of tags) {
    switch (tag[0]) {
      case 'title': {
        videoData.title = tag[1];
        break;
      }
      case 'duration': {
        const duration = parseInt(tag[1]);
        if (!isNaN(duration) && duration > 0) {
          videoData.duration = duration;
        }
        break;
      }
      case 'published_at': {
        // NIP-71 uses published_at for original publication time
        const publishedAt = parseInt(tag[1]);
        if (!isNaN(publishedAt) && publishedAt > 0) {
          videoData.published_at = publishedAt;
        }
        break;
      }
      case 'alt': {
        // Accessibility description
        videoData.alt = tag[1];
        break;
      }
    }
  }

  // Set title if not provided
  if (!videoData.title) {
    const firstLine = event.content.split('\n')[0];
    videoData.title = firstLine && firstLine.length < 100 ? firstLine : 'Video Post';
  }

  // NIP-71 events should have either a video URL from imeta or a hash
  if (!videoData.videoUrl && !videoData.hash) {
    console.log('❌ No video URL or hash found in NIP-71 event');
    return null;
  }

  // If we have a hash but no URL, construct Blossom URL
  if (!videoData.videoUrl && videoData.hash) {
    videoData.videoUrl = `https://blossom.primal.net/${videoData.hash}`;
    console.log('🌸 Constructed Blossom URL from hash:', videoData.videoUrl);
  }

  console.log('✅ NIP-71 validation complete:', {
    hasVideoUrl: !!videoData.videoUrl,
    hasHash: !!videoData.hash,
    title: videoData.title
  });

  return videoData;
}

/**
 * Validate legacy video events (kind 1 and 1063)
 */
function validateLegacyVideoEvent(event: NostrEvent, tags: string[][]): VideoEvent | null {
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
  // NIP-71 video events are automatically considered video content
  if (event.kind === 21 || event.kind === 22) {
    return true;
  }

  // Legacy video content detection for other kinds
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
