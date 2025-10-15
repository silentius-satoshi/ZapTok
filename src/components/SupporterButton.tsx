import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function SupporterButton() {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate('/donate')}
      variant="outline"
      className="hidden md:flex items-center gap-2 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-colors"
    >
      <Heart className="h-4 w-4 text-red-500" />
      Become a Supporter
    </Button>
  );
}
