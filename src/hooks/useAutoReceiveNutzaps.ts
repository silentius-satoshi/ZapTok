import { useEffect, useRef, useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useNostr } from '@/hooks/useNostr';
import { useReceivedNutzaps, useRedeemNutzap, ReceivedNutzap } from './useReceivedNutzaps';
import { useNutzapInfo } from './useNutzaps';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { formatBalance } from '@/lib/cashu';
import { toast } from 'sonner';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';

/**
 * Hook that automatically receives nutzaps when the wallet is loaded
 * and sets up real-time subscriptions for incoming nutzaps
 */
export function useAutoReceiveNutzaps() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const nutzapInfoQuery = useNutzapInfo(user?.pubkey);
  const { data: fetchedNutzaps, refetch: refetchNutzaps } = useReceivedNutzaps();
  const { mutateAsync: redeemNutzap } = useRedeemNutzap();
  const walletUiStore = useWalletUiStore();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Keep track of processed event IDs to avoid duplicates
  const processedEventIds = useRef<Set<string>>(new Set());
  const subscriptionController = useRef<AbortController | null>(null);

  // Format amount based on user preference
  const formatAmount = useCallback((sats: number) => {
    if (showSats) {
      return formatBalance(sats);
    } else if (btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.USD));
    }
    return formatBalance(sats);
  }, [showSats, btcPrice]);

  // Process and auto-redeem a nutzap
  const processNutzap = useCallback(async (nutzap: ReceivedNutzap) => {
    if (nutzap.redeemed || processedEventIds.current.has(nutzap.id)) {
      return;
    }

    processedEventIds.current.add(nutzap.id);

    try {
      await redeemNutzap(nutzap);

      const amount = nutzap.proofs.reduce((sum, p) => sum + p.amount, 0);

      // Show success notification
      toast.success(`eCash received! ${formatAmount(amount)}`, {
        description: nutzap.content ? `"${nutzap.content}"` : undefined,
        duration: 4000,
      });

      // Trigger balance animation
      walletUiStore.setBalanceAnimation(true);

      console.log(`Auto-redeemed nutzap: ${nutzap.id}`);
    } catch (error) {
      console.error(`Failed to auto-redeem nutzap ${nutzap.id}:`, error);

      toast.error("Failed to receive eCash", {
        description: "There was an error processing the payment",
        duration: 4000,
      });
    }
  }, [redeemNutzap, formatAmount, walletUiStore]);

  // Set up real-time subscription for new nutzaps
  useEffect(() => {
    if (!user || !nutzapInfoQuery.data) return;

    const nutzapInfo = nutzapInfoQuery.data;
    if (!nutzapInfo.mints || nutzapInfo.mints.length === 0) return;

    // Cancel any existing subscription
    if (subscriptionController.current) {
      subscriptionController.current.abort();
    }

    // Create new subscription controller
    subscriptionController.current = new AbortController();
    const signal = subscriptionController.current.signal;

    // Set up subscription for new nutzap events
    const setupSubscription = async () => {
      try {
        const trustedMints = nutzapInfo.mints.map(mint => mint.url);

        const filter = {
          kinds: [CASHU_EVENT_KINDS.ZAP],
          '#p': [user.pubkey], // Events that p-tag the user
          '#u': trustedMints, // Events that u-tag one of the trusted mints
          since: Math.floor(Date.now() / 1000) - 60, // Start from 1 minute ago to catch recent events
        };

        console.log('Setting up nutzap subscription with filter:', filter);

        // Subscribe to new events
        const eventIterable = nostr.req([filter], { signal });

        for await (const msg of eventIterable) {
          if (signal.aborted) break;

          // Handle different message types from relay
          if (msg[0] === 'EVENT') {
            const event = msg[2]; // NostrEvent is at index 2 in EVENT messages

            try {
              // Process the event into a ReceivedNutzap if valid
              const mintTag = event.tags.find(tag => tag[0] === 'u');
              if (!mintTag || !trustedMints.includes(mintTag[1])) continue;

              const proofTags = event.tags.filter(tag => tag[0] === 'proof');
              if (proofTags.length === 0) continue;

              const proofs = proofTags.map(tag => {
                try {
                  return JSON.parse(tag[1]);
                } catch (e) {
                  return null;
                }
              }).filter(Boolean);

              if (proofs.length === 0) continue;

              // Verify P2PK lock
              const p2pkPubkey = nutzapInfo.p2pkPubkey;
              let validProofs = true;
              for (const proof of proofs) {
                try {
                  const secret = JSON.parse(proof.secret);
                  if (!(Array.isArray(secret) &&
                      secret[0] === 'P2PK' &&
                      secret[1] === p2pkPubkey)) {
                    validProofs = false;
                    break;
                  }
                } catch (e) {
                  validProofs = false;
                  break;
                }
              }

              if (!validProofs) continue;

              // Create ReceivedNutzap object
              const amount = proofs.reduce((sum, p) => sum + p.amount, 0);
              const receivedNutzap: ReceivedNutzap = {
                id: event.id,
                pubkey: event.pubkey,
                senderPubkey: event.pubkey,
                createdAt: event.created_at,
                timestamp: event.created_at,
                content: event.content,
                comment: event.content,
                amount,
                proofs,
                mintUrl: mintTag[1],
                redeemed: false,
                status: 'pending'
              };

              // Process the nutzap
              await processNutzap(receivedNutzap);

              // Refetch nutzaps to update the list
              refetchNutzaps();

            } catch (error) {
              console.error('Error processing subscription event:', error);
            }
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Nutzap subscription error:', error);
        }
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (subscriptionController.current) {
        subscriptionController.current.abort();
      }
    };
  }, [user, nutzapInfoQuery.data, processNutzap, refetchNutzaps, nostr]);

  // Auto-redeem existing unredeemed nutzaps on mount/update
  useEffect(() => {
    if (!fetchedNutzaps || !user || !nutzapInfoQuery.data) return;

    const unredeemedNutzaps = fetchedNutzaps.filter(nutzap => !nutzap.redeemed);

    unredeemedNutzaps.forEach(async (nutzap) => {
      await processNutzap(nutzap);
    });
  }, [fetchedNutzaps, user, nutzapInfoQuery.data, processNutzap]);

  return {
    isAutoReceiving: true,
    receivedCount: fetchedNutzaps?.length || 0,
    unredeemedCount: fetchedNutzaps?.filter(n => !n.redeemed).length || 0,
  };
}