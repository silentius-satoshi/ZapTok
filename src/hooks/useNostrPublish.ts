import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";
import { 
  validateEventStructure, 
  serializeEventForId,
  type SerializableEvent 
} from "@/lib/nip01-types";
import { relayResponseMonitor } from "@/lib/relayResponseMonitor";

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

        // Log event details for debugging with relay targeting info
        console.log('[useNostrPublish] 📤 Publishing NIP-01 compliant event:', {
          kind: event.kind,
          tagsCount: event.tags.length,
          contentLength: event.content.length,
          eventId: event.id.slice(0, 12) + '...',
          pubkey: event.pubkey.slice(0, 12) + '...',
          createdAt: new Date(event.created_at * 1000).toISOString(),
          hasValidStructure: true,
          targetRelays: 'will be determined by NostrProvider'
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

        // Enhanced relay response tracking with detailed monitoring
        console.log('[useNostrPublish] 🚀 Publishing event to relays...', {
          eventId: event.id,
          kind: event.kind,
          relayMonitorActive: import.meta.env.DEV
        });

        try {
          // Track publishing start time
          const publishStartTime = Date.now();
          
          // Clear any previous responses for this event
          relayResponseMonitor.clearResponses(event.id);
          
          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          
          const publishDuration = Date.now() - publishStartTime;
          console.log('[useNostrPublish] ✅ Event published successfully', {
            eventId: event.id.slice(0, 12) + '...',
            kind: event.kind,
            duration: `${publishDuration}ms`,
            timestamp: new Date().toISOString()
          });
          
          // In development, wait briefly for relay responses and log summary
          if (import.meta.env.DEV) {
            console.log('[useNostrPublish] 🔍 Checking relay responses...');
            
            // Check responses after a short delay
            setTimeout(async () => {
              const propagationResult = await relayResponseMonitor.checkEventPropagation(event.id, 3000);
              
              console.log('[useNostrPublish] 📊 Relay Response Summary:', {
                eventId: event.id.slice(0, 12) + '...',
                success: propagationResult.success,
                acceptedBy: propagationResult.acceptedRelays,
                rejectedBy: propagationResult.rejectedRelays,
                totalResponses: propagationResult.totalResponses
              });
              
              // Specific guidance for Primal issues
              if (!propagationResult.acceptedRelays.includes('relay.primal.net') && 
                  !propagationResult.rejectedRelays.some(r => r.relay === 'relay.primal.net')) {
                console.warn('[useNostrPublish] ⚠️ No response from Primal relay detected', {
                  suggestion: 'Check if relay.primal.net is in your active relays',
                  troubleshoot: 'Primal may be using cache servers instead of main relay'
                });
              }
              
              if (propagationResult.rejectedRelays.length > 0) {
                console.warn('[useNostrPublish] ⚠️ Some relays rejected the event:', 
                  propagationResult.rejectedRelays);
              }
              
              // Success indicators
              if (propagationResult.success) {
                console.log('[useNostrPublish] 🎯 Event successfully accepted by at least one relay');
                if (event.kind === 3) {
                  console.log('[useNostrPublish] 💡 Contact list should appear on other clients in 1-3 minutes');
                }
              } else {
                console.error('[useNostrPublish] ❌ Event was rejected by all relays that responded');
              }
            }, 1000);
          }
          
          // Additional logging for follow events (kind 3) since those are the main issue
          if (event.kind === 3) {
            const contactCount = event.tags.filter(([tagName]) => tagName === 'p').length;
            console.log('[useNostrPublish] 📇 Contact list event details:', {
              eventId: event.id.slice(0, 12) + '...',
              contactCount,
              tags: event.tags.map(([name, ...rest]) => `${name}:${rest.length > 0 ? rest[0].slice(0, 12) + '...' : ''}`),
              content: event.content ? 'has content' : 'empty content',
              nip02Compliant: event.tags.every(tag => 
                tag[0] !== 'p' || (Array.isArray(tag) && tag.length >= 2)
              )
            });
          }
          
        } catch (publishError) {
          console.error('[useNostrPublish] ❌ Publishing failed:', {
            eventId: event.id.slice(0, 12) + '...',
            kind: event.kind,
            error: publishError instanceof Error ? publishError.message : publishError,
            timestamp: new Date().toISOString()
          });
          throw publishError;
        }
        
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("[useNostrPublish] ❌ Publishing failed:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Enhanced NIP-01 and relay-specific error parsing
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Relay rejection messages
        if (errorMsg.includes('duplicate:') || errorMsg.includes('duplicate')) {
          console.warn("[useNostrPublish] 🚫 Relay rejection: Event already exists (duplicate)", {
            reason: 'Event with same ID already published',
            suggestion: 'This is normal - the event was already published successfully'
          });
        } else if (errorMsg.includes('pow:') || errorMsg.includes('proof of work')) {
          console.warn("[useNostrPublish] 🚫 Relay rejection: Insufficient proof of work", {
            reason: 'Relay requires higher difficulty proof of work',
            suggestion: 'Try a different relay or implement POW'
          });
        } else if (errorMsg.includes('rate-limited') || errorMsg.includes('rate limit')) {
          console.warn("[useNostrPublish] 🚫 Relay rejection: Rate limited", {
            reason: 'Publishing too frequently',
            suggestion: 'Wait before publishing again'
          });
        } else if (errorMsg.includes('invalid:') || errorMsg.includes('invalid')) {
          console.error("[useNostrPublish] 🚫 Relay rejection: Invalid event format", {
            reason: 'Event failed relay validation',
            suggestion: 'Check event structure and NIP compliance'
          });
        } else if (errorMsg.includes('blocked:') || errorMsg.includes('blocked')) {
          console.error("[useNostrPublish] 🚫 Relay rejection: Pubkey blocked", {
            reason: 'Your pubkey may be blocked by this relay',
            suggestion: 'Try publishing to different relays'
          });
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          console.warn("[useNostrPublish] ⏱️ Publishing timeout", {
            reason: 'Relay did not respond within timeout period',
            suggestion: 'Check relay connectivity, event may still be published'
          });
        } else if (errorMsg.includes('websocket') || errorMsg.includes('connection')) {
          console.error("[useNostrPublish] 🔌 Connection error", {
            reason: 'WebSocket connection to relay failed',
            suggestion: 'Check network connection and relay status'
          });
        } else {
          console.error("[useNostrPublish] ❓ Unknown error", {
            reason: 'Unrecognized error type',
            message: error.message,
            suggestion: 'Check relay logs or try different relay'
          });
        }
      }
    },
    onSuccess: (data) => {
      console.log("[useNostrPublish] 🎉 Event publishing completed", {
        eventId: data.id.slice(0, 12) + '...',
        kind: data.kind,
        timestamp: new Date(data.created_at * 1000).toISOString(),
        publishedAt: new Date().toISOString(),
        note: data.kind === 3 ? 'Contact list updated' : 
              data.kind === 0 ? 'Profile updated' :
              data.kind === 1 ? 'Note published' : `Kind ${data.kind} event published`
      });
      
      // Additional verification suggestions
      if (data.kind === 3) {
        console.log("[useNostrPublish] 💡 Verification tip: Check your follow list on other Nostr clients in 2-3 minutes");
      }
      
      console.log("[useNostrPublish] 🔍 Debug: Search for this event on nostr.band:", 
        `https://nostr.band/?q=${data.id}`);
    },
  });
}