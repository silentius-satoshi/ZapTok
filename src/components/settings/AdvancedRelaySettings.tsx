import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Info } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useNostr } from '@nostrify/react';
import { useNostrConnectionState } from '@/components/NostrProvider';
import relayListService from '@/services/relayList.service';

export interface MailboxRelay {
  url: string;
  scope: 'read' | 'write' | 'both';
}

interface RelayListEvent {
  read: string[];
  write: string[];
  originalRelays: MailboxRelay[];
}

export function AdvancedRelaySettings() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { refreshUserRelayList, userRelayList } = useNostrConnectionState();
  
  const [relays, setRelays] = useState<MailboxRelay[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newRelayUrl, setNewRelayUrl] = useState('');

  // Load existing relay list on mount and when userRelayList changes
  useEffect(() => {
    if (!user) return;
    
    loadRelayList();
  }, [user, userRelayList]);

  const loadRelayList = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Use the shared relay list service instead of direct query
      const relayListConfig = await relayListService.getUserRelayList(user.pubkey, nostr);
      
      // Convert RelayListConfig to MailboxRelay format
      const parsedRelays = convertRelayListToMailboxRelays(relayListConfig);
      setRelays(parsedRelays);
    } catch (error) {
      console.error('Failed to load relay list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertRelayListToMailboxRelays = (relayListConfig: any): MailboxRelay[] => {
    const relayMap = new Map<string, MailboxRelay>();
    
    // Add read relays
    relayListConfig.read.forEach((url: string) => {
      const existing = relayMap.get(url);
      if (existing) {
        // If already exists as write, make it both
        existing.scope = existing.scope === 'write' ? 'both' : 'read';
      } else {
        relayMap.set(url, { url: normalizeRelayUrl(url), scope: 'read' });
      }
    });
    
    // Add write relays
    relayListConfig.write.forEach((url: string) => {
      const existing = relayMap.get(url);
      if (existing) {
        // If already exists as read, make it both
        existing.scope = existing.scope === 'read' ? 'both' : 'write';
      } else {
        relayMap.set(url, { url: normalizeRelayUrl(url), scope: 'write' });
      }
    });
    
    return Array.from(relayMap.values());
  };

  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('wss://') && !trimmed.startsWith('ws://')) {
      return `wss://${trimmed}`;
    }
    return trimmed;
  };

  const addRelay = () => {
    if (!newRelayUrl.trim()) return;
    
    const normalizedUrl = normalizeRelayUrl(newRelayUrl);
    
    // Check if relay already exists
    if (relays.some(r => r.url === normalizedUrl)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your list.',
        variant: 'destructive'
      });
      return;
    }

    setRelays(prev => [...prev, { url: normalizedUrl, scope: 'both' }]);
    setNewRelayUrl('');
    setHasChanges(true);
  };

  const removeRelay = (url: string) => {
    setRelays(prev => prev.filter(r => r.url !== url));
    setHasChanges(true);
  };

  const updateRelayScope = (url: string, scope: 'read' | 'write' | 'both') => {
    setRelays(prev => prev.map(r => r.url === url ? { ...r, scope } : r));
    setHasChanges(true);
  };

  const saveRelayList = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Create NIP-65 relay list event
      const tags = relays.map(relay => {
        const tag = ['r', relay.url];
        if (relay.scope !== 'both') {
          tag.push(relay.scope);
        }
        return tag;
      });

      const eventTemplate = {
        kind: 10002,
        content: '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      await user.signer.signEvent(eventTemplate).then(signedEvent => nostr.event(signedEvent));
      setHasChanges(false);
      
      // Clear the service cache to ensure fresh data - await to ensure deletion completes
      await relayListService.clearCache(user.pubkey);
      
      // Wait a moment for relay propagation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the relay list in NostrProvider with force refresh
      await refreshUserRelayList(true);
      
      // Reload local state with fresh data
      await loadRelayList();
      
      toast({
        title: 'Relay list saved',
        description: 'Your read/write relay configuration has been updated.',
      });
    } catch (error) {
      console.error('Failed to save relay list:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save your relay list. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRelayStats = () => {
    const readCount = relays.filter(r => r.scope === 'read' || r.scope === 'both').length;
    const writeCount = relays.filter(r => r.scope === 'write' || r.scope === 'both').length;
    return { readCount, writeCount };
  };

  const { readCount, writeCount } = getRelayStats();
  const showWarning = readCount > 4 || writeCount > 4;

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Relay Configuration
          </CardTitle>
          <CardDescription>
            Login required to manage your relay configuration
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Relay Configuration
        </CardTitle>
        <CardDescription>
          Configure separate read and write relays for optimal performance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
          {/* Information section */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Read relays</strong> are used to fetch events about you. Others publish events 
              they want you to see to your read relays.
            </p>
            <p>
              <strong>Write relays</strong> are used to publish your events. Others will look for 
              your events on your write relays.
            </p>
            <p>
              <strong>Recommended:</strong> Keep read and write relays between 2-4 each for optimal performance.
            </p>
          </div>

          {/* Warning for too many relays */}
          {showWarning && (
            <div className="p-4 border border-yellow-500/20 bg-yellow-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600 font-medium mb-1">
                <Info className="h-4 w-4" />
                Relay Configuration Warning
              </div>
              <p className="text-sm text-yellow-600">
                {readCount > 4 && `You have ${readCount} read relays. `}
                {writeCount > 4 && `You have ${writeCount} write relays. `}
                Most clients only use 2-4 relays, setting more may be unnecessary.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {readCount} Read
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {writeCount} Write
            </Badge>
          </div>

          {/* Relay list */}
          <div className="space-y-3">
            {relays.map((relay, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 truncate">
                  <div className="font-mono text-sm truncate">
                    {relay.url}
                  </div>
                </div>
                
                <Select 
                  value={relay.scope} 
                  onValueChange={(value: 'read' | 'write' | 'both') => updateRelayScope(relay.url, value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">R & W</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="write">Write</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRelay(relay.url)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new relay */}
          <div className="flex gap-2">
            <Input
              placeholder="wss://relay.example.com"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addRelay();
                }
              }}
            />
            <Button onClick={addRelay} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Save button */}
          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={saveRelayList} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
    </Card>
  );
}