/**
 * Client-side Lightning integration using Vercel serverless proxy
 * Handles CORS issues for Lightning address payments
 */

interface LightningAddressData {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  tag: string;
  allowsNostr?: boolean;
  nostrPubkey?: string;
}

interface LightningInvoiceResponse {
  pr: string;
  routes?: unknown[];
  status?: string;
  reason?: string;
}

interface PaymentResult {
  success: boolean;
  method: string;
  preimage?: string;
  error?: string;
}

/**
 * Enhanced Lightning provider information
 */
export interface LightningProvider {
  domain: string;
  corsSupport: 'full' | 'partial' | 'vercel-proxy' | 'none';
  supportsZaps: boolean;
  notes: string;
}

export const LIGHTNING_PROVIDERS: LightningProvider[] = [
  {
    domain: 'getalby.com',
    corsSupport: 'full',
    supportsZaps: true,
    notes: 'Full CORS support - works directly in browsers'
  },
  {
    domain: 'stacker.news',
    corsSupport: 'full',
    supportsZaps: true,
    notes: 'Full CORS support - excellent for Nostr zaps'
  },
  {
    domain: 'zbd.gg',
    corsSupport: 'partial',
    supportsZaps: true,
    notes: 'Partial CORS support - may work directly'
  },
  {
    domain: 'primal.net',
    corsSupport: 'vercel-proxy',
    supportsZaps: true,
    notes: 'Supported via secure Vercel serverless function'
  },
  {
    domain: 'walletofsatoshi.com',
    corsSupport: 'vercel-proxy',
    supportsZaps: true,
    notes: 'Supported via secure Vercel serverless function'
  },
  {
    domain: 'lnbits.com',
    corsSupport: 'vercel-proxy',
    supportsZaps: true,
    notes: 'Supported via secure Vercel serverless function'
  },
  {
    domain: 'strike.army',
    corsSupport: 'vercel-proxy',
    supportsZaps: true,
    notes: 'Supported via secure Vercel serverless function'
  },
  {
    domain: 'coinos.io',
    corsSupport: 'vercel-proxy',
    supportsZaps: true,
    notes: 'Supported via secure Vercel serverless function'
  }
];

/**
 * Get Lightning provider information
 */
export function getProviderInfo(lightningAddress: string): LightningProvider | null {
  const domain = lightningAddress.split('@')[1];
  return LIGHTNING_PROVIDERS.find(p => p.domain === domain) || null;
}

/**
 * Check if Lightning address needs Vercel proxy
 */
export function needsVercelProxy(lightningAddress: string): boolean {
  const provider = getProviderInfo(lightningAddress);
  return provider?.corsSupport === 'vercel-proxy';
}

/**
 * Get payment suggestion based on provider capabilities
 */
export function getPaymentSuggestion(lightningAddress: string): {
  canUseWebLN: boolean;
  shouldUseCashu: boolean;
  message: string;
  isBlocked: boolean;
  method: string;
} {
  const provider = getProviderInfo(lightningAddress);

  if (!provider) {
    return {
      canUseWebLN: false,
      shouldUseCashu: false,
      isBlocked: true,
      message: 'Unknown provider - may not work with browser apps',
      method: 'unknown'
    };
  }

  switch (provider.corsSupport) {
    case 'full':
      return {
        canUseWebLN: true,
        shouldUseCashu: false,
        isBlocked: false,
        message: 'Direct connection - WebLN should work perfectly',
        method: 'direct'
      };
    case 'partial':
      return {
        canUseWebLN: true,
        shouldUseCashu: true,
        isBlocked: false,
        message: 'Partial support - WebLN may work, Cashu recommended as backup',
        method: 'direct-fallback'
      };
    case 'vercel-proxy':
      return {
        canUseWebLN: true,
        shouldUseCashu: true,
        isBlocked: false,
        message: 'Using secure proxy - both WebLN and Cashu supported',
        method: 'proxy'
      };
    case 'none':
      return {
        canUseWebLN: false,
        shouldUseCashu: false,
        isBlocked: true,
        message: `${provider.domain} doesn't support browser apps. Try Alby, Stacker News, or ZBD.`,
        method: 'blocked'
      };
    default:
      return {
        canUseWebLN: false,
        shouldUseCashu: false,
        isBlocked: true,
        message: 'This provider may not work with browser apps',
        method: 'unknown'
      };
  }
}

