import { useState } from 'react';
import { User, Shield, Settings } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useSignerAnalysis } from '@/hooks/useSignerAnalysis';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DebugSection } from '@/components/debug/DebugSection';
import { SignerStatusBadges } from '@/components/debug/SignerStatusBadges';
import { DebugInfoPanel } from '@/components/debug/DebugInfoPanel';

/**
 * Consolidated authentication and identity debugging
 * Replaces duplicate logic from LoginDebugInfo and WalletDebugInfo
 */
export function AuthenticationDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, metadata } = useCurrentUser();
  const { config } = useAppContext();
  const signerAnalysis = useSignerAnalysis();
  const isMobile = useIsMobile();

  const debugData = {
    user: user ? {
      pubkey: user.pubkey,
      metadata: metadata,
    } : null,
    signerAnalysis,
    appConfig: config,
  };

  return (
    <DebugSection
      title="Authentication & Identity"
      icon={<Shield className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <div className="space-y-4">
        {/* Current User Status */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Current User
          </h4>
          {user ? (
            <div className="space-y-1">
              <div className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                <User className="h-4 w-4" />
                <span className="font-mono text-xs break-all">
                  {user.pubkey}
                </span>
              </div>
              {metadata?.name && (
                <div className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                  Display Name: {metadata.name}
                </div>
              )}
              {metadata?.about && (
                <div className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                  About: {metadata.about}
                </div>
              )}
            </div>
          ) : (
            <div className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
              No user logged in
            </div>
          )}
        </div>

        {/* Signer Analysis */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Signer Analysis
          </h4>
          <SignerStatusBadges analysis={signerAnalysis} showDetails={true} />
          
          {signerAnalysis.details.methodsAvailable.length > 0 && (
            <div className="space-y-1">
              <h5 className={`text-xs font-medium text-muted-foreground uppercase tracking-wide`}>
                Available Methods
              </h5>
              <div className="space-y-1">
                {signerAnalysis.details.methodsAvailable.map((method, index) => (
                  <div key={index} className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    • {method}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* App Configuration */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            App Configuration
          </h4>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <div className={`space-y-1 ${isMobile ? 'text-sm' : ''}`}>
              <div>Theme: <span className="font-mono">{config.theme}</span></div>
              <div>Relays: <span className="font-mono text-xs break-all">{config.relayUrls.join(', ')}</span></div>
            </div>
          </div>
        </div>

        {/* Raw Debug Data */}
        <DebugInfoPanel 
          title="Raw Authentication Data" 
          data={debugData} 
          defaultExpanded={false}
        />
      </div>
    </DebugSection>
  );
}