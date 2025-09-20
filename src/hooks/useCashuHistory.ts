// Stub for missing hook - returns empty data for now
import { useQuery } from '@tanstack/react-query';

export function useCashuHistory() {
  return useQuery({
    queryKey: ['cashu-history'],
    queryFn: () => Promise.resolve([]),
    enabled: false, // Disabled for now
  });
}