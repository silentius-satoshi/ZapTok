import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { getLNURLPayEndpoint, createZapRequest, corsAwareFetch } from './lightning';

export interface ZapTarget {
  pubkey: string;
}

/**
 * Zap a note/event
 */
export async function zapNote(
  note: NostrEvent,
  senderPubkey: string,
  amount: number,
  comment: string = '',
  recipientMetadata?: NostrMetadata,
  sendPayment?: (invoice: string) => Promise<{ preimage: string; walletType: string }>
): Promise<boolean> {
    if (import.meta.env.DEV) {
    console.log('⚡ Starting zap process:', {
      targetEvent: note?.id,
      senderPubkey,
      amount,
      comment
    });
    }

  try {
    // Check if we have a payment method
    if (!sendPayment) {
      if (import.meta.env.DEV) {
      console.log('❌ No payment method provided');
      }
      return false;
    }

    // Get the Lightning address from metadata
    const lightningAddress = recipientMetadata?.lud16 || recipientMetadata?.lud06;
    if (!lightningAddress) {
    if (import.meta.env.DEV) {
      console.log('❌ No Lightning address found in metadata');
    }
      return false;
    }

    if (import.meta.env.DEV) {
    console.log('🎯 Using Lightning address:', lightningAddress);
    }

    // Get the LNURL-pay endpoint
    const zapEndpoint = await getLNURLPayEndpoint(lightningAddress);
    if (!zapEndpoint) {
    if (import.meta.env.DEV) {
      console.log('❌ Failed to get zap endpoint');
    }
      return false;
    }

    if (import.meta.env.DEV) {
    console.log('📡 Using zap endpoint:', zapEndpoint);
    }

    // Create the zap request
    const zapRequest = createZapRequest(note.pubkey, amount, comment, note.id);
    if (import.meta.env.DEV) {
    console.log('📝 Created zap request:', zapRequest);
    }

    // Prepare the payment request
    const requestPayload = {
      amount: amount * 1000, // Convert to millisats
      nostr: JSON.stringify(zapRequest),
      ...(comment && { comment }),
    };

    if (import.meta.env.DEV) {
    console.log('💳 Requesting invoice with payload:', requestPayload);
    }

    // Request invoice from the Lightning service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await corsAwareFetch(zapEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Invoice request failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    if (import.meta.env.DEV) {
    console.log('💰 Invoice response:', data);
    }

    const invoice = data.pr;
    if (!invoice) {
      console.error('❌ No invoice in response');
      return false;
    }

    if (import.meta.env.DEV) {
    console.log('📄 Got invoice, sending to wallet...');
    }

    // Send payment using the provided sendPayment function (Alby, etc.)
    const paymentResult = await sendPayment(invoice);
    if (import.meta.env.DEV) {
    console.log('✅ Payment successful:', paymentResult);
    }

    // If we get here, the payment was successful
    return true;

  } catch (error) {
    console.error('💥 Zap failed:', error);
    return false;
  }
}

/**
 * Zap a user profile
 */
export async function zapProfile(
  profile: ZapTarget,
  senderPubkey: string,
  amount: number,
  comment: string = ''
): Promise<boolean> {
  if (import.meta.env.DEV) {
  console.log('🚨 zapProfile called - this should not happen!', {
    recipient: profile.pubkey,
    sender: senderPubkey,
    amount,
    comment
  });
  }

  try {
    // Create a mock event for profile zapping
    const mockEvent: NostrEvent = {
      id: 'profile-zap',
      pubkey: profile.pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: '',
      sig: ''
    };
    
    // Use the zapNote function for actual implementation
    return await zapNote(mockEvent, senderPubkey, amount, comment);
  } catch (error) {
    console.error('Failed to zap profile:', error);
    return false;
  }
}

/**
 * Check if a user can receive zaps
 */
export function canUserReceiveZaps(userMetadata?: any): boolean {
  return !!(userMetadata?.lud16 || userMetadata?.lud06);
}

/**
 * Get Lightning address from user metadata
 */
export function getLightningAddress(userMetadata?: any): string | null {
  return userMetadata?.lud16 || userMetadata?.lud06 || null;
}
