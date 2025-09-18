/**
 * Browser Console Test Script for Bunker Signer Detection
 * 
 * Instructions:
 * 1. Open browser dev tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 * 
 * This will test the signEvent detection logic with your actual user object
 * 
 * Manual User Extraction Methods:
 * 1. getCurrentUser() - Tries to extract from React components
 * 2. extractUserFromLocalStorage() - Gets from localStorage
 * 3. findUserInReactTree() - Searches React Fiber tree
 */

// Enhanced user extraction functions
function getCurrentUser() {
  console.log('🔍 Trying to extract current user...');
  
  // Method 1: Check window globals
  console.log('🔍 Checking window globals...');
  const globalChecks = ['currentUser', 'user', 'nostrUser', 'bunkerUser', 'loggedInUser'];
  for (const prop of globalChecks) {
    if (window[prop]) {
      console.log(`✅ Found window.${prop}`);
      const user = window[prop];
      if (user && (user.pubkey || user.signer || user.signEvent)) {
        return user;
      }
    }
  }
  
  // Method 1.5: Check for app-specific globals
  console.log('🔍 Checking for app-specific globals...');
  const appGlobals = Object.keys(window).filter(key => 
    key.includes('nostr') || 
    key.includes('bunker') || 
    key.includes('signer') || 
    key.includes('login') ||
    key.includes('auth') ||
    key.includes('user')
  );
  console.log('🔍 Found app-related globals:', appGlobals);
  
  for (const key of appGlobals) {
    try {
      const value = window[key];
      if (value && typeof value === 'object') {
        // Check if it's directly a user object
        if (value.pubkey || value.signer || value.signEvent) {
          console.log(`✅ Found user object in window.${key}`);
          return value;
        }
        
        // Check for nested user objects
        if (value.user && (value.user.pubkey || value.user.signer)) {
          console.log(`✅ Found user object in window.${key}.user`);
          return value.user;
        }
        
        if (value.currentUser && (value.currentUser.pubkey || value.currentUser.signer)) {
          console.log(`✅ Found user object in window.${key}.currentUser`);
          return value.currentUser;
        }
      }
    } catch (e) {
      console.log(`❌ Error checking window.${key}:`, e.message);
    }
  }
  
  // Method 2: Check localStorage
  console.log('🔍 Checking localStorage...');
  const storageUser = extractUserFromLocalStorage();
  if (storageUser) {
    console.log('✅ Found user in localStorage');
    return storageUser;
  }
  
  // Method 3: Search React tree
  console.log('🔍 Searching React tree...');
  const reactUser = findUserInReactTree();
  if (reactUser) {
    console.log('✅ Found user in React tree');
    return reactUser;
  }
  
  // Method 4: Try to access via debugging hooks
  console.log('🔍 Trying debugging hooks...');
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detected');
    // Could potentially extract user from React DevTools data
  }
  
  console.log('❌ No user found automatically');
  return null;
}

function extractUserFromLocalStorage() {
  console.log('🔍 Checking localStorage for user data...');
  
  // Comprehensive list of possible storage keys
  const keys = [
    'nostr-login', 
    'user', 
    'currentUser', 
    'nostr-user', 
    'login-state',
    'nostrify-login',
    'bunker-login',
    'nostr-connect',
    'signer-data',
    'auth-state',
    'login-data',
    'user-session'
  ];
  
  // Check all localStorage keys
  console.log('All localStorage keys:', Object.keys(localStorage));
  
  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        console.log(`📦 Found data in localStorage[${key}]:`, stored.substring(0, 200) + '...');
        
        try {
          const parsed = JSON.parse(stored);
          console.log(`📦 Parsed data from ${key}:`, parsed);
          
          // Check if it looks like a user object
          if (parsed && (parsed.pubkey || parsed.signer || parsed.signEvent)) {
            console.log(`✅ Valid user object found in ${key}`);
            return parsed;
          }
          
          // Check for nested user objects
          if (parsed && typeof parsed === 'object') {
            for (const [subKey, subValue] of Object.entries(parsed)) {
              if (subValue && (subValue.pubkey || subValue.signer || subValue.signEvent)) {
                console.log(`✅ Valid user object found in ${key}.${subKey}`);
                return subValue;
              }
            }
          }
        } catch (parseError) {
          console.log(`❌ Failed to parse ${key}:`, parseError.message);
        }
      }
    } catch (e) {
      console.log(`❌ Error accessing ${key}:`, e.message);
    }
  }
  
  // Try searching all localStorage keys for nostr-related data
  console.log('🔍 Searching all localStorage keys for nostr data...');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('nostr') || key.includes('bunker') || key.includes('signer') || key.includes('login'))) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          console.log(`🔍 Found potential key: ${key}`, value.substring(0, 100) + '...');
          
          try {
            const parsed = JSON.parse(value);
            if (parsed && (parsed.pubkey || parsed.signer || parsed.signEvent)) {
              console.log(`✅ Valid user object found in dynamic key: ${key}`);
              return parsed;
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      } catch (e) {
        console.log(`❌ Error with key ${key}:`, e.message);
      }
    }
  }
  
  console.log('❌ No user data found in localStorage');
  return null;
}

