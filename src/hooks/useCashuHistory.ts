// Stub for missing hook - returns empty data for now
import { useQuery } from '@tanstack/react-query';

// Stub implementation for compatibility with existing components

// Define the expected history entry interface
interface HistoryEntry {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  timestamp: number;
  status?: string;
  message?: string;
}

export function useCashuHistory() {
  // Return a single mock entry to provide proper typing
  const mockHistory: HistoryEntry[] = [];
  
  return {
    // Query-like interface for history data
    history: mockHistory,
    data: mockHistory,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    isPlaceholderData: false,
    
    // Mock createHistory method that components expect
    createHistory: (historyEntry: any) => {
      console.log('useCashuHistory.createHistory called with:', historyEntry);
      // Return a promise for compatibility
      return Promise.resolve();
    },
    
    // Additional query-like methods for compatibility
    refetch: () => Promise.resolve({ data: mockHistory }),
    isFetching: false,
    isPreviousData: false,
    isStale: false,
    
    // Mock promise for async compatibility
    promise: Promise.resolve(mockHistory),
  };
}