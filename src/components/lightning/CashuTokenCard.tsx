import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuToken } from '@/hooks/useCashuToken';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Send, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function CashuTokenCard() {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { toast } = useToast();

  const {
    sendToken,
    receiveToken,
    isLoading,
    error: hookError,
  } = useCashuToken();
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.token;

  const [activeTab, setActiveTab] = useState("receive");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleExpanded = () => {
    walletUiStore.toggleCardExpansion('token');
  };

  const handleSendToken = async () => {
    if (!amount || !user) return;

    try {
      setError(null);

      // Get the first mint URL from the store
      const availableMints = Object.keys(cashuStore.mints);
      if (availableMints.length === 0) {
        throw new Error("No mints available");
      }

      const result = await sendToken(parseInt(amount));

      // Use the generated token string
      setGeneratedToken(result.token);
      setSuccess("Token generated successfully!");
      setAmount("");
    } catch (err: any) {
      setError(err.message || "Failed to generate token");
    }
  };

  const handleReceiveToken = async () => {
    if (!token.trim()) return;

    try {
      setError(null);
      await receiveToken(token.trim());
      setSuccess("Token received successfully!");
      setToken("");
    } catch (err: any) {
      setError(err.message || "Failed to receive token");
    }
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Copied to clipboard",
      description: "Token copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Send & Receive</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">Transfer Cashu tokens</p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="receive">
                <Download className="w-4 h-4 mr-2" />
                Receive
              </TabsTrigger>
              <TabsTrigger value="send">
                <Send className="w-4 h-4 mr-2" />
                Send
              </TabsTrigger>
            </TabsList>

            <TabsContent value="receive" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Token</label>
                  <Textarea
                    placeholder="cashuB..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleReceiveToken}
                  disabled={!token.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Processing..." : "Receive Token"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="send" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (sats)</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSendToken}
                  disabled={!amount || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Generating..." : "Generate Token"}
                </Button>

                {generatedToken && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Generated Token</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToken}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={generatedToken}
                      readOnly
                      className="text-xs min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-3">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}
