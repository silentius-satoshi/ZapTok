/**
 * Video Event Strategy for NIP-71 Compliance (Updated October 2025)
 * 
 * This strategy creates NIP-71 compliant video events (kind 21/22) with rich metadata
 * that can be understood by video-aware Nostr clients.
 * 
 * NIP-71 Updates Implemented:
 * - imeta tags are the PRIMARY source of video information
 * - Required: title tag and published_at tag
 * - imeta now uses "image" instead of "thumb"
 * - imeta includes duration and bitrate (recommended)
 * - imeta includes "service nip96" for NIP-96 server lookup
 * - Removed duplicate metadata tags (all metadata in imeta)
 */

import type { NostrEvent } from '@nostrify/nostrify';

export interface VideoEventData {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  hash?: string;
  duration?: number;
  size?: number;
  type?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  publishedAt?: number; // Unix timestamp of first publication
}

export interface VideoEventOptions {
  // Whether to include NIP-71 specific tags for clients that support them
  includeNip71Tags?: boolean;
  // Whether to include rich metadata in content for better readability
  includeRichContent?: boolean;
  // Custom hashtags to add
  hashtags?: string[];
  // Whether to include imeta tags for better media handling
  includeImeta?: boolean;
}

/**
 * Create a NIP-71 compliant video event
 * 
 * Strategy (Updated for NIP-71 latest spec):
 * 1. Use kind 21 (normal videos) or kind 22 (short videos) based on dimensions/duration
 * 2. Store ALL video metadata in imeta tags (primary source per NIP-71)
 * 3. Add required published_at tag
 * 4. Use title tag (required)
 * 5. Content field contains summary/description
 * 6. Add optional tags for discoverability (t, alt, etc.)
 */
export function createVideoEvent(
  data: VideoEventData, 
  options: VideoEventOptions = {}
): Partial<NostrEvent> {
  const {
    includeNip71Tags = true,
    includeRichContent = true,
    hashtags = ['video', 'zaptok'],
    includeImeta = true
  } = options;

  // Create human-readable content that works in any client
  let content = '';
  
  if (includeRichContent) {
    // Clean content format - just title and description, no auto-generated text
    if (data.title) {
      content += `${data.title}\n\n`;
    }
    
    if (data.description) {
      content += `${data.description}`;
    }
  } else {
    // Simple content format
    content = data.description || data.title || '';
  }

  // Build tags array
  const tags: string[][] = [];

  // Add required title tag (NIP-71 requirement)
  if (data.title) {
    tags.push(['title', data.title]);
  }

  // Add summary tag (NIP-71 requirement for description)
  if (data.description) {
    tags.push(['summary', data.description]);
  }

  // Add required published_at tag (NIP-71 requirement)
  // Use provided timestamp or current time for first publication
  const publishedAt = data.publishedAt || Math.floor(Date.now() / 1000);
  tags.push(['published_at', publishedAt.toString()]);

  // Add imeta tag - PRIMARY source of video information per NIP-71
  // All metadata should be in imeta, not separate tags
  if (includeImeta && data.videoUrl) {
    const imetaTag = ['imeta', `url ${data.videoUrl}`];
    
    // Add mime type (m)
    if (data.type) {
      imetaTag.push(`m ${data.type}`);
    }
    
    // Add file hash (x)
    if (data.hash) {
      imetaTag.push(`x ${data.hash}`);
    }
    
    // Add file size (before dim for consistent ordering)
    if (data.size) {
      imetaTag.push(`size ${data.size}`);
    }
    
    // Add dimensions (dim)
    if (data.width && data.height) {
      imetaTag.push(`dim ${data.width}x${data.height}`);
    }
    
    // Add preview image (image, not thumb - NIP-71 update)
    if (data.thumbnailUrl) {
      imetaTag.push(`image ${data.thumbnailUrl}`);
    }
    
    // Add duration (recommended in NIP-71)
    if (data.duration !== undefined) {
      imetaTag.push(`duration ${data.duration}`);
    }
    
    // Add bitrate (recommended in NIP-71)
    if (data.bitrate !== undefined) {
      imetaTag.push(`bitrate ${data.bitrate}`);
    }
    
    // Add service tag if using NIP-96 compatible servers
    // This allows clients to search the author's NIP-96 server list
    imetaTag.push('service nip96');
    
    tags.push(imetaTag);
  }

  // Add NIP-71 style separate tags for compatibility with older clients
  if (includeNip71Tags) {
    // Add url tag
    if (data.videoUrl) {
      tags.push(['url', data.videoUrl]);
    }
    
    // Add hash tag (x)
    if (data.hash) {
      tags.push(['x', data.hash]);
    }
    
    // Add dimensions tag (dim)
    if (data.width && data.height) {
      tags.push(['dim', `${data.width}x${data.height}`]);
    }
    
    // Add duration tag
    if (data.duration !== undefined) {
      tags.push(['duration', data.duration.toString()]);
    }
    
    // Add thumbnail tag (thumb or image)
    if (data.thumbnailUrl) {
      tags.push(['thumb', data.thumbnailUrl]);
    }
    
    // Add mime type tag (m)
    if (data.type) {
      tags.push(['m', data.type]);
    }
    
    // Add size tag
    if (data.size) {
      tags.push(['size', data.size.toString()]);
    }
  }

  // Add hashtags for discoverability (t tags)
  hashtags.forEach(tag => {
    tags.push(['t', tag]);
  });

  // Add accessibility description (alt tag)
  if (data.description) {
    tags.push(['alt', data.description]);
  }

  // Determine kind based on video characteristics (NIP-71)
  // Kind 21: Normal videos (horizontal/landscape, longer-form)
  // Kind 22: Short videos (vertical/portrait, short-form like reels/stories)
  let kind = 22; // Default to short video
  
  // Use kind 21 (normal video) if:
  // 1. Video is landscape/horizontal (width > height)
  // 2. Video is longer than 5 minutes (300 seconds)
  if (data.width && data.height && data.width > data.height) {
    kind = 21; // Landscape video = normal video
  } else if (data.duration && data.duration > 300) {
    kind = 21; // Long video = normal video
  }

  return {
    kind,
    content,
    tags,
  };
}

