import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSignerAnalysis } from '@/hooks/useSignerAnalysis';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useToast } from '@/hooks/useToast';
import { DebugStatusCard } from '@/components/debug/DebugStatusCard';
import { AuthenticationDebug } from '@/components/debug/AuthenticationDebug';
import { WalletPaymentsDebug } from '@/components/debug/WalletPaymentsDebug';
import { TechnicalDiagnostics } from '@/components/debug/TechnicalDiagnostics';
import { AdvancedAnalysis } from '@/components/debug/AdvancedAnalysis';
import { CacheManagementSettings } from '@/components/settings/CacheManagementSettings';
import { PWAManagementSettings } from '@/components/settings/PWAManagementSettings';
import { PushNotificationsSettings } from '@/components/settings/PushNotificationsSettings';
import { VideoStorageDebug } from '@/components/VideoStorageDebug';
import { VideoEventComparison } from '@/components/VideoEventComparison';
import { Copy, Download, AlertTriangle } from 'lucide-react';

/**
 * Consolidated Developer Settings page with improved organization and reduced redundancy
 * Includes Cache Management, PWA Management, and Debug tools in one unified interface
 */
export function ConsolidatedDeveloperSettings() {
  const { user, metadata } = useCurrentUser();
  const signerAnalysis = useSignerAnalysis();
  const { toast } = useToast();
  const { developerModeEnabled, toggleDeveloperMode } = useDeveloperMode();

  const generateAllDebugInfo = () => {
    return {
      timestamp: new Date().toISOString(),
      user: user ? {
        pubkey: user.pubkey,
        hasMetadata: Boolean(metadata),
      } : null,
      signerAnalysis,
      environment: {
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      },
    };
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
        description: "Debug report saved to downloads",
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
      {/* Developer Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">Developer Mode</div>
            <Switch
              checked={developerModeEnabled}
              onCheckedChange={toggleDeveloperMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner - Always visible */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-yellow-200 font-medium text-sm">
              ⚠️ Advanced Settings
            </p>
            <p className="text-yellow-100/80 text-sm">
              These settings are for technically-savvy users. Please don't change them unless you are a developer or a Nostr expert.
            </p>
          </div>
        </div>
      </div>

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
            `Signer: ${signerAnalysis.signerType}`,
            ...(signerAnalysis.details.extensionName ? [`Extension: ${signerAnalysis.details.extensionName}`] : []),
          ]}
        />
        
        <DebugStatusCard
          title="Wallet & Payments"
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
        <WalletPaymentsDebug />
        <TechnicalDiagnostics />
        <VideoStorageDebug />
        <AdvancedAnalysis />
        <VideoEventComparison />
        <PWAManagementSettings />
        <PushNotificationsSettings />
        <CacheManagementSettings />
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4">
        Debug information is generated in real-time and may contain sensitive data. 
        Handle with care when sharing.
      </div>
        </>
      ) : (
        /* Message when Developer Mode is disabled */
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Enable Developer Mode above to access debugging tools and advanced settings.
          </p>
        </div>
      )}
    </div>
  );
}