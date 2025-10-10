/**
 * NIP-42 Authentication Service
 * 
 * Handles relay authentication challenges and state management.
 * Based on Jumble's implementation pattern for NIP-42 AUTH.
 * 
 * NIP-42: Authentication of clients to relays
 * https://github.com/nostr-protocol/nips/blob/master/42.md
 */

import type { Event as NostrEvent, EventTemplate } from 'nostr-tools';

/**
 * Stored authentication challenge from a relay
 */
interface AuthChallenge {
  /** Relay URL that sent the challenge */
  relay: string;
  /** Challenge string to sign */
  challenge: string;
  /** Timestamp when challenge was received */
  timestamp: number;
}

/**
 * Authentication state for a relay
 */
interface AuthState {
  /** Whether client is currently authenticated with this relay */
  authenticated: boolean;
  /** Timestamp of last authentication attempt */
  lastAttempt?: number;
  /** Number of authentication attempts made */
  attempts: number;
}

/**
 * Signer interface compatible with Nostr signers
 */
interface Signer {
  signEvent(event: EventTemplate): Promise<NostrEvent>;
}

/**
 * NIP-42 Authentication Service
 * Singleton pattern for app-wide AUTH state coordination
 */
class NIP42AuthService {
  private static instance: NIP42AuthService;
  
  /** Map of relay URL to current authentication challenge */
  private authChallenges: Map<string, AuthChallenge> = new Map();
  
  /** Map of relay URL to authentication state */
  private authStates: Map<string, AuthState> = new Map();
  
  /** Maximum number of retry attempts per relay */
  private readonly maxRetries = 3;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): NIP42AuthService {
    if (!NIP42AuthService.instance) {
      NIP42AuthService.instance = new NIP42AuthService();
    }
    return NIP42AuthService.instance;
  }
  
  /**
   * Create a kind 22242 AUTH event for relay authentication
   * 
   * Following Jumble's pattern, this creates the signed AUTH event
   * that gets sent back to the relay in response to an AUTH challenge.
   * 
   * @param challenge - Challenge string from relay
   * @param relayUrl - URL of the relay requiring auth
   * @param signer - Signer to sign the event
   * @returns Signed AUTH event
   */
  async createAuthEvent(
    challenge: string,
    relayUrl: string,
    signer: Signer
  ): Promise<NostrEvent> {
    const eventTemplate: EventTemplate = {
      kind: 22242, // NIP-42 AUTH event kind
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['relay', relayUrl],
        ['challenge', challenge],
      ],
      content: '',
    };
    
    // Sign the event
    const signedEvent = await signer.signEvent(eventTemplate);
    
    // Store the challenge
    this.authChallenges.set(relayUrl, {
      relay: relayUrl,
      challenge,
      timestamp: Date.now(),
    });
    
    return signedEvent;
  }
  
  /**
   * Check if client is authenticated with a relay
   * 
   * @param relayUrl - Relay URL to check
   * @returns True if authenticated
   */
  isAuthenticated(relayUrl: string): boolean {
    const state = this.authStates.get(relayUrl);
    return state?.authenticated ?? false;
  }
  
  /**
   * Get stored challenge for a relay
   * 
   * @param relayUrl - Relay URL
   * @returns Challenge data or undefined
   */
  getChallenge(relayUrl: string): AuthChallenge | undefined {
    return this.authChallenges.get(relayUrl);
  }
  
  /**
   * Mark that a relay requires authentication
   * Called when receiving an 'auth-required' error
   * 
   * @param relayUrl - Relay URL requiring auth
   */
  markAuthRequired(relayUrl: string): void {
    const currentState = this.authStates.get(relayUrl);
    const attempts = currentState?.attempts ?? 0;
    
    this.authStates.set(relayUrl, {
      authenticated: false,
      lastAttempt: Date.now(),
      attempts: attempts + 1,
    });
  }
  
  /**
   * Mark that authentication with a relay succeeded
   * 
   * @param relayUrl - Relay URL
   */
  markAuthenticated(relayUrl: string): void {
    this.authStates.set(relayUrl, {
      authenticated: true,
      lastAttempt: Date.now(),
      attempts: 0,
    });
  }
  
  /**
   * Check if we should retry authentication with a relay
   * 
   * @param relayUrl - Relay URL
   * @returns True if retry is allowed
   */
  canRetryAuth(relayUrl: string): boolean {
    const state = this.authStates.get(relayUrl);
    if (!state) return true;
    
    return state.attempts < this.maxRetries;
  }
  
  /**
   * Clear authentication state for a relay
   * Useful for testing or when relay connection is reset
   * 
   * @param relayUrl - Relay URL
   */
  clearAuthState(relayUrl: string): void {
    this.authChallenges.delete(relayUrl);
    this.authStates.delete(relayUrl);
  }
  
  /**
   * Get all authentication states
   * Useful for debugging and monitoring
   * 
   * @returns Map of relay URLs to auth states
   */
  getAuthStates(): Map<string, AuthState> {
    return new Map(this.authStates);
  }
  
  /**
   * Clean up old challenges (older than 5 minutes)
   * Prevents memory leaks from stale challenges
   */
  cleanupOldChallenges(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    for (const [relayUrl, challenge] of this.authChallenges.entries()) {
      if (challenge.timestamp < fiveMinutesAgo) {
        this.authChallenges.delete(relayUrl);
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const nip42AuthService = NIP42AuthService.getInstance();

/**
 * Export types
 */
export type { AuthChallenge, AuthState, Signer };
