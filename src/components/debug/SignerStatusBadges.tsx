import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { SignerAnalysis } from '@/hooks/useSignerAnalysis';

interface SignerStatusBadgesProps {
  analysis: SignerAnalysis;
  showDetails?: boolean;
}

/**
 * Displays status badges for signer capabilities and compatibility
 */
export function SignerStatusBadges({ analysis, showDetails = false }: SignerStatusBadgesProps) {
  const getStatusIcon = (status: SignerAnalysis['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-3 w-3" />;
      case 'partial':
        return <AlertCircle className="h-3 w-3" />;
      case 'disconnected':
        return <XCircle className="h-3 w-3" />;
      case 'error':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusVariant = (status: SignerAnalysis['status']) => {
    switch (status) {
      case 'connected':
        return 'default' as const;
      case 'partial':
        return 'secondary' as const;
      case 'disconnected':
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const getCapabilityVariant = (enabled: boolean) => {
    return enabled ? 'default' : 'outline';
  };

  return (
    <div className="space-y-3">
      {/* Overall Status */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={getStatusVariant(analysis.status)} className="flex items-center gap-1">
          {getStatusIcon(analysis.status)}
          <span className="capitalize">{analysis.status}</span>
        </Badge>
        
        <Badge variant="outline" className="capitalize">
          {analysis.signerType === 'none' ? 'No Signer' : analysis.signerType}
        </Badge>

        {analysis.details.extensionName && (
          <Badge variant="secondary">
            {analysis.details.extensionName}
          </Badge>
        )}
      </div>

      {/* Capabilities */}
      {showDetails && (
        <>
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Capabilities
            </h4>
            <div className="flex flex-wrap gap-1">
              <Badge variant={getCapabilityVariant(analysis.capabilities.signing)} className="text-xs">
                Event Signing
              </Badge>
              <Badge variant={getCapabilityVariant(analysis.capabilities.nip44)} className="text-xs">
                NIP-44 Encryption
              </Badge>
              <Badge variant={getCapabilityVariant(analysis.capabilities.webln)} className="text-xs">
                WebLN
              </Badge>
              <Badge variant={getCapabilityVariant(analysis.capabilities.bunker)} className="text-xs">
                Remote Signing
              </Badge>
            </div>
          </div>

          {/* Compatibility */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Compatibility
            </h4>
            <div className="flex flex-wrap gap-1">
              <Badge variant={getCapabilityVariant(analysis.compatibility.cashu)} className="text-xs">
                Cashu Wallet
              </Badge>
              <Badge variant={getCapabilityVariant(analysis.compatibility.lightning)} className="text-xs">
                Lightning Payments
              </Badge>
              <Badge variant={getCapabilityVariant(analysis.compatibility.encryption)} className="text-xs">
                Encrypted Messages
              </Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}