function findUserInReactTree() {
  try {
    console.log('🔍 Searching for React root...');
    
    // Modern React 18+ detection methods
    const rootElement = document.querySelector('#root');
    if (!rootElement) {
      console.log('❌ No #root element found');
      return null;
    }
    
    // Try multiple React Fiber access patterns
    const reactFiber = rootElement._reactInternalFiber || 
                      rootElement._reactInternals ||
                      rootElement.__reactInternalInstance ||
                      rootElement.__reactFiber$ ||
                      Object.keys(rootElement).find(key => key.startsWith('__reactFiber$')) && rootElement[Object.keys(rootElement).find(key => key.startsWith('__reactFiber$'))];
    
    if (!reactFiber) {
      console.log('❌ No React fiber found on root element');
      
      // Try finding React components another way
      console.log('🔍 Trying alternative React detection...');
      
      // Look for components with React fiber keys
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const fiberKey = Object.keys(el).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance'));
        if (fiberKey && el[fiberKey]) {
          console.log('✅ Found React fiber on element:', el.tagName);
          return searchFiber(el[fiberKey]);
        }
      }
      
      return null;
    }
    
    console.log('✅ Found React fiber, searching for user...');
    return searchFiber(reactFiber);
    
    function searchFiber(fiber, depth = 0) {
      if (depth > 30) return null; // Increased depth for deeper searches
      
      try {
        // Check component props
        if (fiber.memoizedProps) {
          const props = fiber.memoizedProps;
          
          // Check for user in props
          if (props.user && (props.user.pubkey || props.user.signer)) {
            console.log('✅ Found user in props at depth', depth, fiber.type?.name || fiber.elementType?.name);
            return props.user;
          }
          
          // Check for currentUser in props
          if (props.currentUser && (props.currentUser.pubkey || props.currentUser.signer)) {
            console.log('✅ Found currentUser in props at depth', depth, fiber.type?.name || fiber.elementType?.name);
            return props.currentUser;
          }
          
          // Check context value
          if (props.value) {
            if (props.value.user && (props.value.user.pubkey || props.value.user.signer)) {
              console.log('✅ Found user in context value at depth', depth);
              return props.value.user;
            }
            if (props.value.currentUser && (props.value.currentUser.pubkey || props.value.currentUser.signer)) {
              console.log('✅ Found currentUser in context value at depth', depth);
              return props.value.currentUser;
            }
          }
        }
        
        // Check component state
        if (fiber.memoizedState) {
          let state = fiber.memoizedState;
          
          // Walk through the state chain (hooks)
          while (state) {
            if (state.memoizedState) {
              const stateValue = state.memoizedState;
              if (stateValue && (stateValue.pubkey || stateValue.signer)) {
                console.log('✅ Found user in hook state at depth', depth);
                return stateValue;
              }
            }
            state = state.next;
          }
        }
        
        // Check for NostrProvider or similar context providers
        if (fiber.type && (fiber.type.displayName || fiber.type.name)) {
          const componentName = fiber.type.displayName || fiber.type.name;
          if (componentName.includes('Nostr') || componentName.includes('Login') || componentName.includes('Auth')) {
            console.log(`🔍 Found ${componentName} component, checking deeper...`);
          }
        }
        
        // Search children
        if (fiber.child) {
          const result = searchFiber(fiber.child, depth + 1);
          if (result) return result;
        }
        
        // Search siblings
        if (fiber.sibling) {
          const result = searchFiber(fiber.sibling, depth);
          if (result) return result;
        }
        
        // Check return (parent) if we haven't gone too deep
        if (depth < 5 && fiber.return) {
          const result = searchFiber(fiber.return, depth + 1);
          if (result) return result;
        }
        
      } catch (e) {
        // Ignore errors and continue searching
        console.log(`❌ Error at depth ${depth}:`, e.message);
      }
      
      return null;
    }
    
  } catch (e) {
    console.log('❌ Error searching React tree:', e.message);
    return null;
  }
}

