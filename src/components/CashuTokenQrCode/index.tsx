import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/useIsMobile'
import { QrCodeIcon } from 'lucide-react'
import { useMemo } from 'react'
import QrCode from '../QrCode'
import { formatForQR } from '@/lib/qr-formats'
import { formatBalance } from '@/lib/cashu'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useState } from 'react'

interface CashuTokenQrCodeProps {
  token: string
  amount?: number
  mintUrl?: string
}

export default function CashuTokenQrCode({ token, amount, mintUrl }: CashuTokenQrCodeProps) {
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const qrData = useMemo(() => formatForQR(token, 'cashu'), [token])

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    toast({
      title: "Token copied",
      description: "Cashu token copied to clipboard"
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const trigger = (
    <div className="bg-muted rounded-full h-5 w-5 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
      <QrCodeIcon size={14} />
    </div>
  )

  const content = (
    <div className="w-full flex flex-col items-center gap-4 p-8">
      <div className="flex items-center w-full gap-2 pointer-events-none px-1">
        <div className="flex-1 text-center">
          <div className="text-2xl font-semibold">Cashu Token</div>
          {amount && (
            <div className="text-lg text-muted-foreground">
              {formatBalance(amount)} sats
            </div>
          )}
          {mintUrl && (
            <div className="text-sm text-muted-foreground mt-1">
              {new URL(mintUrl).hostname}
            </div>
          )}
        </div>
      </div>
      
      <QrCode size={512} value={qrData} />
      
      <div className="flex flex-col items-center gap-2">
        <Button
          variant="outline"
          onClick={copyToken}
          className="flex items-center gap-2"
        >
          {copied ? "Copied!" : "Copy Token"}
          <Copy size={16} />
        </Button>
        <div className="text-xs text-muted-foreground text-center max-w-md break-all">
          {token.slice(0, 50)}...
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger>{trigger}</DrawerTrigger>
        <DrawerContent>{content}</DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="w-80 p-0 m-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        {content}
      </DialogContent>
    </Dialog>
  )
}