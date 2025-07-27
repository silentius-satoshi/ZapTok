import { useReceivedNutzaps } from '@/hooks/useReceivedNutzaps';
import { useNutzapRedemption } from '@/hooks/useNutzapRedemption';
import { useAuthor } from '@/hooks/useAuthor';
import { formatBalance } from '@/lib/cashu';
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
  Loader2
} from 'lucide-react';
import type { ReceivedNutzap } from '@/hooks/useReceivedNutzaps';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NutzapListItemProps {
  nutzap: ReceivedNutzap;
  onRedeem: (nutzap: ReceivedNutzap) => void;
  isRedeeming: boolean;
}

function NutzapListItem({ nutzap, onRedeem, isRedeeming }: NutzapListItemProps) {
  const author = useAuthor(nutzap.senderPubkey);
  const metadata = author.data?.metadata;

  return (
    <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card">
      <Avatar className="h-10 w-10">
        <AvatarImage src={metadata?.picture} />
        <AvatarFallback>
          {metadata?.name?.[0] || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
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
          
          <div className="flex items-center space-x-1">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-600">
              {formatBalance(nutzap.amount)}
            </span>
          </div>
        </div>
        
        {nutzap.comment && (
          <div className="flex items-start space-x-1">
            <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground break-words">
              {nutzap.comment}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {new Date(nutzap.timestamp).toLocaleDateString()} at{' '}
            {new Date(nutzap.timestamp).toLocaleTimeString()}
          </p>
          
          {nutzap.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => onRedeem(nutzap)}
              disabled={isRedeeming}
              className="h-7 px-3 text-xs"
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
  );
}

interface NutzapListProps {
  limit?: number;
  showEmpty?: boolean;
  className?: string;
}

export function NutzapList({ 
  limit,
  showEmpty = true,
  className 
}: NutzapListProps) {
  const { 
    nutzaps, 
    isLoading, 
    unclaimedCount, 
    totalUnclaimed 
  } = useReceivedNutzaps();
  const { redeemNutzap } = useNutzapRedemption();
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
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-3 p-4 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-48" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayNutzaps.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <div className={cn("py-12 text-center", className)}>
        <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground mb-2">
          No nutzaps received yet
        </p>
        <p className="text-sm text-muted-foreground">
          Share your npub to start receiving nutzaps from friends!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Header */}
      {(unclaimedCount > 0 || totalUnclaimed > 0) && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800 dark:text-orange-200">
                {unclaimedCount} unclaimed nutzap{unclaimedCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-orange-600">
                {formatBalance(totalUnclaimed)} sats
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nutzap List */}
      <ScrollArea className="max-h-96">
        <div className="space-y-3">
          {displayNutzaps.map((nutzap) => (
            <NutzapListItem
              key={nutzap.id}
              nutzap={nutzap}
              onRedeem={handleRedeem}
              isRedeeming={redeemingNutzapId === nutzap.id}
            />
          ))}
        </div>
      </ScrollArea>

      {/* View More */}
      {nutzaps.length > displayNutzaps.length && (
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {displayNutzaps.length} of {nutzaps.length} nutzaps
          </p>
        </div>
      )}
    </div>
  );
}