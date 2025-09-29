import { decode } from 'light-bolt11-decoder';
import QRCode from 'qrcode';

export interface DecodedInvoice {
  paymentRequest: string;
  amount?: number; // in sats
  description?: string;
  paymentHash?: string;
  expiry?: number;
  timestamp?: number;
  destination?: string;
  isExpired?: boolean;
  created?: number; // alias for timestamp
}

export function decodeLightningInvoice(invoice: string): DecodedInvoice | null {
  try {
    const decoded = decode(invoice);

    // Extract amount in sats (convert from msats if present)
    const amountSection = decoded.sections.find((s: any) => s.name === 'amount');
    const amount = amountSection && 'value' in amountSection && typeof amountSection.value === 'string'
      ? Math.floor(parseInt(amountSection.value) / 1000)
      : undefined;

    // Extract description
    const descSection = decoded.sections.find((s: any) => s.name === 'description');
    const description = descSection && 'value' in descSection && typeof descSection.value === 'string'
      ? descSection.value
      : undefined;

    // Extract payment hash
    const hashSection = decoded.sections.find((s: any) => s.name === 'payment_hash');
    const paymentHash = hashSection && 'value' in hashSection && typeof hashSection.value === 'string'
      ? hashSection.value
      : undefined;

    // Extract expiry
    const expirySection = decoded.sections.find((s: any) => s.name === 'expiry');
    const expiry = expirySection && 'value' in expirySection && typeof expirySection.value === 'string'
      ? parseInt(expirySection.value)
      : undefined;

    // Extract timestamp
    const timestampSection = decoded.sections.find((s: any) => s.name === 'timestamp');
    const timestamp = timestampSection && 'value' in timestampSection && typeof timestampSection.value === 'string'
      ? parseInt(timestampSection.value)
      : undefined;

    // Extract destination
    const destinationSection = decoded.sections.find((s: any) => s.name === 'destination');
    const destination = destinationSection && 'value' in destinationSection && typeof destinationSection.value === 'string'
      ? destinationSection.value
      : undefined;

    // Check if expired
    const isExpired = timestamp && expiry ? (Date.now() / 1000) > (timestamp + expiry) : false;

    return {
      paymentRequest: invoice,
      amount,
      description,
      paymentHash,
      expiry,
      timestamp,
      destination,
      isExpired,
      created: timestamp,
    };
  } catch (error) {
    console.error('Failed to decode Lightning invoice:', error);
    return null;
  }
}

export function validateLightningInvoice(invoice: string): { valid: boolean; error?: string } {
  if (!invoice) {
    return { valid: false, error: 'Invoice is required' };
  }

  if (!invoice.toLowerCase().startsWith('lnbc') && !invoice.toLowerCase().startsWith('lntb')) {
    return { valid: false, error: 'Invalid Lightning invoice format' };
  }

  const decoded = decodeLightningInvoice(invoice);
  if (!decoded) {
    return { valid: false, error: 'Failed to decode Lightning invoice' };
  }

  // Check if invoice is expired
  if (decoded.timestamp && decoded.expiry) {
    const expiryTime = (decoded.timestamp + decoded.expiry) * 1000;
    if (Date.now() > expiryTime) {
      return { valid: false, error: 'Invoice has expired' };
    }
  }

  return { valid: true };
}

export function formatInvoiceAmount(amount?: number): string {
  if (!amount) return 'Amount not specified';

  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(8)} BTC`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(3)} k sats`;
  } else {
    return `${amount.toLocaleString()} sats`;
  }
}

// QR generation using qrcode library
export async function generateInvoiceQR(invoice: string): Promise<string> {
  try {
    // Add lightning: prefix for better wallet recognition
    const qrData = invoice.startsWith('lightning:') ? invoice : `lightning:${invoice}`;
    
    return await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    // Fallback to placeholder SVG
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" fill="black">QR Error</text></svg>`;
  }
}

// Type alias
export type LightningInvoiceData = DecodedInvoice;