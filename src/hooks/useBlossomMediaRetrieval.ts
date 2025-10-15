/*
 * 🚧 BUD-03 Media Retrieval Hook - DORMANT FOR HYBRID APPROACH
 *
 * This hook implements BUD-03 compliant media retrieval with automatic fallback.
 * Currently disabled to keep upload flow simple and reliable.
 *
 * To re-enable:
 * 1. Import in components that display media
 * 2. Use for automatic media URL fallbacks
 * 3. Test with your media URLs
 *
 * Benefits when enabled:
 * - Automatic fallback when media URLs fail
 * - SHA256 hash verification for file integrity
 * - Better media reliability across servers
 */

import { useQuery } from '@tanstack/react-query';
import { useBlossomServerList } from './useBlossomServerList';

interface BlossomMediaRetrievalOptions {
  url: string;
  enabled?: boolean;
}

/**
 * BUD-03 compliant media retrieval hook with automatic fallback strategy
 *
 * Implementation follows the 4-step retrieval process:
 * 1. Extract SHA256 hash from original URL
 * 2. Try retrieving from user's preferred servers using hash
 * 3. Verify hash integrity of retrieved content
 * 4. Fallback to original server if all else fails
 */
export function useBlossomMediaRetrieval({ url, enabled = true }: BlossomMediaRetrievalOptions) {
  const { serverList } = useBlossomServerList();

  return useQuery({
    queryKey: ['blossom-media-retrieval', url],
    queryFn: async ({ signal }) => {
      console.log('useBlossomMediaRetrieval: Starting retrieval for URL:', url);

      // Step 1: Extract SHA256 hash from URL
      const sha256Hash = extractSHA256FromUrl(url);
      if (!sha256Hash) {
        console.log('useBlossomMediaRetrieval: No SHA256 hash found, using original URL');
        return url;
      }

      console.log('useBlossomMediaRetrieval: Extracted SHA256:', sha256Hash);

      // Step 2: Try retrieving from user's preferred servers
      const serversToTry = serverList?.servers || [];

      for (const server of serversToTry) {
        try {
          const retrievalUrl = `${server.endsWith('/') ? server.slice(0, -1) : server}/${sha256Hash}`;
          console.log('useBlossomMediaRetrieval: Trying server:', retrievalUrl);

          const response = await fetch(retrievalUrl, { signal });
          if (!response.ok) {
            console.log(`useBlossomMediaRetrieval: Server ${server} returned ${response.status}`);
            continue;
          }

          // Step 3: Verify hash integrity
          const arrayBuffer = await response.arrayBuffer();
          const computedHash = await computeSHA256(arrayBuffer);

          if (computedHash === sha256Hash) {
            console.log('useBlossomMediaRetrieval: Hash verified, using server:', server);
            return retrievalUrl;
          } else {
            console.warn('useBlossomMediaRetrieval: Hash mismatch on server:', server);
            continue;
          }
        } catch (error) {
          console.warn('useBlossomMediaRetrieval: Error with server:', server, error);
          continue;
        }
      }

      // Step 4: Fallback to original server
      console.log('useBlossomMediaRetrieval: All servers failed, falling back to original URL');
      return url;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Extract SHA256 hash from Blossom URL
 * Supports various URL formats including those with file extensions
 */
function extractSHA256FromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading slash and file extension
    const cleanPath = pathname.replace(/^\//, '').replace(/\.[^.]*$/, '');

    // SHA256 hashes are 64 characters of hexadecimal
    const sha256Regex = /^[a-f0-9]{64}$/i;

    if (sha256Regex.test(cleanPath)) {
      return cleanPath.toLowerCase();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Compute SHA256 hash of binary data using Web Crypto API
 */
async function computeSHA256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}