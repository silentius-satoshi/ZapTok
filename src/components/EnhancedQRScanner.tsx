import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SwitchCamera, X, Loader2 } from "lucide-react";
import QrScanner from 'qr-scanner';
import { parseQRData, validateQRData } from '@/lib/qr-formats';
import { cn } from '@/lib/utils';

interface EnhancedQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
  description?: string;
  expectedType?: 'cashu' | 'lightning' | 'nostr' | 'zaptok';
}

export function EnhancedQRScanner({
  isOpen,
  onClose,
  onScan,
  title = "Scan QR Code",
  description = "Position the QR code within the frame to scan",
  expectedType,
}: EnhancedQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const handleScanResult = (result: string) => {
    // Parse and validate the QR data
    const parsed = parseQRData(result);
    
    if (!parsed) {
      setError('Unrecognized QR code format');
      return;
    }

    // Validate against expected type if specified
    if (expectedType) {
      const validation = validateQRData(result, expectedType);
      if (!validation.valid) {
        setError(validation.error || 'Invalid QR code format');
        return;
      }
    }

    // Success - call the onScan callback and close
    onScan(result);
    stopScanner();
    onClose();
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      // Check for camera availability
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found');
      }

      // Create scanner instance
      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use rear camera if available
          maxScansPerSecond: 5,
        }
      );

      qrScannerRef.current = scanner;
      await scanner.start();
      setHasPermission(true);

      // Check video feed after a delay
      setTimeout(() => {
        if (
          videoRef.current &&
          (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)
        ) {
          setError('Camera feed not available. Please check permissions.');
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
          setHasPermission(false);
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError(`Scanner error: ${err.message}`);
        }
      } else {
        setError('Failed to start camera. Please check permissions and try again.');
      }
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (qrScannerRef.current) {
      try {
        const cameras = await QrScanner.listCameras(true);
        if (cameras.length > 1) {
          // Cycle through available cameras
          const nextCamera = cameras[Math.floor(Math.random() * cameras.length)];
          await qrScannerRef.current.setCamera(nextCamera.id);
        }
      } catch (err) {
        console.error('Failed to switch camera:', err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Video element for camera feed */}
          <video
            ref={videoRef}
            className={cn(
              "w-full aspect-square rounded-lg bg-muted",
              !isScanning && "hidden"
            )}
            autoPlay
            playsInline
            muted
          />

          {/* Loading state */}
          {!isScanning && hasPermission === null && (
            <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-sm text-destructive mb-2">{error}</p>
                {hasPermission === false && (
                  <Button variant="outline" onClick={startScanner}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Camera controls */}
          {isScanning && (
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={switchCamera}
                className="h-8 w-8 p-0"
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Expected format hint */}
        {expectedType && (
          <p className="text-xs text-muted-foreground text-center">
            Expected: {expectedType.charAt(0).toUpperCase() + expectedType.slice(1)} format
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}