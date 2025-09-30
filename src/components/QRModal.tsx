import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';
import { nip19 } from 'nostr-tools';
import QrCode from '@/components/QrCode';
import type { NostrMetadata } from '@nostrify/nostrify';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkey: string;
  metadata?: NostrMetadata;
  displayName: string;
}

export function QRModal({ isOpen, onClose, pubkey, metadata, displayName }: QRModalProps) {
  const [activeTab, setActiveTab] = useState<'pubkey' | 'lightning'>('pubkey');
  const [pubkeyCopied, setPubkeyCopied] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);
  const [lightningCopied, setLightningCopied] = useState(false);
  const { toast } = useToast();

  const lightningAddress = getLightningAddress(metadata);
  const nip05 = metadata?.nip05;
  const profilePicture = metadata?.picture;
  const npub = nip19.npubEncode(pubkey);

  const copyToClipboard = async (text: string, type: 'pubkey' | 'npub' | 'lightning') => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === 'pubkey') {
        setPubkeyCopied(true);
        setTimeout(() => setPubkeyCopied(false), 2000);
      } else if (type === 'npub') {
        setNpubCopied(true);
        setTimeout(() => setNpubCopied(false), 2000);
      } else {
        setLightningCopied(true);
        setTimeout(() => setLightningCopied(false), 2000);
      }

      toast({
        title: 'Copied!',
        description: `${type === 'pubkey' ? 'Public key' : type === 'npub' ? 'Npub' : 'Lightning address'} copied to clipboard`,
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

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pubkey' | 'lightning')} className="w-full max-w-xs">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pubkey">Public key</TabsTrigger>
                <TabsTrigger value="lightning" disabled={!lightningAddress}>
                  Lightning address
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Bottom - Copy Fields */}
          <div className="space-y-4">
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

            {lightningAddress && (
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