/**
 * Resolve Lightning address - tries direct first, falls back to proxy
 */
export async function resolveLightningAddress(lightningAddress: string): Promise<LightningAddressData> {
  const provider = getProviderInfo(lightningAddress);

  // For providers with full or partial CORS support, try direct first
  if (provider?.corsSupport === 'full' || provider?.corsSupport === 'partial') {
    try {
      return await resolveLightningAddressDirect(lightningAddress);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Direct Lightning address resolution failed, trying proxy...', error);
      }
      // Fall back to proxy for partial support providers
      if (provider.corsSupport === 'partial') {
        return await resolveLightningAddressProxy(lightningAddress);
      }
      throw error;
    }
  }

  // Use proxy for providers that need it
  if (provider?.corsSupport === 'vercel-proxy') {
    return await resolveLightningAddressProxy(lightningAddress);
  }

  // Blocked providers
  throw new Error(`Lightning address domain '${lightningAddress.split('@')[1]}' is not supported in browser apps`);
}

/**
 * Try direct Lightning address resolution (no proxy)
 */
async function resolveLightningAddressDirect(lightningAddress: string): Promise<LightningAddressData> {
  const [username, domain] = lightningAddress.split('@');
  const lnurlUrl = `https://${domain}/.well-known/lnurlp/${username}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const response = await fetch(lnurlUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZapTok/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.callback || !data.minSendable || !data.maxSendable) {
      throw new Error('Invalid Lightning address response');
    }

    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Lightning address resolution timeout');
    }

    // Check if it's a CORS error
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('CORS blocked - requires proxy');
    }

    throw error;
  }
}

/**
 * Resolve Lightning address using Vercel proxy
 */
async function resolveLightningAddressProxy(lightningAddress: string): Promise<LightningAddressData> {
  try {
    const response = await fetch(`/api/lightning-proxy?lightningAddress=${encodeURIComponent(lightningAddress)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Lightning proxy resolution failed:', error);
    }
    throw new Error('Lightning address resolution failed via proxy');
  }
}

/**
 * Generate Lightning invoice - uses appropriate method based on provider
 */
export async function generateLightningInvoice(
  lightningAddress: string,
  amountSats: number,
  comment?: string,
  nostr?: { eventId?: string; pubkey?: string }
): Promise<LightningInvoiceResponse> {
  // First resolve the Lightning address
  const lnurlData = await resolveLightningAddress(lightningAddress);

  // Validate amount
  const amountMsat = amountSats * 1000;
  if (amountMsat < lnurlData.minSendable || amountMsat > lnurlData.maxSendable) {
    throw new Error(`Amount must be between ${Math.ceil(lnurlData.minSendable / 1000)} and ${Math.floor(lnurlData.maxSendable / 1000)} sats`);
  }

  const provider = getProviderInfo(lightningAddress);

  // For direct providers, try direct invoice generation first
  if (provider?.corsSupport === 'full' || provider?.corsSupport === 'partial') {
    try {
      return await generateLightningInvoiceDirect(lnurlData.callback, amountMsat, comment, nostr);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Direct invoice generation failed, trying proxy...', error);
      }
      // Fall back to proxy for partial support providers
      if (provider.corsSupport === 'partial') {
        return await generateLightningInvoiceProxy(lnurlData.callback, amountMsat, comment, nostr);
      }
      throw error;
    }
  }

  // Use proxy for providers that need it
  if (provider?.corsSupport === 'vercel-proxy') {
    return await generateLightningInvoiceProxy(lnurlData.callback, amountMsat, comment, nostr);
  }

  throw new Error('Lightning invoice generation not supported for this provider');
}

/**
 * Generate Lightning invoice directly (no proxy)
 */
async function generateLightningInvoiceDirect(
  callback: string,
  amountMsat: number,
  comment?: string,
  nostr?: { eventId?: string; pubkey?: string }
): Promise<LightningInvoiceResponse> {
  const url = new URL(callback);
  url.searchParams.set('amount', amountMsat.toString());

  if (comment) {
    url.searchParams.set('comment', comment.slice(0, 500));
  }

  if (nostr?.eventId) {
    url.searchParams.set('nostr', JSON.stringify(nostr));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZapTok/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'Invoice generation failed');
    }

    if (!data.pr) {
      throw new Error('Invalid invoice response - missing payment request');
    }

    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Invoice generation timeout');
    }

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('CORS blocked - requires proxy');
    }

    throw error;
  }
}

