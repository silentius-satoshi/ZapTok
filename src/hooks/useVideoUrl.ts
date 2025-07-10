import { useQuery } from '@tanstack/react-query';

interface VideoUrlCache {
  primaryUrl: string;
  fallbackUrls: string[];
  lastChecked: number;
}

const BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://cdn.satellite.earth',
  'https://files.nostr.band',
];

export function useVideoUrl(hash: string) {
  return useQuery({
    queryKey: ['video-url', hash],
    queryFn: async (): Promise<VideoUrlCache> => {
      if (!hash) {
        throw new Error('No hash provided');
      }

      const workingUrls: string[] = [];
      let primaryUrl = '';
      
      // Test all servers concurrently with timeout
      const results = await Promise.allSettled(
        BLOSSOM_SERVERS.map(async (server) => {
          const url = `${server}/${hash}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          try {
            const response = await fetch(url, { 
              method: 'HEAD',
              signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              return url;
            }
            throw new Error('Server unavailable');
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        })
      );
      
      // Collect working URLs
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          workingUrls.push(result.value);
          if (!primaryUrl) primaryUrl = result.value;
        }
      });
      
      if (!primaryUrl) {
        throw new Error('No working video servers found');
      }
      
      return {
        primaryUrl,
        fallbackUrls: workingUrls.slice(1),
        lastChecked: Date.now()
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    enabled: !!hash,
  });
}
