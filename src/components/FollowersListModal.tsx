import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Users, Search } from "lucide-react";
import { usePrimalFollowers } from "@/hooks/usePrimalFollowers";
import { useAuthors } from "@/hooks/useAuthors";
import { useNavigate } from "react-router-dom";
import { genUserName } from "@/lib/genUserName";

interface FollowersListModalProps {
  pubkey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followerCount?: number | null;
}

export function FollowersListModal({
  pubkey,
  open,
  onOpenChange,
  followerCount,
}: FollowersListModalProps) {
  const { followers, isLoading, error, fetchFollowers } = usePrimalFollowers(pubkey);
  const authors = useAuthors(followers);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch followers when modal opens
  useEffect(() => {
    if (open && followers.length === 0 && !isLoading) {
      fetchFollowers();
    }
  }, [open, followers.length, isLoading, fetchFollowers]);

  // Refetch author metadata when modal opens
  useEffect(() => {
    if (open && followers.length > 0) {
      authors.refetch();
    }
  }, [open, followers.length]); // Only depend on open and followers.length

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleProfileClick = (pubkey: string) => {
    navigate(`/profile/${pubkey}`);
    onOpenChange(false);
  };

  // Filter authors based on search query
  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim() || !authors.data) {
      return authors.data || [];
    }

    const query = searchQuery.toLowerCase();
    return authors.data.filter((author) => {
      const displayName = (author.metadata?.display_name || author.metadata?.name || genUserName(author.pubkey)).toLowerCase();
      const userName = (author.metadata?.name || genUserName(author.pubkey)).toLowerCase();
      const nip05 = String(author.metadata?.nip05 || '').toLowerCase();
      
      return displayName.includes(query) || userName.includes(query) || nip05.includes(query);
    });
  }, [authors.data, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Followers {followerCount !== null && followerCount !== undefined ? `(${followerCount.toLocaleString()})` : ''}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            View the list of followers
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, username, or NIP-05..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-3">
            {isLoading || authors.isLoading ? (
              // Loading skeletons
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load followers. Please try again.
                </AlertDescription>
              </Alert>
            ) : followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No followers found</p>
                <p className="text-sm mt-2">
                  Follower data provided by Primal's indexing service
                </p>
              </div>
            ) : filteredAuthors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No results found</p>
                <p className="text-sm mt-2">Try a different search term</p>
              </div>
            ) : (
              filteredAuthors.map((author) => {
                if (!author || !author.pubkey) return null;
                
                const displayName = String(author.metadata?.display_name || author.metadata?.name || genUserName(author.pubkey));
                const userName = String(author.metadata?.name || genUserName(author.pubkey));
                const profileImage = author.metadata?.picture;
                const nip05 = author.metadata?.nip05;

                return (
                  <div
                    key={author.pubkey}
                    onClick={() => handleProfileClick(author.pubkey)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profileImage} alt={displayName} />
                      <AvatarFallback>
                        {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{userName}
                      </p>
                      {nip05 && typeof nip05 === 'string' && (
                        <p className="text-xs text-blue-400 truncate">✓ {nip05}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {!isLoading && !authors.isLoading && !error && followers.length > 0 && (
          <div className="pt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {searchQuery.trim() 
                ? `Showing ${filteredAuthors.length} of ${followers.length} results`
                : followers.length >= 1000 
                  ? `Showing first ${followers.length} followers · Data from Primal`
                  : followerCount && followers.length === followerCount 
                    ? `All ${followers.length} followers · Data from Primal`
                    : followerCount
                      ? `Showing ${followers.length} of ${followerCount.toLocaleString()} followers · Data from Primal`
                      : `${followers.length} followers · Data from Primal`
              }
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
