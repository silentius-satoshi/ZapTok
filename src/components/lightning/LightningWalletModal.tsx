import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/useToast';
import { Zap, Info } from 'lucide-react';
import NostrWalletConnectCard from './wallet-connections/NostrWalletConnectCard';
import BitcoinConnectCard from './wallet-connections/BitcoinConnectCard';
import CashuWalletCard from './wallet-connections/CashuWalletCard';

interface LightningWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  showBTC?: boolean;
}

const LightningWalletModal = ({ isOpen, onClose, showBTC: _showBTC = false }: LightningWalletModalProps) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleNostrWalletConnect = async () => {
    setIsConnecting('nwc');
    try {
      // Simulate NWC connection - in real implementation, you'd use NWC protocol
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Nostr Wallet Connect",
        description: "Successfully connected your NWC wallet!"
      });
      onClose();
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Nostr Wallet Connect",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleBitcoinConnect = async () => {
    setIsConnecting('btc');
    try {
      // Simulate Bitcoin Connect - in real implementation, you'd use Bitcoin Connect protocol
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Bitcoin Connect",
        description: "Successfully connected your Bitcoin wallet!"
      });
      onClose();
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Bitcoin Connect",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleCashuConnect = async () => {
    setIsConnecting('cashu');
    try {
      // Simulate Cashu connection - in real implementation, you'd use Cashu protocol
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Cashu Wallet",
        description: "Successfully connected your Cashu wallet!"
      });
      onClose();
    } catch {
      toast({
        title: "Connection failed",
        description: "Could not connect to Cashu wallet",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-background border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-orange-400">
              <Zap className="w-6 h-6" />
              <span>Connect Lightning Wallet</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-orange-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-card border text-card-foreground max-w-xs">
                  <div className="p-2">
                    <h4 className="text-sm font-semibold text-orange-300 mb-2">⚡︎ Lightning Integration</h4>
                    <p className="text-xs text-orange-200 leading-relaxed">
                      ZapTok integrates Bitcoin's Lightning Network for instant, low-fee payments. 
                      Zap creators directly with just a tap! Lightning Network enables fast, low-cost Bitcoin payments 
                      perfect for microtransactions and zapping creators on Nostr.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Connect your Lightning wallet to send and receive instant Bitcoin payments on ZapTok.
              </p>
              
              <NostrWalletConnectCard
                isConnecting={isConnecting === 'nwc'}
                onConnect={handleNostrWalletConnect}
              />
              
              <BitcoinConnectCard
                isConnecting={isConnecting === 'btc'}
                onConnect={handleBitcoinConnect}
              />

              <CashuWalletCard
                isConnecting={isConnecting === 'cashu'}
                onConnect={handleCashuConnect}
              />
            </div>
            <style>
              {`
                .scrollbar-hide {
                  scrollbar-width: none;
                  -ms-overflow-style: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default LightningWalletModal;
