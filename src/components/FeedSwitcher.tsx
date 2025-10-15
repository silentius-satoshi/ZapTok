import { useMemo } from 'react'
import { Server, UsersRound, BookmarkIcon, FolderClosed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFeed } from '@/providers/FeedProvider'
import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import RelayIcon from '@/components/RelayIcon'
import RelaySetCard from '@/components/RelaySetCard'

// Simple URL simplification utility
function simplifyUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default function FeedSwitcher({ close }: { close?: () => void }) {
  const { user } = useCurrentUser()
  const { relaySets, favoriteRelays } = useFavoriteRelays()
  const { feedInfo, switchFeed } = useFeed()
  const navigate = useNavigate()

  const handleEditClick = () => {
    navigate('/settings?section=network')
    close?.()
  }

  return (
    <div className="space-y-2">
      {user && (
        <FeedSwitcherItem
          isActive={feedInfo.feedType === 'following'}
          onClick={() => {
            if (!user.pubkey) return
            switchFeed('following', { pubkey: user.pubkey })
            close?.()
          }}
        >
          <div className="flex gap-2 items-center">
            <div className="flex justify-center items-center w-6 h-6 shrink-0">
              <UsersRound className="size-4" />
            </div>
            <div>Following</div>
          </div>
        </FeedSwitcherItem>
      )}

      {user && (
        <FeedSwitcherItem
          isActive={feedInfo.feedType === 'bookmarks'}
          onClick={() => {
            if (!user.pubkey) return
            switchFeed('bookmarks', { pubkey: user.pubkey })
            close?.()
          }}
        >
          <div className="flex gap-2 items-center">
            <div className="flex justify-center items-center w-6 h-6 shrink-0">
              <BookmarkIcon className="size-4" />
            </div>
            <div>Bookmarks</div>
          </div>
        </FeedSwitcherItem>
      )}

      <div className="flex justify-end items-center text-sm">
        <span 
          className="text-primary font-semibold cursor-pointer hover:text-primary/80 transition-colors"
          onClick={handleEditClick}
        >
          edit
        </span>
      </div>

      {relaySets
        .filter((set) => set.relayUrls.length > 0)
        .map((set) => (
          <RelaySetCard
            key={set.id}
            relaySet={set}
            select={feedInfo.feedType === 'relays' && set.id === feedInfo.id}
            onSelectChange={(select) => {
              if (!select) return
              switchFeed('relays', { activeRelaySetId: set.id })
              close?.()
            }}
          />
        ))}
      
      {favoriteRelays.map((relay) => (
        <FeedSwitcherItem
          key={relay}
          isActive={feedInfo.feedType === 'relay' && feedInfo.id === relay}
          onClick={() => {
            switchFeed('relay', { relay })
            close?.()
          }}
        >
          <div className="flex gap-2 items-center w-full">
            <RelayIcon url={relay} />
            <div className="flex-1 w-0 truncate">{simplifyUrl(relay)}</div>
          </div>
        </FeedSwitcherItem>
      ))}
    </div>
  )
}

function FeedSwitcherItem({
  children,
  isActive,
  onClick,
  controls
}: {
  children: React.ReactNode
  isActive: boolean
  onClick: () => void
  controls?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'w-full border rounded-lg p-4 cursor-pointer transition-colors',
        isActive 
          ? 'border-primary bg-primary/5' 
          : 'hover:bg-accent'
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="font-semibold flex-1">{children}</div>
        {controls}
      </div>
    </div>
  )
}