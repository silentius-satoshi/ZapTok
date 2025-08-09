import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Hook to manage Cashu-specific permissions for NIP-07 extensions
 */
export function useCashuPermissions() {
  const { user } = useCurrentUser();

  const requestCashuPermissions = async (): Promise<boolean> => {
    if (!user) {
      throw new Error('User must be logged in to request Cashu permissions');
    }

    // Check if extension exists
    if (!('nostr' in window)) {
      throw new Error('Nostr extension not found');
    }

    const permissions = [
      'read',
      'sign_event', 
      'encrypt', 
      'decrypt'
    ];

    console.log('Requesting Cashu-specific permissions:', permissions);

    try {
      // Try to request permissions if the extension supports it
      if (typeof (window as any).nostr?.requestPermissions === 'function') {
        await (window as any).nostr.requestPermissions(permissions);
        console.log('Cashu permissions granted');
        return true;
      } else {
        console.log('Extension does not support permission requests');
        return true; // Assume permissions are available
      }
    } catch (error) {
      console.error('Cashu permission request failed:', error);
      throw new Error('Failed to get required permissions for Cashu operations. Please ensure your Nostr extension allows encrypt/decrypt operations.');
    }
  };

  const checkCashuSupport = (): boolean => {
    if (!user?.signer?.nip44) {
      return false;
    }
    return true;
  };

  return {
    requestCashuPermissions,
    checkCashuSupport,
    hasCashuSupport: checkCashuSupport(),
  };
}
