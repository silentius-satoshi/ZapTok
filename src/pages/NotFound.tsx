import { useSeoMeta } from "@unhead/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { ZapTokLogo } from '@/components/ZapTokLogo';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useSeoMeta({
    title: "Page Not Found - ZapTok",
    description: "The page you are looking for does not exist.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <ZapTokLogo size={64} className="mx-auto" />
        <div className="text-8xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-gray-400 max-w-md">
          The page you're looking for doesn't exist. Let's get you back to the video feed.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 hover:from-orange-500 hover:via-pink-600 hover:to-purple-700 text-white"
        >
          Back to ZapTok
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
