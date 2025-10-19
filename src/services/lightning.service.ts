import { BIG_RELAY_URLS, OFFICIAL_PUBKEYS } from '@/constants';
import { getZapInfoFromEvent } from '@/lib/event-metadata';
import {
  launchPaymentModal,
  onConnected,
  onDisconnected
} from '@getalby/bitcoin-connect-react';
import { Invoice } from '@getalby/lightning-tools';
import { bech32 } from '@scure/base';
import { WebLNProvider } from '@/lib/wallet-types';
import dayjs from 'dayjs';
import { Filter, kinds, NostrEvent } from 'nostr-tools';
import { SubCloser } from 'nostr-tools/abstract-pool';
import { makeZapRequest } from 'nostr-tools/nip57';
import { utf8Decoder } from 'nostr-tools/utils';

export type TRecentSupporter = { pubkey: string; amount: number; comment?: string };

interface TProfile {
  pubkey: string;
  lightningAddress?: string;
  lud06?: string;
  lud16?: string;
}

class LightningService {
  static instance: LightningService;
  private provider: WebLNProvider | null = null;
  private recentSupportersCache: TRecentSupporter[] | null = null;

  constructor() {
    if (!LightningService.instance) {
      LightningService.instance = this;
      // Bitcoin Connect is already initialized in main.tsx
      onConnected((provider) => {
        this.provider = provider;
      });
      onDisconnected(() => {
        this.provider = null;
      });
    }
    return LightningService.instance;
  }

  /**
   * Comprehensive NIP-57 zap implementation based on Jumble
   */
  async zap(
    sender: string,
    recipientOrEvent: string | NostrEvent,
    sats: number,
    comment: string,
    nostr: any,
    user: any,
    closeOuterModel?: () => void
  ): Promise<{ preimage: string; invoice: string } | null> {
    // Enhanced signer validation with comprehensive bunker support
    // Check multiple patterns: direct method, prototype chain, wrapper patterns
    const hasSignEvent = user?.signer &&
      (typeof user.signer.signEvent === 'function' ||
       typeof Object.getPrototypeOf(user.signer)?.signEvent === 'function' ||
       (user.signer.bunkerSigner && typeof user.signer.bunkerSigner.signEvent === 'function'));
    
    if (!hasSignEvent) {
      throw new Error('You need to be logged in to zap');
    }

    const { recipient, event } =
      typeof recipientOrEvent === 'string'
        ? { recipient: recipientOrEvent }
        : { recipient: recipientOrEvent.pubkey, event: recipientOrEvent };

    // Fetch profiles and relay lists like Jumble
    const [profile, receiptRelayList, senderRelayList] = await Promise.all([
      this.fetchProfile(recipient, nostr),
      this.fetchRelayList(recipient, nostr),
      sender
        ? this.fetchRelayList(sender, nostr)
        : Promise.resolve({ read: BIG_RELAY_URLS, write: BIG_RELAY_URLS })
    ]);

    if (!profile) {
      throw new Error('Recipient not found');
    }

    const zapEndpoint = await this.getZapEndpoint(profile);
    if (!zapEndpoint) {
      throw new Error("Recipient's lightning address is invalid");
    }

    const { callback, lnurl } = zapEndpoint;
    const amount = sats * 1000;

    // Create NIP-57 zap request exactly like Jumble
    const zapRequestDraft = makeZapRequest({
      ...(event ? { event } : { pubkey: recipient }),
      amount,
      relays: receiptRelayList.read
        .slice(0, 4)
        .concat(senderRelayList.write.slice(0, 3))
        .concat(BIG_RELAY_URLS),
      comment
    });

    const zapRequest = await user.signer.signEvent(zapRequestDraft);

    // Request invoice from LNURL callback
    const zapRequestRes = await fetch(
      `${callback}?amount=${amount}&nostr=${encodeURI(JSON.stringify(zapRequest))}&lnurl=${lnurl}`
    );

    const zapRequestResBody = await zapRequestRes.json();
    if (zapRequestResBody.error) {
      throw new Error(zapRequestResBody.message);
    }

    const { pr, verify } = zapRequestResBody;
    if (!pr) {
      throw new Error('Failed to create invoice');
    }

    // Pay with WebLN if available
    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(pr);
      closeOuterModel?.();
      return { preimage, invoice: pr };
    }

