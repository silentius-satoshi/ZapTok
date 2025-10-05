import QRCodeStyling from 'qr-code-styling'
import { useEffect, useRef, useState } from 'react'

// Preload and cache the logo image
const logoImage = new Image();
logoImage.src = '/images/icon-512x512.png';

export default function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false);

  // Ensure image is loaded before generating QR code
  useEffect(() => {
    if (logoImage.complete) {
      setImageLoaded(true);
    } else {
      logoImage.onload = () => setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!imageLoaded) return; // Wait for image to load

    const pixelRatio = window.devicePixelRatio || 1
    const actualSize = Math.max(size, 200) // Increase minimum size for better visibility

    const qrCode = new QRCodeStyling({
      qrOptions: {
        errorCorrectionLevel: 'M'
      },
      image: logoImage.src,
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

    return () => {
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [value, size, imageLoaded])

  return (
    <div className="flex items-center justify-center">
      <div ref={ref} />
    </div>
  )
}