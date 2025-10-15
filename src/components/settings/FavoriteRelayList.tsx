import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';
import { useState } from 'react';

interface RelayItemProps {
  url: string;
  onRemove: () => void;
}

function RelayItem({ url, onRemove }: RelayItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{url}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={isRemoving}
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FavoriteRelayList() {
  const { favoriteRelays, removeFavoriteRelays, isLoading } = useFavoriteRelays();

  const handleRemoveRelay = async (url: string) => {
    await removeFavoriteRelays([url]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Loading favorite relays...</div>
        </CardContent>
      </Card>
    );
  }

  if (favoriteRelays.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            No favorite relays yet. Add some relays to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {favoriteRelays.map((url) => (
        <RelayItem
          key={url}
          url={url}
          onRemove={() => handleRemoveRelay(url)}
        />
      ))}
    </div>
  );
}