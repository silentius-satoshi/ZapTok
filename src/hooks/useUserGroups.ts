import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Simplified version since groups are not implemented in this app
export function useUserGroups() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['userGroups', user?.pubkey],
    queryFn: async () => {
      // Return empty arrays since groups are not implemented
      return {
        owned: [],
        moderated: [],
        member: []
      };
    },
    enabled: !!user,
  });
}
