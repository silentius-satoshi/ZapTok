import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useUserCashuStore } from '@/stores/userCashuStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { CashuMint, CashuWallet, Proof, getEncodedToken } from '@cashu/cashu-ts';
import { ReceivedNutzap } from '@/hooks/useReceivedNutzaps';

export function useRedeemNutzap() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const userCashuStore = useUserCashuStore(user?.pubkey);
  const { updateProofs } = useCashuWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nutzap: ReceivedNutzap) => {
      console.log('🔄 Redeeming P2PK nutzap:', nutzap.id);
      
      if (!nutzap?.proofs || !Array.isArray(nutzap.proofs)) {
        throw new Error('Invalid nutzap data: no proofs found');
      }

      if (nutzap.redeemed) {
        console.log('⚠️ Nutzap already redeemed, skipping');
        return { success: true, amount: nutzap.amount, proofsCount: nutzap.proofs.length };
      }

      if (!user?.signer) {
        throw new Error('User signer not available for P2PK redemption');
      }

      // Setup wallet for P2PK redemption
      const mint = new CashuMint(nutzap.mintUrl);
      const wallet = new CashuWallet(mint);
      await wallet.loadMint();

      console.log('🔐 Processing P2PK token redemption with wallet signature...');

      try {
        // Get the user's private key for P2PK witness creation
        const userPrivkey = userCashuStore?.privkey;
        if (!userPrivkey) {
          throw new Error('User private key not available for P2PK signature');
        }

        // Convert nutzap proofs to proper Proof format
        const proofsToReceive: Proof[] = nutzap.proofs.map(p => ({
          amount: p.amount,
          id: p.id,
          secret: p.secret,
          C: p.C
        }));

        console.log('📝 Creating encoded token for P2PK reception...');

        // Create an encoded token from the P2PK proofs
        const token = getEncodedToken({
          mint: nutzap.mintUrl,
          proofs: proofsToReceive
        });

        console.log('🔓 Receiving P2PK token with automatic witness creation...');

        // Use wallet.receive() which handles P2PK witness creation automatically
        // The library will detect P2PK tokens and create the necessary witness signatures
        const receivedProofs = await wallet.receive(token, {
          privkey: userPrivkey // This enables P2PK witness creation
        });

        console.log('✅ P2PK tokens received successfully:', {
          originalProofs: proofsToReceive.length,
          receivedProofs: receivedProofs.length,
          amount: receivedProofs.reduce((sum, p) => sum + p.amount, 0)
        });

        // Update wallet with the received proofs (now properly unlocked)
        await updateProofs({
          mintUrl: nutzap.mintUrl,
          proofsToAdd: receivedProofs,
          proofsToRemove: [],
        });

        const totalAmount = receivedProofs.reduce((sum, p) => sum + p.amount, 0);

        return { 
          success: true, 
          amount: totalAmount,
          proofsCount: receivedProofs.length
        };

      } catch (error) {
        // Handle specific P2PK errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('witness') || errorMessage.includes('signature')) {
          console.error('❌ P2PK witness/signature error:', errorMessage);
          throw new Error('Missing or invalid P2PK signature. Please ensure your wallet has the correct private key.');
        }
        
        if (errorMessage.includes('Token already spent')) {
          console.error('❌ Token already spent:', errorMessage);
          throw new Error('This nutzap has already been redeemed or spent.');
        }

        if (errorMessage.includes('pubkey')) {
          console.error('❌ P2PK pubkey mismatch:', errorMessage);
          throw new Error('This nutzap is locked to a different public key. You cannot redeem it.');
        }

        console.error('❌ P2PK redemption error:', errorMessage);
        throw new Error(`Failed to redeem P2PK nutzap: ${errorMessage}`);
      }
    },
    onSuccess: (data) => {
      console.log('✅ P2PK nutzap redemption successful:', data);
      toast({
        title: "Nutzap Redeemed",
        description: `Successfully redeemed ${data.proofsCount} P2PK tokens (${data.amount} sats)`,
      });

      // Invalidate queries to refresh nutzap list and wallet balance
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['nutzap', 'received', user.pubkey] });
        queryClient.invalidateQueries({ queryKey: ['cashu', 'wallet', user.pubkey] });
      }
    },
    onError: (error: any) => {
      console.error('❌ P2PK nutzap redemption failed:', error);
      toast({
        title: "P2PK Redemption Failed",
        description: error?.message || "Failed to redeem P2PK nutzap - missing witness signature",
        variant: "destructive",
      });
    },
  });
}
