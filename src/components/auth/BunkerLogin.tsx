import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Copy, Loader, ScanQrCode, AlertTriangle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWelshmanBunkerLogin } from '@/hooks/useWelshmanBunkerLogin';
import { devLog } from '@/lib/devConsole';
import QrCode from '@/components/QrCode';
import QrScanner from 'qr-scanner';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { createNostrConnectURI, NostrConnectParams } from 'nostr-tools/nip46';
import { bytesToHex } from '@noble/hashes/utils';

interface BunkerLoginProps {
  login: (bunkerUrl: string) => Promise<void>;
  isLocked: boolean;
  onLoginSuccess?: (loginData: any) => void;
}

const DEFAULT_NOSTRCONNECT_RELAY = ['wss://relay.nsec.app'];

const BunkerLogin = ({ login, isLocked, onLoginSuccess }: BunkerLoginProps) => {
  const [bunkerInput, setBunkerInput] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [nostrConnectionErrMsg, setNostrConnectionErrMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const qrScannerCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [qrCodeSize, setQrCodeSize] = useState(100);
  
  const { user } = useCurrentUser();
  const { bunkerLogin, isLoading: bunkerLoading, error: bunkerError, authUrl, generateQRUrl } = useWelshmanBunkerLogin();

  // Generate QR URL on mount using Welshman broker
  const [qrUrl, setQrUrl] = useState<string>('');
  
  useEffect(() => {
    // Generate QR URL when component mounts
    const initQR = async () => {
      if (generateQRUrl) {
        const url = await generateQRUrl();
        setQrUrl(url);
        devLog('📱 Generated QR URL for bunker login');
      }
    };
    initQR();
  }, [generateQRUrl]);

  // Calculate QR code size based on container
  useLayoutEffect(() => {
    const calculateQrSize = () => {
      if (qrContainerRef.current) {
        const containerWidth = qrContainerRef.current.offsetWidth;
        const desiredSizeBasedOnWidth = Math.min(containerWidth - 8, containerWidth * 0.9);
        const newSize = Math.max(100, Math.min(desiredSizeBasedOnWidth, 360));
        setQrCodeSize(newSize);
      }
    };

    calculateQrSize();

    const resizeObserver = new ResizeObserver(calculateQrSize);
    if (qrContainerRef.current) {
      resizeObserver.observe(qrContainerRef.current);
    }

    return () => {
      if (qrContainerRef.current) {
        resizeObserver.unobserve(qrContainerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize broker polling when QR URL is generated
  useEffect(() => {
    if (!qrUrl) return;
    
    let isActive = true;
    
    const initializeBroker = async () => {
      try {
        devLog('🔧 Initializing bunker broker for QR code polling...');
        await bunkerLogin(qrUrl);
        
        // If we reach here, user approved and login succeeded
        devLog('✅ Bunker QR code login successful!');
        
        if (onLoginSuccess && isActive) {
          onLoginSuccess({ connectionString: qrUrl });
        }
      } catch (err) {
        if (isActive) {
          devLog('⚠️ Bunker broker initialization failed:', err);
          setNostrConnectionErrMsg(err instanceof Error ? err.message : 'Failed to initialize bunker connection');
        }
      }
    };

    initializeBroker();
    
    return () => {
      isActive = false;
      stopQrScan();
    };
    // Only depend on qrUrl value, not the function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrUrl]);

  // Auto-detect successful login
  useEffect(() => {
    if (user && pending) {
      devLog('User logged in successfully!');
      setPending(false);
    }
  }, [user, pending]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBunkerInput(e.target.value);
    if (errMsg) setErrMsg(null);
  };

  const handleLogin = async (bunker: string = bunkerInput) => {
    const _bunker = bunker.trim();
    if (_bunker === '') return;

    setPending(true);
    setErrMsg(null);
    try {
      await bunkerLogin(_bunker);
      devLog('✅ Manual bunker login successful!');
      if (onLoginSuccess) {
        onLoginSuccess({ connectionString: _bunker });
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  };

  const copyConnectionString = async () => {
    if (!qrUrl) return;

    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      devLog('Could not copy to clipboard:', err);
    }
  };

  const startQrScan = async () => {
    try {
      setIsScanning(true);
      setErrMsg(null);

      // Wait for next render cycle to ensure video element is in DOM
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found');
      }

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          setBunkerInput(result.data);
          stopQrScan();
          handleLogin(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();

      // Check video feed after a delay
      qrScannerCheckTimerRef.current = setTimeout(() => {
        if (
          videoRef.current &&
          (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)
        ) {
          setErrMsg('Camera feed not available');
        }
      }, 1000);
    } catch (error) {
      setErrMsg(
        `Failed to start camera: ${error instanceof Error ? error.message : 'Unknown error'}. Please check permissions.`
      );
      setIsScanning(false);
      if (qrScannerCheckTimerRef.current) {
        clearTimeout(qrScannerCheckTimerRef.current);
        qrScannerCheckTimerRef.current = null;
      }
    }
  };

  const stopQrScan = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    if (qrScannerCheckTimerRef.current) {
      clearTimeout(qrScannerCheckTimerRef.current);
      qrScannerCheckTimerRef.current = null;
    }
  };

  return (
    <div className="relative flex flex-col gap-3">
      {/* QR Code Section - Priority 1 ✅ */}
      <div ref={qrContainerRef} className="flex flex-col items-center w-full space-y-2">
        <div>
          {qrUrl ? (
            <QrCode size={qrCodeSize} value={qrUrl} />
          ) : (
            <div className="flex items-center justify-center" style={{ width: qrCodeSize, height: qrCodeSize }}>
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        {nostrConnectionErrMsg && (
          <div className="text-xs text-destructive text-center">{nostrConnectionErrMsg}</div>
        )}
      </div>

      {/* Connection String with Copy Button */}
      <div className="flex justify-center w-full">
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-full cursor-pointer transition-all hover:bg-muted/80"
          style={{
            width: qrCodeSize > 0 ? `${Math.max(150, Math.min(qrCodeSize, 320))}px` : 'auto'
          }}
          onClick={copyConnectionString}
          role="button"
          tabIndex={0}
        >
          <div className="flex-grow min-w-0 truncate select-none">
            {qrUrl || 'Generating...'}
          </div>
          <div className="flex-shrink-0">{copied ? <Check size={14} /> : <Copy size={14} />}</div>
        </div>
      </div>

      {/* OR Divider - Priority 2 ✅ */}
      <div className="flex items-center w-full my-2">
        <div className="flex-grow border-t border-border/40"></div>
        <span className="px-3 text-xs text-muted-foreground">OR</span>
        <div className="flex-grow border-t border-border/40"></div>
      </div>

      {/* Manual Input with QR Scanner - Priority 3 ✅ */}
      <div className="w-full space-y-1">
        <div className="flex items-start space-x-2">
          <div className="flex-1 relative">
            <Input
              placeholder="bunker://..."
              value={bunkerInput}
              onChange={handleInputChange}
              className={errMsg ? 'border-destructive pr-10' : 'pr-10'}
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={startQrScan}
              disabled={pending}
            >
              <ScanQrCode />
            </Button>
          </div>
          <Button onClick={() => handleLogin()} disabled={pending}>
            <Loader className={pending ? 'animate-spin mr-2' : 'hidden'} />
            Login
          </Button>
        </div>

        {errMsg && <div className="text-xs text-destructive pl-3">{errMsg}</div>}
      </div>

      <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
        Back
      </Button>

      {/* QR Scanner Video Overlay - Priority 3 ✅ */}
      <div className={`w-full h-full flex justify-center ${isScanning ? '' : 'hidden'}`}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full bg-background"
          autoPlay
          playsInline
          muted
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2"
          onClick={stopQrScan}
        >
          Cancel
        </Button>
      </div>

      {/* Help Section */}
      <Alert className="bg-gray-900/50 border-gray-700 mt-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <AlertDescription className="text-gray-300 text-sm">
          <strong>How to use:</strong>
          <br />
          1. Scan the QR code with your bunker app (nsec.app, Amber, etc.)
          <br />
          2. Or paste your bunker:// connection string manually
          <br />
          3. Approve the connection in your bunker app
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BunkerLogin;
