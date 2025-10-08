import { useState, useEffect, useMemo, useRef, MouseEvent, TouchEvent } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostr } from '@/hooks/useNostr';
import { useZap } from '@/contexts/ZapProvider';
import { useNoteStatsById } from '@/hooks/useNoteStatsById';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Zap, Loader } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress } from '@/lib/lightning';
import { Event } from 'nostr-tools';
import lightningService from '@/services/lightning.service';
import noteStatsService from '@/services/note-stats.service';
import ZapDialog from './ZapDialog';

interface ZapButtonProps {
  recipientPubkey: string;
  eventId?: string;
  event?: Event;
  className?: string;
  iconStyle?: { width: string; height: string };
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

function formatAmount(amount: number): string {
  if (amount < 1000) return amount.toString();
  if (amount < 1000000) return `${Math.round(amount / 100) / 10}k`;
  return `${Math.round(amount / 100000) / 10}M`;
}

export function ZapButton({
  recipientPubkey,
  eventId,
  event,
  className,
  iconStyle = { width: '16px', height: '16px' },
  variant = "ghost",
  size = "sm"
}: ZapButtonProps) {
  const { user, canSign } = useCurrentUser();
  const { withLoginCheck } = useLoginPrompt();
  const { nostr } = useNostr();
  const { data: authorData } = useAuthor(recipientPubkey);
  const { toast } = useToast();
  const { defaultZapSats, defaultZapComment, quickZap } = useZap();
  const { getBalance } = useWallet();

  // Use eventId if provided, otherwise fall back to event.id
  const noteId = eventId || event?.id;
  const noteStats = noteId ? noteStatsService.getNoteStatsById(noteId) : null;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [openZapDialog, setOpenZapDialog] = useState(false);
  const [zapping, setZapping] = useState(false);
  const [disable, setDisable] = useState(true);

  const { zapAmount, hasZapped } = useMemo(() => {
    const totalZaps = noteStats?.zaps?.reduce((acc, zap) => acc + zap.amount, 0) || 0;
    const userHasZapped = user ? noteStats?.zaps?.some((zap) => zap.pubkey === user.pubkey) : false;
    return {
      zapAmount: totalZaps,
      hasZapped: userHasZapped
    };
  }, [noteStats, user?.pubkey]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  // Check if recipient has Lightning address
  useEffect(() => {
    const checkLightningAddress = async () => {
      if (!authorData?.metadata) return;
      if (user?.pubkey === recipientPubkey) return;

      const lightningAddress = getLightningAddress(authorData.metadata);
      if (lightningAddress) {
        setDisable(false);
      }
    };

    checkLightningAddress();
  }, [recipientPubkey, authorData, user?.pubkey]);

  const handleZap = async () => {
    await withLoginCheck(async () => {
      try {
        setZapping(true);

        // Create the proper recipient for the zap call
        const zapTarget = event || recipientPubkey;

        await lightningService.zap(
          user!.pubkey,
          zapTarget,
          defaultZapSats,
          defaultZapComment,
          nostr,
          user!
        );

        // Refresh wallet balance after successful zap
        try {
          await getBalance();
        } catch (balanceError) {
          // Log but don't show error - zap was successful
          console.warn('Failed to refresh balance after zap:', balanceError);
        }

        // Update local stats immediately for instant feedback
        if (noteId) {
          noteStatsService.addZap(
            user!.pubkey,
            noteId,
            `temp-${Date.now()}`, // Temporary PR until we get the real one
            defaultZapSats,
            defaultZapComment
          );
        }

        toast({
          title: "Zap Sent!",
          description: `Sent ${defaultZapSats} sats`,
          variant: "default",
        });
      } catch (error) {
        toast({
          title: "Zap Failed",
          description: `${(error as Error).message}`,
          variant: "destructive",
        });
      } finally {
        setZapping(false);
      }
    }, {
      loginMessage: 'Login required to send zaps',
      onLoginRequired: () => {
        toast({
          title: "Login Required",
          description: "Please sign in to send Bitcoin zaps to creators",
          variant: "default",
        });
      }
    });
  };

  const handleDialogZap = async (amount: number, comment?: string) => {
    try {
      if (!user) {
        throw new Error('You need to be logged in to zap');
      }
      setZapping(true);

      // Create the proper recipient for the zap call
      const zapTarget = event || recipientPubkey;

      await lightningService.zap(user.pubkey, zapTarget, amount, comment || '', nostr, user);

      // Refresh wallet balance after successful zap
      try {
        await getBalance();
      } catch (balanceError) {
        // Log but don't show error - zap was successful
        console.warn('Failed to refresh balance after zap:', balanceError);
      }

      // Update local stats immediately for instant feedback
      if (noteId) {
        noteStatsService.addZap(
          user.pubkey,
          noteId,
          `temp-${Date.now()}`, // Temporary PR until we get the real one
          amount,
          comment
        );
      }

      setOpenZapDialog(false);
      toast({
        title: "Zap Sent!",
        description: `Sent ${amount} sats`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Zap Failed",
        description: `${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setZapping(false);
    }
  };

  const handleClickStart = (e: MouseEvent | TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disable) return;

    isLongPressRef.current = false;

    if ('touches' in e) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }

    if (quickZap) {
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (!user) {
          toast({
            title: "Login Required",
            description: "Please log in to send zaps",
            variant: "destructive",
          });
          return;
        }
        setOpenZapDialog(true);
      }, 500);
    }
  };

  const handleClickEnd = (e: MouseEvent | TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (disable) return;

    if ('touches' in e) {
      setTouchStart(null);
      if (!touchStart) return;
      const touch = e.changedTouches[0];
      const diffX = Math.abs(touch.clientX - touchStart.x);
      const diffY = Math.abs(touch.clientY - touchStart.y);
      if (diffX > 10 || diffY > 10) return;
    }

    if (!quickZap) {
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to send zaps",
          variant: "destructive",
        });
        return;
      }
      setOpenZapDialog(true);
    } else if (!isLongPressRef.current) {
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to send zaps",
          variant: "destructive",
        });
        return;
      }
      handleZap();
    }
    isLongPressRef.current = false;
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // Check if Lightning address is available
  const lightningAddress = getLightningAddress(authorData?.metadata);

  // Create tooltip message
  const getTooltipMessage = () => {
    if (!lightningAddress) return 'User has no Lightning address';
    if (!user) return 'Login to zap';
    return 'Zap';
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`group rounded-full bg-transparent hover:bg-white/10 text-white disabled:opacity-50 transition-all duration-200 ${className} ${
          disable
            ? 'cursor-not-allowed opacity-40'
            : 'cursor-pointer'
        }`}
        title={getTooltipMessage()}
        disabled={disable || zapping}
        onMouseDown={handleClickStart}
        onMouseUp={handleClickEnd}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleClickStart}
        onTouchEnd={handleClickEnd}
      >
        {zapping ? (
          <Loader
            className="animate-spin text-yellow-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
            style={iconStyle}
          />
        ) : (
          <Zap
            className={`transition-all duration-200 ${
              hasZapped
                ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] scale-110'
                : 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:scale-110'
            }`}
            style={iconStyle}
          />
        )}
      </Button>

      <ZapDialog
        open={openZapDialog}
        setOpen={(open) => {
          setOpenZapDialog(open);
          if (!open) setZapping(false);
        }}
        pubkey={recipientPubkey}
        event={event}
        quickZap={quickZap}
      />
    </>
  );
}
