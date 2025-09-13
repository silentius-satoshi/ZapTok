import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNostrLogin } from '@nostrify/react/login';

export function WalletDebugInfo() {
  const { userHasLightningAccess, walletInfo, isBunkerSigner, isCashuCompatible, isExtensionSigner, isConnected } = useWallet();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();

  // Detect nsec signer type
  const { logins } = useNostrLogin();
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const isNsecSigner = currentUserLogin?.type === 'nsec' ||
                      user?.signer?.constructor?.name?.includes('nsec');

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
      <strong>Wallet Debug Info:</strong>
      <br />Login Type: {currentUserLogin?.type}
      <br />Signer: {user?.signer?.constructor?.name}
      <br />Extension Signer: {isExtensionSigner ? 'Yes' : 'No'}
      <br />Bunker Signer: {isBunkerSigner ? 'Yes' : 'No'}
      <br />Nsec Signer: {isNsecSigner ? 'Yes' : 'No'}
      <br />Cashu Compatible: {isCashuCompatible ? 'Yes' : 'No'}
      <br />Lightning Access: {userHasLightningAccess ? 'Yes' : 'No'}
      <br />Wallet Connected: {isConnected ? 'Yes' : 'No'}
      <br />User: {user?.pubkey?.slice(0, 8)}...
      <br />Mobile: {isMobile ? 'Yes' : 'No'}
    </div>
  );
}