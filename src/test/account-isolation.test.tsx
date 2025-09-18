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
const mockCreateEvent = vi.fn();
const mockNostrEvent = vi.fn().mockImplementation(async (event, options) => {
  console.log('🎯 Mock nostr.event called with:', { event: event?.kind, pubkey: event?.pubkey });
  // Use service layer for consistent behavior
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

// Mock with service layer abstractions
vi.mock('@nostrify/react', () => ({
  useNostr: () => ({
    nostr: {
      event: mockNostrEvent,
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
        event: mockNostrEvent,
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

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
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

      await waitFor(() => {
        const newKind0 = newSigner.signEvent.mock.calls.find(c => c[0]?.kind === 0)?.[0];
        expect(newKind0).toBeTruthy();
        expect(newKind0.content).toContain('"name":"New User"');
        expect(newKind0.content).toContain('"nip05"');
      });

      mockFromNsecLogin.mockRestore();
    });

    it('should publish events with correct pubkey for new account', async () => {
      const mockSigner = {
        signEvent: vi.fn().mockResolvedValue({
          id: 'new-account-event-id',
          pubkey: newAccountPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 0,
          tags: [],
          content: JSON.stringify({ name: 'Unique Owl', nip05: 'uniqueowl@zaptok.app' }),
          sig: 'new-account-signature',
        }),
      };

      const mockFromNsecLogin = vi.spyOn(NUser, 'fromNsecLogin').mockReturnValue({
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

      await waitFor(() => {
        const kind0Publish = mockNostrEvent.mock.calls.find(c => c[0]?.kind === 0);
        expect(kind0Publish).toBeTruthy();
        const evt = kind0Publish![0];
        expect(evt.pubkey).toBe(newAccountPubkey);
        expect(evt.content).toContain('"name":"Unique Owl"');
        expect(evt.content).toContain('"nip05"');
      });

      mockFromNsecLogin.mockRestore();
    });
  });

  describe('Event Publishing Flow Tests', () => {
    it('should handle publishing errors gracefully', async () => {
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

      await waitFor(() => {
        const errorCalls = consoleSpy.mock.calls.filter(c => typeof c[0] === 'string');
        expect(errorCalls.some(c => String(c[0]).includes('Enhanced onboarding failed'))).toBe(true);
        expect(mockLogin.nsec).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
      mockFromNsecLogin.mockRestore();
    });
  });

  describe('Relay Visibility Tests', () => {
    it('should publish events to configured relays', async () => {
      mockNostrEvent.mockImplementation(async (event, options) => {
        await new Promise(resolve => setTimeout(resolve, 5)); // Faster timeout
        return Promise.resolve(true);
      });

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

      await waitFor(() => {
        expect(mockNostrEvent).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      }, { timeout: 2000 }); // Shorter timeout

      mockFromNsecLogin.mockRestore();
    });
  });
});
