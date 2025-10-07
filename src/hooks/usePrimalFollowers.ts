import { useState, useCallback } from 'react';

/**
 * Hook to fetch the list of followers from Primal's public cache API
 * 
 * @param pubkey - Nostr public key in hex format
 * @returns Object with follower pubkeys and fetch function
 * 
 * @example
 * const { followers, isLoading, fetchFollowers } = usePrimalFollowers(pubkey);
 */
export function usePrimalFollowers(pubkey: string | null | undefined) {
  const [followers, setFollowers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFollowers = useCallback(async () => {
    if (!pubkey) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const ws = new WebSocket('wss://cache1.primal.net/v1');
    const timeoutId = setTimeout(() => {
      ws.close();
      setError(new Error('Request timeout'));
      setIsLoading(false);
    }, 10000); // 10 second timeout for list

    ws.onopen = () => {
      const request = [
        "REQ",
        `user_followers_${pubkey.slice(0, 8)}`,
        {
          "cache": [
            "user_followers",
            { 
              "pubkey": pubkey,
              "limit": 1000  // Primal's maximum limit for follower lists
            }
          ]
        }
      ];
      ws.send(JSON.stringify(request));
    };

    const followerPubkeys = new Set<string>();

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Check for metadata events (kind 0) which contain follower info
        if (msg[0] === 'EVENT' && msg[2]?.kind === 0) {
          const followerPubkey = msg[2].pubkey;
          if (followerPubkey) {
            followerPubkeys.add(followerPubkey);
          }
        }
        
        // Handle EOSE (end of stored events)
        if (msg[0] === 'EOSE') {
          setFollowers(Array.from(followerPubkeys));
          clearTimeout(timeoutId);
          setIsLoading(false);
          ws.close();
        }
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    ws.onerror = () => {
      setError(new Error('WebSocket connection failed'));
      setIsLoading(false);
      clearTimeout(timeoutId);
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    };

    return () => {
      clearTimeout(timeoutId);
      ws.close();
    };
  }, [pubkey]);

  return { followers, isLoading, error, fetchFollowers };
}