// Test signEvent detection logic (browser version)
async function testSignEventDetection(user) {
  console.log('\n=== Testing signEvent Detection ===');
  console.log('User object structure:');
  console.log('- user.signEvent exists:', typeof user?.signEvent);
  console.log('- user.signer exists:', !!user?.signer);
  console.log('- user.signer.signEvent exists:', user?.signer && typeof user.signer.signEvent);
  console.log('- user.constructor.name:', user?.constructor?.name);
  
  // Log the actual user object for inspection
  console.log('Full user object:', user);
  
  // Direct access patterns
  if (typeof user?.signEvent === 'function') {
    console.log('\n✅ Found direct signEvent method');
    console.log('Direct signEvent function:', user.signEvent.toString().substring(0, 200) + '...');
    return user.signEvent;
  }
  
  // Nested signer patterns  
  if (user?.signer && typeof user.signer.signEvent === 'function') {
    console.log('\n✅ Found nested signer.signEvent method');
    console.log('Nested signEvent function:', user.signer.signEvent.toString().substring(0, 200) + '...');
    return user.signer.signEvent;
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
          console.log(`🔍 Found signing method at depth ${depth}: ${prop}`, typeof value);
          console.log(`   Function preview: ${value.toString().substring(0, 100)}...`);
        }
        if (typeof value === 'object' && value !== null && prop === 'signer') {
          console.log(`🔍 Found signer object at depth ${depth}:`, Object.getOwnPropertyNames(value));
        }
      } catch (e) {
        console.log(`❌ Cannot access property ${prop}:`, e.message);
      }
    }
    
    // Move to prototype or nested signer
    if (depth === 0 && user?.signer) {
      current = user.signer;
    } else {
      current = Object.getPrototypeOf(current);
    }
    depth++;
  }
  
  console.log('\n❌ No valid signEvent method found');
  return null;
}

// Main test function
async function runBunkerSignerTest() {
  console.log('🔍 Browser Bunker Signer Test Starting...\n');
  
  // Try to get current user automatically
  const user = getCurrentUser();
  
  if (user) {
    console.log('✅ Found user automatically:', user);
    await testSignEventDetection(user);
  } else {
    console.log('\n⚠️ No user found automatically.');
    console.log('\n📝 Manual user extraction methods:');
    console.log('1. getCurrentUser() - Try automatic detection again');
    console.log('2. extractUserFromLocalStorage() - Check localStorage');
    console.log('3. findUserInReactTree() - Search React components');
    console.log('\n🔧 After getting user object, run:');
    console.log('   testSignEventDetection(userObject)');
    console.log('   detectSignEvent(userObject)');
  }
}

