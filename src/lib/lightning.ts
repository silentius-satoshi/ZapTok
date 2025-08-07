import type { NostrMetadata } from '@nostrify/nostrify';

/**
 * Utility function to make CORS-safe requests
 */
export async function corsAwareFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    // Try direct request first
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // If it fails due to CORS, provide helpful error
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    if (import.meta.env.DEV) {
      console.log('❌ CORS request failed for:', url);
    }
      
      // Check if this is a known problematic provider
      if (url.includes('primal.net')) {
        throw new Error('Primal Lightning addresses are not compatible with browser-based payments. Please ask the recipient to add a Lightning address from Alby (@getalby.com), Stacker News (@stacker.news), or ZBD (@zbd.gg) to their Nostr profile for zaps to work.');
      }
      
      if (url.includes('walletofsatoshi.com')) {
        throw new Error('Wallet of Satoshi addresses are not compatible with browser-based payments. Please ask the recipient to add a Lightning address from Alby (@getalby.com), Stacker News (@stacker.news), or ZBD (@zbd.gg) to their Nostr profile for zaps to work.');
      }
      
      // Generic CORS error
      throw new Error('This Lightning address provider does not support browser payments. Please ask the recipient to use a browser-compatible Lightning address provider like Alby, Stacker News, or ZBD.');
    }
    throw error;
  }
}

/**
 * Extracts Lightning address from Nostr profile metadata
 * Returns the Lightning address or LNURL-pay endpoint
 */
export function getLightningAddress(metadata: NostrMetadata | undefined): string | null {
  if (!metadata) return null;

  // Prefer lud16 (Lightning Address) over lud06 (LNURL-pay)
  // lud16 is the newer, more user-friendly format like user@domain.com
  if (metadata.lud16) {
    return metadata.lud16;
  }

  // Fallback to lud06 (LNURL-pay)
  if (metadata.lud06) {
    return metadata.lud06;
  }

  return null;
}

/**
 * Converts Lightning address to LNURL-pay endpoint
 * Handles both Lightning addresses (user@domain.com) and LNURL strings
 */
export async function getLNURLPayEndpoint(lightningAddress: string): Promise<string | null> {
  try {
  if (import.meta.env.DEV) {
    console.log('🔍 Getting LNURL-pay endpoint for:', lightningAddress);
  }

    // Development mode: For testing, we can use a known working Lightning address
    if (import.meta.env.DEV && lightningAddress === 'test@stacker.news') {
    if (import.meta.env.DEV) {
      console.log('🧪 Using Stacker News test endpoint for development');
    }
      // Stacker News has a well-known LNURL-pay endpoint that usually works
      return 'https://stacker.news/.well-known/lnurlp/test';
    }

    // If it's already an LNURL, we need to decode it
    if (lightningAddress.toLowerCase().startsWith('lnurl')) {
    if (import.meta.env.DEV) {
      console.log('📡 Processing LNURL string');
    }
      // For now, return null as LNURL decoding requires additional libraries
      // In production, you'd decode the bech32 LNURL and get the endpoint
    if (import.meta.env.DEV) {
      console.log('⚠️ LNURL decoding not implemented yet');
    }
      return null;
    }

    // If it's a Lightning address (user@domain.com), convert to LNURL-pay endpoint
    if (lightningAddress.includes('@')) {
      const [username, domain] = lightningAddress.split('@');
    if (import.meta.env.DEV) {
      console.log('🌐 Converting Lightning address:', { username, domain });
    }
      
      const wellKnownUrl = `https://${domain}/.well-known/lnurlp/${username}`;
    if (import.meta.env.DEV) {
      console.log('📡 Fetching from:', wellKnownUrl);
    }
      
      // Use CORS-aware fetch to handle potential CORS issues
      const response = await corsAwareFetch(wellKnownUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('❌ Failed to fetch LNURL-pay info:', response.status, response.statusText);
        throw new Error(`Failed to fetch LNURL-pay endpoint: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
    if (import.meta.env.DEV) {
      console.log('📊 LNURL-pay response:', data);
    }
      
      // Return the callback URL which is the actual payment endpoint
      if (data.callback) {
      if (import.meta.env.DEV) {
        console.log('✅ Found callback URL:', data.callback);
      }
        return data.callback;
      } else {
        console.error('❌ No callback URL in response');
        throw new Error('No callback URL found in LNURL-pay response');
      }
    }

  if (import.meta.env.DEV) {
    console.log('❌ Invalid Lightning address format');
  }
    return null;
  } catch (error) {
    console.error('💥 Error getting LNURL-pay endpoint:', error);
    return null;
  }
}

/**
 * Creates a zap request for the given parameters
 */
export function createZapRequest(
  recipientPubkey: string,
  amount: number,
  comment: string = '',
  eventId?: string
) {
  const zapRequest = {
    kind: 9734,
    content: comment,
    tags: [
      ['p', recipientPubkey],
      ['amount', (amount * 1000).toString()], // Convert sats to millisats
      ['relays', 'wss://relay.nostr.band'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };

  if (eventId) {
    zapRequest.tags.push(['e', eventId]);
  }

  return zapRequest;
}
