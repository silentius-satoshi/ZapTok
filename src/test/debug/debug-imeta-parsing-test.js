// Quick test to verify imeta tag parsing
// Paste this into browser console

console.log('=== IMETA PARSING TEST ===');

// Test case 1: Correct imeta tag format
const correctImetaTag = [
  'imeta',
  'url https://blossom.band/abc123def456',
  'm video/webm', 
  'x abc123def456789',
  'size 1234567',
  'dim 2160x3840'
];

console.log('Test 1 - Correct format:');
console.log('Input:', correctImetaTag);

const props1 = {};
for (let i = 1; i < correctImetaTag.length; i++) {
  const prop = correctImetaTag[i];
  const spaceIndex = prop.indexOf(' ');
  if (spaceIndex > 0) {
    const key = prop.substring(0, spaceIndex);
    const value = prop.substring(spaceIndex + 1);
    props1[key] = value;
  }
}
console.log('Parsed:', props1);

// Test case 2: Malformed imeta tag (what we might be seeing)
const malformedImetaTag = [
  'imeta',
  'url https://blossom.band/abc123def456.webm m video/webm x abc123def456789 size 1234567 dim 2160x3840'
];

console.log('\nTest 2 - Malformed (single string):');
console.log('Input:', malformedImetaTag);

const props2 = {};
for (let i = 1; i < malformedImetaTag.length; i++) {
  const prop = malformedImetaTag[i];
  const spaceIndex = prop.indexOf(' ');
  if (spaceIndex > 0) {
    const key = prop.substring(0, spaceIndex);
    const value = prop.substring(spaceIndex + 1);
    props2[key] = value;
  }
}
console.log('Parsed:', props2);

// Test case 3: What the broken URL looks like
console.log('\nTest 3 - Analyzing broken URL pattern:');
const brokenUrl = 'blossom.primal.net/hash.webm%20m%20video/webm%20dim%202160x3840';
console.log('Broken URL:', brokenUrl);
console.log('Contains %20:', brokenUrl.includes('%20'));
console.log('URL decoded:', decodeURIComponent(brokenUrl));

console.log('\n=== CONCLUSION ===');
if (props1.url && props1.url.startsWith('https://') && !props1.url.includes('%20')) {
  console.log('✅ Correct parsing works fine');
} else {
  console.log('❌ Issue with correct parsing');
}

if (props2.url && props2.url.includes('webm')) {
  console.log('❌ Malformed tag creates incorrect URL');
  console.log('   The issue is likely that imeta tag elements are being joined into a single string somewhere');
} else {
  console.log('✅ Malformed test passed unexpectedly');
}
