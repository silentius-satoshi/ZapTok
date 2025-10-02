import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/services/profileService'
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify'

// Compatibility interface that matches the existing useAuthor hook
export interface AuthorData {
  event?: NostrEvent
  metadata?: NostrMetadata
}

/**
 * SimplePool-based useAuthor hook that maintains exact compatibility
 * with the existing @nostrify/react version while using our ProfileService
 */
export function useAuthorSimplePool(pubkey: string | undefined) {
  return useQuery<AuthorData>({
    queryKey: ['author-simplepool', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {}
      }

      // Use our ProfileService with SimplePool backend
      const profile = await profileService.fetchProfile(pubkey)
      
      // Convert to the expected format
      return {
        event: profile.event,
        metadata: profile.metadata as NostrMetadata
      }
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  })
}

/**
 * Batch version for loading multiple authors efficiently
 */
export function useAuthorsSimplePool(pubkeys: string[]) {
  return useQuery({
    queryKey: ['authors-simplepool', pubkeys.sort()],
    queryFn: async () => {
      const profiles = await profileService.fetchProfiles(pubkeys)
      
      // Convert to expected format
      const converted: Record<string, AuthorData> = {}
      Object.entries(profiles).forEach(([pubkey, profile]) => {
        converted[pubkey] = {
          event: profile.event,
          metadata: profile.metadata as NostrMetadata
        }
      })
      
      return converted
    },
    enabled: pubkeys.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}