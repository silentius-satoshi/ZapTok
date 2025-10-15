import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { signEvent, getPublicKey, encrypt, decrypt } from './nostrAPI';
import { sendMessage, subsTo } from '../sockets';
import { logInfo, logWarning, logError } from './logger';

/**
 * Generate a UUID v4
 */
export function uuidv4(): string {
  return crypto.randomUUID();
}

/**
 * Calculate SHA-256 hash of a file
 */
export async function sha256File(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hash = sha256(new Uint8Array(arrayBuffer));
  return bytesToHex(hash);
}

/**
 * Encode authorization header for Blossom
 */
export function encodeAuthorizationHeader(auth: { kind: number; tags: string[][]; content: string; created_at: number; pubkey: string; id: string; sig: string }): string {
  const authString = `Nostr ${btoa(JSON.stringify(auth))}`;
  return authString;
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Check if a Blossom server is available
 */
export async function checkBlossomServer(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'HEAD',
      timeout: 3000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Constants from Primal
 */
export const primalBlossom = 'https://blossom.primal.net/';

/**
 * Default Blossom servers for file uploads
 * Ordered by reliability and performance
 */
export const BLOSSOM_SERVERS = [
  'https://blossom.band/',
  'https://nostr.download/',
  'https://blossom.primal.net/',
  'https://nostr.media/'
];

// Export as DEFAULT_BLOSSOM_SERVERS for compatibility
export const DEFAULT_BLOSSOM_SERVERS = BLOSSOM_SERVERS;

export const uploadLimit = {
  regular: 10,
  premium: 50,
  premiumLegend: 100,
};