/**
 * Generate Lightning invoice using Vercel proxy
 */
async function generateLightningInvoiceProxy(
  callback: string,
  amountMsat: number,
  comment?: string,
  nostr?: { eventId?: string; pubkey?: string }
): Promise<LightningInvoiceResponse> {
  try {
    const response = await fetch('/api/lightning-proxy', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callback,
        amount: amountMsat,
        comment,
        nostr
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Lightning proxy invoice generation failed:', error);
    }
    throw new Error('Lightning invoice generation failed via proxy');
  }
}

/**
 * Hybrid Lightning payment with multiple fallback strategies
 */
export async function makeZapPayment(
  lightningAddress: string,
  amountSats: number,
  comment?: string,
  nostr?: { eventId?: string; pubkey?: string }
): Promise<PaymentResult> {
  const suggestion = getPaymentSuggestion(lightningAddress);

  if (suggestion.isBlocked) {
    throw new Error(suggestion.message);
  }

  if (import.meta.env.DEV) {
    console.log(`⚡ Starting Lightning payment to ${lightningAddress} using ${suggestion.method} method`);
  }

  // Strategy 1: Try WebLN first (works with Alby, Bitcoin Connect, etc.)
  if (window.webln && suggestion.canUseWebLN) {
    try {
      // Check if Bitcoin Connect is active - if so, we can safely call enable()
      const bitcoinConnectActive = (window as any).__bitcoinConnectActive;
      console.log('[lightning-proxy] Checking Bitcoin Connect status:', bitcoinConnectActive);
      
      if (bitcoinConnectActive) {
        console.log('[lightning-proxy] Calling webln.enable() for Bitcoin Connect - safe from extension prompts');
        await window.webln.enable();
      } else {
        // For browser extensions, check if previously rejected to avoid conflicts
        const isAlbyRejected = (window.webln as any).__albyRejected;
        if (!isAlbyRejected) {
          console.log('[lightning-proxy] Calling webln.enable() for browser extension');
          await window.webln.enable();
        } else {
          console.log('[lightning-proxy] Skipping webln.enable() - browser extension previously rejected');
        }
      }

      const invoice = await generateLightningInvoice(lightningAddress, amountSats, comment, nostr);
      const payment = await window.webln.sendPayment(invoice.pr);

      if (import.meta.env.DEV) {
        console.log(`✅ WebLN payment successful via ${suggestion.method}`);
      }

      return {
        success: true,
        method: `webln-${suggestion.method}`,
        preimage: payment.preimage
      };

    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('WebLN payment failed, checking for alternatives...', error);
      }

      // Don't throw immediately - we might have other options
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // If it's a fundamental issue (blocked domain, etc.), throw immediately
      if (errorMessage.includes('not supported') || errorMessage.includes('blocked')) {
        throw error;
      }
    }
  }

  // Strategy 2: If WebLN is not available or failed, suggest alternatives
  if (suggestion.shouldUseCashu) {
    throw new Error('WebLN payment failed. Please try using a Cashu wallet or check your WebLN connection.');
  }

  // If we reach here, no payment methods worked
  throw new Error('Lightning payment failed. Please check your wallet connection or try a different Lightning address.');
}

/**
 * Test Lightning address compatibility
 */
export async function testLightningAddress(lightningAddress: string): Promise<{
  isSupported: boolean;
  method: string;
  canResolve: boolean;
  error?: string;
}> {
  try {
    const suggestion = getPaymentSuggestion(lightningAddress);

    if (suggestion.isBlocked) {
      return {
        isSupported: false,
        method: suggestion.method,
        canResolve: false,
        error: suggestion.message
      };
    }

    // Try to resolve the Lightning address
    await resolveLightningAddress(lightningAddress);

    return {
      isSupported: true,
      method: suggestion.method,
      canResolve: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      isSupported: false,
      method: 'error',
      canResolve: false,
      error: errorMessage
    };
  }
}