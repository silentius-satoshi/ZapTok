import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSimplePool } from '@/hooks/useSimplePool';
import type { NostrEvent } from '@nostrify/nostrify';
import type { Filter } from '@nostr/tools';

/**
 * Web of Trust Provider
 * 
 * Implements a 2-degree Web of Trust system based on Jumble's proven pattern.
 * 
 * Trust Levels:
 * - Self: Your own pubkey → Always trusted
 * - Degree 1: People you directly follow → Trusted
 * - Degree 2: People your follows follow → Trusted
 * - Beyond: Not in WoT set → Untrusted (if filters enabled)
 * 
 * Performance:
 * - O(1) lookups via Set.has()
 * - ~3.2 MB memory for 100k pubkeys (32 bytes each)
 * - Batched loading: 20 users per batch with 200ms delays
 * - Client-side only, no centralized trust server
 * 
 * Usage:
 * - Applied to filter notifications, interactions, and feed posts
 * - Three granular controls for user preference
 */

// Module-level singleton for global trust state
// This pattern allows efficient O(1) lookups across the entire app
const wotSet = new Set<string>();

interface UserTrustContextValue {
  /** Check if a pubkey is in the Web of Trust */
  isUserTrusted: (pubkey: string) => boolean;
  
  /** Whether to hide interactions (likes, replies, reposts) from untrusted users */
  hideUntrustedInteractions: boolean;
  setHideUntrustedInteractions: (hide: boolean) => void;
  
  /** Whether to hide notifications from untrusted users */
  hideUntrustedNotifications: boolean;
  setHideUntrustedNotifications: (hide: boolean) => void;
  
  /** Whether to hide feed posts from untrusted users */
  hideUntrustedNotes: boolean;
  setHideUntrustedNotes: (hide: boolean) => void;
  
  /** Whether the WoT is currently being initialized */
  isInitializing: boolean;
  
  /** Total number of trusted pubkeys in the WoT */
  trustedCount: number;
}

const UserTrustContext = createContext<UserTrustContextValue | undefined>(undefined);

