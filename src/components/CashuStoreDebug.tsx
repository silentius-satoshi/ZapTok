import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuStore } from '@/stores/cashuStore';
import { useUserCashuStore } from '@/stores/userCashuStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { RefreshCw, Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function CashuStoreDebug() {
  const { user: currentUser } = useCurrentUser();
  const globalCashuStore = useCashuStore();
  const userCashuStore = useUserCashuStore(currentUser?.pubkey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Force re-render to get latest data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Calculate architecture status
  const globalBalance = globalCashuStore?.getTotalBalance?.() || 0;
  const userBalance = userCashuStore?.getTotalBalance?.() || 0;
  const globalWalletCount = globalCashuStore?.wallets?.length || 0;
  const userWalletCount = userCashuStore?.wallets?.length || 0;
  const userStoreActive = userWalletCount > 0;
  const architectureHealthy = userStoreActive; // User store should be the primary for wallet data
  
  // Keep these for backward compatibility with debug info
  const balanceMatch = globalBalance === userBalance;
  const walletCountMatch = globalWalletCount === userWalletCount;

  // Note: Auto-sync removed - wallet operations now write directly to user stores

  // Copy debug info to clipboard
  const copyDebugInfo = async () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      currentUser: currentUser?.pubkey ? 'Logged in' : 'Not logged in',
      userPubkey: currentUser?.pubkey,
      globalStore: {
        exists: !!globalCashuStore,
        walletsCount: globalWalletCount,
        totalBalance: globalBalance,
        activeWalletId: globalCashuStore?.activeWalletId,
        activeMintUrl: globalCashuStore?.activeMintUrl,
        wallets: globalCashuStore?.wallets?.map(w => ({
          id: w.id,
          name: w.name,
          balance: w.balance,
          proofsCount: w.proofs?.length || 0
        })) || []
      },
      userStore: {
        exists: !!userCashuStore,
        walletsCount: userWalletCount,
        totalBalance: userBalance,
        activeWalletId: userCashuStore?.activeWalletId,
        activeMintUrl: userCashuStore?.activeMintUrl,
        wallets: userCashuStore?.wallets?.map(w => ({
          id: w.id,
          name: w.name,
          balance: w.balance,
          proofsCount: w.proofs?.length || 0
        })) || []
      },
      comparison: {
        architectureHealthy,
        userStoreActive,
        balanceMatch,
        walletCountMatch,
        balanceDifference: userBalance - globalBalance,
        walletCountDifference: userWalletCount - globalWalletCount
      }
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy debug info:', error);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            🏪 Cashu Store Debug
            {architectureHealthy ? (
              <Badge variant="outline" className="border-green-500 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Healthy
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Setup Needed
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={copyDebugInfo}>
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {currentUser?.pubkey && (
          <p className="text-sm text-gray-400 font-mono break-all">
            User: {currentUser.pubkey.slice(0, 16)}...
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4" key={refreshKey}>
        {/* Current User Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Status:</span>
          <Badge variant={currentUser?.pubkey ? "default" : "secondary"}>
            {currentUser?.pubkey ? "Logged In" : "Not Logged In"}
          </Badge>
        </div>

        <Separator className="bg-gray-700" />

        {/* Global Store Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            🌐 Global Cashu Store
            <Badge variant="outline" className={globalCashuStore ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}>
              {globalCashuStore ? "Active" : "Inactive"}
            </Badge>
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Wallets:</span>
              <span className="ml-2 text-white">{globalWalletCount}</span>
            </div>
            <div>
              <span className="text-gray-400">Balance:</span>
              <span className="ml-2 text-white">{globalBalance} sats</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Active Wallet:</span>
              <span className="ml-2 text-white text-xs font-mono">
                {globalCashuStore?.activeWalletId || "None"}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* User-Specific Store Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            👤 User-Specific Store
            <Badge variant="outline" className={userCashuStore ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}>
              {userCashuStore ? "Active" : "Inactive"}
            </Badge>
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Wallets:</span>
              <span className="ml-2 text-white">{userWalletCount}</span>
            </div>
            <div>
              <span className="text-gray-400">Balance:</span>
              <span className="ml-2 text-white">{userBalance} sats</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Active Wallet:</span>
              <span className="ml-2 text-white text-xs font-mono">
                {userCashuStore?.activeWalletId || "None"}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Store Architecture Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">🏗️ Store Architecture Status</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">User Store Active:</span>
              <div className="flex items-center gap-2">
                {userWalletCount > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-white">{userWalletCount > 0 ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Data Separation:</span>
              <div className="flex items-center gap-2">
                {userWalletCount > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
                <span className="text-white">
                  {userWalletCount > 0 ? "Properly Separated" : "Setup Needed"}
                </span>
              </div>
            </div>
            {!balanceMatch && (
              <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                <strong>Expected:</strong> Balance differences are normal - user store contains personal 
                wallet data while global store handles shared mint data.
              </div>
            )}
          </div>
        </div>

        {/* Manual Sync Button - For Debugging/Migration Only */}
        {currentUser?.pubkey && !architectureHealthy && globalWalletCount > 0 && (
          <>
            <Separator className="bg-gray-700" />
            <div className="space-y-2">
              <p className="text-xs text-yellow-400">
                ⚠️ Manual sync for debugging/migration only - not needed in normal operation
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => {
                  globalCashuStore?.wallets?.forEach((wallet) => {
                    userCashuStore?.addWallet?.(wallet);
                  });
                  
                  if (globalCashuStore?.activeWalletId && userCashuStore?.setActiveWallet) {
                    userCashuStore.setActiveWallet(globalCashuStore.activeWalletId);
                  }
                  
                  setRefreshKey(prev => prev + 1);
                }}
              >
                🔄 Debug: Sync Global → User Store
              </Button>
            </div>
          </>
        )}

        {/* Debug Note */}
        <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded border border-gray-700">
          <strong>Note:</strong> This debug panel shows real-time comparison between the global Cashu store 
          (shared mint data) and user-specific store (personal wallet data). Wallet operations now write 
          directly to user stores without requiring auto-sync.
        </div>
      </CardContent>
    </Card>
  );
}
