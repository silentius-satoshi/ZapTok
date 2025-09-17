/**
 * Debug configuration for ZapTok development
 * Controls console logging for different subsystems
 */

export const DEBUG_CONFIG = {
  // Lightning & Zap debugging
  lightning: {
    enabled: false, // Set to true to enable lightning debug logs
    verbose: false, // Set to true for extra verbose logging
  },
  
  // Bunker signer debugging
  bunker: {
    enabled: true, // Enable bunker debug logs for testing
    verbose: true, // Enable extra verbose logging for testing
  },
  
  // General authentication debugging
  auth: {
    enabled: false, // Set to true to enable auth debug logs
    verbose: false, // Set to true for extra verbose logging
  },
  
  // Enable all debugging (useful for development)
  enableAll: false,
};

// Helper functions for conditional logging
export const debugLog = {
  lightning: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.lightning.enabled) {
      console.log(`⚡ [Lightning] ${message}`, ...args);
    }
  },
  
  lightningVerbose: (message: string, ...args: any[]) => {
    if ((DEBUG_CONFIG.enableAll || DEBUG_CONFIG.lightning.enabled) && DEBUG_CONFIG.lightning.verbose) {
      console.log(`⚡🔍 [Lightning Verbose] ${message}`, ...args);
    }
  },
  
  bunker: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.bunker.enabled) {
      console.log(`🔐 [Bunker] ${message}`, ...args);
    }
  },
  
  bunkerVerbose: (message: string, ...args: any[]) => {
    if ((DEBUG_CONFIG.enableAll || DEBUG_CONFIG.bunker.enabled) && DEBUG_CONFIG.bunker.verbose) {
      console.log(`🔐🔍 [Bunker Verbose] ${message}`, ...args);
    }
  },
  
  auth: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.auth.enabled) {
      console.log(`🔑 [Auth] ${message}`, ...args);
    }
  },
  
  authVerbose: (message: string, ...args: any[]) => {
    if ((DEBUG_CONFIG.enableAll || DEBUG_CONFIG.auth.enabled) && DEBUG_CONFIG.auth.verbose) {
      console.log(`🔑🔍 [Auth Verbose] ${message}`, ...args);
    }
  },
};

// Function to enable all debugging (can be called from dev tools)
export const enableAllDebugging = () => {
  DEBUG_CONFIG.enableAll = true;
  DEBUG_CONFIG.lightning.enabled = true;
  DEBUG_CONFIG.lightning.verbose = true;
  DEBUG_CONFIG.bunker.enabled = true;
  DEBUG_CONFIG.bunker.verbose = true;
  DEBUG_CONFIG.auth.enabled = true;
  DEBUG_CONFIG.auth.verbose = true;
  console.log('🚀 All ZapTok debugging enabled');
};

// Function to disable all debugging
export const disableAllDebugging = () => {
  DEBUG_CONFIG.enableAll = false;
  DEBUG_CONFIG.lightning.enabled = false;
  DEBUG_CONFIG.lightning.verbose = false;
  DEBUG_CONFIG.bunker.enabled = false;
  DEBUG_CONFIG.bunker.verbose = false;
  DEBUG_CONFIG.auth.enabled = false;
  DEBUG_CONFIG.auth.verbose = false;
  console.log('🔇 All ZapTok debugging disabled');
};

// Make debug functions available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).zapTokDebug = {
    enable: enableAllDebugging,
    disable: disableAllDebugging,
    config: DEBUG_CONFIG,
    log: debugLog,
  };
  console.log('🧪 ZapTok debug tools available at window.zapTokDebug');
}