import { useEffect } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useReceivedNutzaps, useRedeemNutzap } from './useReceivedNutzaps';
import { useNutzapInfo } from './useNutzaps';

/**
 * Auto-receive nutzaps hook that automatically redeems received nutzaps
 */
export function useAutoReceiveNutzaps() {
  const { user } = useCurrentUser();
  const nutzapInfoQuery = useNutzapInfo(user?.pubkey);
  const { data: receivedNutzaps } = useReceivedNutzaps();
  const { mutateAsync: redeemNutzap } = useRedeemNutzap();

  useEffect(() => {
    if (!user || !receivedNutzaps || !nutzapInfoQuery.data) return;

    // Auto-redeem any unredeemed nutzaps
    const unredeemedNutzaps = receivedNutzaps.filter(nutzap => !nutzap.redeemed);

    unredeemedNutzaps.forEach(async (nutzap) => {
      try {
        await redeemNutzap(nutzap);
        console.log(`Auto-redeemed nutzap: ${nutzap.id}`);
      } catch (error) {
        console.error(`Failed to auto-redeem nutzap ${nutzap.id}:`, error);
      }
    });
  }, [user, receivedNutzaps, nutzapInfoQuery.data, redeemNutzap]);

  return {
    isAutoReceiving: true,
    receivedCount: receivedNutzaps?.length || 0,
    unredeemedCount: receivedNutzaps?.filter(n => !n.redeemed).length || 0,
  };
}