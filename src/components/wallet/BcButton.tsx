import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Zap } from 'lucide-react';
import { 
  init as initBitcoinConnect,
  launchPaymentModal,
  onConnected,
  onDisconnected
} from '@getalby/bitcoin-connect-react';

interface BcButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

/**
 * Bitcoin Connect Button component based on Jumble's BcButton
 * Provides wallet connection functionality similar to their implementation
 */
export function BcButton({ 
  variant = 'default', 
  size = 'default',
  className = '',
  showIcon = true,
  children 
}: BcButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize Bitcoin Connect
    const initialize = async () => {
      try {
        setIsLoading(true);
        await initBitcoinConnect({
          appName: 'ZapTok'
        });

        // Set up connection event listeners (following Jumble's pattern)
        onConnected(() => {
          setIsConnected(true);
        });

        onDisconnected(() => {
          setIsConnected(false);
        });

      } catch (error) {
        console.error('Failed to initialize Bitcoin Connect:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const handleClick = () => {
    // This would trigger the Bitcoin Connect modal
    // The actual implementation would depend on the specific use case
    if (isConnected) {
      console.log('Bitcoin Connect wallet is connected');
    } else {
      console.log('Opening Bitcoin Connect connection modal...');
      // In a real implementation, this would open the connection modal
    }
  };

  const buttonText = children || (isConnected ? 'Connected' : 'Connect Wallet');

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {showIcon && (
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Zap className="h-4 w-4 text-yellow-400" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
        </div>
      )}
      {isLoading ? 'Connecting...' : buttonText}
    </Button>
  );
}

// Export for use as "bc-button" throughout the app (Jumble naming convention)
export default BcButton;