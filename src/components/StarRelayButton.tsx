import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider';
import { normalizeUrl } from '@/lib/relayUtils';
import { cn } from '@/lib/utils';

interface StarRelayButtonProps {
  relayUrl: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function StarRelayButton({ 
  relayUrl, 
  className,
  variant = 'ghost',
  size = 'sm'
}: StarRelayButtonProps) {
  const { favoriteRelays, addFavoriteRelays, removeFavoriteRelays } = useFavoriteRelays();
  const [isLoading, setIsLoading] = useState(false);

  const normalizedUrl = normalizeUrl(relayUrl);
  const isFavorited = favoriteRelays.includes(normalizedUrl);

  const handleToggleFavorite = async () => {
    if (!normalizedUrl) return;

    setIsLoading(true);
    try {
      if (isFavorited) {
        await removeFavoriteRelays([normalizedUrl]);
      } else {
        await addFavoriteRelays([normalizedUrl]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={cn(className)}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star 
        className={cn(
          'h-4 w-4',
          isFavorited && 'fill-current text-yellow-500'
        )} 
      />
    </Button>
  );
}