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
import { decodeLightningInvoice } from '@/lib/lightning-invoice'

interface LightningInvoiceQrCodeProps {
  invoice: string
  amount?: number
}

export default function LightningInvoiceQrCode({ invoice, amount }: LightningInvoiceQrCodeProps) {
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const qrData = useMemo(() => formatForQR(invoice, 'lightning'), [invoice])
  const invoiceData = useMemo(() => {
    try {
      return decodeLightningInvoice(invoice)
    } catch {
      return null
    }
  }, [invoice])

  const copyInvoice = () => {
    navigator.clipboard.writeText(invoice)
    setCopied(true)
    toast({
      title: "Invoice copied",
      description: "Lightning invoice copied to clipboard"
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const trigger = (
    <div className="bg-muted rounded-full h-5 w-5 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
      <QrCodeIcon size={14} />
    </div>
  )

  const content = (
    <div className="bg-black flex items-center justify-center min-h-screen w-full">
      <QrCode size={320} value={qrData} />
    </div>
  )

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger>{trigger}</DrawerTrigger>
        <DrawerContent className="bg-black border-0 p-0 m-0">{content}</DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="w-full max-w-full h-full p-0 m-0 bg-black border-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        {content}
      </DialogContent>
    </Dialog>
  )
}