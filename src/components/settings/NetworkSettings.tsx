import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, Trash2, HelpCircle, Plug } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { useAppContext } from '@/hooks/useAppContext';
import { useCaching } from '@/contexts/CachingContext';
import { useToast } from '@/hooks/useToast';

interface NetworkSettingsProps {
  customRelay: string;
  setCustomRelay: (value: string) => void;
  showCustomInput: boolean;
  setShowCustomInput: (value: boolean) => void;
  knownRelays: Set<string>;
  setKnownRelays: (value: React.SetStateAction<Set<string>>) => void;
  isConnecting: string | null;
  setIsConnecting: (value: string | null) => void;
}

export function NetworkSettings({
  customRelay,
  setCustomRelay,
  showCustomInput,
  setShowCustomInput,
  knownRelays,
  setKnownRelays,
  isConnecting: _isConnecting,
  setIsConnecting
}: NetworkSettingsProps) {
  const { config, addRelay, removeRelay } = useAppContext();
  const { currentService, connectToCachingService, disconnectCachingService } = useCaching();
  const { toast } = useToast();
  const [cachingServiceInput, setCachingServiceInput] = useState('');
  const [isConnectingToCaching, setIsConnectingToCaching] = useState(false);

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
      // Add to known relays set
      setKnownRelays(prev => new Set(prev).add(normalizedUrl));
      setCustomRelay('');
      setShowCustomInput(false);
    }
  };

  const handleRemoveRelay = (relayUrl: string) => {
    if (config.relayUrls.length > 1) {
      removeRelay(relayUrl);
    }
  };

  const handlePermanentlyRemoveRelay = (relayUrl: string) => {
    // Remove from connected relays if connected
    if (config.relayUrls.includes(relayUrl)) {
      if (config.relayUrls.length > 1) {
        removeRelay(relayUrl);
      }
    }
    // Remove from known relays (this will hide it from the list)
    setKnownRelays(prev => {
      const newSet = new Set(prev);
      newSet.delete(relayUrl);
      return newSet;
    });
  };

  const handleConnectToCachingService = async () => {
    if (!cachingServiceInput.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid caching service URL",
        variant: "destructive",
      });
      return;
    }

    const normalizedUrl = normalizeRelayUrl(cachingServiceInput);
    setIsConnectingToCaching(true);

    try {
      await connectToCachingService(normalizedUrl);
      setCachingServiceInput('');
      toast({
        title: "Connected",
        description: "Successfully connected to caching service",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to caching service",
        variant: "destructive",
      });
    } finally {
      setIsConnectingToCaching(false);
    }
  };

  // Get relay status based on current relay selection
  // const getRelayStatus = (relayUrl: string) => {
  //   if (config.relayUrls.includes(relayUrl)) {
  //     return 'active'; // Currently selected relay
  //   }
  //   return 'inactive'; // Available but not selected
  // };

  // Get all relays with status
  const getAllRelays = () => {
    const allRelays: Array<{ name: string; url: string; status: string }> = [];

    // Add all known relays (connected, disconnected, and presets)
    Array.from(knownRelays).forEach(relayUrl => {
      const isConnected = config.relayUrls.includes(relayUrl);

      allRelays.push({
        name: relayUrl.replace(/^wss?:\/\//, ''),
        url: relayUrl,
        status: isConnected ? 'active' : 'inactive'
      });
    });

    // Sort: connected first, then disconnected
    return allRelays.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });
  };

  return (
    <SettingsSection className="space-y-6 px-6 pt-6 pb-6">
      {/* Caching Service Section */}
      <div className="pb-6 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-white">Caching Service</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-default" />
              </TooltipTrigger>
              <TooltipContent
                className="max-w-sm p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
                sideOffset={8}
              >
                <p className="text-sm text-gray-200 leading-relaxed">
                  Caching services supplement relay data for improved performance. The client randomly connects to one service from the pool for fail-over. Add or remove services as needed, or keep only one for a dedicated connection.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-gray-400 mb-3">Connected caching service</p>
            {currentService ? (
              <div className="flex items-center gap-4 text-lg py-3">
                <div className={`w-3 h-3 rounded-full ${currentService.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-300 truncate flex-1">{currentService.url}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                    onClick={() => disconnectCachingService()}
                  >
                    disconnect
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1"
                    onClick={() => {
                      disconnectCachingService();
                      toast({
                        title: "Service Removed",
                        description: "Caching service has been disconnected and removed",
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-lg">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-gray-400">No caching service connected</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-400 mb-3">Connect to a different caching service</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="wss://cachingservice.url"
                  value={cachingServiceInput}
                  onChange={(e) => setCachingServiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConnectToCachingService();
                    }
                  }}
                  disabled={isConnectingToCaching}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50"
                />
                <button
                  onClick={handleConnectToCachingService}
                  disabled={isConnectingToCaching || !cachingServiceInput.trim()}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plug className={`h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer ${
                    isConnectingToCaching ? 'animate-pulse' : ''
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 p-0 h-auto"
          >
            Restore default caching service
          </Button>
        </div>
      </div>

      {/* Relays Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Relays</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-3">My relays</p>
            <div className="space-y-0 divide-y divide-gray-800">
              {getAllRelays().map((relay, index) => (
                <div key={index} className="flex items-center gap-4 text-lg py-3">
                  <div className={`w-3 h-3 rounded-full ${
                    relay.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                  <span className={`truncate ${
                    relay.status === 'active' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {relay.url}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    {relay.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                        onClick={() => handleRemoveRelay(relay.url)}
                        disabled={config.relayUrls.length <= 1}
                      >
                        disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => handleToggleRelay(relay.url)}
                      >
                        connect
                      </Button>
                    )}
                    {/* Show trash button if not the last connected relay or if it's disconnected */}
                    {(relay.status === 'inactive' || config.relayUrls.length > 1) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1"
                        onClick={() => handlePermanentlyRemoveRelay(relay.url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 p-0 h-auto"
          >
            Reset relays
          </Button>

          <div>
            <p className="text-sm text-gray-400 mb-3">Connect to relay</p>
            {showCustomInput ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="wss://relay.url"
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
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                      autoFocus
                    />
                    <Plug className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleAddCustomRelay}
                    disabled={!customRelay.trim() || config.relayUrls.includes(normalizeRelayUrl(customRelay))}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Connect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomRelay('');
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="wss://relay.url"
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 cursor-pointer"
                    onClick={() => setShowCustomInput(true)}
                    readOnly
                  />
                  <Plug className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
