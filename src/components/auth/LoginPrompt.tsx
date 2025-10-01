import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Lock, Zap, Heart, MessageCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginPromptProps {
  className?: string;
  message?: string;
  description?: string;
  action?: string;
  icon?: 'user' | 'lock' | 'zap' | 'heart' | 'message' | 'share';
  variant?: 'inline' | 'card' | 'minimal';
  onLoginClick?: () => void;
}

const iconMap = {
  user: User,
  lock: Lock,
  zap: Zap,
  heart: Heart,
  message: MessageCircle,
  share: Share2,
};

export function LoginPrompt({
  className,
  message = "Login required",
  description = "Please sign in to access this feature",
  action = "Sign In",
  icon = 'user',
  variant = 'inline',
  onLoginClick
}: LoginPromptProps) {
  const IconComponent = iconMap[icon];

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <IconComponent className="w-4 h-4" />
        <span className="text-sm">{message}</span>
        {onLoginClick && (
          <Button
            size="sm" 
            variant="ghost" 
            onClick={onLoginClick}
            className="text-primary hover:text-primary/80"
          >
            {action}
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 w-fit">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg">{message}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        {onLoginClick && (
          <CardContent className="pt-0 text-center">
            <Button onClick={onLoginClick} className="w-full">
              <User className="w-4 h-4 mr-2" />
              {action}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // Default inline variant
  return (
    <div className={cn("flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-dashed", className)}>
      <div className="flex items-center gap-3">
        <IconComponent className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{message}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {onLoginClick && (
        <Button size="sm" onClick={onLoginClick}>
          {action}
        </Button>
      )}
    </div>
  );
}

// Specific prompt components for common scenarios
export function VideoInteractionPrompt({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <LoginPrompt
      message="Join the conversation"
      description="Login to like, comment, and share videos"
      action="Sign In"
      icon="heart"
      onLoginClick={onLoginClick}
    />
  );
}

export function VideoPostingPrompt({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <LoginPrompt
      message="Share your creativity"
      description="Login to post videos and build your following"
      action="Get Started"
      icon="share"
      variant="card"
      onLoginClick={onLoginClick}
    />
  );
}

export function ZapPrompt({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <LoginPrompt
      message="Support creators"
      description="Login to send Bitcoin zaps to your favorite creators"
      action="Sign In"
      icon="zap"
      onLoginClick={onLoginClick}
    />
  );
}

export function CommentPrompt({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <LoginPrompt
      message="Join the discussion"
      description="Login to comment and reply"
      action="Sign In"
      icon="message"
      variant="minimal"
      onLoginClick={onLoginClick}
    />
  );
}