// Cashu client implementation for eCash operations
// Import hex utilities for future cryptographic operations if needed
import {
  CashuMint,
  MintInfo,
  CashuToken,
  Proof,
  MeltQuoteRequest,
  MeltQuoteResponse,
  MintQuoteRequest,
  MintQuoteResponse,
} from './cashu-types';

export class CashuClient {
  private mint: CashuMint;

  constructor(mint: CashuMint) {
    this.mint = mint;
  }

  /**
   * Get mint information
   */
  async getMintInfo(): Promise<MintInfo> {
    const response = await fetch(`${this.mint.url}/v1/info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to get mint info: ${response.statusText}`);
    }

    const info = await response.json();
    
    if (info.error) {
      throw new Error(info.error);
    }

    return info;
  }

  /**
   * Get keyset information
   */
  async getKeysets(): Promise<any> {
    const response = await fetch(`${this.mint.url}/v1/keysets`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to get keysets: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get keys for a specific keyset
   */
  async getKeys(id?: string): Promise<any> {
    const url = id 
      ? `${this.mint.url}/v1/keys/${id}`
      : `${this.mint.url}/v1/keys`;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to get keys: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Request a mint quote for creating new tokens
   */
  async requestMintQuote(amount: number, unit = 'sat'): Promise<MintQuoteResponse> {
    const request: MintQuoteRequest = {
      amount,
      unit,
    };

    const response = await fetch(`${this.mint.url}/v1/mint/quote/bolt11`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to request mint quote: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Check mint quote status
   */
  async checkMintQuote(quote: string): Promise<MintQuoteResponse> {
    const response = await fetch(`${this.mint.url}/v1/mint/quote/bolt11/${quote}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to check mint quote: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Mint new tokens after paying the quote
   */
  async mintTokens(quote: string, outputs: any[]): Promise<any> {
    const request = {
      quote,
      outputs,
    };

    const response = await fetch(`${this.mint.url}/v1/mint/bolt11`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to mint tokens: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Request a melt quote for paying Lightning invoices
   */
  async requestMeltQuote(invoice: string, unit = 'sat'): Promise<MeltQuoteResponse> {
    const request: MeltQuoteRequest = {
      request: invoice,
      unit,
    };

    const response = await fetch(`${this.mint.url}/v1/melt/quote/bolt11`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to request melt quote: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Check melt quote status
   */
  async checkMeltQuote(quote: string): Promise<MeltQuoteResponse> {
    const response = await fetch(`${this.mint.url}/v1/melt/quote/bolt11/${quote}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to check melt quote: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Melt tokens to pay Lightning invoice
   */
  async meltTokens(quote: string, inputs: Proof[]): Promise<any> {
    const request = {
      quote,
      inputs,
    };

    const response = await fetch(`${this.mint.url}/v1/melt/bolt11`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to melt tokens: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Swap tokens (used for change)
   */
  async swapTokens(inputs: Proof[], outputs: any[]): Promise<any> {
    const request = {
      inputs,
      outputs,
    };

    const response = await fetch(`${this.mint.url}/v1/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to swap tokens: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Check if tokens are already spent
   */
  async checkSpentTokens(secrets: string[]): Promise<{ spent: boolean[] }> {
    const request = {
      secrets,
    };

    const response = await fetch(`${this.mint.url}/v1/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to check spent tokens: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Test connection to the mint
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getMintInfo();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Parse a Cashu token from string
 */
export function parseCashuToken(tokenString: string): CashuToken {
  try {
    // Handle cashu:// prefix
    if (tokenString.startsWith('cashu://')) {
      tokenString = tokenString.slice(8);
    }
    
    // Handle cashuA prefix
    if (tokenString.startsWith('cashuA')) {
      tokenString = tokenString.slice(6);
    }

    // Base64 decode
    const decoded = atob(tokenString);
    return JSON.parse(decoded);
  } catch {
    throw new Error('Invalid Cashu token format');
  }
}

/**
 * Serialize a Cashu token to string
 */
export function serializeCashuToken(token: CashuToken): string {
  const tokenString = btoa(JSON.stringify(token));
  return `cashuA${tokenString}`;
}

/**
 * Calculate total amount from proofs
 */
export function calculateProofsAmount(proofs: Proof[]): number {
  return proofs.reduce((sum, proof) => sum + proof.amount, 0);
}

/**
 * Validate mint URL
 */
export function isValidMintUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
