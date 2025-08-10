/**
 * Development logging utility with categorized, bundled logging
 * Only active in development mode
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogCategory = 'relay' | 'cashu' | 'route' | 'wallet' | 'general';

interface LogEntry {
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
}

class DevLogger {
  private logs: LogEntry[] = [];
  private categories: Set<LogCategory> = new Set();
  private maxLogs = 100;

  // Category colors for console styling
  private categoryColors: Record<LogCategory, string> = {
    relay: '#4CAF50',    // Green
    cashu: '#FF9800',    // Orange  
    route: '#2196F3',    // Blue
    wallet: '#9C27B0',   // Purple
    general: '#757575'   // Gray
  };

  // Level colors and icons
  private levelStyles: Record<LogLevel, { color: string; icon: string }> = {
    info: { color: '#2196F3', icon: 'ℹ️' },
    warn: { color: '#FF9800', icon: '⚠️' },
    error: { color: '#F44336', icon: '❌' },
    debug: { color: '#9E9E9E', icon: '🐛' }
  };

  private isEnabled = import.meta.env.DEV;

  log(category: LogCategory, level: LogLevel, message: string, data?: any) {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      category,
      level,
      message,
      data,
      timestamp: Date.now()
    };

    this.addEntry(entry);
    this.printEntry(entry);
  }

  private addEntry(entry: LogEntry) {
    this.logs.push(entry);
    this.categories.add(entry.category);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private printEntry(entry: LogEntry) {
    const categoryColor = this.categoryColors[entry.category];
    const levelStyle = this.levelStyles[entry.level];

    const categoryStyle = `color: ${categoryColor}; font-weight: bold; background: ${categoryColor}20; padding: 2px 6px; border-radius: 3px;`;
    const levelStyle2 = `color: ${levelStyle.color}; font-weight: bold;`;
    const messageStyle = 'color: #333;';

    console.log(
      `%c${entry.category.toUpperCase()}%c ${levelStyle.icon} %c${entry.message}`,
      categoryStyle,
      levelStyle2,
      messageStyle,
      entry.data ? entry.data : ''
    );
  }

  // Utility methods for different categories
  relay(level: LogLevel, message: string, data?: any) {
    this.log('relay', level, message, data);
  }

  cashu(level: LogLevel, message: string, data?: any) {
    this.log('cashu', level, message, data);
  }

  route(level: LogLevel, message: string, data?: any) {
    this.log('route', level, message, data);
  }

  wallet(level: LogLevel, message: string, data?: any) {
    this.log('wallet', level, message, data);
  }

  // Get bundled logs for analysis
  getBundledLogs(): Record<LogCategory, LogEntry[]> {
    const bundled: Record<LogCategory, LogEntry[]> = {
      relay: [],
      cashu: [],
      route: [],
      wallet: [],
      general: []
    };

    this.logs.forEach(log => {
      bundled[log.category].push(log);
    });

    return bundled;
  }

  // Print summary of recent activity
  printSummary() {
    if (!this.isEnabled) return;

    const bundled = this.getBundledLogs();
    console.group('📊 Development Log Summary');

    for (const [category, logs] of Object.entries(bundled)) {
      if (logs.length > 0) {
        const categoryColor = this.categoryColors[category as LogCategory];
        console.groupCollapsed(
          `%c${category.toUpperCase()}%c (${logs.length} entries)`,
          `color: ${categoryColor}; font-weight: bold;`,
          'color: #666;'
        );
        
        logs.slice(-5).forEach(log => {
          console.log(`${this.levelStyles[log.level].icon} ${log.message}`, log.data || '');
        });
        
        console.groupEnd();
      }
    }

    console.groupEnd();
  }

  // Clear all logs
  clear() {
    this.logs = [];
    this.categories.clear();
    console.clear();
  }
}

// Create singleton instance
export const devLogger = new DevLogger();

// Convenience exports
export const logRelay = (level: LogLevel, message: string, data?: any) => devLogger.relay(level, message, data);
export const logCashu = (level: LogLevel, message: string, data?: any) => devLogger.cashu(level, message, data);
export const logRoute = (level: LogLevel, message: string, data?: any) => devLogger.route(level, message, data);
export const logWallet = (level: LogLevel, message: string, data?: any) => devLogger.wallet(level, message, data);

// Add global access for debugging
if (import.meta.env.DEV) {
  (globalThis as any).devLogger = devLogger;
}
