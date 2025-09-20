#!/usr/bin/env node

/**
 * P2PK End-to-End Flow Test
 * 
 * This test verifies that the complete P2PK flow works:
 * 1. Generate P2PK keypair from Cashu wallet private key
 * 2. Create P2PK secret locked to that pubkey
 * 3. Create P2PK witness signature with the private key
 * 4. Verify the witness signature
 */

import { createP2PKKeypairFromPrivateKey, createP2PKSecret, signWithP2PK, createP2PKWitness, verifyP2PKSignature } from './src/lib/p2pk.js';

console.log('🧪 P2PK End-to-End Flow Test');
console.log('============================');

try {
    // Step 1: Simulate user's Cashu wallet private key
    const userPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    console.log('👤 User private key:', userPrivateKey.substring(0, 16) + '...');

    // Step 2: Generate P2PK keypair from user's private key
    const p2pkKeypair = createP2PKKeypairFromPrivateKey(userPrivateKey);
    console.log('🔑 Generated P2PK pubkey:', p2pkKeypair.pubkey);

    // Step 3: Create P2PK secret locked to this pubkey (this is what goes in the token)
    const [secretString, secretObject] = createP2PKSecret(p2pkKeypair.pubkey);
    console.log('🔒 P2PK secret created:', secretString.substring(0, 100) + '...');

    // Step 4: Create witness signature (this is what the user does to spend the token)
    const signature = signWithP2PK(secretString, userPrivateKey);
    console.log('✍️  P2PK signature:', signature.substring(0, 32) + '...');

    // Step 5: Create witness object (this is what goes in the proof.witness field)
    const witness = createP2PKWitness([signature]);
    console.log('📜 P2PK witness:', witness);

    // Step 6: Verify the signature (this is what the mint does)
    const isValid = verifyP2PKSignature(secretString, signature, p2pkKeypair.pubkey);
    console.log('✅ Signature verification:', isValid ? 'VALID' : 'INVALID');

    if (isValid) {
        console.log('\n🎉 SUCCESS! P2PK End-to-End Flow Works!');
        console.log('====================================');
        console.log('✅ P2PK keypair generation');
        console.log('✅ P2PK secret creation');
        console.log('✅ P2PK witness signature');
        console.log('✅ Signature verification');
        console.log('\n💡 This means:');
        console.log('   - Users can generate P2PK pubkeys from their wallet keys');
        console.log('   - Nutzaps can be locked to these pubkeys');
        console.log('   - Users can create witness signatures to spend them');
        console.log('   - The signature verification works correctly');
        console.log('\n🔄 The "missing witness needed for P2PK signature" error should be FIXED!');
    } else {
        console.log('\n❌ FAILED! P2PK signature verification failed.');
        process.exit(1);
    }

} catch (error) {
    console.error('\n❌ ERROR in P2PK flow:', error.message);
    process.exit(1);
}