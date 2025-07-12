import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Send, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function SendReceivePanel() {
  const { sendPayment, makeInvoice, isConnected } = useWallet();
  const { toast } = useToast();
  
  // Send state
  const [invoice, setInvoice] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Receive state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
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
      const invoice = await makeInvoice(parseInt(amount), description || undefined);
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
    <Card>
      <CardHeader>
        <CardTitle>Send & Receive</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="receive">Receive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="send" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice">Lightning Invoice</Label>
              <Textarea
                id="invoice"
                placeholder="Paste Lightning invoice here..."
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <Button
              onClick={handleSendPayment}
              disabled={!invoice.trim() || isSending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Payment'}
            </Button>
          </TabsContent>
          
          <TabsContent value="receive" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (sats)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount in sats"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="What is this payment for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerateInvoice}
              disabled={!amount || parseInt(amount) <= 0 || isGenerating}
              className="w-full"
            >
              <Receipt className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Invoice'}
            </Button>
            
            {generatedInvoice && (
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Lightning Invoice</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={generatedInvoice}
                      readOnly
                      className="text-xs"
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedInvoice, 'Invoice')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 Tip: Share this invoice with others to receive Lightning payments. 
                    QR codes will be available once the qrcode.react package is installed.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
