import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuToken } from '@/hooks/useCashuToken';
import { useSendNutzap } from '@/hooks/useSendNutzap';
import { useFetchNutzapInfo } from '@/hooks/useSendNutzap';
import { useReceivedNutzaps } from '@/hooks/useReceivedNutzaps';
import { useRedeemNutzap } from '@/hooks/useRedeemNutzap';
import { useVerifyMintCompatibility } from '@/hooks/useSendNutzap';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp, Zap, Send, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function NutzapCard() {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { sendToken } = useCashuToken();
  const { sendNutzap, isSending, error: sendError } = useSendNutzap();
  const { fetchNutzapInfo } = useFetchNutzapInfo();
  const {
    nutzaps: fetchedNutzaps,
    isLoading: isLoadingNutzaps,
    refetch: refetchNutzaps,
  } = useReceivedNutzaps();
  const { mutateAsync: redeemNutzap, isPending: isRedeemingNutzap } = useRedeemNutzap();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.nutzap;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("send");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleExpanded = () => {
    walletUiStore.toggleCardExpansion('nutzap');
  };

  const handleSendNutzap = async () => {
    if (!amount || !recipient || !user) return;

    setIsLoading(true);
    try {
      // First fetch recipient info
      const recipientInfo = await fetchNutzapInfo(recipient.trim());
      
      // Get proofs for the amount
      const availableMints = Object.keys(cashuStore.mints);
      if (availableMints.length === 0) {
        throw new Error("No mints available");
      }
      
      const proofs = await sendToken(availableMints[0], parseInt(amount));
      
      await sendNutzap({
        recipientInfo,
        proofs,
        mintUrl: availableMints[0],
        comment: `Nutzap of ${amount} sats`
      });
      
      toast({
        title: "Nutzap Sent",
        description: `Successfully sent ${amount} sats to ${recipient}`,
      });
      
      setAmount("");
      setRecipient("");
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error?.message || "Failed to send nutzap",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemNutzap = async (nutzapId: string) => {
    try {
      await redeemNutzap({ nutzapId });
      refetchNutzaps();
    } catch (error) {
      console.error('Failed to redeem nutzap:', error);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-white font-medium">Nutzaps</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="text-gray-400 hover:text-white h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-gray-400 text-sm">Send and receive Nostr zaps with Cashu</p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="send" className="data-[state=active]:bg-gray-600">
                <Send className="w-4 h-4 mr-2" />
                Send
              </TabsTrigger>
              <TabsTrigger value="receive" className="data-[state=active]:bg-gray-600">
                <Download className="w-4 h-4 mr-2" />
                Receive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Amount (sats)</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Recipient (npub/pubkey)</label>
                  <Input
                    placeholder="npub1... or hex pubkey"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button 
                  onClick={handleSendNutzap}
                  disabled={!amount || !recipient || isLoading || isSending}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium"
                >
                  {isLoading || isSending ? "Sending..." : "Send Nutzap"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="receive" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">Received Nutzaps</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchNutzaps()}
                  disabled={isLoadingNutzaps}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingNutzaps ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isLoadingNutzaps ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">Loading nutzaps...</p>
                  </div>
                ) : fetchedNutzaps && fetchedNutzaps.length > 0 ? (
                  fetchedNutzaps.map((nutzap: any, index: number) => (
                    <div
                      key={nutzap.id || index}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {nutzap.amount} sats
                        </p>
                        <p className="text-gray-400 text-xs">
                          From: {nutzap.sender?.slice(0, 16)}...
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRedeemNutzap(nutzap.id)}
                        disabled={isRedeemingNutzap}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {isRedeemingNutzap ? "..." : "Redeem"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">No nutzaps received yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {sendError && (
            <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{sendError.message}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
