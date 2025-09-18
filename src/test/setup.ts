import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { configureMockServices } from './services';

// Configure comprehensive service layer mocks
configureMockServices();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((_callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((_callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLVideoElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
});

// Mock video element properties
Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
  writable: true,
  value: 60,
});

Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
  writable: true,
  value: 0,
});

Object.defineProperty(HTMLVideoElement.prototype, 'paused', {
  writable: true,
  value: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'ended', {
  writable: true,
  value: false,
});

Object.defineProperty(HTMLVideoElement.prototype, 'volume', {
  writable: true,
  value: 1,
});

Object.defineProperty(HTMLVideoElement.prototype, 'muted', {
  writable: true,
  value: false,
});

// Mock global Image for environments without DOM Image constructor
global.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _listeners: Record<string, Set<(...args: unknown[]) => void>> = {};

  addEventListener(event: string, cb: (...args: unknown[]) => void) {
    if (!this._listeners[event]) this._listeners[event] = new Set();
    this._listeners[event].add(cb);
  }

  removeEventListener(event: string, cb: (...args: unknown[]) => void) {
    this._listeners[event]?.delete(cb);
  }

  dispatchEvent(event: { type: string }) {
    this._listeners[event.type]?.forEach((cb) => {
      try { cb(event); } catch (_) { /* ignore */ }
    });
    return true;
  }

  set src(_url: string) {
    // Simulate successful load without network
    setTimeout(() => {
      if (this.onload) this.onload();
      this.dispatchEvent({ type: 'load' });
    }, 0);
  }
} as any;

// Enhanced timeout protection for all async operations
const originalSetTimeout = global.setTimeout;
global.setTimeout = ((fn: any, delay: number = 0, ...args: any[]) => {
  // Cap all timeouts at 50ms during tests for faster execution
  const cappedDelay = Math.min(delay, 50);
  return originalSetTimeout(fn, cappedDelay, ...args);
}) as typeof setTimeout;