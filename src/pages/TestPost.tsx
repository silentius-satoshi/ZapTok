import { useSeoMeta } from '@unhead/react';
import { TestVideoPost } from '@/components/TestVideoPost';
import { LogoHeader } from '@/components/LogoHeader';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Test page for posting videos and testing real-time global feed subscription
 */
const TestPost = () => {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Test Post - ZapTok',
    description: 'Test posting videos to the global feed',
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex h-screen">
        {/* Desktop Left Sidebar */}
        <div className="hidden md:flex flex-col bg-black">
          <LogoHeader />
          <div className="flex-1">
            <Navigation />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/global')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Global Feed
              </Button>
            </div>

            {/* Test Form */}
            <TestVideoPost />

            {/* Instructions */}
            <div className="mt-8 space-y-4 text-sm text-muted-foreground">
              <h3 className="text-base font-medium text-white">Testing Instructions:</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Open the <strong>Global Feed</strong> in another tab or window</li>
                <li>Fill in the form above (or use "Use Sample Data" button)</li>
                <li>Click "Publish Test Video"</li>
                <li>Watch the Global Feed - your video should appear within 1-2 seconds</li>
                <li>
                  Check browser console for logs:
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li><code className="bg-gray-800 px-1 rounded">🌍✅ Real-time subscription EOSE reached</code></li>
                    <li><code className="bg-gray-800 px-1 rounded">🌍📹 Found NIP-71 video event</code></li>
                    <li><code className="bg-gray-800 px-1 rounded">🌍🆕 New video buffered</code></li>
                  </ul>
                </li>
              </ol>

              <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
                <h4 className="font-medium text-white mb-2">Expected Real-Time Flow:</h4>
                <div className="space-y-2 text-xs font-mono">
                  <div>1️⃣ Event published → All relays</div>
                  <div>2️⃣ Real-time subscription receives event</div>
                  <div>3️⃣ Event validated (NIP-71 format check)</div>
                  <div>4️⃣ Added to <code>newVideos</code> buffer (max 50)</div>
                  <div>5️⃣ Counter updates: "X new videos"</div>
                  <div>6️⃣ User clicks banner → Videos merged into feed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPost;
