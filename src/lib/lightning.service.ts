import { requestProvider } from 'webln';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { ZAPTOK_CONFIG } from '@/constants';

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

export interface LNURLPayResponse {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  commentAllowed?: number;
}

export interface LNURLPayCallbackResponse {
  pr: string;
  successAction?: {
    tag: string;
    message?: string;
    url?: string;
  };
}

export class LightningService {
  private static instance: LightningService;

  public static getInstance(): LightningService {
    if (!LightningService.instance) {
      LightningService.instance = new LightningService();
    }
    return LightningService.instance;
  }

  private constructor() {}

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
}

// Export singleton instance
export const lightningService = LightningService.getInstance();