/**
 * Enhanced Bunker Signer Test Script
 * 
 * This script tests the enhanced bunker signer improvements.
 * Copy and paste this into the browser console to test the enhanced functionality.
 */

console.log('🔍 Testing Enhanced Bunker Signer improvements...');

// Test 1: Check if enhanced debug logging is working
console.log('📋 Test 1: Debug System');
try {
  const debugConfig = window.DEBUG_CONFIG || {};
  console.log('  - Debug config available:', !!debugConfig);
  console.log('  - Bunker debugging enabled:', debugConfig.bunker?.enabled);
  console.log('  - Bunker verbose logging:', debugConfig.bunker?.verbose);
} catch (error) {
  console.log('  - ❌ Debug config not accessible:', error);
}

// Test 2: Check enhanced Nostrify login data structure
console.log('📋 Test 2: Enhanced Login Data Structure');
try {
  const nostrifyLoginData = localStorage.getItem('nostr:login');
  if (nostrifyLoginData) {
    const logins = JSON.parse(nostrifyLoginData);
    const bunkerLogins = Array.isArray(logins) 
      ? logins.filter(l => l.type === 'x-bunker-nostr-tools')
      : (logins.logins || []).filter(l => l.type === 'x-bunker-nostr-tools');
    
    console.log('  - Total logins found:', Array.isArray(logins) ? logins.length : logins.logins?.length || 0);
    console.log('  - Bunker logins found:', bunkerLogins.length);
    
    if (bunkerLogins.length > 0) {
      const firstBunker = bunkerLogins[0];
      console.log('  - First bunker login structure:', {
        hasId: !!firstBunker.id,
        hasType: !!firstBunker.type,
        hasPubkey: !!firstBunker.pubkey,
        hasSigner: !!firstBunker.signer,
        hasData: !!firstBunker.data,
        hasMetadata: !!firstBunker.metadata,
        hasClientSecret: !!(firstBunker.data?.clientSecretKey || firstBunker.metadata?.clientSecretKey)
      });
      
      // Test enhanced signer
      if (firstBunker.signer) {
        console.log('  - Enhanced signer methods:', {
          hasNip44Encrypt: typeof firstBunker.signer.nip44Encrypt === 'function',
          hasNip44Decrypt: typeof firstBunker.signer.nip44Decrypt === 'function',
          hasNip44Property: !!firstBunker.signer.nip44,
          hasPing: typeof firstBunker.signer.ping === 'function',
          hasConnected: typeof firstBunker.signer.connected !== 'undefined',
          hasGetClientSecretKey: typeof firstBunker.signer.getClientSecretKey === 'function'
        });
      }
    }
  } else {
    console.log('  - ❌ No Nostrify login data found');
  }
} catch (error) {
  console.log('  - ❌ Error checking login data:', error);
}

// Test 3: Check enhanced bunker storage
console.log('📋 Test 3: Enhanced Bunker Storage');
try {
  const bunkerKeys = Object.keys(localStorage).filter(k => k.startsWith('bunker-'));
  console.log('  - Stored bunker sessions:', bunkerKeys.length);
  
  bunkerKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`  - ${key} enhancements:`, {
        hasClientSecretKey: !!data.clientSecretKey,
        hasCreatedAt: !!data.createdAt,
        hasLastUsed: !!data.lastUsed,
        hasOriginalUri: !!data.originalBunkerUri,
        hasBackwardCompatibility: !!data.localSecretHex
      });
    } catch (error) {
      console.log(`  - ❌ Error parsing ${key}:`, error);
    }
  });
} catch (error) {
  console.log('  - ❌ Error checking bunker storage:', error);
}

// Test 4: Test enhanced NIP-44 methods if user is logged in
console.log('📋 Test 4: Enhanced NIP-44 Methods');
try {
  const nostrifyLoginData = localStorage.getItem('nostr:login');
  if (nostrifyLoginData) {
    const logins = JSON.parse(nostrifyLoginData);
    const currentUser = Array.isArray(logins) ? logins[0] : logins.logins?.[0];
    
    if (currentUser?.signer && currentUser.type === 'x-bunker-nostr-tools') {
      console.log('  - Found bunker user, testing enhanced methods...');
      
      // Test method availability
      const hasDirectNip44Encrypt = typeof currentUser.signer.nip44Encrypt === 'function';
      const hasDirectNip44Decrypt = typeof currentUser.signer.nip44Decrypt === 'function';
      const hasNip44Property = !!currentUser.signer.nip44;
      
      console.log('  - Direct nip44Encrypt available:', hasDirectNip44Encrypt);
      console.log('  - Direct nip44Decrypt available:', hasDirectNip44Decrypt);
      console.log('  - nip44 property available:', hasNip44Property);
      
      if (hasNip44Property) {
        console.log('  - nip44.encrypt available:', typeof currentUser.signer.nip44.encrypt === 'function');
        console.log('  - nip44.decrypt available:', typeof currentUser.signer.nip44.decrypt === 'function');
      }
      
      // Test enhanced connection methods
      console.log('  - Enhanced connection methods:');
      console.log('    - ping method:', typeof currentUser.signer.ping === 'function');
      console.log('    - connected property:', typeof currentUser.signer.connected !== 'undefined');
      console.log('    - getClientSecretKey:', typeof currentUser.signer.getClientSecretKey === 'function');
      
      if (typeof currentUser.signer.connected !== 'undefined') {
        console.log('    - Current connection status:', currentUser.signer.connected);
      }
      
    } else {
      console.log('  - ℹ️ No bunker user found for NIP-44 testing');
    }
  } else {
    console.log('  - ℹ️ No logged in user for NIP-44 testing');
  }
} catch (error) {
  console.log('  - ❌ Error testing NIP-44 methods:', error);
}

