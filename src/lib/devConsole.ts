/**
 * Development-only console logging utilities
 * All console output is suppressed in production builds
 */

// Check if we're in development mode
const isDev = import.meta.env.DEV;

/**
 * Development-only console.log
 * Completely suppressed in production
 */
export const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Development-only console.warn
 * Completely suppressed in production
 */
export const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Development-only console.info
 * Completely suppressed in production
 */
export const devInfo = (...args: any[]) => {
  if (isDev) {
    console.info(...args);
  }
};

/**
 * Development-only console.error
 * Shows in production only for critical errors (configurable)
 */
export const devError = (...args: any[]) => {
  if (isDev) {
    console.error(...args);
  }
  // In production, you might want to send critical errors to a logging service
  // but suppress console output for users
};

/**
 * Production-safe console.error for critical errors
 * Use this for errors that should be logged even in production
 * (e.g., authentication failures, security issues)
 */
export const criticalError = (...args: any[]) => {
  console.error(...args);
};

/**
 * Development-only grouped logging
 * Useful for organizing related debug information
 */
export const devGroup = (label: string, callback: () => void) => {
  if (isDev) {
    console.group(label);
    callback();
    console.groupEnd();
  }
};

/**
 * Development-only collapsed group logging
 */
export const devGroupCollapsed = (label: string, callback: () => void) => {
  if (isDev) {
    console.groupCollapsed(label);
    callback();
    console.groupEnd();
  }
};

/**
 * Open the test post page for testing real-time subscriptions
 */
export const openTestPost = () => {
  if (isDev) {
    window.location.hash = '#/test-post';
    console.log('🧪 Opening test post page...');
  }
};

// Re-export bundled logging for convenience
export { bundleLog, flushLogs } from './logBundler';