import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';

/**
 * Test component to publish a video event and test real-time global feed updates
 */
export function TestVideoPost() {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !videoUrl) {
      toast({
        title: 'Missing fields',
        description: 'Title and video URL are required',
        variant: 'destructive',
      });
      return;
    }

    // Create a kind 22 video event (NIP-71 short vertical video)
    // NIP-71 requires video URL in imeta tag and can also be in content
    createEvent(
      {
        kind: 22, // Short vertical video
        content: `${description || title}\n\n${videoUrl}`, // Include URL in content too
        tags: [
          ['title', title],
          ['published_at', Math.floor(Date.now() / 1000).toString()],
          ['imeta', `url ${videoUrl}`, 'm video/mp4'], // Properly formatted imeta tag
          ['t', 'test'], // Test tag for easy filtering
        ],
      },
      {
        onSuccess: () => {
          toast({
            title: '✅ Test video posted!',
            description: 'Check the global feed - it should appear in real-time',
          });
          // Clear form
          setTitle('');
          setVideoUrl('');
          setDescription('');
        },
        onError: (error) => {
          toast({
            title: 'Failed to post',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Real-Time Video Post</CardTitle>
          <CardDescription>You must be logged in to test posting</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>🧪 Test Real-Time Global Feed</CardTitle>
        <CardDescription>
          Post a test video to see if the global feed picks it up in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Video Title *
            </label>
            <Input
              id="title"
              placeholder="Test Video - Real-time Feed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="videoUrl" className="text-sm font-medium">
              Video URL *
            </label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://video.nostr.build/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use a real video URL from nostr.build, blossom.primal.net, etc.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="description"
              placeholder="Testing real-time subscription on global feed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Publishing...' : '📤 Publish Test Video'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Pre-fill with random sample video URL for quick testing
                const sampleVideos = [
                  {
                    url: 'https://video.nostr.build/a5377ff426d015f8ac085e1fe97220540686bab58bf1eb90bd68373825c8eca7.mp4',
                    title: 'Cat Wants McDonald\'s',
                    desc: '🧪 Testing real-time feed - listen to this cat!'
                  },
                  {
                    url: 'https://video.nostr.build/e6094c04438f39701b71ab562e656ae0798176ac5ce0a27f0ce5886f353caeb3.mp4',
                    title: '30% ABV Homemade Booze',
                    desc: '🧪 Testing real-time feed - impressive brewing!'
                  },
                  {
                    url: 'https://video.nostr.build/98d01933b4511587464fd8d4f6f81b4cfed32bd54768b5eb600128c036669730.mp4',
                    title: 'Women\'s Rugby Highlights',
                    desc: '🧪 Testing real-time feed - amazing sport!'
                  },
                  {
                    url: 'https://video.nostr.build/042ee0068af009d837733169d9863c7b039e78f0711c4e5919dee4926fe96dc4.mp4',
                    title: 'First Huntington\'s Treatment',
                    desc: '🧪 Testing real-time feed - medical breakthrough!'
                  },
                  {
                    url: 'https://video.nostr.build/9a188fcc1553ea5b4abe2250548dfe9f62cebeb2c267082ba41c1f10bd2e3c2e.mp4',
                    title: 'Roman Centurion Lamb Stew',
                    desc: '🧪 Testing real-time feed - historical cooking!'
                  },
                  {
                    url: 'https://video.nostr.build/272cee7463c81fef3ba5b451af6bc48bcd92a948b115576678a3c4fcfca80a56.mp4',
                    title: 'Eye Drops to Replace Glasses',
                    desc: '🧪 Testing real-time feed - science innovation!'
                  },
                  {
                    url: 'https://video.nostr.build/2c233dec06b72e9039e45d463075593e0c5beb875190f1849a0db1aa2fe9501c.mp4',
                    title: 'Paralyzed Hummingbird Rescue',
                    desc: '🧪 Testing real-time feed - heartwarming story!'
                  },
                  {
                    url: 'https://blossom.primal.net/4edb34fce2b59b3ddb73f60b80ac02ca1e546dab3294a8cccb124c2aa5324d06.mp4',
                    title: 'Restaurant Server Sings',
                    desc: '🧪 Testing real-time feed - incredible voice!'
                  }
                ];
                
                // Pick a random video from the sample list
                const randomVideo = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
                
                setTitle(`${randomVideo.title} - ${new Date().toLocaleTimeString()}`);
                setVideoUrl(randomVideo.url);
                setDescription(randomVideo.desc);
              }}
            >
              ⚡ Use Sample Data
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Expected behavior:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click "Publish Test Video"</li>
              <li>Event is published to all relays</li>
              <li>Real-time subscription picks it up (look for console log)</li>
              <li>Video appears in the global feed within seconds</li>
              <li>A banner may appear: "X new videos available"</li>
            </ol>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
