import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link2, Download, QrCode, ExternalLink } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { useToast } from '@/hooks/useToast';
import {
  generateEnhancedVideoShareURL,
  generateVideoShareURL,
  isZapTokEnabled
} from '@/lib/nostr-urls';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: NostrEvent;
  onQRCodeClick: () => void;
}

export function ShareModal({ isOpen, onClose, event, onQRCodeClick }: ShareModalProps) {
  const { toast } = useToast();

  // Check if ZapTok enhanced URLs are enabled
  const canGenerateEnhancedURL = () => {
    try {
      if (!isZapTokEnabled()) return false;
      if (!event || !event.id || !event.pubkey) return false;
      return true;
    } catch {
      return false;
    }
  };

  const showZapTokLink = canGenerateEnhancedURL();

  // Extract video URL from event tags (same logic as handleShare)
  const extractVideoUrl = (): string => {
    const imetaTag = event.tags.find(([name]) => name === 'imeta');
    const urlTag = event.tags.find(([name]) => name === 'url');

    if (imetaTag) {
      const urlParam = imetaTag.find((param) => param.startsWith('url '));
      if (urlParam) {
        return urlParam.substring(4);
      }
    }

    if (urlTag) {
      return urlTag[1];
    }

    // Fallback to nevent
    return `https://zaptok.app/${nip19.neventEncode({
      id: event.id,
      author: event.pubkey,
    })}`;
  };

  const handleCopyLink = async () => {
    const url = extractVideoUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copied!',
        description: 'Video URL copied to clipboard',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy URL to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async () => {
    const videoUrl = extractVideoUrl();
    
    try {
      toast({
        title: 'Downloading...',
        description: 'Starting video download',
      });

      // Fetch video as blob
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Failed to fetch video');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create temporary download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `zaptok-${event.id.substring(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: 'Check your downloads folder',
      });
      onClose();
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download video',
        variant: 'destructive',
      });
    }
  };

  const handleQRCode = () => {
    onClose(); // Close share modal
    onQRCodeClick(); // Open QR modal
  };

  const handleCopyZapTokLink = async () => {
    if (!showZapTokLink) return;

    try {
      const title = event.tags.find(([name]) => name === 'title')?.[1] || event.content?.slice(0, 50);
      const enhancedURL = generateEnhancedVideoShareURL(event, { title });
      
      await navigator.clipboard.writeText(enhancedURL.primary);
      toast({
        title: 'Copied!',
        description: 'ZapTok link copied to clipboard',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy ZapTok link',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUniversalLink = async () => {
    try {
      const title = event.tags.find(([name]) => name === 'title')?.[1] || event.content?.slice(0, 50);
      const basicURL = generateVideoShareURL(event, undefined, { title });
      
      await navigator.clipboard.writeText(basicURL.fallback);
      toast({
        title: 'Copied!',
        description: 'Universal link copied to clipboard',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy universal link',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {/* Header */}
        <div className="p-4 border-b">
          <DialogTitle className="text-lg font-semibold">Share</DialogTitle>
          <DialogDescription className="sr-only">
            Share this video via link, download, or QR code
          </DialogDescription>
        </div>

        {/* Share Actions */}
        <div className="p-4 space-y-2">
          {/* Copy Link */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={handleCopyLink}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Copy Link</div>
              <div className="text-sm text-muted-foreground">
                Share video URL
              </div>
            </div>
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={handleDownload}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Download</div>
              <div className="text-sm text-muted-foreground">
                Save to device
              </div>
            </div>
          </Button>

          {/* QR Code */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={handleQRCode}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">QR Code</div>
              <div className="text-sm text-muted-foreground">
                Show public key & lightning QR
              </div>
            </div>
          </Button>

          {/* ZapTok Link (if enabled) */}
          {showZapTokLink && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={handleCopyZapTokLink}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">ZapTok Link</div>
                <div className="text-sm text-muted-foreground">
                  Share via zaptok.social
                </div>
              </div>
            </Button>
          )}

          {/* Universal Link */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={handleCopyUniversalLink}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Universal Link</div>
              <div className="text-sm text-muted-foreground">
                Share via njump.me
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
