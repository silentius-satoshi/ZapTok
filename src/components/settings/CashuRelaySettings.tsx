import { useState, useEffect, useRef } from 'react';
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
  Trash2,
} from "lucide-react";
import { SettingsSection } from './SettingsSection';
import { useWalletUiStore } from "@/stores/walletUiStore";
import { useCashuRelayStore } from "@/stores/cashuRelayStore";

interface CashuRelaySettingsProps {
  /** Force the component to always be expanded, ignoring store state */
  alwaysExpanded?: boolean;
}

export function CashuRelaySettings({ alwaysExpanded = false }: CashuRelaySettingsProps = {}) {
  const walletUiStore = useWalletUiStore();
  const isExpanded = alwaysExpanded || walletUiStore.expandedCards.cashuRelay;
  
  const cashuRelayStore = useCashuRelayStore();
  const [customRelayUrl, setCustomRelayUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

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
            style={{ display: alwaysExpanded ? 'none' : 'flex' }}
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
              <div className="relative" ref={dropdownRef}>
                <h3 className="text-sm font-medium mb-3">Active Relay</h3>
                <div 
                  className="flex items-center justify-between p-3 border border-gray-700 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-white">
                      {cashuRelayStore.getActiveRelayName()}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </div>
                
                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
                    <div className="p-2">
                      <Input
                        placeholder="Search relays or enter custom URL..."
                        value=""
                        onChange={() => {}}
                        className="mb-2 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
                      />
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {cashuRelayStore.availableRelays
                          .filter(relay => relay.url !== cashuRelayStore.activeRelay)
                          .map((relay) => {
                            return (
                              <div
                                key={relay.url}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => {
                                  handleSetActiveRelay(relay.url);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <Wifi className="h-4 w-4 text-gray-300" />
                                <div className="flex-1">
                                  <div className="font-medium text-white">{relay.name}</div>
                                  <div className="text-xs text-gray-400">{relay.url}</div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">
                You can select from popular relays or add your own custom relay URL. Changes take effect immediately.
              </p>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Add Custom Relay */}
              <div>
                <p className="text-sm text-gray-400 mb-3">Add Custom Relay</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="wss://relay.example.com"
                        value={customRelayUrl}
                        onChange={(e) => setCustomRelayUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCustomRelay();
                          } else if (e.key === 'Escape') {
                            setCustomRelayUrl('');
                          }
                        }}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                        autoFocus={false}
                      />
                      <Wifi className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer" />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleAddCustomRelay}
                      disabled={!customRelayUrl.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </SettingsSection>
  );
}
