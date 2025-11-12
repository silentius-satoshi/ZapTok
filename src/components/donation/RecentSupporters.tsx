import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { lightningService, type TRecentSupporter } from '@/lib/lightning.service.donation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Hook to fetch recent supporters using Lightning service
 */
function useRecentSupporters() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['recent-supporters'],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);

      try {
        return await lightningService.fetchRecentSupporters(nostr);
      } catch (error) {
        console.error('Failed to fetch supporters:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Individual supporter component
 */
function SupporterItem({ supporter }: { supporter: TRecentSupporter }) {
  const author = useAuthor(supporter.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || metadata?.display_name || `User ${supporter.pubkey.slice(0, 8)}`;
  const profileImage = metadata?.picture;

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-700 p-3 gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={profileImage} />
          <AvatarFallback className="bg-gray-700 text-yellow-400 text-sm font-semibold">
            {displayName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">
            {displayName}
          </div>
          {supporter.comment && (
            <div className="text-gray-400 text-xs truncate">
              {supporter.comment}
            </div>
          )}
        </div>
      </div>

      <div className="text-yellow-400 text-sm font-bold whitespace-nowrap">
        {supporter.formattedAmount} sats
      </div>
    </div>
  );
}

export function RecentSupporters() {
  const { data: supporters, isLoading, error } = useRecentSupporters();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-yellow-400 text-lg font-semibold text-center">Recent Supporters</h3>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-gray-700 p-3 gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-yellow-400 text-lg font-semibold text-center">Recent Supporters</h3>
        <div className="text-center text-gray-400 text-sm py-6 border border-gray-700 rounded-md">
          Unable to load supporter data
        </div>
      </div>
    );
  }

  if (!supporters || supporters.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-yellow-400 text-lg font-semibold text-center">Recent Supporters</h3>
        <div className="text-center text-gray-400 text-sm py-6 border border-gray-700 rounded-md">
          No supporters yet. Be the first! ⚡
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-yellow-400 text-lg font-semibold text-center">Recent Supporters</h3>
      <div className="space-y-3">
        {supporters.slice(0, 10).map((supporter) => (
          <SupporterItem key={supporter.pubkey} supporter={supporter} />
        ))}
      </div>
    </div>
  );
}