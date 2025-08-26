/**
 * Polyfill for AbortSignal.any()
 * 
 * AbortSignal.any() creates an AbortSignal that will be aborted when any of the
 * provided signals are aborted. This is useful for combining multiple abort signals.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
 */

// Check if AbortSignal.any is already available
if (!AbortSignal.any) {
  AbortSignal.any = function(signals: AbortSignal[]): AbortSignal {
    // If no signals provided, return a signal that never aborts
    if (signals.length === 0) {
      return new AbortController().signal;
    }

    // If only one signal, return it directly for efficiency
    if (signals.length === 1) {
      return signals[0];
    }

    // Check if any signal is already aborted
    for (const signal of signals) {
      if (signal.aborted) {
        // Create an already-aborted signal with the same reason
        const controller = new AbortController();
        controller.abort(signal.reason);
        return controller.signal;
      }
    }

    // Create a new controller for the combined signal
    const controller = new AbortController();

    // Function to abort the combined signal
    const onAbort = (event: Event) => {
      const target = event.target as AbortSignal;
      controller.abort(target.reason);
    };

    // Listen for abort events on all input signals
    for (const signal of signals) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Clean up listeners when the combined signal is aborted
    controller.signal.addEventListener('abort', () => {
      for (const signal of signals) {
        signal.removeEventListener('abort', onAbort);
      }
    }, { once: true });

    return controller.signal;
  };
}

/**
 * Polyfill for AbortSignal.timeout()
 * 
 * AbortSignal.timeout() creates an AbortSignal that will be aborted after a
 * specified number of milliseconds.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
 */

// Check if AbortSignal.timeout is already available
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function(milliseconds: number): AbortSignal {
    const controller = new AbortController();
    
    setTimeout(() => {
      controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    }, milliseconds);
    
    return controller.signal;
  };
}

/**
 * Early Browser Extension Protection for Bitcoin Connect
 * 
 * This protection mechanism prevents browser extensions from immediately
 * overriding Bitcoin Connect's WebLN provider during initialization.
 * It sets up early detection and protection before any components load.
 */

// Immediate protection setup
(function setupEarlyWebLNProtection() {
  // Store original WebLN if it exists (browser extension)
  if (typeof window !== 'undefined' && window.webln) {
    console.log('[WebLN Protection] Browser extension WebLN detected early:', window.webln.constructor?.name);
    (window as any).__originalBrowserWebLN = window.webln;
  }

  // Set up early detection for when WebLN gets added/changed
  if (typeof window !== 'undefined') {
    const originalDefineProperty = Object.defineProperty;
    
    // Intercept attempts to set window.webln
    Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
      if (obj === window && prop === 'webln') {
        console.log('[WebLN Protection] WebLN assignment detected:', descriptor.value?.constructor?.name);
        
        // If Bitcoin Connect is intentionally active, protect against overrides
        if ((window as any).__bitcoinConnectActive && descriptor.value !== (window as any).__bitcoinConnectWebLN) {
          console.log('[WebLN Protection] 🚨 Blocking browser extension WebLN override during Bitcoin Connect session');
          return originalDefineProperty.call(this, obj, prop, {
            ...descriptor,
            value: (window as any).__bitcoinConnectWebLN || descriptor.value
          });
        }
      }
      
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };
    
    // Also intercept direct assignments
    let webLNValue = (window as any).webln;
    Object.defineProperty(window, 'webln', {
      get() {
        return webLNValue;
      },
      set(newValue) {
        console.log('[WebLN Protection] Direct WebLN assignment:', newValue?.constructor?.name);
        
        // If Bitcoin Connect is active and this isn't the Bitcoin Connect WebLN, block it
        if ((window as any).__bitcoinConnectActive && 
            newValue !== (window as any).__bitcoinConnectWebLN &&
            (window as any).__bitcoinConnectWebLN) {
          console.log('[WebLN Protection] 🚨 Blocking direct WebLN override during Bitcoin Connect session');
          return; // Don't update the value
        }
        
        webLNValue = newValue;
      },
      configurable: true,
      enumerable: true
    });
  }
})();