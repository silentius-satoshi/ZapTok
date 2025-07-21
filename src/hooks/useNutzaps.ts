// NIP-61 Nutzaps Hook
// Provides functionality for sending and receiving nutzaps

import { useState, useCallback, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNIP60Cashu } from '@/hooks/useNIP60Cashu';
import { useAppContext } from '@/hooks/useAppContext';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type {
  NutzapEvent,
  P2PKProof
} from '@/lib/nip61-types';
import {
  createP2PKSecret,
  validateNutzapInfoEvent,
  validateNutzapEvent,
  getNutzapAmount,
  getNutzapMint
} from '@/lib/nip61-types';

interface UseNutzapsResult {
  // Nutzap receiving
  publishNutzapInfo: () => Promise<void>;
  isNutzapInfoPublished: boolean;

  // Nutzap sending
  sendNutzap: (
    recipientPubkey: string,
    amount: number,
    comment?: string,
    eventId?: string
  ) => Promise<string>;

  // Nutzap receiving
  receivedNutzaps: NutzapEvent[];
  claimNutzap: (nutzapEvent: NutzapEvent) => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;

  // Stats
  totalReceived: number;
  totalSent: number;
}

export function useNutzaps(): UseNutzapsResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { wallets, currentWallet, createWallet, receiveTokens } = useNIP60Cashu();
  const { config } = useAppContext();
  const { mutateAsync: publishEvent } = useNostrPublish();

  const [receivedNutzaps, setReceivedNutzaps] = useState<NutzapEvent[]>([]);
  const [isNutzapInfoPublished, setIsNutzapInfoPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSent, setTotalSent] = useState(0);

  // Get primary relay URL
  const relayUrl = config.relayUrls[0] || 'wss://relay.nostr.band';

  // Check if nutzap info is published on mount
  useEffect(() => {
    if (!user) return;

    const checkNutzapInfo = async () => {
      try {
        const signal = AbortSignal.timeout(3000);
        const events = await nostr.query([{
          kinds: [10019],
          authors: [user.pubkey],
          limit: 1
        }], { signal });

        setIsNutzapInfoPublished(events.length > 0);
      } catch (err) {
        console.warn('Failed to check nutzap info:', err);
      }
    };

    checkNutzapInfo();
  }, [user, nostr]);

  // Load received nutzaps
  useEffect(() => {
    if (!user || wallets.length === 0) return;

    const loadReceivedNutzaps = async () => {
      try {
        const signal = AbortSignal.timeout(5000);

        // Get all mints from all wallets
        const allMints = wallets.flatMap(w => w.mints);
        if (allMints.length === 0) return;

        // Query for nutzaps sent to user on trusted mints
        const nutzapEvents = await nostr.query([{
          kinds: [9321],
          '#p': [user.pubkey],
          '#u': allMints,
          limit: 100
        }], { signal });

        const validNutzaps = nutzapEvents.filter(validateNutzapEvent) as NutzapEvent[];
        setReceivedNutzaps(validNutzaps);

        // Calculate total received
        const total = validNutzaps.reduce((sum, nutzap) => sum + getNutzapAmount(nutzap), 0);
        setTotalReceived(total);
      } catch (err) {
        console.warn('Failed to load received nutzaps:', err);
      }
    };

    loadReceivedNutzaps();
  }, [user, nostr, wallets]);

  /**
   * Publish nutzap info event to advertise nutzap receiving capability
   */
  const publishNutzapInfo = useCallback(async (): Promise<void> => {
    if (!user || wallets.length === 0) {
      throw new Error('Need at least one wallet to publish nutzap info');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get P2PK pubkey from first wallet (they all use the same P2PK key)
      const wallet = wallets[0];
      const p2pkPubkey = wallet.id; // In NIP-60, wallet ID is derived from P2PK pubkey

      // Create nutzap info event
      const eventTemplate = {
        kind: 10019,
        content: '',
        tags: [
          ['relay', relayUrl],
          // Add all mints from all wallets
          ...wallets.flatMap(w => w.mints.map(mint => ['mint', mint, 'sat'])),
          ['pubkey', p2pkPubkey]
        ]
      };

      await publishEvent(eventTemplate);
      setIsNutzapInfoPublished(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to publish nutzap info';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, nostr, wallets, relayUrl, publishEvent]);

  /**
   * Send a nutzap to another user
   */
  const sendNutzap = useCallback(async (
    recipientPubkey: string,
    amount: number,
    comment = '',
    eventId?: string
  ): Promise<string> => {
    if (!user || !currentWallet) {
      throw new Error('Need an active wallet to send nutzaps');
    }

    if (currentWallet.balance < amount) {
      throw new Error('Insufficient balance for nutzap');
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, get recipient's nutzap info
      const signal = AbortSignal.timeout(3000);
      const recipientInfoEvents = await nostr.query([{
        kinds: [10019],
        authors: [recipientPubkey],
        limit: 1
      }], { signal });

      if (recipientInfoEvents.length === 0) {
        throw new Error('Recipient has not published nutzap info');
      }

      const recipientInfo = recipientInfoEvents[0];
      if (!validateNutzapInfoEvent(recipientInfo)) {
        throw new Error('Invalid recipient nutzap info');
      }

      // Find a mint that both we and recipient support
      const recipientMints = recipientInfo.tags
        .filter(([name]) => name === 'mint')
        .map(([, mint]) => mint);

      const compatibleMint = currentWallet.mints.find(mint =>
        recipientMints.includes(mint)
      );

      if (!compatibleMint) {
        throw new Error('No compatible mint found with recipient');
      }

      // Get recipient's P2PK pubkey
      const recipientP2PKTag = recipientInfo.tags.find(([name]) => name === 'pubkey');
      if (!recipientP2PKTag) {
        throw new Error('Recipient P2PK pubkey not found');
      }
      const recipientP2PK = recipientP2PKTag[1];

      // Create P2PK locked proofs (simplified - real implementation would interact with mint)
      const [p2pkSecret] = createP2PKSecret(recipientP2PK);

      const proof: P2PKProof = {
        amount,
        id: crypto.randomUUID().slice(0, 16),
        secret: p2pkSecret,
        C: '02' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
      };

      // Create nutzap event
      const nutzapEventTemplate = {
        kind: 9321,
        content: comment,
        tags: [
          ['proof', JSON.stringify(proof)],
          ['u', compatibleMint],
          ['p', recipientPubkey],
          ...(eventId ? [['e', eventId, relayUrl]] : [])
        ]
      };

      // Publish nutzap event
      const publishedEvent = await publishEvent(nutzapEventTemplate);

      // Update stats
      setTotalSent(prev => prev + amount);

      return publishedEvent.id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send nutzap';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, nostr, currentWallet, relayUrl, publishEvent]);

  /**
   * Claim a received nutzap
   */
  const claimNutzap = useCallback(async (nutzapEvent: NutzapEvent): Promise<void> => {
    if (!user || wallets.length === 0) {
      throw new Error('Need a wallet to claim nutzaps');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract proofs from nutzap
      const proofTags = nutzapEvent.tags.filter(([name]) => name === 'proof');
      const proofs = proofTags.map(([, proofJson]) => JSON.parse(proofJson));

      const mint = getNutzapMint(nutzapEvent);
      if (!mint) {
        throw new Error('No mint found in nutzap event');
      }

      // Find wallet that supports this mint
      const compatibleWallet = wallets.find(w => w.mints.includes(mint));
      if (!compatibleWallet) {
        // Create new wallet with this mint
        await createWallet([mint]);
      }

      // Create token string for receiving (simplified format)
      const tokenString = JSON.stringify({
        token: [{
          mint,
          proofs
        }]
      });

      // Receive tokens into wallet
      await receiveTokens(tokenString, compatibleWallet?.id);

      // Create history event marking nutzap as redeemed
      const historyEventTemplate = {
        kind: 7376,
        content: JSON.stringify({
          direction: 'in',
          amount: getNutzapAmount(nutzapEvent).toString(),
          nutzap_sender: nutzapEvent.pubkey,
          comment: nutzapEvent.content
        }),
        tags: [
          ['e', nutzapEvent.id, relayUrl, 'redeemed'],
          ['p', nutzapEvent.pubkey]
        ]
      };

      await publishEvent(historyEventTemplate);

      // Remove from received nutzaps list
      setReceivedNutzaps(prev => prev.filter(n => n.id !== nutzapEvent.id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim nutzap';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, nostr, wallets, createWallet, receiveTokens, relayUrl, publishEvent]);

  return {
    // Nutzap info
    publishNutzapInfo,
    isNutzapInfoPublished,

    // Sending
    sendNutzap,

    // Receiving
    receivedNutzaps,
    claimNutzap,

    // State
    isLoading,
    error,

    // Stats
    totalReceived,
    totalSent
  };
}
