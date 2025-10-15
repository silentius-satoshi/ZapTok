import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { makeZapPayment, getPaymentSuggestion, testLightningAddress } from '@/lib/lightning-proxy';

interface ZapPaymentParams {
  lightningAddress: string;
  amountSats: number;
  comment?: string;
  nostr?: {
    eventId?: string;
    pubkey?: string;
  };
}

interface ZapPaymentResult {
  success: boolean;
  method: string;
  preimage?: string;
  error?: string;
}

/**
 * Enhanced Lightning payment hook with Vercel proxy support
 */
export function useZapPayment() {
  const { toast } = useToast();

  const paymentMutation = useMutation({
    mutationFn: async (params: ZapPaymentParams): Promise<ZapPaymentResult> => {
      const { lightningAddress, amountSats, comment, nostr } = params;
      
      // Validate inputs
      if (!lightningAddress || !lightningAddress.includes('@')) {
        throw new Error('Invalid Lightning address format');
      }
      
      if (amountSats < 1 || amountSats > 100000) {
        throw new Error('Amount must be between 1 and 100,000 sats');
      }
      
      // Get payment suggestion for user feedback
      const suggestion = getPaymentSuggestion(lightningAddress);
      
      if (suggestion.isBlocked) {
        throw new Error(suggestion.message);
      }
      
      // Show appropriate loading message based on method
      if (import.meta.env.DEV) {
        console.log(`⚡ Initiating payment via ${suggestion.method}: ${suggestion.message}`);
      }
      
      try {
        const result = await makeZapPayment(lightningAddress, amountSats, comment, nostr);
        
        // Show success message
        toast({
          title: "⚡ Zap Sent!",
          description: `Successfully sent ${amountSats} sats via ${result.method}`,
          duration: 4000,
        });
        
        return result;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
        
        // Show appropriate error message
        if (errorMessage.includes('not supported') || errorMessage.includes('blocked')) {
          toast({
            title: "❌ Payment Not Supported",
            description: errorMessage,
            variant: "destructive",
            duration: 8000,
          });
        } else if (errorMessage.includes('WebLN')) {
          toast({
            title: "🔌 WebLN Issue",
            description: "Please check your Lightning wallet connection and try again.",
            variant: "destructive",
            duration: 6000,
          });
        } else if (errorMessage.includes('timeout')) {
          toast({
            title: "⏱️ Payment Timeout",
            description: "The Lightning provider took too long to respond. Please try again.",
            variant: "destructive",
            duration: 6000,
          });
        } else {
          toast({
            title: "❌ Payment Failed",
            description: errorMessage,
            variant: "destructive",
            duration: 6000,
          });
        }
        
        throw error;
      }
    },
  });

  return {
    zapPayment: paymentMutation.mutateAsync,
    isZapping: paymentMutation.isPending,
    zapError: paymentMutation.error,
    resetZap: paymentMutation.reset,
  };
}

/**
 * Hook to test Lightning address compatibility
 */
export function useLightningAddressTest() {
  const testMutation = useMutation({
    mutationFn: async (lightningAddress: string) => {
      if (!lightningAddress || !lightningAddress.includes('@')) {
        throw new Error('Invalid Lightning address format');
      }
      
      return await testLightningAddress(lightningAddress);
    },
  });

  return {
    testAddress: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
    testResult: testMutation.data,
    testError: testMutation.error,
    resetTest: testMutation.reset,
  };
}

/**
 * Hook to get Lightning payment suggestions
 */
export function useLightningPaymentSuggestion(lightningAddress: string | null) {
  if (!lightningAddress) {
    return {
      canUseWebLN: false,
      shouldUseCashu: false,
      isBlocked: true,
      message: 'No Lightning address provided',
      method: 'none'
    };
  }
  
  return getPaymentSuggestion(lightningAddress);
}