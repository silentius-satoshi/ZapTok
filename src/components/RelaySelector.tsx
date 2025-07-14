import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/hooks/useAppContext';
import { cn } from '@/lib/utils';

interface RelaySelectProps {
  className?: string;
}

export function RelaySelector({ className }: RelaySelectProps) {
  const { config, addRelay, removeRelay, presetRelays = [] } = useAppContext();
  const [customRelay, setCustomRelay] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleToggleRelay = (relayUrl: string) => {
    if (config.relayUrls.includes(relayUrl)) {
      // Don't allow removing the last relay
      if (config.relayUrls.length > 1) {
        removeRelay(relayUrl);
      }
    } else {
      addRelay(relayUrl);
    }
  };

  const handleAddCustomRelay = () => {
    const normalizedUrl = normalizeRelayUrl(customRelay);
    if (normalizedUrl && !config.relayUrls.includes(normalizedUrl)) {
      addRelay(normalizedUrl);
      setCustomRelay('');
      setShowCustomInput(false);
    }
  };

  const handleRemoveRelay = (relayUrl: string) => {
    if (config.relayUrls.length > 1) {
      removeRelay(relayUrl);
    }
  };

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    
    // If it already has a protocol, return as is
    if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
      return trimmed;
    }
    
    // Otherwise, add wss:// prefix
    return `wss://${trimmed}`;
  };

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader>
        <CardTitle className="text-base">Relay Selection</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose one or more relays to connect to
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Relays */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Connected Relays</Label>
          <div className="flex flex-wrap gap-2">
            {config.relayUrls.map((url) => (
              <Badge key={url} variant="secondary" className="pr-1">
                <span className="truncate max-w-[120px]" title={url}>
                  {presetRelays.find(r => r.url === url)?.name || url.replace('wss://', '')}
                </span>
                {config.relayUrls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveRelay(url)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preset Relays */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Popular Relays</Label>
          <div className="space-y-2">
            {presetRelays.map((relay) => (
              <div key={relay.url} className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0 rounded-full border',
                    config.relayUrls.includes(relay.url)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-muted-foreground/20'
                  )}
                  onClick={() => handleToggleRelay(relay.url)}
                >
                  {config.relayUrls.includes(relay.url) && (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{relay.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {relay.url.replace('wss://', '')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Custom Relay */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Custom Relay</Label>
          {showCustomInput ? (
            <div className="space-y-2">
              <Input
                placeholder="relay.example.com"
                value={customRelay}
                onChange={(e) => setCustomRelay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomRelay();
                  } else if (e.key === 'Escape') {
                    setShowCustomInput(false);
                    setCustomRelay('');
                  }
                }}
                autoFocus
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleAddCustomRelay}
                  disabled={!customRelay.trim() || config.relayUrls.includes(normalizeRelayUrl(customRelay))}
                >
                  Add Relay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomRelay('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomInput(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Relay
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Tip:</strong> Using multiple relays improves content discovery and redundancy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