/**
 * Create a fallback NIP-71 event for clients that support it
 * This can be published alongside the video event for maximum coverage
 */
export function createNip71VideoEvent(
  data: VideoEventData, 
  uniqueId: string
): Partial<NostrEvent> {
  const tags: string[][] = [];

  // Required tags
  tags.push(['d', uniqueId]);
  tags.push(['url', data.videoUrl]);

  // Optional metadata tags
  if (data.type) {
    tags.push(['m', data.type]);
  }
  
  if (data.title) {
    tags.push(['title', data.title]);
  }
  
  if (data.duration) {
    tags.push(['duration', data.duration.toString()]);
  }
  
  if (data.size) {
    tags.push(['size', data.size.toString()]);
  }
  
  if (data.hash) {
    tags.push(['x', data.hash]);
  }
  
  if (data.width && data.height) {
    tags.push(['dim', `${data.width}x${data.height}`]);
  }
  
  if (data.thumbnailUrl) {
    tags.push(['thumb', data.thumbnailUrl]);
    tags.push(['image', data.thumbnailUrl]);
  }

  // Add hashtags
  tags.push(['t', 'video']);
  tags.push(['t', 'zaptok']);

  // Determine kind based on duration (NIP-71)
  const videoKind = data.duration && data.duration <= 60 ? 22 : 21;

  return {
    kind: videoKind,
    content: data.description || data.title || '',
    tags,
  };
}

/**
 * Dual Publishing Strategy: Create both video and NIP-71 events
 * This ensures maximum compatibility and feature support
 */
export interface DualPublishResult {
  videoEvent: Partial<NostrEvent>;
  nip71Event: Partial<NostrEvent>;
}

export function createDualVideoEvents(
  data: VideoEventData,
  options: VideoEventOptions = {}
): DualPublishResult {
  // Generate unique ID for NIP-71 event
  const uniqueId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const videoEvent = createVideoEvent(data, options);
  const nip71Event = createNip71VideoEvent(data, uniqueId);

  return {
    videoEvent,
    nip71Event
  };
}

/**
 * Compatibility check: determine which strategy to use based on relay capabilities
 */
export interface RelayCapabilities {
  supportsNip71?: boolean;
  supportsParameterizedReplaceable?: boolean;
  maxEventSize?: number;
}

export function selectPublishingStrategy(
  relayCapabilities: RelayCapabilities[]
): 'hybrid-only' | 'dual-publish' | 'nip71-only' {
  const hasNip71Support = relayCapabilities.some(cap => cap.supportsNip71);
  const hasBasicSupport = relayCapabilities.some(cap => !cap.supportsNip71);
  
  if (hasNip71Support && hasBasicSupport) {
    return 'dual-publish'; // Mixed ecosystem
  } else if (hasNip71Support) {
    return 'nip71-only'; // Advanced relays only
  } else {
    return 'hybrid-only'; // Basic relays only
  }
}
