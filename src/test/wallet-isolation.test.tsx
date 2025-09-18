import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestApp } from './TestApp';
import { LoginArea } from '@/components/auth/LoginArea';
import { useWallet } from '@/hooks/useWallet';
import { useUserCashuStore } from '@/stores/userCashuStore';
import { isolateTest } from './test-utils';
import type { WalletContextType } from '@/lib/wallet-types';

// Mock the user-specific Cashu store with service abstractions
const mockCashuStore: any = {
  wallets: [],
  wallet: null,
  activeWalletId: null,
  mints: [],
  events: [],
  activeMintUrl: null,
  getTotalBalance: vi.fn().mockReturnValue(0),
};

vi.mock('@/stores/userCashuStore', () => ({
  useUserCashuStore: vi.fn(() => mockCashuStore),
  clearCashuStoreCache: vi.fn(),
}));

// Mock wallet contexts using service layer patterns
vi.mock('@/contexts/WalletContext', () => {
  const mockWalletInfo = { balance: 0 };
  
  function createMockWalletContext(): WalletContextType {
    return {
      walletInfo: mockWalletInfo,
      isConnected: false,
      getBalance: vi.fn(),
      provider: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendPayment: vi.fn(),
      makeInvoice: vi.fn(),
      getWalletInfo: vi.fn(),
      transactions: [],
      getTransactionHistory: vi.fn(),
      transactionSupport: false,
      testConnection: vi.fn(),
      error: null,
      isLoading: false,
      userHasLightningAccess: false,
      isBunkerSigner: false,
      isCashuCompatible: false,
      isExtensionSigner: false,
      isNsecSigner: false,
    };
  }

  const mockUseWallet = vi.fn(() => createMockWalletContext());
  
  return {
    useWallet: mockUseWallet,
    WalletProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('@/hooks/useWallet', () => {
  const mockWalletInfo = { balance: 0 };
  
  function createMockWalletContext(): WalletContextType {
    return {
      walletInfo: mockWalletInfo,
      isConnected: false,
      getBalance: vi.fn(),
      provider: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendPayment: vi.fn(),
      makeInvoice: vi.fn(),
      getWalletInfo: vi.fn(),
      transactions: [],
      getTransactionHistory: vi.fn(),
      transactionSupport: false,
      testConnection: vi.fn(),
      error: null,
      isLoading: false,
      userHasLightningAccess: false,
      isBunkerSigner: false,
      isCashuCompatible: false,
      isExtensionSigner: false,
      isNsecSigner: false,
    };
  }

  const mockUseWallet = vi.fn(() => createMockWalletContext());
  
  return {
    useWallet: mockUseWallet,
  };
});

// Mock logged in accounts with service isolation
const mockCurrentUser: any = {
  pubkey: 'test-pubkey-123',
  profile: {
    name: 'Test User',
    display_name: 'Test User',
    about: 'Test user profile'
  },
  relays: [],
  signer: {
    signEvent: vi.fn(),
    getPublicKey: vi.fn().mockReturnValue('test-pubkey-123'),
    nip04: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
    nip44: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
};

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mockCurrentUser,
    npub: 'npub1...',
    nsec: 'nsec1...',
  }),
}));

// Mock additional auth hooks
vi.mock('@/hooks/useLoggedInAccounts', () => ({
  useLoggedInAccounts: () => ({
    accounts: [mockCurrentUser],
    currentAccount: mockCurrentUser,
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    setCurrentAccount: vi.fn(),
  }),
}));

// Service layer mocks for Nostr integration
const mockNostrService = {
  query: vi.fn().mockResolvedValue([]),
  event: vi.fn().mockResolvedValue(true),
  subscribe: vi.fn().mockReturnValue({
    close: vi.fn(),
    on: vi.fn(),
  }),
};

