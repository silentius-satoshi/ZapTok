import blossomUploadService from '@/services/blossom-upload.service';

/**
 * Quick test to verify Blossom servers are accessible
 * This can be run in browser console for debugging
 */
export async function testBlossomServers() {
  console.log('🧪 Testing Blossom server connectivity...');
  
  try {
    const results = await blossomUploadService.testServers();
    
    console.log('📊 Blossom Server Test Results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.server} - OK`);
      } else {
        console.log(`❌ ${result.server} - ERROR: ${result.error}`);
      }
    });
    
    const successfulServers = results.filter(r => r.success);
    console.log(`\n✨ ${successfulServers.length}/${results.length} servers accessible`);
    
    if (successfulServers.length === 0) {
      console.warn('⚠️  No Blossom servers accessible - CORS upload will fail');
    } else {
      console.log('🎉 Blossom fallback should work for CORS issues');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Blossom server test failed:', error);
    return [];
  }
}

// Make available in window for debugging
if (typeof window !== 'undefined') {
  (window as any).testBlossomServers = testBlossomServers;
}