import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { NUser } from '@nostrify/react/login';

// Direct relay publishing function as fallback
async function publishToRelayDirect(event: NostrEvent, relayUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(relayUrl);
    let success = false;

    ws.onopen = () => {
      const eventMessage = ['EVENT', event];
      ws.send(JSON.stringify(eventMessage));
      console.log(`[DirectPublish] 📤 Sent event to ${relayUrl}`);
    };

    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data[0] === 'OK' && data[1] === event.id) {
          console.log(`[DirectPublish] ✅ ${relayUrl} accepted event:`, data[2]);
          success = true;
          ws.close();
          resolve(true);
        } else if (data[0] === 'NOTICE') {
          console.log(`[DirectPublish] 📢 ${relayUrl} notice:`, data[1]);
        }
      } catch (error) {
        console.error(`[DirectPublish] ❌ Error parsing message from ${relayUrl}:`, error);
      }
    };

    ws.onerror = (error) => {
      console.error(`[DirectPublish] ❌ WebSocket error for ${relayUrl}:`, error);
      ws.close();
      resolve(false);
    };

    ws.onclose = () => {
      if (!success) {
        console.warn(`[DirectPublish] ⚠️ Connection closed without confirmation for ${relayUrl}`);
        resolve(false);
      }
    };

    // Timeout after 10 seconds
    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) {
        console.warn(`[DirectPublish] ⏰ Timeout for ${relayUrl}`);
        ws.close();
        resolve(false);
      }
    }, 10000);
  });
}

interface OnboardParams {
  newUser: NUser; // NUser instance with signer
  displayName: string;
  about?: string;
  pictureUrl?: string;
  /** One or more initial follows (hex pubkeys) to seed contact list */
  initialFollowHexes?: string[];
  /** @deprecated use initialFollowHexes */
  initialFollowHex?: string;
  recommendedRelays?: string[];
}

/**
 * Enhanced onboarding hook that publishes the proper sequence of events
 * to ensure new accounts are visible on Nostr indexers and clients.
 *
 * Publishes in order:
 * 1. kind 0 (profile metadata) - makes account discoverable
 * 2. kind 3 (contact list) - with at least one follow if provided
 * 3. kind 1 (introductory note) - creates searchable content
 * 4. kind 10002 (relay list) - helps with discoverability
 */
