import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Wallet, 
  Key, 
  Copy,
  ExternalLink,
  AlertCircle,
  DollarSign,
  Download
} from 'lucide-react';
import { useZapStreamAPI } from '@/hooks/useZapStreamAPI';
import { useLiveActivities } from '@/hooks/useLiveActivities';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';

export function StreamDashboard() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('streams');

  const {
    useAccountInfo,
    useStreamKeys,
    useAccountHistory,
    useRequestTopup,
    useWithdraw,
    useUpdateAccount,
  } = useZapStreamAPI();

  const { useLiveEvents, useUpdateLiveEvent } = useLiveActivities();

  const { data: accountInfo, isLoading: accountLoading } = useAccountInfo();
  const { data: streamKeys, isLoading: keysLoading } = useStreamKeys();
  const { data: history } = useAccountHistory();
  const { data: myStreams, isLoading: streamsLoading } = useLiveEvents({
    authors: user ? [user.pubkey] : undefined,
    limit: 20,
  });

  const requestTopup = useRequestTopup();
  const withdraw = useWithdraw();
  const updateAccount = useUpdateAccount();
  const updateLiveEvent = useUpdateLiveEvent();

  const [topupAmount, setTopupAmount] = useState('');
  const [withdrawInvoice, setWithdrawInvoice] = useState('');

  const handleAcceptTOS = async () => {
    try {
      await updateAccount.mutateAsync({ accept_tos: true });
      toast({
        title: 'Terms Accepted',
        description: 'You can now create and manage streams.',
      });
    } catch (error) {
      toast({
        title: 'Failed to Accept Terms',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleTopup = async () => {
    const amount = parseInt(topupAmount);
    if (!amount || amount < 1000) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum topup amount is 1000 sats',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await requestTopup.mutateAsync(amount);
      // Open lightning wallet or show QR code
      window.open(`lightning:${result.pr}`, '_blank');
      toast({
        title: 'Payment Request Generated',
        description: 'Please pay the lightning invoice to add funds.',
      });
      setTopupAmount('');
    } catch (error) {
      toast({
        title: 'Topup Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawInvoice.trim()) {
      toast({
        title: 'Invoice Required',
        description: 'Please enter a lightning invoice',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await withdraw.mutateAsync(withdrawInvoice);
      toast({
        title: 'Withdrawal Successful',
        description: `Withdrew ${result.fee} sats (fee: ${result.fee} sats)`,
      });
      setWithdrawInvoice('');
    } catch (error) {
      toast({
        title: 'Withdrawal Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleStreamStatusChange = async (identifier: string, status: 'live' | 'ended') => {
    try {
      await updateLiveEvent.mutateAsync({
        identifier,
        status,
        ...(status === 'live' ? { starts: Math.floor(Date.now() / 1000) } : {}),
        ...(status === 'ended' ? { ends: Math.floor(Date.now() / 1000) } : {}),
      });
      
      toast({
        title: 'Stream Updated',
        description: `Stream status changed to ${status}`,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const copyStreamKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Stream Key Copied',
      description: 'The stream key has been copied to your clipboard.',
    });
  };

  if (accountLoading || streamsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Status */}
      {accountInfo && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-green-500" />
                <span>Account Overview</span>
              </div>
              <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                {accountInfo.balance} sats
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!accountInfo.tos.accepted ? (
              <Alert className="bg-yellow-950 border-yellow-800">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-100">
                  <div className="flex items-center justify-between">
                    <span>
                      Please accept the{' '}
                      <a href={accountInfo.tos.link} target="_blank" rel="noopener noreferrer" className="underline">
                        Terms of Service
                      </a>{' '}
                      to use streaming features.
                    </span>
                    <Button 
                      onClick={handleAcceptTOS}
                      disabled={updateAccount.isPending}
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Accept Terms
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{accountInfo.balance}</div>
                  <div className="text-sm text-gray-400">Current Balance (sats)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{myStreams?.length || 0}</div>
                  <div className="text-sm text-gray-400">Total Streams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {myStreams?.filter(s => s.status === 'live').length || 0}
                  </div>
                  <div className="text-sm text-gray-400">Live Now</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-900">
          <TabsTrigger value="streams">
            <Activity className="w-4 h-4 mr-2" />
            My Streams
          </TabsTrigger>
          <TabsTrigger value="keys">
            <Key className="w-4 h-4 mr-2" />
            Stream Keys
          </TabsTrigger>
          <TabsTrigger value="wallet">
            <Wallet className="w-4 h-4 mr-2" />
            Wallet
          </TabsTrigger>
        </TabsList>

        {/* My Streams Tab */}
        <TabsContent value="streams" className="space-y-4">
          {myStreams && myStreams.length > 0 ? (
            <div className="space-y-4">
              {myStreams.map((stream) => (
                <Card key={stream.identifier} className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{stream.title}</CardTitle>
                        <CardDescription>{stream.summary}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={
                            stream.status === 'live' 
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : stream.status === 'planned'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }
                        >
                          {stream.status === 'live' && <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse" />}
                          {stream.status}
                        </Badge>
                        
                        {stream.status !== 'ended' && (
                          <Button
                            onClick={() => handleStreamStatusChange(
                              stream.identifier!,
                              stream.status === 'live' ? 'ended' : 'live'
                            )}
                            size="sm"
                            variant={stream.status === 'live' ? 'destructive' : 'default'}
                            disabled={updateLiveEvent.isPending}
                          >
                            {stream.status === 'live' ? 'End Stream' : 'Go Live'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Viewers</div>
                        <div className="font-medium">{stream.currentParticipants || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Started</div>
                        <div className="font-medium">
                          {stream.starts ? formatDistanceToNow(new Date(stream.starts * 1000), { addSuffix: true }) : 'Not started'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Hashtags</div>
                        <div className="font-medium">
                          {stream.hashtags?.slice(0, 2).map(tag => `#${tag}`).join(', ') || 'None'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Actions</div>
                        <div className="flex items-center space-x-1">
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`https://zap.stream/live/${stream.identifier}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-gray-700 bg-gray-900/50">
              <CardContent className="py-12 px-8 text-center">
                <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Streams Yet</h3>
                <p className="text-gray-400 mb-4">Create your first live stream to get started</p>
                <Button onClick={() => setActiveTab('create')} className="bg-purple-600 hover:bg-purple-700">
                  <Activity className="w-4 h-4 mr-2" />
                  Create Stream
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stream Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          {keysLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Loading stream keys...</p>
            </div>
          ) : streamKeys && streamKeys.length > 0 ? (
            <div className="space-y-4">
              {streamKeys.map((key) => (
                <Card key={key.id} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="text-sm text-gray-400">Stream Key</div>
                        <div className="font-mono text-sm bg-gray-800 p-2 rounded border border-gray-700">
                          {key.key}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {formatDistanceToNow(new Date(key.created * 1000), { addSuffix: true })}
                          {key.expires && ` • Expires: ${formatDistanceToNow(new Date(key.expires * 1000), { addSuffix: true })}`}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button onClick={() => copyStreamKey(key.key)} size="sm" variant="ghost">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-gray-700 bg-gray-900/50">
              <CardContent className="py-12 px-8 text-center">
                <Key className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Stream Keys</h3>
                <p className="text-gray-400">Create a stream to generate stream keys</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topup */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Add Funds</CardTitle>
                <CardDescription>Top up your account balance with Lightning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topup-amount">Amount (sats)</Label>
                  <Input
                    id="topup-amount"
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="1000"
                    min="1000"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <Button 
                  onClick={handleTopup}
                  disabled={requestTopup.isPending || !topupAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {requestTopup.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Generate Invoice
                </Button>
              </CardContent>
            </Card>

            {/* Withdraw */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Withdraw Funds</CardTitle>
                <CardDescription>Withdraw sats to your Lightning wallet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-invoice">Lightning Invoice</Label>
                  <Input
                    id="withdraw-invoice"
                    value={withdrawInvoice}
                    onChange={(e) => setWithdrawInvoice(e.target.value)}
                    placeholder="lnbc..."
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <Button 
                  onClick={handleWithdraw}
                  disabled={withdraw.isPending || !withdrawInvoice}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {withdraw.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Pay Invoice
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          {history && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Transaction History</CardTitle>
                <CardDescription>Recent account activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {history.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border border-gray-700">
                        <div>
                          <div className="text-sm font-medium">{item.desc}</div>
                          <div className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(item.created * 1000), { addSuffix: true })}
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.amount > 0 ? '+' : ''}{item.amount} sats
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
