import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface SeedPhraseModalProps {
  open: boolean;
  seedPhrase: string;
  onComplete: () => void;
  onClose: () => void;
}

export function SeedPhraseModal({ open, seedPhrase, onComplete, onClose }: SeedPhraseModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(seedPhrase);
    toast({
      title: "Copied!",
      description: "Backup key copied to clipboard",
    });
  };

  const handleComplete = () => {
    if (hasConfirmed) {
      onComplete();
    }
  };

  const handleCloseModal = () => {
    setHasConfirmed(false);
    setIsVisible(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-800">
        <div className="flex flex-col h-full">
          {/* Icon */}
          <div className="flex justify-center mb-6 mt-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <Key className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <DialogTitle className="text-4xl font-bold text-center mb-6 text-white">
            Your Wallet Backup Key
          </DialogTitle>

          {/* Description */}
          <DialogDescription className="text-center text-gray-300 mb-8 px-4">
            Store your backup key in a password manager or on paper. This key is the only way to recover your Cashu wallet funds if you lose access to this device.
          </DialogDescription>

          {/* Backup Key Display */}
          <div className="mx-6 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Private Key (Hex)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title={isVisible ? "Hide backup key" : "Show backup key"}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-white font-mono leading-relaxed break-all">
                {isVisible ? (
                  seedPhrase
                ) : (
                  <span className="select-none">
                    {"••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              You can view your backup key again in the wallet settings.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 px-6 mb-8">
            <Checkbox
              id="confirm-written"
              checked={hasConfirmed}
              onCheckedChange={(checked) => setHasConfirmed(checked as boolean)}
              className="mt-1"
            />
            <label
              htmlFor="confirm-written"
              className="text-sm text-gray-300 cursor-pointer select-none"
            >
              I have written it down
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800">
            <Button
              variant="ghost"
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-white"
            >
              PREVIOUS
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!hasConfirmed}
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
