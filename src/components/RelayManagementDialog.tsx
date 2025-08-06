import { useState } from 'react';
import { Plus, Check, X, Info, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';

interface RelayManagementDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RelayManagementDialog({ 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: RelayManagementDialogProps) {
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;

  // Recommended relays for transaction history
  const recommendedRelays = [
    { 
      url: 'wss://relay.chorus.community', 
      name: 'Chorus', 
      description: 'Used by Chorus app for Cashu transactions',
      reason: 'Popular for Cashu/Lightning transactions'
    },
    { 
      url: 'wss://relay.nostr.band', 
      name: 'Nostr.Band', 
      description: 'High-reliability general purpose relay',
      reason: 'Excellent uptime and broad coverage'
    },
    { 
      url: 'wss://relay.damus.io', 
      name: 'Damus', 
      description: 'Popular iOS/macOS client relay',
      reason: 'Large user base and good coverage'
    },
    { 
      url: 'wss://relay.primal.net', 
      name: 'Primal', 
      description: 'Web client with caching features',
      reason: 'Good for finding cached events'
    },
    { 
      url: 'wss://ditto.pub/relay', 
      name: 'Ditto', 
      description: 'Decentralized social platform relay',
      reason: 'Good coverage for social events'
    },
  ];

  const currentRelays = config.relayUrls || [];
  const missingRecommended = recommendedRelays.filter(
    rec => !currentRelays.includes(rec.url)
  );

  const handleAddRelay = async (relayUrl: string) => {
    if (!relayUrl.trim()) return;
    
    // Basic URL validation
    if (!relayUrl.startsWith('wss://') && !relayUrl.startsWith('ws://')) {
      toast({
        title: "Invalid Relay URL",
        description: "Relay URLs must start with ws:// or wss://",
        variant: "destructive",
      });
      return;
    }

    if (currentRelays.includes(relayUrl)) {
      toast({
        title: "Relay Already Added",
        description: "This relay is already in your configuration",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const newRelays = [...currentRelays, relayUrl];
      await updateConfig((currentConfig) => ({
        ...currentConfig,
        relayUrls: newRelays
      }));
      
      toast({
        title: "Relay Added",
        description: `Successfully added ${relayUrl}`,
      });
      
      setNewRelayUrl('');
    } catch (error) {
      toast({
        title: "Failed to Add Relay",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveRelay = async (relayUrl: string) => {
    try {
      const newRelays = currentRelays.filter(url => url !== relayUrl);
      await updateConfig((currentConfig) => ({
        ...currentConfig,
        relayUrls: newRelays
      }));
      
      toast({
        title: "Relay Removed",
        description: `Successfully removed ${relayUrl}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Remove Relay",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Manage Relays
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relay Management</DialogTitle>
          <DialogDescription>
            Manage your Nostr relays to improve transaction history coverage and find missing transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Adding more relays increases the chance of finding your complete transaction history. 
              Different Nostr apps use different relays, so transactions might be stored across multiple relays.
            </AlertDescription>
          </Alert>

          {/* Current Relays */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Relays ({currentRelays.length})</CardTitle>
              <CardDescription>
                Relays you're currently connected to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentRelays.length === 0 ? (
                <p className="text-muted-foreground text-sm">No relays configured</p>
              ) : (
                <div className="space-y-2">
                  {currentRelays.map((relayUrl) => (
                    <div key={relayUrl} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <code className="text-sm font-mono">{relayUrl}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRelay(relayUrl)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Missing Relays */}
          {missingRecommended.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Recommended Relays
                </CardTitle>
                <CardDescription>
                  Popular relays that might contain your missing transaction history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {missingRecommended.map((relay) => (
                    <div key={relay.url} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{relay.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              Recommended
                            </Badge>
                          </div>
                          <code className="text-sm font-mono text-muted-foreground">
                            {relay.url}
                          </code>
                          <p className="text-sm text-muted-foreground mt-1">
                            {relay.description}
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            📈 {relay.reason}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddRelay(relay.url)}
                          disabled={isAdding}
                          className="ml-4"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Custom Relay */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Custom Relay</CardTitle>
              <CardDescription>
                Add a specific relay URL if you know your transactions are stored there
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="relay-url" className="sr-only">
                    Relay URL
                  </Label>
                  <Input
                    id="relay-url"
                    placeholder="wss://example.relay.com"
                    value={newRelayUrl}
                    onChange={(e) => setNewRelayUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddRelay(newRelayUrl);
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => handleAddRelay(newRelayUrl)}
                  disabled={!newRelayUrl.trim() || isAdding}
                >
                  {isAdding ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• If you used Chorus app, add the Chorus relay to see those transactions</li>
                <li>• Adding multiple relays helps find transactions from different time periods</li>
                <li>• Popular relays like Damus and Primal have good coverage</li>
                <li>• Some relays specialize in specific types of events</li>
                <li>• After adding relays, refresh your transaction history</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
