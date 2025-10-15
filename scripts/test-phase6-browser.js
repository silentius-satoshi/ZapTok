/**
 * Phase 6.1 Browser Verification Script
 * 
 * Run this in browser DevTools console after page loads to verify:
 * - FlexSearch initialization
 * - Profile caching
 * - Local search functionality
 * 
 * Usage: Copy and paste into browser console
 */

console.log('%c=== Phase 6.1 Verification ===', 'color: #00ff00; font-weight: bold; font-size: 16px');

// 1. Check IndexedDB database and stores
async function checkDatabase() {
  console.log('\n%c1. Checking IndexedDB Database...', 'color: #00ffff; font-weight: bold');
  
  try {
    const databases = await indexedDB.databases();
    const zaptokDb = databases.find(db => db.name === 'zaptok');
    
    if (!zaptokDb) {
      console.error('❌ ZapTok database not found');
      return false;
    }
    
    console.log(`✅ Database found: ${zaptokDb.name} (version ${zaptokDb.version})`);
    
    // Open connection to check stores
    return new Promise((resolve) => {
      const request = indexedDB.open('zaptok');
      request.onsuccess = () => {
        const db = request.result;
        const storeNames = Array.from(db.objectStoreNames);
        console.log(`✅ Object stores (${storeNames.length}):`, storeNames);
        
        if (storeNames.includes('profileEvents')) {
          console.log('✅ profileEvents store exists');
          resolve(true);
        } else {
          console.error('❌ profileEvents store missing');
          resolve(false);
        }
        
        db.close();
      };
    });
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return false;
  }
}

// 2. Check for FlexSearch initialization logs
function checkFlexSearchLogs() {
  console.log('\n%c2. FlexSearch Initialization Check', 'color: #00ffff; font-weight: bold');
  console.log('📝 Look for these logs above:');
  console.log('   - "[ClientService] Initializing FlexSearch index from IndexedDB..."');
  console.log('   - "[ClientService] FlexSearch index ready with X profiles"');
  console.log('\nℹ️  If you don\'t see them, refresh the page and check again');
}

// 3. Count cached profiles
async function countCachedProfiles() {
  console.log('\n%c3. Counting Cached Profiles...', 'color: #00ffff; font-weight: bold');
  
  return new Promise((resolve) => {
    const request = indexedDB.open('zaptok');
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('profileEvents', 'readonly');
      const store = transaction.objectStore('profileEvents');
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        console.log(`✅ Cached profiles: ${count}`);
        
        if (count === 0) {
          console.log('ℹ️  No profiles cached yet. Browse some profiles to populate cache.');
        }
        
        resolve(count);
      };
      
      countRequest.onerror = () => {
        console.error('❌ Failed to count profiles');
        resolve(0);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    };
  });
}

// 4. Test profile fetching (offline-first)
async function testProfileFetch() {
  console.log('\n%c4. Testing Offline-First Profile Fetch...', 'color: #00ffff; font-weight: bold');
  console.log('📝 Look for cache HIT/MISS logs above when profiles load');
  console.log('   Expected logs:');
  console.log('   - "[Profile] ✅ Cache HIT: <pubkey>" - profile loaded from IndexedDB');
  console.log('   - "[Profile] ❌ Cache MISS: <pubkey>" - profile loaded from network');
  console.log('   - "[Profile] 💾 Cached profile for <pubkey>" - profile stored in IndexedDB');
}

// Run all checks
async function runAllChecks() {
  console.log('\n%c Running all verification checks...', 'color: #ffff00; font-weight: bold');
  
  await checkDatabase();
  checkFlexSearchLogs();
  await countCachedProfiles();
  await testProfileFetch();
  
  console.log('\n%c=== Verification Complete ===', 'color: #00ff00; font-weight: bold; font-size: 16px');
  console.log('\n📌 Next Steps:');
  console.log('   1. Check for FlexSearch initialization logs (should appear on page load)');
  console.log('   2. Browse some user profiles to trigger profile caching');
  console.log('   3. Watch for cache HIT/MISS logs when profiles load');
  console.log('   4. Hard refresh (Ctrl+Shift+R) to see FlexSearch rebuild from cache');
}

// Execute
runAllChecks();
