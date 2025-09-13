import { 
  launchPaymentModal,
  closeModal,
  init as initBitcoinConnect
} from '@getalby/bitcoin-connect-react';
import { WebLNProvider } from '@/lib/wallet-types';

export interface PaymentResult {
  preimage: string;
  invoice: string;
}

export interface LightningServiceConfig {
  appName?: string;
}

/**
 * Lightning Service based on Jumble's implementation pattern
 * Provides Lightning payment capabilities using Bitcoin Connect
 */
class LightningService {
  private provider: WebLNProvider | null = null;
  private isInitialized = false;

  constructor(config?: LightningServiceConfig) {
    this.initialize(config);
  }

  /**
   * Initialize Bitcoin Connect
   */
  private async initialize(config?: LightningServiceConfig) {
    if (this.isInitialized) return;

    try {
      await initBitcoinConnect({
        appName: config?.appName || 'ZapTok'
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Bitcoin Connect:', error);
      throw error;
    }
  }

  /**
   * Set WebLN provider (if available)
   */
  setProvider(provider: WebLNProvider | null) {
    this.provider = provider;
  }

  /**
   * Pay a Lightning invoice using Bitcoin Connect pattern from Jumble
   * Falls back to Bitcoin Connect modal if no WebLN provider available
   */
  async payInvoice(
    invoice: string,
    closeOuterModal?: () => void
  ): Promise<PaymentResult | null> {
    // Ensure Bitcoin Connect is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try WebLN provider first (if available)
    if (this.provider) {
      try {
        const { preimage } = await this.provider.sendPayment(invoice);
        closeOuterModal?.();
        return { preimage, invoice };
      } catch (error) {
        console.error('WebLN payment failed, falling back to Bitcoin Connect modal:', error);
        // Fall through to Bitcoin Connect modal
      }
    }

    // Use Bitcoin Connect modal as fallback (Jumble's pattern)
    return new Promise((resolve) => {
      closeOuterModal?.();
      
      const { setPaid } = launchPaymentModal({
        invoice: invoice,
        onPaid: (response) => {
          resolve({ preimage: response.preimage, invoice: invoice });
        },
        onCancelled: () => {
          resolve(null);
        }
      });

      // Optional: Add payment verification polling here if needed
      // This would be similar to Jumble's verification pattern
    });
  }

  /**
   * Create and pay an invoice for zapping (Lightning tips)
   * Based on Jumble's zap implementation pattern
   */
  async zap(
    recipientPubkey: string,
    amountSats: number,
    comment?: string,
    closeOuterModal?: () => void
  ): Promise<PaymentResult | null> {
    try {
      // In a real implementation, this would:
      // 1. Fetch recipient's Lightning address/LNURL
      // 2. Generate zap request (NIP-57)
      // 3. Get invoice from LNURL endpoint
      // 4. Pay the invoice
      
      // For now, this is a placeholder that shows the pattern
      console.log('Zap request:', { recipientPubkey, amountSats, comment });
      
      // This would be replaced with actual invoice generation
      throw new Error('Zap implementation requires LNURL/Lightning address integration');
      
    } catch (error) {
      console.error('Zap failed:', error);
      throw error;
    }
  }

  /**
   * Close any open Bitcoin Connect modals
   */
  closeModal() {
    try {
      closeModal();
    } catch (error) {
      console.error('Failed to close Bitcoin Connect modal:', error);
    }
  }

  /**
   * Check if Bitcoin Connect is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance (following Jumble's pattern)
export const lightningService = new LightningService();

// Export the class for direct instantiation if needed
export default LightningService;