import { useToast } from '@/hooks/useToast';

/**
 * Hook to manage bunker signer permissions for specific event kinds
 * Implements NIP-46 permission requests for video, zap, and Cashu wallet event kinds
 */
export function useBunkerPermissions() {
  const { toast } = useToast();
  
  /**
   * Request permissions for video, zap, and Cashu event kinds during bunker login
   * @param requiredKinds - Array of event kinds to request permissions for
   */
  const requestVideoPermissions = async (requiredKinds: number[] = [1, 21, 22, 9734, 9735, 7374, 7375, 7376, 17375, 9321, 10019, 13194, 23194, 23195, 23197]): Promise<void> => {
    console.log('🔐 Requesting bunker permissions for event kinds:', requiredKinds);
    
    // Show user what permissions we're requesting
    const kindDescriptions = {
      1: 'Text notes and posts',
      21: 'Video content',
      22: 'Short video content',
      9734: 'Zap payment requests',
      9735: 'Zap payment receipts',
      7374: 'Cashu token quotes',
      7375: 'Cashu token proofs',
      7376: 'Cashu spending history',
      17375: 'Cashu wallet management',
      9321: 'Nutzap payments',
      10019: 'Nutzap configuration',
      13194: 'NWC wallet info',
      23194: 'NWC payment requests',
      23195: 'NWC payment responses',
      23197: 'NWC notifications'
    };
    
    const permissionList = requiredKinds
      .map(kind => `• Kind ${kind}: ${kindDescriptions[kind as keyof typeof kindDescriptions] || 'Unknown'}`)
      .join('\n');
    
    toast({
      title: "🎬 App Permissions Required",
      description: `ZapTok will request permissions to publish:\n${permissionList}\n\nPlease approve these permissions in your bunker app when prompted.`,
      duration: 8000,
    });
    
    // Note: The actual permission request happens during the bunker connection
    // process. This function serves to inform the user about what permissions
    // will be requested.
  };

  /**
   * Get the permissions string for bunker signer initialization
   * This creates a permissions string that can be used with the bunker signer
   */
  const getBunkerPermissionsString = (kinds: number[] = [1, 21, 22, 9734, 9735, 7374, 7375, 7376, 17375, 9321, 10019]): string => {
    // NIP-46 permission format: sign_event for specific kinds
    const permissions = kinds.map(kind => `sign_event:${kind}`).join(',');
    
    // Add general permissions needed for ZapTok functionality
    const generalPermissions = [
      'nip04_encrypt',
      'nip04_decrypt', 
      'nip44_encrypt',
      'nip44_decrypt',
      'get_public_key'
    ];
    
    return [permissions, ...generalPermissions].join(',');
  };

  /**
   * Enhanced bunker connection options with comprehensive permissions
   */
  const getBunkerConnectionOptions = (kinds: number[] = [1, 21, 22, 9734, 9735, 7374, 7375, 7376, 17375, 9321, 10019]) => {
    const permissionsString = getBunkerPermissionsString(kinds);
    
    return {
      // Request specific permissions during connection
      perms: permissionsString,
      // Optional: metadata about the app requesting permissions
      metadata: {
        name: 'ZapTok',
        description: 'Video sharing platform with Lightning payments and Cashu wallet',
        url: 'https://zaptok-labs.vercel.app',
        icons: [`${import.meta.env.BASE_URL}images/ZapTok-v3.png`]
      }
    };
  };

  /**
   * Check if current bunker signer has the required permissions
   * Note: This is informational - actual permission checking happens server-side
   */
  const hasVideoPermissions = (user: any, kinds: number[] = [1, 21, 22, 9734, 9735, 7374, 7375, 7376, 17375, 9321, 10019]): boolean => {
    // For bunker signers, we assume permissions were granted during connection
    // The bunker service will reject signing attempts for unauthorized kinds
    if (user?.signer?.constructor?.name === 'NostrToolsSigner') {
      console.log('🔍 Bunker signer detected - assuming permissions granted during connection');
      return true;
    }
    
    return false;
  };

  /**
   * Display permission status to user
   */
  const showPermissionStatus = (kinds: number[] = [1, 21, 22, 9734, 9735, 7374, 7375, 7376, 17375, 9321, 10019]) => {
    const kindsList = kinds.join(', ');
    
    toast({
      title: "✅ App Permissions",
      description: `ZapTok has been granted permissions to publish events (kinds: ${kindsList}). You can now use videos, zaps, and Cashu wallet features!`,
      duration: 5000,
    });
  };

  return {
    requestVideoPermissions,
    getBunkerPermissionsString,
    getBunkerConnectionOptions,
    hasVideoPermissions,
    showPermissionStatus,
  };
}
