import { useNostr } from "@nostrify/react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { bundleLog } from "@/lib/logBundler";
import { devLog } from "@/lib/devConsole";

import { useCurrentUser } from "./useCurrentUser";
import {
  validateEventStructure,
  serializeEventForId,
  type SerializableEvent
} from "@/lib/nip01-types";
import { relayResponseMonitor } from "@/lib/relayResponseMonitor";
import relayListService from "@/services/relayList.service";

import type { NostrEvent } from "@nostrify/nostrify";

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

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
            devLog('[useNostrPublish] Kind 0 metadata validated and normalized');
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
        devLog('[useNostrPublish] 📤 Publishing NIP-01 compliant event:', {
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
          devLog('[useNostrPublish] Event serialization for ID (dev):', {
            serializedLength: serialized.length,
            hasValidChars: /^[\x20-\x7E]*$/.test(serialized), // Printable ASCII
          });
        }

        // Enhanced relay response tracking with detailed monitoring
        bundleLog('relay-publish', `🚀 Publishing event ${event.id.slice(0, 8)} (kind ${event.kind})`);

        try {
          // Track publishing start time
          const publishStartTime = Date.now();

          // Clear any previous responses for this event
          relayResponseMonitor.clearResponses(event.id);

          // Get user's write relays for NIP-65 compliance
          let writeRelays: string[] | undefined;
          try {
            const userRelayList = await relayListService.getUserRelayList(user.pubkey, nostr);
            writeRelays = userRelayList.write;
            
            if (import.meta.env.DEV && writeRelays) {
              devLog('[useNostrPublish] Using write relays from NIP-65:', {
                relayCount: writeRelays.length,
                relays: writeRelays.map(r => r.replace('wss://', ''))
              });
            }
          } catch (error) {
            devLog('[useNostrPublish] Failed to get user relay list, using defaults:', error);
          }

          // Publish to write relays if available, otherwise use default relay pool
          const publishOptions = writeRelays && writeRelays.length > 0 
            ? { signal: AbortSignal.timeout(10000), relays: writeRelays }
            : { signal: AbortSignal.timeout(10000) };

          await nostr.event(event, publishOptions);

          const publishDuration = Date.now() - publishStartTime;
          devLog('[useNostrPublish] ✅ Event published successfully', {
            eventId: event.id.slice(0, 12) + '...',
            kind: event.kind,
            duration: `${publishDuration}ms`,
            timestamp: new Date().toISOString()
          });

          // In development, wait briefly for relay responses and log summary
          if (import.meta.env.DEV) {
            bundleLog('relay-publish', '🔍 Checking relay responses...');

            // Check responses after a short delay
            setTimeout(async () => {
              const propagationResult = await relayResponseMonitor.checkEventPropagation(event.id, 3000);

              bundleLog('relay-publish', `📊 Event ${event.id.slice(0, 8)}: ${propagationResult.success ? 'Success' : 'Issues'} - ${propagationResult.acceptedRelays.length} accepted, ${propagationResult.rejectedRelays.length} rejected`);

              // Specific guidance for Primal issues
              if (!propagationResult.acceptedRelays.includes('relay.primal.net') &&
                  !propagationResult.rejectedRelays.some(r => r.relay === 'relay.primal.net')) {
                bundleLog('relay-publish', '⚠️ No response from Primal relay detected');
              }

              if (propagationResult.rejectedRelays.length > 0) {
                bundleLog('relay-publish', `⚠️ Some relays rejected the event: ${propagationResult.rejectedRelays.map(r => r.relay).join(', ')}`);
              }

              // Success indicators
              if (propagationResult.success) {
                bundleLog('relay-publish', '🎯 Event successfully accepted by at least one relay');
                if (event.kind === 3) {
                  bundleLog('relay-publish', '💡 Contact list should appear on other clients in 1-3 minutes');
                }
              } else {
                bundleLog('relay-publish', '❌ Event was rejected by all relays that responded');
              }
            }, 1000);
          }

          // Additional logging for follow events (kind 3) since those are the main issue
          if (event.kind === 3) {
            const contactCount = event.tags.filter(([tagName]) => tagName === 'p').length;
            bundleLog('relay-publish', `📇 Contact list: ${contactCount} contacts, ${event.content ? 'has content' : 'empty content'}`);
          }

        } catch (publishError) {
          bundleLog('relay-publish', `❌ Publishing failed for event ${event.id.slice(0, 8)}: ${publishError instanceof Error ? publishError.message : publishError}`);
          throw publishError;
        }

        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      bundleLog('relay-publish', `❌ Publishing failed: ${error instanceof Error ? error.message : error}`);

      // Enhanced NIP-01 and relay-specific error parsing
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        // Relay rejection messages
        if (errorMsg.includes('duplicate:') || errorMsg.includes('duplicate')) {
          bundleLog('relay-publish', "🚫 Event already exists (duplicate) - this is normal");
        } else if (errorMsg.includes('pow:') || errorMsg.includes('proof of work')) {
          bundleLog('relay-publish', "🚫 Insufficient proof of work - try different relay");
        } else if (errorMsg.includes('rate-limited') || errorMsg.includes('rate limit')) {
          bundleLog('relay-publish', "🚫 Rate limited - publishing too frequently");
        } else if (errorMsg.includes('invalid:') || errorMsg.includes('invalid')) {
          bundleLog('relay-publish', "🚫 Invalid event format - check NIP compliance");
        } else if (errorMsg.includes('blocked:') || errorMsg.includes('blocked')) {
          bundleLog('relay-publish', "🚫 Pubkey blocked by relay");
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          bundleLog('relay-publish', "⏱️ Publishing timeout - event may still be published");
        } else if (errorMsg.includes('websocket') || errorMsg.includes('connection')) {
          bundleLog('relay-publish', "🔌 WebSocket connection error");
        } else {
          bundleLog('relay-publish', `❓ Unknown error: ${error.message}`);
        }
      }
    },
    onSuccess: (data) => {
      bundleLog('relay-publish', `🎉 Event ${data.id.slice(0, 8)} published successfully (kind ${data.kind})`);

      // Invalidate global video feed for video events (kind 21/22)
      if (data.kind === 21 || data.kind === 22) {
        bundleLog('relay-publish', `🔄 Refreshing global video feed for new video (kind ${data.kind})`);
        queryClient.invalidateQueries({ queryKey: ['optimized-global-video-feed'] });
      }

      // Additional verification suggestions
      if (data.kind === 3) {
        bundleLog('relay-publish', "💡 Check your follow list on other Nostr clients in 2-3 minutes");
      }
    },
  });
}