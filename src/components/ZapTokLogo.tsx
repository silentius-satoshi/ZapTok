import { cn } from '@/lib/utils';

interface ZapTokLogoProps {
  className?: string;
  size?: number;
}

export function ZapTokLogo({ className, size = 32 }: ZapTokLogoProps) {
  return (
    <img
      src="/images/ZapTok-v2.png"
      alt="ZapTok"
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
