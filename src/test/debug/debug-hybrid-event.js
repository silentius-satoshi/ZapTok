// Test hybrid event creation - run in browser console
// This simulates the event creation process to debug the imeta tag issue

console.log('=== HYBRID EVENT CREATION TEST ===');

// Mock data similar to what upload service would return
const mockVideoTags = [
  ['url', 'https://blossom.band/abc123def456...'],
  ['x', 'abc123def456789...'],
  ['size', '1234567'],
  ['m', 'video/webm'],
  ['dim', '2160x3840'],
  ['service', 'blossom']
];

console.log('1. Mock upload tags:', mockVideoTags);

// Extract data like VideoUploadModal does
const videoUrl = mockVideoTags.find(tag => tag[0] === 'url')?.[1] || '';
const videoHash = mockVideoTags.find(tag => tag[0] === 'x')?.[1] || '';
const videoSize = parseInt(mockVideoTags.find(tag => tag[0] === 'size')?.[1] || '0');
const videoType = mockVideoTags.find(tag => tag[0] === 'm')?.[1] || '';

console.log('2. Extracted video data:');
console.log('  - videoUrl:', videoUrl);
console.log('  - videoHash:', videoHash);
console.log('  - videoSize:', videoSize);
console.log('  - videoType:', videoType);

// Create hybridVideoData like VideoUploadModal does
const hybridVideoData = {
  title: 'Test Video',
  description: 'Test description',
  videoUrl: videoUrl,
  thumbnailUrl: undefined,
  hash: videoHash,
  duration: 30,
  size: videoSize,
  type: videoType,
  width: 2160,
  height: 3840,
};

console.log('3. HybridVideoData object:', hybridVideoData);

// Simulate the imeta tag creation from hybridEventStrategy
const imetaTag = ['imeta', `url ${hybridVideoData.videoUrl}`];

if (hybridVideoData.type) {
  imetaTag.push(`m ${hybridVideoData.type}`);
}

if (hybridVideoData.hash) {
  imetaTag.push(`x ${hybridVideoData.hash}`);
}

if (hybridVideoData.size) {
  imetaTag.push(`size ${hybridVideoData.size}`);
}

if (hybridVideoData.width && hybridVideoData.height) {
  imetaTag.push(`dim ${hybridVideoData.width}x${hybridVideoData.height}`);
}

console.log('4. Created imeta tag:', imetaTag);

// Simulate parsing the imeta tag like validateVideoEvent does
const imetaProps = {};
for (let i = 1; i < imetaTag.length; i++) {
  const prop = imetaTag[i];
  const spaceIndex = prop.indexOf(' ');
  if (spaceIndex > 0) {
    const key = prop.substring(0, spaceIndex);
    const value = prop.substring(spaceIndex + 1);
    imetaProps[key] = value;
  }
}

console.log('5. Parsed imeta props:', imetaProps);

// Check if URL looks correct
console.log('6. Final URL check:');
console.log('  - Original URL:', videoUrl);
console.log('  - Parsed URL:', imetaProps.url);
console.log('  - URLs match:', videoUrl === imetaProps.url);

// Test URL encoding
console.log('7. URL encoding test:');
console.log('  - URL contains %20:', (imetaProps.url || '').includes('%20'));
console.log('  - URL contains webm:', (imetaProps.url || '').includes('webm'));

console.log('\n=== DIAGNOSIS ===');
if (videoUrl === imetaProps.url && !imetaProps.url.includes('%20')) {
  console.log('✅ imeta tag creation and parsing looks correct');
  console.log('   Issue might be elsewhere - check actual event data in React DevTools');
} else {
  console.log('❌ Found issue in imeta tag processing');
  if (imetaProps.url.includes('%20')) {
    console.log('   URL contains encoding issues');
  }
  if (videoUrl !== imetaProps.url) {
    console.log('   URL mismatch between creation and parsing');
  }
}
