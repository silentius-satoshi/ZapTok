import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, Clock, Zap, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { decodeLightningInvoice, formatSats, generateInvoiceQR, type LightningInvoiceData } from '@/lib/lightning-invoice';
import { useToast } from '@/hooks/useToast';

interface LightningInvoiceProps {
  invoice: string;
  onPay?: (invoice: string) => void;
  className?: string;
  showQR?: boolean;
  showPayButton?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function LightningInvoice({
  invoice,
  onPay,
  className,
  showQR = true,
  showPayButton = true,
  variant = 'default'
}: LightningInvoiceProps) {
  const [invoiceData, setInvoiceData] = useState<LightningInvoiceData | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const decoded = decodeLightningInvoice(invoice);
    setInvoiceData(decoded);
  }, [invoice]);

  // Generate QR code when requested
  useEffect(() => {
    if (showQRCode && !qrCodeDataUrl && !isGeneratingQR) {
      setIsGeneratingQR(true);
      generateInvoiceQR(invoice).then((dataUrl) => {
        setQrCodeDataUrl(dataUrl);
        setIsGeneratingQR(false);
      }).catch((error) => {
        console.error('Failed to generate QR code:', error);
        setIsGeneratingQR(false);
      });
    }
  }, [showQRCode, qrCodeDataUrl, isGeneratingQR, invoice]);

  // Update countdown timer
  useEffect(() => {
    if (!invoiceData) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = invoiceData.expiry || 0;
      const timeLeft = expiryTime - now;

      if (timeLeft <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        setTimeLeft(`${hours}h ${remainingMinutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [invoiceData]);

  const handleCopyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      toast({
        title: "Copied to clipboard",
        description: "Lightning invoice copied successfully",
      });
    } catch (error) {
      console.error('Failed to copy invoice:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy invoice to clipboard",
        variant: "destructive",
      });
    }
  };

  const handlePay = () => {
    if (onPay && !invoiceData?.isExpired) {
      onPay(invoice);
    }
  };

  if (!invoiceData) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            Invalid Lightning invoice
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-3 p-3 border rounded-lg", className)}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-mono text-sm">{formatSats(invoiceData.amount)} sats</span>
        </div>

        {invoiceData.isExpired ? (
          <Badge variant="destructive">Expired</Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeLeft}
          </Badge>
        )}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyInvoice}>
            <Copy className="h-3 w-3" />
          </Button>
          {showPayButton && !invoiceData.isExpired && (
            <Button size="sm" onClick={handlePay}>
              Pay
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "w-full max-w-md",
      invoiceData.isExpired && "border-destructive/50",
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Lightning Invoice
          </div>
          {invoiceData.isExpired ? (
            <Badge variant="destructive">Expired</Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="text-center">
          <div className="text-3xl font-bold font-mono">
            {formatSats(invoiceData.amount)}
          </div>
          <div className="text-sm text-muted-foreground">sats</div>
        </div>

        {/* Description */}
        {invoiceData.description && (
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Description</div>
            <div className="text-sm">{invoiceData.description}</div>
          </div>
        )}

        <Separator />

        {/* QR Code */}
        {showQR && (
          <div className="text-center">
            {showQRCode ? (
              <div className="space-y-2">
                {isGeneratingQR ? (
                  <div className="mx-auto w-32 h-32 border rounded flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Generating QR...</div>
                  </div>
                ) : (
                  <img
                    src={qrCodeDataUrl}
                    alt="Lightning invoice QR code"
                    className="mx-auto w-32 h-32 border rounded"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowQRCode(false);
                    setQrCodeDataUrl(''); // Clear QR to regenerate if shown again
                  }}
                >
                  Hide QR
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowQRCode(true)}
                className="w-full"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Show QR Code
              </Button>
            )}
          </div>
        )}

        {/* Invoice Details */}
        {variant === 'detailed' && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Payment Hash:</span>
              <span className="font-mono">{invoiceData.paymentHash ? invoiceData.paymentHash.slice(0, 16) + '...' : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{invoiceData.created ? new Date(invoiceData.created * 1000).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Expires:</span>
              <span>{invoiceData.expiry ? new Date(invoiceData.expiry * 1000).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyInvoice}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Invoice
          </Button>

          {showPayButton && (
            <Button
              onClick={handlePay}
              disabled={invoiceData.isExpired}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              {invoiceData.isExpired ? 'Expired' : 'Pay Invoice'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
