#!/usr/bin/env node

/**
 * Simple NIP-05 Domain Verification Test
 * Tests the /.well-known/nostr.json endpoint
 */

// Test configuration
const DOMAIN = 'zaptok.social';
const TEST_USERNAME = '_';
const EXPECTED_PUBKEY = '3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d';

async function testNip05Setup() {
  console.log('🔍 NIP-05 Domain Verification Test');
  console.log('================================');
  console.log(`Testing domain: ${DOMAIN}`);
  console.log('');

  try {
    // Test 1: Basic endpoint test
    console.log('📡 Test 1: Basic Endpoint Access');
    const url = `https://${DOMAIN}/.well-known/nostr.json`;
    console.log(`Fetching: ${url}`);

    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log('❌ Endpoint not accessible');
      if (response.status === 404) {
        console.log('   The /.well-known/nostr.json file might not be deployed');
      }
      return false;
    }

    const data = await response.json();
    console.log('✅ Endpoint accessible and returns JSON');
    console.log('');

    // Test 2: Structure validation
    console.log('📋 Test 2: JSON Structure');
    console.log('Raw response:', JSON.stringify(data, null, 2));

    if (!data.names) {
      console.log('❌ Missing "names" field');
      return false;
    }

    console.log(`✅ Found ${Object.keys(data.names).length} name mappings`);
    if (data.relays) {
      console.log(`✅ Found ${Object.keys(data.relays).length} relay mappings`);
    }
    console.log('');

    // Test 3: Specific mapping test
    console.log('🔑 Test 3: Specific Mapping');
    const foundPubkey = data.names[TEST_USERNAME];
    
    if (!foundPubkey) {
      console.log(`❌ No mapping found for username: ${TEST_USERNAME}`);
      return false;
    }

    if (foundPubkey !== EXPECTED_PUBKEY) {
      console.log(`❌ Pubkey mismatch for ${TEST_USERNAME}`);
      console.log(`   Expected: ${EXPECTED_PUBKEY}`);
      console.log(`   Found:    ${foundPubkey}`);
      return false;
    }

    console.log(`✅ Mapping verified: ${TEST_USERNAME}@${DOMAIN} -> ${foundPubkey.slice(0, 16)}...`);
    console.log('');

    // Test 4: Query parameter test
    console.log('🔍 Test 4: Query Parameter Support');
    const queryUrl = `${url}?name=${TEST_USERNAME}`;
    console.log(`Testing: ${queryUrl}`);

    const queryResponse = await fetch(queryUrl);
    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      const queryPubkey = queryData.names?.[TEST_USERNAME];
      
      if (queryPubkey === EXPECTED_PUBKEY) {
        console.log('✅ Query parameter support working');
      } else {
        console.log('⚠️  Query parameter returns different result');
      }
    } else {
      console.log('⚠️  Query parameter not supported (may still work)');
    }
    console.log('');

    console.log('🎉 NIP-05 verification setup is working!');
    console.log('');
    console.log('✨ Users can now use NIP-05 identifiers like:');
    console.log(`   ${TEST_USERNAME}@${DOMAIN}`);
    console.log('');
    console.log('📝 Manual verification steps:');
    console.log('1. Visit https://zaptok.social/.well-known/nostr.json in browser');
    console.log('2. Test in Nostr clients like Primal, Damus, or Snort');
    console.log('3. Look for verified checkmarks next to profiles');
    
    return true;

  } catch (error) {
    console.log('❌ Error during verification:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('   This might be a network issue or CORS problem');
    }
    
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Check if the file exists at public/.well-known/nostr.json');
    console.log('2. Ensure your hosting platform serves static files from public/');
    console.log('3. Verify the JSON format is valid');
    console.log('4. Check CORS headers if testing from browser');
    
    return false;
  }
}

// Run the test
testNip05Setup();