    // Fallback to Bitcoin Connect payment modal like Jumble
    return new Promise((resolve) => {
      closeOuterModel?.();
      let checkPaymentInterval: ReturnType<typeof setInterval> | undefined;
      let subCloser: SubCloser | undefined;

      const { setPaid } = launchPaymentModal({
        invoice: pr,
        onPaid: (response) => {
          clearInterval(checkPaymentInterval);
          subCloser?.close();
          resolve({ preimage: response.preimage, invoice: pr });
        },
        onCancelled: () => {
          clearInterval(checkPaymentInterval);
          subCloser?.close();
          resolve(null);
        }
      });

      // Dual verification like Jumble
      if (verify) {
        checkPaymentInterval = setInterval(async () => {
          try {
            const invoice = new Invoice({ pr, verify });
            const paid = await invoice.verifyPayment();
            if (paid && invoice.preimage) {
              setPaid({ preimage: invoice.preimage });
            }
          } catch (error) {
            // Ignore verification errors
          }
        }, 1000);
      } else {
        // Monitor Nostr for zap receipt
        // Note: This fallback monitoring is best-effort only
        try {
          const filter: Filter = {
            kinds: [kinds.Zap],
            '#p': [recipient],
            since: dayjs().subtract(1, 'minute').unix()
          };

          if (event) {
            filter['#e'] = [event.id];
          }

          // Use Nostrify's req() API for subscription
          const abortController = new AbortController();
          const subscription = nostr.req(
            [filter],
            { signal: abortController.signal }
          );

          // Store closer to abort subscription when payment completes/cancels
          subCloser = {
            close: () => abortController.abort()
          };

          // Process zap receipt events
          (async () => {
            try {
              for await (const msg of subscription) {
                if (msg[0] === 'EVENT') {
                  const evt = msg[2] as NostrEvent;
                  const info = getZapInfoFromEvent(evt);
                  if (!info) continue;

                  if (info.invoice === pr) {
                    setPaid({ preimage: info.preimage ?? '' });
                    abortController.abort();
                    break;
                  }
                }
              }
            } catch (err) {
              // Subscription aborted or errored, ignore
            }
          })();
        } catch (subscribeError) {
          // Ignore subscription errors - payment monitoring will rely on invoice verification
          console.warn('Failed to monitor Nostr for zap receipt:', subscribeError);
        }
      }
    });
  }

  /**
   * Anonymous zap - creates Lightning invoice without Nostr authentication
   * Used for read-only mode where users don't have Nostr identity
   */
  async anonymousZap(
    recipientPubkey: string,
    sats: number,
    nostr: any,
    closeOuterModel?: () => void
  ): Promise<{ preimage: string; invoice: string } | null> {
    // Fetch recipient's profile
    const profile = await this.fetchProfile(recipientPubkey, nostr);
    if (!profile) {
      throw new Error('Recipient not found');
    }

    const zapEndpoint = await this.getZapEndpoint(profile);
    if (!zapEndpoint) {
      throw new Error("Recipient's lightning address is invalid");
    }

    const { callback, lnurl } = zapEndpoint;
    const amount = sats * 1000; // Convert to millisats

    // Request invoice without nostr parameter (anonymous)
    const invoiceRes = await fetch(
      `${callback}?amount=${amount}&lnurl=${lnurl}`
    );

    const invoiceBody = await invoiceRes.json();
    if (invoiceBody.error) {
      throw new Error(invoiceBody.message);
    }

    const { pr, verify } = invoiceBody;
    if (!pr) {
      throw new Error('Failed to create invoice');
    }

    // Pay with WebLN if available
    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(pr);
      closeOuterModel?.();
      return { preimage, invoice: pr };
    }

    // Fallback to Bitcoin Connect payment modal with verification polling
    return new Promise((resolve) => {
      closeOuterModel?.();
      let checkPaymentInterval: ReturnType<typeof setInterval> | undefined;

      const { setPaid } = launchPaymentModal({
        invoice: pr,
        onPaid: (response) => {
          clearInterval(checkPaymentInterval);
          resolve({ preimage: response.preimage, invoice: pr });
        },
        onCancelled: () => {
          clearInterval(checkPaymentInterval);
          resolve(null);
        }
      });

      // Poll for payment verification if verify URL is available
      if (verify) {
        checkPaymentInterval = setInterval(async () => {
          try {
            const invoice = new Invoice({ pr, verify });
            const paid = await invoice.verifyPayment();
            if (paid && invoice.preimage) {
              setPaid({ preimage: invoice.preimage });
            }
          } catch (error) {
            // Ignore verification errors, continue polling
          }
        }, 1000);
      }
    });
  }

  async payInvoice(
    invoice: string,
    closeOuterModel?: () => void
  ): Promise<{ preimage: string; invoice: string } | null> {
    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(invoice);
      closeOuterModel?.();
      return { preimage, invoice: invoice };
    }

    return new Promise((resolve) => {
      closeOuterModel?.();
      launchPaymentModal({
        invoice: invoice,
        onPaid: (response) => {
          resolve({ preimage: response.preimage, invoice: invoice });
        },
        onCancelled: () => {
          resolve(null);
        }
      });
    });
  }

  /**
   * Fetch user profile from Nostr like Jumble
   */
  private async fetchProfile(pubkey: string, nostr: any): Promise<TProfile | null> {
    try {
      const events = await nostr.query([{
        kinds: [kinds.Metadata],
        authors: [pubkey]
      }], { signal: AbortSignal.timeout(5000) });

      if (!events[0]) return null;

      const metadata = JSON.parse(events[0].content);
      return {
        pubkey,
        lightningAddress: metadata.lud16 || metadata.lud06,
        lud06: metadata.lud06,
        lud16: metadata.lud16
      };
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Fetch relay list for a user like Jumble
   */
  private async fetchRelayList(pubkey: string, nostr: any): Promise<{ read: string[]; write: string[] }> {
    try {
      const events = await nostr.query([{
        kinds: [10002], // NIP-65 relay list
        authors: [pubkey]
      }], { signal: AbortSignal.timeout(5000) });

      if (!events[0]) {
        return { read: BIG_RELAY_URLS, write: BIG_RELAY_URLS };
      }

      const read: string[] = [];
      const write: string[] = [];

      events[0].tags.forEach(tag => {
        if (tag[0] === 'r') {
          const url = tag[1];
          const type = tag[2];
          if (!type || type === 'read') read.push(url);
          if (!type || type === 'write') write.push(url);
        }
      });

      return {
        read: read.length > 0 ? read : BIG_RELAY_URLS,
        write: write.length > 0 ? write : BIG_RELAY_URLS
      };
    } catch (error) {
      console.error('Failed to fetch relay list:', error);
      return { read: BIG_RELAY_URLS, write: BIG_RELAY_URLS };
    }
  }

  async fetchRecentSupporters() {
    if (this.recentSupportersCache) {
      return this.recentSupportersCache;
    }
    // Implementation would go here - simplified for now
    this.recentSupportersCache = [];
    return this.recentSupportersCache;
  }

  private async getZapEndpoint(profile: TProfile): Promise<null | {
    callback: string;
    lnurl: string;
  }> {
    try {
      let lnurl: string = '';

      if (!profile.lightningAddress) {
        return null;
      }

      if (profile.lightningAddress.includes('@')) {
        const [name, domain] = profile.lightningAddress.split('@');
        lnurl = new URL(`/.well-known/lnurlp/${name}`, `https://${domain}`).toString();
      } else {
        const { words } = bech32.decode(profile.lightningAddress as any, 1000);
        const data = bech32.fromWords(words);
        lnurl = utf8Decoder.decode(data);
      }

      const res = await fetch(lnurl);
      
      if (!res.ok) {
        throw new Error(`Lightning address server returned ${res.status}`);
      }
      
      const body = await res.json();

      if (body.allowsNostr && body.nostrPubkey) {
        return {
          callback: body.callback,
          lnurl
        };
      }
    } catch (err) {
      console.error('Failed to fetch zap endpoint:', err);
      throw new Error('Unable to connect to Lightning address. Please check your internet connection.');
    }

    return null;
  }
}

const instance = new LightningService();
export default instance;