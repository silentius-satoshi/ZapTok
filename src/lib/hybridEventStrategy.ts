/**
 * Hybrid Event Strategy for Cross-Client Compatibility
 * 
 * This strategy creates kind 1 events with rich metadata that can be understood
 * by both NIP-71 aware and non-aware clients, maximizing compatibility across
 * the Nostr ecosystem.
 */

import type { NostrEvent } from '@nostrify/nostrify';

export interface HybridVideoEventData {
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
}

export interface HybridEventOptions {
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
 * Create a hybrid video event that works across clients
 * 
 * Strategy:
 * 1. Use kind 1 (text note) for maximum compatibility
 * 2. Include video URL in content for simple clients
 * 3. Add NIP-71 style tags for advanced clients
 * 4. Use imeta tags for media metadata
 * 5. Include rich metadata for discoverability
 */
export function createHybridVideoEvent(
  data: HybridVideoEventData, 
  options: HybridEventOptions = {}
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
    // Rich content format for better readability
    if (data.title) {
      content += `🎬 ${data.title}\n\n`;
    }
    
    if (data.description) {
      content += `${data.description}\n\n`;
    }
    
    content += `📹 Watch: ${data.videoUrl}`;
    
    // Add duration info if available
    if (data.duration) {
      const minutes = Math.floor(data.duration / 60);
      const seconds = data.duration % 60;
      content += `\n⏱️ Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  } else {
    // Simple content format
    content = data.description || data.title || '';
    if (content) content += '\n\n';
    content += data.videoUrl;
  }

  // Build tags array
  const tags: string[][] = [];

  // Add video URL tag for easy parsing
  tags.push(['url', data.videoUrl]);

  // Add imeta tag for rich media metadata (NIP-92 style)
  if (includeImeta && data.videoUrl) {
    const imetaTag = ['imeta', `url ${data.videoUrl}`];
    
    if (data.type) {
      imetaTag.push(`m ${data.type}`);
    }
    
    if (data.hash) {
      imetaTag.push(`x ${data.hash}`);
    }
    
    if (data.size) {
      imetaTag.push(`size ${data.size}`);
    }
    
    if (data.width && data.height) {
      imetaTag.push(`dim ${data.width}x${data.height}`);
    }
    
    if (data.thumbnailUrl) {
      imetaTag.push(`thumb ${data.thumbnailUrl}`);
    }
    
    tags.push(imetaTag);
  }

  // Add NIP-71 style tags for advanced clients
  if (includeNip71Tags) {
    if (data.title) {
      tags.push(['title', data.title]);
    }
    
    if (data.description) {
      tags.push(['summary', data.description]);
    }
    
    if (data.duration) {
      tags.push(['duration', data.duration.toString()]);
    }
    
    if (data.size) {
      tags.push(['size', data.size.toString()]);
    }
    
    if (data.type) {
      tags.push(['m', data.type]);
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
  }

  // Add hashtags for discoverability
  hashtags.forEach(tag => {
    tags.push(['t', tag]);
  });

  // Add accessibility description
  if (data.description) {
    tags.push(['alt', data.description]);
  }

  return {
    kind: 1, // Text note for maximum compatibility
    content,
    tags,
  };
}

/**
 * Create a fallback NIP-71 event for clients that support it
 * This can be published alongside the hybrid event for maximum coverage
 */
export function createNip71VideoEvent(
  data: HybridVideoEventData, 
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
 * Dual Publishing Strategy: Create both hybrid and NIP-71 events
 * This ensures maximum compatibility and feature support
 */
export interface DualPublishResult {
  hybridEvent: Partial<NostrEvent>;
  nip71Event: Partial<NostrEvent>;
}

export function createDualVideoEvents(
  data: HybridVideoEventData,
  options: HybridEventOptions = {}
): DualPublishResult {
  // Generate unique ID for NIP-71 event
  const uniqueId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const hybridEvent = createHybridVideoEvent(data, options);
  const nip71Event = createNip71VideoEvent(data, uniqueId);

  return {
    hybridEvent,
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
