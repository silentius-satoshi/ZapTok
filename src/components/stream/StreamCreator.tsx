import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Calendar,
  Hash,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useZapStreamAPI } from '@/hooks/useZapStreamAPI';
import { useLiveActivities } from '@/hooks/useLiveActivities';
import { useToast } from '@/hooks/useToast';

export function StreamCreator() {
  const { useCreateStreamKey, useAccountInfo } = useZapStreamAPI();
  const { useCreateLiveEvent } = useLiveActivities();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    image: '',
    hashtags: '',
    isScheduled: false,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    contentWarning: '',
    goal: '',
  });

  const [streamKey, setStreamKey] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>('');

  const { data: accountInfo } = useAccountInfo();
  const createStreamKey = useCreateStreamKey();
  const createLiveEvent = useCreateLiveEvent();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const parseHashtags = (hashtagString: string): string[] => {
    return hashtagString
      .split(',')
      .map(tag => tag.trim().replace('#', ''))
      .filter(tag => tag.length > 0);
  };

  const handleCreateStream = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your stream',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Generate unique identifier for the stream
      const identifier = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Prepare hashtags
      const hashtags = parseHashtags(formData.hashtags);

      // Calculate timestamps for scheduled streams
      let starts: number | undefined;
      let ends: number | undefined;
      
      if (formData.isScheduled && formData.startDate && formData.startTime) {
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        starts = Math.floor(startDateTime.getTime() / 1000);
        
        if (formData.endDate && formData.endTime) {
          const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
          ends = Math.floor(endDateTime.getTime() / 1000);
        }
      }

      // Step 1: Create stream key in zap.stream
      const streamKeyData = await createStreamKey.mutateAsync({
        event: {
          title: formData.title,
          summary: formData.summary || undefined,
          image: formData.image || undefined,
          tags: hashtags.length > 0 ? hashtags : undefined,
          content_warning: formData.contentWarning || undefined,
          goal: formData.goal || undefined,
        },
        expires: ends ? new Date(ends * 1000).toISOString() : undefined,
      });

      setStreamKey(streamKeyData.key);

      // Step 2: Create NIP-53 Live Event
      await createLiveEvent.mutateAsync({
        identifier,
        title: formData.title,
        summary: formData.summary || undefined,
        image: formData.image || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        streamingUrl: `rtmp://ingest.zap.stream/live/${streamKeyData.key}`,
        starts,
        ends,
        status: formData.isScheduled ? 'planned' : 'live',
      });

      setCreatedEventId(identifier);

      toast({
        title: 'Stream Created Successfully!',
        description: 'Your stream is ready. Copy the stream key to start broadcasting.',
      });

      // Reset form
      setFormData({
        title: '',
        summary: '',
        image: '',
        hashtags: '',
        isScheduled: false,
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        contentWarning: '',
        goal: '',
      });

    } catch (error) {
      console.error('Failed to create stream:', error);
      toast({
        title: 'Failed to Create Stream',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyStreamKey = () => {
    navigator.clipboard.writeText(streamKey);
    toast({
      title: 'Stream Key Copied!',
      description: 'The stream key has been copied to your clipboard.',
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // If stream was created successfully, show success state
  if (streamKey && createdEventId) {
    return (
      <div className="space-y-6">
        <Card className="bg-green-950 border-green-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <CardTitle className="text-green-100">Stream Created Successfully!</CardTitle>
            </div>
            <CardDescription className="text-green-200">
              Your live stream has been set up and published to the Nostr network.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-green-100">Stream Key (Keep Private)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={streamKey}
                  readOnly
                  className="bg-green-900/50 border-green-700 text-green-100 font-mono text-sm"
                />
                <Button onClick={copyStreamKey} variant="outline" size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-green-100">RTMP Ingest URL</Label>
              <Input
                value="rtmp://ingest.zap.stream/live/"
                readOnly
                className="bg-green-900/50 border-green-700 text-green-100 font-mono text-sm"
              />
            </div>

            <Alert className="bg-blue-950 border-blue-800">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <AlertDescription className="text-blue-100">
                <strong>How to start streaming:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Open your streaming software (OBS, Streamlabs, etc.)</li>
                  <li>Set the Server/URL to: <code className="bg-blue-900/50 px-1 rounded">rtmp://ingest.zap.stream/live/</code></li>
                  <li>Set the Stream Key to the key shown above</li>
                  <li>Configure your video/audio settings</li>
                  <li>Click "Start Streaming" in your software</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-4 pt-4">
              <Button 
                onClick={() => {
                  setStreamKey('');
                  setCreatedEventId('');
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Another Stream
              </Button>
              
              <Button variant="outline" asChild>
                <a 
                  href={`https://zap.stream/live/${createdEventId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on zap.stream
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-purple-500" />
            <span>Create New Live Stream</span>
          </CardTitle>
          <CardDescription>
            Set up a new live stream on the Nostr network using zap.stream infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Status */}
          {accountInfo && (
            <Alert className={accountInfo.tos.accepted ? 'bg-green-950 border-green-800' : 'bg-yellow-950 border-yellow-800'}>
              <AlertCircle className={`w-4 h-4 ${accountInfo.tos.accepted ? 'text-green-400' : 'text-yellow-400'}`} />
              <AlertDescription className={accountInfo.tos.accepted ? 'text-green-100' : 'text-yellow-100'}>
                {accountInfo.tos.accepted ? (
                  <>
                    <strong>Account Ready:</strong> Balance: {accountInfo.balance} sats
                  </>
                ) : (
                  <>
                    <strong>Terms of Service:</strong> Please accept the{' '}
                    <a href={accountInfo.tos.link} target="_blank" rel="noopener noreferrer" className="underline">
                      Terms of Service
                    </a>{' '}
                    in Settings to create streams.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Stream Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter your stream title"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Description</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                placeholder="Describe what you'll be streaming about..."
                className="bg-gray-800 border-gray-700 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4" />
                <span>Thumbnail Image URL</span>
              </Label>
              <Input
                id="image"
                type="url"
                value={formData.image}
                onChange={(e) => handleInputChange('image', e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hashtags" className="flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <span>Hashtags</span>
              </Label>
              <Input
                id="hashtags"
                value={formData.hashtags}
                onChange={(e) => handleInputChange('hashtags', e.target.value)}
                placeholder="gaming, music, art (comma separated)"
                className="bg-gray-800 border-gray-700"
              />
              <p className="text-xs text-gray-400">
                Separate hashtags with commas. These help people discover your stream.
              </p>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="scheduled"
                checked={formData.isScheduled}
                onCheckedChange={(checked) => handleInputChange('isScheduled', checked)}
              />
              <Label htmlFor="scheduled" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Schedule for later</span>
              </Label>
            </div>

            {formData.isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    min={getTodayDate()}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    min={formData.startDate || getTodayDate()}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (Optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Optional Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentWarning">Content Warning (Optional)</Label>
              <Input
                id="contentWarning"
                value={formData.contentWarning}
                onChange={(e) => handleInputChange('contentWarning', e.target.value)}
                placeholder="e.g., Strong language, Violence, etc."
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Stream Goal (Optional)</Label>
              <Input
                id="goal"
                value={formData.goal}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                placeholder="e.g., Raise 10,000 sats for charity"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreateStream}
            disabled={isCreating || !formData.title.trim() || (accountInfo && !accountInfo.tos.accepted)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating Stream...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Live Stream
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
