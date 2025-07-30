import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SettingsSection } from './SettingsSection';

export function StreamSettings() {
  const navigate = useNavigate();

  return (
    <SettingsSection 
      description="Configure your livestreaming preferences and account settings."
    >
      {/* Stream Settings Options */}
      <div className="space-y-4">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">Streaming Account</h4>
          <p className="text-sm text-gray-400 mb-3">
            Manage your zap.stream account and streaming configuration.
          </p>
          <Button
            onClick={() => navigate('/stream', { state: { fromNavigation: true } })}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Open Stream Dashboard
          </Button>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">Stream Quality</h4>
          <p className="text-sm text-gray-400 mb-3">
            Recommended settings for optimal streaming performance.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Video Bitrate:</span>
              <div className="text-white">2000-6000 kbps</div>
            </div>
            <div>
              <span className="text-gray-400">Audio Bitrate:</span>
              <div className="text-white">128-320 kbps</div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">RTMP Settings</h4>
          <p className="text-sm text-gray-400 mb-3">
            Server URL for streaming software (OBS, Streamlabs, etc.)
          </p>
          <div className="bg-gray-900 p-3 rounded border border-gray-600">
            <code className="text-sm text-green-400">rtmp://ingest.zap.stream/live/</code>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Use this URL in your streaming software along with your stream key.
          </p>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">Protocol Support</h4>
          <p className="text-sm text-gray-400 mb-3">
            This streaming implementation uses NIP-53 Live Activities for decentralized broadcasting.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/nostr-protocol/nips/blob/master/53.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Learn about NIP-53
            </a>
            <a
              href="https://zap.stream"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Visit zap.stream
            </a>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
