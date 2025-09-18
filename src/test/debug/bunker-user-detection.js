
// Let's get the user object and test signEvent detection
const loginData = JSON.parse(localStorage.getItem('nostr:login'));
const currentLogin = loginData.find(login => login.type === 'x-bunker-nostr-tools' && login.id.includes('8b12bddc'));
const user = currentLogin;

console.log('Testing signEvent detection with actual user object...');
console.log('User structure:', {
  hasSignEvent: typeof user?.signEvent,
  hasSigner: !!user?.signer,
  signerStructure: user?.signer ? Object.keys(user.signer) : 'no signer',
  signerConstructor: user?.signer?.constructor?.name
});

// Test the lightning service detection logic
// detectSignEvent(user); // TODO: Define this function or remove this test file

function detectSignEvent(user) {
  console.log('Detecting signEvent capability for user:', user?.id);
  if (user?.signer?.signEvent) {
    console.log('✅ User has signEvent capability');
    return true;
  } else {
    console.log('❌ User does not have signEvent capability');
    return false;
  }
}

// Run the test
detectSignEvent(user);

