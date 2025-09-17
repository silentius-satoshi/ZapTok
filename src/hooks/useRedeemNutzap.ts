import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useUserCashuStore } from '@/stores/userCashuStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useRedeemNutzap() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const userCashuStore = useUserCashuStore(user?.pubkey);

  return useMutation({
    mutationFn: async (nutzapData: any) => {
      console.log('Redeeming nutzap:', nutzapData);
      
      if (!nutzapData?.proofs || !Array.isArray(nutzapData.proofs)) {
        throw new Error('Invalid nutzap data: no proofs found');
      }

      if (!userCashuStore?.addProofs) {
        throw new Error('User Cashu store not available');
      }

      // Add the proofs to the user's wallet
      userCashuStore.addProofs(nutzapData.proofs, nutzapData.id);
      
      console.log('✅ Added nutzap proofs to user wallet:', {
        eventId: nutzapData.id,
        proofsCount: nutzapData.proofs.length,
        amount: nutzapData.proofs.reduce((sum: number, p: any) => sum + p.amount, 0)
      });
      
      return { 
        success: true, 
        amount: nutzapData.proofs.reduce((sum: number, p: any) => sum + p.amount, 0),
        proofsCount: nutzapData.proofs.length
      };
    },
    onSuccess: (data) => {
      console.log('✅ Nutzap redemption successful:', data);
      toast({
        title: "Nutzap Redeemed",
        description: `Successfully added ${data.proofsCount} proofs (${data.amount} sats) to your wallet`,
      });
    },
    onError: (error: any) => {
      console.error('❌ Nutzap redemption failed:', error);
      toast({
        title: "Redemption Failed",
        description: error?.message || "Failed to redeem nutzap",
        variant: "destructive",
      });
    },
  });
}
