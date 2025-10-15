import type { NostrMetadata } from '@nostrify/nostrify';
import { Invoice } from '@getalby/lightning-tools';
import {
  makeZapPayment,
  getPaymentSuggestion,
  testLightningAddress,
  needsVercelProxy
} from './lightning-proxy';

/**
 * Get amount from Lightning invoice (following Jumble's pattern)
 */
export function getAmountFromInvoice(invoice: string): number {
  try {
    const _invoice = new Invoice({ pr: invoice });
    return _invoice.satoshi;
  } catch (error) {
    // Silently return 0 for invalid invoices - these are filtered out in the hooks
    // Only log in development if needed for debugging
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_INVOICES) {
      console.warn('Failed to parse invoice:', error);
    }
    return 0;
  }
}

/**
 * Format amount for display (following Jumble's pattern)
 */
export function formatAmount(amount: number) {
  if (amount < 1000) return amount.toString();
  if (amount < 1000000) return `${Math.round(amount / 100) / 10}k`;
  return `${Math.round(amount / 100000) / 10}M`;
}

/**
 * Get Lightning address from profile (following Jumble's pattern)
 */
export function getLightningAddressFromProfile(profile: any) {
  if (!profile) return null;

  // Check for Lightning address or LNURL
  if (profile.lud16) return profile.lud16;
  if (profile.lud06) return profile.lud06;
  if (profile.lightningAddress) return profile.lightningAddress;

  return null;
}

/**
 * Main payment function exports
 */
export { makeZapPayment, getPaymentSuggestion, testLightningAddress, needsVercelProxy };

/**
 * CORS-aware fetch using proxy system
 */
export async function corsAwareFetch(url: string, options?: RequestInit): Promise<Response> {
  // If this is a Lightning address URL, suggest using the new system
  if (url.includes('/.well-known/lnurlp/')) {
    throw new Error('Please use the new Lightning proxy system via makeZapPayment() function');
  }

  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      if (import.meta.env.DEV) {
        console.log('❌ CORS request failed for:', url);
      }

      // Provide helpful migration message
      throw new Error('CORS error. For Lightning payments, please use the new makeZapPayment() function which handles CORS automatically.');
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
