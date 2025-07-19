import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, User } from 'lucide-react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useLoginActions } from '@/hooks/useLoginActions';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

interface GetStartedModalProps {
  onClose: () => void;
  onBackToLogin?: () => void;
}

const GetStartedModal = ({ onClose }: GetStartedModalProps) => {
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeypair, setNewKeypair] = useState<{ pubkey: string; nsec: string } | null>(null);
  
  const { mutate: createEvent } = useNostrPublish();
  const login = useLoginActions();

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
      // First, log in with the new keypair
      await login.nsec(newKeypair.nsec);
      
      // Then create the profile metadata event
      createEvent({
        kind: 0,
        content: JSON.stringify({
          name: name.trim() || undefined,
          picture: profileImage || undefined,
        }),
        tags: [],
      });
      
      // Close modal and user is now logged in
      onClose();
    } catch (error) {
      console.error('Failed to create profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!newKeypair) return;
    
    try {
      // Log in with the new keypair
      await login.nsec(newKeypair.nsec);
      
      // Create profile with the generated name
      createEvent({
        kind: 0,
        content: JSON.stringify({
          name: name.trim(),
        }),
        tags: [],
      });
      
      // Close modal and user is now logged in
      onClose();
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50 overflow-y-auto scrollbar-hide">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-orange-900/20" />
      
      <div className="w-full max-w-md my-8 relative z-10">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img 
                src="/images/ZapTok-v2.png" 
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
