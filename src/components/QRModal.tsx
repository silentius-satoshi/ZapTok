import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';
import { nip19 } from 'nostr-tools';
import QrCode from '@/components/QrCode';
import { generateProfileShareURL, generateDualDisplay, generateVideoShareURL } from '@/lib/nostr-urls';
import type { NostrMetadata, NostrEvent } from '@nostrify/nostrify';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkey: string;
  metadata?: NostrMetadata;
  displayName: string;
  relays?: string[]; // Added for richer profile sharing
  event?: NostrEvent; // Optional: for event-specific sharing
}

export function QRModal({ isOpen, onClose, pubkey, metadata, displayName, relays, event }: QRModalProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'pubkey' | 'lightning'>('share');
  const [pubkeyCopied, setPubkeyCopied] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);
  const [lightningCopied, setLightningCopied] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [nostrIdCopied, setNostrIdCopied] = useState(false);
  const { toast } = useToast();

  const lightningAddress = getLightningAddress(metadata);
  const nip05 = metadata?.nip05;
  const profilePicture = metadata?.picture;
  
  // Safely encode npub, handling invalid pubkeys (e.g., in tests)
  let npub: string;
  try {
    npub = nip19.npubEncode(pubkey);
  } catch {
    // Fallback for invalid pubkeys (e.g., test data)
    npub = pubkey.startsWith('npub') ? pubkey : `npub${pubkey}`;
  }
  
  // Generate comprehensive sharing URLs - prefer event sharing if event is provided
  const shareableURLs = event 
    ? generateVideoShareURL(event, relays)
    : generateProfileShareURL(pubkey, metadata, relays);
  const dualDisplay = generateDualDisplay(shareableURLs.raw);

  const copyToClipboard = async (text: string, type: 'pubkey' | 'npub' | 'lightning' | 'sharelink' | 'nostrid') => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === 'pubkey') {
        setPubkeyCopied(true);
        setTimeout(() => setPubkeyCopied(false), 2000);
      } else if (type === 'npub') {
        setNpubCopied(true);
        setTimeout(() => setNpubCopied(false), 2000);
      } else if (type === 'lightning') {
        setLightningCopied(true);
        setTimeout(() => setLightningCopied(false), 2000);
      } else if (type === 'sharelink') {
        setShareLinkCopied(true);
        setTimeout(() => setShareLinkCopied(false), 2000);
      } else if (type === 'nostrid') {
        setNostrIdCopied(true);
        setTimeout(() => setNostrIdCopied(false), 2000);
      }

      const descriptions = {
        pubkey: 'Public key',
        npub: 'Npub',
        lightning: 'Lightning address',
        sharelink: 'Share link',
        nostrid: 'Nostr identifier'
      };

      toast({
        title: 'Copied!',
        description: `${descriptions[type]} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const formatPubkey = (key: string) => {
    return `${key.slice(0, 8)}...${key.slice(-8)}`;
  };

  const formatNpub = (npubKey: string) => {
    return `${npubKey.slice(0, 12)}...${npubKey.slice(-8)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <div className="space-y-6">
          {/* Top - Profile Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profilePicture} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm truncate">{displayName}</p>
              {nip05 && (
                <p className="text-xs text-muted-foreground truncate">
                  {nip05}
                </p>
              )}
            </div>
          </div>

          {/* Center - QR Code with Tabs */}
          <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
              {activeTab === 'share' && (
                <QrCode 
                  value={shareableURLs.fallback} // Use njump.me URL for universal access
                  size={288} 
                />
              )}
              {activeTab === 'pubkey' && (
                <QrCode 
                  value={npub} 
                  size={288} 
                />
              )}
              {activeTab === 'lightning' && lightningAddress && (
                <QrCode 
                  value={lightningAddress} 
                  size={288} 
                />
              )}
              {activeTab === 'lightning' && !lightningAddress && (
                <div className="w-72 h-72 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground text-center text-sm">
                    No Lightning address<br />configured
                  </p>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'share' | 'pubkey' | 'lightning')} className="w-full max-w-sm">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="share">Share Link</TabsTrigger>
                <TabsTrigger value="pubkey">Public Key</TabsTrigger>
                <TabsTrigger value="lightning" disabled={!lightningAddress}>
                  Lightning
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Bottom - Copy Fields with Enhanced Sharing */}
          <div className="space-y-4">
            {/* Universal Share Link Section */}
            {activeTab === 'share' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Universal Link:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                      {shareableURLs.fallback}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(shareableURLs.fallback, 'sharelink')}
                      className="h-6 w-6 p-0"
                    >
                      {shareLinkCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(shareableURLs.fallback, '_blank')}
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nostr ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                      {shareableURLs.raw}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(shareableURLs.raw, 'nostrid')}
                      className="h-6 w-6 p-0"
                    >
                      {nostrIdCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded">
                  Share this universal link to let others view your profile in any Nostr client
                </div>
              </div>
            )}

            {/* Original Public Key Section */}
            {activeTab === 'pubkey' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Public key (npub):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{formatNpub(npub)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(npub, 'npub')}
                      className="h-6 w-6 p-0"
                    >
                      {npubCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Public key (hex):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{pubkey.slice(0, 12)}...{pubkey.slice(-8)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(pubkey, 'pubkey')}
                      className="h-6 w-6 p-0"
                    >
                      {pubkeyCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lightning Address Section */}
            {activeTab === 'lightning' && lightningAddress && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lightning address:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{lightningAddress}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(lightningAddress, 'lightning')}
                    className="h-6 w-6 p-0"
                  >
                    {lightningCopied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}