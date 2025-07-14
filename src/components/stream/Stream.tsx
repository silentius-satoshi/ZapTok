import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Users, 
  Plus, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Zap,
  Radio,
  ArrowLeft
} from 'lucide-react';
import { LiveStreamBrowser } from './LiveStreamBrowser';
import { StreamCreator } from './StreamCreator';
import { StreamDashboard } from './StreamDashboard';
import { StreamSettings } from './StreamSettings';
import { useZapStreamAPI } from '@/hooks/useZapStreamAPI';
import { useLiveActivities } from '@/hooks/useLiveActivities';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function Stream() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('browse');
  const hasNavigatedHere = useRef(false);
  
  const { useAccountInfo } = useZapStreamAPI();
  const { data: accountInfo, isLoading: accountLoading } = useAccountInfo();
  const { useLiveEvents } = useLiveActivities();
  const { data: liveActivities, isLoading: activitiesLoading } = useLiveEvents({ status: 'live' });

  const liveStreams = liveActivities?.filter(activity => 
    activity.tags.some(tag => tag[0] === 'status' && tag[1] === 'live')
  ) || [];

  const accountStatus = accountInfo ? {
    isActive: accountInfo.tos.accepted,
    balance: accountInfo.balance,
    hasPaymentMethods: accountInfo.forwards.length > 0
  } : null;

  // Track if user navigated here vs direct access
  useEffect(() => {
    const state = location.state as { fromNavigation?: boolean } | null;
    hasNavigatedHere.current = state?.fromNavigation || false;
  }, [location.state]);

  // Smart back button function
  const handleBackClick = () => {
    // Check if there's a referrer or if user navigated here from within the app
    if (document.referrer && document.referrer.includes(window.location.origin)) {
      navigate(-1);
    } else {
      // If no referrer or direct access, go to home page (video feed)
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={handleBackClick}
              className="text-gray-400 hover:text-white p-2 h-auto"
              title="Go back to previous page"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-3">
                <Radio className="w-8 h-8 text-purple-500" />
                <span>Stream</span>
              </h1>
              <p className="text-gray-400 mt-1">
                Decentralized livestreaming powered by Nostr and zap.stream
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm">
                {activitiesLoading ? '...' : liveStreams.length} Live
              </span>
            </div>
            {user && accountStatus && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-sm">{accountStatus.balance} sats</span>
              </div>
            )}
          </div>
        </div>

        {/* Account Status Alert */}
        {user && !accountLoading && (
          <>
            {!accountInfo && (
              <Alert className="bg-blue-950 border-blue-800">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-blue-100">
                  <div className="flex items-center justify-between">
                    <span>
                      Connect to zap.stream to start streaming! Check out the Dashboard tab to get started.
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {accountInfo && !accountInfo.tos.accepted && (
              <Alert className="bg-yellow-950 border-yellow-800">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-100">
                  <div className="flex items-center justify-between">
                    <span>
                      Please accept the Terms of Service in Settings to enable all streaming features.
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {accountInfo && accountInfo.tos.accepted && (
              <Alert className="bg-green-950 border-green-800">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-green-100">
                  Your streaming account is active and ready! Balance: {accountInfo.balance} sats
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Not logged in */}
        {!user && (
          <Alert className="bg-purple-950 border-purple-800">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <AlertDescription className="text-purple-100">
              Please log in with your Nostr account to access streaming features like creating streams and managing your account.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-900">
            <TabsTrigger value="browse" className="flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>Browse Streams</span>
            </TabsTrigger>
            
            {user && (
              <>
                <TabsTrigger value="create" className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Stream</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Browse Streams Tab */}
          <TabsContent value="browse">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="w-5 h-5 text-purple-500" />
                  <span>Live Streams</span>
                  {!activitiesLoading && (
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      {liveStreams.length} live
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Discover live streams from the Nostr network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LiveStreamBrowser />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Stream Tab */}
          {user && (
            <TabsContent value="create">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-green-500" />
                    <span>Create New Stream</span>
                  </CardTitle>
                  <CardDescription>
                    Set up a new live stream and publish it to the Nostr network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StreamCreator />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Dashboard Tab */}
          {user && (
            <TabsContent value="dashboard">
              <StreamDashboard />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {user && (
            <TabsContent value="settings">
              <StreamSettings />
            </TabsContent>
          )}
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="py-4">
            <div className="text-center text-sm text-gray-400 space-y-2">
              <p>
                Powered by{' '}
                <a href="https://zap.stream" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
                  zap.stream
                </a>{' '}
                and{' '}
                <a href="https://github.com/nostr-protocol/nips/blob/master/53.md" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
                  NIP-53 Live Activities
                </a>
              </p>
              <p>Decentralized livestreaming on the Nostr protocol</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
