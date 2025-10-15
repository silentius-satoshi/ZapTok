import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS, SpendingHistoryEntry } from '@/lib/cashu';
import { getLastEventTimestamp } from '@/lib/nostrTimestamps';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { NostrEvent } from 'nostr-tools';

/**
 * Hook to fetch and manage the user's Cashu spending history
 */
export function useCashuHistory() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const transactionHistoryStore = useTransactionHistoryStore();

  // Create spending history event
  const createHistoryMutation = useMutation({
    mutationFn: async ({
      direction,
      amount,
      createdTokens = [],
      destroyedTokens = [],
      redeemedTokens = []
    }: {
      direction: 'in' | 'out';
      amount: string;
      createdTokens?: string[];
      destroyedTokens?: string[];
      redeemedTokens?: string[];
    }) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      // Prepare content data
      const contentData = [
        ['direction', direction],
        ['amount', amount],
        ...createdTokens.map(id => ['e', id, '', 'created']),
        ...destroyedTokens.map(id => ['e', id, '', 'destroyed'])
      ];

      // Encrypt content
      const content = await user.signer.nip44.encrypt(
        user.pubkey,
        JSON.stringify(contentData)
      );

      // Create history event with unencrypted redeemed tags
      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.HISTORY,
        content,
        tags: redeemedTokens.map(id => ['e', id, '', 'redeemed']),
        created_at: Math.floor(Date.now() / 1000)
      });

      // Publish event
      await nostr.event(event);

      // Add to transaction history store
      const historyEntry: SpendingHistoryEntry & { id: string } = {
        id: event.id,
        direction,
        amount,
        timestamp: event.created_at,
        createdTokens,
        destroyedTokens,
        redeemedTokens
      };
      transactionHistoryStore.addHistoryEntry(historyEntry);

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'history', user?.pubkey] });
    }
  });

  const historyQuery = useQuery({
    queryKey: ['cashu', 'history', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      // Get the last stored timestamp for the HISTORY event kind
      const lastTimestamp = getLastEventTimestamp(user.pubkey, CASHU_EVENT_KINDS.HISTORY);

      // Create the filter with 'since' if a timestamp exists
      const filter = {
        kinds: [CASHU_EVENT_KINDS.HISTORY],
        authors: [user.pubkey],
        limit: 100
      };

      // Add the 'since' property if we have a previous timestamp
      if (lastTimestamp) {
        Object.assign(filter, { since: lastTimestamp });
      }

      const events = await nostr.query([filter], { signal });

      console.debug(`Retrieved ${events.length} history events for decryption`, {
        userPubkey: user.pubkey,
        eventIds: events.map(e => e.id),
        eventSample: events.slice(0, 2).map(e => ({
          id: e.id,
          contentLength: e.content?.length || 0,
          contentEmpty: !e.content || e.content.trim() === '',
          created_at: e.created_at
        }))
      });

      if (events.length === 0) {
        return [];
      }

      const history: (SpendingHistoryEntry & { id: string })[] = [];

      for (const event of events) {
        try {
          // Validate event content before decryption
          if (!event.content || event.content.trim() === '') {
            console.warn(`Skipping event ${event.id}: empty content`);
            continue;
          }

          // Debug: Log event and signer details
          console.debug(`Attempting to decrypt history event ${event.id}`, {
            contentLength: event.content.length,
            contentPreview: event.content.substring(0, 50) + '...',
            signerType: user.signer?.constructor?.name,
            hasNip44: !!user.signer.nip44,
            userPubkey: user.pubkey,
            nip44Methods: user.signer.nip44 ? Object.keys(user.signer.nip44) : 'no nip44'
          });

          // Decrypt content with enhanced error handling
          let decrypted;
          try {
          console.debug(`Calling decrypt with params:`, {
            recipientPubkey: user.pubkey,
            contentType: typeof event.content,
            contentLength: event.content.length,
            isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(event.content),
            contentSample: event.content.substring(0, 50) + '...',
            eventId: event.id,
            eventKind: event.kind,
            eventAuthor: event.pubkey,
            currentUser: user.pubkey,
            isSelfEncrypted: event.pubkey === user.pubkey,
            decryptMethodExists: typeof user.signer.nip44.decrypt,
            signerMethods: Object.getOwnPropertyNames(user.signer.nip44)
          });            // Log the exact function call before making it
            console.debug(`About to call:`, `user.signer.nip44.decrypt("${user.pubkey}", "${event.content.substring(0, 20)}...")`);
            
          // Try the decryption with additional error checking
          const decryptResult = await user.signer.nip44.decrypt(user.pubkey, event.content);
          
          console.debug(`Raw decrypt result:`, {
            result: decryptResult,
            type: typeof decryptResult,
            isUndefined: decryptResult === undefined,
            isNull: decryptResult === null,
            isEmptyString: decryptResult === '',
            length: decryptResult?.length,
            constructor: decryptResult?.constructor?.name
          });
          
          // Check if result is valid before assigning
          if (decryptResult === undefined || decryptResult === null) {
            console.debug(`Primary decrypt failed, trying nostr-tools fallback...`);
            
            // Try using nostr-tools nip44 directly as fallback
            try {
              const { nip44 } = await import('nostr-tools');
              
              // For nsec signers, try to get private key if available
              let fallbackResult: string | null = null;
              
              if ((user.signer as any).getPrivateKey) {
                try {
                  const privateKey = await (user.signer as any).getPrivateKey();
                  fallbackResult = nip44.decrypt(event.content, privateKey);
                } catch (privKeyError) {
                  console.debug(`Private key access failed:`, privKeyError);
                }
              }
              
              console.debug(`Nostr-tools fallback result:`, {
                result: fallbackResult,
                type: typeof fallbackResult,
                isValid: typeof fallbackResult === 'string' && fallbackResult.length > 0
              });
              
              if (typeof fallbackResult === 'string' && fallbackResult.length > 0) {
                decrypted = fallbackResult;
                console.debug(`✅ Nostr-tools fallback successful for event ${event.id}`);
              } else {
                throw new Error(`Nostr-tools fallback also returned invalid result: ${fallbackResult}`);
              }
            } catch (fallbackError) {
              console.debug(`Nostr-tools fallback failed:`, fallbackError);
              
              // Final attempt: try alternative parameter order for self-encrypted events
              if (event.pubkey === user.pubkey) {
                console.debug(`Final attempt: alternative parameter order for self-encrypted event...`);
                try {
                  const finalResult = await user.signer.nip44.decrypt(event.pubkey, event.content);
                  if (typeof finalResult === 'string' && finalResult.length > 0) {
                    decrypted = finalResult;
                    console.debug(`✅ Alternative parameter order successful for event ${event.id}`);
                  } else {
                    throw new Error(`All decryption attempts failed. Library may be incompatible.`);
                  }
                } catch (finalError) {
                  throw new Error(`All decryption methods failed: Primary=${decryptResult}, Fallback=${fallbackError.message}, Final=${finalError.message}`);
                }
              } else {
                throw new Error(`Primary decrypt returned ${decryptResult}, nostr-tools fallback failed: ${fallbackError.message}`);
              }
            }
          } else {
            decrypted = decryptResult;
          }            console.debug(`Decrypt result:`, {
              resultType: typeof decrypted,
              resultValue: decrypted,
              isNull: decrypted === null,
              isUndefined: decrypted === undefined,
              length: decrypted?.length
            });
          } catch (decryptError) {
            console.error(`Raw decryption error for event ${event.id}:`, {
              error: decryptError,
              errorMessage: decryptError.message,
              errorStack: decryptError.stack,
              signerInfo: {
                hasNip44: !!user.signer.nip44,
                nip44Type: typeof user.signer.nip44,
                methods: user.signer.nip44 ? Object.getOwnPropertyNames(user.signer.nip44) : 'none'
              }
            });
            throw decryptError;
          }
          
          // Validate decryption result
          if (!decrypted || typeof decrypted !== 'string') {
            console.warn(`Skipping event ${event.id}: decryption returned invalid result:`, { 
              decrypted, 
              type: typeof decrypted,
              length: decrypted?.length 
            });
            continue;
          }

          console.debug(`Successfully decrypted history event ${event.id}`, {
            decryptedLength: decrypted.length,
            decryptedPreview: decrypted.substring(0, 100) + '...'
          });

          const contentData = JSON.parse(decrypted) as Array<string[]>;

          // Extract data from content
          const entry: SpendingHistoryEntry & { id: string } = {
            id: event.id,
            direction: 'in',
            amount: '0',
            timestamp: event.created_at,
            createdTokens: [],
            destroyedTokens: [],
            redeemedTokens: []
          };

          // Process content data
          for (const item of contentData) {
            const [key, value] = item;
            const marker = item.length >= 4 ? item[3] : undefined;

            if (key === 'direction') {
              entry.direction = value as 'in' | 'out';
            } else if (key === 'amount') {
              entry.amount = value;
            } else if (key === 'e' && marker === 'created') {
              entry.createdTokens?.push(value);
            } else if (key === 'e' && marker === 'destroyed') {
              entry.destroyedTokens?.push(value);
            }
          }

          // Process unencrypted tags
          for (const tag of event.tags) {
            if (tag[0] === 'e' && tag[3] === 'redeemed') {
              entry.redeemedTokens?.push(tag[1]);
            }
          }

          history.push(entry);

          // Add to transaction history store
          transactionHistoryStore.addHistoryEntry(entry);
        } catch (error) {
          console.error('Failed to decrypt history data:', error);
        }
      }

      // Sort by timestamp (newest first)
      return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },
    enabled: !!user && !!user.signer.nip44
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    createHistory: createHistoryMutation
  };
}