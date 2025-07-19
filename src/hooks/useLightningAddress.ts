import { useAuthor } from './useAuthor';
import { getLightningAddress } from '@/lib/lightning';

/**
 * Hook to get Lightning address for a given pubkey
 * Returns the Lightning address and loading state
 */
export function useLightningAddress(pubkey: string | undefined) {
  const { data: authorData, isLoading, error } = useAuthor(pubkey);
  
  const lightningAddress = getLightningAddress(authorData?.metadata);
  
  return {
    lightningAddress,
    isLoading,
    error,
    hasLightningAddress: !!lightningAddress,
    authorData,
  };
}
