import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";
import { 
  validateEventStructure, 
  serializeEventForId,
  type SerializableEvent 
} from "@/lib/nip01-types";

import type { NostrEvent } from "@nostrify/nostrify";

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the client tag if it doesn't exist
        if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
          tags.push(["client", location.hostname]);
        }

        // Validate kind range per NIP-01
        if (t.kind < 0 || t.kind > 65535) {
          throw new Error(`Invalid event kind ${t.kind}: must be between 0 and 65535 per NIP-01`);
        }

        // Process content for NIP-01 compliance
        let processedContent = t.content ?? "";
        
        // For kinds that require strict JSON serialization (like kind 0)
        if (t.kind === 0) {
          try {
            // Validate that content is valid JSON for metadata events
            const parsed = JSON.parse(processedContent);
            // Re-serialize to ensure consistent formatting
            processedContent = JSON.stringify(parsed);
            console.log('[useNostrPublish] Kind 0 metadata validated and normalized');
          } catch (error) {
            throw new Error(`Kind 0 events must have valid JSON content: ${error}`);
          }
        }
        
        // Validate tag structure per NIP-01
        for (let i = 0; i < tags.length; i++) {
          const tag = tags[i];
          if (!Array.isArray(tag) || tag.length === 0) {
            throw new Error(`Invalid tag at index ${i}: tags must be non-empty arrays`);
          }
          if (!tag.every(item => typeof item === 'string')) {
            throw new Error(`Invalid tag at index ${i}: all tag elements must be strings`);
          }
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: processedContent,
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        // Validate the signed event structure per NIP-01
        if (!validateEventStructure(event)) {
          throw new Error('Signed event failed NIP-01 structure validation');
        }

        // Log event details for debugging
        console.log('[useNostrPublish] Publishing NIP-01 compliant event:', {
          kind: event.kind,
          tagsCount: event.tags.length,
          contentLength: event.content.length,
          id: event.id.slice(0, 12) + '...',
          createdAt: new Date(event.created_at * 1000).toISOString(),
          hasValidStructure: true
        });

        // Log serialization details for ID verification (development only)
        if (process.env.NODE_ENV === 'development') {
          const serializable: SerializableEvent = {
            pubkey: event.pubkey,
            created_at: event.created_at,
            kind: event.kind,
            tags: event.tags,
            content: event.content
          };
          const serialized = serializeEventForId(serializable);
          console.log('[useNostrPublish] Event serialization for ID (dev):', {
            serializedLength: serialized.length,
            hasValidChars: /^[\x20-\x7E]*$/.test(serialized), // Printable ASCII
          });
        }

        await nostr.event(event, { signal: AbortSignal.timeout(5000) });
        
        console.log('[useNostrPublish] Event published successfully to relays');
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("[useNostrPublish] Failed to publish event:", error);
      
      // Parse NIP-01 error messages for better user feedback
      if (error instanceof Error) {
        if (error.message.includes('duplicate:')) {
          console.warn("[useNostrPublish] Event rejected: duplicate");
        } else if (error.message.includes('pow:')) {
          console.warn("[useNostrPublish] Event rejected: insufficient proof of work");
        } else if (error.message.includes('rate-limited:')) {
          console.warn("[useNostrPublish] Event rejected: rate limited");
        } else if (error.message.includes('invalid:')) {
          console.error("[useNostrPublish] Event rejected: invalid format");
        }
      }
    },
    onSuccess: (data) => {
      console.log("[useNostrPublish] Event published successfully:", {
        id: data.id.slice(0, 12) + '...',
        kind: data.kind,
        timestamp: new Date(data.created_at * 1000).toISOString()
      });
    },
  });
}