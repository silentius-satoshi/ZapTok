import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { useCashuStore } from "@/stores/cashuStore";
import { useCashuToken } from "@/hooks/useCashuToken";
import {
  useReceivedNutzaps,
  useRedeemNutzap,
  ReceivedNutzap,
} from "@/hooks/useReceivedNutzaps";
import {
  useSendNutzap,
  useVerifyMintCompatibility,
  useFetchNutzapInfo,
} from "@/hooks/useSendNutzap";
import { nip19 } from "nostr-tools";
import { Proof } from "@cashu/cashu-ts";
import { useAuthor } from "@/hooks/useAuthor";
import { toast } from "sonner";
import {
  Copy,
  Send,
  Gift,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  MessageSquare,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { useWalletUiStore } from "@/stores/walletUiStore";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";

export function NutzapCard() {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { sendToken } = useCashuToken();
  const { sendNutzap, isSending, error: sendError } = useSendNutzap();
  const { fetchNutzapInfo } = useFetchNutzapInfo();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const {
    nutzaps: fetchedNutzaps,
    isLoading,
    refetch: refetchNutzaps,
    unclaimedCount,
    totalUnclaimed,
  } = useReceivedNutzaps();
  const { mutateAsync: redeemNutzap } = useRedeemNutzap();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  const [activeTab, setActiveTab] = useState("receive");
  const [recipientNpub, setRecipientNpub] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redeemingNutzapId, setRedeemingNutzapId] = useState<string | null>(
    null
  );
  const [copying, setCopying] = useState(false);
  const [receivedNutzaps, setReceivedNutzaps] = useState<ReceivedNutzap[]>([]);

  // Get user's npub
  const userNpub = user ? nip19.npubEncode(user.pubkey) : "";

  // Format amount based on user preference
  const formatAmount = useCallback((sats: number) => {
    if (showSats) {
      return formatBalance(sats);
    } else if (btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.USD));
    }
    return formatBalance(sats);
  }, [showSats, btcPrice]);

  // Initialize with fetched nutzaps when available
  useEffect(() => {
    if (fetchedNutzaps) {
      setReceivedNutzaps(fetchedNutzaps);
    }
  }, [fetchedNutzaps]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
      setSuccess("Copied to clipboard!");
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleSendNutzap = async () => {
    if (!cashuStore.activeMintUrl) {
      setError(
        "No active mint selected. Please select a mint in your wallet settings."
      );
      return;
    }

    if (!wallet) {
      setError("You need to set up a Cashu wallet first");
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      setError("Please enter a valid amount");
      return;
    }

    if (!recipientNpub) {
      setError("Please enter a recipient npub");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Decode the npub to get the pubkey
      const decoded = nip19.decode(recipientNpub);
      if (decoded.type !== "npub") {
        setError("Invalid npub format");
        return;
      }
      const recipientPubkey = decoded.data;

      // Fetch recipient's nutzap info
      const recipientInfo = await fetchNutzapInfo(recipientPubkey);

      console.log("Recipient info", recipientInfo);

      // Convert amount based on currency preference
      let amountValue: number;

      if (showSats) {
        amountValue = parseInt(amount);
      } else {
        // Convert USD to sats
        if (!btcPrice) {
          setError("Bitcoin price not available");
          return;
        }
        const usdAmount = parseFloat(amount);
        amountValue = Math.round(usdAmount / btcPrice.USD * 100000000); // Convert USD to sats
      }

      if (amountValue < 1) {
        setError("Amount must be at least 1 sat");
        return;
      }

      // Verify mint compatibility and get a compatible mint URL
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // Send token using p2pk pubkey from recipient info
      const tokenResult = await sendToken(amountValue);
      const proofs = tokenResult.proofs;

      // Send nutzap using recipient info
      await sendNutzap({
        recipientInfo,
        comment,
        proofs,
        mintUrl: compatibleMintUrl,
      });

      setSuccess(`Successfully sent ${formatAmount(amountValue)}`);

      // Clear form
      setRecipientNpub("");
      setAmount("");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send nutzap");
    }
  };

  const handleRedeemNutzap = async (nutzap: ReceivedNutzap) => {
    try {
      setRedeemingNutzapId(nutzap.id);
      await redeemNutzap(nutzap);

      setSuccess(`Redeemed ${formatAmount(nutzap.amount)}!`);

      // Update local state
      setReceivedNutzaps((prev) =>
        prev.map((n) =>
          n.id === nutzap.id ? { ...n, redeemed: true, status: "redeemed" } : n
        )
      );

      // Refetch to ensure consistency
      await refetchNutzaps();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to redeem nutzap"
      );
    } finally {
      setRedeemingNutzapId(null);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nutzaps</CardTitle>
          <CardDescription>Send and receive eCash payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to log in to use nutzaps
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutzaps</CardTitle>
        <CardDescription>Send and receive eCash payments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receive" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Receive
              {unclaimedCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {unclaimedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receive" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="npub">Your npub</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="npub"
                    value={userNpub}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(userNpub)}
                    disabled={copying}
                  >
                    {copying ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats */}
              {(unclaimedCount > 0 || totalUnclaimed > 0) && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-orange-800 dark:text-orange-200">
                        Unclaimed
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-orange-600">
                      {unclaimedCount}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <Gift className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-orange-800 dark:text-orange-200">
                        Total
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatAmount(totalUnclaimed)}
                    </p>
                  </div>
                </div>
              )}

              {/* Received Nutzaps List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Received Nutzaps</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchNutzaps()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-7 w-16" />
                      </div>
                    ))}
                  </div>
                ) : receivedNutzaps.length === 0 ? (
                  <div className="py-8 text-center">
                    <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      No nutzaps received yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Share your npub to start receiving nutzaps!
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {receivedNutzaps.map((nutzap) => (
                        <NutzapItem
                          key={nutzap.id}
                          nutzap={nutzap}
                          onRedeem={handleRedeemNutzap}
                          isRedeeming={redeemingNutzapId === nutzap.id}
                          formatAmount={formatAmount}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="send" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient (npub)</Label>
                <Input
                  id="recipient"
                  placeholder="npub1..."
                  value={recipientNpub}
                  onChange={(e) => setRecipientNpub(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount {showSats ? "(sats)" : "(USD)"}</Label>
                <Input
                  id="amount"
                  type="number"
                  step={showSats ? "1" : "0.01"}
                  min={showSats ? "1" : "0.01"}
                  placeholder={showSats ? "100" : "0.10"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="comment">Comment (optional)</Label>
                <Input
                  id="comment"
                  placeholder="Thanks!"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSendNutzap}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Nutzap
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface NutzapItemProps {
  nutzap: ReceivedNutzap;
  onRedeem: (nutzap: ReceivedNutzap) => void;
  isRedeeming: boolean;
  formatAmount: (sats: number) => string;
}

function NutzapItem({ nutzap, onRedeem, isRedeeming, formatAmount }: NutzapItemProps) {
  const author = useAuthor(nutzap.senderPubkey);
  const metadata = author.data?.metadata;

  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg">
      <Avatar className="h-10 w-10">
        <AvatarImage src={metadata?.picture} />
        <AvatarFallback>
          {metadata?.name?.[0] || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium truncate">
                {metadata?.name || `${nutzap.senderPubkey.slice(0, 8)}...`}
              </p>
              <Badge
                variant={nutzap.redeemed ? 'default' : 'secondary'}
                className="text-xs"
              >
                {nutzap.redeemed ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Clock className="h-3 w-3 mr-1" />
                )}
                {nutzap.redeemed ? 'redeemed' : 'pending'}
              </Badge>
            </div>

            {nutzap.comment && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate max-w-40">
                  {nutzap.comment}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(nutzap.timestamp * 1000).toLocaleDateString()}
            </p>
          </div>

          <div className="text-right space-y-2">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-semibold">
                {formatAmount(nutzap.amount)}
              </span>
            </div>

            {!nutzap.redeemed && (
              <Button
                size="sm"
                onClick={() => onRedeem(nutzap)}
                disabled={isRedeeming}
                className="h-7 px-2 text-xs"
              >
                {isRedeeming ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Redeem'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}