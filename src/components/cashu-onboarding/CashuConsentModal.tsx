import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CashuConsentModalProps {
  open: boolean;
  onNext: () => void;
  onClose: () => void;
}

export function CashuConsentModal({ open, onNext, onClose }: CashuConsentModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const isConfirmed = confirmText.toLowerCase() === "cashu wallet";

  const handleNext = () => {
    if (isConfirmed) {
      setConfirmText("");
      onNext();
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setIsExpanded(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-800">
        <div className="flex flex-col h-full">
          {/* Icon */}
          <div className="flex justify-center mb-6 mt-4">
            <img 
              src="/images/cashu-icon.png" 
              alt="Cashu" 
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* Title */}
          <DialogTitle className="text-4xl font-bold text-center mb-6 text-white">
            Welcome to Cashu
          </DialogTitle>

          {/* Subtitle */}
          <DialogDescription className="text-center text-gray-300 mb-6 px-4">
            Cashu is a free and open-source ecash protocol for Bitcoin. You can learn more about it at{" "}
            <a 
              href="https://cashu.space/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-400 underline"
            >
              cashu.space
            </a>.
          </DialogDescription>

          {/* Expandable Content */}
          <div className="mb-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-300 transition-colors px-4 py-2"
            >
              <span>Click to learn more</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-4 px-4 py-4 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-300 leading-relaxed">
                  This wallet is not affiliated with any mint. To use this wallet, you need to connect to one or more Cashu mints that you trust.
                </p>

                <p className="text-sm text-gray-300 leading-relaxed">
                  This wallet stores ecash that only you have access to. If you delete your browser data without a seed phrase backup, you will lose your tokens.
                </p>

                <p className="text-sm text-gray-300 leading-relaxed">
                  This wallet is in beta. We hold no responsibility for people losing access to funds. Use at your own risk! This code is open-source and licensed under the MIT license.
                </p>
              </div>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="space-y-3 mb-6 px-4">
            <label htmlFor="confirm-text" className="text-sm text-gray-300 block">
              Type "<span className="font-semibold text-white">cashu wallet</span>" to confirm you understand
            </label>
            <Input
              id="confirm-text"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="cashu wallet"
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isConfirmed}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6"
            >
              NEXT
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
