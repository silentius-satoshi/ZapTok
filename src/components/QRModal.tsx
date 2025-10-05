import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Check, Settings } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';
import { nip19 } from 'nostr-tools';
import QrCode from '@/components/QrCode';
import {
  generateProfileShareURL,
  generateVideoShareURL,
  generateEnhancedProfileShareURL,
  generateEnhancedVideoShareURL,
  isValidVanityName,
  isZapTokEnabled
} from '@/lib/nostr-urls';
import { getUserSharingPreferences, getContextualQRData } from '@/lib/sharing-preferences';
import { getSharingConfig } from '@/config/sharing';
import type { NostrMetadata, NostrEvent } from '@nostrify/nostrify';
import type { EnhancedShareableURL } from '@/lib/nostr-urls';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkey: string;
  metadata?: NostrMetadata;
  displayName: string;
  relays?: string[]; // Added for richer profile sharing
  event?: NostrEvent; // Optional: for event-specific sharing
  vanityName?: string; // Phase 3: Custom vanity name for branded URLs
  enableVanityInput?: boolean; // Phase 3: Allow user to input/edit vanity names
}

export function QRModal({
  isOpen,
  onClose,
  pubkey,
  metadata,
  displayName,
  relays,
  event,
  vanityName: initialVanityName,
  enableVanityInput = false
}: QRModalProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'pubkey' | 'lightning'>('share');
  const [pubkeyCopied, setPubkeyCopied] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);
  const [lightningCopied, setLightningCopied] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [nostrIdCopied, setNostrIdCopied] = useState(false);

  // Phase 3: Vanity name state management
  const [vanityName, setVanityName] = useState(initialVanityName || '');
  const [vanityNameError, setVanityNameError] = useState('');

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

  // Phase 3: Vanity name validation
  const validateVanityName = (name: string) => {
    if (!name) {
      setVanityNameError('');
      return true;
    }

    if (!isValidVanityName(name)) {
      setVanityNameError('Vanity name must be 3-30 characters, alphanumeric or underscore, cannot start with underscore');
      return false;
    }

    setVanityNameError('');
    return true;
  };

  // Phase 3: Handle vanity name changes
  const handleVanityNameChange = (name: string) => {
    setVanityName(name);
    validateVanityName(name);
  };

  // Smart detection for enhanced URL capability
  const canGenerateEnhancedURL = () => {
    try {
      // Check if ZapTok is enabled
      if (!isZapTokEnabled()) return false;

      // Validate input data
      if (!pubkey || pubkey.length !== 64) return false;
      if (event && (!event.id || !event.pubkey)) return false;
      
      // Test enhanced URL generation (without vanity name first)
      const testURL = event 
        ? generateEnhancedVideoShareURL(event, { 
            relays,
            title: event.tags.find(tag => tag[0] === 'title')?.[1] || event.content?.slice(0, 50)
          })
        : generateEnhancedProfileShareURL(pubkey, { metadata, relays });
      
      // Validate result has required structure
      return testURL && testURL.primary && testURL.fallback && 
             testURL.primary.startsWith('https://') && 
             testURL.fallback.startsWith('https://');
    } catch {
      return false;
    }
  };

  const showZapTokLink = canGenerateEnhancedURL();

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

  // Phase 4: Native Share API integration
  const handleNativeShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} on ZapTok`,
          text: `Check out ${displayName} on ZapTok`,
          url: url,
        });
        
        toast({
          title: 'Shared!',
          description: 'Content shared successfully',
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          // Fallback to copy if share fails (but not if user cancelled)
          await copyToClipboard(url, 'sharelink');
        }
      }
    } else {
      // Fallback to copy if Web Share API not available
      await copyToClipboard(url, 'sharelink');
    }
  };

  // Check if native sharing is available
  const isNativeShareAvailable = () => {
    return typeof navigator !== 'undefined' && !!navigator.share;
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
                  value={(() => {
                    try {
                      // Get user preferences and contextual QR data
                      const preferences = getUserSharingPreferences();
                      const contextualQRData = getContextualQRData(
                        event, 
                        pubkey, 
                        metadata, 
                        relays, 
                        vanityName && !vanityNameError ? vanityName : undefined, 
                        preferences
                      );

                      return contextualQRData;
                    } catch (error) {
                      console.error('QR code generation error:', error);
                      // Ultimate fallback to npub
                      return nip19.npubEncode(pubkey);
                    }
                  })()}
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

          {/* Vanity Name Input for Enhanced Links */}
          {activeTab === 'share' && enableVanityInput && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="vanity-name" className="text-sm font-medium">
                  Custom Vanity Name (Optional)
                </Label>
              </div>
              <Input
                id="vanity-name"
                type="text"
                placeholder={event ? "my-awesome-video" : "my-username"}
                value={vanityName}
                onChange={(e) => handleVanityNameChange(e.target.value)}
                className={`text-sm ${vanityNameError ? 'border-red-500' : ''}`}
              />
              {vanityNameError && (
                <p className="text-xs text-red-500">{vanityNameError}</p>
              )}
              {vanityName && !vanityNameError && (
                <p className="text-xs text-muted-foreground">
                  Preview: zaptok.social/{event ? 'v/' : '@'}{vanityName}
                </p>
              )}
            </div>
          )}

          {/* Bottom - Link Options with Copy */}
          <div className="space-y-4">
            {/* Share Link Section */}
            {activeTab === 'share' && (
              <div className="space-y-3">
                {(() => {
                  try {
                    // Get user preferences
                    const preferences = getUserSharingPreferences();
                    
                    // Generate basic URLs (always available)
                    const basicURLs = event
                      ? generateVideoShareURL(event, relays)
                      : generateProfileShareURL(pubkey, metadata, relays);

                    // Generate enhanced URLs only if ZapTok is enabled
                    let enhancedURLs: EnhancedShareableURL | null = null;
                    if (isZapTokEnabled() && preferences.preferredUrlType === 'zaptok') {
                      try {
                        const validVanity = vanityName && !vanityNameError ? vanityName : undefined;
                        enhancedURLs = event
                          ? generateEnhancedVideoShareURL(event, {
                              relays,
                              vanityName: validVanity,
                              title: event.tags.find(tag => tag[0] === 'title')?.[1] || event.content?.slice(0, 50)
                            })
                          : generateEnhancedProfileShareURL(pubkey, {
                              metadata,
                              relays,
                              vanityName: validVanity
                            });
                      } catch (error) {
                        console.error('Enhanced URL generation failed:', error);
                        enhancedURLs = null;
                      }
                    }

                    return (
                      <>
                        {/* ZapTok Link - Only show if available */}
                        {enhancedURLs && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">ZapTok Link:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                                {enhancedURLs.primary}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isNativeShareAvailable()) {
                                    handleNativeShare(enhancedURLs.primary, displayName);
                                  } else {
                                    copyToClipboard(enhancedURLs.primary, 'sharelink');
                                  }
                                }}
                                className="h-6 w-6 p-0"
                                title={isNativeShareAvailable() ? "Share" : "Copy"}
                              >
                                {shareLinkCopied ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Universal Link - Always available */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Universal Link:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                              {basicURLs.fallback}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isNativeShareAvailable()) {
                                  handleNativeShare(basicURLs.fallback, displayName);
                                } else {
                                  copyToClipboard(basicURLs.fallback, 'sharelink');
                                }
                              }}
                              className="h-6 w-6 p-0"
                              title={isNativeShareAvailable() ? "Share" : "Copy"}
                            >
                              {shareLinkCopied ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Nostr Identifier - Show based on user preferences */}
                        {preferences.preferredUrlType === 'raw' && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Nostr ID:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                                {basicURLs.raw}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(basicURLs.raw, 'nostrid')}
                                className="h-6 w-6 p-0"
                                title="Copy Nostr identifier"
                              >
                                {nostrIdCopied ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  } catch (error) {
                    console.error('Share links generation error:', error);
                    // Fallback UI for errors
                    const fallbackURL = nip19.npubEncode(pubkey);
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Nostr Profile:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                            {fallbackURL}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(fallbackURL, 'sharelink')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                })()}

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