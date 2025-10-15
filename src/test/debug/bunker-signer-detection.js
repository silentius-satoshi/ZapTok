
// Test the bunkerSigner object directly
const loginData = JSON.parse(localStorage.getItem('nostr:login'));
const currentLogin = loginData.find(login => login.type === 'x-bunker-nostr-tools');
const user = currentLogin;
const bunkerSigner = user.signer.bunkerSigner;

console.log('=== BUNKER SIGNER ANALYSIS ===');
console.log('BunkerSigner object:', bunkerSigner);
console.log('BunkerSigner keys:', Object.keys(bunkerSigner));
console.log('BunkerSigner own properties:', Object.getOwnPropertyNames(bunkerSigner));

// Check prototype chain for methods
let proto = bunkerSigner;
let depth = 0;
while (proto && depth < 5) {
  console.log('Depth', depth, 'properties:', Object.getOwnPropertyNames(proto));
  
  // Check for signEvent specifically
  if (typeof proto.signEvent === 'function') {
    console.log('✅ Found signEvent at depth', depth);
    console.log('signEvent method:', proto.signEvent);
  }
  
  // Check for any sign methods
  const signMethods = Object.getOwnPropertyNames(proto).filter(name => name.includes('sign'));
  if (signMethods.length > 0) {
    console.log('Sign methods at depth', depth, ':', signMethods);
  }
  
  proto = Object.getPrototypeOf(proto);
  depth++;
}

// Test if the bunkerSigner has a signEvent method
console.log('Direct bunkerSigner.signEvent:', typeof bunkerSigner.signEvent);
console.log('BunkerSigner toString:', bunkerSigner.toString());

