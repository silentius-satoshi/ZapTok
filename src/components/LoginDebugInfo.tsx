import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginDebugInfo() {
  const { user, metadata } = useCurrentUser();
  const { config } = useAppContext();

  return (
    <Card className="max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Login Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Current User:</h4>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
            {JSON.stringify({
              loggedIn: !!user,
              pubkey: user?.pubkey,
              hasMetadata: !!metadata,
              metadata: metadata ? {
                name: metadata.name,
                display_name: metadata.display_name,
                picture: metadata.picture,
                about: metadata.about?.slice(0, 100)
              } : null,
            }, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-semibold">App Configuration:</h4>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
            {JSON.stringify({
              relayUrls: config.relayUrls,
              theme: config.theme,
            }, null, 2)}
          </pre>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>If you're logged in but don't see metadata, your profile might not exist on the current relay.</p>
          <p>Try switching to a different relay or create a profile by editing it.</p>
        </div>
      </CardContent>
    </Card>
  );
}
