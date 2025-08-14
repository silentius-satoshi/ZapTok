import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ArrowRight, Camera, User, Check } from 'lucide-react';
import { useNostrToolsOnboarding } from '@/hooks/useNostrToolsOnboarding';
import { FOLLOW_PACKS, getFollowPacksByCategory, getAllFollowPackCategories } from '@/lib/followPacks';
import { useLoginActions } from '@/hooks/useLoginActions';
import { generateSecretKey, getPublicKey } from '@nostr/tools/pure';
import * as nip19 from '@nostr/tools/nip19';
import { bytesToHex } from '@noble/hashes/utils';

interface CreateAccountProps {
  onClose: () => void;
  onBack?: () => void;
}

type Step = 'name' | 'info' | 'follow';

interface SuggestedUserData {
  users: Record<string, any>;
  groupNames: string[];
  groups: Record<string, string[]>;
}

const CreateAccount = ({ onClose, onBack }: CreateAccountProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [isLoading, setIsLoading] = useState(false);
  const [newKeypair, setNewKeypair] = useState<{ pubkey: string; nsec: string; skHex: string } | null>(null);

  // Step 1: Name & basic info
  const [accountName, setAccountName] = useState('');
  const [isNameValid, setIsNameValid] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Step 2: Extended profile info
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [nip05, setNip05] = useState('');

  // Step 3: Follow suggestions
  const [followedPubkeys, setFollowedPubkeys] = useState<string[]>([]);
  const [suggestedData, setSuggestedData] = useState<SuggestedUserData>({
    users: {},
    groupNames: [],
    groups: {},
  });

  const onboardWithNostrTools = useNostrToolsOnboarding();
  const login = useLoginActions();

  // Generate a fresh keypair when component mounts
  useEffect(() => {
    const secretKey = generateSecretKey();
    const pubkey = getPublicKey(secretKey);
    const nsec = nip19.nsecEncode(secretKey);
    const skHex = bytesToHex(secretKey);

    setNewKeypair({ pubkey, nsec, skHex });
  }, []);

  // Generate random name when component mounts
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

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    setAccountName(`${randomAdjective} ${randomAnimal}`);
  }, []);

  // Load suggested follows (using our static packs as Primal uses dynamic fetching)
  useEffect(() => {
    const groups: Record<string, string[]> = {};
    const users: Record<string, any> = {};
    const categories = getAllFollowPackCategories();

    categories.forEach(category => {
      const packs = getFollowPacksByCategory(category);
      const categoryPubkeys: string[] = [];

      packs.forEach(pack => {
        pack.accounts.forEach(account => {
          categoryPubkeys.push(account.pubkey);
          users[account.pubkey] = {
            pubkey: account.pubkey,
            name: account.name,
            nip05: account.nip05,
            about: account.about,
          };
        });
      });

      groups[category.toUpperCase()] = categoryPubkeys;
    });

    setSuggestedData({
      users,
      groupNames: Object.keys(groups),
      groups,
    });
  }, []);

  // Validation
  const usernameRegex = /^[a-zA-Z0-9_]{1,50}$/;
  useEffect(() => {
    setIsNameValid(usernameRegex.test(accountName.replace(/\s/g, '')));
  }, [accountName]);

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

  const toNext = () => {
    switch(currentStep) {
      case 'name':
        setCurrentStep('info');
        break;
      case 'info':
        setCurrentStep('follow');
        break;
      default:
        break;
    }
  };

  const toPrevious = () => {
    switch(currentStep) {
      case 'info':
        setCurrentStep('name');
        break;
      case 'follow':
        setCurrentStep('info');
        break;
      default:
        break;
    }
  };

  // Follow pack management
  const isFollowingAllInGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];
    return pubkeys.length > 0 && pubkeys.every(p => followedPubkeys.includes(p));
  };

  const toggleFollowGroup = (group: string) => {
    if (isFollowingAllInGroup(group)) {
      onUnfollowGroup(group);
    } else {
      onFollowGroup(group);
    }
  };

  const onFollowGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];
    const newFollows = pubkeys.filter(p => !followedPubkeys.includes(p));
    setFollowedPubkeys(prev => [...prev, ...newFollows]);
  };

  const onUnfollowGroup = (group: string) => {
    const pubkeys = suggestedData.groups[group] || [];
    setFollowedPubkeys(prev => prev.filter(p => !pubkeys.includes(p)));
  };

  const toggleFollowAccount = (pubkey: string) => {
    if (followedPubkeys.includes(pubkey)) {
      setFollowedPubkeys(prev => prev.filter(p => p !== pubkey));
    } else {
      setFollowedPubkeys(prev => [...prev, pubkey]);
    }
  };

  const handleSubmit = async () => {
    if (!newKeypair) return;

    setIsLoading(true);
    try {
      const displayName = accountName.trim() || 'ZapTok User';

      // Use the new nostr-tools onboarding
      const result = await onboardWithNostrTools({
        displayName,
        about: about.trim() || `New to Nostr via ZapTok! 🚀`,
        pictureUrl: profileImage || undefined,
        initialFollowHexes: followedPubkeys.length > 0 ? followedPubkeys : undefined,
      });

      console.log('[CreateAccount] ✅ NostrTools onboarding completed:', {
        pubkey: result.publicKey,
        npub: result.npub,
        success: result.success
      });

      // Only after successful onboarding, add the login
      await login.nsec(newKeypair.nsec);

      console.log('[CreateAccount] ✅ User logged in successfully');

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

  const renderStepIndicator = () => (
    <div className="flex justify-center items-center space-x-2 mb-6">
      {['name', 'info', 'follow'].map((step, index) => (
        <div
          key={step}
          className={`w-2 h-2 rounded-full ${
            currentStep === step ? 'bg-orange-400' : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );

  const renderNameStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Create your identity</h2>
        <p className="text-gray-400 text-sm">Choose a name and photo for your profile</p>
      </div>

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
      </div>

      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="display-name" className="text-gray-200">
          Display Name *
        </Label>
        <Input
          id="display-name"
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="Enter your display name"
          className="bg-gray-800 border-gray-600 text-white"
        />
        {!isNameValid && accountName.trim() && (
          <p className="text-red-400 text-xs">Name must contain only letters, numbers, and underscores</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={toNext}
          disabled={!isNameValid || !accountName.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Additional info</h2>
        <p className="text-gray-400 text-sm">Tell others more about yourself (optional)</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="about" className="text-gray-200">Bio</Label>
          <textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Tell people a bit about yourself..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website" className="text-gray-200">Website</Label>
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nip05" className="text-gray-200">
            NIP-05 Identifier
            <span className="text-xs text-gray-400 ml-1">(auto-generated if empty)</span>
          </Label>
          <Input
            id="nip05"
            type="text"
            value={nip05}
            onChange={(e) => setNip05(e.target.value)}
            placeholder={`${accountName.toLowerCase().replace(/\s+/g, '')}@zaptok.app`}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={toPrevious}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={toNext}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderFollowStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Follow some accounts</h2>
        <p className="text-gray-400 text-sm">We found some Nostr accounts for you to follow:</p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-4">
        {suggestedData.groupNames.map(groupName => (
          <div key={groupName} className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm font-medium text-gray-200 uppercase tracking-wide">
                {groupName}
              </span>
              <Button
                variant={isFollowingAllInGroup(groupName) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFollowGroup(groupName)}
                className={
                  isFollowingAllInGroup(groupName)
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }
              >
                {isFollowingAllInGroup(groupName) ? 'Unfollow all' : 'Follow all'}
              </Button>
            </div>

            <div className="space-y-2">
              {suggestedData.groups[groupName]?.map(pubkey => {
                const user = suggestedData.users[pubkey];
                if (!user) return null;

                const isFollowing = followedPubkeys.includes(pubkey);

                return (
                  <div key={pubkey} className="flex justify-between items-center p-3 border-b border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gray-700 text-gray-300 text-sm">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-200 truncate">
                          {user.name || 'Unknown'}
                        </div>
                        {user.nip05 && (
                          <div className="text-xs text-gray-400 truncate">
                            {user.nip05}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={isFollowing ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFollowAccount(pubkey)}
                      className={
                        isFollowing
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "border-gray-600 text-gray-300 hover:bg-gray-700"
                      }
                    >
                      {isFollowing ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Following
                        </>
                      ) : (
                        'Follow'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {followedPubkeys.length > 0 && (
        <div className="text-center text-sm text-gray-400">
          Following {followedPubkeys.length} account{followedPubkeys.length !== 1 ? 's' : ''}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={toPrevious}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          {isLoading ? "Creating Account..." : "Finish"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto scrollbar-hide" style={{ zIndex: 99999, backgroundColor: 'black' }}>
      <div className="w-full max-w-lg my-8">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src="/images/ZapTok-v3.png"
                alt="ZapTok Logo"
                className="w-8 h-8 rounded-lg"
              />
              <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                Create Account
              </CardTitle>
            </div>
            {renderStepIndicator()}
          </CardHeader>

          <CardContent>
            {currentStep === 'name' && renderNameStep()}
            {currentStep === 'info' && renderInfoStep()}
            {currentStep === 'follow' && renderFollowStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAccount;
