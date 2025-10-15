/**
 * Debug script to check raw event tags from relay
 * Run this in the browser console to check actual events from the relay
 */

(async function debugRawEventTags() {
  console.log('🔍 Checking raw event tags from relay...');
  
  // Get the nostr instance from the React context
  const nostrifyReactRoot = document.querySelector('[data-reactroot]')?._reactInternalInstance ||
                           document.querySelector('#root')?._reactInternalInstance ||
                           Object.values(document.querySelector('#root') || {})[0];
                           
  if (!nostrifyReactRoot) {
    console.error('❌ Could not find React root - try running this on a page with Nostr provider');
    return;
  }

  // Find the NostrProvider context
  function findNostrProvider(fiber) {
    if (!fiber) return null;
    
    if (fiber.type?.displayName === 'NostrProvider' || 
        fiber.type?.name === 'NostrProvider' ||
        fiber.memoizedProps?.nostr) {
      return fiber.memoizedProps.nostr || fiber.memoizedState?.nostr;
    }
    
    return findNostrProvider(fiber.child) || findNostrProvider(fiber.sibling);
  }

  // Try to get nostr from window (if exposed for debugging)
  let nostr = window.nostr || window.__NOSTR__;
  
  if (!nostr) {
    console.log('⚠️ Could not access nostr instance directly. Try this instead:');
    console.log('1. Open React DevTools');
    console.log('2. Find the NostrProvider component');
    console.log('3. Access the nostr prop/state');
    console.log('4. Or run: window.__NOSTR__ = nostrInstanceFromProps');
    return;
  }

  try {
    console.log('📡 Querying events with video content...');
    
    // Query events that might have video content
    const events = await nostr.query([
      {
        kinds: [1], // Text notes that might have video
        limit: 10,
        '#t': ['video'] // Events tagged with 'video'
      }
    ], { signal: AbortSignal.timeout(5000) });

    console.log(`📋 Found ${events.length} events`);

    events.forEach((event, index) => {
      console.log(`\n🎬 Event ${index + 1} (${event.id.slice(0, 8)}...):`);
      console.log('  Kind:', event.kind);
      console.log('  Author:', event.pubkey.slice(0, 8) + '...');
      console.log('  Content preview:', event.content.slice(0, 100) + '...');
      console.log('  Total tags:', event.tags.length);
      
      // Look for imeta tags specifically
      const imetaTags = event.tags.filter(tag => tag[0] === 'imeta');
      if (imetaTags.length > 0) {
        console.log('  🎯 Found imeta tags:');
        imetaTags.forEach((tag, tagIndex) => {
          console.log(`    Imeta ${tagIndex + 1}:`);
          console.log('      Type:', typeof tag);
          console.log('      Is Array:', Array.isArray(tag));
          console.log('      Length:', tag.length);
          console.log('      Raw:', tag);
          
          if (Array.isArray(tag)) {
            tag.forEach((element, elementIndex) => {
              console.log(`      [${elementIndex}]:`, typeof element, '=', element);
            });
          }
          
          // Check if this might be the malformed tag
          if (tag.length === 2 && tag[1] && tag[1].includes(' m ')) {
            console.log('      🐛 SUSPICIOUS: This looks like a malformed imeta tag!');
            console.log('      🐛 Tag[1] contains spaces and "m" which suggests concatenation');
          }
        });
      } else {
        console.log('  ℹ️ No imeta tags found');
      }
      
      // Also check for video-related URLs in content
      const videoUrlPattern = /https?:\/\/[^\s]+\.(mp4|webm|mov|avi)/gi;
      const videoUrls = event.content.match(videoUrlPattern);
      if (videoUrls) {
        console.log('  📹 Video URLs in content:', videoUrls);
      }
    });
    
  } catch (error) {
    console.error('❌ Error querying events:', error);
  }
})();
