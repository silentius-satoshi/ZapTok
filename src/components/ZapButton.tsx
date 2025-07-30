import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Button } from '@/components/ui/button';
import { QuickZap } from '@/components/QuickZap';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';

interface ZapButtonProps {
  recipientPubkey: string;
  eventId?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ZapButton({ 
  recipientPubkey, 
  eventId, 
  className, 
  variant = "ghost", 
  size = "sm" 
}: ZapButtonProps) {
  const { user } = useCurrentUser();
  const { data: authorData } = useAuthor(recipientPubkey);
  const { toast } = useToast();
  
  const [isQuickZapOpen, setIsQuickZapOpen] = useState(false);
  const [showSparks, setShowSparks] = useState(false);

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send zaps",
        variant: "destructive",
      });
      return;
    }

    // Check if recipient has a Lightning address
    const lightningAddress = getLightningAddress(authorData?.metadata);
    if (!lightningAddress) {
      toast({
        title: "Zap Not Available",
        description: "This user hasn't set up Lightning payments in their profile. They need to add a Lightning address (lud16) or LNURL (lud06) to their Nostr profile.",
        variant: "destructive",
      });
      return;
    }

    // Check if WebLN is available
    if (!window.webln) {
      toast({
        title: "WebLN Not Available",
        description: "Please install the Alby browser extension to send Lightning payments",
        variant: "destructive",
      });
      return;
    }

    // Open QuickZap modal
    setIsQuickZapOpen(true);
  };

  // Callback when zap is successfully sent
  const handleZapSuccess = () => {
    // Trigger sparks animation
    setShowSparks(true);
    setTimeout(() => setShowSparks(false), 1000);
  };

  // Check if Lightning address is available
  const lightningAddress = getLightningAddress(authorData?.metadata);
  const canZap = user && lightningAddress && window.webln;

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`group relative transition-all duration-200 hover:bg-orange-500/10 ${className} ${showSparks ? 'animate-pulse' : ''}`}
        disabled={!canZap}
        title={!lightningAddress ? 'User has no Lightning address' : !user ? 'Login to zap' : !window.webln ? 'Install Alby extension' : 'Click to send zap'}
      >
        <Zap className={`h-4 w-4 transition-all duration-200 ${
          !canZap 
            ? 'text-gray-500' 
            : 'text-orange-500 drop-shadow-[0_0_4px_rgba(255,165,0,0.6)] group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(255,165,0,0.8)] group-hover:scale-110'
        } ${
          showSparks ? 'animate-bounce text-yellow-300 drop-shadow-[0_0_12px_rgba(255,255,0,1)]' : ''
        }`} />
        
        {/* Electric Sparks Effect */}
        {showSparks && (
          <>
            {/* Spark 1 */}
            <div className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-75" />
            {/* Spark 2 */}
            <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.1s' }} />
            {/* Spark 3 */}
            <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.2s' }} />
            {/* Spark 4 */}
            <div className="absolute bottom-0 right-0 w-0.5 h-0.5 bg-orange-300 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.3s' }} />
            {/* Central glow */}
            <div className="absolute inset-0 bg-orange-400/30 rounded-full animate-pulse" />
          </>
        )}
      </Button>

      {/* Quick Zap Modal */}
      <QuickZap
        isOpen={isQuickZapOpen}
        onClose={() => setIsQuickZapOpen(false)}
        recipientPubkey={recipientPubkey}
        eventId={eventId}
        onZapSuccess={handleZapSuccess}
      />
    </>
  );
}
