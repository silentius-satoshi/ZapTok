import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MobileSupporterButtonProps {
  onClose?: () => void;
}

export function MobileSupporterButton({ onClose }: MobileSupporterButtonProps) {
  const navigate = useNavigate();

  const handleNavigateToSupporter = () => {
    navigate('/donate');
    // Close the mobile menu when navigating
    if (onClose) {
      onClose();
    }
  };

  return (
    <Button
      onClick={handleNavigateToSupporter}
      variant="ghost"
      className="w-full justify-start gap-3 p-3 h-auto rounded-xl transition-all hover:bg-gray-800/30 text-gray-300 hover:text-white"
    >
      <Heart className="h-5 w-5 text-red-500" />
      <span className="font-medium">Become a Supporter</span>
    </Button>
  );
}