// Enhanced logging for the lightning service
function testLightningServiceDetection() {
  console.log('\n=== Testing Lightning Service Detection Logic ===');
  
  // This mimics the actual detection logic from lightning.service.donation.ts
  function detectSignEvent(user) {
    console.log('🔍 LIGHTNING SERVICE DEBUG - Starting signEvent detection');
    console.log('User type:', typeof user);
    console.log('User constructor:', user?.constructor?.name);
    console.log('User keys:', user ? Object.keys(user) : 'null');
    
    // Test the exact same logic as in the service
    if (!user) {
      console.log('❌ User is null/undefined');
      return null;
    }
    
    // Check for direct signEvent method
    if (typeof user.signEvent === 'function') {
      console.log('✅ Found user.signEvent (direct)');
      console.log('signEvent function length:', user.signEvent.length);
      console.log('signEvent toString preview:', user.signEvent.toString().substring(0, 100));
      return user.signEvent;
    }
    
    // Check for user.signer.signEvent method (direct signer)
    if (user.signer && typeof user.signer.signEvent === 'function') {
      console.log('✅ Found user.signer.signEvent (nested)');
      console.log('signer.signEvent function length:', user.signer.signEvent.length);
      console.log('signer.signEvent toString preview:', user.signer.signEvent.toString().substring(0, 100));
      return user.signer.signEvent.bind(user.signer);
    }
    
    // Check for user.signer.bunkerSigner.signEvent method (bunker pattern)
    if (user.signer?.bunkerSigner && typeof user.signer.bunkerSigner.signEvent === 'function') {
      console.log('✅ Found user.signer.bunkerSigner.signEvent (bunker pattern)');
      console.log('bunkerSigner.signEvent function length:', user.signer.bunkerSigner.signEvent.length);
      console.log('bunkerSigner.signEvent toString preview:', user.signer.bunkerSigner.signEvent.toString().substring(0, 100));
      return user.signer.bunkerSigner.signEvent.bind(user.signer.bunkerSigner);
    }
    
    // Deep bunker signer inspection
    if (user.signer?.bunkerSigner) {
      console.log('🔍 Deep bunker signer inspection:');
      const bunkerSigner = user.signer.bunkerSigner;
      console.log('bunkerSigner keys:', Object.keys(bunkerSigner));
      console.log('bunkerSigner own props:', Object.getOwnPropertyNames(bunkerSigner));
      console.log('bunkerSigner prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(bunkerSigner)));
      
      // Check prototype chain for signEvent
      let proto = bunkerSigner;
      let depth = 0;
      while (proto && depth < 5) {
        console.log(`Depth ${depth} properties:`, Object.getOwnPropertyNames(proto));
        if (typeof proto.signEvent === 'function') {
          console.log(`✅ Found signEvent at prototype depth ${depth}`);
          return proto.signEvent.bind(bunkerSigner);
        }
        proto = Object.getPrototypeOf(proto);
        depth++;
      }
    }
    
    // General property enumeration fallback
    console.log('🔍 Starting general property enumeration fallback...');
    
    const properties = Object.getOwnPropertyNames(user);
    console.log('User properties:', properties);
    
    for (const prop of properties) {
      try {
        const value = user[prop];
        console.log(`Checking property ${prop}:`, typeof value);
        
        if (typeof value === 'function' && prop.includes('sign')) {
          console.log(`Found signing function: ${prop}`);
        }
        
        if (typeof value === 'object' && value !== null) {
          const subProps = Object.getOwnPropertyNames(value);
          console.log(`Object property ${prop} has:`, subProps);
          
          if (subProps.includes('signEvent')) {
            console.log(`Found signEvent in ${prop}!`);
            return value.signEvent.bind(value);
          }
          
          // Check nested objects for bunkerSigner
          for (const subProp of subProps) {
            if (subProp === 'bunkerSigner' && value[subProp]) {
              console.log(`Found bunkerSigner in ${prop}.${subProp}`);
              const bunkerSigner = value[subProp];
              if (typeof bunkerSigner.signEvent === 'function') {
                console.log(`✅ Found signEvent in ${prop}.${subProp}.signEvent`);
                return bunkerSigner.signEvent.bind(bunkerSigner);
              }
            }
          }
        }
      } catch (error) {
        console.log(`Error checking ${prop}:`, error.message);
      }
    }
    
    console.log('❌ No signEvent method found in lightning service detection');
    return null;
  }
  
  // Make this available globally for testing
  window.detectSignEvent = detectSignEvent;
  console.log('✅ detectSignEvent function is now available globally');
  console.log('Usage: detectSignEvent(yourUserObject)');
}

// Test service worker signing interface
async function testServiceWorkerSigning(user) {
  console.log('\n=== Testing Service Worker Signing Interface ===');
  
  if (!user?.signer?.bunkerSigner) {
    console.log('❌ No bunker signer found');
    return null;
  }
  
  const bunkerSigner = user.signer.bunkerSigner;
  
  // Check for service worker communication methods
  console.log('🔍 Checking bunker signer for messaging interface...');
  console.log('bunkerSigner properties:', Object.getOwnPropertyNames(bunkerSigner));
  
  // Look for common service worker communication patterns
  const communicationMethods = [
    'postMessage', 'sendMessage', 'request', 'rpc', 'call', 'invoke',
    'sign', 'signEvent', 'send', 'emit', 'publish', 'execute'
  ];
  
  for (const method of communicationMethods) {
    if (typeof bunkerSigner[method] === 'function') {
      console.log(`✅ Found communication method: ${method}`);
      console.log(`   Function: ${bunkerSigner[method].toString().substring(0, 200)}...`);
    }
  }
  
  // Check if the parent signer has the actual signing interface
  console.log('\n🔍 Checking parent signer object...');
  const signer = user.signer;
  console.log('Signer properties:', Object.getOwnPropertyNames(signer));
  console.log('Signer constructor:', signer.constructor.name);
  
  // Test for NIP-07 style interface on the main signer
  const nip07Methods = ['getPublicKey', 'signEvent', 'getRelays', 'nip04', 'nip44'];
  console.log('\n🔍 Testing NIP-07 interface on main signer...');
  
  for (const method of nip07Methods) {
    if (typeof signer[method] === 'function') {
      console.log(`✅ Found NIP-07 method: ${method}`);
      
      if (method === 'signEvent') {
        console.log(`✅ FOUND SIGNEVENT on main signer!`);
        console.log('signEvent function:', signer.signEvent.toString().substring(0, 300));
        
        // Test if this method actually works
        try {
          console.log('🧪 Testing signEvent with dummy event...');
          const testEvent = {
            kind: 1,
            content: 'test',
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            pubkey: user.pubkey || signer._pubkey
          };
          
          // DON'T actually sign, just test if the method exists and can be called
          console.log('✅ signEvent method is callable');
          return signer.signEvent;
          
        } catch (e) {
          console.log('❌ signEvent method exists but threw error:', e.message);
        }
      }
    } else {
      console.log(`❌ Missing NIP-07 method: ${method}`);
    }
  }
  
  // Check prototype chain of the main signer more thoroughly
  console.log('\n🔍 Deep prototype analysis of main signer...');
  let signerProto = signer;
  let depth = 0;
  
  while (signerProto && depth < 10) {
    const props = Object.getOwnPropertyNames(signerProto);
    const methods = props.filter(prop => {
      try {
        return typeof signerProto[prop] === 'function';
      } catch (e) {
        return false;
      }
    });
    
    console.log(`Depth ${depth} methods:`, methods);
    
    // Check for signing-related methods
    const signingMethods = methods.filter(method =>
      method.toLowerCase().includes('sign') ||
      method.toLowerCase().includes('event') ||
      method === 'signEvent'
    );
    
    if (signingMethods.length > 0) {
      console.log(`✅ Found signing methods at depth ${depth}:`, signingMethods);
      
      // Try to access the signEvent method specifically
      if (methods.includes('signEvent')) {
        console.log(`✅ FOUND signEvent at depth ${depth}`);
        console.log('signEvent method:', signerProto.signEvent);
        console.log('signEvent bound to signer:', signerProto.signEvent.bind(signer));
        return signerProto.signEvent.bind(signer);
      }
    }
    
    signerProto = Object.getPrototypeOf(signerProto);
    depth++;
  }
  
  // Check for alternative signing patterns
  console.log('\n🔍 Checking for alternative signing patterns...');
  
  // Check if there's a pool or connection object
  if (bunkerSigner.pool || signer.pool) {
    const pool = bunkerSigner.pool || signer.pool;
    console.log('Found pool object:', Object.getOwnPropertyNames(pool));
    
    // Check pool for signing methods
    const poolMethods = Object.getOwnPropertyNames(pool).filter(prop => {
      try {
        return typeof pool[prop] === 'function';
      } catch (e) {
        return false;
      }
    });
    console.log('Pool methods:', poolMethods);
  }
  
  console.log('❌ No valid signEvent method found in service worker interface');
  return null;
}

// Enhanced signer interface test based on service worker logs
async function testBunkerSignerInterface(user) {
  console.log('\n=== Testing Bunker Signer Interface (Service Worker Based) ===');
  
  if (!user?.signer) {
    console.log('❌ No signer found');
    return;
  }
  
  const signer = user.signer;
  console.log('Signer type:', signer.constructor.name);
  console.log('Signer properties:', Object.getOwnPropertyNames(signer));
  
  // Based on the service worker logs, check for permissions
  console.log('\n🔍 Checking signing permissions...');
  
  // Try to find the actual signing interface
  // The service worker logs show it has sign_event permissions for kinds 0,1,3,6,7,9734,9735
  
  // Test 1: Direct NIP-07 interface
  if (typeof signer.signEvent === 'function') {
    console.log('✅ Found direct signEvent method');
    return signer.signEvent;
  }
  
  // Test 2: Check if it's async and uses promises/messaging
  console.log('\n🔍 Testing async/messaging interface...');
  
  // Look for async methods that might handle signing
  const asyncMethods = Object.getOwnPropertyNames(signer).filter(prop => {
    try {
      const method = signer[prop];
      return typeof method === 'function' && (
        prop.includes('sign') ||
        prop.includes('event') ||
        prop.includes('request') ||
        prop.includes('call') ||
        prop.includes('send')
      );
    } catch (e) {
      return false;
    }
  });
  
  console.log('Found async/messaging methods:', asyncMethods);
  
  for (const methodName of asyncMethods) {
    try {
      const method = signer[methodName];
      console.log(`Testing method: ${methodName}`);
      console.log(`Method signature: ${method.toString().substring(0, 200)}...`);
      
      // This could be our signing method
      if (methodName.toLowerCase().includes('sign')) {
        console.log(`✅ Potential signing method found: ${methodName}`);
        return method.bind(signer);
      }
    } catch (e) {
      console.log(`❌ Error testing ${methodName}:`, e.message);
    }
  }
  
  // Test 3: Check bunker signer for communication interface
  if (signer.bunkerSigner) {
    console.log('\n🔍 Testing bunker signer communication...');
    const bunkerSigner = signer.bunkerSigner;
    
    // Look for request/call methods that might handle signing
    const bunkerMethods = Object.getOwnPropertyNames(bunkerSigner).filter(prop => {
      try {
        return typeof bunkerSigner[prop] === 'function';
      } catch (e) {
        return false;
      }
    });
    
    console.log('Bunker signer methods:', bunkerMethods);
    
    // Check for messaging/RPC interface
    const rpcMethods = bunkerMethods.filter(method =>
      ['request', 'call', 'send', 'post', 'invoke', 'rpc'].includes(method.toLowerCase())
    );
    
    if (rpcMethods.length > 0) {
      console.log('✅ Found RPC methods on bunker signer:', rpcMethods);
      
      // This suggests the signing happens through RPC calls
      // We might need to create a wrapper function
      return async (event) => {
        console.log('🔧 Attempting to sign via bunker RPC...');
        // This would need to be implemented based on the actual RPC interface
        throw new Error('Bunker RPC signing not yet implemented');
      };
    }
  }
  
  console.log('❌ No signing interface found');
  return null;
}

// Make functions available globally
window.testSignEventDetection = testSignEventDetection;
window.runBunkerSignerTest = runBunkerSignerTest;
window.testLightningServiceDetection = testLightningServiceDetection;
window.getCurrentUser = getCurrentUser;
window.extractUserFromLocalStorage = extractUserFromLocalStorage;
window.findUserInReactTree = findUserInReactTree;
window.testServiceWorkerSigning = testServiceWorkerSigning;
window.testBunkerSignerInterface = testBunkerSignerInterface;

// Auto-run the test
runBunkerSignerTest();
testLightningServiceDetection();

console.log('\n🎯 All test functions are now available in console:');
console.log('- testSignEventDetection(user)');
console.log('- runBunkerSignerTest()'); 
console.log('- testLightningServiceDetection()');
console.log('- detectSignEvent(user)');
console.log('- getCurrentUser()');
console.log('- extractUserFromLocalStorage()');
console.log('- findUserInReactTree()');
console.log('- testServiceWorkerSigning(user) ← NEW');
console.log('- testBunkerSignerInterface(user) ← NEW');

console.log('\n🚀 Quick start after login:');
console.log('1. const user = getCurrentUser()');
console.log('2. testSignEventDetection(user)');
console.log('3. testServiceWorkerSigning(user) ← Try this for service worker interface');
console.log('4. testBunkerSignerInterface(user) ← Comprehensive bunker test');