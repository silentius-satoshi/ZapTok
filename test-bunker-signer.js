#!/usr/bin/env node

/**
 * Test script to verify bunker signer signEvent detection logic
 * This helps debug the issue without needing browser interaction
 */

// Mock bunker signer structure based on expected patterns
const mockBunkerSigner = {
  // Simulate typical bunker signer with nested structure
  signer: {
    signEvent: async (event) => {
      console.log('Mock bunker signer.signEvent called with:', event);
      return { ...event, sig: 'mock-signature' };
    }
  },
  // Direct signEvent method (alternative pattern)
  signEvent: async (event) => {
    console.log('Mock direct signEvent called with:', event);
    return { ...event, sig: 'mock-signature-direct' };
  },
  // Other typical properties
  pubkey: 'mock-pubkey',
  constructor: {
    name: 'BunkerSigner'
  }
};

// Test our signEvent detection logic
async function testSignEventDetection(user) {
  console.log('\n=== Testing signEvent Detection ===');
  console.log('User object structure:');
  console.log('- user.signEvent exists:', typeof user.signEvent);
  console.log('- user.signer exists:', !!user.signer);
  console.log('- user.signer.signEvent exists:', user.signer && typeof user.signer.signEvent);
  
  // Direct access patterns
  if (typeof user.signEvent === 'function') {
    console.log('\n✅ Found direct signEvent method');
    try {
      const result = await user.signEvent({ kind: 9734, content: 'test' });
      console.log('Direct signEvent result:', result);
      return user.signEvent;
    } catch (error) {
      console.log('❌ Direct signEvent failed:', error.message);
    }
  }
  
  // Nested signer patterns
  if (user.signer && typeof user.signer.signEvent === 'function') {
    console.log('\n✅ Found nested signer.signEvent method');
    try {
      const result = await user.signer.signEvent({ kind: 9734, content: 'test' });
      console.log('Nested signEvent result:', result);
      return user.signer.signEvent;
    } catch (error) {
      console.log('❌ Nested signEvent failed:', error.message);
    }
  }
  
  // Property enumeration fallback
  console.log('\n🔍 Enumerating properties for signEvent...');
  const allProps = [];
  let current = user;
  let depth = 0;
  
  while (current && depth < 3) {
    const props = Object.getOwnPropertyNames(current);
    console.log(`Depth ${depth} properties:`, props);
    
    for (const prop of props) {
      allProps.push(`${depth > 0 ? 'nested.' : ''}${prop}`);
      try {
        const value = current[prop];
        if (typeof value === 'function' && prop.toLowerCase().includes('sign')) {
          console.log(`Found signing method at depth ${depth}: ${prop}`, typeof value);
        }
        if (typeof value === 'object' && value !== null && prop === 'signer') {
          console.log(`Found signer object at depth ${depth}:`, Object.getOwnPropertyNames(value));
        }
      } catch (e) {
        console.log(`Cannot access property ${prop}:`, e.message);
      }
    }
    
    // Move to prototype or nested signer
    if (depth === 0 && user.signer) {
      current = user.signer;
    } else {
      current = Object.getPrototypeOf(current);
    }
    depth++;
  }
  
  console.log('\n❌ No valid signEvent method found');
  return null;
}

// Test with different signer patterns
async function runTests() {
  console.log('Testing Bunker Signer signEvent Detection\n');
  
  // Test 1: Direct signEvent
  console.log('=== Test 1: Direct signEvent ===');
  const directSigner = {
    signEvent: mockBunkerSigner.signEvent,
    pubkey: mockBunkerSigner.pubkey
  };
  await testSignEventDetection(directSigner);
  
  // Test 2: Nested signer
  console.log('\n=== Test 2: Nested signer ===');
  const nestedSigner = {
    signer: {
      signEvent: mockBunkerSigner.signer.signEvent
    },
    pubkey: mockBunkerSigner.pubkey
  };
  await testSignEventDetection(nestedSigner);
  
  // Test 3: Both patterns (typical bunker signer)
  console.log('\n=== Test 3: Both patterns ===');
  await testSignEventDetection(mockBunkerSigner);
  
  // Test 4: No signEvent (should fail gracefully)
  console.log('\n=== Test 4: No signEvent ===');
  const noSignSigner = {
    pubkey: 'test-pubkey'
  };
  await testSignEventDetection(noSignSigner);
}

runTests().catch(console.error);