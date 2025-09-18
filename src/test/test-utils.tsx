import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { TestApp } from './TestApp';
import { cleanupMockServices, mockNostrService } from './services';

// Enhanced render function that automatically wraps with TestApp
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestApp, ...options });

// Mock factories for common test scenarios
export const createMockNostrEvent = (overrides: Partial<any> = {}) => ({
  id: `mock_${Math.random().toString(36).substr(2, 9)}`,
  pubkey: 'mock-pubkey',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Mock content',
  sig: 'mock-signature',
  ...overrides,
});

export const createMockSigner = (overrides: Partial<any> = {}) => ({
  signEvent: vi.fn().mockImplementation((event) =>
    Promise.resolve({ ...event, sig: 'mock-signature' })
  ),
  nip04: {
    encrypt: vi.fn().mockResolvedValue('encrypted_content'),
    decrypt: vi.fn().mockResolvedValue('decrypted_content'),
  },
  nip44: {
    encrypt: vi.fn().mockResolvedValue('encrypted_content_nip44'),
    decrypt: vi.fn().mockResolvedValue('decrypted_content_nip44'),
  },
  ...overrides,
});

export const createMockUser = (overrides: Partial<any> = {}) => ({
  pubkey: 'mock-user-pubkey',
  signer: createMockSigner(),
  profile: {
    name: 'Mock User',
    display_name: 'Mock User',
    about: 'Mock user profile',
  },
  relays: [],
  userPreferences: {},
  ...overrides,
});

// Enhanced network mock utilities with service abstractions
export const mockSuccessfulRelayPublish = () => {
  return vi.fn().mockImplementation(async (event, options) => {
    // Use service layer abstraction for consistent behavior
    return mockNostrService.event(event);
  });
};

export const mockFailedRelayPublish = (error = new Error('Relay connection failed')) => {
  return vi.fn().mockRejectedValue(error);
};

export const mockWebSocketConnection = (shouldSucceed = true) => {
  const mockWs = {
    url: 'ws://mock-relay',
    readyState: shouldSucceed ? 1 : 3, // OPEN or CLOSED
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    dispatchEvent: vi.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  };

  // Simulate connection result with shorter timeout
  setTimeout(() => {
    if (shouldSucceed && mockWs.onopen) {
      (mockWs.onopen as any)({} as Event);
    } else if (!shouldSucceed && mockWs.onerror) {
      (mockWs.onerror as any)({} as Event);
    }
  }, 5); // Reduced timeout for faster tests

  return mockWs;
};

// Enhanced video URL testing utilities
export const mockVideoServerResponses = (serverStatuses: boolean[]) => {
  const mockFetch = vi.fn();

  serverStatuses.forEach((isOk) => {
    (mockFetch as any).mockResolvedValueOnce({
      ok: isOk,
      status: isOk ? 200 : 404,
      statusText: isOk ? 'OK' : 'Not Found',
    });
  });

  (global as any).fetch = mockFetch;
  return mockFetch;
};

// Enhanced wallet testing utilities
export const createMockWallet = (overrides: Partial<any> = {}) => ({
  walletInfo: { balance: 0 },
  isConnected: false,
  getBalance: vi.fn().mockResolvedValue(0),
  provider: null,
  webln: null,
  isLoading: false,
  error: null,
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockCashuStore = (overrides: Partial<any> = {}) => ({
  wallets: [],
  wallet: null,
  activeWalletId: null,
  mints: [],
  events: [],
  activeMintUrl: null,
  getTotalBalance: vi.fn().mockReturnValue(0),
  mint: vi.fn().mockResolvedValue({ tokens: [] }),
  melt: vi.fn().mockResolvedValue({ success: true }),
  send: vi.fn().mockResolvedValue({ token: 'mock_token' }),
  receive: vi.fn().mockResolvedValue({ amount: 100 }),
  ...overrides,
});

// Enhanced test timeout utilities with shorter defaults
export const withTimeout = <T,>(promise: Promise<T>, ms = 2000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms)
    )
  ]);
};

// Test isolation utilities
export const isolateTest = () => {
  // Clean up service state between tests
  cleanupMockServices();
  vi.clearAllMocks();
};

// Mock useNostr hook for comprehensive testing
export const mockUseNostr = () => ({
  nostr: mockNostrService,
});

// Mock useCurrentUser hook
export const mockUseCurrentUser = (user?: any) => ({
  user: user || createMockUser(),
  isLoading: false,
  error: null,
});

// Mock useAppContext hook
export const mockUseAppContext = () => ({
  theme: 'light',
  relayUrl: 'wss://relay.nostr.band',
  setTheme: vi.fn(),
  setRelayUrl: vi.fn(),
});

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };