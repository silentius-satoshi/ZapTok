import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useUserTransactionHistoryStore } from '@/stores/userTransactionHistoryStore';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('UserTransactionHistoryStore Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  test('should create separate stores for different users', () => {
    const user1Pubkey = 'user1pubkey';
    const user2Pubkey = 'user2pubkey';

    const { result: store1 } = renderHook(() =>
      useUserTransactionHistoryStore(user1Pubkey)
    );
    const { result: store2 } = renderHook(() =>
      useUserTransactionHistoryStore(user2Pubkey)
    );

    // Stores should be different objects
    expect(store1.current).not.toBe(store2.current);

    // Both should start with empty state
    expect(store1.current.history).toEqual([]);
    expect(store2.current.history).toEqual([]);
    expect(store1.current.pendingTransactions).toEqual([]);
    expect(store2.current.pendingTransactions).toEqual([]);
  });

  test('should isolate transaction history between users', () => {
    const user1Pubkey = 'user1pubkey';
    const user2Pubkey = 'user2pubkey';

    const { result: store1 } = renderHook(() =>
      useUserTransactionHistoryStore(user1Pubkey)
    );
    const { result: store2 } = renderHook(() =>
      useUserTransactionHistoryStore(user2Pubkey)
    );

    const transaction1 = {
      id: 'tx1',
      direction: 'in' as const,
      amount: '1000',
      timestamp: Date.now(),
    };

    const transaction2 = {
      id: 'tx2',
      direction: 'out' as const,
      amount: '500',
      timestamp: Date.now(),
    };

    // Add different transactions to each user
    act(() => {
      store1.current.addHistoryEntry(transaction1);
      store2.current.addHistoryEntry(transaction2);
    });

    // User 1 should only see their transaction
    expect(store1.current.history).toHaveLength(1);
    expect(store1.current.history[0]).toMatchObject(transaction1);

    // User 2 should only see their transaction
    expect(store2.current.history).toHaveLength(1);
    expect(store2.current.history[0]).toMatchObject(transaction2);
  });

  test('should isolate pending transactions between users', () => {
    const user1Pubkey = 'user1pubkey';
    const user2Pubkey = 'user2pubkey';

    const { result: store1 } = renderHook(() =>
      useUserTransactionHistoryStore(user1Pubkey)
    );
    const { result: store2 } = renderHook(() =>
      useUserTransactionHistoryStore(user2Pubkey)
    );

    const pendingTx1 = {
      id: 'pending1',
      direction: 'in' as const,
      amount: '1000',
      timestamp: Date.now(),
      status: 'pending' as const,
      mintUrl: 'https://mint1.example.com',
      quoteId: 'quote1',
      paymentRequest: 'lnbc1...',
    };

    const pendingTx2 = {
      id: 'pending2',
      direction: 'out' as const,
      amount: '500',
      timestamp: Date.now(),
      status: 'pending' as const,
      mintUrl: 'https://mint2.example.com',
      quoteId: 'quote2',
      paymentRequest: 'lnbc2...',
    };

    // Add different pending transactions to each user
    act(() => {
      store1.current.addPendingTransaction(pendingTx1);
      store2.current.addPendingTransaction(pendingTx2);
    });

    // User 1 should only see their pending transaction
    expect(store1.current.pendingTransactions).toHaveLength(1);
    expect(store1.current.pendingTransactions[0]).toMatchObject(pendingTx1);

    // User 2 should only see their pending transaction
    expect(store2.current.pendingTransactions).toHaveLength(1);
    expect(store2.current.pendingTransactions[0]).toMatchObject(pendingTx2);
  });

  test('should use different localStorage keys for different users', () => {
    const user1Pubkey = 'user1pubkey123';
    const user2Pubkey = 'user2pubkey456';

    renderHook(() => useUserTransactionHistoryStore(user1Pubkey));
    renderHook(() => useUserTransactionHistoryStore(user2Pubkey));

    // Should be called to check for existing data
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      expect.stringContaining(`transaction-history-store-${user1Pubkey}`)
    );
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      expect.stringContaining(`transaction-history-store-${user2Pubkey}`)
    );
  });

  test('should return empty store for logged-out users', () => {
    const { result: loggedOutStore } = renderHook(() =>
      useUserTransactionHistoryStore(undefined)
    );

    // Should return empty state
    expect(loggedOutStore.current.history).toEqual([]);
    expect(loggedOutStore.current.pendingTransactions).toEqual([]);
    expect(loggedOutStore.current.transactions).toEqual({});

    // Methods should be no-ops
    const mockTransaction = {
      id: 'test',
      direction: 'in' as const,
      amount: '1000',
      timestamp: Date.now(),
    };

    act(() => {
      loggedOutStore.current.addHistoryEntry(mockTransaction);
    });

    // State should remain empty
    expect(loggedOutStore.current.history).toEqual([]);
  });

  test('should combine history and pending transactions correctly', () => {
    const userPubkey = 'testuser';
    
    const { result: store } = renderHook(() =>
      useUserTransactionHistoryStore(userPubkey)
    );

    const historyEntry = {
      id: 'hist1',
      direction: 'in' as const,
      amount: '1000',
      timestamp: Date.now() - 1000,
    };

    const pendingEntry = {
      id: 'pend1',
      direction: 'out' as const,
      amount: '500',
      timestamp: Date.now(),
      status: 'pending' as const,
      mintUrl: 'https://mint.example.com',
      quoteId: 'quote1',
      paymentRequest: 'lnbc...',
    };

    act(() => {
      store.current.addHistoryEntry(historyEntry);
      store.current.addPendingTransaction(pendingEntry);
    });

    const combined = store.current.getCombinedHistory();

    expect(combined).toHaveLength(2);
    expect(combined).toContain(historyEntry);
    expect(combined).toContain(pendingEntry);

    // Should be sorted by timestamp (newest first)
    expect(combined[0]).toMatchObject(pendingEntry); // newer timestamp
    expect(combined[1]).toMatchObject(historyEntry); // older timestamp
  });

  test('should prevent duplicate entries', () => {
    const userPubkey = 'testuser-duplicate-' + Math.random(); // Unique key
    
    const { result: store } = renderHook(() =>
      useUserTransactionHistoryStore(userPubkey)
    );

    const transaction = {
      id: 'duplicate-test-' + Math.random(),
      direction: 'in' as const,
      amount: '1000',
      timestamp: Date.now(),
    };

    act(() => {
      store.current.addHistoryEntry(transaction);
      store.current.addHistoryEntry(transaction); // Add same entry twice
    });

    // Should only have one entry
    expect(store.current.history).toHaveLength(1);
    expect(store.current.history[0]).toMatchObject(transaction);
  });

  test('should clear history correctly', () => {
    const userPubkey = 'testuser-clear-' + Math.random(); // Unique key
    
    const { result: store } = renderHook(() =>
      useUserTransactionHistoryStore(userPubkey)
    );

    const historyEntry = {
      id: 'hist1-' + Math.random(),
      direction: 'in' as const,
      amount: '1000',
      timestamp: Date.now(),
    };

    const pendingEntry = {
      id: 'pend1-' + Math.random(),
      direction: 'out' as const,
      amount: '500',
      timestamp: Date.now(),
      status: 'pending' as const,
      mintUrl: 'https://mint.example.com',
      quoteId: 'quote1',
      paymentRequest: 'lnbc...',
    };

    // Add some data
    act(() => {
      store.current.addHistoryEntry(historyEntry);
      store.current.addPendingTransaction(pendingEntry);
    });

    expect(store.current.history).toHaveLength(1);
    expect(store.current.pendingTransactions).toHaveLength(1);

    // Clear history
    act(() => {
      store.current.clearHistory();
    });

    expect(store.current.history).toEqual([]);
    expect(store.current.pendingTransactions).toEqual([]);
  });
});
