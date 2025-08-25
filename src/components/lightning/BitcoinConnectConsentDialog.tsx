import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Bitcoin,
  AlertTriangle,
  Shield,
  Zap,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';

interface BitcoinConnectConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  detectedWallet?: string;
  signerType?: string;
}

export function BitcoinConnectConsentDialog({
  isOpen,
  onClose,
  detectedWallet = "Browser Extension Wallet",
  signerType = "bunker"
}: BitcoinConnectConsentDialogProps) {
  const [hasConsented, setHasConsented] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { disconnect } = useWallet();

  const handleKeepConnection = async () => {
    if (!hasConsented) {
      toast({
        title: "Consent Required",
        description: "Please read and acknowledge the information before proceeding",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Store user's consent choice
      localStorage.setItem(`bitcoin_connect_consent_${signerType}`, 'accepted');
      
      toast({
        title: "Connection Maintained",
        description: "Your browser extension wallet will remain connected",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preference",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!hasConsented) {
      toast({
        title: "Consent Required",
        description: "Please read and acknowledge the information before proceeding",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await disconnect();
      
      // Store user's consent choice
      localStorage.setItem(`bitcoin_connect_consent_${signerType}`, 'disconnected');
      
      toast({
        title: "Wallet Disconnected",
        description: "Your browser extension wallet has been disconnected",
        variant: "destructive",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet. You may need to disconnect manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Bitcoin Connect Auto-Connection Detected</span>
          </DialogTitle>
          <DialogDescription>
            We detected an automatic connection to your browser Lightning wallet. Please review your options below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <Alert>
            <Bitcoin className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Detected Wallet:</strong> {detectedWallet}</p>
                <p><strong>Login Method:</strong> {signerType === 'bunker' || signerType.includes('bunker') ? 'Nostr Bunker Signer' : 'Browser Extension'}</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <Zap className="w-3 h-3 mr-1" />
                    Auto-Connected
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Information Sections */}
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h4 className="flex items-center font-medium text-blue-400 mb-2">
                <Info className="w-4 h-4 mr-2" />
                What Happened?
              </h4>
              <p className="text-sm text-gray-300">
                Bitcoin Connect automatically detected and connected to your browser's Lightning wallet extension. 
                This happens because your browser has a WebLN-compatible wallet installed.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <h4 className="flex items-center font-medium text-amber-400 mb-2">
                <Shield className="w-4 h-4 mr-2" />
                Privacy Considerations
              </h4>
              <p className="text-sm text-gray-300">
                Since you're using a <strong>bunker signer</strong>, your Nostr identity is managed remotely. 
                However, your Lightning payments would go through your local browser extension wallet, 
                potentially linking your Nostr activity to your Lightning transactions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="flex items-center font-medium text-green-400 mb-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Keep Connected
                </h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Convenient payments</li>
                  <li>• Existing wallet balance</li>
                  <li>• Familiar interface</li>
                  <li>• Faster transactions</li>
                </ul>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <h4 className="flex items-center font-medium text-red-400 mb-2">
                  <XCircle className="w-4 h-4 mr-2" />
                  Disconnect
                </h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Enhanced privacy</li>
                  <li>• Isolated payment identity</li>
                  <li>• Connect NWC wallet later</li>
                  <li>• Full bunker separation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <input
              type="checkbox"
              id="consent"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="consent" className="text-sm text-gray-300">
              <p className="font-medium mb-1">I understand the implications of my choice</p>
              <p className="text-gray-400">
                I acknowledge that I've read the privacy considerations above and understand 
                how my Lightning wallet choice affects my privacy when using a bunker signer. 
                I can change this setting later in the wallet settings.
              </p>
            </label>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => window.open('https://github.com/getAlby/bitcoin-connect', '_blank')}
            className="flex items-center space-x-1"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Learn More</span>
          </Button>

          <div className="flex space-x-3">
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={!hasConsented || isProcessing}
              className="flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>{isProcessing ? 'Disconnecting...' : 'Disconnect Wallet'}</span>
            </Button>
            
            <Button
              onClick={handleKeepConnection}
              disabled={!hasConsented || isProcessing}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isProcessing ? 'Saving...' : 'Keep Connected'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
