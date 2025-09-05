/**
 * NUT-11 Mint Compatibility Testing
 * Tests P2PK support across different mint implementations
 *
 * Usage: node src/test/mint-compatibility.test.js
 */

import { CashuClient } from '../lib/cashu-client.ts';

// Test mint URLs - add more as needed
const TEST_MINTS = [
  'https://mint.minibits.cash/Bitcoin',
  'https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQKrsvHNcW',
  'https://cashu.me',
  'https://testnut.cashu.space', // Testing mint
  'https://nutshell.space', // Another testing mint
];

/**
 * Check if a mint supports NUT-11 P2PK functionality
 */
async function checkMintP2PKSupport(mintUrl) {
  try {
    console.log(`\n🔍 Testing mint: ${mintUrl}`);

    const mint = { url: mintUrl };
    const client = new CashuClient(mint);

    // Test basic connectivity
    const startTime = Date.now();
    const mintInfo = await client.getMintInfo();
    const responseTime = Date.now() - startTime;

    console.log(`  ✅ Connection successful (${responseTime}ms)`);
    console.log(`  📋 Name: ${mintInfo.name || 'Unknown'}`);
    console.log(`  🔑 Pubkey: ${mintInfo.pubkey?.slice(0, 16)}...`);
    console.log(`  📦 Version: ${mintInfo.version || 'Unknown'}`);

    // Check NUT-11 P2PK support
    const supportsP2PK = mintInfo.nuts?.[11]?.supported === true;
    console.log(`  🔒 NUT-11 P2PK Support: ${supportsP2PK ? '✅ YES' : '❌ NO'}`);

    // Check NUT-12 DLEQ support (recommended for P2PK security)
    const supportsDLEQ = mintInfo.nuts?.[12]?.supported === true;
    console.log(`  🛡️  NUT-12 DLEQ Support: ${supportsDLEQ ? '✅ YES' : '❌ NO'}`);

    // Check NUT-10 spending conditions (required for P2PK)
    const supportsSpendingConditions = mintInfo.nuts?.[10]?.supported === true;
    console.log(`  🎯 NUT-10 Spending Conditions: ${supportsSpendingConditions ? '✅ YES' : '❌ NO'}`);

    // Comprehensive P2PK readiness assessment
    const isP2PKReady = supportsP2PK && supportsSpendingConditions;
    const securityLevel = supportsDLEQ ? 'HIGH' : 'BASIC';

    console.log(`  🎖️  P2PK Readiness: ${isP2PKReady ? `✅ READY (${securityLevel} security)` : '❌ NOT READY'}`);

    // Check supported units
    const supportedUnits = new Set();

    // From NUT-4 (minting)
    if (mintInfo.nuts?.[4]?.methods) {
      mintInfo.nuts[4].methods.forEach(method => {
        supportedUnits.add(method.unit);
      });
    }

    // From NUT-5 (melting)
    if (mintInfo.nuts?.[5]?.methods) {
      mintInfo.nuts[5].methods.forEach(method => {
        supportedUnits.add(method.unit);
      });
    }

    console.log(`  💰 Supported Units: ${Array.from(supportedUnits).join(', ') || 'Unknown'}`);

    // Additional diagnostic information
    const allNuts = Object.keys(mintInfo.nuts || {}).sort((a, b) => parseInt(a) - parseInt(b));
    console.log(`  📚 Supported NUTs: ${allNuts.join(', ') || 'None reported'}`);

    return {
      mintUrl,
      name: mintInfo.name,
      pubkey: mintInfo.pubkey,
      version: mintInfo.version,
      responseTime,
      supportsP2PK,
      supportsDLEQ,
      supportsSpendingConditions,
      isP2PKReady,
      securityLevel,
      supportedUnits: Array.from(supportedUnits),
      supportedNuts: allNuts,
      mintInfo: mintInfo // Full info for detailed analysis
    };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return {
      mintUrl,
      error: error.message,
      supportsP2PK: false,
      isP2PKReady: false
    };
  }
}

/**
 * Test P2PK compatibility across multiple mints
 */
