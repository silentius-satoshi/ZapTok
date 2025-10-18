#!/usr/bin/env node

/**
 * Check Video Events
 * 
 * This script queries all configured relays to find your published video events
 * and shows which relays have them stored.
 */

import { SimplePool, nip19 } from 'nostr-tools';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Default relays to check
const DEFAULT_RELAYS = [
  'wss://relay.chorus.community',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.mostr.pub',
  'wss://purplepag.es',
];

async function checkVideoEvents() {
  console.log('\n🎥 Video Event Checker\n');
  console.log('This tool checks which relays have your video events stored.\n');
  
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

  console.log(`\n🔍 Checking relays for video events from: ${pubkey.slice(0, 8)}...\n`);

  const pool = new SimplePool();
  const relaysToCheck = DEFAULT_RELAYS;

  console.log(`📡 Querying ${relaysToCheck.length} relays...\n`);

  // Query each relay individually to see which ones have the events
  const relayResults = {};

  for (const relay of relaysToCheck) {
    console.log(`Checking ${relay}...`);
    
    try {
      const events = await new Promise((resolve, reject) => {
        const collected = [];
        const timeout = setTimeout(() => {
          sub.close();
          resolve(collected);
        }, 5000);

        const sub = pool.subscribeMany(
          [relay],
          [
            {
              kinds: [21, 22], // NIP-71 video events
              authors: [pubkey],
              limit: 50
            }
          ],
          {
            onevent(event) {
              collected.push(event);
            },
            oneose() {
              clearTimeout(timeout);
              sub.close();
              resolve(collected);
            },
            onclose() {
              clearTimeout(timeout);
              resolve(collected);
            }
          }
        );
      });

      relayResults[relay] = events;
      console.log(`  ✅ Found ${events.length} video events\n`);
    } catch (error) {
      console.log(`  ❌ Failed to connect: ${error.message}\n`);
      relayResults[relay] = [];
    }
  }

  // Display summary
  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('📊 SUMMARY\n');

  const allEvents = Object.values(relayResults).flat();
  const uniqueEvents = [...new Map(allEvents.map(e => [e.id, e])).values()];

  console.log(`Total unique video events found: ${uniqueEvents.length}\n`);

  if (uniqueEvents.length > 0) {
    console.log('Events by relay:\n');
    
    for (const [relay, events] of Object.entries(relayResults)) {
      const relayName = new URL(relay).hostname.replace('relay.', '');
      console.log(`  ${relayName.padEnd(20)} ${events.length} events`);
    }

    console.log('\n\nMost recent video events:\n');
    
    const sorted = uniqueEvents.sort((a, b) => b.created_at - a.created_at);
    sorted.slice(0, 5).forEach((event, i) => {
      const date = new Date(event.created_at * 1000);
      const kind = event.kind === 21 ? 'Normal Video' : 'Short Video';
      const title = event.tags.find(([t]) => t === 'title')?.[1] || 'Untitled';
      const url = event.tags.find(([t]) => t === 'url')?.[1] || 'No URL';
      
      const relaysWithThis = Object.entries(relayResults)
        .filter(([_, events]) => events.some(e => e.id === event.id))
        .map(([relay]) => new URL(relay).hostname.replace('relay.', ''));
      
      console.log(`${i + 1}. ${kind} - "${title}"`);
      console.log(`   ID: ${event.id.slice(0, 16)}...`);
      console.log(`   Published: ${date.toLocaleString()}`);
      console.log(`   Stored on: ${relaysWithThis.join(', ')}`);
      console.log(`   Video URL: ${url.slice(0, 60)}${url.length > 60 ? '...' : ''}`);
      console.log('');
    });

    // Check if events are on all relays
    const eventsNotOnAllRelays = uniqueEvents.filter(event => {
      const relayCount = Object.values(relayResults).filter(events => 
        events.some(e => e.id === event.id)
      ).length;
      return relayCount < relaysToCheck.length;
    });

    if (eventsNotOnAllRelays.length > 0) {
      console.log('\n⚠️  WARNING: Some events are not stored on all relays!');
      console.log(`   ${eventsNotOnAllRelays.length} events are missing from one or more relays.\n`);
      console.log('   This explains why they might not appear in the global feed.');
      console.log('   The global feed may query different relays than where your events are stored.\n');
    } else {
      console.log('\n✅ All events are replicated across all checked relays.\n');
    }

  } else {
    console.log('❌ No video events found on any relay.\n');
    console.log('Possible reasons:');
    console.log('  • Events were published to different relays not in the default list');
    console.log('  • Events were recently published and haven\'t propagated yet');
    console.log('  • The pubkey is incorrect\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  pool.close(relaysToCheck);
  rl.close();
}

checkVideoEvents().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
