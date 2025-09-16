
// Let's get the user object and test signEvent detection
const loginData = JSON.parse(localStorage.getItem('nostr:login'));
const currentLogin = loginData.find(login => login.type === 'x-bunker-nostr-tools' && login.id.includes('8b12bddc'));
const user = currentLogin;

console.log('Testing signEvent detection with actual user object...');
console.log('User structure:', {
  hasSignEvent: typeof user?.signEvent,
  hasSigner: npm run devuser?.signer,
  signerStructure: user?.signer ? Object.keys(user.signer) : 'no signer',
  signerConstructor: user?.signer?.constructor?.name
});

// Test the lightning service detection logic
detectSignEvent(user);

