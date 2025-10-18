#!/usr/bin/env node

/**
 * Check User's NIP-65 Relay List
 * 
 * This script fetches your NIP-65 relay list (kind 10002) to see
 * which relays you're configured to read from and write to.
 */

import { SimplePool } from '@nostr/tools/pool';
import { nip19 } from '@nostr/tools';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Relays to check for kind 10002 events
const BOOTSTRAP_RELAYS = [
  'wss://relay.chorus.community',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://purplepag.es',
];

async function checkRelayList() {
  console.log('\n📋 NIP-65 Relay List Checker\n');
  console.log('This tool checks your configured read/write relays.\n');
  
  // Get user's npub or hex pubkey
  const pubkeyInput = await question('Enter your npub or hex pubkey: ');
  
  let pubkey;
  try {
    if (pubkeyInput.startsWith('npub')) {
      const decoded = nip19.decode(pubkeyInput);
      pubkey = decoded.data;
    } else {
      pubkey = pubkeyInput.trim();
    }
  } catch (error) {
    console.error('❌ Invalid pubkey format');
    rl.close();
    return;
  }

  console.log(`\n🔍 Checking for NIP-65 relay list from: ${pubkey.slice(0, 8)}...\n`);

  const pool = new SimplePool();

  console.log(`📡 Querying ${BOOTSTRAP_RELAYS.length} bootstrap relays...\n`);

  try {
    const events = await new Promise((resolve, reject) => {
      const collected = [];
      const timeout = setTimeout(() => {
        resolve(collected);
      }, 10000);

      const sub = pool.subscribeMany(
        BOOTSTRAP_RELAYS,
        [
          {
            kinds: [10002], // NIP-65 relay list
            authors: [pubkey],
            limit: 1
          }
        ],
        {
          onevent: (event) => {
            collected.push(event);
          },
          oneose: () => {
            clearTimeout(timeout);
            resolve(collected);
          }
        }
      );
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('📊 RESULTS\n');

    if (events.length === 0) {
      console.log('❌ No NIP-65 relay list found.\n');
      console.log('This means you are using the DEFAULT relay configuration:');
      console.log('  • relay.chorus.community');
      console.log('  • relay.nostr.band');
      console.log('  • relay.damus.io');
      console.log('  • relay.primal.net\n');
      console.log('💡 Your video events SHOULD be published to these relays.\n');
    } else {
      // Get most recent relay list
      const relayList = events.sort((a, b) => b.created_at - a.created_at)[0];
      const date = new Date(relayList.created_at * 1000);
      
      console.log(`✅ NIP-65 Relay List Found\n`);
      console.log(`Published: ${date.toLocaleString()}\n`);

      // Parse relay tags
      const readRelays = [];
      const writeRelays = [];
      const readWriteRelays = [];

      for (const tag of relayList.tags) {
        if (tag[0] === 'r') {
          const url = tag[1];
          const marker = tag[2];

          if (marker === 'read') {
            readRelays.push(url);
          } else if (marker === 'write') {
            writeRelays.push(url);
          } else if (!marker) {
            // No marker means both read and write
            readWriteRelays.push(url);
          }
        }
      }

      console.log('📖 READ Relays:');
      if (readRelays.length === 0 && readWriteRelays.length === 0) {
        console.log('  (none configured - using write relays for reading)\n');
      } else {
        [...readWriteRelays, ...readRelays].forEach(url => {
          console.log(`  • ${url}`);
        });
        console.log('');
      }

      console.log('✍️  WRITE Relays (where your events are published):');
      if (writeRelays.length === 0 && readWriteRelays.length === 0) {
        console.log('  (none configured - using defaults)\n');
      } else {
        [...readWriteRelays, ...writeRelays].forEach(url => {
          console.log(`  • ${url}`);
        });
        console.log('');
      }

      const allWriteRelays = [...readWriteRelays, ...writeRelays];
      
      console.log('🎥 WHERE YOUR VIDEO EVENTS ARE PUBLISHED:\n');
      if (allWriteRelays.length > 0) {
        allWriteRelays.forEach(url => {
          console.log(`  ✓ ${url}`);
        });
        console.log('');
        
        // Check if write relays overlap with defaults
        const defaultRelays = [
          'wss://relay.chorus.community',
          'wss://relay.nostr.band',
          'wss://relay.damus.io',
          'wss://relay.primal.net',
        ];
        
        const overlapping = allWriteRelays.filter(url => 
          defaultRelays.some(d => d === url)
        );
        
        if (overlapping.length === 0) {
          console.log('⚠️  WARNING: Your write relays DO NOT overlap with the default relays!');
          console.log('   This is why your videos don\'t appear in the global feed.\n');
          console.log('   The global feed queries these relays:');
          defaultRelays.forEach(url => console.log(`     • ${url}`));
          console.log('\n   But your events are published to:');
          allWriteRelays.forEach(url => console.log(`     • ${url}`));
          console.log('');
        } else {
          console.log(`✅ ${overlapping.length} of your write relays overlap with defaults.\n`);
        }
      } else {
        console.log('  (Using default relays)\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Error:', error);
  }

  pool.close(BOOTSTRAP_RELAYS);
  rl.close();
}

checkRelayList().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
