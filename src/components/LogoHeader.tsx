import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import zapTokLogo from '/images/ZapTok-v3.png';

export function LogoHeader() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const handleLogoClick = () => {
    // Navigate to home page (Following feed) if user is logged in
    if (user) {
      navigate('/');
    }
  };

  return (
    <div className="p-4">
      <div
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={handleLogoClick}
        title={user ? "Go to Following Feed" : ""}
      >
        <img
          src={zapTokLogo}
          alt="ZapTok Logo"
          className="w-8 h-8 rounded-lg group-hover:scale-110 transition-transform duration-200"
        />
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent group-hover:from-orange-300 group-hover:via-pink-400 group-hover:to-purple-500 transition-all duration-200">
          ZapTok
        </h1>
      </div>
    </div>
  );
}
