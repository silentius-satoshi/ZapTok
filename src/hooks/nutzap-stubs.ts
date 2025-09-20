// Stub for missing nutzap hooks
import { useMutation } from '@tanstack/react-query';

export function useReceivedNutzaps() {
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

export function useNutzapRedemption() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Nutzap redemption not implemented');
    },
  });
}

export function useSendNutzap() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Send nutzap not implemented');
    },
  });
}

export function useFetchNutzapInfo() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Fetch nutzap info not implemented');
    },
  });
}

export function useVerifyMintCompatibility() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Verify mint compatibility not implemented');
    },
  });
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