// Stub for missing hooks
import { useMutation } from '@tanstack/react-query';

export function useCreateCashuWallet() {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Create cashu wallet not implemented');
    },
  });
}

export function useCashuPermissions() {
  return {
    hasPermission: false,
    requestPermission: () => {},
  };
}

export function useNIP60Cashu() {
  return {
    isEnabled: false,
    enable: () => {},
    disable: () => {},
  };
}