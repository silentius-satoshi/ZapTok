# Nostr Comments Implementation Guide

This guide provides patterns and best practices for implementing comment systems using Nostr protocol.

## Overview

Nostr comment systems use NIP-22 (Comment kind 1111) to create threaded discussions that can be attached to any Nostr event or external URL. This enables decentralized commenting across the web.

## Core Components

### Comment Events (Kind 1111)

Comments in Nostr are special events with kind 1111 that reference a root event or URL:

```json
{
  "kind": 1111,
  "content": "This is a great article!",
  "tags": [
    ["e", "root_event_id", "", "root"],
    ["e", "parent_comment_id", "", "reply"],
    ["p", "author_pubkey"],
    ["client", "your-app-name"]
  ]
}
```

### Tag Structure

- **Root reference**: `["e", "event_id", "", "root"]` - Links to the original content
- **Reply reference**: `["e", "parent_id", "", "reply"]` - Links to parent comment for threading
- **Author mention**: `["p", "author_pubkey"]` - Mentions the author being replied to
- **URL reference**: `["r", "https://example.com/article"]` - For commenting on external URLs

## Implementation Patterns

### 1. Comments Hook

Create a hook to fetch and organize comments:

```typescript
function useComments(root: NostrEvent | URL, limit: number = 500) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['comments', getRootId(root)],
    queryFn: async ({ signal }) => {
      const filters = buildCommentFilters(root, limit);
      const events = await nostr.query(filters, { signal });
      
      return organizeComments(events);
    },
  });
}

function buildCommentFilters(root: NostrEvent | URL, limit: number) {
  if (root instanceof URL) {
    return [{ kinds: [1111], '#r': [root.toString()], limit }];
  } else {
    return [{ kinds: [1111], '#e': [root.id], limit }];
  }
}
```

### 2. Comment Threading

Organize comments into threaded structure:

```typescript
interface CommentData {
  topLevelComments: NostrEvent[];
  getDirectReplies: (commentId: string) => NostrEvent[];
  getRootReference: (comment: NostrEvent) => string | null;
}

function organizeComments(events: NostrEvent[]): CommentData {
  const commentMap = new Map<string, NostrEvent>();
  const replyMap = new Map<string, NostrEvent[]>();
  const topLevel: NostrEvent[] = [];

  events.forEach(event => {
    commentMap.set(event.id, event);
    
    const replyTag = event.tags.find(tag => 
      tag[0] === 'e' && tag[3] === 'reply'
    );
    
    if (replyTag) {
      const parentId = replyTag[1];
      if (!replyMap.has(parentId)) {
        replyMap.set(parentId, []);
      }
      replyMap.get(parentId)!.push(event);
    } else {
      topLevel.push(event);
    }
  });

  return {
    topLevelComments: topLevel.sort((a, b) => b.created_at - a.created_at),
    getDirectReplies: (commentId: string) => 
      replyMap.get(commentId)?.sort((a, b) => a.created_at - b.created_at) || [],
    getRootReference: (comment: NostrEvent) => 
      comment.tags.find(tag => tag[0] === 'e' && tag[3] === 'root')?.[1] || null,
  };
}
```

### 3. Publishing Comments

Hook for posting new comments and replies:

```typescript
function usePostComment() {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();

  return useMutation({
    mutationFn: async ({ 
      content, 
      root, 
      reply 
    }: {
      content: string;
      root: NostrEvent | URL;
      reply?: NostrEvent;
    }) => {
      if (!user) throw new Error('Must be logged in to comment');

      const tags: string[][] = [['client', 'your-app-name']];

      // Add root reference
      if (root instanceof URL) {
        tags.push(['r', root.toString()]);
      } else {
        tags.push(['e', root.id, '', 'root']);
        tags.push(['p', root.pubkey]);
      }

      // Add reply reference if replying to a comment
      if (reply) {
        tags.push(['e', reply.id, '', 'reply']);
        tags.push(['p', reply.pubkey]);
      }

      return publishEvent({
        kind: 1111,
        content,
        tags,
      });
    },
  });
}
```

## UI Components

### Comment Display Component

