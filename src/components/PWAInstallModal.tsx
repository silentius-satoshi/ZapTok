import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Download, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePWA } from '@/hooks/usePWA';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallModal({ isOpen, onClose }: PWAInstallModalProps) {
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile'>('desktop');
  const { installPWA, isInstalling, installPrompt } = usePWA();

  // Detect device type
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'mobile' : 'desktop');
  }, []);

  // Detect browser type
  const getBrowserType = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Chrome'; // Default fallback
  };

  const browserType = getBrowserType();

  const handleDirectInstall = async () => {
    try {
      await installPWA();
      onClose();
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <Download className="h-5 w-5 text-blue-400" />
            <DialogTitle className="text-xl font-semibold">Install ZapTok</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-300 text-sm">
            Get the full app experience by installing ZapTok on your device
          </p>

          {/* Device Type Selector */}
          <div className="flex space-x-2">
            <Button
              variant={deviceType === 'desktop' ? 'default' : 'outline'}
              size="sm"
              className={`flex items-center space-x-2 ${
                deviceType === 'desktop' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => setDeviceType('desktop')}
            >
              <Monitor className="h-4 w-4" />
              <span>Desktop</span>
            </Button>
            <Button
              variant={deviceType === 'mobile' ? 'default' : 'outline'}
              size="sm"
              className={`flex items-center space-x-2 ${
                deviceType === 'mobile' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => setDeviceType('mobile')}
            >
              <Smartphone className="h-4 w-4" />
              <span>Mobile</span>
            </Button>
          </div>

          {/* Installation Instructions */}
          <div className="space-y-4">
            {deviceType === 'desktop' && (
              <>
                <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-1">Look for the install icon</h4>
                    <p className="text-sm text-gray-300">
                      Check the address bar for a <Download className="inline h-3 w-3 mx-1" /> install icon
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-1">Alternative: Use the menu</h4>
                    <p className="text-sm text-gray-300">
                      Click the three dots <MoreHorizontal className="inline h-3 w-3 mx-1" /> → "Install ZapTok"
                    </p>
                  </div>
                </div>
              </>
            )}

            {deviceType === 'mobile' && (
              <>
                {browserType === 'Safari' ? (
                  <>
                    <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">Tap the Share button</h4>
                        <p className="text-sm text-gray-300">
                          Look for the share icon at the bottom of Safari
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">Add to Home Screen</h4>
                        <p className="text-sm text-gray-300">
                          Select "Add to Home Screen" from the share menu
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">Look for the install banner</h4>
                        <p className="text-sm text-gray-300">
                          A popup should appear asking to "Add to Home screen"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">Alternative: Browser menu</h4>
                        <p className="text-sm text-gray-300">
                          Tap menu <MoreHorizontal className="inline h-3 w-3 mx-1" /> → "Add to Home screen"
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Benefits Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <h4 className="font-medium text-white mb-3">Why install?</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Faster loading and offline access</li>
              <li>• Native app-like experience</li>
              <li>• Quick access from your home screen</li>
              <li>• Push notifications (when available)</li>
            </ul>
          </div>

          {/* Direct Install Button (for supported browsers) */}
          {installPrompt && browserType === 'Chrome' && deviceType === 'desktop' && (
            <Button
              onClick={handleDirectInstall}
              disabled={isInstalling}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInstalling ? 'Installing...' : 'Install Now'}
            </Button>
          )}

          {/* Manual install instructions if no prompt available */}
          {!installPrompt && (
            <div className="space-y-3">
              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-200 text-sm">
                  <strong>No automatic install available.</strong> Follow the manual steps above, or try the refresh option below.
                </p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Refresh Page & Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
