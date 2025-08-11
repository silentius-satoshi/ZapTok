import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { genUserName } from '@/lib/genUserName';
import { EditProfileForm } from '@/components/EditProfileForm';
import { FollowingListModal } from '@/components/FollowingListModal';
import { QRModal } from '@/components/QRModal';
import { User, Edit, LogOut, Users, QrCode, Zap } from 'lucide-react';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';
import { QuickZap } from '@/components/QuickZap';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional pubkey to show a specific user's profile. If not provided, shows current user's profile */
  pubkey?: string;
}

export function ProfileModal({ isOpen, onClose, pubkey }: ProfileModalProps) {
  const { user } = useCurrentUser();
  const targetPubkey = pubkey || user?.pubkey || '';
  const isCurrentUser = !pubkey || pubkey === user?.pubkey;
  const author = useAuthor(targetPubkey);
  const following = useFollowing(targetPubkey);
  const metadata = author.data?.metadata;
  const login = useLoginActions();
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQuickZap, setShowQuickZap] = useState(false);

  if (!targetPubkey) return null;

  const displayName = metadata?.display_name || metadata?.name || genUserName(targetPubkey);
  const userName = metadata?.name || genUserName(targetPubkey);
  const bio = metadata?.about;
  const profileImage = metadata?.picture;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;

  const handleLogout = () => {
    login.logout();
    onClose();
  };

  const handleEditProfile = () => {
    setShowEditForm(true);
  };

  const handleCloseEdit = () => {
    setShowEditForm(false);
  };

  const handleFollowingClick = () => {
    setShowFollowingModal(true);
  };

  const handleQRClick = () => {
    setShowQRModal(true);
  };

  const handleZapClick = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send zaps",
        variant: "destructive",
      });
      return;
    }

    const lightningAddress = getLightningAddress(metadata);
    if (!lightningAddress) {
      toast({
        title: "Zap Not Available",
        description: "This user hasn't set up Lightning payments in their profile. They need to add a Lightning address (lud16) or LNURL (lud06) to their Nostr profile.",
        variant: "destructive",
      });
      return;
    }

    // Check if WebLN is available
    if (!window.webln) {
      toast({
        title: "WebLN Not Available",
        description: "Please install the Alby browser extension to send Lightning payments",
        variant: "destructive",
      });
      return;
    }

    // Open QuickZap modal instead of CustomZap
    setShowQuickZap(true);
  };

  if (showEditForm && isCurrentUser) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="w-5 h-5" />
              <span>Edit Profile</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <EditProfileForm />
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={handleCloseEdit}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profileImage} alt={displayName} />
                <AvatarFallback className="text-lg">
                  {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">{displayName}</h2>
                {userName !== displayName && (
                  <p className="text-muted-foreground">@{userName}</p>
                )}
                {nip05 && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ {nip05}
                  </Badge>
                )}
              </div>

              {/* Following Count Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFollowingClick}
                className="flex items-center space-x-2"
                disabled={following.isLoading || !following.data?.count}
              >
                <Users className="w-4 h-4" />
                <span>
                  {following.isLoading ? 'Loading...' : `${following.data?.count || 0} Following`}
                </span>
              </Button>
            </div>

            {/* Bio */}
            {bio && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Website */}
            {website && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Website</h3>
                <a 
                  href={website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {website}
                </a>
              </div>
            )}

            {/* Public Key */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Public Key</h3>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {targetPubkey}
              </code>
            </div>

            <Separator />

            {/* QR Code Button - Show for all users */}
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={handleQRClick}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Codes
              </Button>
            </div>

            {/* Zap Button - Only show for other users */}
            {!isCurrentUser && (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleZapClick}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Send Zap
                </Button>
              </div>
            )}

            {/* Action Buttons - Only show for current user */}
            {isCurrentUser && (
              <div className="space-y-2">
                <Separator />
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={handleEditProfile}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following List Modal */}
      <FollowingListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        pubkeys={following.data?.pubkeys || []}
      />

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        pubkey={targetPubkey}
        metadata={metadata}
        displayName={displayName}
      />

      {/* Quick Zap Modal */}
      <QuickZap
        isOpen={showQuickZap}
        onClose={() => setShowQuickZap(false)}
        recipientPubkey={targetPubkey}
      />
    </>
  );
}
