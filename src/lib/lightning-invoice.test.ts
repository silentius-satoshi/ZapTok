import { describe, it, expect } from 'vitest';
import { decodeLightningInvoice, formatSats } from '@/lib/lightning-invoice';

describe('Lightning Invoice Utils', () => {
  describe('formatSats', () => {
    it('should format numbers with thousands separators', () => {
      expect(formatSats(21)).toBe('21 sats');
      expect(formatSats(1000)).toBe('1.000 k sats');
      expect(formatSats(1000000)).toBe('1000.000 k sats');
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
