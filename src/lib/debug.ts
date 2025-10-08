/**
 * Debug configuration for ZapTok development
 * Controls console logging for different subsystems
 */

import { devLog, devWarn, devError } from '@/lib/devConsole';

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
      devLog(`⚡ [Lightning] ${message}`, ...args);
    }
  },
  
  lightningVerbose: (message: string, ...args: any[]) => {
    if ((DEBUG_CONFIG.enableAll || DEBUG_CONFIG.lightning.enabled) && DEBUG_CONFIG.lightning.verbose) {
      devLog(`⚡🔍 [Lightning Verbose] ${message}`, ...args);
    }
  },
  
  bunker: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.bunker.enabled) {
      devLog(`🔐 [Bunker] ${message}`, ...args);
    }
  },
  
  bunkerVerbose: (message: string, ...args: any[]) => {
    if ((DEBUG_CONFIG.enableAll || DEBUG_CONFIG.bunker.enabled) && DEBUG_CONFIG.bunker.verbose) {
      devLog(`🔐🔍 [Bunker Verbose] ${message}`, ...args);
    }
  },
  
  bunkerError: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.bunker.enabled) {
      devError(`🔐❌ [Bunker Error] ${message}`, ...args);
    }
  },
  
  bunkerWarn: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.bunker.enabled) {
      devWarn(`🔐⚠️ [Bunker Warning] ${message}`, ...args);
    }
  },
  
  auth: (message: string, ...args: any[]) => {
    if (DEBUG_CONFIG.enableAll || DEBUG_CONFIG.auth.enabled) {
      devLog(`🔑 [Auth] ${message}`, ...args);
    }
  },
  
  authVerbose: (message: string, ...args: any[]) => {
    if ((DEBUG_CONFIG.enableAll || DEBUG_CONFIG.auth.enabled) && DEBUG_CONFIG.auth.verbose) {
      devLog(`🔑🔍 [Auth Verbose] ${message}`, ...args);
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
  devLog('🚀 All ZapTok debugging enabled');
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
  devLog('🔇 All ZapTok debugging disabled');
};

// Make debug functions available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).zapTokDebug = {
    enable: enableAllDebugging,
    disable: disableAllDebugging,
    config: DEBUG_CONFIG,
    log: debugLog,
    testPost: () => {
      window.location.hash = '#/test-post';
      console.log('🧪 Opening test post page for real-time feed testing...');
    },
  };
  devLog('🧪 ZapTok debug tools available at window.zapTokDebug');
  devLog('💡 Try: window.zapTokDebug.testPost() - Open test post page');
}