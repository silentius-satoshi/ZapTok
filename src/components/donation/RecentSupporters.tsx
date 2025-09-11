import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Supporter {
  id: string;
  name: string;
  avatar?: string;
  amount: number;
  comment?: string;
  timestamp: number;
  pubkey: string;
}

// Mock data for now - in production this would fetch from Nostr events
const mockSupporters: Supporter[] = [
  {
    id: '1',
    name: 'Anonymous',
    amount: 2100,
    comment: 'Great work on ZapTok! 🚀',
    timestamp: Date.now() - 3600000, // 1 hour ago
    pubkey: 'npub1...',
  },
  {
    id: '2',
    name: 'BitcoinBuilder',
    amount: 5000,
    comment: 'Keep building!',
    timestamp: Date.now() - 7200000, // 2 hours ago
    pubkey: 'npub2...',
  },
  {
    id: '3',
    name: 'NostrFan',
    amount: 1000,
    timestamp: Date.now() - 86400000, // 1 day ago
    pubkey: 'npub3...',
  },
];

export function RecentSupporters() {
  const { data: supporters, isLoading } = useQuery({
    queryKey: ['recent-supporters'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockSupporters;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatAmount = (sats: number): string => {
    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(sats % 1000 === 0 ? 0 : 1)}k`;
    }
    return sats.toString();
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 text-sm">Recent Supporters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-16" />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!supporters || supporters.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 text-sm">Recent Supporters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 text-sm py-4">
            No supporters yet. Be the first! ⚡
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 text-sm">Recent Supporters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {supporters.slice(0, 5).map((supporter) => (
          <div key={supporter.id} className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={supporter.avatar} />
              <AvatarFallback className="bg-gray-700 text-yellow-400 text-xs">
                {supporter.name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-white text-sm font-medium truncate">
                  {supporter.name}
                </div>
                <div className="text-yellow-400 text-xs font-semibold">
                  ⚡{formatAmount(supporter.amount)}
                </div>
              </div>
              
              {supporter.comment && (
                <div className="text-gray-300 text-xs mt-1 truncate">
                  "{supporter.comment}"
                </div>
              )}
              
              <div className="text-gray-500 text-xs mt-1">
                {dayjs(supporter.timestamp).fromNow()}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}