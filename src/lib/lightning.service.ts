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
   * Generate a Lightning invoice for a donation
   * For now, this returns a mock invoice - in production this would
   * integrate with LNURL-pay or similar service
   */
  async generateInvoice(
    amount: number,
    comment: string = '',
    recipientPubkey: string = ZAPTOK_DEV_PUBKEY
  ): Promise<PaymentRequest> {
    try {
      // For now, return a mock invoice structure
      // In production, this would call the actual Lightning service
      const mockInvoice = `lnbc${Math.floor(amount/1000)}u1p...mock_invoice_for_${amount}_sats`;
      
      return {
        invoice: mockInvoice,
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
      return invoice.toLowerCase().startsWith('lnbc') || invoice.toLowerCase().startsWith('lntb');
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
}

// Export singleton instance
export const lightningService = LightningService.getInstance();