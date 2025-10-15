import { useState } from 'react';
import { useFavoriteRelays, type RelaySet } from '@/providers/FavoriteRelaysProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  GripVertical,
  X,
  Check,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { normalizeUrl, isWebsocketUrl } from '@/lib/relayUtils';

interface RelaySetItemProps {
  relaySet: RelaySet;
}

function RelaySetItem({ relaySet }: RelaySetItemProps) {
  const { updateRelaySet, deleteRelaySet } = useFavoriteRelays();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(relaySet.name);
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    
    setIsLoading(true);
    try {
      await updateRelaySet({
        ...relaySet,
        name: editName.trim()
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update relay set name:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRelay = async () => {
    const normalizedUrl = normalizeUrl(newRelayUrl.trim());
    
    if (!isWebsocketUrl(normalizedUrl)) {
      setError('Please enter a valid WebSocket URL');
      return;
    }

    if (relaySet.relayUrls.includes(normalizedUrl)) {
      setError('This relay is already in the set');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await updateRelaySet({
        ...relaySet,
        relayUrls: [...relaySet.relayUrls, normalizedUrl]
      });
      setNewRelayUrl('');
    } catch (err) {
      setError('Failed to add relay');
      console.error('Failed to add relay to set:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRelay = async (urlToRemove: string) => {
    setIsLoading(true);
    try {
      await updateRelaySet({
        ...relaySet,
        relayUrls: relaySet.relayUrls.filter(url => url !== urlToRemove)
      });
    } catch (err) {
      console.error('Failed to remove relay from set:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the relay set "${relaySet.name}"?`)) {
      setIsLoading(true);
      try {
        await deleteRelaySet(relaySet.id);
      } catch (err) {
        console.error('Failed to delete relay set:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 h-auto"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="h-8 w-40"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h4 className="font-semibold">{relaySet.name}</h4>
            )}

            <span className="text-sm text-muted-foreground">
              ({relaySet.relayUrls.length} relay{relaySet.relayUrls.length !== 1 ? 's' : ''})
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Existing relays */}
            {relaySet.relayUrls.map((url) => (
              <div key={url} className="flex items-center gap-2 p-2 border rounded">
                <div className="flex-1 text-sm font-mono truncate">{url}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRelay(url)}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add new relay */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add relay to set (e.g., wss://relay.example.com)"
                  value={newRelayUrl}
                  onChange={(e) => {
                    setNewRelayUrl(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddRelay();
                  }}
                  className={error ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleAddRelay}
                  disabled={!newRelayUrl.trim() || isLoading}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function RelaySetList() {
  const { relaySets, isLoading } = useFavoriteRelays();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Loading relay sets...</div>
        </CardContent>
      </Card>
    );
  }

  if (relaySets.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            No relay sets yet. Create a relay set to organize your relays.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {relaySets.map((relaySet) => (
        <RelaySetItem key={relaySet.id} relaySet={relaySet} />
      ))}
    </div>
  );
}