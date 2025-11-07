import { useState } from 'react';
import { Bug, Code, Activity } from 'lucide-react';
import { useSignerAnalysis } from '@/hooks/useSignerAnalysis';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DebugSection } from '@/components/debug/DebugSection';
import { DebugInfoPanel } from '@/components/debug/DebugInfoPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEBUG_CONFIG, enableAllDebugging, disableAllDebugging } from '@/lib/debug';

/**
 * Technical diagnostics and method detection
 * Includes WebLN analysis and debug controls from LightningDebugInfo
 */
export function TechnicalDiagnostics() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(DEBUG_CONFIG.enableAll || DEBUG_CONFIG.lightning.enabled);
  const signerAnalysis = useSignerAnalysis();
  const isMobile = useIsMobile();

  // Generate comprehensive technical analysis
  const technicalData = {
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
      userAgent: navigator.userAgent.slice(0, 100) + '...',
      webLNSupport: Boolean(window.webln),
      nostrExtension: Boolean(window.nostr),
      localStorage: Boolean(window.localStorage),
      clipboardAPI: Boolean(navigator.clipboard),
    } : null,
    debugConfig: DEBUG_CONFIG,
  };

  const toggleDebugging = () => {
    if (debugEnabled) {
      disableAllDebugging();
      setDebugEnabled(false);
    } else {
      enableAllDebugging();
      setDebugEnabled(true);
    }
  };

  return (
    <DebugSection
      title="Technical Diagnostics"
      icon={<Bug className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <div className="space-y-4">
        {/* Debug Controls */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Debug Controls
          </h4>
          <div className="flex items-center gap-2">
            <Button
              variant={debugEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleDebugging}
            >
              <Activity className="h-4 w-4 mr-2" />
              {debugEnabled ? 'Disable' : 'Enable'} Debug Logging
            </Button>
            <Badge variant={debugEnabled ? 'default' : 'outline'}>
              {debugEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Method Detection */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Available Methods
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Badge variant={signerAnalysis.capabilities.signing ? 'default' : 'outline'} className="w-full justify-center">
                Event Signing
              </Badge>
              <Badge variant={signerAnalysis.capabilities.nip44 ? 'default' : 'outline'} className="w-full justify-center">
                NIP-44 Encryption
              </Badge>
            </div>
            <div className="space-y-1">
              <Badge variant={signerAnalysis.capabilities.webln ? 'default' : 'outline'} className="w-full justify-center">
                WebLN Payments
              </Badge>
              <Badge variant={signerAnalysis.capabilities.bunker ? 'default' : 'outline'} className="w-full justify-center">
                Remote Signing
              </Badge>
            </div>
          </div>
        </div>

        {/* WebLN Analysis */}
        {signerAnalysis.capabilities.webln && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              WebLN Analysis
            </h4>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                <Code className="h-4 w-4" />
                <span>Provider: {signerAnalysis.details.webLNProvider || 'Unknown'}</span>
              </div>
              {technicalData.webLNAnalysis.methods.length > 0 && (
                <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Available methods: {technicalData.webLNAnalysis.methods.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browser Environment */}
        {technicalData.browserEnvironment && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              Browser Environment
            </h4>
            <div className="space-y-1">
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Nostr Extension: {technicalData.browserEnvironment.nostrExtension ? 'Available' : 'Not Available'}
              </div>
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Local Storage: {technicalData.browserEnvironment.localStorage ? 'Available' : 'Not Available'}
              </div>
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Clipboard API: {technicalData.browserEnvironment.clipboardAPI ? 'Available' : 'Not Available'}
              </div>
            </div>
          </div>
        )}

        {/* Signer Type Details */}
        {signerAnalysis.signerType !== 'none' && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              Signer Details
            </h4>
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                Type: {signerAnalysis.signerType}
              </Badge>
              {signerAnalysis.details.extensionName && (
                <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Extension: {signerAnalysis.details.extensionName}
                </div>
              )}
              {signerAnalysis.details.bunkerUrl && (
                <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'} font-mono break-all`}>
                  Bunker: {signerAnalysis.details.bunkerUrl.slice(0, 50)}...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Technical Data */}
        <DebugInfoPanel 
          title="Raw Technical Data" 
          data={technicalData} 
          defaultExpanded={false}
        />
      </div>
    </DebugSection>
  );
}