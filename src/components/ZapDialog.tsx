import { useState, Dispatch, SetStateAction } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@/hooks/useNostr';
import { useZap } from '@/contexts/ZapProvider';
import { useToast } from '@/hooks/useToast';
import { Event } from 'nostr-tools';
import lightningService from '@/services/lightning.service';
import noteStatsService from '@/services/note-stats.service';
import UserAvatar from './UserAvatar';
import Username from './Username';

interface ZapDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  pubkey: string;
  event?: Event;
  defaultAmount?: number;
  defaultComment?: string;
}

interface ZapDialogContentProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  recipient: string;
  event?: Event;
  defaultAmount?: number;
  defaultComment?: string;
}

export default function ZapDialog({
  open,
  setOpen,
  pubkey,
  event,
  defaultAmount,
  defaultComment
}: ZapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-white text-center flex items-center justify-center gap-2">
            <div className="shrink-0">Zap to</div>
            <UserAvatar size="small" userId={pubkey} />
            <Username userId={pubkey} className="truncate flex-1 max-w-fit text-start h-5" />
          </DialogTitle>
        </DialogHeader>
        <ZapDialogContent
          open={open}
          setOpen={setOpen}
          recipient={pubkey}
          event={event}
          defaultAmount={defaultAmount}
          defaultComment={defaultComment}
        />
      </DialogContent>
    </Dialog>
  );
}

function ZapDialogContent({
  setOpen,
  recipient,
  event,
  defaultAmount,
  defaultComment
}: ZapDialogContentProps) {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { defaultZapSats, defaultZapComment } = useZap();
  const { toast } = useToast();
  
  const [sats, setSats] = useState(defaultAmount ?? defaultZapSats);
  const [comment, setComment] = useState(defaultComment ?? defaultZapComment);
  const [zapping, setZapping] = useState(false);

  const handleZap = async () => {
    try {
      if (!user) {
        throw new Error('You need to be logged in to zap');
      }
      setZapping(true);
      
      const zapResult = await lightningService.zap(
        user.pubkey,
        event ?? recipient,
        sats,
        comment,
        nostr,
        user,
        () => setOpen(false)
      );
      
      // User canceled
      if (!zapResult) {
        return;
      }
      
      if (event) {
        noteStatsService.addZap(user.pubkey, event.id, zapResult.invoice, sats, comment);
      }
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

  return (
    <>
      {/* Sats input */}
      <div className="flex flex-col items-center">
        <div className="flex justify-center w-full">
          <input
            id="sats"
            value={sats}
            onChange={(e) => {
              setSats((prev) => {
                if (e.target.value === '') {
                  return 0;
                }
                let num = parseInt(e.target.value, 10);
                if (isNaN(num) || num < 0) {
                  num = prev;
                }
                return num;
              });
            }}
            onFocus={(e) => {
              requestAnimationFrame(() => {
                const val = e.target.value;
                e.target.setSelectionRange(val.length, val.length);
              });
            }}
            className="bg-transparent text-center w-full p-0 focus-visible:outline-none text-6xl font-bold text-white"
          />
        </div>
        <Label htmlFor="sats" className="text-gray-300">Sats</Label>
      </div>

      {/* Preset sats buttons */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { display: '21', val: 21 },
          { display: '66', val: 66 },
          { display: '210', val: 210 },
          { display: '666', val: 666 },
          { display: '1k', val: 1000 },
          { display: '2.1k', val: 2100 },
          { display: '6.6k', val: 6666 },
          { display: '10k', val: 10000 },
          { display: '21k', val: 21000 },
          { display: '66k', val: 66666 },
          { display: '100k', val: 100000 },
          { display: '210k', val: 210000 }
        ].map(({ display, val }) => (
          <Button variant="secondary" key={val} onClick={() => setSats(val)}>
            {display}
          </Button>
        ))}
      </div>

      {/* Comment input */}
      <div>
        <Label htmlFor="comment" className="text-gray-300">Comment</Label>
        <Input 
          id="comment" 
          value={comment} 
          onChange={(e) => setComment(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      <Button onClick={handleZap} className="bg-orange-600 hover:bg-orange-700 text-white">
        {zapping && <Loader className="animate-spin" />} 
        Zap {sats} sats
      </Button>
    </>
  );
}