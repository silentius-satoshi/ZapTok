import zapTokLogo from '/images/ZapTok-v3.png';
import { Button } from '@/components/ui/button';

export function LogoHeader() {
  return (
    <div className="p-4">
      <div className="flex items-center space-x-3">
        <img
          src={zapTokLogo}
          alt="ZapTok Logo"
          className="w-8 h-8 rounded-lg"
        />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            ZapTok
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 px-2 text-white hover:text-gray-300 text-xs bg-gray-800/30 hover:bg-gray-800/50 transition-colors w-fit"
            asChild
          >
            <a
              href="https://github.com/silentius-satoshi/ZapTok/tree/main"
              target="_blank"
              rel="noopener noreferrer"
            >
              v{__APP_VERSION__} ({__GIT_COMMIT__})
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
