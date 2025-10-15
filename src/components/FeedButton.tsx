import { useState, useMemo, forwardRef, type HTMLAttributes } from 'react'
import { ChevronDown, Server, UsersRound, BookmarkIcon } from 'lucide-react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useFeed } from '@/providers/FeedProvider'
import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import FeedSwitcher from './FeedSwitcher'

// Simple URL simplification utility
function simplifyUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default function FeedButton({ className }: { className?: string }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (isMobile) {
    return (
      <>
        <FeedSwitcherTrigger className={className} onClick={() => setOpen(true)} />
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[80vh]">
            <div
              className="overflow-y-auto overscroll-contain py-2 px-4"
              style={{ touchAction: 'pan-y' }}
            >
              <FeedSwitcher close={() => setOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FeedSwitcherTrigger className={className} />
      </PopoverTrigger>
      <PopoverContent
        sideOffset={0}
        side="bottom"
        className="w-96 p-4 max-h-[80vh] overflow-auto scrollbar-hide"
      >
        <FeedSwitcher close={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

const FeedSwitcherTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { feedInfo, relayUrls } = useFeed()
    const { relaySets } = useFavoriteRelays()
    
    const activeRelaySet = useMemo(() => {
      return feedInfo.feedType === 'relays' && feedInfo.id
        ? relaySets.find((set) => set.id === feedInfo.id)
        : undefined
    }, [feedInfo, relaySets])
    
    const title = useMemo(() => {
      if (feedInfo.feedType === 'following') {
        return 'Following'
      }
      if (feedInfo.feedType === 'bookmarks') {
        return 'Bookmarks'
      }
      if (relayUrls.length === 0) {
        return 'Choose a relay'
      }
      if (feedInfo.feedType === 'relay') {
        return simplifyUrl(feedInfo.id ?? '')
      }
      if (feedInfo.feedType === 'relays') {
        return activeRelaySet?.name ?? activeRelaySet?.id
      }
    }, [feedInfo, activeRelaySet, relayUrls.length])

    return (
      <div
        className={cn('flex items-center gap-2 clickable px-3 h-full rounded-lg', className)}
        ref={ref}
        {...props}
      >
        {feedInfo.feedType === 'following' ? (
          <UsersRound />
        ) : feedInfo.feedType === 'bookmarks' ? (
          <BookmarkIcon />
        ) : (
          <Server />
        )}
        <div className="text-lg font-semibold truncate">{title}</div>
        <ChevronDown />
      </div>
    )
  }
)

FeedSwitcherTrigger.displayName = 'FeedSwitcherTrigger'