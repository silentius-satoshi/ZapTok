import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, X, Plus, Globe, Check } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { checkBlossomServer, primalBlossom } from '@/lib/blossomUtils';
import { sendBlossomEvent } from '@/lib/notes';
import { logError } from '@/lib/logger';
import { SettingsSection } from './SettingsSection';

interface ServerAvailability {
  [url: string]: boolean;
}

const recomendedBlossomServers = [
  'https://cdn.satellite.earth/',
  'https://blossom.oxtr.dev/',
  'https://blossom.nostrage.com/',
  'https://files.v0l.io/',
];

export function BlossomSettings() {
  const { config, addBlossomServer, appendBlossomServer, removeBlossomServer, removeBlossomMirrors } = useAppContext();
  const { toast } = useToast();
  const [switchServerInput, setSwitchServerInput] = useState('');
  const [addMirrorInput, setAddMirrorInput] = useState('');
  const [invalidServerUrl, setInvalidServerUrl] = useState(false);
  const [hasMirrors, setHasMirrors] = useState(false);
  const [confirmNoMirrors, setConfirmNoMirrors] = useState(false);
  const [serverAvailability, setServerAvailability] = useState<ServerAvailability>({});

  const mirrorServers = config.blossomServers.slice(1);

  useEffect(() => {
    setHasMirrors(mirrorServers.length > 0);
  }, [mirrorServers.length]);

  useEffect(() => {
    checkServers(config.blossomServers);
  }, [config.blossomServers]);

  const checkServers = async (servers: string[]) => {
    const availability: ServerAvailability = {};

    await Promise.all(
      servers.map(async (url) => {
        const available = await checkBlossomServer(url);
        availability[url] = available;
      })
    );

    setServerAvailability(availability);
  };

  const validateAndNormalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.origin.startsWith('https://')) {
        throw new Error('must be a https');
      }
      return urlObj.href;
    } catch (e) {
      throw new Error('invalid server URL');
    }
  };

  const handleSwitchServerInput = () => {
    if (!switchServerInput || switchServerInput === '') {
      return;
    }

    try {
      const normalizedUrl = validateAndNormalizeUrl(switchServerInput);
      setSwitchServerInput('');
      addBlossomServer(normalizedUrl);
      setInvalidServerUrl(false);
      toast({
        title: "Success",
        description: "Media server updated successfully",
      });
    } catch (e) {
      console.error('invalid media server input', e);
      setInvalidServerUrl(true);
      toast({
        title: "Error",
        description: "Invalid server URL. Please use a valid HTTPS URL.",
        variant: "destructive",
      });
    }
  };

  const handleAddMirrorInput = () => {
    if (!addMirrorInput || addMirrorInput === '') {
      return;
    }

    try {
      const normalizedUrl = validateAndNormalizeUrl(addMirrorInput);
      setAddMirrorInput('');
      appendBlossomServer(normalizedUrl);
      setInvalidServerUrl(false);
      toast({
        title: "Success",
        description: "Mirror server added successfully",
      });
    } catch (e) {
      console.error('invalid mirror server input', e);
      setInvalidServerUrl(true);
      toast({
        title: "Error",
        description: "Invalid server URL. Please use a valid HTTPS URL.",
        variant: "destructive",
      });
    }
  };

  const getRecommendedMirrors = () => {
    const activeMirrors = config.blossomServers;
    const recommended = recomendedBlossomServers.filter(s => !activeMirrors.includes(s));

    // Check server availability for recommended servers
    checkServers(recommended);

    return recommended;
  };

  const handleMirrorToggle = (checked: boolean) => {
    if (mirrorServers.length > 0 && !checked) {
      setConfirmNoMirrors(true);
      return;
    }
    setHasMirrors(checked);
  };

  const handleConfirmRemoveMirrors = () => {
    removeBlossomMirrors();
    setHasMirrors(false);
    setConfirmNoMirrors(false);
    toast({
      title: "Success",
      description: "Mirror servers removed successfully",
    });
  };

  const ServerStatusIndicator = ({ url }: { url: string }) => {
    const isAvailable = serverAvailability[url];
    return (
      <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-500'}`} />
    );
  };

  return (
    <SettingsSection title="Blossom Media Upload">
      <div className="space-y-6">
        {/* Media Server Section */}
        <div>
          <h4 className="text-lg font-medium mb-4">Media Server</h4>

          {/* Connected Server */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <ServerStatusIndicator url={config.blossomServers[0] || primalBlossom} />
            <span className="text-sm font-mono">{config.blossomServers[0] || primalBlossom}</span>
          </div>

          {/* Switch Media Server */}
          <div className="space-y-3">
            <Label className="text-gray-500">Switch media server</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="enter blossom server url..."
                  value={switchServerInput}
                  onChange={(e) => setSwitchServerInput(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSwitchServerInput()}
                />
                <Button
                  onClick={handleSwitchServerInput}
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {invalidServerUrl && (
              <div className="text-red-500 text-sm">
                Invalid server URL. Please enter a valid HTTPS URL.
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => addBlossomServer(primalBlossom)}
              className="text-sm"
            >
              Restore default media server
            </Button>
          </div>
        </div>

        {/* Media Mirrors Section */}
        <div>
          <h4 className="text-lg font-medium mb-4">Media Mirrors</h4>

          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="enable-media-mirrors"
              checked={hasMirrors}
              onCheckedChange={handleMirrorToggle}
            />
            <Label htmlFor="enable-media-mirrors">Enable media mirrors</Label>
          </div>

          <p className="text-gray-500 text-sm mb-4">
            Mirror your media to multiple servers for better availability and redundancy.
          </p>

          {hasMirrors && (
            <div className="space-y-4">
              {/* Active Mirror Servers */}
              {mirrorServers.map((mirror) => (
                <div key={mirror} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ServerStatusIndicator url={mirror} />
                    <span className="text-sm font-mono">{mirror}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => addBlossomServer(mirror)}
                      variant="outline"
                      size="sm"
                    >
                      Set as media server
                    </Button>
                    <Button
                      onClick={() => removeBlossomServer(mirror)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Mirror Input */}
              <div className="space-y-2">
                <Label className="text-gray-500">Add mirror</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="enter blossom server url..."
                      value={addMirrorInput}
                      onChange={(e) => setAddMirrorInput(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMirrorInput()}
                    />
                    <Button
                      onClick={handleAddMirrorInput}
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Suggested Mirrors */}
              <div className="space-y-2">
                <Label className="text-gray-400">Suggested mirrors</Label>
                {getRecommendedMirrors().map((mirror) => (
                  <div key={mirror} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ServerStatusIndicator url={mirror} />
                      <span className="text-sm font-mono">{mirror}</span>
                    </div>
                    <Button
                      onClick={() => appendBlossomServer(mirror)}
                      variant="outline"
                      size="sm"
                    >
                      Add this media mirror server
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal for Removing Mirrors */}
        {confirmNoMirrors && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-2">Remove Media Mirrors?</h3>
              <p className="text-gray-500 mb-4">
                Are you sure? This will remove your mirror media servers.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setConfirmNoMirrors(false)}
                  variant="outline"
                >
                  No
                </Button>
                <Button
                  onClick={handleConfirmRemoveMirrors}
                  variant="destructive"
                >
                  Yes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
