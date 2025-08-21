import { useState, useEffect, useMemo } from 'react';
import { Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useUserSearch } from '@/hooks/useUserSearch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { genUserName } from '@/lib/genUserName';

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom debounce hook
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSearchModal({ open, onOpenChange }: UserSearchModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query.trim(), 300); // 300ms debounce
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: followUser } = useFollowUser();
  const following = useFollowing(user?.pubkey || '');
  const navigate = useNavigate();
  const { config, setRelayContext } = useAppContext();

  // Temporarily switch to search-only context when modal is open for user search
  // But don't override if we're already in a search-compatible context
  useEffect(() => {
    if (open) {
      // Only switch to search-only if we're in 'none' context
      // This prevents conflicts with route-based context switching
      if (config.relayContext === 'none') {
        setRelayContext('search-only');
      }
    } else {
      // When modal closes, if we set it to search-only, reset to none
      // (route-based logic will handle setting the correct context)
      if (config.relayContext === 'search-only') {
        setRelayContext('none');
      }
    }
  }, [open, config.relayContext, setRelayContext]);

  // Use the useUserSearch hook with debounced query
  const { data: results = [], isLoading } = useUserSearch(debouncedQuery);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuery('');
    }
    onOpenChange(newOpen);
  };

  const handleFollow = (pubkey: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to follow users",
        variant: "destructive",
      });
      return;
    }

    const followingPubkeys = following.data?.pubkeys || [];
    const isCurrentlyFollowing = followingPubkeys.length > 0 && followingPubkeys.includes(pubkey);

    followUser({
      pubkeyToFollow: pubkey,
      isCurrentlyFollowing: isCurrentlyFollowing,
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: isCurrentlyFollowing ? "User unfollowed successfully" : "User followed successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to follow user",
          variant: "destructive",
        });
      },
    });
  };

  const handleUserClick = (pubkey: string) => {
    // Close the modal first
    onOpenChange(false);
    // Navigate to the user's profile
    navigate(`/profile/${pubkey}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
        aria-describedby="user-search-description"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Direct User Search
          </DialogTitle>
          <p id="user-search-description" className="text-sm text-muted-foreground sr-only">
            Search for Nostr users by entering their npub or public key
          </p>
        </DialogHeader>

        <div className="flex-shrink-0 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter npub or pubkey..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {!debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Enter a npub or pubkey to search for users
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length === 0 && debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No user found with that identifier
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => {
                const displayName = result.metadata?.display_name || result.metadata?.name || genUserName(result.pubkey);
                const userName = result.metadata?.name || genUserName(result.pubkey);
                const about = result.metadata?.about;
                const nip05 = result.metadata?.nip05;
                const avatar = result.metadata?.picture;

                return (
                  <Card key={result.pubkey} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={() => handleUserClick(result.pubkey)}
                        >
                          <AvatarImage src={avatar} alt={displayName} />
                          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleUserClick(result.pubkey)}
                            >
                              {displayName}
                            </h3>
                            {nip05 && (
                              <Badge variant="secondary" className="text-xs">
                                {nip05}
                              </Badge>
                            )}
                          </div>

                          {userName !== displayName && (
                            <p
                              className="text-xs text-muted-foreground truncate mb-1 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleUserClick(result.pubkey)}
                            >
                              @{userName}
                            </p>
                          )}

                          {about && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {about}
                            </p>
                          )}

                          {result.followedBy.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Followed by {result.followedBy.length} user{result.followedBy.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {user && result.pubkey !== user.pubkey && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFollow(result.pubkey)}
                              className="text-xs"
                            >
                              {(() => {
                                const followingPubkeys = following.data?.pubkeys || [];
                                const isCurrentlyFollowing = followingPubkeys.length > 0 && followingPubkeys.includes(result.pubkey);
                                return isCurrentlyFollowing ? 'Unfollow' : 'Follow';
                              })()}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
