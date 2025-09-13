import { useEffect } from 'react';
import { init as initBitcoinConnect } from '@getalby/bitcoin-connect-react';
import { devLog } from '@/lib/devConsole';

interface BitcoinConnectInitProps {
  children: React.ReactNode;
}

/**
 * Bitcoin Connect initialization wrapper
 * Based on Jumble's implementation pattern
 */
export function BitcoinConnectInit({ children }: BitcoinConnectInitProps) {
  useEffect(() => {
    // Initialize Bitcoin Connect with app-specific configuration
    const initializeBitcoinConnect = async () => {
      try {
        await initBitcoinConnect({
          appName: 'ZapTok',
          // Add any other configuration options as needed
        });
        
        devLog('Bitcoin Connect initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Bitcoin Connect:', error);
        // Don't throw - let the app continue without Bitcoin Connect
      }
    };

    initializeBitcoinConnect();
  }, []);

  return <>{children}</>;
}