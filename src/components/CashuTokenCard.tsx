import { useState } from 'react';
import { useCashuToken } from '@/hooks/useCashuToken';
import { formatBalance } from '@/lib/cashu';
import { useCashuStore } from '@/stores/cashuStore';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  QrCode,
  Download,
  Upload,
  Coins,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Bitcoin,
  Users
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
  const { toast } = useToast();

  // Basic state
  const [amount, setAmount] = useState(initialAmount);
  const [tokenString, setTokenString] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Social features state
  const [sendMode, setSendMode] = useState<'basic' | 'social'>('basic');
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isNutzap, setIsNutzap] = useState(false);

  // Stores and hooks
  const cashuStore = useCashuStore();
  const { isExpanded, toggleExpanded } = useWalletUiStore();
  const { displayCurrency, toggleCurrency } = useCurrencyDisplayStore();
  const { data: bitcoinPrice } = useBitcoinPrice();

  const {
    sendToken,
    receiveToken,
    isSendingToken,
    isReceivingToken,
    lastToken,
    clearLastToken
  } = useCashuToken();

  // Currency display helpers
  const formatAmount = (sats: number) => {
    if (displayCurrency === 'usd' && bitcoinPrice) {
      return formatUSD(satsToUSD(sats, bitcoinPrice.usd));
    }
    return formatBalance(sats);
  };

  const getCurrencyLabel = () => {
    return displayCurrency === 'usd' ? 'USD' : 'sats';
  };

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
      // Prepare social context if in social mode
      const socialContext = sendMode === 'social' ? {
        recipientPubkey: recipientPubkey || undefined,
        publicNote: publicNote || undefined,
        groupId: groupId || undefined,
        isNutzap
      } : undefined;

      const result = await sendToken(amount, socialContext);
      setGeneratedToken(result.token);
      setShowQR(true);

      toast({
        title: "Token created",
        description: `Created ${isNutzap ? 'nutzap' : 'token'} for ${formatAmount(amount)} ${getCurrencyLabel()}`
      });

      onSuccess?.({ token: result.token, proofs: result.proofs });
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
      const result = await receiveToken(tokenString);

      toast({
        title: "Token received",
        description: `Successfully received ${formatAmount(result.totalAmount)} ${getCurrencyLabel()}`
      });

      setTokenString('');
      onSuccess?.(result);
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
    a.download = `cashu-token-${amount}${getCurrencyLabel()}.txt`;
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
      <Card className={cn(className, "relative")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Send Cashu Token</span>
            </CardTitle>

            {/* Currency toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCurrency}
              className="h-8 w-16"
            >
              {displayCurrency === 'usd' ? (
                <DollarSign className="h-4 w-4" />
              ) : (
                <Bitcoin className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!generatedToken ? (
            <>
              {/* Send mode tabs */}
              <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as 'basic' | 'social')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Send</TabsTrigger>
                  <TabsTrigger value="social">
                    <Users className="h-4 w-4 mr-1" />
                    Social Send
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ({getCurrencyLabel()})</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder={`Enter amount in ${getCurrencyLabel()}`}
                      min="1"
                    />
                    {displayCurrency === 'usd' && bitcoinPrice && amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatBalance(Math.round(amount / satsToUSD(1, bitcoinPrice.usd)))} sats
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="social-amount">Amount ({getCurrencyLabel()})</Label>
                    <Input
                      id="social-amount"
                      type="number"
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder={`Enter amount in ${getCurrencyLabel()}`}
                      min="1"
                    />
                    {displayCurrency === 'usd' && bitcoinPrice && amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatBalance(Math.round(amount / satsToUSD(1, bitcoinPrice.usd)))} sats
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient (optional)</Label>
                    <Input
                      id="recipient"
                      value={recipientPubkey}
                      onChange={(e) => setRecipientPubkey(e.target.value)}
                      placeholder="npub1... or hex pubkey"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">Public Note (optional)</Label>
                    <Input
                      id="note"
                      value={publicNote}
                      onChange={(e) => setPublicNote(e.target.value)}
                      placeholder="Add a message..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group">Group ID (optional)</Label>
                    <Input
                      id="group"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      placeholder="Group identifier"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="nutzap"
                      checked={isNutzap}
                      onChange={(e) => setIsNutzap(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="nutzap">Send as Nutzap (social zap)</Label>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleCreateToken}
                disabled={isSendingToken || amount <= 0}
                className="w-full"
              >
                {isSendingToken ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating {isNutzap ? 'Nutzap' : 'Token'}...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Create {isNutzap ? 'Nutzap' : 'Token'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  {isNutzap ? 'Nutzap' : 'Token'} created for {formatAmount(amount)} {getCurrencyLabel()}
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
                    <p className="font-medium">Share this {isNutzap ? 'nutzap' : 'token'}</p>
                    <p className="text-xs">
                      Send this {isNutzap ? 'nutzap' : 'token'} to transfer {formatAmount(amount)} {getCurrencyLabel()}.
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
    <Card className={cn(className, "relative")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Receive Cashu Token</span>
          </CardTitle>

          {/* Currency toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCurrency}
            className="h-8 w-16"
          >
            {displayCurrency === 'usd' ? (
              <DollarSign className="h-4 w-4" />
            ) : (
              <Bitcoin className="h-4 w-4" />
            )}
          </Button>
        </div>
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
          disabled={isReceivingToken || !tokenString.trim()}
          className="w-full"
        >
          {isReceivingToken ? (
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