```tsx
function Comment({ 
  comment, 
  replies, 
  onReply, 
  depth = 0 
}: {
  comment: NostrEvent;
  replies: NostrEvent[];
  onReply: (comment: NostrEvent) => void;
  depth?: number;
}) {
  const author = useAuthor(comment.pubkey);
  const [showReplies, setShowReplies] = useState(depth < 2);

  return (
    <div className={cn("border-l-2 border-gray-200", depth > 0 && "ml-4 pl-4")}>
      <div className="flex items-start space-x-3 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.data?.picture} />
          <AvatarFallback>
            {author.data?.display_name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">
              {author.data?.display_name || author.data?.name || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          
          <div className="text-sm whitespace-pre-wrap break-words mb-2">
            <NoteContent event={comment} />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment)}
              className="text-xs h-6 px-2"
            >
              Reply
            </Button>
            
            {replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs h-6 px-2"
              >
                {showReplies ? 'Hide' : 'Show'} {replies.length} replies
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {showReplies && replies.map(reply => (
        <Comment
          key={reply.id}
          comment={reply}
          replies={getDirectReplies(reply.id)}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
```

### Comments Section Component

```tsx
function CommentsSection({ 
  root, 
  title = "Comments",
  emptyStateMessage = "No comments yet",
  className,
  limit = 500
}: {
  root: NostrEvent | URL;
  title?: string;
  emptyStateMessage?: string;
  className?: string;
  limit?: number;
}) {
  const { user } = useCurrentUser();
  const { data: commentsData, isLoading } = useComments(root, limit);
  const { mutate: postComment } = usePostComment();
  const [replyTo, setReplyTo] = useState<NostrEvent | null>(null);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    postComment(
      { content: newComment, root, reply: replyTo },
      {
        onSuccess: () => {
          setNewComment('');
          setReplyTo(null);
        },
      }
    );
  };

  if (isLoading) {
    return <CommentsSkeleton />;
  }

  const topLevelComments = commentsData?.topLevelComments || [];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-gray-500">
          {topLevelComments.length} comments
        </span>
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {replyTo && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              Replying to {getAuthorName(replyTo)}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="ml-2 h-5 w-5 p-0"
              >
                ×
              </Button>
            </div>
          )}
          
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
            className="min-h-[80px]"
          />
          
          <div className="flex justify-end">
            <Button type="submit" disabled={!newComment.trim()}>
              {replyTo ? 'Reply' : 'Comment'}
            </Button>
          </div>
        </form>
      )}

      {topLevelComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyStateMessage}</p>
          {!user && (
            <p className="mt-2 text-sm">
              <LoginArea className="inline-flex" /> to join the discussion
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map(comment => (
            <Comment
              key={comment.id}
              comment={comment}
              replies={commentsData.getDirectReplies(comment.id)}
              onReply={setReplyTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Performance Optimization

- **Limit queries**: Use reasonable limits (500-1000 comments max)
- **Pagination**: Implement "Load more" for large comment threads
- **Caching**: Use React Query caching for comment data
- **Virtual scrolling**: For very large comment sections

### 2. User Experience

- **Auto-expand**: Show first 2 levels of replies by default
- **Collapse threads**: Allow users to collapse reply chains
- **Reply context**: Show who/what is being replied to
- **Real-time updates**: Invalidate queries when new comments are posted

### 3. Content Moderation

- **Client-side filtering**: Filter out spam or inappropriate content
- **User blocking**: Allow users to hide comments from blocked users
- **Report functionality**: Let users report problematic content

### 4. Accessibility

- **Semantic HTML**: Use proper heading structure
- **Keyboard navigation**: Ensure all interactions are keyboard accessible
- **Screen reader support**: Provide proper ARIA labels
- **Focus management**: Handle focus for reply forms and actions

## Error Handling

```typescript
function useComments(root: NostrEvent | URL, limit: number = 500) {
  return useQuery({
    queryKey: ['comments', getRootId(root)],
    queryFn: async ({ signal }) => {
      try {
        const filters = buildCommentFilters(root, limit);
        const events = await nostr.query(filters, { signal });
        return organizeComments(events);
      } catch (error) {
        if (error.name === 'AbortError') {
          throw error; // Let React Query handle abort
        }
        console.error('Failed to load comments:', error);
        throw new Error('Failed to load comments');
      }
    },
    retry: 3,
    retryDelay: 1000,
  });
}
```

## Security Considerations

- **Event validation**: Validate comment events before processing
- **Rate limiting**: Implement client-side rate limiting for comment posting
- **Content sanitization**: Sanitize user input when displaying
- **Relay security**: Use trusted relays for comment storage

This guide provides a foundation for building robust, user-friendly comment systems using Nostr protocol. Adapt the patterns to fit your specific application needs.