import { requestProvider } from 'webln';
import { nip19, kinds, type Filter, type EventTemplate } from 'nostr-tools';
import { makeZapRequest } from 'nostr-tools/nip57';
import type { NostrEvent } from '@nostrify/nostrify';
import { ZAPTOK_CONFIG } from '@/constants';
import { debugLog } from '@/lib/debug';
import { devLog } from '@/lib/devConsole';
import { useNostr } from '@nostrify/react';
import {
  init,
  launchPaymentModal,
  onConnected,
  onDisconnected
} from '@getalby/bitcoin-connect-react';
import { Invoice } from '@getalby/lightning-tools';
import { bech32 } from '@scure/base';
import type { WebLNProvider } from 'webln';
import dayjs from 'dayjs';
import type { SubCloser } from 'nostr-tools/abstract-pool';

// LNURL types from @getalby/lightning-tools
export interface LNURLPayResponse {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  commentAllowed?: number;
  tag: string;
  allowsNostr?: boolean;
}

export interface LNURLPayCallbackResponse {
  pr?: string;
  successAction?: any;
  disposable?: boolean;
  routes?: any[];
}

// ZapTok developer pubkey for donations
export const ZAPTOK_DEV_PUBKEY = ZAPTOK_CONFIG.DEV_PUBKEY;

export interface PaymentRequest {
  invoice: string;
  amount: number;
  comment?: string;
  recipient: string;
}

export interface PaymentResponse {
  success: boolean;
  preimage?: string;
  error?: string;
}

export interface ZapInfo {
  senderPubkey?: string;
  recipientPubkey?: string;
  eventId?: string;
  originalEventId?: string;
  invoice?: string;
  amount: number;
  comment?: string;
  preimage?: string;
}

export type TRecentSupporter = {
  pubkey: string;
  amount: number;
  comment?: string;
  formattedAmount: string;
  timestamp: number;
}

/**
 * Parse zap receipt event to extract payment information
 * Based on Jumble's comprehensive implementation
 */
