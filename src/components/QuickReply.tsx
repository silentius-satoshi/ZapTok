import React, { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePublishComment } from '@/hooks/usePublishComment';
import { useEvent } from '@/hooks/useEvent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface QuickReplyProps {
  /** The event ID that this reply is responding to */
  eventId: string;
  /** Optional: If this is a reply to a comment rather than the original post */
  parentCommentId?: string;
  /** Custom className for the reply button */
  className?: string;
}

export function QuickReply({ eventId, parentCommentId, className }: QuickReplyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  // Fetch the original event (video or post)
  const { data: originalEvent, isLoading: isLoadingEvent } = useEvent(eventId);
  
  // Fetch parent comment if replying to a comment
  const { data: parentComment } = useEvent(parentCommentId || '');
  
  const { mutateAsync: publishComment } = usePublishComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !originalEvent || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await publishComment({
        content: content.trim(),
        videoEvent: originalEvent,
        parentComment: parentComment || undefined,
      });
      
      setContent('');
      setIsOpen(false);
      
      toast({
        title: "Reply sent!",
        description: "Your reply has been published.",
      });
    } catch (error) {
      console.error('Failed to publish reply:', error);
      toast({
        title: "Failed to send reply",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setIsOpen(false);
  };

  // Don't show reply button if user is not logged in or event is loading
  if (!user || isLoadingEvent) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Reply Button */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className={`h-8 px-3 text-muted-foreground hover:text-primary self-start ${className}`}
          title="Quick reply"
        >
          Reply
        </Button>
      )}

      {/* Reply Form */}
      {isOpen && (
        <div className="mt-2 p-4 border rounded-lg bg-background w-full max-w-2xl">
          <form onSubmit={handleSubmit}>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a quick reply..."
              className="min-h-[80px] resize-none text-sm w-full"
              maxLength={280}
              autoFocus
            />
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {content.length}/280
              </span>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 px-3"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  size="sm"
                  disabled={!content.trim() || isSubmitting}
                  className="h-8 px-3"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {isSubmitting ? 'Sending...' : 'Reply'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
