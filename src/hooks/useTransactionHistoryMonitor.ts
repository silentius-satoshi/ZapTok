import { useEffect, useRef } from 'react';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Hook that monitors transaction history for potential synchronization issues
 * and provides gentle warnings when problems are detected
 */
export function useTransactionHistoryMonitor() {
  const { transactions } = useCashuHistory();
  const { config } = useAppContext();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const hasShownWarning = useRef(false);
  const lastTransactionCount = useRef(0);

  useEffect(() => {
    // Only run monitoring for logged-in users
    if (!user || !transactions) return;

    // Skip if we've already shown a warning in this session
    if (hasShownWarning.current) return;

    const currentCount = transactions.length;
    const configuredRelays = config.relayUrls || [];
    
    // Check for potential issues after user has had time to load transactions
    const checkForIssues = () => {
      // Issue 1: No transactions but user is logged in (most critical)
      if (currentCount === 0) {
        toast({
          title: "No Transaction History Found",
          description: "Your transactions might be on different relays. Consider adding more relays to find your history.",
          variant: "default",
          duration: 8000,
        });
        hasShownWarning.current = true;
        return;
      }

      // Issue 2: Only received transactions (suggests sent transactions are elsewhere)
      const hasOnlyReceives = transactions.every(t => 
        ['receive', 'nutzap_receive', 'mint'].includes(t.type)
      );
      
      if (hasOnlyReceives && currentCount >= 2) {
        toast({
          title: "Missing Sent Transactions?",
          description: "Only received transactions are showing. Your sent transactions might be on other relays.",
          variant: "default",
          duration: 6000,
        });
        hasShownWarning.current = true;
        return;
      }

      // Issue 3: Only sent transactions (suggests received transactions are elsewhere)
      const hasOnlySends = transactions.every(t => 
        ['send', 'nutzap_send', 'melt'].includes(t.type)
      );
      
      if (hasOnlySends && currentCount >= 2) {
        toast({
          title: "Missing Received Transactions?",
          description: "Only sent transactions are showing. Your received transactions might be on other relays.",
          variant: "default",
          duration: 6000,
        });
        hasShownWarning.current = true;
        return;
      }

      // Issue 4: Missing popular relays that might have transaction history
      const popularRelays = [
        'wss://relay.chorus.community',
        'wss://relay.nostr.band',
        'wss://relay.damus.io',
        'wss://relay.primal.net',
      ];
      
      const missingPopularRelays = popularRelays.filter(
        relay => !configuredRelays.includes(relay)
      );
      
      // If user has few transactions and is missing popular relays, suggest adding them
      if (currentCount > 0 && currentCount < 5 && missingPopularRelays.length >= 2) {
        toast({
          title: "Improve Transaction History Coverage",
          description: `You're missing ${missingPopularRelays.length} popular relays. Adding them might reveal more transactions.`,
          variant: "default",
          duration: 6000,
        });
        hasShownWarning.current = true;
        return;
      }
    };

    // Wait a moment for transactions to load, then check for issues
    const timeoutId = setTimeout(checkForIssues, 2000);

    return () => clearTimeout(timeoutId);
  }, [transactions, config.relayUrls, user, toast]);

  // Reset warning flag when transaction count significantly changes
  useEffect(() => {
    const currentCount = transactions.length;
    
    // If transaction count increased significantly, reset warning flag
    // This allows showing warnings again if user adds/removes relays
    if (currentCount > lastTransactionCount.current + 5) {
      hasShownWarning.current = false;
    }
    
    lastTransactionCount.current = currentCount;
  }, [transactions.length]);

  // Provide manual reset for testing or when user takes action
  const resetWarnings = () => {
    hasShownWarning.current = false;
  };

  return {
    resetWarnings,
  };
}
