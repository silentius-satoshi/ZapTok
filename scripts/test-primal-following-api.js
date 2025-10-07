#!/usr/bin/env node

/**
 * Test script to check if Primal exposes a public following list API
 * 
 * Usage: node scripts/test-primal-following-api.js
 */

import WebSocket from 'ws';

// Test Odell's pubkey
const ODELL_PUBKEY = '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9';

// Primal's public cache endpoint
const PRIMAL_CACHE_URL = 'wss://cache1.primal.net/v1';

console.log('🔍 Testing Primal Following List API...\n');
console.log(`Endpoint: ${PRIMAL_CACHE_URL}`);
console.log(`Testing pubkey: ${ODELL_PUBKEY} (Odell)\n`);

const ws = new WebSocket(PRIMAL_CACHE_URL);

let followingCount = 0;

ws.on('open', () => {
  console.log('✅ Connected to Primal cache\n');
  
  // Request user following list
  // Try different possible endpoint names
  const endpoints = [
    "user_follows",
    "contact_list", 
    "user_contacts",
    "follows"
  ];
  
  const endpoint = endpoints[0]; // Try first one
  
  const request = [
    "REQ",
    "following_test",
    {
      "cache": [
        endpoint,
        { 
          "pubkey": ODELL_PUBKEY,
          "limit": 1000  // Primal's maximum limit
        }
      ]
    }
  ];
  
  console.log(`📤 Sending request with endpoint "${endpoint}":`, JSON.stringify(request, null, 2));
  ws.send(JSON.stringify(request));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    
    // Log ALL messages to see what we get
    console.log('\n📥 Received message:', JSON.stringify(msg, null, 2));
    
    // Check for user following response (kind 10000107)
    if (msg[0] === 'EVENT' && msg[2]?.kind === 10000107) {
      const content = JSON.parse(msg[2].content);
      
      console.log('\n📥 FOLLOWING LIST EVENT (kind 10000107):');
      
      if (content.pubkey_infos && Array.isArray(content.pubkey_infos)) {
        followingCount += content.pubkey_infos.length;
        
        console.log(`   Found ${content.pubkey_infos.length} following in this batch`);
        console.log(`   Total so far: ${followingCount}`);
        
        // Show first 3 examples
        const examples = content.pubkey_infos.slice(0, 3);
        console.log('\n   Example following:');
        examples.forEach((info, i) => {
          const metadata = info.metadata ? JSON.parse(info.metadata) : {};
          const name = metadata.display_name || metadata.name || 'Unknown';
          console.log(`   ${i + 1}. ${name} (${info.pubkey.slice(0, 16)}...)`);
        });
      }
    }
    
    // Close on EOSE
    if (msg[0] === 'EOSE') {
      console.log('\n✅ End of stored events');
      console.log(`\n🎉 TOTAL FOLLOWING COUNT: ${followingCount} ✅\n`);
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
  console.log('🔌 Connection closed\n');
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('\n⏱️  Timeout reached, closing connection');
  console.log(`Final count: ${followingCount}\n`);
  ws.close();
  process.exit(0);
}, 15000);
