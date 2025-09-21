import { useState } from 'react';
import { useReceivedNutzaps } from '@/hooks/useReceivedNutzaps';
import { useNutzaps } from '@/hooks/useNutzaps';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createP2PKKeypairFromPrivateKey } from '@/lib/p2pk';
import { UserNutzapDialog } from '@/components/UserNutzapDialog';
import { NutzapList } from '@/components/NutzapList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Send,
  Gift,
  Settings,
  RefreshCw,
  Plus
} from 'lucide-react';
import { formatBalance } from '@/lib/cashu';
import { toast } from 'sonner';

interface NutzapInterfaceProps {
  className?: string;
}

export function NutzapInterface({ className }: NutzapInterfaceProps) {
  const [activeTab, setActiveTab] = useState('received');
  const { user } = useCurrentUser();

  const {
    nutzaps: receivedNutzaps,
    isLoading: isLoadingReceived,
    refetch: refetchReceived,
    unclaimedCount,
    totalUnclaimed
  } = useReceivedNutzaps();

  const {
    createNutzapInfo,
    isCreatingNutzapInfo
  } = useNutzaps();

  const stats = {
    totalReceived: receivedNutzaps.reduce((sum, n) => sum + n.amount, 0),
    totalClaimed: receivedNutzaps
      .filter(n => n.status === 'claimed')
      .reduce((sum, n) => sum + n.amount, 0),
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span>Nutzaps</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchReceived()}
              disabled={isLoadingReceived}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingReceived ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Open nutzap settings or create nutzap info
                // This would typically open a settings dialog
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Total Received
              </span>
            </div>
            <p className="text-lg font-bold text-green-600">
              {formatBalance(stats.totalReceived)} sats
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Claimed
              </span>
            </div>
            <p className="text-lg font-bold text-blue-600">
              {formatBalance(stats.totalClaimed)} sats
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Gift className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Pending
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-lg font-bold text-orange-600">
                {formatBalance(totalUnclaimed)} sats
              </p>
              {unclaimedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unclaimedCount}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="flex items-center space-x-2">
              <Gift className="h-4 w-4" />
              <span>Received</span>
              {unclaimedCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unclaimedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Send</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Received Nutzaps</h3>
              {receivedNutzaps.length > 0 && (
                <Badge variant="outline">
                  {receivedNutzaps.length} total
                </Badge>
              )}
            </div>

            <NutzapList
              limit={10}
              showEmpty={true}
            />
          </TabsContent>

          <TabsContent value="send" className="space-y-4">
            <div className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Send Nutzaps</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Send instant bitcoin payments to other users via Cashu tokens
              </p>

              <Button disabled>
                <Plus className="h-4 w-4 mr-2" />
                Send Nutzap
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Enter a user's npub to send them a nutzap
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nutzap Settings</p>
              <p className="text-xs text-muted-foreground">
                Configure your nutzap receiving preferences
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Generate proper P2PK pubkey from user's Cashu wallet private key
                if (!user) {
                  toast.error('User not logged in');
                  return;
                }
                
                const userPrivkey = userCashuStore?.privkey;
                
                if (!userPrivkey) {
                  toast.error('Cashu wallet not available');
                  return;
                }

                // Derive P2PK public key from the user's Cashu wallet private key
                const p2pkKeypair = createP2PKKeypairFromPrivateKey(userPrivkey);
                
                createNutzapInfo({
                  relays: ['wss://relay.nostr.band'],
                  p2pkPubkey: p2pkKeypair.pubkey
                });
              }}
              disabled={isCreatingNutzapInfo}
            >
              {isCreatingNutzapInfo ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}