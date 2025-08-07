import { Badge } from '@/components/ui/badge';
import { useRelayContext } from '@/hooks/useContextualRelays';
import { useNostrConnection } from '@/components/NostrProvider';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
import { getRelayContextDescription } from '@/lib/relayOptimization';

interface RelayContextIndicatorProps {
  className?: string;
  showDescription?: boolean;
}

export function RelayContextIndicator({ className, showDescription = false }: RelayContextIndicatorProps) {
  const { context } = useRelayContext();
  const { connectedRelayCount, activeRelays, connectionState } = useNostrConnection();
  const cashuRelayStore = useCashuRelayStore();

  const getContextColor = (ctx: typeof context) => {
    switch (ctx) {
      case 'wallet':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'feed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'all':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const getContextIcon = (ctx: typeof context) => {
    switch (ctx) {
      case 'wallet':
        return '⚡';
      case 'feed':
        return '📺';
      case 'all':
      default:
        return '🌐';
    }
  };

  // For wallet context, check if the Cashu relay is connected
  // For other contexts, show regular relay status
  const isCashuRelayConnected = connectionState[cashuRelayStore.activeRelay] === 'connected';
  const displayConnectedCount = context === 'wallet' 
    ? (isCashuRelayConnected ? 2 : 0)
    : connectedRelayCount;
  const displayTotalCount = context === 'wallet' ? 2 : activeRelays.length;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="outline" 
        className={`${getContextColor(context)} text-xs font-medium`}
      >
        {getContextIcon(context)} {context.toUpperCase()}
      </Badge>
      
      <Badge variant="outline" className="text-xs">
        {displayConnectedCount}/{displayTotalCount} relays
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
