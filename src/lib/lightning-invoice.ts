import { decode } from 'light-bolt11-decoder';
import QRCode from 'qrcode';

export interface LightningInvoiceData {
  amount: number; // in sats
  description: string;
  expiry: number; // timestamp
  created: number; // timestamp
  paymentHash: string;
  isExpired: boolean;
  timeUntilExpiry: string;
}

/**
 * Decode and parse a Lightning invoice
 */
export function decodeLightningInvoice(invoice: string): LightningInvoiceData | null {
  try {
    const decoded = decode(invoice);

    const amountSection = decoded.sections.find(s => s.name === 'amount');
    const descriptionSection = decoded.sections.find(s => s.name === 'description');
    const expirySection = decoded.sections.find(s => s.name === 'expiry');
    const timestampSection = decoded.sections.find(s => s.name === 'timestamp');
    const paymentHashSection = decoded.sections.find(s => s.name === 'payment_hash');

    const amount = parseInt(amountSection?.value || '0') / 1000; // Convert millisats to sats
    const description = decodeURI(descriptionSection?.value || '');
    const expiry = (expirySection?.value as number) || 3600; // Default 1 hour
    const created = (timestampSection?.value as number) || Math.floor(Date.now() / 1000);
    const paymentHash = paymentHashSection?.value as string || '';

    const expiryTime = created + expiry;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > expiryTime;

    return {
      amount,
      description,
      expiry: expiryTime,
      created,
      paymentHash,
      isExpired,
      timeUntilExpiry: getTimeUntilExpiry(expiryTime),
    };
  } catch (error) {
    console.error('Failed to decode Lightning invoice:', error);
    return null;
  }
}

/**
 * Get human-readable time until expiry
 */
function getTimeUntilExpiry(expiryTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = expiryTimestamp - now;

  if (timeLeft <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Format amount with proper thousands separators
 */
export function formatSats(amount: number): string {
  return amount.toLocaleString();
}

/**
 * Generate QR code data URL for Lightning invoice
 */
export async function generateInvoiceQR(invoice: string): Promise<string> {
  try {
    return await QRCode.toDataURL(invoice, {
      errorCorrectionLevel: 'M',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    // Fallback SVG placeholder
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" fill="black" font-size="12">QR Code</text>
        <text x="100" y="120" text-anchor="middle" fill="gray" font-size="8">Invoice: ${invoice.slice(0, 20)}...</text>
      </svg>
    `)}`;
  }
}
