import { useState } from 'react';
import { UserNutzapDialog } from '@/components/UserNutzapDialog';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Loader2
} from 'lucide-react';
import { formatBalance } from '@/lib/cashu';
import { cn } from '@/lib/utils';

interface NutzapButtonProps {
  userPubkey: string;
  eventId?: string;
  amount?: number;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary' | 'destructive';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  showAmount?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function NutzapButton({
  userPubkey,
  eventId,
  amount = 21,
  variant = 'ghost',
  size = 'sm',
  showAmount = false,
  disabled = false,
  className,
  children
}: NutzapButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!userPubkey) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={true}
        className={cn("text-muted-foreground", className)}
      >
        <Zap className="h-4 w-4" />
        {showAmount && (
          <span className="ml-1 text-xs">
            {formatBalance(amount)}
          </span>
        )}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        className={cn(
          "transition-all duration-200",
          isHovered && !disabled && "text-orange-600 dark:text-orange-400",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setDialogOpen(true)}
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap
            className={cn(
              "h-4 w-4 transition-colors",
              isHovered ? "text-orange-500" : ""
            )}
          />
        )}

        {children ? (
          <span className="ml-2">{children}</span>
        ) : showAmount ? (
          <span className="ml-1 text-xs">
            {formatBalance(amount)}
          </span>
        ) : null}
      </Button>

      <UserNutzapDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pubkey={userPubkey}
      />
    </>
  );
}

// Preset variants for common use cases
export function QuickNutzapButton({
  userPubkey,
  eventId,
  className
}: {
  userPubkey: string;
  eventId?: string;
  className?: string;
}) {
  return (
    <NutzapButton
      userPubkey={userPubkey}
      eventId={eventId}
      amount={21}
      variant="ghost"
      size="sm"
      showAmount={true}
      className={className}
    />
  );
}

export function IconNutzapButton({
  userPubkey,
  eventId,
  className
}: {
  userPubkey: string;
  eventId?: string;
  className?: string;
}) {
  return (
    <NutzapButton
      userPubkey={userPubkey}
      eventId={eventId}
      variant="ghost"
      size="icon"
      className={className}
    />
  );
}

export function PrimaryNutzapButton({
  userPubkey,
  eventId,
  amount = 100,
  className
}: {
  userPubkey: string;
  eventId?: string;
  amount?: number;
  className?: string;
}) {
  return (
    <NutzapButton
      userPubkey={userPubkey}
      eventId={eventId}
      amount={amount}
      variant="default"
      size="default"
      showAmount={true}
      className={className}
    >
      Nutzap
    </NutzapButton>
  );
}