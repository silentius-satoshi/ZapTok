import QRCodeStyling from 'qr-code-styling'
import { useEffect, useRef } from 'react'

export default function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => {
      const pixelRatio = window.devicePixelRatio || 1
      const actualSize = Math.max(size, 200) // Increase minimum size for better visibility

      const qrCode = new QRCodeStyling({
        qrOptions: {
          errorCorrectionLevel: 'M'
        },
        image: '/images/icon-192x192.png',
        width: actualSize,
        height: actualSize,
        data: value,
        dotsOptions: {
          type: 'extra-rounded',
          color: '#000000'
        },
        cornersDotOptions: {
          type: 'extra-rounded',
          color: '#000000'
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000'
        },
        backgroundOptions: {
          color: '#ffffff'
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4, // Slightly increase margin for better spacing
          imageSize: 0.3, // Slightly reduce icon size for better balance
          hideBackgroundDots: true
        }
      })

      if (ref.current) {
        ref.current.innerHTML = ''
        qrCode.append(ref.current)
        const canvas = ref.current.querySelector('canvas')
        if (canvas) {
          canvas.style.width = `${actualSize}px`
          canvas.style.height = `${actualSize}px`
          canvas.style.maxWidth = '100%'
          canvas.style.height = 'auto'
          canvas.style.border = 'none'
          canvas.style.borderRadius = '12px' // Add subtle rounded corners to the QR code itself
        }
      }
    }, 0)

    return () => {
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [value, size])

  return (
    <div className="flex items-center justify-center">
      <div ref={ref} />
    </div>
  )
}