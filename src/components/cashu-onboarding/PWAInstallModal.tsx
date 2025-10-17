import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MoreVertical, Share2, PlusSquare } from "lucide-react";

interface PWAInstallModalProps {
  open: boolean;
  onContinue: () => void;
  onClose: () => void;
}

export function PWAInstallModal({ open, onContinue, onClose }: PWAInstallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-800">
        <div className="flex flex-col h-full">
          {/* Icon */}
          <div className="flex justify-center mb-6 mt-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <Download className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <DialogTitle className="text-4xl font-bold text-center mb-6 text-white">
            Install PWA
          </DialogTitle>

          {/* Introduction */}
          <DialogDescription className="text-center text-gray-300 mb-8 px-4">
            For the best experience, use this wallet with your device's native web browser to install it as a Progressive Web App. Do this right now.
          </DialogDescription>

          {/* Instructions Container */}
          <div className="space-y-6 px-6 mb-8">
            {/* Android Instructions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-white">Android (Chrome)</h3>
              <ol className="space-y-2 list-none text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 rounded text-white text-xs">
                    1
                  </span>
                  <div className="flex items-center gap-2">
                    <MoreVertical className="h-4 w-4" />
                    <span>Tap the menu (top right)</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 rounded text-white text-xs">
                    2
                  </span>
                  <div className="flex items-center gap-2">
                    <PlusSquare className="h-4 w-4" />
                    <span>Press <strong className="text-white">Add to Home Screen</strong></span>
                  </div>
                </li>
              </ol>
            </div>

            {/* iOS Instructions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-white">iOS (Safari)</h3>
              <ol className="space-y-2 list-none text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 rounded text-white text-xs">
                    1
                  </span>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <span>Tap share (bottom)</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 rounded text-white text-xs">
                    2
                  </span>
                  <div className="flex items-center gap-2">
                    <PlusSquare className="h-4 w-4" />
                    <span>Press <strong className="text-white">Add to Home Screen</strong></span>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* Post-Installation Note */}
          <p className="text-center text-sm text-gray-400 px-6 mb-6">
            Once you installed this app on your device, close this browser window and use the app from your home screen.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              PREVIOUS
            </Button>
            <Button
              onClick={onContinue}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6"
            >
              NEXT
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
