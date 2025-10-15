import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useNostrLogin } from '@nostrify/react/login';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/useIsMobile';

export function LoginDebugInfo() {
  const { user, metadata } = useCurrentUser();
  const { config } = useAppContext();
  const { logins } = useNostrLogin();
  const isMobile = useIsMobile();

  return (
    <Card className={`${isMobile ? 'w-full' : 'max-w-2xl mx-auto'} mt-4`}>
      <CardHeader>
        <CardTitle className={isMobile ? 'text-lg' : ''}>Login Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Current User:</h4>
          <pre className={`${isMobile ? 'text-xs' : 'text-xs'} bg-muted p-2 rounded overflow-x-auto ${isMobile ? 'max-w-full' : ''}`}>
            {JSON.stringify({
              loggedIn: !!user,
              pubkey: user?.pubkey,
              signerConstructorName: user?.signer?.constructor?.name,
              hasMetadata: !!metadata,
              metadata: metadata ? {
                name: metadata.name,
                display_name: metadata.display_name,
                picture: metadata.picture,
                about: metadata.about?.slice(0, 100)
              } : null,
            }, null, isMobile ? 1 : 2)}
          </pre>
        </div>
        
        <div>
          <h4 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Signer Detection (for Wallet Settings):</h4>
          <pre className={`${isMobile ? 'text-xs' : 'text-xs'} bg-muted p-2 rounded overflow-x-auto ${isMobile ? 'max-w-full' : ''}`}>
            {JSON.stringify({
              currentUserLogin: logins.find(login => login.pubkey === user?.pubkey),
              isExtensionSigner: logins.find(login => login.pubkey === user?.pubkey)?.type === 'extension' || !!(window.nostr && user?.signer?.constructor?.name?.includes('NIP07')),
              isBunkerSigner: logins.find(login => login.pubkey === user?.pubkey)?.type === 'bunker' || 
                             logins.find(login => login.pubkey === user?.pubkey)?.type === 'x-bunker-nostr-tools' ||
                             user?.signer?.constructor?.name?.includes('bunker'),
              isNsecSigner: logins.find(login => login.pubkey === user?.pubkey)?.type === 'nsec' || 
                           user?.signer?.constructor?.name?.includes('nsec')
            }, null, isMobile ? 1 : 2)}
          </pre>
        </div>
        
        <div>
          <h4 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>App Configuration:</h4>
          <pre className={`${isMobile ? 'text-xs' : 'text-xs'} bg-muted p-2 rounded overflow-x-auto ${isMobile ? 'max-w-full' : ''}`}>
            {JSON.stringify({
              relayUrls: config.relayUrls,
              theme: config.theme,
            }, null, isMobile ? 1 : 2)}
          </pre>
        </div>
        
        <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
          <p>If you're logged in but don't see metadata, your profile might not exist on the current relay.</p>
          <p>Try switching to a different relay or create a profile by editing it.</p>
        </div>
      </CardContent>
    </Card>
  );
}
