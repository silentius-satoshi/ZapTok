/**
 * Relay Response Monitor
 * Intercepts WebSocket messages to track relay responses for published events
 */

import { bundleLog } from '@/lib/logBundler';
import { devLog, devWarn } from '@/lib/devConsole';

interface RelayResponse {
  relay: string;
  eventId: string;
  success: boolean;
  message?: string;
  timestamp: number;
}

class RelayResponseMonitor {
  private responses: Map<string, RelayResponse[]> = new Map();
  private isMonitoring = false;
  private originalWebSocket: typeof WebSocket;

  constructor() {
    this.originalWebSocket = window.WebSocket;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    devLog('[RelayMonitor] 🔍 Starting relay response monitoring...');
    this.isMonitoring = true;

    // Store reference to instance methods
    const handleMessage = this.handleMessage.bind(this);

    // Intercept WebSocket constructor
    window.WebSocket = class extends WebSocket {
      private relayUrl: string;

      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this.relayUrl = url.toString();

        // Set up message listener
        this.addEventListener('message', (event) => {
          handleMessage(this.relayUrl, event.data);
        });

        // Log connection attempts
        this.addEventListener('open', () => {
          bundleLog('relayConnections', `🔌 Connected to relay: ${this.relayUrl}`);
        });

        this.addEventListener('error', (error) => {
          bundleLog('relayConnectionErrors', `❌ Relay connection error: ${this.relayUrl}`);
        });
      }
    } as any;
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;

    devLog('[RelayMonitor] 🛑 Stopping relay response monitoring');
    window.WebSocket = this.originalWebSocket;
    this.isMonitoring = false;
  }

  private handleMessage(relayUrl: string, data: string) {
    try {
      const message = JSON.parse(data);

      // Handle OK messages (event acceptance/rejection)
      if (Array.isArray(message) && message[0] === 'OK') {
        const [, eventId, accepted, reason] = message;

        const response: RelayResponse = {
          relay: new URL(relayUrl).hostname,
          eventId: eventId,
          success: accepted,
          message: reason || undefined,
          timestamp: Date.now()
        };

        this.recordResponse(eventId, response);
        this.logResponse(response);
      }

      // Handle NOTICE messages (general relay messages)
      else if (Array.isArray(message) && message[0] === 'NOTICE') {
        const [, notice] = message;
        bundleLog('relayNotices', `📢 NOTICE from ${new URL(relayUrl).hostname}: ${notice}`);
      }

      // Handle EVENT messages (for debugging subscription responses)
      else if (Array.isArray(message) && message[0] === 'EVENT') {
        // Don't log every EVENT message as it would be too verbose
        // but we could track specific events if needed
      }

    } catch (error) {
      // Not JSON or malformed message, ignore silently
    }
  }

  private recordResponse(eventId: string, response: RelayResponse) {
    if (!this.responses.has(eventId)) {
      this.responses.set(eventId, []);
    }
    this.responses.get(eventId)!.push(response);
  }

  private logResponse(response: RelayResponse) {
    const { relay, eventId, success, message, timestamp } = response;
    const eventIdShort = eventId.slice(0, 12) + '...';

    if (success) {
      bundleLog('relayAcceptances', `✅ ${relay} accepted event ${eventIdShort}`);
    } else {
      bundleLog('relayRejections', `❌ ${relay} rejected event ${eventIdShort}: ${message || 'Unknown reason'}`);
    }
  }

  getResponsesForEvent(eventId: string): RelayResponse[] {
    return this.responses.get(eventId) || [];
  }

  getResponseSummary(eventId: string) {
    const responses = this.getResponsesForEvent(eventId);
    const accepted = responses.filter(r => r.success);
    const rejected = responses.filter(r => !r.success);

    return {
      total: responses.length,
      accepted: accepted.length,
      rejected: rejected.length,
      acceptedRelays: accepted.map(r => r.relay),
      rejectedRelays: rejected.map(r => ({ relay: r.relay, reason: r.message })),
      responses
    };
  }

  clearResponses(eventId?: string) {
    if (eventId) {
      this.responses.delete(eventId);
    } else {
      this.responses.clear();
    }
  }

  // Helper method to check event propagation after publishing
  checkEventPropagation(eventId: string, timeoutMs = 5000): Promise<{
    success: boolean;
    acceptedRelays: string[];
    rejectedRelays: Array<{relay: string, reason?: string}>;
    totalResponses: number;
  }> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const summary = this.getResponseSummary(eventId);

        // If we have responses from at least one relay, or timeout reached
        if (summary.total > 0) {
          clearInterval(checkInterval);
          resolve({
            success: summary.accepted > 0,
            acceptedRelays: summary.acceptedRelays,
            rejectedRelays: summary.rejectedRelays,
            totalResponses: summary.total
          });
        }
      }, 500);

      // Timeout after specified time
      setTimeout(() => {
        clearInterval(checkInterval);
        const summary = this.getResponseSummary(eventId);
        resolve({
          success: summary.accepted > 0,
          acceptedRelays: summary.acceptedRelays,
          rejectedRelays: summary.rejectedRelays,
          totalResponses: summary.total
        });
      }, timeoutMs);
    });
  }
}

// Export singleton instance
export const relayResponseMonitor = new RelayResponseMonitor();

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  relayResponseMonitor.startMonitoring();

  // Make it available globally for debugging
  (window as any).relayMonitor = relayResponseMonitor;
  devLog('[RelayMonitor] 🔧 Monitor available globally as window.relayMonitor');
}
