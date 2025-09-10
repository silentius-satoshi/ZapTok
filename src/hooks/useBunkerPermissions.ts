import { useToast } from '@/hooks/useToast';

/**
 * Hook to manage bunker signer permissions for specific event kinds
 * Implements NIP-46 permission requests for video event kinds
 */
export function useBunkerPermissions() {
  const { toast } = useToast();
  
  /**
   * Request permissions for video-related event kinds during bunker login
   * @param requiredKinds - Array of event kinds to request permissions for
   */
  const requestVideoPermissions = async (requiredKinds: number[] = [1, 21, 22]): Promise<void> => {
    console.log('🔐 Requesting bunker permissions for video event kinds:', requiredKinds);
    
    // Show user what permissions we're requesting
    const kindDescriptions = {
      1: 'Text notes (hybrid video events)',
      21: 'Video events (normal)',
      22: 'Video events (short)',
      34235: 'Video events (NIP-71 parameterized)'
    };
    
    const permissionList = requiredKinds
      .map(kind => `• Kind ${kind}: ${kindDescriptions[kind as keyof typeof kindDescriptions] || 'Unknown'}`)
      .join('\n');
    
    toast({
      title: "🎬 Video Permissions Required",
      description: `ZapTok will request permissions to publish:\n${permissionList}\n\nPlease approve these permissions in nsec.app when prompted.`,
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
  const getBunkerPermissionsString = (kinds: number[] = [1, 21, 22]): string => {
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
   * Enhanced bunker connection options with video permissions
   */
  const getBunkerConnectionOptions = (kinds: number[] = [1, 21, 22]) => {
    const permissionsString = getBunkerPermissionsString(kinds);
    
    return {
      // Request specific permissions during connection
      perms: permissionsString,
      // Optional: metadata about the app requesting permissions
      metadata: {
        name: 'ZapTok',
        description: 'Video sharing platform for Nostr',
        url: 'https://zaptok.app',
        icons: ['https://zaptok.app/icon-192x192.png']
      }
    };
  };

  /**
   * Check if current bunker signer has the required permissions
   * Note: This is informational - actual permission checking happens server-side
   */
  const hasVideoPermissions = (user: any, kinds: number[] = [1, 21, 22]): boolean => {
    // For bunker signers, we assume permissions were granted during connection
    // The bunker service will reject signing attempts for unauthorized kinds
    if (user?.signer?.constructor?.name === 'NostrToolsSigner') {
      console.log('🔍 Bunker signer detected - assuming video permissions granted during connection');
      return true;
    }
    
    return false;
  };

  /**
   * Display permission status to user
   */
  const showPermissionStatus = (kinds: number[] = [1, 21, 22]) => {
    const kindsList = kinds.join(', ');
    
    toast({
      title: "✅ Video Permissions",
      description: `ZapTok has been granted permissions to publish video events (kinds: ${kindsList}). You can now upload and share videos!`,
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
