import { useState } from 'react';
import { useCashuToken } from '@/hooks/useCashuToken';
import { formatBalance } from '@/lib/cashu';
import { useCashuStore } from '@/stores/cashuStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  QrCode,
  Download,
  Upload,
  Coins,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface CashuTokenCardProps {
  mode?: 'send' | 'receive';
  initialAmount?: number;
  onSuccess?: (result: any) => void;
  className?: string;
}

export function CashuTokenCard({
  mode = 'send',
  initialAmount = 0,
  onSuccess,
  className
}: CashuTokenCardProps) {
  const { receiveToken, sendTokenMutation, receiveTokenMutation } = useCashuToken();
  const createTokenMutation = sendTokenMutation;
  const { toast } = useToast();
  const cashuStore = useCashuStore();

  const [amount, setAmount] = useState(initialAmount);
  const [tokenString, setTokenString] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [showQR, setShowQR] = useState(false);

  const handleCreateToken = async () => {
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const activeMintUrl = cashuStore.getActiveMintUrl();
    if (!activeMintUrl) {
      toast({
        title: "No active mint",
        description: "Please select an active mint first",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await createTokenMutation.mutateAsync({ 
        amount,
        mintUrl: activeMintUrl 
      });
      // Use the token string from the result
      setGeneratedToken(result.token);
      setShowQR(true);

      toast({
        title: "Token created",
        description: `Created token for ${formatBalance(amount)} sats`
      });

      onSuccess?.(result);
    } catch (err) {
      toast({
        title: "Failed to create token",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleReceiveToken = async () => {
    if (!tokenString.trim()) {
      toast({
        title: "Invalid token",
        description: "Please enter a valid Cashu token",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await receiveToken({ 
        token: tokenString 
      });

      toast({
        title: "Token received",
        description: "Successfully added tokens to your wallet"
      });

      setTokenString('');
      onSuccess?.(tokenString);
    } catch (err) {
      toast({
        title: "Failed to receive token",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Copied",
      description: "Token copied to clipboard"
    });
  };

  const downloadToken = () => {
    const blob = new Blob([generatedToken], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashu-token-${amount}sats.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Token saved to your device"
    });
  };

  if (mode === 'send') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Send Cashu Token</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!generatedToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (sats)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Enter amount in sats"
                  min="1"
                />
              </div>

              <Button
                onClick={handleCreateToken}
                disabled={createTokenMutation.isPending || amount <= 0}
                className="w-full"
              >
                {createTokenMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Token...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Create Token
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  Token created for {formatBalance(amount)} sats
                </span>
              </div>

              {showQR ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                    <QRCodeSVG
                      value={generatedToken}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowQR(false)}
                      className="flex-1"
                    >
                      Hide QR
                    </Button>
                    <Button
                      variant="outline"
                      onClick={copyToken}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadToken}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Token</Label>
                    <Textarea
                      value={generatedToken}
                      readOnly
                      className="font-mono text-xs"
                      rows={6}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowQR(true)}
                      className="flex-1"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR
                    </Button>
                    <Button
                      variant="outline"
                      onClick={copyToken}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadToken}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Share this token</p>
                    <p className="text-xs">
                      Send this token to anyone to transfer {formatBalance(amount)} sats.
                      Keep it secure - anyone with this token can claim the funds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Receive mode
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Receive Cashu Token</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Cashu Token</Label>
          <Textarea
            id="token"
            value={tokenString}
            onChange={(e) => setTokenString(e.target.value)}
            placeholder="Paste or enter Cashu token here..."
            className="font-mono text-xs"
            rows={6}
          />
        </div>

        <Button
          onClick={handleReceiveToken}
          disabled={receiveTokenMutation.isPending || !tokenString.trim()}
          className="w-full"
        >
          {receiveTokenMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Receiving Token...
            </>
          ) : (
            <>
              <Coins className="h-4 w-4 mr-2" />
              Receive Token
            </>
          )}
        </Button>

        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">How to receive tokens</p>
              <p className="text-xs">
                Paste a Cashu token above to add the funds to your wallet.
                You can receive tokens from QR codes, text messages, or files.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}