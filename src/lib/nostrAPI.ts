import { nip04, nip44, nip19, utils } from "./nTools";

// Queue for sequential operations
class Queue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
      }
    }

    this.processing = false;
  }
}

const queue = new Queue();

// Core signing function
export const signEvent = async (event: any): Promise<any> => {
  return queue.add(async () => {
    if (window.nostr) {
      return await window.nostr.signEvent(event);
    }
    throw new Error('Nostr extension not available');
  });
};

// Get public key
export const getPublicKey = async (): Promise<string> => {
  return queue.add(async () => {
    if (window.nostr) {
      return await window.nostr.getPublicKey();
    }
    throw new Error('Nostr extension not available');
  });
};

// NIP-04 encryption/decryption
export const encrypt = async (pubkey: string, plaintext: string): Promise<string> => {
  return queue.add(async () => {
    if (window.nostr?.nip04?.encrypt) {
      return await window.nostr.nip04.encrypt(pubkey, plaintext);
    }
    throw new Error('NIP-04 encryption not available');
  });
};

export const decrypt = async (pubkey: string, ciphertext: string): Promise<string> => {
  return queue.add(async () => {
    if (window.nostr?.nip04?.decrypt) {
      return await window.nostr.nip04.decrypt(pubkey, ciphertext);
    }
    throw new Error('NIP-04 decryption not available');
  });
};

// NIP-44 encryption/decryption
export const encrypt44 = async (pubkey: string, plaintext: string): Promise<string> => {
  return queue.add(async () => {
    if (window.nostr?.nip44?.encrypt) {
      return await window.nostr.nip44.encrypt(pubkey, plaintext);
    }
    throw new Error('NIP-44 encryption not available');
  });
};

export const decrypt44 = async (pubkey: string, ciphertext: string): Promise<string> => {
  return queue.add(async () => {
    if (window.nostr?.nip44?.decrypt) {
      return await window.nostr.nip44.decrypt(pubkey, ciphertext);
    }
    throw new Error('NIP-44 decryption not available');
  });
};

// WebLN functions
export const enableWebLn = async (): Promise<void> => {
  if (window.webln) {
    // Check if Bitcoin Connect is active and use its provider directly
    const bitcoinConnectActive = (window as any).__bitcoinConnectActive;
    const bitcoinConnectWebLN = (window as any).__bitcoinConnectWebLN;
    console.log('[nostrAPI] Checking Bitcoin Connect status:', bitcoinConnectActive);
    
    if (bitcoinConnectActive) {
      console.log('[nostrAPI] Bitcoin Connect is active, enabling its provider directly');
      // For Bitcoin Connect, we need to enable its provider directly to avoid extension conflicts
      if (bitcoinConnectWebLN) {
        await bitcoinConnectWebLN.enable();
      } else {
        await window.webln.enable();
      }
    } else {
      // For browser extensions, check if previously rejected to avoid conflicts
      const isAlbyRejected = (window.webln as any).__albyRejected;
      if (!isAlbyRejected) {
        console.log('[nostrAPI] Calling webln.enable() for browser extension');
        await window.webln.enable();
      } else {
        console.log('[nostrAPI] Skipping webln.enable() - browser extension previously rejected');
      }
    }
  } else {
    throw new Error('WebLN not available');
  }
};

export const sendPayment = async (paymentRequest: string): Promise<any> => {
  if (window.webln) {
    return await window.webln.sendPayment(paymentRequest);
  }
  throw new Error('WebLN not available');
};

// Wrapper functions for sequential execution
export const enqueueNostr = async <T>(fn: () => Promise<T>): Promise<T> => {
  return queue.add(fn);
};

export const enqueueWebLn = async <T>(fn: () => Promise<T>): Promise<T> => {
  return queue.add(fn);
};

// Type declarations for global objects
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<any>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
      nip44?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}