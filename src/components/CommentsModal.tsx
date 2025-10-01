import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Send, MessageCircle, Heart, Reply } from 'lucide-react';
import { NoteContent } from '@/components/NoteContent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVideoComments } from '@/hooks/useVideoComments';
import { usePublishComment } from '@/hooks/usePublishComment';
import { useAuthor } from '@/hooks/useAuthor';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { CommentPrompt } from '@/components/auth/LoginPrompt';
import { LoginModal } from '@/components/auth/LoginModal';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent } from '@nostrify/nostrify';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoEvent: NostrEvent;
}

export function CommentsModal({ isOpen, onClose, videoEvent }: CommentsModalProps) {
  const { user, canSign, isReadOnly } = useCurrentUser();
  const { withLoginCheck } = useLoginPrompt();
  const { data: commentsData, isLoading: isLoadingComments } = useVideoComments(videoEvent.id);
  const { mutate: publishComment, isPending: isPublishing } = usePublishComment();

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<NostrEvent | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    await withLoginCheck(async () => {
      await publishComment({
        content: commentText.trim(),
        videoEvent,
        parentComment: replyingTo || undefined,
      });

      setCommentText('');
      setReplyingTo(null);
    }, {
      loginMessage: 'Login required to comment',
      onLoginRequired: () => {
        // This would trigger the login modal
        console.log('Login required for commenting');
      }
    });
  };

  const handleReply = (comment: NostrEvent) => {
    withLoginCheck(() => {
      setReplyingTo(comment);
      // Focus will be handled by the effect when replyingTo changes
    }, {
      loginMessage: 'Login required to reply to comments'
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments ({commentsData?.commentCount || 0})
          </DialogTitle>
        </DialogHeader>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoadingComments ? (
            <CommentsLoadingSkeleton />
          ) : commentsData?.comments.length === 0 ? (
            <EmptyCommentsState />
          ) : (
            <div className="space-y-4">
              {commentsData?.comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={() => handleReply(comment)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        {canSign ? (
          <div className="border-t px-6 py-4 space-y-3">
            {replyingTo && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Replying to <CommentAuthorDisplay comment={replyingTo} />
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelReply}
                    className="h-6 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <CurrentUserAvatar />
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px] resize-none"
                  disabled={isPublishing}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {commentText.length}/280
                  </span>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || commentText.length > 280 || isPublishing}
                    size="sm"
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isPublishing ? 'Publishing...' : replyingTo ? 'Reply' : 'Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t px-6 py-4">
            <CommentPrompt 
              onLoginClick={() => setLoginModalOpen(true)}
            />
          </div>
        )}
      </DialogContent>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </Dialog>
  );
}

function CommentItem({ comment, onReply }: { comment: NostrEvent; onReply: () => void }) {
  const author = useAuthor(comment.pubkey);
  const { canSign } = useCurrentUser();

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.display_name || authorMetadata?.name || genUserName(comment.pubkey);
  const profilePicture = authorMetadata?.picture;

  const timeAgo = formatDistanceToNow(new Date(comment.created_at * 1000), { addSuffix: true });

  return (
    <div className="group space-y-2">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={profilePicture} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          <div className="text-sm">
            <NoteContent event={comment} />
          </div>

          <div className="flex items-center gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canSign && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                  className="h-6 px-2 text-xs gap-1 hover:bg-blue-500/10 hover:text-blue-500"
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1 hover:bg-red-500/10 hover:text-red-500"
                >
                  <Heart className="h-3 w-3" />
                  Like
                </Button>
              </>
            )}
            
            {!canSign && (
              <span className="text-xs text-muted-foreground">
                Login to reply and like comments
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentAuthorDisplay({ comment }: { comment: NostrEvent }) {
  const author = useAuthor(comment.pubkey);
  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.display_name || authorMetadata?.name || genUserName(comment.pubkey);

  return <span className="font-medium">{displayName}</span>;
}

function CurrentUserAvatar() {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey || '');

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.display_name || authorMetadata?.name || genUserName(user?.pubkey || '');
  const profilePicture = authorMetadata?.picture;

  return (
    <Avatar className="h-8 w-8 flex-shrink-0">
      <AvatarImage src={profilePicture} alt={displayName} />
      <AvatarFallback className="text-xs">
        {displayName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function CommentsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCommentsState() {
  return (
    <div className="col-span-full">
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium mb-2">No comments yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your thoughts on this video!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}