/**
 * Production-safe logger utility
 * 
 * In development: Shows all logs
 * In production: Only shows warnings and errors
 * 
 * Can be overridden via localStorage devMode='true'
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Check if dev mode is enabled
 */
function isDevMode(): boolean {
  // First check environment
  if (isDevelopment) return true;
  
  // Allow localStorage override for production debugging
  try {
    return localStorage.getItem('devMode') === 'true';
  } catch {
    return false;
  }
}

/**
 * Info logs - only shown in development
 * Use for general informational messages, prefetching, batching, etc.
 */
export const logInfo = (...rest: unknown[]) => {
  if (!isDevMode()) return;
  console.log(...rest);
};

/**
 * Warning logs - always shown
 * Use for recoverable issues that users should know about
 */
export const logWarning = (...rest: unknown[]) => {
  console.warn(...rest);
};

/**
 * Error logs - always shown
 * Use for errors that require attention
 */
export const logError = (...rest: unknown[]) => {
  console.error(...rest);
};

/**
 * Debug logs - only shown in development
 * Use for detailed debugging information
 */
export const logDebug = (...rest: unknown[]) => {
  if (!isDevMode()) return;
  console.debug(...rest);
};