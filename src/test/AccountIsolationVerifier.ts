import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { SimplePool, nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to fetch the latest kind 0 profile event for a given pubkey
 * This can be used to verify account isolation by checking profiles
 */
export function useLatestProfile(pubkey: string) {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['profile-verification', pubkey],
    queryFn: async (context) => {
      if (!pubkey || pubkey.length !== 64) {
        throw new Error('Invalid pubkey provided');
      }

      const signal = AbortSignal.any([
        context.signal, 
        AbortSignal.timeout(5000)
      ]);

      const events = await nostr.query([
        {
          kinds: [0],
          authors: [pubkey],
          limit: 1,
        }
      ], { signal });

      return events[0] || null;
    },
    staleTime: 30_000, // Cache for 30 seconds
    enabled: Boolean(pubkey),
  });
}

/**
 * Utility class for manually verifying account isolation
 * Use this in browser console or as a debugging tool
 */
export class AccountIsolationVerifier {
  private pool: SimplePool;
  private relays: string[];

  constructor(relays: string[] = [
    'wss://relay.chorus.community',
    'wss://relay.nostr.band', 
    'wss://relay.damus.io',
    'wss://relay.primal.net'
  ]) {
    this.pool = new SimplePool();
    this.relays = relays;
  }

  /**
   * Fetch the latest profile for a pubkey from relays
   */
  async fetchProfile(pubkeyOrNpub: string): Promise<NostrEvent | null> {
    let pubkeyHex: string;

    // Convert npub to hex if needed
    if (pubkeyOrNpub.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(pubkeyOrNpub);
        if (decoded.type !== 'npub') {
          throw new Error('Invalid npub identifier');
        }
        pubkeyHex = decoded.data as string;
      } catch (error) {
        throw new Error(`Failed to decode npub: ${error}`);
      }
    } else if (pubkeyOrNpub.length === 64 && /^[a-f0-9]+$/i.test(pubkeyOrNpub)) {
      pubkeyHex = pubkeyOrNpub.toLowerCase();
    } else {
      throw new Error('Invalid pubkey format. Use hex or npub1...');
    }

