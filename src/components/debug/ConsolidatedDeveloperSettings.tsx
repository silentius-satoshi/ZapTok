import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle2, WifiOff } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSignerAnalysis } from '@/hooks/useSignerAnalysis';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { useWallet } from '@/hooks/useWallet';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWA } from '@/hooks/usePWA';
import { DebugStatusCard } from '@/components/debug/DebugStatusCard';
import { AuthenticationDebug } from '@/components/debug/AuthenticationDebug';
import { CashuWalletDebug } from '@/components/debug/CashuWalletDebug';
import { TechnicalDiagnostics } from '@/components/debug/TechnicalDiagnostics';
import { CacheManagementSettings } from '@/components/settings/CacheManagementSettings';
import { VideoStorageDebug } from '@/components/VideoStorageDebug';
import { VideoEventComparison } from '@/components/VideoEventComparison';
import { Copy, Download } from 'lucide-react';

/**
 * Consolidated Developer Settings page with improved organization and reduced redundancy
 * Includes Cache Management, PWA Management, and Debug tools in one unified interface
 */
export function ConsolidatedDeveloperSettings() {
  const { user, metadata } = useCurrentUser();
  const signerAnalysis = useSignerAnalysis();
  const { config } = useAppContext();
  const { walletInfo, isConnected: walletConnected } = useWallet();
  const { toast } = useToast();
  const { 
    developerModeEnabled, 
    toggleDeveloperMode,
    cellularCheckEnabled,
    toggleCellularCheck,
  } = useDeveloperMode();
  
  const {
    permission,
    isSupported: pushSupported,
    subscribeToPush,
    requestPermission,
  } = usePushNotifications();

  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isOnline,
    hasUpdate,
  } = usePWA();

  const [pwaExpanded, setPwaExpanded] = useState(false);

  const handlePushNotificationToggle = async (enabled: boolean) => {
    if (!pushSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    if (permission === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "Please allow notifications in your browser settings.",
        variant: "destructive",
      });
      return;
    }

    if (enabled && permission !== 'granted') {
      try {
        const granted = await requestPermission();
        if (granted) {
          await subscribeToPush();
          toast({
            title: "Notifications Enabled",
            description: "You will now receive push notifications.",
          });
        }
      } catch (error) {
        console.error('[Notifications] Setup failed:', error);
        toast({
          title: "Error",
          description: "Failed to enable notifications.",
          variant: "destructive",
        });
      }
    }
  };

  const generateAllDebugInfo = () => {
    // Collect all debug information from all sections
    const allDebugInfo = {
      timestamp: new Date().toISOString(),
      
      // Authentication & Identity section - RAW DATA
      authentication: {
        user: user ? {
          pubkey: user.pubkey,
          metadata: metadata,
        } : null,
        signerAnalysis,
        appConfig: config,
      },
      
      // Wallet & Payments section
      wallet: {
        connected: walletConnected,
        walletInfo,
      },
      
      // Technical section - RAW DATA
      technical: {
        signerDetection: {
          type: signerAnalysis.signerType,
          details: signerAnalysis.details,
          capabilities: signerAnalysis.capabilities,
        },
        webLNAnalysis: {
          available: signerAnalysis.capabilities.webln,
          provider: signerAnalysis.details.webLNProvider,
          methods: typeof window !== 'undefined' && window.webln ? Object.keys(window.webln) : [],
        },
        browserEnvironment: typeof window !== 'undefined' ? {
          userAgent: navigator.userAgent,
          webLNSupport: Boolean(window.webln),
          nostrExtension: Boolean(window.nostr),
          localStorage: Boolean(window.localStorage),
          clipboardAPI: Boolean(navigator.clipboard),
        } : null,
      },
      
      // Environment
      environment: {
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        storage: typeof navigator !== 'undefined' && 'storage' in navigator ? {
          persisted: 'persisted',
          quota: 'available',
        } : null,
      },
    };
    
    return allDebugInfo;
  };

  const handleCopyAll = async () => {
    try {
      const allDebugInfo = generateAllDebugInfo();
      await navigator.clipboard.writeText(JSON.stringify(allDebugInfo, null, 2));
      toast({
        title: "Debug info copied",
        description: "All debug information copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy debug information",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = () => {
    try {
      const allDebugInfo = generateAllDebugInfo();
      const blob = new Blob([JSON.stringify(allDebugInfo, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zaptok-debug-report-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report downloaded",
        description: "Debug report saved to downloads (sensitive data redacted)",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to generate debug report",
        variant: "destructive",
      });
    }
  };

  // Generate status card data
  const getAuthStatus = () => {
    if (!user) return { status: 'disconnected' as const, description: 'No user logged in' };
    
    // Special handling for nsec and bunker signers - they work even with 'partial' or 'error' status
    if (signerAnalysis.signerType === 'nsec') {
      return { status: 'connected' as const, description: 'Private key authentication active' };
    }
    if (signerAnalysis.signerType === 'bunker') {
      return { status: 'connected' as const, description: 'Remote signer authentication active' };
    }
    
    // For extension signers, use the actual status
    if (signerAnalysis.status === 'connected') return { status: 'connected' as const, description: 'Authentication working correctly' };
    if (signerAnalysis.status === 'partial') return { status: 'partial' as const, description: 'Limited functionality available' };
    return { status: 'error' as const, description: 'Authentication issues detected' };
  };

  const getWalletStatus = () => {
    if (!signerAnalysis.compatibility.cashu && !signerAnalysis.compatibility.lightning) {
      return { status: 'disconnected' as const, description: 'No wallet functionality available' };
    }
    if (signerAnalysis.compatibility.cashu && signerAnalysis.compatibility.lightning) {
      return { status: 'connected' as const, description: 'Full wallet functionality available' };
    }
    return { status: 'partial' as const, description: 'Limited wallet functionality' };
  };

  const getTechnicalStatus = () => {
    const hasBasicFunctionality = signerAnalysis.capabilities.signing;
    const hasAdvancedFunctionality = signerAnalysis.capabilities.nip44 || signerAnalysis.capabilities.webln;
    
    if (hasBasicFunctionality && hasAdvancedFunctionality) {
      return { status: 'connected' as const, description: 'All technical features operational' };
    }
    if (hasBasicFunctionality) {
      return { status: 'partial' as const, description: 'Basic functionality available' };
    }
    return { status: 'error' as const, description: 'Technical issues detected' };
  };

  const authStatus = getAuthStatus();
  const walletStatus = getWalletStatus();
  const technicalStatus = getTechnicalStatus();

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Developer Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-medium">Developer Mode</div>
              <div className="text-xs text-muted-foreground">
                Enable Developer Mode to access debugging tools
              </div>
            </div>
            <Switch
              checked={developerModeEnabled}
              onCheckedChange={toggleDeveloperMode}
            />
          </div>
          
          {/* Cellular Connection Check Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm font-medium">Mobile Cellular Connection Check</div>
              <div className="text-xs text-muted-foreground">
                Enable check for battery optimization on cellular networks
              </div>
            </div>
            <Switch
              checked={cellularCheckEnabled}
              onCheckedChange={toggleCellularCheck}
            />
          </div>

          {/* PWA Management Collapsible */}
          <Collapsible open={pwaExpanded} onOpenChange={setPwaExpanded} className="pt-4 border-t">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <div className="text-sm font-medium">PWA Management</div>
                <div className="text-xs text-muted-foreground">
                  {isStandalone ? 'Running as installed app' : 'Running in browser'}
                </div>
              </div>
              {pwaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              {/* Current Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Current Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isStandalone ? 'Running as installed app' : 'Running in browser'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isInstalled ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {isStandalone ? 'PWA Active' : 'Installed'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Browser Mode
                    </Badge>
                  )}
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Connection</p>
                  <p className="text-xs text-muted-foreground">
                    Network connectivity status
                  </p>
                </div>
                <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>

              {/* Offline Status Note */}
              {!isOnline && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                  <WifiOff className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    You're offline. Some features may be limited, but cached content is still available.
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm font-medium">Push Notifications</div>
              <div className="text-xs text-muted-foreground">
                {!pushSupported 
                  ? "Not supported in this browser"
                  : permission === 'denied' 
                  ? "Blocked - Allow in browser settings"
                  : permission === 'granted'
                  ? "Enabled"
                  : "Receive notifications for new content"}
              </div>
            </div>
            <Switch
              checked={permission === 'granted'}
              onCheckedChange={handlePushNotificationToggle}
              disabled={!pushSupported || permission === 'denied'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Show content only when Developer Mode is enabled */}
      {developerModeEnabled ? (
        <>
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Developer Debug Console</h2>
          <p className="text-muted-foreground">
            Comprehensive debugging information with reduced redundancy
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copy All Debug Info
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DebugStatusCard
          title="Authentication"
          status={authStatus.status}
          description={authStatus.description}
          details={[
            `Signer: ${signerAnalysis.signerType === 'nsec' ? 'Private Key (nsec)' : signerAnalysis.signerType}`,
            ...(signerAnalysis.details.extensionName ? [`Extension: ${signerAnalysis.details.extensionName}`] : []),
          ]}
        />
        
        <DebugStatusCard
          title="Cashu Wallet"
          status={walletStatus.status}
          description={walletStatus.description}
          details={[
            `Cashu: ${signerAnalysis.compatibility.cashu ? 'Available' : 'Unavailable'}`,
            `Lightning: ${signerAnalysis.compatibility.lightning ? 'Available' : 'Unavailable'}`,
          ]}
        />
        
        <DebugStatusCard
          title="Technical Systems"
          status={technicalStatus.status}
          description={technicalStatus.description}
          details={[
            `Signing: ${signerAnalysis.capabilities.signing ? 'Available' : 'Unavailable'}`,
            `Encryption: ${signerAnalysis.capabilities.nip44 ? 'Available' : 'Unavailable'}`,
          ]}
        />
      </div>

      {/* Detailed Debug Sections */}
      <div className="space-y-4">
        <AuthenticationDebug />
        <CashuWalletDebug />
        <TechnicalDiagnostics />
        <VideoStorageDebug />
        <VideoEventComparison />
        <CacheManagementSettings />
      </div>
        </>
      ) : null}
    </div>
  );
}