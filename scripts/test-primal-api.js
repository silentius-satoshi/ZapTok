#!/usr/bin/env node

/**
 * Test script to check if Primal exposes a public follower count API
 * 
 * Usage: node scripts/test-primal-api.js
 */

import WebSocket from 'ws';

// Test Odell's pubkey from your earlier example
const ODELL_PUBKEY = '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9';

// Try Primal's public cache endpoint
const PRIMAL_CACHE_URL = 'wss://cache1.primal.net/v1';

console.log('🔍 Testing Primal WebSocket API...\n');
console.log(`Endpoint: ${PRIMAL_CACHE_URL}`);
console.log(`Testing pubkey: ${ODELL_PUBKEY} (Odell)\n`);

const ws = new WebSocket(PRIMAL_CACHE_URL);

ws.on('open', () => {
  console.log('✅ Connected to Primal cache\n');
  
  // Request user profile (includes follower count)
  const request = [
    "REQ",
    "follower_test",
    {
      "cache": [
        "user_profile",
        { "pubkey": ODELL_PUBKEY }
      ]
    }
  ];
  
  console.log('📤 Sending request:', JSON.stringify(request, null, 2));
  ws.send(JSON.stringify(request));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('\n📥 Received message:', JSON.stringify(msg, null, 2));
    
    // Check for follower count response (kind 10000133)
    if (msg[0] === 'EVENT' && msg[2]?.kind === 10000133) {
      const content = JSON.parse(msg[2].content);
      console.log('\n🎉 FOLLOWER COUNT FOUND:');
      console.log(`   Pubkey: ${Object.keys(content)[0]}`);
      console.log(`   Followers: ${Object.values(content)[0]}`);
    }
    
    // Check for user profile (kind 10000105)
    if (msg[0] === 'EVENT' && msg[2]?.kind === 10000105) {
      const profile = JSON.parse(msg[2].content);
      console.log('\n👤 USER PROFILE:');
      console.log(`   👥 Followers: ${profile.followers_count?.toLocaleString()} ✅`);
      console.log(`   👤 Following: ${profile.follows_count?.toLocaleString()} ✅`);
      console.log(`   📝 Notes: ${profile.note_count?.toLocaleString()}`);
    }
    
    // Close on EOSE
    if (msg[0] === 'EOSE') {
      console.log('\n✅ End of stored events\n');
      ws.close();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error parsing message:', err);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 Connection closed\n');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏱️  Timeout reached, closing connection\n');
  ws.close();
  process.exit(0);
}, 10000);
