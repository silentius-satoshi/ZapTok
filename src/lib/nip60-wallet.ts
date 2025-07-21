// NIP-60 Cashu wallet implementation
// Manages Cashu wallets using Nostr events with NIP-44 encryption

import type { NostrEvent } from '@nostrify/nostrify';
import type { NUser } from '@nostrify/react/login';
import { generateSecretKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

import {
  NIP60_KINDS,
  type WalletEventContent,
  type TokenEventContent,
  type HistoryEventContent,
  type QuoteEventContent,
  type NIP60Wallet,
  type TokenSpendResult,
  type TokenReceiveResult,
  type Proof,
  validateWalletEvent,
  validateTokenEvent,
  validateHistoryEvent,
  calculateTokenBalance,
  createTokenSpendTransaction
} from './nip60-types';

export interface NostrInterface {
  query(filters: object[], options?: object): Promise<NostrEvent[]>;
  event(event: object): Promise<NostrEvent>;
}

export class NIP60WalletManager {
  private user: NUser;
  private nostr: NostrInterface;

  constructor(user: NUser, nostr: NostrInterface) {
    this.user = user;
    this.nostr = nostr;
  }

  /**
   * Create a new NIP-60 Cashu wallet
   */
  async createWallet(mints: string[]): Promise<string> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    // Generate a new P2PK private key for receiving nutzaps
    const privkey = bytesToHex(generateSecretKey());

    const walletContent: WalletEventContent = {
      privkey,
      mint: mints
    };

    // Validate wallet content
    if (!validateWalletEvent(walletContent)) {
      throw new Error('Invalid wallet configuration');
    }

    // Encrypt content using NIP-44
    const encryptedContent = await this.user.signer.nip44.encrypt(
      this.user.pubkey,
      JSON.stringify(walletContent)
    );

    const walletEvent = {
      kind: NIP60_KINDS.WALLET,
      content: encryptedContent,
      tags: mints.map(mint => ['mint', mint]),
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedEvent = await this.user.signer.signEvent(walletEvent);
    await this.nostr.event(signedEvent);

    return signedEvent.id;
  }

  /**
   * Fetch all wallets for the current user
   */
  async getWallets(): Promise<NIP60Wallet[]> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    // Add timeout to prevent hanging queries
    const queryWithTimeout = async (filters: object[]) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
      );

      const queryPromise = this.nostr.query(filters);
      return Promise.race([queryPromise, timeoutPromise]) as Promise<NostrEvent[]>;
    };

    try {
      // Fetch wallet events
      const walletEvents = await queryWithTimeout([
        {
          kinds: [NIP60_KINDS.WALLET],
          authors: [this.user.pubkey]
        }
      ]);

      // Fetch token and history events
      const [tokenEvents, historyEvents] = await Promise.all([
        queryWithTimeout([
          {
            kinds: [NIP60_KINDS.TOKEN],
            authors: [this.user.pubkey]
          }
        ]),
        queryWithTimeout([
          {
            kinds: [NIP60_KINDS.HISTORY],
            authors: [this.user.pubkey]
          }
        ])
      ]);

      const wallets: NIP60Wallet[] = [];

      for (const walletEvent of walletEvents) {
        try {
          // Decrypt wallet content
          const decryptedContent = await this.user.signer.nip44.decrypt(
            this.user.pubkey,
            walletEvent.content
          );

          const walletContent: WalletEventContent = JSON.parse(decryptedContent);

          if (!validateWalletEvent(walletContent)) {
            console.warn('Invalid wallet event content, skipping:', walletEvent.id);
            continue;
          }

          // Get current tokens (unspent proofs)
          const currentTokens = await this.getCurrentTokens(tokenEvents);

          // Get transaction history
          const history = await this.getTransactionHistory(historyEvents);

          const wallet: NIP60Wallet = {
            id: walletEvent.id,
            privkey: walletContent.privkey,
            mints: walletContent.mint,
            tokens: currentTokens,
            history,
            balance: calculateTokenBalance(currentTokens),
            lastUpdated: walletEvent.created_at * 1000
          };

          wallets.push(wallet);
        } catch (error) {
          console.error('Failed to decrypt wallet event:', walletEvent.id, error);
          continue;
        }
      }

      return wallets;
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      // Return empty array instead of throwing to prevent infinite loading
      return [];
    }
  }

  /**
   * Add tokens to wallet (receiving)
   */
  async receiveTokens(proofs: Proof[], mintUrl: string): Promise<TokenReceiveResult> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    const tokenContent: TokenEventContent = {
      mint: mintUrl,
      proofs
    };

    if (!validateTokenEvent(tokenContent)) {
      throw new Error('Invalid token content');
    }

    // Create token event
    const encryptedTokenContent = await this.user.signer.nip44.encrypt(
      this.user.pubkey,
      JSON.stringify(tokenContent)
    );

    const tokenEvent = {
      kind: NIP60_KINDS.TOKEN,
      content: encryptedTokenContent,
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedTokenEvent = await this.user.signer.signEvent(tokenEvent);

    // Create history event
    const totalAmount = proofs.reduce((sum: number, proof: Proof) => sum + proof.amount, 0);
    const historyContent: HistoryEventContent = {
      direction: 'in',
      amount: totalAmount.toString(),
      e: [['e', signedTokenEvent.id, '', 'created']]
    };

    const encryptedHistoryContent = await this.user.signer.nip44.encrypt(
      this.user.pubkey,
      JSON.stringify(historyContent)
    );

    const historyEvent = {
      kind: NIP60_KINDS.HISTORY,
      content: encryptedHistoryContent,
      tags: [['e', signedTokenEvent.id, '', 'created']],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedHistoryEvent = await this.user.signer.signEvent(historyEvent);

    // Publish events
    await Promise.all([
      this.nostr.event(signedTokenEvent),
      this.nostr.event(signedHistoryEvent)
    ]);

    return {
      tokenEvent: tokenContent,
      historyEvent: historyContent
    };
  }

  /**
   * Spend tokens from wallet
   */
  async spendTokens(
    amount: number,
    mintUrl: string,
    originalTokenEventIds: string[]
  ): Promise<TokenSpendResult> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    // Get current tokens for the mint
    const tokenEvents = await this.nostr.query([
      {
        kinds: [NIP60_KINDS.TOKEN],
        authors: [this.user.pubkey],
        ids: originalTokenEventIds
      }
    ]);

    const currentTokens: TokenEventContent[] = [];
    for (const event of tokenEvents) {
      try {
        const decryptedContent = await this.user.signer.nip44.decrypt(
          this.user.pubkey,
          event.content
        );
        const tokenContent: TokenEventContent = JSON.parse(decryptedContent);
        if (validateTokenEvent(tokenContent) && tokenContent.mint === mintUrl) {
          currentTokens.push(tokenContent);
        }
      } catch (error) {
        console.error('Failed to decrypt token event:', event.id, error);
      }
    }

    // Create spend transaction
    const spendResult = createTokenSpendTransaction(
      currentTokens,
      amount,
      mintUrl,
      originalTokenEventIds
    );

    // Delete old token events
    for (const tokenId of spendResult.deletedTokenIds) {
      const deleteEvent = {
        kind: 5, // NIP-09 delete event
        content: '',
        tags: [
          ['e', tokenId],
          ['k', NIP60_KINDS.TOKEN.toString()]
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedDeleteEvent = await this.user.signer.signEvent(deleteEvent);
      await this.nostr.event(signedDeleteEvent);
    }

    // Create new token event if there are remaining proofs
    if (spendResult.newTokenEvent.proofs.length > 0) {
      const encryptedTokenContent = await this.user.signer.nip44.encrypt(
        this.user.pubkey,
        JSON.stringify(spendResult.newTokenEvent)
      );

      const newTokenEvent = {
        kind: NIP60_KINDS.TOKEN,
        content: encryptedTokenContent,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedNewTokenEvent = await this.user.signer.signEvent(newTokenEvent);
      await this.nostr.event(signedNewTokenEvent);

      // Update history event with new token reference
      spendResult.historyEvent.e = [
        ...spendResult.deletedTokenIds.map(id => ['e', id, '', 'destroyed']),
        ['e', signedNewTokenEvent.id, '', 'created']
      ];
    } else {
      // Only destroyed events
      spendResult.historyEvent.e = spendResult.deletedTokenIds.map(id => ['e', id, '', 'destroyed']);
    }

    // Create history event
    const encryptedHistoryContent = await this.user.signer.nip44.encrypt(
      this.user.pubkey,
      JSON.stringify(spendResult.historyEvent)
    );

    const historyEvent = {
      kind: NIP60_KINDS.HISTORY,
      content: encryptedHistoryContent,
      tags: spendResult.historyEvent.e || [],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedHistoryEvent = await this.user.signer.signEvent(historyEvent);
    await this.nostr.event(signedHistoryEvent);

    return spendResult;
  }

  /**
   * Create a quote tracking event (optional)
   */
  async createQuote(quoteId: string, mintUrl: string, expirationTimestamp: number): Promise<string> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    const quoteContent: QuoteEventContent = {
      quote: quoteId
    };

    const encryptedContent = await this.user.signer.nip44.encrypt(
      this.user.pubkey,
      JSON.stringify(quoteContent)
    );

    const quoteEvent = {
      kind: NIP60_KINDS.QUOTE,
      content: encryptedContent,
      tags: [
        ['expiration', expirationTimestamp.toString()],
        ['mint', mintUrl]
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedEvent = await this.user.signer.signEvent(quoteEvent);
    await this.nostr.event(signedEvent);

    return signedEvent.id;
  }

  /**
   * Get current unspent tokens from token events
   */
  private async getCurrentTokens(tokenEvents: NostrEvent[]): Promise<TokenEventContent[]> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    // Get all delete events to filter out spent tokens
    const deleteEvents = await this.nostr.query([
      {
        kinds: [5], // NIP-09 delete events
        authors: [this.user.pubkey],
        '#k': [NIP60_KINDS.TOKEN.toString()]
      }
    ]);

    const deletedEventIds = new Set(
      deleteEvents.flatMap(event =>
        event.tags.filter(tag => tag[0] === 'e').map(tag => tag[1])
      )
    );

    const currentTokens: TokenEventContent[] = [];

    for (const event of tokenEvents) {
      // Skip deleted events
      if (deletedEventIds.has(event.id)) {
        continue;
      }

      try {
        const decryptedContent = await this.user.signer.nip44.decrypt(
          this.user.pubkey,
          event.content
        );

        const tokenContent: TokenEventContent = JSON.parse(decryptedContent);

        if (validateTokenEvent(tokenContent)) {
          currentTokens.push(tokenContent);
        }
      } catch (error) {
        console.error('Failed to decrypt token event:', event.id, error);
      }
    }

    return currentTokens;
  }

  /**
   * Get transaction history from history events
   */
  private async getTransactionHistory(historyEvents: NostrEvent[]): Promise<HistoryEventContent[]> {
    if (!this.user.signer.nip44) {
      throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
    }

    const history: HistoryEventContent[] = [];

    for (const event of historyEvents) {
      try {
        const decryptedContent = await this.user.signer.nip44.decrypt(
          this.user.pubkey,
          event.content
        );

        const historyContent: HistoryEventContent = JSON.parse(decryptedContent);

        if (validateHistoryEvent(historyContent)) {
          history.push(historyContent);
        }
      } catch (error) {
        console.error('Failed to decrypt history event:', event.id, error);
      }
    }

    return history.sort((_a, _b) => {
      // Sort by timestamp if available, otherwise by amount/direction
      return 0; // Simple sorting - could be enhanced with timestamp from event
    });
  }
}
