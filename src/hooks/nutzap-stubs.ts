// Stub for missing nutzap hooks
import { useMutation } from '@tanstack/react-query';

export interface ReceivedNutzap {
  id: string;
  senderPubkey: string;
  amount: number;
  token: string;
  isClaimed: boolean;
  claimedAt?: Date;
  receivedAt: Date;
  message?: string;
  status: 'pending' | 'claimed' | 'expired';
  comment?: string;
  timestamp: number;
}

export function useReceivedNutzaps() {
  const createNutzapInfoMutation = useMutation({
    mutationFn: async () => {
      throw new Error('Create nutzap info not implemented');
    },
  });
  
  return {
    data: [],
    isLoading: false,
    error: null,
    nutzaps: [],
    refetch: () => Promise.resolve(),
    unclaimedCount: 0,
    totalUnclaimed: 0,
    createNutzapInfo: createNutzapInfoMutation.mutate,
    isCreatingNutzapInfo: createNutzapInfoMutation.isPending,
  };
}

export function useNutzapRedemption() {
  const mutation = useMutation({
    mutationFn: async () => {
      throw new Error('Nutzap redemption not implemented');
    },
  });
  
  return {
    ...mutation,
    createRedemption: mutation.mutate,
    isCreatingRedemption: mutation.isPending,
  };
}

export function useSendNutzap() {
  const mutation = useMutation({
    mutationFn: async (params: any) => {
      console.log('Send nutzap not implemented, params:', params);
      throw new Error('Send nutzap not implemented');
    },
  });
  
  return {
    ...mutation,
    sendNutzap: mutation.mutate,
    isSending: mutation.isPending,
  };
}

export function useFetchNutzapInfo() {
  const mutation = useMutation({
    mutationFn: async (pubkey: string) => {
      console.log('Fetch nutzap info not implemented, pubkey:', pubkey);
      // Return mock data structure that components expect
      return {
        pubkey,
        p2pkPubkey: pubkey, // Mock the p2pk field that components expect
      };
    },
  });
  
  return {
    ...mutation,
    fetchNutzapInfo: mutation.mutate,
    isFetching: mutation.isPending,
  };
}

export function useVerifyMintCompatibility() {
  return {
    verifyMintCompatibility: (recipientInfo: any) => {
      console.log('Verify mint compatibility not implemented, recipientInfo:', recipientInfo);
      // Return a mock mint URL for compatibility
      return 'https://mint.minibits.cash/Bitcoin';
    },
  };
}

export function useRedeemNutzap() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Redeem nutzap not implemented');
    },
  });
}

export function useNutzaps() {
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

export function useAutoReceiveNutzaps() {
  return {
    isEnabled: false,
    enable: () => {},
    disable: () => {},
  };
}