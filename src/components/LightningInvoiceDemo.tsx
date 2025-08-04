import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LightningInvoice } from '@/components/LightningInvoice';
import { Zap } from 'lucide-react';

// Sample Lightning invoice for demo purposes
const SAMPLE_INVOICE = 'lnbc210n1pnt7kyfpp5qq8xp8dqp24xd7qgz85z6jr86tq48vkn6uf0pu9lpqp7qz8mfcdqdqqxqyjw5qzjexz0wfqxqzjcxqzjexzpkqz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcxqzjexz0wfqxqzjcx';

export function LightningInvoiceDemo() {
  const [invoiceInput, setInvoiceInput] = useState(SAMPLE_INVOICE);
  const [showInvoice, setShowInvoice] = useState(false);

  const handlePayInvoice = (invoice: string) => {
    console.log('Demo: Would pay invoice:', invoice);
    alert('Demo payment - In a real app, this would trigger WebLN or Cashu payment');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Lightning Invoice Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="invoice">Lightning Invoice (bolt11)</Label>
            <Input
              id="invoice"
              type="text"
              value={invoiceInput}
              onChange={(e) => setInvoiceInput(e.target.value)}
              placeholder="Paste a Lightning invoice here..."
              className="font-mono text-xs"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowInvoice(true)}
              disabled={!invoiceInput.trim()}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              Preview Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => setInvoiceInput(SAMPLE_INVOICE)}
            >
              Use Sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {showInvoice && invoiceInput && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <LightningInvoice
              invoice={invoiceInput}
              onPay={handlePayInvoice}
              showQR={true}
              showPayButton={true}
              variant="detailed"
            />
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">Component Variants:</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Compact</Label>
                  <LightningInvoice
                    invoice={invoiceInput}
                    onPay={handlePayInvoice}
                    variant="compact"
                    showQR={false}
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Default</Label>
                  <LightningInvoice
                    invoice={invoiceInput}
                    onPay={handlePayInvoice}
                    variant="default"
                    showQR={false}
                    className="max-w-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
