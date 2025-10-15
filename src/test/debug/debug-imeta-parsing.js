// Debug script for imeta tag parsing
// Run in browser console on profile page

console.log('=== IMETA TAG PARSING DEBUG ===');

// Find events in the current context
const userVideosHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
if (!userVideosHook) {
  console.log('❌ React DevTools not available');
}

// Alternative: check for video elements and debug their data
const videoElements = document.querySelectorAll('video');
console.log(`📹 Found ${videoElements.length} video elements`);

// Check for video cards with error states
const videoCards = document.querySelectorAll('[data-testid="video-card"], .video-card, .aspect-video');
console.log(`🎬 Found ${videoCards.length} video card containers`);

videoCards.forEach((card, index) => {
  console.log(`\n--- Video Card ${index + 1} ---`);
  
  // Check for error messages
  const errorElements = card.querySelectorAll('[role="alert"], .text-destructive, .text-red-500');
  if (errorElements.length > 0) {
    console.log('⚠️ Error elements found:');
    errorElements.forEach(el => console.log(`  - "${el.textContent}"`));
  }
  
  // Check for video sources
  const videos = card.querySelectorAll('video');
  videos.forEach((video, vIndex) => {
    console.log(`📺 Video ${vIndex + 1}:`);
    console.log(`  - src: ${video.src || 'none'}`);
    console.log(`  - currentSrc: ${video.currentSrc || 'none'}`);
    console.log(`  - sources: ${video.querySelectorAll('source').length}`);
    
    const sources = video.querySelectorAll('source');
    sources.forEach((source, sIndex) => {
      console.log(`    Source ${sIndex + 1}: ${source.src} (${source.type || 'no type'})`);
    });
  });
  
  // Check for data attributes that might contain event data
  for (const attr of card.attributes) {
    if (attr.name.startsWith('data-') && attr.value.length > 50) {
      console.log(`📋 ${attr.name}: ${attr.value.substring(0, 100)}...`);
    }
  }
});

// Try to access React Fiber for debugging
function findReactFiber(dom) {
  const key = Object.keys(dom).find(key => {
    return key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$");
  });
  return dom[key];
}

console.log('\n=== CHECKING FOR REACT EVENT DATA ===');
videoCards.forEach((card, index) => {
  try {
    const fiber = findReactFiber(card);
    if (fiber && fiber.memoizedProps) {
      console.log(`\n🔍 Video Card ${index + 1} React Props:`);
      const props = fiber.memoizedProps;
      
      if (props.event) {
        console.log('📜 Event found in props');
        console.log(`  - kind: ${props.event.kind}`);
        console.log(`  - content: ${props.event.content?.substring(0, 50)}...`);
        
        // Check imeta tags
        const imetaTags = props.event.tags?.filter(tag => tag[0] === 'imeta');
        console.log(`  - imeta tags: ${imetaTags?.length || 0}`);
        
        imetaTags?.forEach((tag, tagIndex) => {
          console.log(`    Imeta ${tagIndex + 1}:`, tag);
          
          // Parse the tag manually
          const imetaProps = {};
          for (let i = 1; i < tag.length; i++) {
            const prop = tag[i];
            const spaceIndex = prop.indexOf(' ');
            if (spaceIndex > 0) {
              const key = prop.substring(0, spaceIndex);
              const value = prop.substring(spaceIndex + 1);
              imetaProps[key] = value;
            }
          }
          console.log(`    Parsed props:`, imetaProps);
        });
      }
    }
  } catch (e) {
    // Silent fail
  }
});

console.log('\n=== NETWORK TAB GUIDANCE ===');
console.log('1. Open Network tab');
console.log('2. Filter by "Fetch/XHR" or "Media"');
console.log('3. Look for failed requests to video URLs');
console.log('4. Check the request URLs for malformed paths');
console.log('5. Look for URLs with %20 encoding or extra metadata');
