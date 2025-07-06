import { cn } from '@/lib/utils';

interface ZapTokLogoProps {
  className?: string;
  size?: number;
}

export function ZapTokLogo({ className, size = 32 }: ZapTokLogoProps) {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Lightning bolt icon */}
      <svg
        viewBox="0 0 24 24"
        className="text-white"
        style={{ width: size * 0.6, height: size * 0.6 }}
        fill="currentColor"
      >
        <path d="M13 3L4 14h7v7l9-11h-7V3z" />
      </svg>
    </div>
  );
}
