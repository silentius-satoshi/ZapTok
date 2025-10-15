#!/usr/bin/env node

/**
 * NIP-05 Domain Verification Test Script
 * 
 * This script tests the NIP-05 domain verification setup to ensure it's working correctly.
 * It performs comprehensive checks on the /.well-known/nostr.json endpoint and validates
  console.log  console.log('5. Developer console test:');
  console.log('   ```javascript');
  console.log('   fetch("https://zaptok.social/.well-known/nostr.json")');
  console.log('     .then(r => r.json())');
  console.log('     .then(console.log)');
  console.log('   ```');rowser test:');
  console.log(`   Visit: https://${DOMAIN}/.well-known/nostr.json`);
  console.log('   Should return valid JSON without errors');
  console.log('');
  console.log('5. Developer console test:');
  console.log('   ```javascript');
  console.log('   fetch("https://zaptok.social/.well-known/nostr.json")');
  console.log('     .then(r => r.json())');
  console.log('     .then(console.log)');
  console.log('   ```');a according to NIP-05 specifications.
 */

import { nip05 } from 'nostr-tools';
import fetch from 'node-fetch';

// Test configuration
const DOMAIN = 'zaptok.social';
const TEST_IDENTIFIERS = [
  { username: '_', expectedPubkey: '3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d' },
  // Add more test users as they are created
];

const TIMEOUT = 10000; // 10 seconds timeout