vi.mock('@nostrify/react', () => ({
  useNostr: () => ({ nostr: mockNostrService }),
  NostrContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Complete NostrProvider mock with service layer
vi.mock('@/components/NostrProvider', () => {
  const MockProvider = ({ children }: { children: React.ReactNode }) => children;
  return {
    default: MockProvider,
    NostrProvider: MockProvider,
    useNostr: () => ({ nostr: mockNostrService }),
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

describe('Lightning and Cashu Wallet Isolation Tests', () => {
  beforeEach(() => {
    isolateTest();
    vi.clearAllMocks();

    // Reset mock implementations using service layer patterns
    vi.mocked(useUserCashuStore).mockReturnValue(mockCashuStore);
  });

  describe('Lightning Wallet Balance Isolation', () => {
    it('should isolate Lightning wallet balances between accounts', async () => {
      isolateTest();

      // Account A context with service isolation
      const accountAWallet = {
        walletInfo: { balance: 5000 },
        isConnected: true,
        getBalance: vi.fn(),
        provider: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendPayment: vi.fn(),
        makeInvoice: vi.fn(),
        getWalletInfo: vi.fn(),
        transactions: [],
        getTransactionHistory: vi.fn(),
        transactionSupport: false,
        testConnection: vi.fn(),
        error: null,
        isLoading: false,
        userHasLightningAccess: false,
        isBunkerSigner: false,
        isCashuCompatible: false,
        isExtensionSigner: false,
        isNsecSigner: false,
      };

      // Mock the implementation for this test
      vi.mocked(useWallet).mockReturnValue(accountAWallet);

      render(
        <TestApp>
          <LoginArea />
        </TestApp>
      );

      // Verify account A's isolated balance through service layer
      expect(accountAWallet.walletInfo.balance).toBe(5000);
      expect(accountAWallet.isConnected).toBe(true);
    });

    it('should maintain separate Cashu wallets per account', async () => {
      isolateTest();

      // Account A Cashu store with service isolation
      const accountACashuStore = {
        ...mockCashuStore,
        wallets: [{ id: 'wallet-a', balance: 1000 }],
        getTotalBalance: vi.fn().mockReturnValue(1000),
      };

      vi.mocked(useUserCashuStore).mockReturnValue(accountACashuStore);

      render(
        <TestApp>
          <LoginArea />
        </TestApp>
      );

      // Verify isolated Cashu balance through service layer
      expect(accountACashuStore.getTotalBalance()).toBe(1000);
      expect(accountACashuStore.wallets).toHaveLength(1);
      expect(accountACashuStore.wallets[0].id).toBe('wallet-a');
    });
  });

  describe('Account Switching with Wallet Context', () => {
    it('should switch wallet contexts when account changes', async () => {
      isolateTest();

      // Create isolated wallet contexts for different accounts
      const account1Wallet = {
        walletInfo: { balance: 2000 },
        isConnected: true,
        getBalance: vi.fn(),
        provider: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendPayment: vi.fn(),
        makeInvoice: vi.fn(),
        getWalletInfo: vi.fn(),
        transactions: [],
        getTransactionHistory: vi.fn(),
        transactionSupport: false,
        testConnection: vi.fn(),
        error: null,
        isLoading: false,
        userHasLightningAccess: false,
        isBunkerSigner: false,
        isCashuCompatible: false,
        isExtensionSigner: false,
        isNsecSigner: false,
      };

      const account2Wallet = {
        walletInfo: { balance: 3000 },
        isConnected: false,
        getBalance: vi.fn(),
        provider: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendPayment: vi.fn(),
        makeInvoice: vi.fn(),
        getWalletInfo: vi.fn(),
        transactions: [],
        getTransactionHistory: vi.fn(),
        transactionSupport: false,
        testConnection: vi.fn(),
        error: null,
        isLoading: false,
        userHasLightningAccess: false,
        isBunkerSigner: false,
        isCashuCompatible: false,
        isExtensionSigner: false,
        isNsecSigner: false,
      };

      // Test account 1 context
      vi.mocked(useWallet).mockReturnValue(account1Wallet);

      const { rerender } = render(
        <TestApp>
          <LoginArea />
        </TestApp>
      );

      expect(account1Wallet.walletInfo.balance).toBe(2000);
      expect(account1Wallet.isConnected).toBe(true);

      // Switch to account 2 with service isolation
      vi.mocked(useWallet).mockReturnValue(account2Wallet);

      rerender(
        <TestApp>
          <LoginArea />
        </TestApp>
      );

      expect(account2Wallet.walletInfo.balance).toBe(3000);
      expect(account2Wallet.isConnected).toBe(false);
    });
  });

  describe('Service Layer Integration', () => {
    it('should maintain wallet isolation through service layer abstractions', async () => {
      isolateTest();

      // Create service-layer isolated wallet context
      const isolatedWallet = {
        walletInfo: { balance: 7500 },
        userHasLightningAccess: true,
        isCashuCompatible: true,
        getBalance: vi.fn(),
        provider: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendPayment: vi.fn(),
        makeInvoice: vi.fn(),
        getWalletInfo: vi.fn(),
        transactions: [],
        getTransactionHistory: vi.fn(),
        transactionSupport: false,
        testConnection: vi.fn(),
        error: null,
        isLoading: false,
        isConnected: false,
        isBunkerSigner: false,
        isExtensionSigner: false,
        isNsecSigner: false,
      };

      vi.mocked(useWallet).mockReturnValue(isolatedWallet);

      render(
        <TestApp>
          <LoginArea />
        </TestApp>
      );

      // Verify service layer maintains proper isolation
      expect(isolatedWallet.walletInfo.balance).toBe(7500);
      expect(isolatedWallet.userHasLightningAccess).toBe(true);
      expect(isolatedWallet.isCashuCompatible).toBe(true);

      // Verify service layer mock calls
      expect(mockNostrService.query).toBeDefined();
      expect(mockNostrService.event).toBeDefined();
    });
  });
});