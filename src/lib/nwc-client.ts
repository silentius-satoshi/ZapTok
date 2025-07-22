// Core NWC client implementation
// Handles encrypted communication with NWC wallet services via Nostr

import { NostrEvent } from '@nostrify/nostrify';
import { nip04, getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { 
  NWCConnectionURI, 
  NWCRequest, 
  NWCResponse, 
  NWCNotification,
  NWC_KINDS,
  PayInvoiceParams,
  PayInvoiceResult,
  MakeInvoiceParams,
  MakeInvoiceResult,
  GetBalanceResult,
  GetInfoResult,
  ListTransactionsParams,
  ListTransactionsResult
} from './nwc-types';

export interface NostrInterface {
  query(filters: Array<Record<string, unknown>>, opts?: { signal?: AbortSignal }): Promise<NostrEvent[]>;
  event(event: Partial<NostrEvent>): Promise<NostrEvent>;
}

// Adapter to convert Nostrify NPool to our NostrInterface
export function createNostrAdapter(nostr: { 
  query: (filters: Array<Record<string, unknown>>, opts?: { signal?: AbortSignal }) => Promise<NostrEvent[]>;
  event: (event: Partial<NostrEvent>) => Promise<NostrEvent>;
}): NostrInterface {
  return {
    async query(filters: Array<Record<string, unknown>>, opts?: { signal?: AbortSignal }): Promise<NostrEvent[]> {
      return await nostr.query(filters, opts);
    },
    
    async event(event: Partial<NostrEvent>): Promise<NostrEvent> {
      // Nostrify's event method returns void, but we need the event back
      // So we'll create the event with a proper ID and signature first
      const completeEvent = {
        ...event,
        id: '', // This will be set by Nostrify
        sig: '', // This will be set by Nostrify
      } as NostrEvent;
      
      await nostr.event(completeEvent);
      return completeEvent;
    }
  };
}

export class NWCClient {
  private connection: NWCConnectionURI;
  private nostr: NostrInterface;
  private clientSecretKey: string;
  private clientPubkey: string;

  constructor(connection: NWCConnectionURI, nostr: NostrInterface) {
    this.connection = connection;
    this.nostr = nostr;
    this.clientSecretKey = connection.secret;
    // Convert hex string to Uint8Array using @noble/hashes
    this.clientPubkey = getPublicKey(hexToBytes(connection.secret));
  }

  /**
   * Get wallet service info and capabilities
   */
  async getInfo(timeout = 10000): Promise<GetInfoResult> {
    // First, check for the info event (kind 13194)
    const signal = AbortSignal.timeout(timeout);
    
    const infoEvents = await this.nostr.query([{
      kinds: [NWC_KINDS.INFO],
      authors: [this.connection.walletPubkey],
      limit: 1
    }], { signal });

    if (infoEvents.length === 0) {
      throw new Error('Wallet service info not found');
    }

    const infoEvent = infoEvents[0];
    const _capabilities = infoEvent.content.split(' ');
    
    const notificationTag = infoEvent.tags.find(tag => tag[0] === 'notifications');
    const _notifications = notificationTag ? notificationTag[1]?.split(' ') : undefined;

    // Now make a get_info request to get detailed wallet info
    return this.sendRequest<GetInfoResult>('get_info', {});
  }

  /**
   * Pay a Lightning invoice
   */
  async payInvoice(params: PayInvoiceParams): Promise<PayInvoiceResult> {
    return this.sendRequest<PayInvoiceResult>('pay_invoice', params);
  }

  /**
   * Create a Lightning invoice
   */
  async makeInvoice(params: MakeInvoiceParams): Promise<MakeInvoiceResult> {
    return this.sendRequest<MakeInvoiceResult>('make_invoice', params);
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<GetBalanceResult> {
    return this.sendRequest<GetBalanceResult>('get_balance', {});
  }

  /**
   * List wallet transactions
   */
  async listTransactions(params: ListTransactionsParams = {}): Promise<ListTransactionsResult> {
    return this.sendRequest<ListTransactionsResult>('list_transactions', params);
  }

  /**
   * Send a generic NWC request
   */
  private async sendRequest<T>(method: string, params: unknown, timeout = 30000): Promise<T> {
    const request: NWCRequest = {
      method,
      params: params as Record<string, unknown>,
    };

    // Encrypt the request
    const encryptedContent = await nip04.encrypt(
      this.clientSecretKey,
      this.connection.walletPubkey,
      JSON.stringify(request)
    );

    // Create the request event
    const requestEvent = await this.nostr.event({
      kind: NWC_KINDS.REQUEST,
      content: encryptedContent,
      tags: [
        ['p', this.connection.walletPubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
    });

    // Wait for response
    const signal = AbortSignal.timeout(timeout);
    
    return new Promise<T>((resolve, reject) => {
      let responseReceived = false;
      
      const checkForResponse = async () => {
        try {
          const responses = await this.nostr.query([{
            kinds: [NWC_KINDS.RESPONSE],
            authors: [this.connection.walletPubkey],
            '#p': [this.clientPubkey],
            '#e': [requestEvent.id],
            since: requestEvent.created_at,
            limit: 1
          }], { signal });

          if (responses.length > 0) {
            responseReceived = true;
            
            const response = responses[0];
            
            // Decrypt the response
            const decryptedContent = await nip04.decrypt(
              this.clientSecretKey,
              this.connection.walletPubkey,
              response.content
            );
            
            const nwcResponse: NWCResponse = JSON.parse(decryptedContent);
            
            if (nwcResponse.error) {
              reject(new Error(`${nwcResponse.error.code}: ${nwcResponse.error.message}`));
            } else if (nwcResponse.result) {
              resolve(nwcResponse.result as T);
            } else {
              reject(new Error('Invalid response from wallet service'));
            }
          } else if (!signal.aborted) {
            // Continue polling
            setTimeout(checkForResponse, 1000);
          }
        } catch (error) {
          if (!responseReceived) {
            reject(error);
          }
        }
      };

      // Handle timeout
      signal.addEventListener('abort', () => {
        if (!responseReceived) {
          reject(new Error('Request timeout'));
        }
      });

      // Start polling for response
      checkForResponse();
    });
  }

  /**
   * Listen for notifications from the wallet service
   */
  async *listenForNotifications(signal?: AbortSignal): AsyncIterable<NWCNotification> {
    const startTime = Math.floor(Date.now() / 1000);
    let lastCheck = startTime;
    
    while (!signal?.aborted) {
      try {
        const notifications = await this.nostr.query([{
          kinds: [NWC_KINDS.NOTIFICATION],
          authors: [this.connection.walletPubkey],
          '#p': [this.clientPubkey],
          since: lastCheck,
        }], { signal });

        for (const notification of notifications) {
          try {
            const decryptedContent = await nip04.decrypt(
              this.clientSecretKey,
              this.connection.walletPubkey,
              notification.content
            );
            
            const nwcNotification: NWCNotification = JSON.parse(decryptedContent);
            yield nwcNotification;
          } catch (error) {
            console.error('Failed to decrypt notification:', error);
          }
        }

        lastCheck = Math.floor(Date.now() / 1000);
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('Error polling for notifications:', error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  /**
   * Test the connection by getting wallet info
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getInfo(5000);
      return true;
    } catch {
      return false;
    }
  }
}
