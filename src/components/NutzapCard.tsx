import { useState } from 'react';
import { useReceivedNutzaps } from '@/hooks/useReceivedNutzaps';
import { useNutzapRedemption } from '@/hooks/useNutzapRedemption';
import { useAuthor } from '@/hooks/useAuthor';
import { formatBalance } from '@/lib/cashu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  Gift,
  Clock,
  CheckCircle,
  User,
  MessageSquare,
  RefreshCw,
  Loader2
} from 'lucide-react';
import type { ReceivedNutzap } from '@/hooks/useReceivedNutzaps';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface NutzapItemProps {
  nutzap: ReceivedNutzap;
  onRedeem: (nutzap: ReceivedNutzap) => void;
  isRedeeming: boolean;
}

function NutzapItem({ nutzap, onRedeem, isRedeeming }: NutzapItemProps) {
  const author = useAuthor(nutzap.senderPubkey);
  const metadata = author.data?.metadata;

  return (
    <div className="flex items-center space-x-3 py-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={metadata?.picture} />
        <AvatarFallback>
          {metadata?.name?.[0] || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium truncate">
                {metadata?.name || `${nutzap.senderPubkey.slice(0, 8)}...`}
              </p>
              <Badge 
                variant={nutzap.status === 'claimed' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {nutzap.status === 'claimed' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Clock className="h-3 w-3 mr-1" />
                )}
                {nutzap.status}
              </Badge>
            </div>
            
            {nutzap.comment && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate max-w-40">
                  {nutzap.comment}
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {new Date(nutzap.timestamp).toLocaleDateString()}
            </p>
          </div>
          
          <div className="text-right space-y-2">
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-600">
                {formatBalance(nutzap.amount)}
              </span>
            </div>
            
            {nutzap.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onRedeem(nutzap)}
                disabled={isRedeeming}
                className="h-7 px-2 text-xs"
              >
                {isRedeeming ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Claim'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface NutzapCardProps {
  limit?: number;
  showStats?: boolean;
  className?: string;
}

export function NutzapCard({ 
  limit = 10, 
  showStats = true,
  className 
}: NutzapCardProps) {
  const { 
    nutzaps, 
    isLoading, 
    refetch, 
    unclaimedCount, 
    totalUnclaimed 
  } = useReceivedNutzaps();
  const { redeemNutzap, isRedeeming } = useNutzapRedemption();
  const { toast } = useToast();
  
  const [redeemingNutzapId, setRedeemingNutzapId] = useState<string | null>(null);

  const displayNutzaps = limit ? nutzaps.slice(0, limit) : nutzaps;

  const handleRedeem = async (nutzap: ReceivedNutzap) => {
    try {
      setRedeemingNutzapId(nutzap.id);
      await redeemNutzap(nutzap);
      
      toast({
        title: "Nutzap claimed!",
        description: `Successfully claimed ${formatBalance(nutzap.amount)} sats`
      });
    } catch (err) {
      toast({
        title: "Failed to claim nutzap",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setRedeemingNutzapId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Received Nutzaps</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showStats && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          )}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Received Nutzaps</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Section */}
        {showStats && (unclaimedCount > 0 || totalUnclaimed > 0) && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-800 dark:text-orange-200">
                  Unclaimed
                </span>
              </div>
              <p className="text-sm font-semibold text-orange-600">
                {unclaimedCount} nutzap{unclaimedCount !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-800 dark:text-orange-200">
                  Total Value
                </span>
              </div>
              <p className="text-sm font-semibold text-orange-600">
                {formatBalance(totalUnclaimed)} sats
              </p>
            </div>
          </div>
        )}

        {/* Nutzaps List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Recent Nutzaps</h4>
            {nutzaps.length > limit && (
              <Button variant="ghost" size="sm" className="text-xs">
                View All ({nutzaps.length})
              </Button>
            )}
          </div>
          
          {displayNutzaps.length === 0 ? (
            <div className="py-8 text-center">
              <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                No nutzaps received yet
              </p>
              <p className="text-xs text-muted-foreground">
                Share your npub to start receiving nutzaps!
              </p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-0">
                {displayNutzaps.map((nutzap, index) => (
                  <div key={nutzap.id}>
                    <NutzapItem
                      nutzap={nutzap}
                      onRedeem={handleRedeem}
                      isRedeeming={redeemingNutzapId === nutzap.id}
                    />
                    {index < displayNutzaps.length - 1 && (
                      <div className="border-b border-border/50" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Claim All Button */}
        {unclaimedCount > 1 && (
          <div className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Implement bulk claim functionality
                const unclaimedNutzaps = nutzaps.filter(n => n.status === 'pending');
                unclaimedNutzaps.forEach(nutzap => handleRedeem(nutzap));
              }}
              disabled={isRedeeming}
              className="w-full"
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Claiming All...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Claim All ({unclaimedCount})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}