async function testMintCompatibility() {
  console.log('🧪 NUT-11 Mint Compatibility Testing');
  console.log('=====================================');
  console.log('Testing P2PK support across different Cashu mint implementations');

  const results = [];

  for (const mintUrl of TEST_MINTS) {
    const result = await checkMintP2PKSupport(mintUrl);
    results.push(result);

    // Brief pause between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 COMPATIBILITY SUMMARY');
  console.log('=========================');

  const compatibleMints = results.filter(r => r.isP2PKReady);
  const incompatibleMints = results.filter(r => !r.isP2PKReady && !r.error);
  const errorMints = results.filter(r => r.error);

  console.log(`✅ P2PK Compatible: ${compatibleMints.length}/${TEST_MINTS.length}`);
  console.log(`❌ P2PK Incompatible: ${incompatibleMints.length}/${TEST_MINTS.length}`);
  console.log(`🚫 Connection Errors: ${errorMints.length}/${TEST_MINTS.length}`);

  if (compatibleMints.length > 0) {
    console.log('\n🎯 RECOMMENDED MINTS FOR P2PK:');
    compatibleMints.forEach(mint => {
      const security = mint.securityLevel === 'HIGH' ? '🛡️' : '🔒';
      console.log(`  ${security} ${mint.name || mint.mintUrl} (${mint.securityLevel} security)`);
      console.log(`    URL: ${mint.mintUrl}`);
      console.log(`    Units: ${mint.supportedUnits?.join(', ') || 'Unknown'}`);
    });
  }

  if (incompatibleMints.length > 0) {
    console.log('\n⚠️  MINTS WITHOUT P2PK SUPPORT:');
    incompatibleMints.forEach(mint => {
      console.log(`  • ${mint.name || mint.mintUrl}`);
      console.log(`    Reason: ${!mint.supportsSpendingConditions ? 'No NUT-10' : 'No NUT-11'}`);
    });
  }

  if (errorMints.length > 0) {
    console.log('\n🚫 UNREACHABLE MINTS:');
    errorMints.forEach(mint => {
      console.log(`  • ${mint.mintUrl}: ${mint.error}`);
    });
  }

  console.log('\n💡 IMPLEMENTATION GUIDANCE:');
  console.log('============================');

  if (compatibleMints.length === 0) {
    console.log('❌ No P2PK compatible mints found!');
    console.log('   Your application should:');
    console.log('   - Check mint compatibility before creating P2PK tokens');
    console.log('   - Fall back to regular tokens for incompatible mints');
    console.log('   - Guide users to compatible mint providers');
  } else {
    console.log('✅ P2PK compatible mints found!');
    console.log('   Implementation recommendations:');
    console.log('   - Use getMintInfo() to verify P2PK support before sending nutzaps');
    console.log('   - Prefer mints with both NUT-11 and NUT-12 for maximum security');
    console.log('   - Cache compatibility results to avoid repeated API calls');
    console.log('   - Show mint compatibility status in your UI');
  }

  console.log('\n🔧 INTEGRATION CODE EXAMPLE:');
  console.log('```typescript');
  console.log('async function isP2PKCompatible(mintUrl: string): Promise<boolean> {');
  console.log('  try {');
  console.log('    const client = new CashuClient({ url: mintUrl });');
  console.log('    const mintInfo = await client.getMintInfo();');
  console.log('    return mintInfo.nuts?.[11]?.supported === true &&');
  console.log('           mintInfo.nuts?.[10]?.supported === true;');
  console.log('  } catch {');
  console.log('    return false;');
  console.log('  }');
  console.log('}');
  console.log('```');

  return {
    totalTested: TEST_MINTS.length,
    compatible: compatibleMints.length,
    incompatible: incompatibleMints.length,
    errors: errorMints.length,
    results,
    compatibleMints,
    incompatibleMints,
    errorMints
  };
}

/**
 * Test a specific mint URL (useful for development)
 */
async function testSpecificMint(mintUrl) {
  console.log('🔍 Testing Specific Mint');
  console.log('========================');

  const result = await checkMintP2PKSupport(mintUrl);

  if (result.error) {
    console.log(`\n❌ Failed to test mint: ${result.error}`);
    return false;
  }

  console.log(`\n📋 FULL MINT ANALYSIS:`);
  console.log(`Name: ${result.name || 'Unknown'}`);
  console.log(`URL: ${result.mintUrl}`);
  console.log(`Version: ${result.version || 'Unknown'}`);
  console.log(`Response Time: ${result.responseTime}ms`);
  console.log(`P2PK Ready: ${result.isP2PKReady ? '✅' : '❌'}`);
  console.log(`Security Level: ${result.securityLevel || 'N/A'}`);

  if (result.mintInfo) {
    console.log(`\n🔍 RAW NUTS DATA:`);
    console.log(JSON.stringify(result.mintInfo.nuts, null, 2));
  }

  return result.isP2PKReady;
}

// Main execution
async function main() {
  // Check if a specific mint URL was provided
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0].startsWith('http')) {
    await testSpecificMint(args[0]);
  } else {
    await testMintCompatibility();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { checkMintP2PKSupport, testMintCompatibility, testSpecificMint };