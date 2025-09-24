import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
      // Check for bunker (NIP-46) connection
      if ('rpc' in signer || signer.toString().includes('bunker')) {
        signerType = 'bunker';
        // Extract bunker URL if available
        try {
          bunkerUrl = signer.toString();
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
      // Check for nsec (private key)
      else if ((user as any).privkey || (signer as any).privkey) {
        signerType = 'nsec';
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
        hasPrivateKey: Boolean((user as any).privkey),
        webLNProvider,
        methodsAvailable,
      },
      status,
    };
  }, [user]);
}