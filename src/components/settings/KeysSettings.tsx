import { useState } from 'react';
import { Copy, Eye, EyeOff, CheckCircle, AlertCircle, Shield, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useNostrLogin } from '@nostrify/react/login';
import { nip19, getPublicKey as derivePublicKeyFromSecret } from 'nostr-tools';
import { deriveP2PKPubkey } from '@/lib/p2pk';

export function KeysSettings() {
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  const { toast } = useToast();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showP2PKPrivateKey, setShowP2PKPrivateKey] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getPublicKey = () => {
    if (!user?.pubkey) return '';
    try {
      return nip19.npubEncode(user.pubkey);
    } catch {
      return '';
    }
  };

  const getPrivateKey = (): string => {
    // Check if it's an nsec login and look for private key in data
    if (currentLogin?.type === 'nsec' && currentLogin.data) {
      try {
        // The private key might be in the data object
        const data = currentLogin.data as any;
        
        // Try different possible property names for the private key
        if ('nsec' in data && typeof data.nsec === 'string') {
          // The nsec is already encoded as a string, just return it
          return data.nsec;
        } else if ('secretKey' in data) {
          const nsecBytes = data.secretKey as Uint8Array;
          return nip19.nsecEncode(nsecBytes);
        } else if ('privateKey' in data) {
          const nsecBytes = data.privateKey as Uint8Array;
          return nip19.nsecEncode(nsecBytes);
        }
      } catch (error) {
        console.error('Error accessing private key:', error);
        return '';
      }
    }
    return '';
  };

  const currentLogin = logins[0]; // Get first login for now
  const publicKey = getPublicKey();
  const privateKey = getPrivateKey();
  const isExtensionLogin = currentLogin?.type === 'extension';
  const canShowPrivateKey = currentLogin?.type === 'nsec' && privateKey.length > 0;

  // Derive P2PK keys - attempt for all login types
  let p2pkPrivateKey: string | null = null;
  let p2pkPublicKey: string | null = null;
  
  // Method 1: Direct derivation from available private key (nsec logins)
  if (privateKey) {
    try {
      const secretKey = nip19.decode(privateKey).data as Uint8Array;
      const hexPrivateKey = Array.from(secretKey).map(b => b.toString(16).padStart(2, '0')).join('');
      p2pkPrivateKey = hexPrivateKey;
      p2pkPublicKey = deriveP2PKPubkey(hexPrivateKey);
    } catch (error) {
      console.error('Error deriving P2PK keys from private key:', error);
    }
  }
  
  // Method 2: For extension users, try to derive P2PK keys using signer capabilities
  if (!p2pkPrivateKey && isExtensionLogin && user?.signer) {
    try {
      // We can't get the raw private key, but we can still derive the P2PK public key
      // The extension should be able to provide P2PK functionality
      // For now, we'll indicate that P2PK keys could be available but aren't exposed
      console.log('Extension login detected - P2PK private key not directly accessible');
      
      // TODO: Check if the extension supports P2PK key derivation
      // Some extensions might implement P2PK support in the future
    } catch (error) {
      console.error('Error checking extension P2PK capabilities:', error);
    }
  }

  // P2PK keys are available for nsec logins only (for now)
  const canShowP2PKKeys = canShowPrivateKey && p2pkPrivateKey;

  // Verify that the private key generates the correct public key
  const verifyKeyPair = (): boolean => {
    if (!privateKey || !user?.pubkey) return false;
    try {
      // Decode the nsec to get the secret key bytes
      const { data: secretKey } = nip19.decode(privateKey);
      // Generate the public key from the secret key using Schnorr signatures for secp256k1 (NIP-01)
      const derivedPubkey = derivePublicKeyFromSecret(secretKey as Uint8Array);
      // Compare with the current user's public key
      return derivedPubkey === user.pubkey;
    } catch {
      return false;
    }
  };

  const isKeyPairValid = privateKey ? verifyKeyPair() : null;

  return (
    <div className="p-6 space-y-8 text-white">
      {/* Title and Description */}
      <div className="space-y-4">
        <h2 className="text-4xl font-light">Your Keys</h2>
        <p className="text-gray-400 text-lg leading-relaxed max-w-4xl">
          Your Nostr identity consists of a public key (npub) and private key (nsec). Your public key is like your username - share it freely so others can find and follow you. Your private key is your password - never share it with anyone. With your private key, you can log into any Nostr app and access your identity, followers, and content.
        </p>
      </div>

      {/* Public Key Section */}
      <div className="space-y-3">
        <h3 className="text-xl font-medium">Public Key (npub)</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm break-all overflow-hidden min-w-0">
            {publicKey || 'Not available'}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copyToClipboard(publicKey, 'Public key')}
            disabled={!publicKey}
            className="text-gray-400 hover:text-white flex-shrink-0"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-gray-500 text-sm">
          Share this with others so they can find and follow you on Nostr.
        </p>
      </div>

      {/* Private Key Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-medium">Private Key (nsec)</h3>
          {isKeyPairValid === true && (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Verified</span>
            </div>
          )}
          {isKeyPairValid === false && (
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Invalid</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm break-all overflow-hidden min-w-0">
            {canShowPrivateKey ? (
              showPrivateKey ? privateKey : '•'.repeat(64)
            ) : (
              showPrivateKey ? '***** Private key not accessible *****' : '•'.repeat(32)
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-gray-400 hover:text-white"
            >
              {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(privateKey, 'Private key')}
              disabled={!canShowPrivateKey || !privateKey}
              className="text-gray-400 hover:text-white"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          {isExtensionLogin 
            ? "This app cannot access your private key directly when using an extension. This is for your security."
            : isKeyPairValid === true
            ? "✅ This private key is authentic and matches your public key. Keep it safe - anyone with this key can post as you."
            : isKeyPairValid === false
            ? "⚠️ Warning: This private key does not match your public key. There may be an issue with your account."
            : "Keep your private key safe! It's like a password to your Nostr identity. Anyone with this key can post as you."
          }
        </p>
      </div>

      {/* P2PK Keys Section */}
      <div className="space-y-6 p-6 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <h3 className="text-xl font-medium">P2PK-locked ecash</h3>
          </div>
          <div className="flex items-center gap-1 text-amber-600 text-sm">
            <Wallet className="w-4 h-4" />
            <span>For Cashu P2PK Proofs</span>
          </div>
        </div>

        <div className="bg-amber-100/50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                🔐 Critical Security Notice
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                This feature is experimental. Your P2PK-locked ecash are permanently locked to your private key. Only use with small amounts. If you lose this private key or switch to a different wallet without backing it up, any P2PK proofs (from nutzaps) will become permanently unspendable. Nobody will be able to unlock the ecash locked to it anymore. Always backup your private keys!
              </p>
            </div>
          </div>
        </div>

        {/* P2PK Public Key */}
        <div className="space-y-3">
          <h4 className="text-lg font-medium">P2PK Public Key</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm break-all overflow-hidden min-w-0">
              {p2pkPublicKey || 'Not available'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(p2pkPublicKey || '', 'P2PK public key')}
              disabled={!p2pkPublicKey}
              className="text-gray-400 hover:text-white flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-500 text-sm">
            This public key is used to lock Cashu P2PK proofs. When you receive nutzaps, they are locked to this key.
          </p>
        </div>

        {/* P2PK Private Key */}
        <div className="space-y-3">
          <h4 className="text-lg font-medium">P2PK Private Key (nsec)</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm break-all overflow-hidden min-w-0">
              {canShowP2PKKeys ? (
                showP2PKPrivateKey ? p2pkPrivateKey : '•'.repeat(64)
              ) : (
                '•'.repeat(32)
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowP2PKPrivateKey(!showP2PKPrivateKey)}
                disabled={!canShowP2PKKeys}
                className="text-gray-400 hover:text-white"
              >
                {showP2PKPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(p2pkPrivateKey || '', 'P2PK private key')}
                disabled={!canShowP2PKKeys || !p2pkPrivateKey}
                className="text-gray-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-500 text-sm">
              {isExtensionLogin 
                ? "⚠️ Extension Limitation: Your browser extension doesn't expose P2PK private keys. To access P2PK functionality for spending nutzaps, you'll need to login with your nsec key directly or use an extension that supports P2PK operations."
                : canShowP2PKKeys
                ? "⚠️ BACKUP ESSENTIAL: This private key is required to spend any P2PK proofs (nutzaps) you receive. Store it safely alongside your Nostr key."
                : "P2PK private key derived from your Nostr private key. Required for spending P2PK proofs."
              }
            </p>
            {canShowP2PKKeys && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  <strong>⚠️ Security Warning:</strong> Anyone with this private key can spend your P2PK proofs. Never share it publicly or store it in unsecured locations.
                </p>
              </div>
            )}
            {isExtensionLogin && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>💡 Workaround:</strong> To access P2PK functionality while using an extension, you can temporarily login with your nsec key to view/backup your P2PK keys, then switch back to your extension for daily use.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
