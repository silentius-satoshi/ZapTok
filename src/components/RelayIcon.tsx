import { Server } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export default function RelayIcon({
  url,
  className,
  iconSize = 14
}: {
  url?: string
  className?: string
  iconSize?: number
}) {
  // Simple favicon URL generation
  const iconUrl = url ? (() => {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol === 'wss:' ? 'https:' : 'http:'}//${urlObj.host}/favicon.ico`
    } catch {
      return undefined
    }
  })() : undefined

  return (
    <Avatar className={cn('w-6 h-6', className)}>
      <AvatarImage src={iconUrl} className="object-cover object-center" />
      <AvatarFallback>
        <Server size={iconSize} />
      </AvatarFallback>
    </Avatar>
  )
}