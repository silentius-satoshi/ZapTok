/**
 * QR code data format utilities for various token and invoice types
 */

export interface QRDataFormat {
  type: 'cashu' | 'lightning' | 'nostr' | 'zaptok'
  data: string
  originalValue: string
}

/**
 * Parse QR data and identify its format
 */
export function parseQRData(data: string): QRDataFormat | null {
  const trimmed = data.trim()

  // Cashu token formats
  if (trimmed.startsWith('cashu://') || trimmed.startsWith('cashuA')) {
    return {
      type: 'cashu',
      data: trimmed,
      originalValue: trimmed
    }
  }

  // Lightning invoice formats
  if (trimmed.match(/^(lightning:|lnbc|lntb|lnbcrt)/i)) {
    const cleaned = trimmed.replace(/^lightning:/i, '')
    return {
      type: 'lightning',
      data: cleaned,
      originalValue: trimmed
    }
  }

  // Nostr formats
  if (trimmed.startsWith('nostr:') || trimmed.match(/^(npub|note|nevent|naddr)/)) {
    return {
      type: 'nostr',
      data: trimmed,
      originalValue: trimmed
    }
  }

  // ZapTok app-specific formats
  if (trimmed.startsWith('zaptok://')) {
    return {
      type: 'zaptok',
      data: trimmed,
      originalValue: trimmed
    }
  }

  return null
}

/**
 * Validate QR data format
 */
export function validateQRData(data: string, expectedType?: QRDataFormat['type']): { valid: boolean; error?: string } {
  const parsed = parseQRData(data)
  
  if (!parsed) {
    return { valid: false, error: 'Unrecognized QR code format' }
  }

  if (expectedType && parsed.type !== expectedType) {
    return { valid: false, error: `Expected ${expectedType} format, got ${parsed.type}` }
  }

  // Additional format-specific validation
  switch (parsed.type) {
    case 'lightning':
      if (!parsed.data.match(/^(lnbc|lntb|lnbcrt)/i)) {
        return { valid: false, error: 'Invalid Lightning invoice format' }
      }
      break
    
    case 'cashu':
      // Basic cashu token validation
      if (!parsed.data.startsWith('cashu://') && !parsed.data.startsWith('cashuA')) {
        return { valid: false, error: 'Invalid Cashu token format' }
      }
      break
  }

  return { valid: true }
}

/**
 * Format data for QR code display
 */
export function formatForQR(data: string, type: QRDataFormat['type']): string {
  switch (type) {
    case 'cashu':
      // Ensure cashu:// prefix for better app recognition
      if (!data.startsWith('cashu://')) {
        return data.startsWith('cashuA') ? `cashu://${data}` : data
      }
      return data
    
    case 'lightning':
      // Ensure lightning: prefix for better wallet recognition
      if (!data.startsWith('lightning:') && data.match(/^(lnbc|lntb|lnbcrt)/i)) {
        return `lightning:${data}`
      }
      return data
    
    case 'nostr':
      // Ensure nostr: prefix
      if (!data.startsWith('nostr:') && data.match(/^(npub|note|nevent|naddr)/)) {
        return `nostr:${data}`
      }
      return data
    
    default:
      return data
  }
}