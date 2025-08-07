import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  ChevronUp,
  Wifi,
  Plus,
} from "lucide-react";
import { SettingsSection } from './SettingsSection';
import { useWalletUiStore } from "@/stores/walletUiStore";
import { useCashuRelayStore } from "@/stores/cashuRelayStore";

export function CashuRelaySettings() {
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.cashuRelay;
  
  const cashuRelayStore = useCashuRelayStore();
  const [customRelayUrl, setCustomRelayUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSetActiveRelay = (relayUrl: string) => {
    cashuRelayStore.setActiveRelay(relayUrl);
    setError(null);
  };

  const handleAddCustomRelay = () => {
    try {
      // Validate URL
      const url = new URL(customRelayUrl);
      
      // Check if it's a WebSocket URL
      if (!url.protocol.startsWith('ws')) {
        throw new Error('Must be a WebSocket URL (ws:// or wss://)');
      }

      // Check if relay already exists
      if (cashuRelayStore.availableRelays.some(r => r.url === customRelayUrl)) {
        throw new Error('Relay already exists');
      }

      // Extract name from URL
      const hostname = url.hostname;
      const name = hostname.split('.')[0] || hostname;

      // Add the relay
      cashuRelayStore.addRelay({
        url: customRelayUrl,
        name: name.charAt(0).toUpperCase() + name.slice(1)
      });

      setCustomRelayUrl('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid relay URL');
    }
  };

  const cleanRelayUrl = (url: string) => {
    return url.replace(/^wss?:\/\//, '');
  };

  return (
    <SettingsSection 
      description="Choose which Nostr relay to use for Cashu wallet operations. Relays store and distribute your wallet data across the Nostr network."
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            <div>
              <CardTitle>Cashu Relay Settings</CardTitle>
              <CardDescription>Manage your Cashu wallet relay</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => walletUiStore.toggleCardExpansion("cashuRelay")}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            <div className="space-y-4">
              {/* Active Relay Section */}
              <div>
                <h3 className="text-sm font-medium mb-3">Active Relay</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-green-600" />
                    <span className="font-medium">
                      {cashuRelayStore.getActiveRelayName()}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">
                You can select from popular relays or add your own custom relay URL. Changes take effect immediately.
              </p>

              {/* Available Relays */}
              <div className="space-y-2">
                {cashuRelayStore.availableRelays.map((relay) => {
                  const isActive = relay.url === cashuRelayStore.activeRelay;
                  
                  return (
                    <div 
                      key={relay.url}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSetActiveRelay(relay.url)}
                    >
                      <div className="flex items-center gap-3">
                        <Wifi className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="font-medium">{relay.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {cleanRelayUrl(relay.url)}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <Badge 
                          variant="secondary" 
                          className="bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Add Custom Relay */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Add Custom Relay</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="wss://relay.example.com"
                    value={customRelayUrl}
                    onChange={(e) => setCustomRelayUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddCustomRelay();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleAddCustomRelay}
                    disabled={!customRelayUrl.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </SettingsSection>
  );
}