export function useOnboardNewAccount() {
  const { nostr } = useNostr();

  return useCallback(async (params: OnboardParams) => {
  const { newUser, displayName, about, pictureUrl, initialFollowHex, initialFollowHexes, recommendedRelays } = params;

    console.log('[OnboardNewAccount] 🚀 Starting enhanced onboarding sequence for:', newUser.pubkey);

    try {
      // First, let's wait for relay connections to be established
      console.log('[OnboardNewAccount] ⏳ Waiting for relay connections...');

      // Wait up to 10 seconds for at least one relay to connect
      let connectionAttempts = 0;
      const maxAttempts = 20; // 10 seconds total

      while (connectionAttempts < maxAttempts) {
        try {
          // Try a simple query to see if relays are responsive
          const testQuery = await nostr.query([{ kinds: [0], limit: 1 }], {
            signal: AbortSignal.timeout(500)
          });
          console.log('[OnboardNewAccount] ✅ Relays are responsive - found', testQuery.length, 'events');
          break;
        } catch (error) {
          connectionAttempts++;
          if (connectionAttempts < maxAttempts) {
            console.log('[OnboardNewAccount] ⏳ Waiting for relays... attempt', connectionAttempts);
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.warn('[OnboardNewAccount] ⚠️ Proceeding without confirmed relay connection');
          }
        }
      }
      // 1. Publish kind 0 (profile metadata) - CRITICAL for indexer visibility
      const profileMetadata = {
        name: displayName.trim(),
        ...(about && { about: about.trim() }),
        ...(pictureUrl && { picture: pictureUrl }),
        // Note: Users can add their own NIP-05 identifier later in profile settings
      };

      const profileEvent = await newUser.signer.signEvent({
        kind: 0,
        content: JSON.stringify(profileMetadata),
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      });

      try {
        console.log('[OnboardNewAccount] 📤 Publishing profile event with longer timeout...');
        const profileResult = await nostr.event(profileEvent, {
          signal: AbortSignal.timeout(15000) // Increased timeout
        });
        console.log('[OnboardNewAccount] ✅ Published kind 0 (profile)', profileResult);
        console.log('[OnboardNewAccount] 🔍 Profile event details:', {
          id: profileEvent.id,
          pubkey: profileEvent.pubkey,
          content: profileEvent.content
        });

        // Profile event publish is void, so we continue regardless
        console.log('[OnboardNewAccount] ✅ Profile event published successfully');
      } catch (profileError) {
        console.error('[OnboardNewAccount] ❌ Failed to publish profile:', profileError);
        throw profileError;
      }

      // Small delay to ensure proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Publish kind 3 (contact list) - with initial follows if provided
      const contactTags: string[][] = [];
      const combinedFollows = [
        ...(initialFollowHex ? [initialFollowHex] : []),
        ...(initialFollowHexes ?? [])
      ];
      const deduped = Array.from(new Set(
        combinedFollows
          .filter(pk => typeof pk === 'string' && /^[0-9a-f]{64}$/i.test(pk))
          .map(pk => pk.toLowerCase())
      ));
      if (deduped.length > 0) {
        for (const pk of deduped) {
          contactTags.push(['p', pk]);
        }
        console.log('[OnboardNewAccount] 📇 Adding', deduped.length, 'initial follow(s) to contact list');
      }

      const contactListEvent = await newUser.signer.signEvent({
        kind: 3,
        content: '', // Empty content as per NIP-02
        tags: contactTags,
        created_at: Math.floor(Date.now() / 1000),
      });

      try {
        const contactResult = await nostr.event(contactListEvent, { signal: AbortSignal.timeout(8000) });
        console.log('[OnboardNewAccount] ✅ Published kind 3 (contact list) with', contactTags.length, 'follows', contactResult);
        console.log('[OnboardNewAccount] 🔍 Contact list event details:', {
          id: contactListEvent.id,
          pubkey: contactListEvent.pubkey,
          tags: contactListEvent.tags.length
        });

        console.log('[OnboardNewAccount] ✅ Contact list event published successfully');
      } catch (contactError) {
        console.error('[OnboardNewAccount] ❌ Failed to publish contact list:', contactError);
        throw contactError;
      }

      // Small delay to ensure proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Publish kind 1 (introductory note) - CRITICAL for content indexing
      const introNote = `Hello Nostr! 👋

Just joined the decentralized social network from ZapTok. Excited to connect with this amazing community!

#introductions #nostr #zaptok #plebchain`;

      const noteEvent = await newUser.signer.signEvent({
        kind: 1,
        content: introNote,
        tags: [
          ['t', 'introductions'],
          ['t', 'nostr'],
          ['t', 'zaptok'],
          ['t', 'plebchain']
        ],
        created_at: Math.floor(Date.now() / 1000),
      });

      const noteResult = await nostr.event(noteEvent, { signal: AbortSignal.timeout(8000) });
      console.log('[OnboardNewAccount] ✅ Published kind 1 (introductory note)', noteResult);
      console.log('[OnboardNewAccount] 🔍 Note event details:', {
        id: noteEvent.id,
        pubkey: noteEvent.pubkey,
        content: noteEvent.content.substring(0, 50) + '...'
      });

      // Small delay to ensure proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));

      // 4. Publish kind 10002 (recommended relay list) - helps with discoverability
      if (recommendedRelays && recommendedRelays.length > 0) {
        const relayTags = recommendedRelays.map(relay => ['r', relay]);

        const relayListEvent = await newUser.signer.signEvent({
          kind: 10002,
          content: '',
          tags: relayTags,
          created_at: Math.floor(Date.now() / 1000),
        });

        const relayResult = await nostr.event(relayListEvent, { signal: AbortSignal.timeout(8000) });
        console.log('[OnboardNewAccount] ✅ Published kind 10002 (relay list) with', recommendedRelays.length, 'relays', relayResult);
        console.log('[OnboardNewAccount] 🔍 Relay list event details:', {
          id: relayListEvent.id,
          pubkey: relayListEvent.pubkey,
          tags: relayListEvent.tags.length
        });
      }

      console.log('[OnboardNewAccount] 🎉 Enhanced onboarding sequence completed successfully!');
      console.log('[OnboardNewAccount] 💡 Account should be visible on indexers within 1-3 minutes');
      console.log('[OnboardNewAccount] 🔑 Account details:');
      console.log('  Pubkey (hex):', newUser.pubkey);
      console.log('  Npub (bech32):', nip19.npubEncode(newUser.pubkey));
      console.log('  🔍 Search on nostr.band:', `https://nostr.band/${nip19.npubEncode(newUser.pubkey)}`);
      console.log('  🔍 Search on Primal:', `https://primal.net/p/${nip19.npubEncode(newUser.pubkey)}`);

      // Let's try a more direct approach to verify relay publishing
      console.log('[OnboardNewAccount] 🧪 Testing direct relay publish...');

      try {
        // Create a simple test event to verify basic publishing works
        const testEvent = await newUser.signer.signEvent({
          kind: 1,
          content: `Test event from ZapTok onboarding - ${Date.now()}`,
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
        });

        console.log('[OnboardNewAccount] 🧪 Test event created:', testEvent.id);
        console.log('[OnboardNewAccount] 🧪 Test event details:', {
          kind: testEvent.kind,
          pubkey: testEvent.pubkey,
          created_at: testEvent.created_at,
          content: testEvent.content,
          sig: testEvent.sig ? 'present' : 'missing'
        });

        const testResult = await nostr.event(testEvent, { signal: AbortSignal.timeout(10000) });
        console.log('[OnboardNewAccount] 🧪 Test event publish result:', testResult);
        console.log('[OnboardNewAccount] 🧪 Result type:', typeof testResult, 'Is array:', Array.isArray(testResult));

        // Test event published successfully
        console.log('[OnboardNewAccount] 🧪 Test event published via Nostrify');

        // Wait a moment then try to query it back
        console.log('[OnboardNewAccount] 🧪 Waiting 3 seconds then querying back...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const testQuery = await nostr.query([{
          kinds: [1],
          authors: [newUser.pubkey],
          ids: [testEvent.id],
          limit: 1
        }], { signal: AbortSignal.timeout(5000) });

        console.log('[OnboardNewAccount] 🧪 Test query result:', testQuery.length, 'events found');

        if (testQuery.length > 0) {
          console.log('[OnboardNewAccount] ✅ Basic relay publishing is working!');
          console.log('[OnboardNewAccount] 🧪 Retrieved event:', testQuery[0].id);
        } else {
          console.log('[OnboardNewAccount] ❌ Events are not being stored/retrieved properly');

          // Let's try a broader query to see if ANY events from this user exist
          const broadQuery = await nostr.query([{
            authors: [newUser.pubkey],
            limit: 10
          }], { signal: AbortSignal.timeout(5000) });

          console.log('[OnboardNewAccount] 🧪 Broad query result:', broadQuery.length, 'total events for this pubkey');
        }

      } catch (testError) {
        console.error('[OnboardNewAccount] ❌ Test publishing failed:', testError);
      }

      try {
        const verificationResults = await Promise.allSettled([
          // Verify profile event
          nostr.query([{
            kinds: [0],
            authors: [newUser.pubkey],
            limit: 1
          }], { signal: AbortSignal.timeout(5000) }),

          // Verify contact list
          nostr.query([{
            kinds: [3],
            authors: [newUser.pubkey],
            limit: 1
          }], { signal: AbortSignal.timeout(5000) }),

          // Verify introductory note
          nostr.query([{
            kinds: [1],
            authors: [newUser.pubkey],
            limit: 1
          }], { signal: AbortSignal.timeout(5000) }),

          // Verify relay list
          nostr.query([{
            kinds: [10002],
            authors: [newUser.pubkey],
            limit: 1
          }], { signal: AbortSignal.timeout(5000) })
        ]);

        const [profileQuery, contactQuery, noteQuery, relayQuery] = verificationResults;

        console.log('[OnboardNewAccount] 📊 Verification results:');
        console.log('  Profile (kind 0):', profileQuery.status === 'fulfilled' ? `✅ Found ${profileQuery.value.length} events` : `❌ Failed: ${profileQuery.reason}`);
        console.log('  Contact List (kind 3):', contactQuery.status === 'fulfilled' ? `✅ Found ${contactQuery.value.length} events` : `❌ Failed: ${contactQuery.reason}`);
        console.log('  Note (kind 1):', noteQuery.status === 'fulfilled' ? `✅ Found ${noteQuery.value.length} events` : `❌ Failed: ${noteQuery.reason}`);
        console.log('  Relay List (kind 10002):', relayQuery.status === 'fulfilled' ? `✅ Found ${relayQuery.value.length} events` : `❌ Failed: ${relayQuery.reason}`);

        // Check if at least the profile and note are visible
        const profileVisible = profileQuery.status === 'fulfilled' && profileQuery.value.length > 0;
        const noteVisible = noteQuery.status === 'fulfilled' && noteQuery.value.length > 0;

        if (profileVisible && noteVisible) {
          console.log('[OnboardNewAccount] ✅ Account verification successful - events are visible on relays!');
        } else {
          console.warn('[OnboardNewAccount] ⚠️ Some events may not be immediately visible - this is normal and they should appear within 1-3 minutes');
        }

      } catch (verificationError) {
        console.warn('[OnboardNewAccount] ⚠️ Verification check failed (this is normal):', verificationError);
      }

      return {
        success: true,
        profileEventId: profileEvent.id,
        contactListEventId: contactListEvent.id,
        noteEventId: noteEvent.id,
        pubkey: newUser.pubkey,
        npub: nip19.npubEncode(newUser.pubkey),
        recommendedVerification: [
          `Search for npub on nostr.band in 2-3 minutes: ${nip19.npubEncode(newUser.pubkey)}`,
          `Check profile visibility on Primal.net`,
          `Verify introductory note appears in feeds`,
          `Manual verification: Go to https://nostr.band and paste the npub above`
        ]
      };

    } catch (error) {
      console.error('[OnboardNewAccount] ❌ Enhanced onboarding failed:', error);
      throw new Error(`Onboarding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [nostr]);
}