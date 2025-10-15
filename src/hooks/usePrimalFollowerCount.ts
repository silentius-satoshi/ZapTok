import { useState, useEffect } from 'react';

interface PrimalUserProfile {
  pubkey: string;
  follows_count: number;
  followers_count: number;
  note_count: number;
  long_form_note_count?: number;
  reply_count?: number;
  time_joined?: number;
  relay_count?: number;
  total_zap_count?: number;
  total_satszapped?: number;
  media_count?: number;
  content_zap_count?: number;
}

/**
 * Hook to fetch accurate follower and following counts from Primal's public cache API
 * 
 * @param pubkey - Nostr public key in hex format
 * @param fetchOnMount - Whether to fetch immediately on mount (default: true)
 * @returns Object with followerCount, followingCount, profile data, and loading state
 * 
 * @example
 * const { followerCount, followingCount, profile, isLoading } = usePrimalFollowerCount(pubkey);
 */
export function usePrimalFollowerCount(
  pubkey: string | null | undefined,
  fetchOnMount: boolean = true
) {
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<PrimalUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pubkey || !fetchOnMount) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const ws = new WebSocket('wss://cache1.primal.net/v1');
    const timeoutId = setTimeout(() => {
      ws.close();
      setError(new Error('Request timeout'));
      setIsLoading(false);
    }, 5000); // 5 second timeout

    ws.onopen = () => {
      const request = [
        "REQ",
        `followers_${pubkey.slice(0, 8)}`,
        {
          "cache": [
            "user_profile",
            { "pubkey": pubkey }
          ]
        }
      ];
      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Check for user profile response (kind 10000105)
        if (msg[0] === 'EVENT' && msg[2]?.kind === 10000105) {
          const profileData = JSON.parse(msg[2].content) as PrimalUserProfile;
          setProfile(profileData);
          setFollowerCount(profileData.followers_count);
          setFollowingCount(profileData.follows_count);
          clearTimeout(timeoutId);
          setIsLoading(false);
          ws.close();
        }
        
        // Handle EOSE (end of stored events)
        if (msg[0] === 'EOSE') {
          clearTimeout(timeoutId);
          setIsLoading(false);
          ws.close();
        }
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    ws.onerror = (event) => {
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
  }, [pubkey, fetchOnMount]);

  return { followerCount, followingCount, profile, isLoading, error };
}
