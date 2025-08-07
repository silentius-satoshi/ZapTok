import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRelayContext } from '@/hooks/useContextualRelays';
import { useNostrConnection } from '@/components/NostrProvider';
import { getRelayContextDescription, type RelayContext } from '@/lib/relayOptimization';

export function RelayContextSettings() {
  const { context, setContext } = useRelayContext();
  const { connectedRelayCount, activeRelays, totalRelayCount } = useNostrConnection();
  
  const contexts: { value: RelayContext; label: string; icon: string }[] = [
    { value: 'all', label: 'All Relays', icon: '🌐' },
    { value: 'wallet', label: 'Wallet Optimized', icon: '⚡' },
    { value: 'feed', label: 'Feed Optimized', icon: '📺' },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Relay Optimization</span>
          <Badge variant="outline" className="text-xs">
            {connectedRelayCount}/{totalRelayCount} connected
          </Badge>
        </CardTitle>
        <CardDescription>
          Optimize relay connections for better performance. The app automatically switches 
          contexts based on the page you're viewing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {contexts.map((ctx) => (
            <div
              key={ctx.value}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                context === ctx.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setContext(ctx.value)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{ctx.icon}</span>
                  <div>
                    <div className="font-medium">{ctx.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {getRelayContextDescription(ctx.value)}
                    </div>
                  </div>
                </div>
                {context === ctx.value && (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="font-medium">Current Active Relays:</div>
          <div className="grid gap-1">
            {activeRelays.map((url) => (
              <div key={url} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                {url}
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <strong>💡 Tip:</strong> Wallet context uses faster, more reliable relays for financial operations. 
          Feed context uses content-rich relays for better video discovery.
        </div>
      </CardContent>
    </Card>
  );
}
