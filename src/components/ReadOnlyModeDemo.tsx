import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { VideoInteractionPrompt, VideoPostingPrompt } from '@/components/auth/LoginPrompt';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ReadOnlySigner } from '@/hooks/useReadOnlySigner';
import { cn } from '@/lib/utils';

export function ReadOnlyModeDemo() {
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const { canSign, isReadOnly, user } = useCurrentUser();

  const enableReadOnlyMode = () => {
    setReadOnlyMode(true);
    // Demo state tracking for read-only mode
  };

  const disableReadOnlyMode = () => {
    setReadOnlyMode(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Read-Only Mode Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Current User State</h3>
              <div className="space-y-2 text-sm">
                <div>Has User: {user ? '✅' : '❌'}</div>
                <div>Can Sign: {canSign ? '✅' : '❌'}</div>
                <div>Is Read-Only: {isReadOnly ? '✅' : '❌'}</div>
                <div>Demo Read-Only Mode: {readOnlyMode ? '✅' : '❌'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Available Actions</h3>
              <div className="space-y-2 text-sm">
                <div>Browse Videos: ✅ Always available</div>
                <div>View Profiles: ✅ Always available</div>
                <div>Post Videos: {canSign && !readOnlyMode ? '✅' : '❌'}</div>
                <div>Comment: {canSign && !readOnlyMode ? '✅' : '❌'}</div>
                <div>Like/Zap: {canSign && !readOnlyMode ? '✅' : '❌'}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={enableReadOnlyMode} 
              variant="outline"
              disabled={readOnlyMode}
            >
              Enable Read-Only Demo
            </Button>
            <Button 
              onClick={disableReadOnlyMode} 
              variant="outline"
              disabled={!readOnlyMode}
            >
              Disable Read-Only Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Area with Browse Option</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginArea 
            className="max-w-60"
            showBrowseWithoutLogin={true}
            browseButtonText="Browse Videos"
            onBrowseClick={enableReadOnlyMode}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Video Interaction Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoInteractionPrompt 
              onLoginClick={() => console.log('Login clicked from video interaction')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Video Posting Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoPostingPrompt 
              onLoginClick={() => console.log('Login clicked from video posting')}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border p-2 text-left">Feature</th>
                  <th className="border border-border p-2 text-center">Not Logged In</th>
                  <th className="border border-border p-2 text-center">Read-Only Mode</th>
                  <th className="border border-border p-2 text-center">Fully Authenticated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2">Browse Videos</td>
                  <td className="border border-border p-2 text-center">✅</td>
                  <td className="border border-border p-2 text-center">✅</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">View Profiles</td>
                  <td className="border border-border p-2 text-center">✅</td>
                  <td className="border border-border p-2 text-center">✅</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Share QR Codes</td>
                  <td className="border border-border p-2 text-center">✅</td>
                  <td className="border border-border p-2 text-center">✅</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Post Videos</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Comment</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Like/React</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Send Zaps</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Follow Users</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Enhanced Sharing</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">❌</td>
                  <td className="border border-border p-2 text-center">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}