import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { ZAPTOK_CONFIG } from '@/constants';
import type { NostrEvent } from '@nostrify/nostrify';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ZapInfo {
  senderPubkey?: string;
  recipientPubkey?: string;
  amount: number;
  comment?: string;
}

interface Supporter {
  pubkey: string;
  amount: number;
  comment?: string;
  timestamp: number;
}

/**
 * Parse zap receipt event to extract payment information
 * Simplified version based on Jumble's implementation
 */
function getZapInfoFromEvent(zapReceipt: NostrEvent): ZapInfo | null {
  if (zapReceipt.kind !== 9735) return null;

  let senderPubkey: string | undefined;
  let recipientPubkey: string | undefined;
  let amount = 0;
  let comment: string | undefined;
  let description: string | undefined;

  try {
    zapReceipt.tags.forEach((tag) => {
      const [tagName, tagValue] = tag;
      switch (tagName) {
        case 'P': // Sender pubkey (from zap request)
          senderPubkey = tagValue;
          break;
        case 'p': // Recipient pubkey
          recipientPubkey = tagValue;
          break;
        case 'description': // Zap request (contains comment)
          description = tagValue;
          break;
        case 'amount': // Amount in millisats
          amount = parseInt(tagValue) / 1000; // Convert to sats
          break;
      }
    });

    // Parse description to get comment from zap request
    if (description) {
      try {
        const zapRequest = JSON.parse(description);
        comment = zapRequest.content;
        if (!senderPubkey) {
          senderPubkey = zapRequest.pubkey;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return {
      senderPubkey,
      recipientPubkey,
      amount,
      comment
    };
  } catch {
    return null;
  }
}

/**
 * Hook to fetch recent supporters - simplified like Jumble
 */
function useRecentSupporters() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['recent-supporters'],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);

      try {
        // Query zap receipts sent to the ZapTok developer
        const events = await nostr.query([
          {
            kinds: [9735], // Zap receipts
            '#p': [ZAPTOK_CONFIG.DEV_PUBKEY], // Zaps to developer
            limit: 100,
            since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // Last 30 days
          }
        ], { signal });

        // Sort by most recent
        events.sort((a, b) => b.created_at - a.created_at);

        // Group by sender and aggregate amounts
        const supporterMap = new Map<string, Supporter>();

        events.forEach((event) => {
          const info = getZapInfoFromEvent(event);
          if (!info || !info.senderPubkey || info.amount < 1000) {
            return; // Skip invalid zaps or amounts less than 1k sats
          }

          const existing = supporterMap.get(info.senderPubkey);
          if (!existing) {
            supporterMap.set(info.senderPubkey, {
              pubkey: info.senderPubkey,
              amount: info.amount,
              comment: info.comment,
              timestamp: event.created_at * 1000
            });
          } else {
            existing.amount += info.amount;
            // Keep the most recent comment
            if (event.created_at * 1000 > existing.timestamp) {
              existing.comment = info.comment || existing.comment;
              existing.timestamp = event.created_at * 1000;
            }
          }
        });

        // Convert to array and sort by amount
        return Array.from(supporterMap.values())
          .sort((a, b) => b.amount - a.amount);

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
function SupporterItem({ supporter }: { supporter: Supporter }) {
  const author = useAuthor(supporter.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || metadata?.display_name || `User ${supporter.pubkey.slice(0, 8)}`;
  const profileImage = metadata?.picture;

  const formatAmount = (amount: number): string => {
    if (amount >= 1000) {
      const k = amount / 1000;
      return k >= 10 ? `${Math.floor(k)}k` : `${k.toFixed(1)}k`;
    }
    return amount.toString();
  };

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
        {formatAmount(supporter.amount)} sats
      </div>
    </div>
  );
}

export function RecentSupporters() {
  const { data: supporters, isLoading, error } = useRecentSupporters();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-yellow-400 text-lg font-semibold">Recent Supporters</h3>
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
        <h3 className="text-yellow-400 text-lg font-semibold">Recent Supporters</h3>
        <div className="text-center text-gray-400 text-sm py-6 border border-gray-700 rounded-md">
          Unable to load supporter data
        </div>
      </div>
    );
  }

  if (!supporters || supporters.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-yellow-400 text-lg font-semibold">Recent Supporters</h3>
        <div className="text-center text-gray-400 text-sm py-6 border border-gray-700 rounded-md">
          No supporters yet. Be the first! ⚡
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-yellow-400 text-lg font-semibold">Recent Supporters</h3>
      <div className="space-y-3">
        {supporters.slice(0, 10).map((supporter) => (
          <SupporterItem key={supporter.pubkey} supporter={supporter} />
        ))}
      </div>
    </div>
  );
}