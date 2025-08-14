import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';
import { nip19 } from 'nostr-tools';
import QRCode from 'qrcode';
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
  const [pubkeyQR, setPubkeyQR] = useState<string>('');
  const [lightningQR, setLightningQR] = useState<string>('');
  const { toast } = useToast();

  const lightningAddress = getLightningAddress(metadata);
  const nip05 = metadata?.nip05;
  const profilePicture = metadata?.picture;
  const npub = nip19.npubEncode(pubkey);

  // Function to add logo overlay to QR code
  const addLogoToQR = (qrDataURL: string, logoType: 'nostr' | 'lightning'): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const qrImage = new Image();

      qrImage.onload = () => {
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;

        // Draw QR code
        ctx?.drawImage(qrImage, 0, 0);

        if (ctx) {
          const logoSize = qrImage.width * 0.2; // 20% of QR code size

          // Draw white background circle for logo
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(qrImage.width / 2, qrImage.height / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
          ctx.fill();

          // Draw appropriate background color
          if (logoType === 'lightning') {
            ctx.fillStyle = '#000000'; // Black background for lightning
          } else {
            ctx.fillStyle = '#FFFFFF'; // White background for Nostr ostrich
          }
          ctx.beginPath();
          ctx.arc(qrImage.width / 2, qrImage.height / 2, logoSize / 2, 0, 2 * Math.PI);
          ctx.fill();

          // Load and draw the appropriate logo image
          const logoImage = new Image();

          logoImage.onload = () => {
            console.log(`✅ Logo image loaded successfully: ${logoType}`);
            const centerX = qrImage.width / 2;
            const centerY = qrImage.height / 2;
            const imageSize = logoSize * 0.8; // Make it slightly smaller than the circle

            ctx.drawImage(
              logoImage,
              centerX - imageSize / 2,
              centerY - imageSize / 2,
              imageSize,
              imageSize
            );

            resolve(canvas.toDataURL());
          };

          logoImage.onerror = (error) => {
            console.error(`❌ Failed to load logo image: ${logoType}`, error);
            console.error(`Image src: ${logoImage.src}`);
            // Fallback: just return the original QR code
            resolve(qrDataURL);
          };

          // Use the appropriate logo image (embedded as data URLs for reliability)
          const nostrImageData = 'data:image/png;base64,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';
          const zapImageData = 'data:image/png;base64,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';

          const imageSrc = logoType === 'lightning' ? zapImageData : nostrImageData;
          console.log(`🔄 Loading logo image: ${logoType} from embedded data URL`);
          logoImage.src = imageSrc;
        } else {
          resolve(qrDataURL);
        }
      };

      qrImage.src = qrDataURL;
    });
  };

  // Generate QR codes
  useEffect(() => {
    const generateQRCodes = async () => {
      try {
        // Generate pubkey QR code
        const pubkeyQRCode = await QRCode.toDataURL(npub, {
          width: 300,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H', // High error correction for logo overlay
        });

        // Add Nostr logo to pubkey QR
        const pubkeyWithLogo = await addLogoToQR(pubkeyQRCode, 'nostr');
        setPubkeyQR(pubkeyWithLogo);

        // Generate Lightning address QR code if available (with logo overlay)
        if (lightningAddress) {
          const lightningQRCode = await QRCode.toDataURL(lightningAddress, {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H', // High error correction for logo overlay
          });

          // Add Lightning logo to Lightning QR
          const lightningWithLogo = await addLogoToQR(lightningQRCode, 'lightning');
          setLightningQR(lightningWithLogo);
        }
      } catch (error) {
        console.error('Failed to generate QR codes:', error);
      }
    };

    if (isOpen) {
      generateQRCodes();
    }
  }, [isOpen, lightningAddress, npub]);

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
              {activeTab === 'pubkey' && pubkeyQR && (
                <img src={pubkeyQR} alt="Public Key QR Code" className="w-72 h-72" />
              )}
              {activeTab === 'lightning' && lightningQR && (
                <img src={lightningQR} alt="Lightning Address QR Code" className="w-72 h-72" />
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
