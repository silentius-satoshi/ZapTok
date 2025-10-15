import { vi } from 'vitest';

/**
 * Service layer abstractions for testing
 * Inspired by established Nostr clients (Jumble, Primal, Coracle)
 */

// Mock Relay Service
export class MockRelayService {
  private relays = new Map<string, MockRelay>();
  private connections = new Map<string, boolean>();

  async connect(url: string): Promise<MockRelay> {
    const relay = this.createMockRelay(url);
    this.relays.set(url, relay);
    this.connections.set(url, true);
    return relay;
  }

  disconnect(url: string): void {
    this.connections.set(url, false);
    this.relays.delete(url);
  }

  isConnected(url: string): boolean {
    return this.connections.get(url) ?? false;
  }

  getRelay(url: string): MockRelay | undefined {
    return this.relays.get(url);
  }

  private createMockRelay(url: string): MockRelay {
    return new MockRelay(url);
  }
}

// Mock Relay
export class MockRelay {
  public url: string;
  public connected = true;
  public subscriptions = new Map<string, any>();

  constructor(url: string) {
    this.url = url;
  }

  publish = vi.fn().mockImplementation((event: any) => {
    return Promise.resolve({ ok: true, eventId: event.id || 'mock-event-id' });
  });

  subscribe = vi.fn().mockImplementation((filters: any[], callbacks?: any) => {
    const subId = `sub_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(subId, { filters, callbacks });
    
    // Simulate EOSE after short delay
    if (callbacks?.oneose) {
      setTimeout(() => callbacks.oneose(), 10);
    }
    
    return {
      id: subId,
      close: vi.fn(() => {
        this.subscriptions.delete(subId);
      }),
    };
  });

  close = vi.fn().mockImplementation(() => {
    this.connected = false;
    this.subscriptions.clear();
  });
}

// Mock Nostr Service
export class MockNostrService {
  private relayService = new MockRelayService();
  private events = new Map<string, any>();

  async query(filters: any[], options?: { signal?: AbortSignal }): Promise<any[]> {
    // Simulate query with timeout protection
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve([]);
      }, 50); // Very short timeout for tests

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          resolve([]);
        });
      }
    });
  }

  async event(template: any): Promise<any> {
    const event = {
      id: `mock_${Math.random().toString(36).substr(2, 9)}`,
      created_at: Math.floor(Date.now() / 1000),
      ...template,
    };
    
    this.events.set(event.id, event);
    return event;
  }

  getRelayService(): MockRelayService {
    return this.relayService;
  }

  getEvent(id: string): any | undefined {
    return this.events.get(id);
  }
}

// Mock WebSocket Provider
export class MockWebSocketProvider {
  private sockets = new Map<string, MockWebSocketInstance>();

  create(url: string): MockWebSocketInstance {
    const socket = new MockWebSocketInstance(url);
    this.sockets.set(url, socket);
    return socket;
  }

  get(url: string): MockWebSocketInstance | undefined {
    return this.sockets.get(url);
  }

  closeAll(): void {
    this.sockets.forEach(socket => socket.close());
    this.sockets.clear();
  }
}

// Mock WebSocket Instance
export class MockWebSocketInstance extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocketInstance.CONNECTING;
  public url: string;
  public messages: any[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    
    // Simulate connection in next tick
    setTimeout(() => {
      this.readyState = MockWebSocketInstance.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send = vi.fn((data: any) => {
    this.messages.push(data);
    
    // Simulate server response
    setTimeout(() => {
      try {
        const parsed = JSON.parse(data);
        const response = this.generateMockResponse(parsed);
        const event = new MessageEvent('message', { data: JSON.stringify(response) });
        this.dispatchEvent(event);
      } catch {
        // Ignore invalid JSON
      }
    }, 10);
  });

  close = vi.fn(() => {
    this.readyState = MockWebSocketInstance.CLOSED;
    this.dispatchEvent(new Event('close'));
  });

  private generateMockResponse(message: any): any {
    if (Array.isArray(message)) {
      const [type] = message;
      
      switch (type) {
        case 'REQ':
          // Respond with EOSE
          return ['EOSE', message[1]];
        case 'EVENT':
          // Respond with OK
          return ['OK', message[1]?.id || 'mock-id', true, ''];
        default:
          return ['NOTICE', 'mock response'];
      }
    }
    
    return ['NOTICE', 'unknown message format'];
  }
}

// Mock Network Provider
export class MockNetworkProvider {
  private requests = new Map<string, any>();

  async fetch(url: string | URL, options?: RequestInit): Promise<Response> {
    const urlString = url.toString();
    
    // Store request for inspection
    this.requests.set(urlString, { url: urlString, options });
    
    // Return mock response
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve('mock response'),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as Response);
  }

  getRequest(url: string): any {
    return this.requests.get(url);
  }

  clearRequests(): void {
    this.requests.clear();
  }
}

// Global service instances
export const mockNostrService = new MockNostrService();
export const mockRelayService = mockNostrService.getRelayService();
export const mockWebSocketProvider = new MockWebSocketProvider();
export const mockNetworkProvider = new MockNetworkProvider();

// Service configuration
export function configureMockServices(): void {
  // Replace global constructors with our mocks
  global.WebSocket = vi.fn().mockImplementation((url: string) => {
    return mockWebSocketProvider.create(url);
  }) as any;

  global.fetch = vi.fn().mockImplementation((url: string | URL, options?: RequestInit) => {
    return mockNetworkProvider.fetch(url, options);
  }) as any;
}

// Cleanup function for tests
export function cleanupMockServices(): void {
  mockWebSocketProvider.closeAll();
  mockNetworkProvider.clearRequests();
}