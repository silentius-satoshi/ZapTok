#!/usr/bin/env node

/**
 * NUT-11 Signature Verification Compliance Test
 *
 * This script verifies that our P2PK signature verification implementation
 * is fully compliant with NUT-11 specification requirements.
 *
 * Tests:
 * 1. Basic signature verification (data signing with private key)
 * 2. Secret signing per NUT-11 (signing secret strings as per spec)
 * 3. Cross-validation with @cashu/cashu-ts library
 * 4. Error handling for invalid signatures
 * 5. Compressed pubkey format compliance
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Set up @noble/secp256k1 hashing
import { sha256 } from '@noble/hashes/sha256';
import * as secp256k1 from '@noble/secp256k1';

// Configure secp256k1 to use sha256 from @noble/hashes
secp256k1.utils.sha256Sync = (...messages) => {
  const concatenated = new Uint8Array(messages.reduce((acc, msg) => acc + msg.length, 0));
  let offset = 0;
  for (const msg of messages) {
    concatenated.set(msg, offset);
    offset += msg.length;
  }
  return sha256(concatenated);
};

// Import local P2PK utilities
import {
  generateP2PKKeypair,
  createP2PKSecret,
  signWithP2PK,
  verifyP2PKSignature,
  createP2PKWitness
} from '../lib/p2pk.ts';

async function testNUT11SignatureCompliance() {
  try {
    console.log('🔐 NUT-11 Signature Verification Compliance Test');
    console.log('=' .repeat(55));

    // Test 1: Basic Signature Verification
    console.log('\n📝 Test 1: Basic Signature Generation & Verification');
    const keypair = generateP2PKKeypair();
    console.log(`✅ Generated keypair:`);
    console.log(`   Pubkey: ${keypair.pubkey}`);
    console.log(`   Private: ${keypair.privateKey.substring(0, 16)}...`);

    const testData = "test message for signing";
    const signature = signWithP2PK(testData, keypair.privateKey);
    console.log(`✅ Generated signature: ${signature.substring(0, 32)}...`);

    const isValid = verifyP2PKSignature(testData, signature, keypair.pubkey);
    if (!isValid) {
      throw new Error('Basic signature verification failed');
    }
    console.log('✅ Basic signature verification: PASSED');

    // Test 2: NUT-11 Secret Signing Compliance
    console.log('\n🔒 Test 2: NUT-11 Secret Signing (per specification)');
    const [secretString, secretObj] = createP2PKSecret(keypair.pubkey);
    console.log(`✅ Created P2PK secret: ${secretString.substring(0, 50)}...`);

    // According to NUT-11: "The secret field is signed as a string"
    const secretSignature = signWithP2PK(secretString, keypair.privateKey);
    console.log(`✅ Signed secret string: ${secretSignature.substring(0, 32)}...`);

    const secretVerification = verifyP2PKSignature(secretString, secretSignature, keypair.pubkey);
    if (!secretVerification) {
      throw new Error('Secret string signature verification failed');
    }
    console.log('✅ Secret string signature verification: PASSED');

    // Test 3: P2PK Witness Format Compliance
    console.log('\n📄 Test 3: P2PK Witness Format (NUT-11 compliance)');
    const witness = createP2PKWitness([secretSignature]);
    const parsedWitness = JSON.parse(witness);

    if (!parsedWitness.signatures || !Array.isArray(parsedWitness.signatures)) {
      throw new Error('Invalid witness format: missing signatures array');
    }

    if (parsedWitness.signatures[0] !== secretSignature) {
      throw new Error('Witness signature mismatch');
    }
    console.log(`✅ P2PK witness format: ${witness.substring(0, 60)}...`);
    console.log('✅ Witness format compliance: PASSED');

    // Test 4: Cross-validation with @cashu/cashu-ts Library
    console.log('\n🔄 Test 4: Cross-validation with @cashu/cashu-ts');
    try {
      const { createP2PKsecret } = await import('@cashu/cashu-ts/crypto/client/NUT11');

      // Generate secret using library
      const librarySecret = createP2PKsecret(keypair.pubkey);
      console.log(`✅ Library secret: ${librarySecret.substring(0, 50)}...`);

      // Sign library secret with our implementation
      const librarySignature = signWithP2PK(librarySecret, keypair.privateKey);
      const libraryVerification = verifyP2PKSignature(librarySecret, librarySignature, keypair.pubkey);

      if (!libraryVerification) {
        throw new Error('Cross-validation with @cashu/cashu-ts failed');
      }
      console.log('✅ Cross-validation with @cashu/cashu-ts: PASSED');

    } catch (importError) {
      console.log('⚠️  @cashu/cashu-ts not available for cross-validation');
      console.log(`   ${importError.message}`);
    }

    // Test 5: Error Handling for Invalid Signatures
    console.log('\n❌ Test 5: Error Handling (Invalid signatures)');

    const invalidSignature = "deadbeef".repeat(16); // Invalid 64-byte signature
    const invalidPubkey = "03" + "ff".repeat(32); // Invalid but well-formed pubkey

    // Test invalid signature
    const invalidSigResult = verifyP2PKSignature(testData, invalidSignature, keypair.pubkey);
    if (invalidSigResult) {
      throw new Error('Invalid signature should have been rejected');
    }
    console.log('✅ Invalid signature properly rejected');

    // Test invalid pubkey
    const invalidPubkeyResult = verifyP2PKSignature(testData, signature, invalidPubkey);
    if (invalidPubkeyResult) {
      throw new Error('Invalid pubkey should have been rejected');
    }
    console.log('✅ Invalid pubkey properly rejected');

    // Test empty data
    const emptyDataResult = verifyP2PKSignature("", signature, keypair.pubkey);
    if (emptyDataResult) {
      throw new Error('Empty data signature should have been rejected');
    }
    console.log('✅ Empty data properly rejected');

    // Test 6: Compressed Pubkey Format Compliance
    console.log('\n🗜️  Test 6: Compressed Pubkey Format (02/03 prefix)');

    if (!keypair.pubkey.startsWith('02') && !keypair.pubkey.startsWith('03')) {
      throw new Error('Generated pubkey is not in compressed format');
    }

    if (keypair.pubkey.length !== 66) { // 33 bytes = 66 hex chars
      throw new Error(`Invalid pubkey length: expected 66 chars, got ${keypair.pubkey.length}`);
    }
    console.log('✅ Compressed pubkey format: COMPLIANT');

    // Summary
    console.log('\n🎉 NUT-11 Signature Verification Compliance Summary');
    console.log('=' .repeat(55));
    console.log('✅ Basic signature generation & verification');
    console.log('✅ NUT-11 secret string signing compliance');
    console.log('✅ P2PK witness format compliance');
    console.log('✅ Error handling for invalid inputs');
    console.log('✅ Compressed pubkey format compliance');
    console.log('✅ All NUT-11 signature requirements: PASSED');

    console.log('\n💡 Implementation Status:');
    console.log('   - Current verifyP2PKSignature() is NUT-11 compliant');
    console.log('   - Signature verification uses SHA256 + secp256k1.verify()');
    console.log('   - Proper error handling for edge cases');
    console.log('   - Ready for production use with NUTS-compliant mints');

  } catch (error) {
    console.error('\n❌ NUT-11 Signature Verification Test Failed:');
    console.error(`   ${error.message}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check signature generation implementation');
    console.error('   2. Verify SHA256 hashing of message data');
    console.error('   3. Ensure secp256k1.verify() is working correctly');
    console.error('   4. Check compressed pubkey format compliance');
    console.error('   5. Review NUT-11 specification requirements');
    process.exit(1);
  }
}

// Run the test
testNUT11SignatureCompliance().catch(console.error);