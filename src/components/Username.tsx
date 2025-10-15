import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';

interface UsernameProps {
  userId: string;
  className?: string;
}

export default function Username({ userId, className }: UsernameProps) {
  const { data: authorData } = useAuthor(userId);
  
  const displayName = authorData?.metadata?.name || 
                     authorData?.metadata?.display_name || 
                     genUserName(userId);

  return (
    <span className={`font-medium ${className}`}>
      {displayName}
    </span>
  );
}