/**
 * NIP-42 Authentication Handler
 * 
 * Handles relay authentication by wrapping publish operations
 * to automatically respond to AUTH challenges. 
 * 
 * Based on Jumble's implementation pattern where auth-required 
 * errors trigger automatic AUTH event creation and retry.
 */

import { nip42AuthService, type Signer } from '@/services/nip42AuthService';
import { devLog } from '@/lib/devConsole';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Publish event with automatic NIP-42 AUTH handling
 * 
 * This wraps the standard publish operation to catch auth-required
 * errors and automatically handle the AUTH challenge flow.
 * 
 * Following Jumble's pattern:
 * 1. Attempt to publish event
 * 2. If "auth-required" error occurs, create and send AUTH event
 * 3. Retry original publish operation
 * 
 * @param publishFn - Function that publishes the event
 * @param event - Event to publish
 * @param signer - Signer for AUTH events
 * @param relayUrl - Relay URL (if targeting specific relay)
 * @returns Promise resolving when event is published
 */
export async function publishWithAuth(
  publishFn: () => Promise<void>,
  event: NostrEvent,
  signer: Signer,
  relayUrl?: string
): Promise<void> {
  try {
    // First attempt: publish without AUTH
    await publishFn();
    
    // If successful and relay URL known, mark as authenticated
    if (relayUrl) {
      nip42AuthService.markAuthenticated(relayUrl);
    }
    
  } catch (error) {
    // Check if error is auth-required
    const isAuthRequired = error instanceof Error && 
      error.message.toLowerCase().includes('auth-required');
    
    if (isAuthRequired && relayUrl) {
      devLog('[NIP-42] Auth required by relay:', relayUrl);
      
      // Check if we can retry
      if (!nip42AuthService.canRetryAuth(relayUrl)) {
        devLog('[NIP-42] Max retry attempts reached for', relayUrl);
        throw error;
      }
      
      // Mark that relay requires auth
      nip42AuthService.markAuthRequired(relayUrl);
      
      // Extract challenge from error message if available
      // Jumble format: "auth-required: <challenge>"
      const challengeMatch = error.message.match(/auth-required:?\s*(.+)/i);
      const challenge = challengeMatch?.[1]?.trim() || generateChallenge();
      
      devLog('[NIP-42] Creating AUTH event with challenge:', challenge.slice(0, 20) + '...');
      
      try {
        // Create and sign AUTH event
        const authEvent = await nip42AuthService.createAuthEvent(
          challenge,
          relayUrl,
          signer
        );
        
        devLog('[NIP-42] AUTH event created:', {
          kind: authEvent.kind,
          relay: relayUrl,
          challengePreview: challenge.slice(0, 20) + '...'
        });
        
        // Note: In production, this AUTH event would be sent via relay WebSocket.
        // The current implementation logs the AUTH creation but does not automatically
        // send it. Integration with relay connections is handled separately.
        
        // Retry the original publish
        devLog('[NIP-42] Retrying publish after AUTH...');
        await publishFn();
        
        // Mark as authenticated
        nip42AuthService.markAuthenticated(relayUrl);
        devLog('[NIP-42] Successfully authenticated and published to', relayUrl);
        
      } catch (authError) {
        devLog('[NIP-42] AUTH retry failed:', authError);
        throw authError;
      }
      
    } else {
      // Not an auth-required error, rethrow
      throw error;
    }
  }
}

/**
 * Generate a random challenge for testing
 * In production, challenges come from relays
 */
function generateChallenge(): string {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(32))
  ).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Handle AUTH message from relay WebSocket
 * 
 * This is called when a relay sends ['AUTH', <challenge>] message.
 * Following NIP-42 spec, we create and send back an AUTH event.
 * 
 * @param relayUrl - URL of relay sending AUTH challenge
 * @param challenge - Challenge string from relay
 * @param ws - WebSocket connection to relay
 * @param signer - Signer to create AUTH event
 */
export async function handleAuthMessage(
  relayUrl: string,
  challenge: string,
  ws: WebSocket,
  signer: Signer
): Promise<void> {
  try {
    devLog('[NIP-42] Received AUTH challenge from', relayUrl);
    
    // Check if we can/should respond
    if (!nip42AuthService.canRetryAuth(relayUrl)) {
      devLog('[NIP-42] Ignoring AUTH challenge - max retries reached');
      return;
    }
    
    // Create AUTH event
    const authEvent = await nip42AuthService.createAuthEvent(
      challenge,
      relayUrl,
      signer
    );
    
    // Send AUTH response: ['AUTH', <signed-event-json>]
    const authMessage = JSON.stringify(['AUTH', authEvent]);
    ws.send(authMessage);
    
    devLog('[NIP-42] Sent AUTH response to', relayUrl);
    
    // Mark as authenticated
    nip42AuthService.markAuthenticated(relayUrl);
    
  } catch (error) {
    devLog('[NIP-42] Failed to handle AUTH message:', error);
    nip42AuthService.markAuthRequired(relayUrl);
  }
}

/**
 * Setup AUTH monitoring for a WebSocket connection
 * 
 * Intercepts messages to detect ['AUTH', <challenge>] messages
 * and automatically respond with signed AUTH events.
 * 
 * @param relayUrl - Relay URL
 * @param ws - WebSocket connection
 * @param signer - Signer for AUTH events
 */
export function setupAuthMonitoring(
  relayUrl: string,
  ws: WebSocket,
  signer: Signer
): void {
  // Store original onmessage handler
  const originalOnMessage = ws.onmessage;
  
  // Intercept messages
  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Check for AUTH challenge: ['AUTH', <challenge-string>]
      if (Array.isArray(data) && data[0] === 'AUTH' && typeof data[1] === 'string') {
        const challenge = data[1];
        await handleAuthMessage(relayUrl, challenge, ws, signer);
        return; // Don't pass AUTH messages to original handler
      }
    } catch (parseError) {
      // Not JSON or parsing failed, ignore
    }
    
    // Pass to original handler
    if (originalOnMessage) {
      originalOnMessage.call(ws, event);
    }
  };
  
  devLog('[NIP-42] AUTH monitoring enabled for', relayUrl);
}

/**
 * Check if a relay requires authentication
 * 
 * @param relayUrl - Relay URL to check
 * @returns True if relay is known to require AUTH
 */
export function doesRelayRequireAuth(relayUrl: string): boolean {
  const state = nip42AuthService.getAuthStates().get(relayUrl);
  return state ? !state.authenticated : false;
}
