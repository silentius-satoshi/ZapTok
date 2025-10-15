import { describe, it, expect } from 'vitest';
import { getLightningAddress, createZapRequest } from '@/lib/lightning';
import type { NostrMetadata } from '@nostrify/nostrify';

describe('Lightning Address Utils', () => {
  describe('getLightningAddress', () => {
    it('should return lud16 Lightning address when available', () => {
      const metadata: NostrMetadata = {
        name: 'Test User',
        lud16: 'user@example.com',
        lud06: 'lnurl1qw2x...',
      };

      const result = getLightningAddress(metadata);
      expect(result).toBe('user@example.com');
    });

    it('should fallback to lud06 when lud16 is not available', () => {
      const metadata: NostrMetadata = {
        name: 'Test User',
        lud06: 'lnurl1qw2x...',
      };

      const result = getLightningAddress(metadata);
      expect(result).toBe('lnurl1qw2x...');
    });

    it('should return null when no Lightning address is available', () => {
      const metadata: NostrMetadata = {
        name: 'Test User',
        about: 'Just a test user',
      };

      const result = getLightningAddress(metadata);
      expect(result).toBeNull();
    });

    it('should return null when metadata is undefined', () => {
      const result = getLightningAddress(undefined);
      expect(result).toBeNull();
    });
  });

  describe('createZapRequest', () => {
    it('should create a valid zap request with required fields', () => {
      const recipientPubkey = 'pubkey123';
      const amount = 21;
      const comment = 'Great content!';
      const eventId = 'event123';

      const zapRequest = createZapRequest(recipientPubkey, amount, comment, eventId);

      expect(zapRequest).toMatchObject({
        kind: 9734,
        content: comment,
        tags: expect.arrayContaining([
          ['p', recipientPubkey],
          ['amount', '21000'], // 21 sats = 21000 msats
          ['relays', 'wss://relay.nostr.band'],
          ['e', eventId],
        ]),
        created_at: expect.any(Number),
      });
    });

    it('should create zap request without event id when not provided', () => {
      const recipientPubkey = 'pubkey123';
      const amount = 100;

      const zapRequest = createZapRequest(recipientPubkey, amount);

      expect(zapRequest.tags).not.toContainEqual(['e', expect.any(String)]);
      expect(zapRequest.tags).toContainEqual(['p', recipientPubkey]);
      expect(zapRequest.tags).toContainEqual(['amount', '100000']);
    });

    it('should handle empty comment', () => {
      const recipientPubkey = 'pubkey123';
      const amount = 50;

      const zapRequest = createZapRequest(recipientPubkey, amount, '');

      expect(zapRequest.content).toBe('');
    });
  });
});