export function getZapInfoFromEvent(receiptEvent: NostrEvent): ZapInfo | null {
  if (receiptEvent.kind !== kinds.Zap) return null;

  let senderPubkey: string | undefined;
  let recipientPubkey: string | undefined;
  let originalEventId: string | undefined;
  let eventId: string | undefined;
  let invoice: string | undefined;
  let amount: number | undefined;
  let comment: string | undefined;
  let description: string | undefined;
  let preimage: string | undefined;

  try {
    receiptEvent.tags.forEach((tag) => {
      const [tagName, tagValue] = tag;
      switch (tagName) {
        case 'P': // Sender pubkey (from zap request)
          senderPubkey = tagValue;
          break;
        case 'p': // Recipient pubkey
          recipientPubkey = tagValue;
          break;
        case 'e': // Original event ID
          originalEventId = tag[1];
          eventId = tag[1]; // Could be converted to bech32 if needed
          break;
        case 'bolt11': // Lightning invoice
          invoice = tagValue;
          break;
        case 'description': // Zap request (contains comment)
          description = tagValue;
          break;
        case 'preimage': // Payment preimage
          preimage = tagValue;
          break;
        case 'amount': // Amount in millisats (fallback)
          if (!amount) {
            amount = parseInt(tagValue) / 1000; // Convert to sats
          }
          break;
      }
    });

    if (!recipientPubkey || !invoice) return null;

    // Parse amount from invoice (Jumble's strategy)
    amount = invoice ? getAmountFromInvoice(invoice) : 0;

    // Parse description to get comment from zap request
    if (description) {
      try {
        const zapRequest = JSON.parse(description);
        comment = zapRequest.content;
        if (!senderPubkey) {
          senderPubkey = zapRequest.pubkey;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return {
      senderPubkey,
      recipientPubkey,
      eventId,
      originalEventId,
      invoice,
      amount,
      comment,
      preimage
    };
  } catch {
    return null;
  }
}

/**
 * Get amount from Lightning invoice using @getalby/lightning-tools
 */
export function getAmountFromInvoice(invoice: string): number {
  try {
    const _invoice = new Invoice({ pr: invoice });
    return _invoice.satoshi;
  } catch {
    return 0;
  }
}

/**
 * Format amount like Jumble
 */
export function formatAmount(amount: number): string {
  if (amount < 1000) return amount.toString();
  if (amount < 1000000) return `${Math.round(amount / 100) / 10}k`;
  return `${Math.round(amount / 100000) / 10}M`;
}

export class LightningService {
  private static instance: LightningService;
  private provider: WebLNProvider | null = null;
  private recentSupportersCache: TRecentSupporter[] | null = null;

  public static getInstance(): LightningService {
    if (!LightningService.instance) {
      LightningService.instance = new LightningService();
    }
    return LightningService.instance;
  }

  private constructor() {
    // Initialize Bitcoin Connect like Jumble
    init({
      appName: 'ZapTok',
      showBalance: false
    });

    onConnected((provider) => {
      this.provider = provider;
    });

    onDisconnected(() => {
      this.provider = null;
    });
  }

  /**
   * Comprehensive NIP-57 zap implementation based on Jumble
   */
  async zap(
    sender: string,
    recipientOrEvent: string | NostrEvent,
    sats: number,
    comment: string,
    nostr: any, // Nostr client from useNostr hook
    user: any, // User object with signer from useCurrentUser hook
    closeOuterModal?: () => void
  ): Promise<{ preimage: string; invoice: string } | null> {
        // Enhanced debug logging for bunker signer structure
    console.log('🔍 Donation Zap Debug:', {
      hasSignEventDirectly: !!user.signer?.signEvent,
      signEvent: user.signer?.signEvent,
      signerKeys: user.signer ? Object.keys(user.signer) : [],
      signerConstructor: user.signer?.constructor?.name,
      signerPrototype: user.signer ? Object.getOwnPropertyNames(Object.getPrototypeOf(user.signer)) : [],
      bunkerSigner: user.signer?.bunkerSigner,
      bunkerSignerKeys: user.signer?.bunkerSigner ? Object.keys(user.signer.bunkerSigner) : [],
      bunkerSignerMethods: user.signer?.bunkerSigner ? Object.getOwnPropertyNames(Object.getPrototypeOf(user.signer.bunkerSigner)) : []
    });
    
    // Deep inspection of signer object
    debugLog.lightning('Signer Object Details:', user.signer);
    if (user.signer?.bunkerSigner) {
      devLog('🔍 Bunker Signer Details:', user.signer.bunkerSigner);
    }

    // Handle different signer types and method access patterns
    let signEventMethod: ((event: EventTemplate) => Promise<NostrEvent>) | undefined;

    console.log('🔍 [Lightning] Inspecting user object for signEvent method:', {
      hasUser: !!user,
      userKeys: user ? Object.keys(user) : [],
      hasSigner: !!user?.signer,
      signerType: user?.signer?.constructor?.name,
      signerKeys: user?.signer ? Object.keys(user.signer) : [],
      signerProtoKeys: user?.signer ? Object.getOwnPropertyNames(Object.getPrototypeOf(user.signer)) : [],
      hasSignEventDirect: typeof user?.signer?.signEvent === 'function',
      hasBunkerSigner: !!user?.signer?.bunkerSigner,
      bunkerSignerKeys: user?.signer?.bunkerSigner ? Object.keys(user.signer.bunkerSigner) : []
    });

    // PRIORITY 1: Check for NIP-07 interface on main signer (service worker bunker pattern)
    // Based on service worker logs, bunker signers implement NIP-07 at the main signer level
    if (user?.signer && typeof user.signer.signEvent === 'function') {
      signEventMethod = user.signer.signEvent.bind(user.signer);
      console.log('✅ [Lightning] Found NIP-07 signEvent method on main signer (service worker pattern)');
    }
    // PRIORITY 2: Check for signEvent on prototype (class methods)
    else if (user?.signer && typeof Object.getPrototypeOf(user.signer).signEvent === 'function') {
      signEventMethod = Object.getPrototypeOf(user.signer).signEvent.bind(user.signer);
      console.log('✅ [Lightning] Found signEvent method on signer prototype');
    }
    // PRIORITY 3: Deep prototype chain search on main signer (for service worker bunker signers)
    else if (user?.signer) {
      devLog('🔍 [Lightning] Service worker bunker pattern: Searching prototype chain on main signer...');
      let currentProto = user.signer;
      let depth = 0;
      while (currentProto && depth < 10) {
        const methods = Object.getOwnPropertyNames(currentProto).filter(prop => {
          try {
            return typeof currentProto[prop] === 'function';
          } catch (e) {
            return false;
          }
        });
        
        console.log(`🔍 Signer depth ${depth} methods:`, methods);
        
        if (methods.includes('signEvent')) {
          signEventMethod = currentProto.signEvent.bind(user.signer);
          console.log(`✅ [Lightning] Found signEvent on main signer at depth ${depth} (service worker pattern)`);
          break;
        }
        
        // Check for other NIP-07 methods to confirm this is the right interface
        const nip07Methods = methods.filter(m => ['getPublicKey', 'signEvent', 'getRelays', 'nip04', 'nip44'].includes(m));
        if (nip07Methods.length > 0) {
          console.log(`🔍 Found NIP-07 methods at depth ${depth}:`, nip07Methods);
        }
        
        currentProto = Object.getPrototypeOf(currentProto);
        depth++;
      }
    }
    // PRIORITY 4: Check if it's a bunker signer with underlying bunkerSigner object
    if (!signEventMethod && user?.signer?.bunkerSigner) {
      const bunkerSigner = user.signer.bunkerSigner;
      
      // Detailed inspection of bunkerSigner methods
      devLog('🔍 [Lightning] Detailed bunker signer inspection:');
      devLog('🔍 Own properties:', Object.getOwnPropertyNames(bunkerSigner));
      devLog('🔍 Keys:', Object.keys(bunkerSigner));
      
      // Check if bunker signer has signEvent method
      if (typeof bunkerSigner.signEvent === 'function') {
        signEventMethod = bunkerSigner.signEvent.bind(bunkerSigner);
        devLog('✅ [Lightning] Found signEvent method on bunkerSigner');
      }
      // Try accessing through prototype chain
      else {
        let currentProto = bunkerSigner;
        let depth = 0;
        while (currentProto && depth < 5) {
          console.log(`🔍 Prototype depth ${depth}:`, Object.getOwnPropertyNames(currentProto));
          
          if (typeof currentProto.signEvent === 'function') {
            signEventMethod = currentProto.signEvent.bind(bunkerSigner);
            console.log(`✅ [Lightning] Found signEvent method at prototype depth ${depth}`);
            break;
          }
          
          currentProto = Object.getPrototypeOf(currentProto);
          depth++;
        }
      }
      
      // If still not found, try checking if the bunker has a different interface
      if (!signEventMethod) {
        console.log('🔍 [Lightning] Checking for alternative signing methods...');
        
        // Check for other possible signing methods
        const possibleSignMethods = ['sign', 'signEvent', 'signMessage', 'rpc'];
        for (const methodName of possibleSignMethods) {
          if (typeof bunkerSigner[methodName] === 'function') {
            console.log(`🔍 Found potential signing method: ${methodName}`);
            
            // For nostr-tools bunker, we might need to use the RPC-style interface
            if (methodName === 'rpc' || methodName === 'sign') {
              // Create a wrapper that calls the appropriate method
              signEventMethod = async (event: any) => {
                console.log('🔍 [Lightning] Attempting to sign via', methodName);
                return await bunkerSigner[methodName](event);
              };
              console.log(`✅ [Lightning] Using ${methodName} method for signing`);
              break;
            }
          }
        }
      }
    }
    // For nostr-tools bunker signers, the signer itself might be the bunker signer
    else if (user?.signer && typeof user.signer.signEvent === 'function') {
      signEventMethod = user.signer.signEvent.bind(user.signer);
      devLog('✅ [Lightning] Found signEvent method directly on bunker signer');
    }
    // If we still haven't found anything, but we know it's a bunker signer, do fallback checks
    else if (user?.signer) {
      devLog('🔍 [Lightning] Fallback: Checking signer object for any signing methods...');
      devLog('🔍 Signer own properties:', Object.getOwnPropertyNames(user.signer));
      
      // Check for any method that might be used for signing
      const allMethods = Object.getOwnPropertyNames(user.signer)
        .filter(name => typeof user.signer[name] === 'function');
      console.log('🔍 All signer methods:', allMethods);
      
      // Look for methods that might be signing-related
      const signingMethods = allMethods.filter(name => 
        name.toLowerCase().includes('sign') || 
        name.toLowerCase().includes('event') ||
        name.toLowerCase().includes('rpc')
      );
      console.log('🔍 Potential signing methods:', signingMethods);
      
      // Try to find signEvent method via property enumeration as fallback
      for (const prop of Object.getOwnPropertyNames(user.signer)) {
        if (prop === 'signEvent' && typeof user.signer[prop] === 'function') {
          signEventMethod = user.signer[prop].bind(user.signer);
          console.log('✅ [Lightning] Found signEvent method via property enumeration');
          break;
        }
      }
    }

    if (!signEventMethod) {
      console.error('❌ [Lightning] No signEvent method found on any signer level');
      if (user?.signer) {
        const allMethods = [
          ...Object.getOwnPropertyNames(user.signer),
          ...Object.getOwnPropertyNames(Object.getPrototypeOf(user.signer))
        ].filter(key => typeof (user.signer as any)[key] === 'function');
        console.error('Available methods:', allMethods);
      }
      throw new Error('You need to be logged in to zap');
    }

    const { recipient, event } =
      typeof recipientOrEvent === 'string'
        ? { recipient: recipientOrEvent }
        : { recipient: recipientOrEvent.pubkey, event: recipientOrEvent };

    // Fetch recipient profile to get Lightning address
    const profile = await this.fetchProfile(recipient, nostr);
    if (!profile) {
      throw new Error('Recipient not found');
    }

    // Get zap endpoint from Lightning address
    const zapEndpoint = await this.getZapEndpoint(profile);
    if (!zapEndpoint) {
      throw new Error("Recipient's lightning address is invalid");
    }

    const { callback, lnurl } = zapEndpoint;
    const amount = sats * 1000; // Convert to millisats

    // Create NIP-57 zap request
    const zapRequestDraft = makeZapRequest({
      ...(event ? { event } : { pubkey: recipient }),
      amount,
      relays: [ZAPTOK_CONFIG.DEFAULT_RELAY_URL], // Use our default relay
      comment
    });

    // Sign the zap request using the found signEvent method
    let zapRequest: NostrEvent;
    try {
      zapRequest = await signEventMethod(zapRequestDraft);
      debugLog.lightning('✅ Successfully signed zap request (kind 9734)', { zapRequest });
    } catch (signError) {
      debugLog.lightning('❌ Failed to sign zap request:', signError);

      // Check if this might be a permission issue
      if (signError.message?.includes('permission') || signError.message?.includes('not allowed')) {
        throw new Error('Bunker signer needs permission to sign zap requests (kind 9734). Please add this permission in your bunker app.');
      }

      throw new Error(`Failed to sign zap request: ${signError.message}`);
    }

    // Request invoice from LNURL callback
    debugLog.lightningVerbose('🔄 Requesting invoice from LNURL callback...', {
      callback,
      amount,
      lnurl,
      zapRequestLength: JSON.stringify(zapRequest).length
    });

    let pr: string;
    let verify: string | undefined;

    try {
      const callbackUrl = `${callback}?amount=${amount}&nostr=${encodeURI(JSON.stringify(zapRequest))}&lnurl=${lnurl}`;
      debugLog.lightningVerbose('📤 Making LNURL callback request to:', callbackUrl.substring(0, 200) + '...');

      const zapRequestRes = await fetch(callbackUrl);
      debugLog.lightningVerbose('📥 LNURL callback response status:', zapRequestRes.status);

      if (!zapRequestRes.ok) {
        throw new Error(`LNURL callback failed with status ${zapRequestRes.status}`);
      }

      const zapRequestResBody = await zapRequestRes.json();
      debugLog.lightningVerbose('📋 LNURL callback response body:', zapRequestResBody);

      if (zapRequestResBody.error) {
        debugLog.lightning('❌ LNURL callback error:', zapRequestResBody);
        throw new Error(zapRequestResBody.message || zapRequestResBody.error);
      }

      ({ pr, verify } = zapRequestResBody);
      if (!pr) {
        debugLog.lightning('❌ No payment request received:', zapRequestResBody);
        throw new Error('Failed to create invoice');
      }

      debugLog.lightning('✅ Invoice generated successfully', {
        invoiceLength: pr.length,
        hasVerify: !!verify
      });

    } catch (fetchError) {
      debugLog.lightning('❌ LNURL callback request failed:', fetchError);
      throw new Error(`Failed to get invoice: ${fetchError.message}`);
    }

    // Pay with WebLN if available
    if (this.provider) {
      debugLog.lightning('💰 Paying with WebLN provider...');
      try {
        const { preimage } = await this.provider.sendPayment(pr);
        closeOuterModal?.();
        debugLog.lightning('✅ WebLN payment successful', { preimage });
        return { preimage, invoice: pr };
      } catch (weblnError) {
        debugLog.lightning('❌ WebLN payment failed:', weblnError);
        // Continue to fallback payment modal
      }
    }

    debugLog.lightning('🎭 Launching Bitcoin Connect payment modal...');

    // Fallback to Bitcoin Connect payment modal
    debugLog.lightning('🎭 Launching Bitcoin Connect payment modal...');
    return new Promise((resolve) => {
      closeOuterModal?.();
      let checkPaymentInterval: ReturnType<typeof setInterval> | undefined;
      let subCloser: any; // SubCloser type

      debugLog.lightningVerbose('🚀 Setting up payment modal with invoice:', pr.substring(0, 50) + '...');

      const { setPaid } = launchPaymentModal({
        invoice: pr,
        onPaid: (response) => {
          debugLog.lightning('✅ Payment completed via modal:', response);
          clearInterval(checkPaymentInterval);
          subCloser?.close();
          resolve({ preimage: response.preimage, invoice: pr });
        },
        onCancelled: () => {
          debugLog.lightning('❌ Payment cancelled by user');
          clearInterval(checkPaymentInterval);
          subCloser?.close();
          resolve(null);
        }
      });

      debugLog.lightningVerbose('🔍 Payment modal launched, setting up monitoring...');

      // Monitor for zap receipt if we have verification
      if (verify) {
        checkPaymentInterval = setInterval(async () => {
          try {
            const invoice = new Invoice({ pr, verify });
            const paid = await invoice.verifyPayment();
            if (paid && invoice.preimage) {
              setPaid({ preimage: invoice.preimage });
            }
          } catch (error) {
            // Ignore verification errors
          }
        }, 1000);
      } else {
        // Monitor Nostr for zap receipt
        const filter: Filter = {
          kinds: [kinds.Zap],
          '#p': [recipient],
          since: dayjs().subtract(1, 'minute').unix()
        };

        if (event) {
          filter['#e'] = [event.id];
        }

        subCloser = nostr.subscribe([ZAPTOK_CONFIG.DEFAULT_RELAY_URL], filter, {
          onevent: (evt: NostrEvent) => {
            const info = getZapInfoFromEvent(evt);
            if (!info) return;

            if (info.invoice === pr) {
              setPaid({ preimage: info.preimage ?? '' });
            }
          }
        });
      }
    });
  }

  /**
   * Fetch LNURL-pay information from Lightning address
   */
  private async fetchLNURLPayInfo(lightningAddress: string): Promise<LNURLPayResponse> {
    try {
      const lnurlpUrl = this.lightningAddressToLNURL(lightningAddress);
      const response = await fetch(lnurlpUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch LNURL-pay info: ${response.status}`);
      }

      const data = await response.json();

      if (data.tag !== 'payRequest') {
        throw new Error('Invalid LNURL-pay response');
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch LNURL-pay info:', error);
      throw new Error(`Failed to resolve Lightning address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a Lightning invoice for a donation using LNURL-pay
   */
  async generateInvoice(
    amount: number,
    comment: string = '',
    recipientPubkey: string = ZAPTOK_DEV_PUBKEY
  ): Promise<PaymentRequest> {
    try {
      const lightningAddress = ZAPTOK_CONFIG.LIGHTNING_ADDRESS;

      // Validate amount is in acceptable range
      if (amount < 1) {
        throw new Error('Amount must be at least 1 sat');
      }

      // Convert sats to millisats for LNURL
      const amountMsat = amount * 1000;

      // Step 1: Get LNURL-pay info
      const lnurlPayInfo = await this.fetchLNURLPayInfo(lightningAddress);

      // Validate amount is within limits
      if (amountMsat < lnurlPayInfo.minSendable) {
        throw new Error(`Amount too small. Minimum: ${lnurlPayInfo.minSendable / 1000} sats`);
      }

      if (amountMsat > lnurlPayInfo.maxSendable) {
        throw new Error(`Amount too large. Maximum: ${lnurlPayInfo.maxSendable / 1000} sats`);
      }

      // Check if comments are supported
      const commentAllowed = lnurlPayInfo.commentAllowed || 0;
      if (comment.length > commentAllowed) {
        console.warn(`Comment truncated to ${commentAllowed} characters`);
        comment = comment.substring(0, commentAllowed);
      }

      // Step 2: Request invoice from callback URL
      const callbackUrl = new URL(lnurlPayInfo.callback);
      callbackUrl.searchParams.set('amount', amountMsat.toString());

      if (comment && commentAllowed > 0) {
        callbackUrl.searchParams.set('comment', comment);
      }

      const callbackResponse = await fetch(callbackUrl.toString());

      if (!callbackResponse.ok) {
        throw new Error(`Failed to get invoice: ${callbackResponse.status}`);
      }

      const callbackData: LNURLPayCallbackResponse = await callbackResponse.json();

      if (!callbackData.pr) {
        throw new Error('No payment request received from Lightning service');
      }

      return {
        invoice: callbackData.pr,
        amount,
        comment,
        recipient: recipientPubkey,
      };
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      throw new Error(`Failed to generate Lightning invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pay a Lightning invoice using WebLN
   */
  async payInvoice(invoice: string): Promise<PaymentResponse> {
    try {
      const webln = await requestProvider();
      const response = await webln.sendPayment(invoice);

      return {
        success: true,
        preimage: response.preimage,
      };
    } catch (error) {
      console.error('Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Validate a Lightning invoice format
   */
  validateInvoice(invoice: string): boolean {
    try {
      // Check for valid Lightning invoice prefixes
      const lowerInvoice = invoice.toLowerCase();
      if (!lowerInvoice.startsWith('lnbc') && !lowerInvoice.startsWith('lntb') && !lowerInvoice.startsWith('lnbcrt')) {
        return false;
      }

      // Basic length check (Lightning invoices are typically quite long)
      if (invoice.length < 100) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if WebLN is available
   */
  async isWebLNAvailable(): Promise<boolean> {
    try {
      await requestProvider();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Lightning address info (for validation/display)
   */
  async getLightningAddressInfo(lightningAddress: string): Promise<{
    minSendable: number;
    maxSendable: number;
    commentAllowed: number;
    metadata: string;
  }> {
    try {
      const lnurlPayInfo = await this.fetchLNURLPayInfo(lightningAddress);

      return {
        minSendable: Math.floor(lnurlPayInfo.minSendable / 1000), // Convert to sats
        maxSendable: Math.floor(lnurlPayInfo.maxSendable / 1000), // Convert to sats
        commentAllowed: lnurlPayInfo.commentAllowed || 0,
        metadata: lnurlPayInfo.metadata,
      };
    } catch (error) {
      console.error('Failed to get Lightning address info:', error);
      throw error;
    }
  }

  /**
   * Fetch user profile from Nostr
   */
  private async fetchProfile(pubkey: string, nostr: any): Promise<NostrEvent | null> {
    try {
      const events = await nostr.query([{
        kinds: [kinds.Metadata],
        authors: [pubkey]
      }], { signal: AbortSignal.timeout(5000) });

      return events[0] || null;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Get zap endpoint from Lightning address in profile
   */
  private async getZapEndpoint(profileEvent: NostrEvent): Promise<{ callback: string; lnurl: string } | null> {
    try {
      const metadata = JSON.parse(profileEvent.content);
      const lightningAddress = metadata.lud16 || metadata.lud06;

      if (!lightningAddress) {
        return null;
      }

      const lnurl = this.lightningAddressToLNURL(lightningAddress);
      const res = await fetch(lnurl);
      const data = await res.json();

      if (!data.callback || !data.allowsNostr) {
        return null;
      }

      return { callback: data.callback, lnurl: lightningAddress };
    } catch (error) {
      console.error('Failed to get zap endpoint:', error);
      return null;
    }
  }

  /**
   * Convert Lightning address to LNURL
   */
  private lightningAddressToLNURL(lightningAddress: string): string {
    const [name, domain] = lightningAddress.split('@');
    if (!name || !domain) {
      throw new Error('Invalid Lightning address format');
    }

    const url = `https://${domain}/.well-known/lnurlp/${name}`;
    return url;
  }

  /**
   * Fetch recent supporters from Nostr zap events with service-level caching
   */
  async fetchRecentSupporters(nostr: any): Promise<TRecentSupporter[]> {
    try {
      const events = await nostr.query([{
        kinds: [kinds.Zap],
        '#p': [ZAPTOK_DEV_PUBKEY],
        limit: 50
      }], { signal: AbortSignal.timeout(5000) });

      const supporters = new Map<string, TRecentSupporter>();

      for (const event of events) {
        const zapInfo = getZapInfoFromEvent(event);
        if (!zapInfo?.senderPubkey || zapInfo.amount <= 0) continue;

        const existingSupporter = supporters.get(zapInfo.senderPubkey);
        if (!existingSupporter || zapInfo.amount > existingSupporter.amount) {
          supporters.set(zapInfo.senderPubkey, {
            pubkey: zapInfo.senderPubkey,
            amount: zapInfo.amount,
            comment: zapInfo.comment,
            formattedAmount: formatAmount(zapInfo.amount),
            timestamp: event.created_at
          });
        }
      }

      this.recentSupportersCache = Array.from(supporters.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);

      return this.recentSupportersCache;
    } catch (error) {
      console.error('Failed to fetch supporters:', error);
      return this.recentSupportersCache || [];
    }
  }

  /**
   * Get cached recent supporters
   */
  getCachedSupporters(): TRecentSupporter[] {
    return this.recentSupportersCache || [];
  }
}

// Export singleton instance
export const lightningService = LightningService.getInstance();