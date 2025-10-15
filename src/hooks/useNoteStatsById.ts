import { useEffect, useState } from 'react';
import noteStatsService from '@/services/note-stats.service';

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

/**
 * Hook to get note statistics for a specific event ID
 * Based on Jumble's useNoteStatsById implementation
 */
export function useNoteStatsById(eventId: string) {
  const [stats, setStats] = useState<NoteStats | null>(null);

  useEffect(() => {
    // Get initial stats
    const initialStats = noteStatsService.getNoteStatsById(eventId);
    setStats(initialStats);

    // Subscribe to changes
    const unsubscribe = noteStatsService.subscribeToNoteStats(eventId, () => {
      const updatedStats = noteStatsService.getNoteStatsById(eventId);
      setStats(updatedStats);
    });

    return unsubscribe;
  }, [eventId]);

  return stats;
}