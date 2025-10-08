/**
 * YouTube embed utilities for ZapTok
 * Handles YouTube URL detection and conversion to embed format
 */

export interface YouTubeInfo {
  isYouTube: boolean;
  videoId?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Detects if a URL or text contains a YouTube link and extracts video ID
 */
export function parseYouTubeUrl(urlOrText: string): YouTubeInfo {
  if (!urlOrText) {
    return { isYouTube: false };
  }

  // YouTube URL patterns
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // youtu.be/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/v/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = urlOrText.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      return {
        isYouTube: true,
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }

  return { isYouTube: false };
}

/**
 * Extracts YouTube video ID from various URL formats
 */
export function getYouTubeVideoId(url: string): string | null {
  const info = parseYouTubeUrl(url);
  return info.videoId || null;
}

/**
 * Converts a YouTube URL to embed format
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const info = parseYouTubeUrl(url);
  return info.embedUrl || null;
}

/**
 * Gets the highest quality thumbnail for a YouTube video
 */
export function getYouTubeThumbnail(url: string): string | null {
  const info = parseYouTubeUrl(url);
  return info.thumbnailUrl || null;
}

/**
 * Checks if a string contains a YouTube URL
 */
export function isYouTubeUrl(urlOrText: string): boolean {
  return parseYouTubeUrl(urlOrText).isYouTube;
}
