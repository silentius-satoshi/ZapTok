import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserAvatarProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function UserAvatar({ userId, size = 'medium', className }: UserAvatarProps) {
  const { data: authorData } = useAuthor(userId);
  
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const displayName = authorData?.metadata?.name || 
                     authorData?.metadata?.display_name || 
                     genUserName(userId);

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={authorData?.metadata?.picture} 
        alt={displayName}
      />
      <AvatarFallback className="bg-orange-500 text-white text-xs">
        {displayName.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}