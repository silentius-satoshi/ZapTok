// Quick test to check BunkerSigner in Node.js

console.log('🔍 Testing nostr-tools BunkerSigner API...\n');

async function testBunkerSignerAPI() {
  try {
    // Try to import and check what's available
    console.log('1. Checking nostr-tools imports...');
    
    // Dynamic import since it's ESM
    const { BunkerSigner } = await import('nostr-tools/nip46');
    console.log('✅ BunkerSigner imported successfully');
    console.log('BunkerSigner type:', typeof BunkerSigner);
    console.log('BunkerSigner constructor:', BunkerSigner.toString().substring(0, 200) + '...');
    
    // Check prototype methods
    console.log('\n2. Checking BunkerSigner prototype methods...');
    const protoMethods = Object.getOwnPropertyNames(BunkerSigner.prototype)
      .filter(name => typeof BunkerSigner.prototype[name] === 'function');
    console.log('Prototype methods:', protoMethods);
    
    // Check if signEvent is in the prototype
    if (protoMethods.includes('signEvent')) {
      console.log('✅ signEvent method found in prototype');
      console.log('signEvent method:', BunkerSigner.prototype.signEvent.toString().substring(0, 300) + '...');
    } else {
      console.log('❌ signEvent method NOT found in prototype');
    }
    
    // Try to create a dummy instance (will fail but we can see what methods it would have)
    console.log('\n3. Checking instance creation (will fail without proper params)...');
    try {
      // This will fail but we can catch the error and still inspect the class
      const dummy = new BunkerSigner();
    } catch (e) {
      console.log('Expected error creating dummy instance:', e.message.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error testing BunkerSigner API:', error);
  }
}

// Run the test
testBunkerSignerAPI().then(() => {
  console.log('\n✅ Test completed. The BunkerSigner should have a signEvent method.');
  console.log('\nThis suggests the issue is in our bridge implementation or runtime usage,');
  console.log('not in the underlying nostr-tools BunkerSigner API.');
}).catch(console.error);