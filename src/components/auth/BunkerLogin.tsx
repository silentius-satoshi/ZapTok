import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, HelpCircle, Link, AlertTriangle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrToolsBunkerLogin } from '@/hooks/useNostrToolsBunkerLogin';

interface BunkerLoginProps {
  login: (bunkerUrl: string) => Promise<void>;
  isLocked: boolean;
  onLoginSuccess?: (loginData: any) => void;
}

const BunkerLogin = ({ login, isLocked, onLoginSuccess }: BunkerLoginProps) => {
  const [bunkerUrl, setBunkerUrl] = useState('');
  const [isBunkerLoading, setIsBunkerLoading] = useState(false);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useCurrentUser();

  // Use the new nostr-tools bunker login hook
  const { bunkerLogin: nostrToolsBunkerLogin, loading: ntLoading, error: ntError } = useNostrToolsBunkerLogin();

  // Cleanup polling interval when component unmounts
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-detect successful login while waiting for confirmation
  useEffect(() => {
    if (user && isWaitingForConfirmation) {
      console.log('User logged in successfully while waiting for confirmation!');
      // Clean up polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsWaitingForConfirmation(false);
      setIsBunkerLoading(false);
    }
  }, [user, isWaitingForConfirmation]);

  const handleBunkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bunkerUrl.trim()) {
      // Error handling will be done by parent component via toast
      return;
    }

    setIsBunkerLoading(true);
    setAuthUrl(null);

    try {
      // Try the new nostr-tools implementation first
      console.log('🔧 Attempting bunker login with nostr-tools...');
      const loginData = await nostrToolsBunkerLogin(bunkerUrl);

      if (loginData && onLoginSuccess) {
        onLoginSuccess(loginData);
      }

      setIsBunkerLoading(false);
      console.log('✅ nostr-tools bunker login successful!');
      return;

    } catch (nostrToolsError) {
      console.log('❌ nostr-tools bunker login failed, falling back to Nostrify...', nostrToolsError);

      // Fallback to the original Nostrify implementation
      try {
        // Try the initial login
        await login(bunkerUrl);
        // Success on first try! Clean up and finish
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsWaitingForConfirmation(false);
        setIsBunkerLoading(false);
      } catch (error) {
        // Check if the error is actually a confirmation URL
        if (error instanceof Error && error.message.startsWith('https://')) {
          console.log('Bunker confirmation required:', error.message);
          setIsWaitingForConfirmation(true);
          setAuthUrl(error.message);

          // Copy the confirmation URL to clipboard for easy access
          try {
            await navigator.clipboard.writeText(error.message);
            console.log('Confirmation URL copied to clipboard');
          } catch (clipboardError) {
            console.log('Could not copy to clipboard:', clipboardError);
          }

          // Start polling for successful connection by checking user state
          let attempts = 0;
          const maxAttempts = 60; // 5 minutes with 5-second intervals

          pollIntervalRef.current = setInterval(async () => {
            attempts++;
            console.log(`Polling for bunker connection (attempt ${attempts}/${maxAttempts})...`);

            // Instead of calling login() again, just check if user is logged in
            if (user) {
              console.log('Bunker connection successful - user is now logged in!');
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setIsWaitingForConfirmation(false);
              setIsBunkerLoading(false);
              return;
            }

            // Try one more login attempt (but with less frequency to avoid timeouts)
            if (attempts % 3 === 0) { // Only retry every 3rd attempt (every 15 seconds)
              try {
                console.log(`Retrying bunker login on attempt ${attempts}...`);
                await login(bunkerUrl);
                // If we get here, login succeeded
                console.log('Bunker connection successful!');
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                setIsWaitingForConfirmation(false);
                setIsBunkerLoading(false);
                return;
              } catch (retryError) {
                console.log(`Retry attempt ${attempts} failed:`, retryError);
                // Continue polling even if retry fails
              }
            }

            if (attempts >= maxAttempts) {
              // Give up after max attempts
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setIsWaitingForConfirmation(false);
              setIsBunkerLoading(false);
              console.error('Bunker connection timeout after', maxAttempts, 'attempts');
            }
          }, 5000); // Poll every 5 seconds

          // Don't throw the confirmation URL error, let polling handle it
          return;
        } else {
          // Re-throw actual errors
          setIsBunkerLoading(false);
          throw error;
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4 text-blue-300" />
          <h4 className="text-sm font-semibold text-blue-300">Remote Signing</h4>
        </div>
        <p className="text-xs text-blue-200 leading-relaxed">
          Connect to a remote signer for secure key management. Your private key stays on your bunker server.
        </p>
      </div>

      <form onSubmit={handleBunkerLogin} className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="space-y-2">
          <Label htmlFor="bunkerurl" className="text-gray-200 flex items-center space-x-2">
            <Link className="w-4 h-4" />
            <span>Bunker URL</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-white" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>Bunker URL Format</strong><br />
                    Enter the connection string from your bunker server. This typically starts with
                    "bunker://" followed by your pubkey and connection parameters.
                    <br /><br />
                    <strong>Example:</strong><br />
                    bunker://pubkey?relay=wss://relay.nsec.app&secret=xxx
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="bunkerurl"
            type="text"
            value={bunkerUrl}
            onChange={e => setBunkerUrl(e.target.value)}
            placeholder="bunker://pubkey?relay=wss://...&secret=..."
            className="bg-gray-900 border-gray-600 text-white font-mono text-sm"
            disabled={isLocked}
          />
          {bunkerUrl && !bunkerUrl.startsWith('bunker://') && (
            <p className="text-red-400 text-xs">
              ❌ URL must start with bunker://
            </p>
          )}
          {bunkerUrl && bunkerUrl.startsWith('bunker://') && !bunkerUrl.includes('?') && (
            <p className="text-yellow-400 text-xs">
              ⚠️ Bunker URL should include query parameters (?relay=...&secret=...)
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          disabled={isBunkerLoading || ntLoading || isLocked}
        >
          <Zap className="w-4 h-4 mr-2" />
          {isWaitingForConfirmation
            ? "Waiting for confirmation..."
            : (isBunkerLoading || ntLoading)
              ? "Connecting..."
              : "Connect to Bunker"
          }
        </Button>

        {(ntError || isWaitingForConfirmation) && (
          <Alert className={ntError ? "bg-red-900/20 border-red-600" : "bg-blue-900/20 border-blue-600"}>
            <Zap className={`w-4 h-4 ${ntError ? "text-red-300" : "text-blue-300"}`} />
            <AlertDescription className={`text-sm ${ntError ? "text-red-200" : "text-blue-200"}`}>
              {ntError ? (
                <>
                  <strong>Connection failed:</strong> {ntError}
                  <br />
                  <span className="text-yellow-300">💡 Trying fallback method...</span>
                </>
              ) : (
                <>
                  Please approve the connection on your bunker device (nsec.app, Amber, etc.).
                  <br />
                  We'll automatically detect when you approve and complete the login.
                  {authUrl && (
                    <>
                      <br />
                      <span className="text-yellow-300">💡 Confirmation URL copied to clipboard:</span>
                      <br />
                      <code className="text-xs bg-black/20 px-1 rounded">{authUrl}</code>
                    </>
                  )}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </form>

      <Alert className="bg-gray-900 border-gray-700">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <AlertDescription className="text-gray-300 text-sm">
          <strong>Popular Bunkers:</strong> nsec.app, Amber (Android), or self-hosted options like Nostrum
          <br />
          <strong>Need a bunker URL?</strong> Get one from <a href="https://nsec.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">nsec.app</a>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BunkerLogin;
