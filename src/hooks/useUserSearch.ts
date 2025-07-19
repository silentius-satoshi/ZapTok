import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@/hooks/useNostr';
import { useAuthors } from '@/hooks/useAuthors';
import { genUserName } from '@/lib/genUserName';
import { useMemo } from 'react';

interface UserSearchResult {
  pubkey: string;
  metadata?: {
    name?: string;
    display_name?: string;
    about?: string;
    picture?: string;
    nip05?: string;
  };
  followedBy: string[]; // Array of pubkeys who follow this user
}

export function useUserSearch(searchTerm: string = '', enabled: boolean = true) {
  const { nostr } = useNostr();

  // Ensure searchTerm is always a string
  const safeSearchTerm = searchTerm || '';

  // First, get a comprehensive set of users from various sources
  const { data: sampleUsers } = useQuery({
    queryKey: ['sample-users'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Get recent kind 3 events (contact lists) from various users
      const contactEvents = await nostr.query([
        {
          kinds: [3],
          limit: 100, // Increased limit
        }
      ], { signal });

      // Get recent posts to find active users
      const recentPosts = await nostr.query([
        {
          kinds: [1],
          limit: 200, // Increased limit
        }
      ], { signal });

      // Get recent NIP-71 video events (most relevant for ZapTok)
      const videoEvents = await nostr.query([
        {
          kinds: [21, 22], // NIP-71 video events (21 = normal videos, 22 = short videos)
          limit: 150, // Good sample of video creators
        }
      ], { signal });

      // Extract pubkeys from contact list authors
      const contactAuthors = contactEvents.map(e => e.pubkey);
      
      // Extract pubkeys from post authors
      const postAuthors = recentPosts.map(e => e.pubkey);
      
      // Extract pubkeys from video event authors (priority for video app)
      const videoAuthors = videoEvents.map(e => e.pubkey);
      
      // Extract pubkeys mentioned in posts (p tags)
      const mentionedUsers = recentPosts.flatMap(event => 
        event.tags
          .filter(([tagName]) => tagName === 'p')
          .map(([, pubkey]) => pubkey)
          .filter(Boolean)
      );
      
      // Extract pubkeys from contact lists (people being followed)
      const followedUsers = contactEvents.flatMap(event => 
        event.tags
          .filter(([tagName]) => tagName === 'p')
          .map(([, pubkey]) => pubkey)
          .filter(Boolean)
      );

      // Combine all sources and deduplicate (video authors first for priority)
      const allPubkeys = [...new Set([
        ...videoAuthors,    // Video creators get priority
        ...contactAuthors, 
        ...postAuthors, 
        ...mentionedUsers, 
        ...followedUsers
      ])];
      
      console.log('🔍 Collected', allPubkeys.length, 'unique pubkeys from various sources');
      console.log('📹 Video authors (21/22):', videoAuthors.length, 'Post authors:', postAuthors.length, 'Mentioned users:', mentionedUsers.length);
      
      return allPubkeys;
    },
    enabled: enabled && safeSearchTerm.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduced for more fresh data
  });

  // Get following lists for sample users
  const { data: followingLists } = useQuery({
    queryKey: ['following-lists', sampleUsers],
    queryFn: async (c) => {
      if (!sampleUsers || sampleUsers.length === 0) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      // Get contact lists for sample users
      const events = await nostr.query([
        {
          kinds: [3],
          authors: sampleUsers,
          limit: 100,
        }
      ], { signal });

      // Build a map of who follows whom
      const followMap = new Map<string, string[]>();
      
      events.forEach(event => {
        const follower = event.pubkey;
        const following = event.tags
          .filter(([tagName]) => tagName === 'p')
          .map(([, pubkey]) => pubkey)
          .filter(Boolean);

        following.forEach(followedPubkey => {
          if (!followMap.has(followedPubkey)) {
            followMap.set(followedPubkey, []);
          }
          followMap.get(followedPubkey)!.push(follower);
        });
      });

      return followMap;
    },
    enabled: enabled && safeSearchTerm.length > 0 && !!sampleUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get all unique pubkeys that appear in following lists + sample users
  const allPubkeysToSearch = useMemo(() => {
    const followedPubkeys = followingLists && followingLists instanceof Map ? Array.from(followingLists.keys()) : [];
    const samplePubkeys = sampleUsers || [];
    
    // Combine and deduplicate
    return [...new Set([...followedPubkeys, ...samplePubkeys])];
  }, [followingLists, sampleUsers]);

  // Get author data for all pubkeys to search
  const authors = useAuthors(allPubkeysToSearch);

  // Filter and search results
  const searchResults = useMemo(() => {
    if (!safeSearchTerm || !authors.data || !followingLists || !(followingLists instanceof Map)) return [];

    const results: UserSearchResult[] = [];
    const searchLower = safeSearchTerm.toLowerCase().trim();

    console.log('🔍 Searching through', authors.data.length, 'users for:', safeSearchTerm);

    authors.data.forEach(author => {
      const displayName = author.metadata?.display_name || author.metadata?.name || '';
      const userName = author.metadata?.name || '';
      const about = author.metadata?.about || '';
      const nip05 = author.metadata?.nip05 || '';
      
      // Generate fallback username for searching
      const generatedName = genUserName(author.pubkey);

      // Debug specific user if searching for derekross
      if (searchLower.includes('derekross') || nip05.includes('derekross')) {
        console.log('🔍 Found derekross user:', {
          pubkey: author.pubkey.slice(0, 8),
          displayName,
          userName,
          nip05,
          about: about.slice(0, 50),
          generatedName
        });
      }

      // Check if search term matches any of the searchable fields
      const matchesSearch = 
        displayName.toLowerCase().includes(searchLower) ||
        userName.toLowerCase().includes(searchLower) ||
        about.toLowerCase().includes(searchLower) ||
        nip05.toLowerCase().includes(searchLower) ||
        generatedName.toLowerCase().includes(searchLower) ||
        // Also try exact match for NIP-05
        nip05.toLowerCase() === searchLower ||
        // Try partial match for domain part
        (searchLower.includes('@') && nip05.toLowerCase().includes(searchLower.split('@')[1]));

      if (matchesSearch) {
        const followedBy = followingLists.get(author.pubkey) || [];
        results.push({
          pubkey: author.pubkey,
          metadata: author.metadata,
          followedBy,
        });
      }
    });

    console.log('🔍 Found', results.length, 'matching users');

    // Sort by number of followers (most followed first)
    return results.sort((a, b) => b.followedBy.length - a.followedBy.length);
  }, [safeSearchTerm, authors.data, followingLists]);

  return {
    data: searchResults,
    isLoading: authors.isLoading,
    isError: authors.isError,
    error: authors.error,
  };
}