async function testNip05Endpoint() {
  console.log('🔍 NIP-05 Domain Verification Test');
  console.log('================================');
  console.log(`Testing domain: ${DOMAIN}`);
  console.log('');

  let allTestsPassed = true;

  // Test 1: Basic endpoint accessibility
  console.log('📡 Test 1: Endpoint Accessibility');
  console.log('--------------------------------');
  
  try {
    const url = `https://${DOMAIN}/.well-known/nostr.json`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      timeout: TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZapTok-NIP05-Verifier/1.0'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.log('❌ Endpoint not accessible');
      allTestsPassed = false;
      return;
    }

    const rawData = await response.text();
    console.log(`Response size: ${rawData.length} bytes`);
    console.log('✅ Endpoint is accessible');
    console.log('');

    // Test 2: JSON parsing and structure validation
    console.log('📋 Test 2: JSON Structure Validation');
    console.log('-----------------------------------');
    
    let data;
    try {
      data = JSON.parse(rawData);
      console.log('✅ Valid JSON format');
    } catch (error) {
      console.log('❌ Invalid JSON format:', error.message);
      allTestsPassed = false;
      return;
    }

    // Validate required structure
    if (!data.names || typeof data.names !== 'object') {
      console.log('❌ Missing or invalid "names" field');
      allTestsPassed = false;
    } else {
      console.log('✅ "names" field present and valid');
    }

    if (data.relays && typeof data.relays !== 'object') {
      console.log('❌ Invalid "relays" field (should be object or absent)');
      allTestsPassed = false;
    } else {
      console.log('✅ "relays" field valid or absent');
    }

    console.log(`Found ${Object.keys(data.names || {}).length} name mappings`);
    console.log(`Found ${Object.keys(data.relays || {}).length} relay mappings`);
    console.log('');

    // Test 3: Individual identifier verification
    console.log('🔑 Test 3: Identifier Verification');
    console.log('----------------------------------');

    for (const { username, expectedPubkey } of TEST_IDENTIFIERS) {
      console.log(`Testing: ${username}@${DOMAIN}`);
      
      // Test with query parameter
      const queryUrl = `https://${DOMAIN}/.well-known/nostr.json?name=${encodeURIComponent(username)}`;
      console.log(`Query URL: ${queryUrl}`);
      
      try {
        const queryResponse = await fetch(queryUrl, {
          timeout: TIMEOUT,
          headers: { 'Accept': 'application/json' }
        });

        if (!queryResponse.ok) {
          console.log(`❌ Query failed: ${queryResponse.status}`);
          allTestsPassed = false;
          continue;
        }

        const queryData = await queryResponse.json();
        const foundPubkey = queryData.names?.[username];

        if (!foundPubkey) {
          console.log(`❌ No pubkey found for username: ${username}`);
          allTestsPassed = false;
          continue;
        }

        if (foundPubkey !== expectedPubkey) {
          console.log(`❌ Pubkey mismatch for ${username}`);
          console.log(`   Expected: ${expectedPubkey}`);
          console.log(`   Found:    ${foundPubkey}`);
          allTestsPassed = false;
          continue;
        }

        console.log(`✅ ${username}@${DOMAIN} -> ${foundPubkey.slice(0, 16)}...`);

        // Test using nostr-tools verification
        try {
          const profile = await nip05.queryProfile(`${username}@${DOMAIN}`);
          if (profile?.pubkey === expectedPubkey) {
            console.log(`✅ nostr-tools verification passed for ${username}`);
          } else {
            console.log(`❌ nostr-tools verification failed for ${username}`);
            console.log(`   Expected: ${expectedPubkey}`);
            console.log(`   Got:      ${profile?.pubkey || 'null'}`);
            allTestsPassed = false;
          }
        } catch (error) {
          console.log(`❌ nostr-tools verification error for ${username}:`, error.message);
          allTestsPassed = false;
        }

      } catch (error) {
        console.log(`❌ Network error testing ${username}:`, error.message);
        allTestsPassed = false;
      }
      
      console.log('');
    }

    // Test 4: Relay discovery
    console.log('🌐 Test 4: Relay Discovery');
    console.log('-------------------------');

    if (data.relays) {
      for (const [pubkey, relays] of Object.entries(data.relays)) {
        console.log(`Pubkey: ${pubkey.slice(0, 16)}...`);
        console.log(`Relays: ${Array.isArray(relays) ? relays.join(', ') : 'Invalid format'}`);
        
        if (!Array.isArray(relays)) {
          console.log('❌ Relays should be an array');
          allTestsPassed = false;
        } else {
          // Validate relay URLs
          for (const relay of relays) {
            if (typeof relay !== 'string' || (!relay.startsWith('wss://') && !relay.startsWith('ws://'))) {
              console.log(`❌ Invalid relay URL: ${relay}`);
              allTestsPassed = false;
            }
          }
          console.log(`✅ ${relays.length} relay(s) configured`);
        }
        console.log('');
      }
    } else {
      console.log('ℹ️  No relay mappings configured (optional)');
      console.log('');
    }

    // Test 5: Cross-verification
    console.log('🔄 Test 5: Cross-verification');
    console.log('-----------------------------');

    for (const { username, expectedPubkey } of TEST_IDENTIFIERS) {
      try {
        // Verify that the pubkey matches what we expect
        const isValid = await nip05.isValid(expectedPubkey, `${username}@${DOMAIN}`);
        if (isValid) {
          console.log(`✅ Cross-verification passed for ${username}@${DOMAIN}`);
        } else {
          console.log(`❌ Cross-verification failed for ${username}@${DOMAIN}`);
          allTestsPassed = false;
        }
      } catch (error) {
        console.log(`❌ Cross-verification error for ${username}:`, error.message);
        allTestsPassed = false;
      }
    }

  } catch (error) {
    console.log('❌ Network error:', error.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('');
  console.log('📊 Test Summary');
  console.log('===============');
  
  if (allTestsPassed) {
    console.log('🎉 All tests passed! NIP-05 verification is working correctly.');
    console.log('');
    console.log('✨ Your domain verification setup is ready for use.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Users can now set NIP-05 identifiers like username@zaptok.social');
    console.log('2. Other Nostr clients will show verified checkmarks');
    console.log('3. Consider adding more usernames to the nostr.json file');
  } else {
    console.log('❌ Some tests failed. Please check the issues above.');
    console.log('');
    console.log('Common issues:');
    console.log('- Domain not serving /.well-known/nostr.json correctly');
    console.log('- CORS headers missing');
    console.log('- Invalid JSON format');
    console.log('- Incorrect pubkey mappings');
    process.exit(1);
  }
}

// Manual verification instructions
function printManualVerificationInstructions() {
  console.log('');
  console.log('🔧 Manual Verification Steps');
  console.log('============================');
  console.log('');
  console.log('1. Check the endpoint directly:');
  console.log(`   curl -s https://${DOMAIN}/.well-known/nostr.json | jq`);
  console.log('');
  console.log('2. Test in other Nostr clients:');
  console.log('   - Primal.net: Search for your NIP-05 identifier');
  console.log('   - Snort.social: Check if verified badge appears');
  console.log('   - Damus: Look for verification checkmark');
  console.log('');
  console.log('3. Browser test:');
  console.log(`   Visit: https://${DOMAIN}/.well-known/nostr.json`);
  console.log('   Should return valid JSON without errors');
  console.log('');
  console.log('4. Developer console test:');
  console.log('   ```javascript');
  console.log('   fetch("https://zaptok.app/.well-known/nostr.json")');
  console.log('     .then(r => r.json())');
  console.log('     .then(console.log)');
  console.log('   ```');
}

// Run the tests
testNip05Endpoint()
  .then(() => {
    printManualVerificationInstructions();
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });
