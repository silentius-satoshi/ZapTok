import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Base URL for zap.stream API
const ZAPSTREAM_API_BASE = 'https://api.zap.stream/api/v1';

// Helper function to create NIP-98 HTTP Auth event
async function createNIP98AuthEvent(method: string, url: string, signer: { signEvent: (event: unknown) => Promise<unknown> }) {
  const authEvent = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', url],
      ['method', method]
    ],
    content: '',
    pubkey: '', // Will be set by signer
  };

  // Sign the event using the user's signer
  return await signer.signEvent(authEvent);
}

// Helper function to create authenticated headers
async function createAuthHeaders(method: string, url: string, signer: { signEvent: (event: unknown) => Promise<unknown> }) {
  const authEvent = await createNIP98AuthEvent(method, url, signer);
  const authHeader = `Nostr ${btoa(JSON.stringify(authEvent))}`;
  
  return {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  };
}

export interface ZapStreamAccount {
  endpoints: Array<{
    name: string;
    url: string;
    key: string;
    capabilities: string[];
    cost: {
      unit: string;
      rate: number;
    };
  }>;
  balance: number;
  tos: {
    accepted: boolean;
    link: string;
  };
  forwards: Array<{
    id: number;
    name: string;
  }>;
  details: {
    title?: string;
    summary?: string;
    image?: string;
    tags?: string[];
    content_warning?: string;
    goal?: string;
  };
}

export interface StreamKey {
  id: number;
  key: string;
  created: number;
  expires: number;
  stream_id: string;
}

export interface TopupResponse {
  pr: string; // Lightning payment request
}

export interface WithdrawResponse {
  fee: number;
  preimage: string;
}

export interface HistoryItem {
  created: number;
  type: number;
  amount: number;
  desc: string;
}

export interface History {
  items: HistoryItem[];
  page: number;
  page_size: number;
}

// Custom hook for zap.stream API interactions
export function useZapStreamAPI() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Get account information
  const useAccountInfo = () => {
    return useQuery({
      queryKey: ['zapstream-account', user?.pubkey],
      queryFn: async (): Promise<ZapStreamAccount> => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/account`;
        const headers = await createAuthHeaders('GET', url, user.signer);

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch account: ${response.statusText}`);
        }

        return response.json();
      },
      enabled: !!user?.signer,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Update account (e.g., accept TOS)
  const useUpdateAccount = () => {
    return useMutation({
      mutationFn: async (data: { accept_tos?: boolean }) => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/account`;
        const headers = await createAuthHeaders('PATCH', url, user.signer);

        const response = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to update account: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['zapstream-account'] });
      },
    });
  };

  // Request top-up
  const useRequestTopup = () => {
    return useMutation({
      mutationFn: async (amount: number): Promise<TopupResponse> => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/topup?amount=${amount}`;
        const headers = await createAuthHeaders('GET', url, user.signer);

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to request topup: ${response.statusText}`);
        }

        return response.json();
      },
    });
  };

  // Withdraw funds
  const useWithdraw = () => {
    return useMutation({
      mutationFn: async (invoice: string): Promise<WithdrawResponse> => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/withdraw?invoice=${encodeURIComponent(invoice)}`;
        const headers = await createAuthHeaders('POST', url, user.signer);

        const response = await fetch(url, {
          method: 'POST',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to withdraw: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['zapstream-account'] });
      },
    });
  };

  // Get stream keys
  const useStreamKeys = () => {
    return useQuery({
      queryKey: ['zapstream-keys', user?.pubkey],
      queryFn: async (): Promise<StreamKey[]> => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/keys`;
        const headers = await createAuthHeaders('GET', url, user.signer);

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch stream keys: ${response.statusText}`);
        }

        return response.json();
      },
      enabled: !!user?.signer,
      staleTime: 60 * 1000, // 1 minute
    });
  };

  // Create stream key
  const useCreateStreamKey = () => {
    return useMutation({
      mutationFn: async (data: {
        event: {
          title: string;
          summary?: string;
          image?: string;
          tags?: string[];
          content_warning?: string;
          goal?: string;
        };
        expires?: string;
      }) => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/keys`;
        const headers = await createAuthHeaders('POST', url, user.signer);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to create stream key: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['zapstream-keys'] });
      },
    });
  };

  // Update stream event
  const useUpdateStreamEvent = () => {
    return useMutation({
      mutationFn: async (data: {
        id: string;
        title?: string;
        summary?: string;
        image?: string;
        tags?: string[];
        content_warning?: string;
        goal?: string;
      }) => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/event`;
        const headers = await createAuthHeaders('PATCH', url, user.signer);

        const response = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to update stream event: ${response.statusText}`);
        }

        return response.json();
      },
    });
  };

  // Get account history
  const useAccountHistory = () => {
    return useQuery({
      queryKey: ['zapstream-history', user?.pubkey],
      queryFn: async (): Promise<History> => {
        if (!user?.signer) throw new Error('User not logged in');

        const url = `${ZAPSTREAM_API_BASE}/history`;
        const headers = await createAuthHeaders('GET', url, user.signer);

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        return response.json();
      },
      enabled: !!user?.signer,
      staleTime: 60 * 1000, // 1 minute
    });
  };

  return {
    useAccountInfo,
    useUpdateAccount,
    useRequestTopup,
    useWithdraw,
    useStreamKeys,
    useCreateStreamKey,
    useUpdateStreamEvent,
    useAccountHistory,
  };
}
