import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrLogin } from '@nostrify/react/login';

export interface SignerAnalysis {
  signerType: 'extension' | 'bunker' | 'nsec' | 'none';
  capabilities: {
    webln: boolean;
    nip44: boolean;
    bunker: boolean;
    signing: boolean;
  };
  compatibility: {
    cashu: boolean;
    lightning: boolean;
    encryption: boolean;
  };
  details: {
    extensionName?: string;
    bunkerUrl?: string;
    hasPrivateKey: boolean;
    webLNProvider?: string;
    methodsAvailable: string[];
  };
  status: 'connected' | 'partial' | 'disconnected' | 'error';
}

/**
 * Consolidated signer analysis hook that replaces duplicate logic
 * across LoginDebugInfo, WalletDebugInfo, and LightningDebugInfo
 */
export function useSignerAnalysis(): SignerAnalysis {
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  
  // Get the current login object by matching pubkey
  const currentLogin = user ? logins.find(login => login.pubkey === user.pubkey) : null;

  return useMemo(() => {
    if (!user) {
      return {
        signerType: 'none',
        capabilities: {
          webln: false,
          nip44: false,
          bunker: false,
          signing: false,
        },
        compatibility: {
          cashu: false,
          lightning: false,
          encryption: false,
        },
        details: {
          hasPrivateKey: false,
          methodsAvailable: [],
        },
        status: 'disconnected',
      };
    }

    const signer = user.signer;
    let signerType: SignerAnalysis['signerType'] = 'none';
    let extensionName: string | undefined;
    let bunkerUrl: string | undefined;
    let webLNProvider: string | undefined;

    // Detect signer type
    if (signer) {
      // PRIORITY 1: Check login type first (most reliable)
      if (currentLogin) {
        if (currentLogin.type === 'nsec') {
          signerType = 'nsec';
        } else if (currentLogin.type === 'bunker' || currentLogin.type === 'x-bunker-nostr-tools') {
          signerType = 'bunker';
          // Extract bunker URL if available
          try {
            const customLogin = currentLogin as any;
            bunkerUrl = customLogin.bunkerUrl || customLogin.data?.bunkerUrl || 'Remote signer (NIP-46)';
          } catch {
            bunkerUrl = 'Remote signer (NIP-46)';
          }
        } else if (currentLogin.type === 'extension') {
          signerType = 'extension';
          // Detect extension name
          try {
            if (navigator.userAgent.includes('Alby')) {
              extensionName = 'Alby';
            } else if ((window.nostr as any)?._metadata?.name) {
              extensionName = (window.nostr as any)._metadata.name;
            } else {
              extensionName = 'Browser Extension';
            }
          } catch {
            extensionName = 'Browser Extension';
          }
        }
      }
      
      // PRIORITY 2: Fallback to signer property detection if no login type matched
      if (signerType === 'none') {
        // Check for bunker (NIP-46) connection via signer properties
        const isBunker = 
          'rpc' in signer || 
          'relay' in signer ||
          signer.constructor?.name === 'NDKNip46Signer' ||
          signer.constructor?.name === 'Nip46Signer' ||
          signer.constructor?.name?.includes('Bunker') ||
          signer.toString().includes('bunker') ||
          signer.toString().includes('nip46');
          
        if (isBunker) {
          signerType = 'bunker';
          // Extract bunker URL if available
          try {
            const signerString = String(signer);
            bunkerUrl = signerString === '[object Object]' ? 'Remote signer (NIP-46)' : signerString;
          } catch {
            bunkerUrl = 'Unknown bunker connection';
          }
        }
        // Check for extension signer
        else if (typeof window !== 'undefined' && window.nostr) {
          signerType = 'extension';
          // Detect extension name
          try {
            if (navigator.userAgent.includes('Alby')) {
              extensionName = 'Alby';
            } else if ((window.nostr as any)._metadata?.name) {
              extensionName = (window.nostr as any)._metadata.name;
            } else {
              extensionName = 'Browser Extension';
            }
          } catch {
            extensionName = 'Browser Extension';
          }
        }
        // Fallback: if we have NIP-44 but no other type, it's likely nsec (since bunker would be caught above)
        else if (signer.nip44) {
          signerType = 'nsec';
        }
      }
    }

    // Analyze capabilities
    const capabilities = {
      webln: Boolean(typeof window !== 'undefined' && window.webln),
      nip44: Boolean(signer?.nip44?.encrypt && signer?.nip44?.decrypt),
      bunker: signerType === 'bunker',
      signing: Boolean(signer?.signEvent),
    };

    // Detect WebLN provider
    if (capabilities.webln && typeof window !== 'undefined' && window.webln) {
      try {
        if ((window.webln as any).getInfo) {
          webLNProvider = 'Available (provider detection requires async call)';
        } else {
          webLNProvider = 'Available';
        }
      } catch {
        webLNProvider = 'Available';
      }
    }

    // Analyze compatibility
    const compatibility = {
      cashu: Boolean(signer && (capabilities.nip44 || (user as any).privkey)),
      lightning: capabilities.webln || capabilities.bunker,
      encryption: capabilities.nip44,
    };

    // Determine overall status
    let status: SignerAnalysis['status'] = 'error';
    if (signerType !== 'none') {
      if (capabilities.signing && (compatibility.cashu || compatibility.lightning)) {
        status = 'connected';
      } else if (capabilities.signing) {
        status = 'partial';
      }
    } else {
      status = 'disconnected';
    }

    // Collect available methods
    const methodsAvailable: string[] = [];
    if (capabilities.signing) methodsAvailable.push('Event Signing');
    if (capabilities.nip44) methodsAvailable.push('NIP-44 Encryption');
    if (capabilities.webln) methodsAvailable.push('WebLN Payments');
    if (capabilities.bunker) methodsAvailable.push('Remote Signing (Bunker)');

    return {
      signerType,
      capabilities,
      compatibility,
      details: {
        extensionName,
        bunkerUrl,
        hasPrivateKey: signerType === 'nsec',
        webLNProvider,
        methodsAvailable,
      },
      status,
    };
  }, [user, currentLogin]);
}