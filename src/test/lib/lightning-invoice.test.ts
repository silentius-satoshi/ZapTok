import { describe, it, expect } from 'vitest';
import { decodeLightningInvoice } from '@/lib/lightning-invoice';
import { formatBalance } from '@/lib/cashu';

describe('Lightning Invoice Utils', () => {
  describe('formatBalance', () => {
    it('should format numbers with appropriate units', () => {
      expect(formatBalance(21)).toBe('21 sats');
      expect(formatBalance(1000)).toBe('1,000 sats');
      expect(formatBalance(100000)).toBe('100.0k sats');
      expect(formatBalance(1000000)).toBe('1.0M sats');
    });
  });

  describe('decodeLightningInvoice', () => {
    it('should return null for invalid invoice', () => {
      const result = decodeLightningInvoice('invalid-invoice');
      expect(result).toBeNull();
    });

    it('should return null for empty invoice', () => {
      const result = decodeLightningInvoice('');
      expect(result).toBeNull();
    });

    // Note: We'd need a real Lightning invoice to test successful decoding
    // For now, we're just testing the error handling
  });
});
