import { getZapInfoFromEvent } from '@/lib/event-metadata';
import dayjs from 'dayjs';
import { Event } from 'nostr-tools';

interface ZapInfo {
  pr: string;
  pubkey: string;
  amount: number;
  comment?: string;
  created_at: number;
}

interface NoteStats {
  zapPrSet?: Set<string>;
  zaps?: ZapInfo[];
  reactions?: any[];
  reposts?: any[];
}

type NoteStatsMap = Map<string, NoteStats>;

class NoteStatsService {
  private noteStatsMap: NoteStatsMap = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    // Initialize service
  }

  /**
   * Add a zap to the stats for a specific event
   * Based on Jumble's implementation
   */
  addZap(
    pubkey: string,
    eventId: string,
    pr: string,
    amount: number,
    comment?: string,
    created_at: number = dayjs().unix(),
    notify: boolean = true
  ) {
    const old = this.noteStatsMap.get(eventId) || {};
    const zapPrSet = old.zapPrSet || new Set();
    const zaps = old.zaps || [];
    
    // Prevent duplicate zaps (same payment request)
    if (zapPrSet.has(pr)) return;

    zapPrSet.add(pr);
    zaps.push({ pr, pubkey, amount, comment, created_at });
    this.noteStatsMap.set(eventId, { ...old, zapPrSet, zaps });
    
    if (notify) {
      this.notifyNoteStats(eventId);
    }
    
    return eventId;
  }

  /**
   * Get stats for a specific event
   */
  getNoteStatsById(eventId: string): NoteStats | null {
    return this.noteStatsMap.get(eventId) || null;
  }

  /**
   * Subscribe to changes for a specific event
   */
  subscribeToNoteStats(eventId: string, callback: () => void) {
    if (!this.listeners.has(eventId)) {
      this.listeners.set(eventId, new Set());
    }
    this.listeners.get(eventId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventId);
        }
      }
    };
  }

  /**
   * Notify all listeners for a specific event
   */
  private notifyNoteStats(eventId: string) {
    const listeners = this.listeners.get(eventId);
    if (listeners) {
      listeners.forEach(callback => callback());
    }
  }

  /**
   * Process a zap receipt event and add to stats
   * Based on Jumble's addZapByEvent implementation
   */
  private addZapByEvent(evt: Event) {
    const info = getZapInfoFromEvent(evt);
    if (!info) return;
    
    const { originalEventId, senderPubkey, invoice, amount, comment } = info;
    if (!originalEventId || !senderPubkey) return;

    return this.addZap(
      senderPubkey,
      originalEventId,
      invoice,
      amount,
      comment,
      evt.created_at,
      false
    );
  }

  /**
   * Process multiple zap events
   */
  processZapEvents(events: Event[]) {
    events.forEach(event => this.addZapByEvent(event));
  }

  /**
   * Clear stats (for testing or reset)
   */
  clearStats() {
    this.noteStatsMap.clear();
    this.listeners.clear();
  }

  /**
   * Get total zap amount for an event
   */
  getTotalZapAmount(eventId: string): number {
    const stats = this.getNoteStatsById(eventId);
    if (!stats?.zaps) return 0;
    
    return stats.zaps.reduce((total, zap) => total + zap.amount, 0);
  }

  /**
   * Check if a user has zapped an event
   */
  hasUserZapped(eventId: string, userPubkey: string): boolean {
    const stats = this.getNoteStatsById(eventId);
    if (!stats?.zaps) return false;
    
    return stats.zaps.some(zap => zap.pubkey === userPubkey);
  }

  /**
   * Get top zaps for an event (sorted by amount)
   */
  getTopZaps(eventId: string, limit: number = 10): ZapInfo[] {
    const stats = this.getNoteStatsById(eventId);
    if (!stats?.zaps) return [];
    
    return stats.zaps
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }
}

// Export singleton instance
const noteStatsService = new NoteStatsService();
export default noteStatsService;