export function UserTrustProvider({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const { simplePool, simplePoolRelays } = useSimplePool();
  
  const [hideUntrustedInteractions, setHideUntrustedInteractions] = useState(() => {
    const saved = localStorage.getItem('wot:hideUntrustedInteractions');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [hideUntrustedNotifications, setHideUntrustedNotifications] = useState(() => {
    const saved = localStorage.getItem('wot:hideUntrustedNotifications');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [hideUntrustedNotes, setHideUntrustedNotes] = useState(() => {
    const saved = localStorage.getItem('wot:hideUntrustedNotes');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [trustedCount, setTrustedCount] = useState(0);
  
  const isMountedRef = useRef(true);
  
  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('wot:hideUntrustedInteractions', JSON.stringify(hideUntrustedInteractions));
  }, [hideUntrustedInteractions]);
  
  useEffect(() => {
    localStorage.setItem('wot:hideUntrustedNotifications', JSON.stringify(hideUntrustedNotifications));
  }, [hideUntrustedNotifications]);
  
  useEffect(() => {
    localStorage.setItem('wot:hideUntrustedNotes', JSON.stringify(hideUntrustedNotes));
  }, [hideUntrustedNotes]);
  
  // Fetch follow list for a given pubkey
  const fetchFollowings = useCallback(async (pubkey: string): Promise<string[]> => {
    try {
      // Query for kind 3 (Contact List) events
      const events = await new Promise<NostrEvent[]>((resolve) => {
        const foundEvents: NostrEvent[] = [];
        let eoseCount = 0;
        const expectedEose = Math.min(simplePoolRelays.length, 3); // Only use first 3 relays
        
        const filter: Filter = { kinds: [3], authors: [pubkey], limit: 1 };
        
        const sub = simplePool.subscribeMany(
          simplePoolRelays.slice(0, 3),
          filter,
          {
            onevent: (event: NostrEvent) => {
              foundEvents.push(event);
            },
            oneose: () => {
              eoseCount++;
              if (eoseCount >= expectedEose) {
                sub.close();
                resolve(foundEvents);
              }
            }
          }
        );
        
        // Timeout after 3 seconds
        setTimeout(() => {
          sub.close();
          resolve(foundEvents);
        }, 3000);
      });
      
      if (events.length === 0) return [];
      
      // Get the most recent contact list
      const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
      
      // Extract pubkeys from 'p' tags
      const followings = latestEvent.tags
        .filter(tag => tag[0] === 'p')
        .map(tag => tag[1])
        .filter(Boolean);
      
      return followings;
    } catch (error) {
      console.warn('[WoT] Failed to fetch followings for', pubkey.slice(0, 8), error);
      return [];
    }
  }, [simplePool, simplePoolRelays]);
  
  // Initialize Web of Trust
  useEffect(() => {
    if (!user) {
      // Clear WoT when user logs out
      wotSet.clear();
      setTrustedCount(0);
      return;
    }
    
    isMountedRef.current = true;
    
    const initWoT = async () => {
      setIsInitializing(true);
      wotSet.clear();
      
      try {
        console.log('[WoT] Initializing Web of Trust for', user.pubkey.slice(0, 8));
        
        // Degree 1: Add all people you follow
        const followings = await fetchFollowings(user.pubkey);
        
        if (!isMountedRef.current) return;
        
        console.log('[WoT] Found', followings.length, 'direct follows (Degree 1)');
        followings.forEach((pubkey) => wotSet.add(pubkey));
        setTrustedCount(wotSet.size);
        
        // Degree 2: Add people your follows follow (batched to prevent UI freeze)
        const batchSize = 20;
        let processedCount = 0;
        
        for (let i = 0; i < followings.length; i += batchSize) {
          if (!isMountedRef.current) break;
          
          const batch = followings.slice(i, i + batchSize);
          
          await Promise.allSettled(
            batch.map(async (pubkey) => {
              const secondDegreeFollowings = await fetchFollowings(pubkey);
              
              if (isMountedRef.current) {
                secondDegreeFollowings.forEach((following) => {
                  wotSet.add(following);
                });
              }
            })
          );
          
          processedCount += batch.length;
          
          if (isMountedRef.current) {
            setTrustedCount(wotSet.size);
            console.log('[WoT] Processed', processedCount, '/', followings.length, 'follows. Total trusted:', wotSet.size);
          }
          
          // Delay between batches to prevent UI freeze
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        
        if (isMountedRef.current) {
          console.log('[WoT] Initialization complete. Total trusted pubkeys:', wotSet.size);
        }
      } catch (error) {
        console.error('[WoT] Initialization error:', error);
      } finally {
        if (isMountedRef.current) {
          setIsInitializing(false);
        }
      }
    };
    
    initWoT();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.pubkey]);
  
  // Check if a user is trusted
  const isUserTrusted = useCallback(
    (pubkey: string) => {
      // When logged out, treat everyone as trusted (no WoT to compare against)
      if (!user) return true;
      
      // Always trust yourself
      if (pubkey === user.pubkey) return true;
      
      // Check if in WoT set (O(1) lookup)
      return wotSet.has(pubkey);
    },
    [user]
  );
  
  const value: UserTrustContextValue = {
    isUserTrusted,
    hideUntrustedInteractions,
    setHideUntrustedInteractions,
    hideUntrustedNotifications,
    setHideUntrustedNotifications,
    hideUntrustedNotes,
    setHideUntrustedNotes,
    isInitializing,
    trustedCount,
  };
  
  return (
    <UserTrustContext.Provider value={value}>
      {children}
    </UserTrustContext.Provider>
  );
}

export function useUserTrust() {
  const context = useContext(UserTrustContext);
  if (context === undefined) {
    throw new Error('useUserTrust must be used within a UserTrustProvider');
  }
  return context;
}
