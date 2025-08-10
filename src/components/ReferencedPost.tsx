import React from 'react';
import { useEvent } from '@/hooks/useEvent';
import { Skeleton } from '@/components/ui/skeleton';
import { validateVideoEvent } from '@/lib/validateVideoEvent';
import { NoteContent } from '@/components/NoteContent';

interface ReferencedPostProps {
  eventId: string;
  className?: string;
}

export const ReferencedPost: React.FC<ReferencedPostProps> = ({ eventId, className = "" }) => {
  const { data: event, isLoading } = useEvent(eventId);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`text-muted-foreground text-sm ${className}`}>
        Post not found or no longer available
      </div>
    );
  }

  // Handle video events (kind 34235)
  if (event.kind === 34235) {
    const validatedEvent = validateVideoEvent(event);
    if (validatedEvent) {
      const title = validatedEvent.title || "Untitled Video";
      const description = validatedEvent.description;
      
      return (
        <div className={`text-muted-foreground text-sm ${className}`}>
          <div className="font-medium text-foreground">🎥 {title}</div>
          {description && (
            <div className="mt-1 line-clamp-2">
              {description}
            </div>
          )}
        </div>
      );
    }
  }

  // Handle text notes (kind 1)
  if (event.kind === 1) {
    const content = event.content.trim();
    if (!content) {
      return (
        <div className={`text-muted-foreground text-sm ${className}`}>
          Empty post
        </div>
      );
    }

    return (
      <div className={`text-muted-foreground text-sm ${className}`}>
        <div className="line-clamp-2">
          <NoteContent event={event} />
        </div>
      </div>
    );
  }

  // Handle comments (kind 1111)
  if (event.kind === 1111) {
    const content = event.content.trim();
    if (!content) {
      return (
        <div className={`text-muted-foreground text-sm ${className}`}>
          Empty comment
        </div>
      );
    }

    return (
      <div className={`text-muted-foreground text-sm ${className}`}>
        <div className="line-clamp-2">
          💬 <NoteContent event={event} />
        </div>
      </div>
    );
  }

  // Handle other event types
  return (
    <div className={`text-muted-foreground text-sm ${className}`}>
      Post (kind {event.kind})
    </div>
  );
};
