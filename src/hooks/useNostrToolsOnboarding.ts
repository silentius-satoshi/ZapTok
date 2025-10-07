import { useCallback } from 'react';
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from '@nostr/tools/pure';
import { SimplePool } from '@nostr/tools/pool';
import * as nip19 from '@nostr/tools/nip19';
import { bytesToHex } from '@noble/hashes/utils';
import type { Event as NostrEvent } from '@nostr/tools';

interface OnboardParams {
  displayName: string;
  about?: string;
  pictureUrl?: string;
  initialFollowHexes?: string[];
}

interface OnboardResult {
  success: boolean;
  secretKey: Uint8Array;
  publicKey: string;
  npub: string;
  events: {
    profile: NostrEvent;
    contactList: NostrEvent;
    introNote: NostrEvent;
    relayList: NostrEvent;
  };
}

export function useNostrToolsOnboarding() {
  return useCallback(async (params: OnboardParams): Promise<OnboardResult> => {
    const { displayName, about, pictureUrl, initialFollowHexes = [] } = params;

    console.log('[NostrTools] 🚀 Starting onboarding with nostr-tools...');

    // Generate new keypair
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const npub = nip19.npubEncode(pk);
    const skHex = bytesToHex(sk);

    console.log('[NostrTools] 🔑 Generated keypair:');
    console.log('  Pubkey (hex):', pk);
    console.log('  Npub:', npub);
    console.log('  Secret key (hex):', skHex);

    const timestamp = Math.floor(Date.now() / 1000);
    const relays = [
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://relay.nostr.band',
      'wss://relay.chorus.community'
    ];

    try {
      // Create SimplePool for publishing
      const pool = new SimplePool();

      // 1. Create kind 0 (profile) event
      const profileMetadata = {
        name: displayName.trim(),
        ...(about && { about: about.trim() }),
        ...(pictureUrl && { picture: pictureUrl }),
        // Note: Users can add their own NIP-05 identifier later in profile settings
      };

      const profileEvent = finalizeEvent({
        kind: 0,
        created_at: timestamp,
        tags: [],
        content: JSON.stringify(profileMetadata),
      }, sk);

      console.log('[NostrTools] 📝 Created profile event:', profileEvent.id);
      console.log('[NostrTools] ✅ Profile event verified:', verifyEvent(profileEvent));

      // 2. Create kind 3 (contact list) event
      const contactTags: string[][] = [];
      
      // Add notable follows for discovery
      const notableFollows = [
        '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2', // jack
        '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9', // ODELL
        'e18911f83fb022aa36dd5f20e2cb688eda92fcf5af746ae5a8b9cd3471a11c8c', // Gigi
      ];

      const combinedFollows = [...notableFollows, ...initialFollowHexes];
      const deduped = Array.from(new Set(
        combinedFollows
          .filter(pk => typeof pk === 'string' && /^[0-9a-f]{64}$/i.test(pk))
          .map(pk => pk.toLowerCase())
      ));

      for (const pubkey of deduped) {
        contactTags.push(['p', pubkey]);
      }

      const contactListEvent = finalizeEvent({
        kind: 3,
        created_at: timestamp + 1,
        tags: contactTags,
        content: '',
      }, sk);

      console.log('[NostrTools] 📇 Created contact list event:', contactListEvent.id);
      console.log('[NostrTools] ✅ Contact list event verified:', verifyEvent(contactListEvent));
      console.log('[NostrTools] 📊 Following', deduped.length, 'accounts');

      // 3. Create kind 1 (introductory note) event
      const introContent = `Hello Nostr! 👋

Just joined the decentralized social network through ZapTok. Excited to connect with the community!

#introductions #nostr #zaptok`;

      const introNoteEvent = finalizeEvent({
        kind: 1,
        created_at: timestamp + 2,
        tags: [
          ['t', 'introductions'],
          ['t', 'nostr'],
          ['t', 'zaptok']
        ],
        content: introContent,
      }, sk);

      console.log('[NostrTools] 💬 Created intro note event:', introNoteEvent.id);
      console.log('[NostrTools] ✅ Intro note event verified:', verifyEvent(introNoteEvent));

      // 4. Create kind 10002 (relay list) event
      const relayTags = relays.map(relay => ['r', relay, 'read,write']);

      const relayListEvent = finalizeEvent({
        kind: 10002,
        created_at: timestamp + 3,
        tags: relayTags,
        content: '',
      }, sk);

      console.log('[NostrTools] 🔗 Created relay list event:', relayListEvent.id);
      console.log('[NostrTools] ✅ Relay list event verified:', verifyEvent(relayListEvent));

      // 5. Publish all events to relays
      console.log('[NostrTools] 📤 Publishing events to', relays.length, 'relays...');

      const publishResults = await Promise.allSettled([
        pool.publish(relays, profileEvent),
        pool.publish(relays, contactListEvent), 
        pool.publish(relays, introNoteEvent),
        pool.publish(relays, relayListEvent),
      ]);

      console.log('[NostrTools] 📊 Publish results:');
      publishResults.forEach((result, index) => {
        const eventTypes = ['Profile', 'Contact List', 'Intro Note', 'Relay List'];
        if (result.status === 'fulfilled') {
          console.log(`  ${eventTypes[index]}: ✅ Published successfully`);
        } else {
          console.log(`  ${eventTypes[index]}: ❌ Failed:`, result.reason);
        }
      });

      // 6. Wait a moment then verify events are queryable
      console.log('[NostrTools] 🔍 Waiting 3 seconds then verifying events...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const verificationEvents = await pool.querySync(relays, {
          authors: [pk],
          kinds: [0, 1, 3, 10002],
          limit: 10
        });

        console.log('[NostrTools] 📊 Verification: Found', verificationEvents.length, 'events');
        const kinds = verificationEvents.map(e => e.kind);
        console.log('[NostrTools] 📊 Event kinds found:', kinds);

        if (verificationEvents.length > 0) {
          console.log('[NostrTools] ✅ Events are queryable - account should be visible on external clients!');
        } else {
          console.log('[NostrTools] ⚠️ Events not immediately queryable, but this may be normal');
        }

      } catch (verifyError) {
        console.warn('[NostrTools] ⚠️ Verification query failed:', verifyError);
      }

      // Clean up pool
      pool.close(relays);

      console.log('[NostrTools] 🎉 Onboarding completed successfully!');
      console.log('[NostrTools] 🔍 Search URLs:');
      console.log(`  nostr.band: https://nostr.band/${npub}`);
      console.log(`  Primal: https://primal.net/p/${npub}`);

      return {
        success: true,
        secretKey: sk,
        publicKey: pk,
        npub,
        events: {
          profile: profileEvent,
          contactList: contactListEvent,
          introNote: introNoteEvent,
          relayList: relayListEvent,
        }
      };

    } catch (error) {
      console.error('[NostrTools] ❌ Onboarding failed:', error);
      throw error;
    }
  }, []);
}