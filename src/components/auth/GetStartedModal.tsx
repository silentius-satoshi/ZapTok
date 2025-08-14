import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, User } from 'lucide-react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useOnboardNewAccount } from '@/hooks/useOnboardNewAccount';
import { FOLLOW_PACKS, getFollowPackById } from '@/lib/followPacks';
import { useLoginActions } from '@/hooks/useLoginActions';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { NLogin, NUser } from '@nostrify/react/login';

interface GetStartedModalProps {
  onClose: () => void;
  onBackToLogin?: () => void;
}

const GetStartedModal = ({ onClose }: GetStartedModalProps) => {
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFollowPackId, setSelectedFollowPackId] = useState<string | null>(null);
  const [newKeypair, setNewKeypair] = useState<{ pubkey: string; nsec: string } | null>(null);

  const { mutate: createEvent } = useNostrPublish();
  const onboardNewAccount = useOnboardNewAccount();
  const login = useLoginActions();
  const { nostr } = useNostr();

  // Generate a fresh keypair when the modal opens
  useEffect(() => {
    const secretKey = generateSecretKey();
    const pubkey = getPublicKey(secretKey);
    const nsec = nip19.nsecEncode(secretKey);

    setNewKeypair({ pubkey, nsec });
  }, []);

  // Generate random name when modal opens
  useEffect(() => {
    const adjectives = [
      'Amazing', 'Brave', 'Creative', 'Daring', 'Energetic', 'Fearless', 'Graceful', 'Happy',
      'Intelligent', 'Joyful', 'Kind', 'Lively', 'Magnificent', 'Noble', 'Optimistic', 'Peaceful',
      'Quick', 'Radiant', 'Strong', 'Talented', 'Unique', 'Vibrant', 'Wise', 'Zealous'
    ];

    const animals = [
      'Elephant', 'Tiger', 'Dolphin', 'Eagle', 'Lion', 'Butterfly', 'Wolf', 'Fox',
      'Bear', 'Owl', 'Shark', 'Penguin', 'Giraffe', 'Octopus', 'Leopard', 'Whale',
      'Falcon', 'Panda', 'Cheetah', 'Turtle', 'Rabbit', 'Hawk', 'Deer', 'Panther'
    ];

    const generateRandomName = () => {
      const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
      return `${randomAdjective} ${randomAnimal}`;
    };

    setName(generateRandomName());
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!newKeypair) return;

    setIsLoading(true);
    try {
      // Create the new user instance
      const newLogin = NLogin.fromNsec(newKeypair.nsec);
      const newUser = NUser.fromNsecLogin(newLogin);

      // Use enhanced onboarding sequence for better visibility
      const selectedPack = getFollowPackById(selectedFollowPackId);
      const initialFollows = selectedPack ? selectedPack.accounts.map(a => a.pubkey) : undefined;
      const result = await onboardNewAccount({
        newUser,
        displayName: name.trim() || 'ZapTok User',
        about: undefined, // User didn't provide about text in this flow
        pictureUrl: profileImage || undefined,
        initialFollowHexes: initialFollows,
        recommendedRelays: [
          'wss://relay.damus.io',
          'wss://relay.nostr.band',
          'wss://relay.primal.net',
          'wss://ditto.pub/relay',
          'wss://relay.chorus.community'
        ]
      });

      // Only after successful onboarding sequence, add the login
      await login.nsec(newKeypair.nsec);

      console.log('Enhanced onboarding completed for new account:', {
        pubkey: newUser.pubkey,
        profileEventId: result.profileEventId,
        contactListEventId: result.contactListEventId,
        noteEventId: result.noteEventId,
        verification: result.recommendedVerification
      });

      // Close modal and user is now logged in with proper visibility
      onClose();
    } catch (error) {
      console.error('Failed to complete enhanced onboarding:', error);
      // Fallback: still allow login even if onboarding partially failed
      if (newKeypair) {
        await login.nsec(newKeypair.nsec);
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!newKeypair) return;

    try {
      // Create the new user instance
      const newLogin = NLogin.fromNsec(newKeypair.nsec);
      const newUser = NUser.fromNsecLogin(newLogin);

      // Use enhanced onboarding sequence even for "skip" to ensure visibility
      const selectedPack = getFollowPackById(selectedFollowPackId);
      const initialFollows = selectedPack ? selectedPack.accounts.map(a => a.pubkey) : undefined;
      const result = await onboardNewAccount({
        newUser,
        displayName: name.trim(), // Use the auto-generated name
        about: 'New to Nostr via ZapTok! 🚀',
        pictureUrl: undefined, // No picture selected
        initialFollowHexes: initialFollows, // Include pack even on skip for visibility
        recommendedRelays: [
          'wss://relay.damus.io',
          'wss://relay.nostr.band',
          'wss://relay.primal.net',
          'wss://ditto.pub/relay',
          'wss://relay.chorus.community'
        ]
      });

      // Only after successful onboarding sequence, add the login
      await login.nsec(newKeypair.nsec);

      console.log('Enhanced onboarding (skip flow) completed for new account:', {
        pubkey: newUser.pubkey,
        profileEventId: result.profileEventId,
        contactListEventId: result.contactListEventId,
        noteEventId: result.noteEventId,
        verification: result.recommendedVerification
      });

      // Close modal and user is now logged in with proper visibility
      onClose();
    } catch (error) {
      console.error('Failed to complete enhanced onboarding (skip flow):', error);
      // Fallback: still allow login even if onboarding partially failed
      if (newKeypair) {
        await login.nsec(newKeypair.nsec);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto scrollbar-hide" style={{ zIndex: 99999, backgroundColor: 'black' }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'black', zIndex: -1 }} />

      <div className="w-full max-w-md my-8 relative z-10">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src="/images/ZapTok-v3.png"
                alt="ZapTok Logo"
                className="w-8 h-8 rounded-lg"
              />
              <CardTitle className="text-3xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                Get Started
              </CardTitle>
            </div>
            <CardDescription className="text-gray-300">
              Set up your nostr profile to start earning sats
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback className="bg-gray-700 text-gray-300">
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-orange-500 hover:bg-orange-600 rounded-full p-2 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-400">Upload a profile picture</p>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-gray-200">
                Display Name
              </Label>
              <Input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
                className="bg-gray-800 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400">This is the name that will be displayed to others</p>
            </div>

            {/* Follow Pack Selection */}
            <div className="space-y-2">
              <Label className="text-gray-200">Starter Follow Pack (optional)</Label>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                {FOLLOW_PACKS.map(pack => {
                  const selected = selectedFollowPackId === pack.id;
                  return (
                    <button
                      type="button"
                      key={pack.id}
                      onClick={() => setSelectedFollowPackId(selected ? null : pack.id)}
                      className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${selected ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-200">{pack.title}</span>
                        {selected && <span className="text-xs text-orange-400">Selected</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{pack.description}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{pack.accounts.length} accounts</p>
                    </button>
                  );
                })}
              </div>
              {selectedFollowPackId && (
                <p className="text-xs text-orange-400">{getFollowPackById(selectedFollowPackId)?.accounts.length} initial follows will be added</p>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isLoading || !name.trim() || !newKeypair}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {isLoading ? "Creating Profile..." : "Save"}
            </Button>

            {/* Skip Link */}
            <div className="text-center">
              <button
                onClick={handleSkip}
                disabled={!newKeypair}
                className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                Skip for now
              </button>
            </div>

            {/* OR Text */}
            <div className="text-center">
              <span className="text-gray-500 text-sm">OR</span>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <button
                onClick={onClose}
                className="flex items-center justify-center space-x-2 text-gray-400 hover:text-gray-300 text-sm transition-colors mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to login</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GetStartedModal;
