/**
 * Smart console log bundler for development
 * Collects and batches related logs to reduce console noise
 */

interface LogBundle {
  category: string;
  logs: string[];
  startTime: number;
  lastUpdate: number;
}

class LogBundler {
  private bundles = new Map<string, LogBundle>();
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly BUNDLE_WINDOW = 1000; // 1 second bundling window
  private readonly MAX_BUNDLE_SIZE = 10;

  bundle(category: string, message: string) {
    if (!import.meta.env.DEV) return;

    const now = Date.now();
    let bundle = this.bundles.get(category);

    if (!bundle || now - bundle.lastUpdate > this.BUNDLE_WINDOW) {
      // Create new bundle or flush old one
      if (bundle) {
        this.flushBundle(category);
      }
      
      bundle = {
        category,
        logs: [message],
        startTime: now,
        lastUpdate: now
      };
      this.bundles.set(category, bundle);
    } else {
      // Add to existing bundle
      bundle.logs.push(message);
      bundle.lastUpdate = now;
      
      // Auto-flush if bundle gets too large
      if (bundle.logs.length >= this.MAX_BUNDLE_SIZE) {
        this.flushBundle(category);
        return;
      }
    }

    // Schedule flush
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flushAll();
    }, this.BUNDLE_WINDOW);
  }

  private flushBundle(category: string) {
    const bundle = this.bundles.get(category);
    if (!bundle) return;

    if (bundle.logs.length === 1) {
      // Single log - output normally
      console.log(`[${category}] ${bundle.logs[0]}`);
    } else {
      // Multiple logs - bundle them
      console.groupCollapsed(`[${category}] ${bundle.logs.length} events (${Date.now() - bundle.startTime}ms)`);
      bundle.logs.forEach(log => console.log(log));
      console.groupEnd();
    }

    this.bundles.delete(category);
  }

  private flushAll() {
    for (const category of this.bundles.keys()) {
      this.flushBundle(category);
    }
    this.flushTimeout = null;
  }

  // Force flush (for testing or immediate output)
  flush() {
    this.flushAll();
  }
}

// Global bundler instance
export const logBundler = new LogBundler();

// Convenience functions
export function bundleLog(category: string, message: string) {
  logBundler.bundle(category, message);
}

export function flushLogs() {
  logBundler.flush();
}