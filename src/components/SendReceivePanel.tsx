import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, ArrowDownLeft, ArrowUpRight, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function SendReceivePanel() {
  const { sendPayment, makeInvoice, isConnected } = useWallet();
  const { toast } = useToast();
  
  // Toggle state for receive/send mode
  const [mode, setMode] = useState<'receive' | 'send'>('receive');
  
  // Send state
  const [invoice, setInvoice] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Receive state
  const [amount, setAmount] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendPayment = async () => {
    if (!invoice.trim()) return;
    
    setIsSending(true);
    try {
      await sendPayment(invoice);
      toast({
        title: "Payment Sent! ⚡",
        description: "Your Lightning payment was successful",
      });
      setInvoice('');
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to send payment",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!amount || parseInt(amount) <= 0) return;
    
    setIsGenerating(true);
    try {
      const invoice = await makeInvoice(parseInt(amount));
      setGeneratedInvoice(invoice);
      toast({
        title: "Invoice Generated",
        description: "Your Lightning invoice is ready to share",
      });
    } catch (error) {
      toast({
        title: "Failed to Generate Invoice",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleCancel = () => {
    setInvoice('');
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Connect your Lightning wallet to send and receive payments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Lightning</h2>
        <p className="text-gray-400 text-sm">Withdraw or deposit Bitcoin</p>
      </div>

      {/* Toggle Button */}
      <div className="flex rounded-lg bg-gray-800 p-1">
        <Button
          variant={mode === 'receive' ? 'default' : 'ghost'}
          className={`flex-1 ${
            mode === 'receive' 
              ? 'bg-gray-700 text-white' 
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          onClick={() => setMode('receive')}
        >
          <ArrowDownLeft className="w-4 h-4 mr-2" />
          Receive
        </Button>
        <Button
          variant={mode === 'send' ? 'default' : 'ghost'}
          className={`flex-1 ${
            mode === 'send' 
              ? 'bg-gray-700 text-white' 
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          onClick={() => setMode('send')}
        >
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>

      {/* Receive Mode */}
      {mode === 'receive' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">Amount (sats)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            onClick={handleGenerateInvoice}
            disabled={!amount || parseInt(amount) <= 0 || isGenerating}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white"
          >
            ⚡ {isGenerating ? 'Creating...' : 'Create Lightning Invoice'}
          </Button>
          
          {generatedInvoice && (
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-white">Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={generatedInvoice}
                    readOnly
                    className="text-xs bg-gray-800 border-gray-700 text-white"
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedInvoice, 'Invoice')}
                    className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Mode */}
      {mode === 'send' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice" className="text-white">Invoice</Label>
            <div className="relative">
              <Input
                id="invoice"
                placeholder="Lightning invoice"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-12"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendPayment}
              disabled={!invoice.trim() || isSending}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white"
            >
              {isSending ? 'Paying...' : 'Pay Invoice'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
