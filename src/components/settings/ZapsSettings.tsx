import { useState } from "react";
import { SettingsSection } from "./SettingsSection";
import { useAppContext } from "@/hooks/useAppContext";
import { useZap } from "@/contexts/ZapProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { Trash2 } from "lucide-react";

export function ZapsSettings() {
  const { config, setDefaultZap, setZapOption, resetZapOptionsToDefault } = useAppContext();
  const { updateDefaultSats, updateDefaultComment } = useZap();
  const { toast } = useToast();
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  // Local state for form inputs
  const [amount, setAmount] = useState(config.defaultZap.amount);
  const [comment, setComment] = useState(config.defaultZap.message || '');

  const handleDefaultZapAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseInt(e.target.value);
    if (isNaN(newAmount) || newAmount < 1) return;
    setAmount(newAmount);
  };

  const handleDefaultZapMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update both AppContext and ZapProvider
    setDefaultZap({
      amount,
      emoji: config.defaultZap.emoji || "⚡",
      message: comment
    });
    updateDefaultSats(amount);
    updateDefaultComment(comment);
    
    toast({
      title: "Settings Saved",
      description: `Default zap: ${amount} sats${comment ? ` • Comment: "${comment}"` : ''}`,
      variant: "default",
    });
  };

  const handleOptionChange = (optionId: string, enabled: boolean) => {
    // This function can be implemented if needed for toggling zap options
  };

  const handleZapOptionAmountChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const amount = parseInt(e.target.value);
    if (isNaN(amount) || amount < 1) return;
    
    setZapOption({ amount }, index);
  };

  const handleZapOptionMessageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    setZapOption({ message: e.target.value }, index);
  };

  const handleRestoreDefaults = () => {
    resetZapOptionsToDefault();
    // Reset local state to default values
    setAmount(21);
    setComment('');
    setIsRestoreDialogOpen(false);
    toast({
      title: "Settings Restored",
      description: "Zap settings have been restored to defaults",
    });
  };

  const truncateNumber = (amount: number) => {
    const t = 1000;

    if (amount < t) {
      return `${amount}`;
    }

    if (amount < Math.pow(t, 2)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / t)}K` :
        amount.toLocaleString();
    }

    if (amount < Math.pow(t, 3)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / Math.pow(t, 2))}M` :
        amount.toLocaleString();
    }

    return amount.toLocaleString();
  };

  return (
    <SettingsSection title="Zaps">
      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Default zap amount */}
        <div className="space-y-4">
          <Label className="text-white text-base font-normal">Set default zap amount:</Label>
          <div className="flex items-center bg-gray-700 rounded-full h-12 overflow-hidden">
            <div className="w-20 h-12 flex items-center justify-center hover:bg-gray-600 transition-colors">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={handleDefaultZapAmountChange}
                className="bg-transparent text-white text-center w-full h-full border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="flex-1 h-12 flex items-center px-4 hover:bg-gray-600 transition-colors">
              <input
                type="text"
                value={comment}
                onChange={handleDefaultZapMessageChange}
                placeholder="Onward 👍"
                className="bg-transparent text-white w-full h-full border-0 focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Custom zap amount presets */}
        <div className="space-y-4">
          <Label className="text-white text-base font-normal">Set custom zap amount presets:</Label>
          <div className="space-y-3">
            {config.availableZapOptions.map((option, index) => (
              <div key={index} className="flex items-center bg-gray-700 rounded-full h-12 overflow-hidden">
                <button
                  className="w-20 h-12 flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <input
                    type="number"
                    min="1"
                    value={option.amount}
                    onChange={(e) => handleZapOptionAmountChange(e, index)}
                    className="bg-transparent text-white text-center w-full h-full border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </button>
                
                <div className="flex-1 h-12 flex items-center px-4 hover:bg-gray-600 transition-colors">
                  <input
                    type="text"
                    value={option.message}
                    onChange={(e) => handleZapOptionMessageChange(e, index)}
                    placeholder="Click to add message"
                    className="bg-transparent text-white w-full h-full border-0 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restore defaults button */}
        <div className="pt-4">
          <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-pink-500 hover:text-pink-400 p-0 h-auto font-normal text-base"
              >
                Restore Default Feeds
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Restore Default Zap Settings</DialogTitle>
                <DialogDescription className="text-gray-400">
                  This will reset all your zap settings to the default values. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRestoreDialogOpen(false)}
                  className="border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRestoreDefaults}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  Restore Defaults
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
          >
            Save Zap Settings
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
