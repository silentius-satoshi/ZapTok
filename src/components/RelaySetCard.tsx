import { useState } from 'react'
import { ChevronDown, FolderClosed } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TRelaySet } from '@/providers/FavoriteRelaysProvider'
import RelayIcon from './RelayIcon'

export default function RelaySetCard({
  relaySet,
  select,
  onSelectChange
}: {
  relaySet: TRelaySet
  select: boolean
  onSelectChange: (select: boolean) => void
}) {
  const [expand, setExpand] = useState(false)

  return (
    <div
      className={cn(
        'w-full border rounded-lg p-4 cursor-pointer transition-colors',
        select ? 'border-primary bg-primary/5' : 'hover:bg-accent'
      )}
      onClick={() => onSelectChange(!select)}
    >
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 items-center cursor-pointer">
          <div className="flex justify-center items-center w-6 h-6 shrink-0">
            <FolderClosed className="size-4" />
          </div>
          <div className="h-8 font-semibold flex items-center select-none">{relaySet.name}</div>
        </div>
        <div className="flex gap-1">
          <RelayUrlsExpandToggle expand={expand} onExpandChange={setExpand}>
            {relaySet.relayUrls.length} relays
          </RelayUrlsExpandToggle>
        </div>
      </div>
      {expand && <RelayUrls urls={relaySet.relayUrls} />}
    </div>
  )
}

function RelayUrlsExpandToggle({
  children,
  expand,
  onExpandChange
}: {
  children: React.ReactNode
  expand: boolean
  onExpandChange: (expand: boolean) => void
}) {
  return (
    <div
      className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation()
        onExpandChange(!expand)
      }}
    >
      <div className="select-none">{children}</div>
      <ChevronDown
        size={16}
        className={cn(
          'transition-transform duration-200',
          expand ? 'rotate-180' : ''
        )}
      />
    </div>
  )
}

function RelayUrls({ urls }: { urls: string[] }) {
  if (!urls?.length) return null

  return (
    <div className="pl-1 space-y-1 mt-2">
      {urls.map((url) => (
        <div key={url} className="flex items-center gap-3">
          <RelayIcon url={url} className="w-4 h-4" iconSize={10} />
          <div className="text-muted-foreground text-sm truncate">{url}</div>
        </div>
      ))}
    </div>
  )
}