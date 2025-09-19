import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNip05Verification } from '@/hooks/useNip05Verification';
import { cn } from '@/lib/utils';

interface Nip05BadgeProps {
  identifier?: string;
  pubkey?: string;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component that displays NIP-05 verification status with a badge
 */
export function Nip05Badge({ 
  identifier, 
  pubkey, 
  className,
  showText = true,
  size = 'md'
}: Nip05BadgeProps) {
  const { isValid, isLoading, error } = useNip05Verification(identifier, pubkey);

  if (!identifier) return null;

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  }[size];

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }[size];

  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className={cn(iconSize, 'animate-spin')} />;
    }
    
    if (isValid === true) {
      return <CheckCircle className={cn(iconSize, 'text-green-600')} />;
    }
    
    if (isValid === false) {
      return <XCircle className={cn(iconSize, 'text-red-600')} />;
    }
    
    return <AlertCircle className={cn(iconSize, 'text-gray-400')} />;
  };

  const getBadgeVariant = () => {
    if (isLoading) return 'secondary';
    if (isValid === true) return 'default'; // green
    if (isValid === false) return 'destructive'; // red
    return 'secondary'; // gray
  };

  const getBadgeText = () => {
    if (isLoading) return 'Verifying...';
    if (isValid === true) return identifier;
    if (isValid === false) return 'Unverified';
    return identifier;
  };

  const getTooltipText = () => {
    if (isLoading) return 'Verifying NIP-05 identifier...';
    if (isValid === true) return `Verified: ${identifier}`;
    if (isValid === false) return error || 'NIP-05 verification failed';
    return `NIP-05: ${identifier}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getBadgeVariant()} 
            className={cn(
              'inline-flex items-center gap-1',
              textSize,
              className
            )}
          >
            {renderIcon()}
            {showText && (
              <span className="truncate max-w-32">
                {getBadgeText()}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple verification checkmark component
 */
export function Nip05VerificationMark({ 
  identifier, 
  pubkey, 
  className 
}: Pick<Nip05BadgeProps, 'identifier' | 'pubkey' | 'className'>) {
  const { isValid, isLoading } = useNip05Verification(identifier, pubkey);

  if (!identifier || isValid !== true) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCircle 
            className={cn('h-4 w-4 text-green-600', className)} 
            aria-label="Verified"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Verified: {identifier}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