    try {
      const events = await this.pool.querySync(this.relays, {
        kinds: [0],
        authors: [pubkeyHex],
        limit: 1,
      });

      return events[0] || null;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Verify that two accounts have different profiles
   */
  async verifyAccountIsolation(
    originalPubkey: string, 
    newPubkey: string
  ): Promise<{
    originalProfile: NostrEvent | null;
    newProfile: NostrEvent | null;
    isIsolated: boolean;
    details: string[];
  }> {
    console.log('🔍 Verifying account isolation...');
    console.log('Original account:', originalPubkey);
    console.log('New account:', newPubkey);

    const originalProfile = await this.fetchProfile(originalPubkey);
    const newProfile = await this.fetchProfile(newPubkey);

    const details: string[] = [];
    let isIsolated = true;

    // Check if both profiles exist
    if (!originalProfile) {
      details.push('❌ Original account profile not found on relays');
    } else {
      details.push('✅ Original account profile exists');
      const content = JSON.parse(originalProfile.content);
      details.push(`   Name: ${content.name || 'N/A'}`);
      details.push(`   Created: ${new Date(originalProfile.created_at * 1000).toISOString()}`);
    }

    if (!newProfile) {
      details.push('❌ New account profile not found on relays');
    } else {
      details.push('✅ New account profile exists');
      const content = JSON.parse(newProfile.content);
      details.push(`   Name: ${content.name || 'N/A'}`);
      details.push(`   Created: ${new Date(newProfile.created_at * 1000).toISOString()}`);
    }

    // Verify pubkeys are different
    if (originalPubkey === newPubkey) {
      details.push('❌ CRITICAL: Both accounts have the same pubkey!');
      isIsolated = false;
    } else {
      details.push('✅ Accounts have different pubkeys');
    }

    // Verify profile events have different pubkeys
    if (originalProfile && newProfile) {
      if (originalProfile.pubkey === newProfile.pubkey) {
        details.push('❌ CRITICAL: Profile events have the same pubkey!');
        isIsolated = false;
      } else {
        details.push('✅ Profile events have different pubkeys');
      }

      // Check if profiles have different content
      try {
        const originalContent = JSON.parse(originalProfile.content);
        const newContent = JSON.parse(newProfile.content);
        
        if (originalContent.name === newContent.name && 
            originalContent.about === newContent.about &&
            originalContent.picture === newContent.picture) {
          details.push('⚠️  WARNING: Profiles have identical content');
        } else {
          details.push('✅ Profiles have different content');
        }
      } catch (error) {
        details.push('⚠️  Could not compare profile content');
      }
    }

    return {
      originalProfile,
      newProfile,
      isIsolated,
      details,
    };
  }

  /**
   * Print a detailed verification report
   */
  async printVerificationReport(originalPubkey: string, newPubkey: string): Promise<{
    originalProfile: NostrEvent | null;
    newProfile: NostrEvent | null;
    isIsolated: boolean;
    details: string[];
  }> {
    const result = await this.verifyAccountIsolation(originalPubkey, newPubkey);
    
    console.log('\n📊 ACCOUNT ISOLATION VERIFICATION REPORT');
    console.log('==========================================');
    
    result.details.forEach(detail => console.log(detail));
    
    console.log('\n🎯 FINAL RESULT:');
    if (result.isIsolated) {
      console.log('✅ ACCOUNTS ARE PROPERLY ISOLATED');
      console.log('   Each account has its own profile and identity');
    } else {
      console.log('❌ ACCOUNT ISOLATION FAILED');
      console.log('   Profile contamination detected!');
    }
    
    console.log('==========================================\n');
    
    return result;
  }

  /**
   * Validate a single event against NIP-01 standards
   */
  validateEventStructure(event: NostrEvent): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields check
    const requiredFields = ['id', 'pubkey', 'created_at', 'kind', 'tags', 'content', 'sig'];
    requiredFields.forEach(field => {
      if (!(field in event)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // ID validation
    if (event.id && (typeof event.id !== 'string' || !/^[a-f0-9]{64}$/.test(event.id))) {
      errors.push('Invalid event ID: must be 64-character hex string');
    }

    // Pubkey validation
    if (event.pubkey && (typeof event.pubkey !== 'string' || !/^[a-f0-9]{64}$/.test(event.pubkey))) {
      errors.push('Invalid pubkey: must be 64-character hex string');
    }

    // Timestamp validation
    if (typeof event.created_at !== 'number' || event.created_at <= 0) {
      errors.push('Invalid created_at: must be positive unix timestamp');
    }

    // Kind validation
    if (typeof event.kind !== 'number' || event.kind < 0 || event.kind > 65535) {
      errors.push('Invalid kind: must be integer between 0 and 65535');
    }

    // Tags validation
    if (!Array.isArray(event.tags)) {
      errors.push('Invalid tags: must be an array');
    } else {
      event.tags.forEach((tag, index) => {
        if (!Array.isArray(tag) || tag.length === 0) {
          errors.push(`Invalid tag at index ${index}: must be non-empty array`);
        } else {
          tag.forEach((item, itemIndex) => {
            if (typeof item !== 'string') {
              errors.push(`Invalid tag at index ${index}[${itemIndex}]: must be string`);
            }
          });
        }
      });
    }

    // Content validation
    if (typeof event.content !== 'string') {
      errors.push('Invalid content: must be string');
    } else if (event.kind === 0) {
      // Special validation for kind 0 (metadata)
      try {
        JSON.parse(event.content);
      } catch {
        errors.push('Invalid kind 0 content: must be valid JSON');
      }
    }

    // Signature validation
    if (event.sig && (typeof event.sig !== 'string' || !/^[a-f0-9]{128}$/.test(event.sig))) {
      errors.push('Invalid signature: must be 128-character hex string');
    }

    // Warnings for best practices
    if (event.kind === 0 && event.tags.length === 0) {
      warnings.push('Kind 0 event has no tags (consider adding client tag)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Close the pool connection
   */
  close(): void {
    this.pool.close(this.relays);
  }
}

// Global utility for browser console debugging
declare global {
  interface Window {
    verifyAccountIsolation: (originalPubkey: string, newPubkey: string) => Promise<{
      originalProfile: NostrEvent | null;
      newProfile: NostrEvent | null;
      isIsolated: boolean;
      details: string[];
    }>;
    AccountIsolationVerifier: typeof AccountIsolationVerifier;
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  const verifier = new AccountIsolationVerifier();
  
  window.verifyAccountIsolation = async (originalPubkey: string, newPubkey: string) => {
    return await verifier.printVerificationReport(originalPubkey, newPubkey);
  };
  
  window.AccountIsolationVerifier = AccountIsolationVerifier;
}

export default AccountIsolationVerifier;
