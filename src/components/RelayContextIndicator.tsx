import { Badge } from '@/components/ui/badge';
import { useRelayContext } from '@/hooks/useContextualRelays';
import { useNostrConnection } from '@/components/NostrProvider';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
import { getRelayContextDescription } from '@/lib/relayOptimization';
import { useNavigate } from 'react-router-dom';
import { Wifi } from 'lucide-react';

interface RelayContextIndicatorProps {
  className?: string;
  showDescription?: boolean;
}

export function RelayContextIndicator({ className, showDescription = false }: RelayContextIndicatorProps) {
  const { context } = useRelayContext();
  const { connectedRelayCount, activeRelays, connectionState } = useNostrConnection();
  const navigate = useNavigate();
  
  // Always call the hook but use the store conditionally
  const cashuRelayStore = useCashuRelayStore();
  const shouldUseCashuStore = context === 'wallet' || context === 'cashu-only' || context === 'settings-cashu';

  const getContextColor = (ctx: typeof context) => {
    switch (ctx) {
      case 'wallet':
      case 'cashu-only':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'feed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'settings-cashu':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'none':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'all':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const getContextIcon = (ctx: typeof context) => {
    switch (ctx) {
      case 'wallet':
      case 'cashu-only':
        return '⚡';
      case 'feed':
        return '📺';
      case 'settings-cashu':
        return '⚙️';
      case 'none':
        return '⏸️';
      case 'all':
      default:
        return '🌐';
    }
  };

  // For wallet context, check if the Cashu relay is connected
  // For other contexts, show regular relay status
  const cashuRelayState = cashuRelayStore ? connectionState[cashuRelayStore.activeRelay] : undefined;
  const isCashuRelayConnected = cashuRelayState === 'connected';
  const isCashuRelayConnecting = cashuRelayState === 'connecting';
  
  let displayConnectedCount: number;
  let displayTotalCount: number;
  let isConnecting = false;
  
  if (context === 'wallet' || context === 'cashu-only') {
    displayConnectedCount = isCashuRelayConnected ? 1 : 0;
    displayTotalCount = 1;
    isConnecting = isCashuRelayConnecting;
    
    // Fallback: If we're in cashu-only context but connection state is empty,
    // this likely means we're in a transition period - show optimistic state
    if (!cashuRelayState && cashuRelayStore && cashuRelayStore.activeRelay) {
      isConnecting = true; // Show connecting state during transition
    }
  } else if (context === 'none') {
    displayConnectedCount = 0;
    displayTotalCount = 0;
  } else {
    displayConnectedCount = connectedRelayCount;
    displayTotalCount = activeRelays.length;
    // Check if any relay is connecting
    isConnecting = Object.values(connectionState).some(state => state === 'connecting');
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {context === 'cashu-only' ? (
        // Show active Cashu relay with click functionality for cashu-only context
        <Badge 
          variant="outline" 
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer"
          onClick={() => navigate('/settings?section=cashu-wallet')}
        >
          <Wifi className="h-3 w-3 mr-1" />
          {cashuRelayStore.getActiveRelayName()}
        </Badge>
      ) : (
        // Show context badge for other contexts
        <Badge 
          variant="outline" 
          className={`${getContextColor(context)} text-xs font-medium`}
        >
          {getContextIcon(context)} {context.toUpperCase()}
        </Badge>
      )}
      
      <Badge 
        variant="outline" 
        className={`text-xs ${isConnecting ? 'animate-pulse' : ''}`}
      >
        {displayConnectedCount}/{displayTotalCount} relays
        {isConnecting && displayConnectedCount < displayTotalCount && (
          <span className="ml-1 text-yellow-500">⟳</span>
        )}
      </Badge>
      
      {showDescription && (
        <span className="text-xs text-muted-foreground">
          {getRelayContextDescription(context)}
        </span>
      )}
    </div>
  );
}

/**
 * Debugging component to show detailed relay information
 */
export function RelayDebugInfo() {
  const { context } = useRelayContext();
  const { activeRelays, connectionState, connectedRelayCount } = useNostrConnection();
  
  return (
    <div className="fixed bottom-4 right-4 bg-background/95 border rounded-lg p-3 shadow-lg text-xs space-y-2 backdrop-blur-sm">
      <div className="font-semibold">Relay Debug Info</div>
      <div>Context: <span className="text-primary">{context}</span></div>
      <div>Active Relays: {activeRelays.length}</div>
      <div>Connected: {connectedRelayCount}</div>
      <div className="space-y-1">
        {activeRelays.map(url => (
          <div key={url} className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionState[url] === 'connected' ? 'bg-green-500' :
                connectionState[url] === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} 
            />
            <span className="truncate max-w-[200px]">{url.replace('wss://', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
