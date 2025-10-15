import QRCodeStyling from 'qr-code-styling';
import { useEffect, useRef, useState } from 'react';

// Preload and cache the logo image
const logoImage = new Image();
logoImage.src = `${import.meta.env.BASE_URL}images/icon-512x512.png`;

export default function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
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

    const pixelRatio = window.devicePixelRatio || 2;

    const qrCode = new QRCodeStyling({
      qrOptions: {
        errorCorrectionLevel: 'M'
      },
      image: logoImage.src,
      width: size * pixelRatio,
      height: size * pixelRatio,
      data: value,
      dotsOptions: {
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        type: 'extra-rounded'
      },
      cornersSquareOptions: {
        type: 'extra-rounded'
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 4,
        imageSize: 0.3,
        hideBackgroundDots: true
      }
    });

    if (ref.current) {
      ref.current.innerHTML = '';
      qrCode.append(ref.current);
      const canvas = ref.current.querySelector('canvas');
      if (canvas) {
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
      }
    }

    return () => {
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [value, size, imageLoaded]);

  return <div ref={ref} />;
}
