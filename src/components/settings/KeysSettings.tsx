import { useState } from 'react';
import { Copy, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useNostrLogin } from '@nostrify/react/login';
import { nip19, getPublicKey as derivePublicKeyFromSecret } from 'nostr-tools';

export function KeysSettings() {
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  const { toast } = useToast();
  const [showPrivateKey, setShowPrivateKey] = useState(false);

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
    </div>
  );
}
