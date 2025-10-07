import zapTokLogo from '/images/ZapTok-v3.png';

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
          <a
            href="https://github.com/silentius-satoshi/ZapTok/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 text-xs transition-colors"
          >
            v{__APP_VERSION__} ({__GIT_COMMIT__})
          </a>
        </div>
      </div>
    </div>
  );
}
