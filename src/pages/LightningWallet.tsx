import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet';

export function LightningWallet() {
  const navigate = useNavigate();
  const { isBunkerSigner } = useWallet();

  useEffect(() => {
    // Redirect to the appropriate wallet page based on signer type
    if (isBunkerSigner) {
      navigate('/bitcoin-connect-wallet', { replace: true });
    } else {
      navigate('/cashu-wallet', { replace: true });
    }
  }, [navigate, isBunkerSigner]);

  // Return null while redirecting
  return null;
}

export default LightningWallet;