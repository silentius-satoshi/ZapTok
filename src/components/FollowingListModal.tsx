import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthors } from '@/hooks/useAuthors';
import { genUserName } from '@/lib/genUserName';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface FollowingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkeys: string[];
  followingCount?: number | null;
}

export function FollowingListModal({ isOpen, onClose, pubkeys, followingCount }: FollowingListModalProps) {
  const authors = useAuthors(pubkeys);
  const navigate = useNavigate();

  // Refetch author metadata when modal opens
  useEffect(() => {
    if (isOpen && pubkeys.length > 0) {
      authors.refetch();
    }
  }, [isOpen]); // Only depend on isOpen, not authors.refetch to avoid loops

  const handleProfileClick = (pubkey: string) => {
    navigate(`/profile/${pubkey}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Following ({followingCount?.toLocaleString() || pubkeys.length})</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            View the list of users being followed
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-3">
            {authors.isLoading ? (
              // Loading skeletons
              Array.from({ length: Math.min(10, pubkeys.length) }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            ) : pubkeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Not following anyone yet</p>
              </div>
            ) : (
              authors.data?.map((author) => {
                const displayName = author.metadata?.display_name || author.metadata?.name || genUserName(author.pubkey);
                const userName = author.metadata?.name || genUserName(author.pubkey);
                const profileImage = author.metadata?.picture;
                const about = author.metadata?.about;
                
                return (
                  <div
                    key={author.pubkey}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleProfileClick(author.pubkey)}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profileImage} alt={displayName} />
                      <AvatarFallback className="text-sm">
                        {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{displayName}</p>
                      {userName !== displayName && (
                        <p className="text-xs text-muted-foreground truncate">@{userName}</p>
                      )}
                      {about && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{about}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer showing accurate count from Primal */}
        {!authors.isLoading && pubkeys.length > 0 && (
          <div className="pt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {followingCount && pubkeys.length !== followingCount
                ? `Showing ${pubkeys.length} of ${followingCount.toLocaleString()} following · Count from Primal`
                : `All ${pubkeys.length} following`
              }
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
