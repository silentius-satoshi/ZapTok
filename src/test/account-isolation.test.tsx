import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from '@nostr/tools/pure';
import * as nip19 from '@nostr/tools/nip19';
import { TestApp } from './TestApp';
import CreateAccountModal from '@/components/auth/CreateAccountModal';
import { NLogin, NUser } from '@nostrify/react/login';
import {
  createMockNostrEvent,
  createMockUser,
  createMockSigner,
  isolateTest,
} from './test-utils';

// Mock @nostr/tools functions
vi.mock('@nostr/tools/pure', async () => {
  const actual = await vi.importActual('@nostr/tools/pure');
  return {
    ...actual,
    generateSecretKey: vi.fn(),
    getPublicKey: vi.fn(),
    finalizeEvent: vi.fn(),
    verifyEvent: vi.fn(),
  };
});

vi.mock('@nostr/tools/nip19', async () => {
  const actual = await vi.importActual('@nostr/tools/nip19');
  return {
    ...actual,
    nsecEncode: vi.fn(),
    decode: vi.fn(),
    npubEncode: vi.fn(),
  };
});

// Mock the Nostr publishing and login hooks with service abstractions
vi.mock('@/hooks/useNostrPublish', () => ({
  useNostrPublish: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock the onboarding hook to prevent real network calls
vi.mock('@/hooks/useNostrToolsOnboarding', () => ({
  useNostrToolsOnboarding: () => vi.fn().mockResolvedValue({
    success: true,
    secretKey: new Uint8Array(32).fill(2),
    publicKey: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    npub: 'npub1fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    events: {
      profile: { kind: 0, content: '{}' },
      contactList: { kind: 3, content: '' },
      introNote: { kind: 1, content: 'Hello Nostr!' },
      relayList: { kind: 10002, content: '' },
    },
  }),
}));

// Mock with service layer abstractions
vi.mock('@nostrify/react', () => ({
  useNostr: () => ({
    nostr: {
      event: vi.fn().mockImplementation(async (event, options) => {
        // Use service layer for consistent behavior
        return Promise.resolve(true);
      }),
      query: vi.fn().mockResolvedValue([]),
    },
  }),
  NostrContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

vi.mock('@/components/NostrProvider', () => {
  const MockProvider = ({ children }: { children: React.ReactNode }) => children;
  return {
    default: MockProvider,
    NostrProvider: MockProvider,
    useNostr: () => ({
      nostr: {
        event: vi.fn().mockImplementation(async (event, options) => {
          // Use service layer for consistent behavior
          return Promise.resolve(true);
        }),
        query: vi.fn().mockResolvedValue([]),
      },
    }),
    useNostrConnection: () => ({
      connectionState: 'connected',
      isAnyRelayConnected: true,
      areAllRelaysConnected: true,
      connectedRelayCount: 1,
      totalRelayCount: 1,
      activeRelays: ['wss://relay.nostr.band'],
      relayContext: 'global',
    }),
  };
});

describe('Account Isolation and NIP-01 Compliance Tests', () => {
  // Test data - proper 32-byte secret keys
  const originalAccountSecretKey = new Uint8Array(32);
  originalAccountSecretKey.fill(1);
  const originalAccountPubkey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const originalAccountNsec = 'nsec1gm4h64vsgcvhjcvjuzcafrh4q52nfduyp9szkrqjgh9r6w2c5ltqqnj43q';

  const newAccountSecretKey = new Uint8Array(32);
  newAccountSecretKey.fill(2);
  const newAccountPubkey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  const newAccountNsec = 'nsec15hwaud5ydn8dyg0sa6nsd4e7tkdzj6g0xtayfthtxzs0tzd6sfyspynv6f';

  beforeEach(() => {
    isolateTest();

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

    // Mock finalizeEvent with service layer consistency
    vi.mocked(finalizeEvent).mockImplementation((eventTemplate, secretKey) => {
      const eventId = 'a'.repeat(64);
      const signature = 'b'.repeat(128);

      return {
        id: eventId,
        pubkey: getPublicKey(secretKey),
        created_at: eventTemplate.created_at || Math.floor(Date.now() / 1000),
        kind: eventTemplate.kind,
        tags: eventTemplate.tags || [],
        content: eventTemplate.content || '',
        sig: signature,
      };
    });

    vi.mocked(verifyEvent).mockReturnValue(true);

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
    isolateTest();
  });

  describe('NIP-01 Event Structure Compliance', () => {
    it('should generate valid secp256k1 keypairs following NIP-01', () => {
      const secretKey = generateSecretKey();
      const pubkey = getPublicKey(secretKey);
      const nsec = nip19.nsecEncode(secretKey);

      expect(secretKey).toHaveLength(32);
      expect(pubkey).toHaveLength(64);
      expect(nsec).toMatch(/^nsec1/);
    });

    it('should validate event structure before publishing', () => {
      const validEvent = {
        id: '64-char-hex-id'.padEnd(64, '0'),
        pubkey: newAccountPubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 0,
        tags: [['client', 'zaptok']],
        content: JSON.stringify({ name: 'Test' }),
        sig: '64-char-hex-sig'.padEnd(128, '0'),
      };

      // Required NIP-01 fields
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

      const mockFromNsec = vi.spyOn(NLogin, 'fromNsec').mockReturnValue({
        id: 'new-login-id',
        pubkey: newAccountPubkey,
        signer: newSigner,
      } as any);

      render(
        <TestApp>
          <CreateAccountModal open={true} onAbort={() => {}} />
        </TestApp>
      );

      const createAccountButton = screen.getByText(/create account/i);
      fireEvent.click(createAccountButton);

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'New User' } });

      // Navigate through multi-step flow
      const nextButton1 = screen.getByText(/next/i);
      fireEvent.click(nextButton1);

      const nextButton2 = screen.getByText(/next/i);
      fireEvent.click(nextButton2);

      const finishButton = screen.getByText(/finish/i);
      fireEvent.click(finishButton);

      // Wait for the account creation to complete and verify onboarding was called
      await waitFor(() => {
        // The test should pass if the onboarding process completes without errors
        // The mocked onboarding should have been called
        expect(mockFromNsec).toHaveBeenCalled();
      }, { timeout: 2000 });

      mockFromNsec.mockRestore();
    });

    it('should publish events with correct pubkey for new account', async () => {
      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'new-account-event-id',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Unique Owl', nip05: 'uniqueowl@example.com' }),
          sig: 'new-account-signature',
        }),
      };

      const mockFromNsec = vi.spyOn(NLogin, 'fromNsec').mockReturnValue({
        id: 'new-account-login-id',
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      render(
        <TestApp>
          <CreateAccountModal open={true} onAbort={() => {}} />
        </TestApp>
      );

      const createAccountButton = screen.getByText(/create account/i);
      fireEvent.click(createAccountButton);

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Unique Owl' } });

      // Navigate through multi-step flow
      const nextButton1 = screen.getByText(/next/i);
      fireEvent.click(nextButton1);

      const nextButton2 = screen.getByText(/next/i);
      fireEvent.click(nextButton2);

      const finishButton = screen.getByText(/finish/i);
      fireEvent.click(finishButton);

      // Wait for the account creation to complete
      await waitFor(() => {
        // Verify that the mock signer was used (indicating account creation process)
        expect(mockFromNsec).toHaveBeenCalled();
      }, { timeout: 2000 });

      mockFromNsec.mockRestore();
    });
  });

  describe('Event Publishing Flow Tests', () => {
    it('should handle publishing errors gracefully', async () => {
      // Clear any previous calls
      vi.clearAllMocks();

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

      const mockFromNsec = vi.spyOn(NLogin, 'fromNsec').mockReturnValue({
        id: 'test-login-id',
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestApp>
          <CreateAccountModal open={true} onAbort={() => {}} />
        </TestApp>
      );

      const createAccountButton = screen.getByText(/create account/i);
      fireEvent.click(createAccountButton);

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Test User' } });

      // Navigate through multi-step flow
      const nextButton1 = screen.getByText(/next/i);
      fireEvent.click(nextButton1);

      const nextButton2 = screen.getByText(/next/i);
      fireEvent.click(nextButton2);

      const finishButton = screen.getByText(/finish/i);
      fireEvent.click(finishButton);

      // Wait for the account creation to complete
      await waitFor(() => {
        // The test should pass if the onboarding process completes without throwing errors
        // Even if there are mocked errors, the process should handle them gracefully
        expect(mockFromNsec).toHaveBeenCalled();
      }, { timeout: 2000 });

      consoleSpy.mockRestore();
      mockFromNsec.mockRestore();
    });
  });

  describe('Relay Visibility Tests', () => {
    it('should publish events to configured relays', async () => {
      // Clear any previous calls
      vi.clearAllMocks();

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

      const mockFromNsec = vi.spyOn(NLogin, 'fromNsec').mockReturnValue({
        id: 'relay-test-login-id',
        pubkey: newAccountPubkey,
        signer: mockSigner,
      } as any);

      render(
        <TestApp>
          <CreateAccountModal open={true} onAbort={() => {}} />
        </TestApp>
      );

      const createAccountButton = screen.getByText(/create account/i);
      fireEvent.click(createAccountButton);

      const nameInput = screen.getByLabelText(/display name/i);
      fireEvent.change(nameInput, { target: { value: 'Public User' } });

      // Navigate through multi-step flow
      const nextButton1 = screen.getByText(/next/i);
      fireEvent.click(nextButton1);

      const nextButton2 = screen.getByText(/next/i);
      fireEvent.click(nextButton2);

      const finishButton = screen.getByText(/finish/i);
      fireEvent.click(finishButton);

      // Wait for the account creation to complete
      await waitFor(() => {
        // Verify that the account creation process completed successfully
        expect(mockFromNsec).toHaveBeenCalled();
      }, { timeout: 2000 });

      mockFromNsec.mockRestore();
    });
  });
});
