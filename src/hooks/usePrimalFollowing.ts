import { useState, useCallback } from 'react';

/**
 * Hook to fetch the list of users that a pubkey is following from Primal's public cache API
 * 
 * @param pubkey - Nostr public key in hex format
 * @returns Object with following pubkeys array, loading state, and fetch function
 * 
 * @example
 * const { following, isLoading, error, fetchFollowing } = usePrimalFollowing(pubkey);
 * 
 * // Fetch when needed (e.g., when modal opens)
 * useEffect(() => {
 *   if (modalOpen) {
 *     fetchFollowing();
 *   }
 * }, [modalOpen, fetchFollowing]);
 */
export function usePrimalFollowing(pubkey: string | null | undefined) {
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!pubkey) {
      setError(new Error('No pubkey provided'));
      return;
    }

    setIsLoading(true);
    setError(null);

    const ws = new WebSocket('wss://cache1.primal.net/v1');
    const timeoutId = setTimeout(() => {
      ws.close();
      setError(new Error('Request timeout'));
      setIsLoading(false);
    }, 10000); // 10 second timeout for larger lists

    ws.onopen = () => {
      const request = [
        "REQ",
        `user_following_${pubkey.slice(0, 8)}`,
        {
          "cache": [
            "user_following",
            { 
              "pubkey": pubkey,
              "limit": 1000  // Primal's maximum limit for following lists
            }
          ]
        }
      ];
      ws.send(JSON.stringify(request));
    };

    const followingPubkeys = new Set<string>();

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Check for user following response (kind 10000107)
        if (msg[0] === 'EVENT' && msg[2]?.kind === 10000107) {
          const content = JSON.parse(msg[2].content);
          
          // Extract pubkeys from the response
          if (content.pubkey_infos) {
            content.pubkey_infos.forEach((info: any) => {
              if (info.pubkey) {
                followingPubkeys.add(info.pubkey);
              }
            });
          }
        }
        
        // Handle EOSE (end of stored events)
        if (msg[0] === 'EOSE') {
          setFollowing(Array.from(followingPubkeys));
          setIsLoading(false);
          clearTimeout(timeoutId);
          ws.close();
        }
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
        clearTimeout(timeoutId);
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

  return { following, isLoading, error, fetchFollowing };
}
