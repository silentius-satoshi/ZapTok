import { cn } from '@/lib/utils';
import zapTokLogo from '/images/ZapTok-v3.png';

interface ZapTokLogoProps {
  className?: string;
  size?: number;
}

export function ZapTokLogo({ className, size = 32 }: ZapTokLogoProps) {
  return (
    <img
      src={zapTokLogo}
      alt="ZapTok"
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