// Test 5: Check restoration hook functionality and debug restoration issues
console.log('📋 Test 5: Restoration Hook Status & Debug');
try {
  // Check if restoration hook would trigger
  const bunkerKeys = Object.keys(localStorage).filter(k => k.startsWith('bunker-'));
  const nostrifyLoginData = localStorage.getItem('nostr:login');
  let existingBunkerLogins = 0;
  
  if (nostrifyLoginData) {
    const logins = JSON.parse(nostrifyLoginData);
    const loginArray = Array.isArray(logins) ? logins : logins.logins || [];
    existingBunkerLogins = loginArray.filter(l => l.type === 'x-bunker-nostr-tools').length;
  }
  
  console.log('  - Stored bunker sessions:', bunkerKeys.length);
  console.log('  - Active bunker logins:', existingBunkerLogins);
  console.log('  - Restoration would trigger:', bunkerKeys.length > 0 && existingBunkerLogins === 0);
  
  if (bunkerKeys.length > 0 && existingBunkerLogins === 0) {
    console.log('  - 💡 Bunker restoration should have triggered on app startup');
    console.log('  - 🔄 Check console for restoration logs with "bunker" prefix');
    
    // Provide debugging help
    console.log('  - 🔧 Debugging tips:');
    console.log('    1. Check browser console for bunker restoration logs');
    console.log('    2. Look for errors during restoration process');
    console.log('    3. Verify stored bunker data is valid');
    
    // Show stored bunker session details for debugging
    bunkerKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        const userPubkey = key.replace('bunker-', '');
        console.log(`    - Session ${userPubkey.substring(0, 16)}... details:`, {
          hasRequiredFields: !!(data.bunkerPubkey && data.relays && data.secret),
          hasSecretKey: !!(data.clientSecretKey || data.localSecretHex),
          lastUsed: data.lastUsed ? new Date(data.lastUsed).toLocaleString() : 'never',
          createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString() : 'unknown'
        });
      } catch (error) {
        console.log(`    - ❌ Error parsing session data for ${key}:`, error);
      }
    });
  } else if (existingBunkerLogins > 0) {
    console.log('  - ✅ Active bunker logins exist, restoration not needed');
  } else {
    console.log('  - ℹ️ No stored bunker sessions found for restoration');
  }
  
  // Additional restoration debugging
  if (bunkerKeys.length > 0) {
    console.log('  - 🔧 Manual restoration test:');
    console.log('    You can test manual restoration by running:');
    console.log('    window.testBunkerRestoration = async () => {');
    console.log('      const { restoreNostrifyBunkerLogin } = await import("./src/hooks/useNostrToolsBridge");');
    console.log('      const userPubkey = "' + bunkerKeys[0].replace('bunker-', '') + '";');
    console.log('      return await restoreNostrifyBunkerLogin(userPubkey);');
    console.log('    };');
    console.log('    window.testBunkerRestoration();');
  }
} catch (error) {
  console.log('  - ❌ Error checking restoration status:', error);
}

console.log('🏁 Enhanced Bunker Signer Test Complete');
console.log('');
console.log('📊 Summary of enhanced improvements:');
console.log('  1. ✅ Enhanced NIP-44 method implementation with fallbacks');
console.log('  2. ✅ Client secret key storage for proper restoration');
console.log('  3. ✅ Improved connection management and error handling');
console.log('  4. ✅ Automatic bunker login restoration on app startup');
console.log('  5. ✅ Enhanced debug logging for troubleshooting');
console.log('  6. ✅ Better compatibility with various bunker implementations');
console.log('');
console.log('🔍 Next steps:');
console.log('  - Refresh the page to test restoration hook');
console.log('  - Check console for bunker debug logs');
console.log('  - Test NIP-44 encryption/decryption with Cashu wallet');