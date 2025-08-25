import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ConsentState {
  isDialogOpen: boolean;
  detectedWallet: string | null;
  hasSeenDialog: boolean;
}

export function useBitcoinConnectConsent() {
  const { user } = useCurrentUser();
  const [consentState, setConsentState] = useState<ConsentState>({
    isDialogOpen: false,
    detectedWallet: null,
    hasSeenDialog: false,
  });

  const signerType = user?.signer?.constructor?.name || 'unknown';
  const isBunkerSigner = signerType === 'NoBunkerSigner' ||
                        signerType === 'NdkSigner' ||
                        signerType.includes('bunker') ||
                        signerType.includes('Bunker');

  // Check if user has already provided consent
  const getStoredConsent = useCallback(() => {
    if (!isBunkerSigner) return null;
    return localStorage.getItem(`bitcoin_connect_consent_${signerType}`);
  }, [isBunkerSigner, signerType]);

  // Detect Bitcoin Connect auto-connection
  const detectAutoConnection = useCallback(() => {
    if (!isBunkerSigner || consentState.hasSeenDialog) return;

    const storedConsent = getStoredConsent();
    if (storedConsent) return; // User has already chosen

    // Check for WebLN availability (indicates auto-connection potential)
    const checkWebLN = () => {
      const win = window as any;
      if (win.webln) {
        // WebLN is available, likely auto-connected
        setConsentState(prev => ({
          ...prev,
          isDialogOpen: true,
          detectedWallet: getWalletName(),
          hasSeenDialog: true,
        }));
      }
    };

    // Check immediately and after a brief delay for async loading
    checkWebLN();
    const timeoutId = setTimeout(checkWebLN, 1000);

    return () => clearTimeout(timeoutId);
  }, [isBunkerSigner, consentState.hasSeenDialog, getStoredConsent]);

  // Get wallet name from various sources
  const getWalletName = (): string => {
    if (typeof window === 'undefined') return 'Browser Extension Wallet';

    const win = window as any;

    // Try to detect specific wallet
    if (win.alby) return 'Alby';
    if (win.getAlby) return 'Alby';
    if (win.Zeus) return 'Zeus';
    if (win.BlueWallet) return 'BlueWallet';
    if (win.webln) {
      // Generic WebLN wallet
      const webln = win.webln;
      if (webln.constructor?.name) return webln.constructor.name;
      if (webln.title) return webln.title;
    }

    return 'Browser Extension Wallet';
  };

  // Listen for Bitcoin Connect events
  useEffect(() => {
    if (!isBunkerSigner) return;

    const handleBitcoinConnectEvent = (event: Event) => {
      const customEvent = event as CustomEvent;

      if (customEvent.type === 'bc:connected' || customEvent.type === 'bitcoinconnect:connected') {
        const storedConsent = getStoredConsent();
        if (!storedConsent && !consentState.hasSeenDialog) {
          setConsentState(prev => ({
            ...prev,
            isDialogOpen: true,
            detectedWallet: customEvent.detail?.walletName || getWalletName(),
            hasSeenDialog: true,
          }));
        }
      }
    };

    // Listen for Bitcoin Connect events
    window.addEventListener('bc:connected', handleBitcoinConnectEvent);
    window.addEventListener('bitcoinconnect:connected', handleBitcoinConnectEvent);

    // Also check for existing connections
    const cleanup = detectAutoConnection();

    return () => {
      window.removeEventListener('bc:connected', handleBitcoinConnectEvent);
      window.removeEventListener('bitcoinconnect:connected', handleBitcoinConnectEvent);
      if (cleanup) cleanup();
    };
  }, [isBunkerSigner, detectAutoConnection, getStoredConsent, consentState.hasSeenDialog]);

  const closeDialog = useCallback(() => {
    setConsentState(prev => ({
      ...prev,
      isDialogOpen: false,
      detectedWallet: null,
    }));
  }, []);

  const resetConsent = useCallback(() => {
    if (isBunkerSigner) {
      localStorage.removeItem(`bitcoin_connect_consent_${signerType}`);
      setConsentState({
        isDialogOpen: false,
        detectedWallet: null,
        hasSeenDialog: false,
      });
    }
  }, [isBunkerSigner, signerType]);

  const hasUserConsent = useCallback(() => {
    const storedConsent = getStoredConsent();
    return storedConsent === 'accepted';
  }, [getStoredConsent]);

  const hasUserDeclined = useCallback(() => {
    const storedConsent = getStoredConsent();
    return storedConsent === 'disconnected';
  }, [getStoredConsent]);

  return {
    isDialogOpen: consentState.isDialogOpen,
    detectedWallet: consentState.detectedWallet,
    signerType,
    isBunkerSigner,
    closeDialog,
    resetConsent,
    hasUserConsent,
    hasUserDeclined,
  };
}
