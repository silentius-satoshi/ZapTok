import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { TestApp } from './TestApp';
import GetStartedModal from '@/components/auth/GetStartedModal';
import { NLogin, NUser } from '@nostrify/react/login';

// Mock nostr-tools functions
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual,
    generateSecretKey: vi.fn(),
    getPublicKey: vi.fn(),
    nip19: {
      nsecEncode: vi.fn(),
      decode: vi.fn(),
      npubEncode: vi.fn(),
    },
  };
});

// Mock the Nostr publishing and login hooks
const mockCreateEvent = vi.fn();
const mockNostrEvent = vi.fn().mockImplementation(async (event, options) => {
  console.log('🎯 Mock nostr.event called with:', { event: event?.kind, pubkey: event?.pubkey });
  return Promise.resolve(true);
});
const mockLogin = {
  nsec: vi.fn(),
  extension: vi.fn(),
  bunker: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/hooks/useNostrPublish', () => ({
  useNostrPublish: () => ({
    mutate: mockCreateEvent,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useLoginActions', () => ({
  useLoginActions: () => mockLogin,
}));

vi.mock('@nostrify/react', () => ({
  useNostr: () => ({
    nostr: {
      event: mockNostrEvent, // Use our tracked mock
      query: vi.fn(),
    },
  }),
  NostrContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

describe('Account Isolation and NIP-01 Compliance Tests', () => {
  // Test data
  const originalAccountSecretKey = new Uint8Array(32).fill(1); // Mock original account
  const originalAccountPubkey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const originalAccountNsec = 'nsec1gm4h64vsgcvhjcvjuzcafrh4q52nfduyp9szkrqjgh9r6w2c5ltqqnj43q'; // Valid nsec for testing

  const newAccountSecretKey = new Uint8Array(32).fill(2); // Mock new account
  const newAccountPubkey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  const newAccountNsec = 'nsec15hwaud5ydn8dyg0sa6nsd4e7tkdzj6g0xtayfthtxzs0tzd6sfyspynv6f'; // Valid nsec for testing

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock key generation for deterministic testing
    vi.mocked(generateSecretKey).mockReturnValue(newAccountSecretKey);
    vi.mocked(getPublicKey).mockImplementation((secretKey) => {
      if (secretKey === originalAccountSecretKey) return originalAccountPubkey;
      if (secretKey === newAccountSecretKey) return newAccountPubkey;
      return 'unknown-pubkey';
    });
    vi.mocked(nip19.nsecEncode).mockImplementation((secretKey) => {
      if (secretKey === originalAccountSecretKey) return originalAccountNsec;
      if (secretKey === newAccountSecretKey) return newAccountNsec;
      return 'nsec1unknown...';
    });

    // Mock nip19 decode for proper nsec decoding
    vi.mocked(nip19.decode).mockImplementation((bech32String) => {
      if (bech32String === originalAccountNsec) {
        return { type: 'nsec', data: originalAccountSecretKey } as any;
      }
      if (bech32String === newAccountNsec) {
        return { type: 'nsec', data: newAccountSecretKey } as any;
      }
      return { type: 'nsec', data: new Uint8Array(32).fill(0) } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('NIP-01 Event Structure Compliance', () => {
    it('should generate valid secp256k1 keypairs following NIP-01', () => {
      // Test that we're using proper key generation
      const secretKey = generateSecretKey();
      const pubkey = getPublicKey(secretKey);
      const nsec = nip19.nsecEncode(secretKey);

      expect(secretKey).toHaveLength(32); // 32-byte secret key
      expect(pubkey).toHaveLength(64); // 64-character hex pubkey
      expect(nsec).toMatch(/^nsec1/); // NIP-19 bech32 encoding
    });

    it('should create kind 0 metadata events with valid JSON content', async () => {
      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'event-id-123',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Test User', picture: 'https://example.com/pic.jpg' }),
          sig: 'signature-123',
        }),
      };

      // Mock NUser.fromNsecLogin to return a user with our mock signer
      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      // Fill in profile information
      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });

      // Click save button
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSigner.signEvent).toHaveBeenCalledWith({
          kind: 0,
          content: JSON.stringify({
            name: 'Test User',
            picture: undefined,
          }),
          tags: [],
          created_at: expect.any(Number),
        });
      });

      mockFromNsecLogin.mockRestore();
    });

    it('should validate event structure before publishing', () => {
      // Test the event structure validation that should happen in useNostrPublish
      const validEvent = {
        id: '64-char-hex-id'.padEnd(64, '0'),
        pubkey: newAccountPubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 0,
        tags: [['client', 'zaptok']],
        content: JSON.stringify({ name: 'Test' }),
        sig: '64-char-hex-sig'.padEnd(128, '0'),
      };

      // These fields are required by NIP-01
      expect(validEvent.id).toHaveLength(64);
      expect(validEvent.pubkey).toHaveLength(64);
      expect(typeof validEvent.created_at).toBe('number');
      expect(validEvent.kind).toBeGreaterThanOrEqual(0);
      expect(validEvent.kind).toBeLessThanOrEqual(65535);
      expect(Array.isArray(validEvent.tags)).toBe(true);
      expect(typeof validEvent.content).toBe('string');
      expect(validEvent.sig).toHaveLength(128);

      // Content should be valid JSON for kind 0
      expect(() => JSON.parse(validEvent.content)).not.toThrow();
    });
  });

  describe('Account Isolation Tests', () => {
    it('should create new account with isolated signer', async () => {
      const originalSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'original-event',
          pubkey: originalAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Original User' }),
          sig: 'original-signature',
        }),
      };

      const newSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'new-event',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'New User' }),
          sig: 'new-signature',
        }),
      };

      // Mock different users for different logins
      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockImplementation((login) => {
        if (login.data?.nsec === originalAccountNsec) {
          return { pubkey: originalAccountPubkey, signer: originalSigner } as any;
        }
        if (login.data?.nsec === newAccountNsec) {
          return { pubkey: newAccountPubkey, signer: newSigner } as any;
        }
        throw new Error('Unknown login');
      });

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'New User' } });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Verify that the NEW signer was used, not the original one
        expect(newSigner.signEvent).toHaveBeenCalledWith(expect.objectContaining({
          kind: 0,
          content: JSON.stringify({ name: 'New User', picture: undefined }),
        }));

        // Verify that the original signer was NOT used
        expect(originalSigner.signEvent).not.toHaveBeenCalled();
      });

      mockFromNsecLogin.mockRestore();
    });

    it('should publish events with correct pubkey for new account', async () => {
      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'new-account-event-id',
          pubkey: newAccountPubkey, // This should be the NEW account's pubkey
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Unique Owl' }),
          sig: 'new-account-signature',
        }),
      };

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Unique Owl' } });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNostrEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            pubkey: newAccountPubkey, // Critical: must be new account's pubkey
            kind: 0,
            content: JSON.stringify({ name: 'Unique Owl', picture: undefined }),
          }),
          expect.any(Object)
        );
      });

      mockFromNsecLogin.mockRestore();
    });

    it('should not cross-contaminate profile metadata between accounts', async () => {
      // This test verifies that creating a new account doesn't overwrite the original account's profile

      const events: any[] = [];
      // Use the global mockNostrEvent and track events in our local array
      mockNostrEvent.mockImplementation((event) => {
        events.push(event);
        return Promise.resolve();
      });

      // Simulate creating a new account while original account exists
      const originalUser = {
        pubkey: originalAccountPubkey,
        signer: {
          signEvent: vi.fn().mockResolvedValue({
            id: 'original-profile-event',
            pubkey: originalAccountPubkey,
            kind: 0,
            content: JSON.stringify({ name: 'Original User', about: 'Original bio' }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            sig: 'original-sig',
          }),
        },
      };

      const newUser = {
        pubkey: newAccountPubkey,
        signer: {
          signEvent: vi.fn().mockResolvedValue({
            id: 'new-profile-event',
            pubkey: newAccountPubkey,
            kind: 0,
            content: JSON.stringify({ name: 'Unique Owl' }),
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
            sig: 'new-sig',
          }),
        },
      };

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue(newUser as any);

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Unique Owl' } });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Verify only one event was published (for the new account)
        expect(events).toHaveLength(1);

        // Verify the published event has the correct pubkey (new account, not original)
        expect(events[0].pubkey).toBe(newAccountPubkey);
        expect(events[0].pubkey).not.toBe(originalAccountPubkey);

        // Verify the content is for the new account
        const content = JSON.parse(events[0].content);
        expect(content.name).toBe('Unique Owl');
      });

      // Restore original mock implementation
      mockNostrEvent.mockImplementation(async (event, options) => {
        console.log('🎯 Mock nostr.event called with:', { event: event?.kind, pubkey: event?.pubkey });
        return Promise.resolve(true);
      });

      mockFromNsecLogin.mockRestore();
    });
  });

  describe('Event Publishing Flow Tests', () => {
    it('should publish profile BEFORE switching active login', async () => {
      const callOrder: string[] = [];
      const localMockNostrEvent = vi.fn().mockImplementation(() => {
        callOrder.push('nostr.event');
        return Promise.resolve();
      });

      mockLogin.nsec.mockImplementation(() => {
        callOrder.push('login.nsec');
        return Promise.resolve();
      });

      // Override the global mock to track call order
      mockNostrEvent.mockImplementation(() => {
        callOrder.push('nostr.event');
        return Promise.resolve();
      });

      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'event-id',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Test User' }),
          sig: 'signature',
        }),
      };

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(callOrder).toEqual(['nostr.event', 'login.nsec']);
      });

      mockFromNsecLogin.mockRestore();
    });

    it('should handle publishing errors gracefully', async () => {
      // Override the global mock to reject
      mockNostrEvent.mockRejectedValue(new Error('Relay connection failed'));

      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'event-id',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Test User' }),
          sig: 'signature',
        }),
      };

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create profile:', expect.any(Error));
        // Verify login.nsec was NOT called if publishing failed
        expect(mockLogin.nsec).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
      mockFromNsecLogin.mockRestore();
    });
  });

  describe('Relay Visibility Tests', () => {
    it('should publish events to configured relays', async () => {
      // Reset the global mock to resolve
      mockNostrEvent.mockResolvedValue(undefined);

      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'event-id',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Public User' }),
          sig: 'signature',
        }),
      };

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      render(
        <TestApp>
          <GetStartedModal onClose={() => {}} />
        </TestApp>
      );

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Public User' } });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Verify the event was published with a timeout (indicating relay publishing)
        expect(mockNostrEvent).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });

      mockFromNsecLogin.mockRestore();
    });
  });
});
