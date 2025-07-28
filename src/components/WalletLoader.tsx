import { useWalletAutoLoader } from '@/hooks/useWalletAutoLoader';
import { useAutoReceiveNutzaps } from '@/hooks/useAutoReceiveNutzaps';

/**
 * Component that handles automatic wallet loading and nutzap reception
 * when users log in. This component doesn't render anything visible,
 * but runs the necessary background processes.
 */
export function WalletLoader() {
  // Automatically load wallet data when user logs in
  useWalletAutoLoader();
  
  // Automatically receive and redeem incoming nutzaps
  useAutoReceiveNutzaps();
  
  // This component doesn't render anything
  return null;
}
