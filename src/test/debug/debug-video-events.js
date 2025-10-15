// Debug script to analyze video events and their metadata
// Run this in the browser console on the profile page

console.log('🔍 Starting video event debug analysis...');

// Function to debug video events
function debugVideoEvents() {
  // Get all video elements on the page
  const videoElements = document.querySelectorAll('video');
  console.log(`Found ${videoElements.length} video elements on page`);

  // Check localStorage for any video data
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('video') || key.includes('react-query') || key.includes('blossom')
  );
  console.log('📦 Relevant localStorage keys:', localStorageKeys);

  // Look for React Query cache data
  if (window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('📊 React Query data available');
  }

  // Check for video cards
  const videoCards = document.querySelectorAll('[data-video-index]');
  console.log(`Found ${videoCards.length} video cards`);

  // Check for "video not available" messages
  const allEls = Array.from(document.querySelectorAll('*'));
  const errorMessages = allEls.filter(el => 
    el.textContent && el.textContent.includes('Video not available')
  );
  console.log(`Found ${errorMessages.length} "video not available" messages`);

  // Debug video URLs in the page
  const allElements = Array.from(document.querySelectorAll('*'));
  const videoUrls = [];
  allElements.forEach(el => {
    if (el.textContent && el.textContent.includes('blossom')) {
      videoUrls.push(el.textContent);
    }
  });
  console.log('🔗 Found blossom URLs in page:', videoUrls);

  // Check network requests
  console.log('📡 Check Network tab for any failed video requests');
  console.log('🎯 Look for HEAD requests to blossom servers');
  
  return {
    videoElements: videoElements.length,
    videoCards: videoCards.length,
    errorMessages: errorMessages.length,
    videoUrls
  };
}

// Run the analysis
const results = debugVideoEvents();
console.log('📋 Debug Results:', results);

// Instructions for further debugging
console.log(`
🔧 DEBUGGING STEPS:
1. Open DevTools Network tab
2. Filter by "blossom" to see video URL requests
3. Check if HEAD requests are returning 404/CORS errors
4. Look at the React Components tab for VideoCard props
5. Check console for any "Video not available" or URL testing logs

🎬 VIDEO RESOLUTION FLOW:
1. VideoEvent should have hash extracted from tags
2. useVideoUrlFallback should test multiple servers
3. Working URL should be passed to video element
4. If all URLs fail, "Video not available" shows

💡 COMMON ISSUES:
- Hash not properly extracted from event tags
- CORS issues with blossom servers  
- Video URLs returning 404
- Network connectivity issues
`);
