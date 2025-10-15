// Basic BOLT12 mint client we can implement immediately
// src/lib/bolt12-mint-client.ts

import { CashuMint, CashuWallet, type GetInfoResponse } from '@cashu/cashu-ts';
import type {
  Bolt12MintQuoteRequest,
  Bolt12MintQuoteResponse,
  Bolt12MeltQuoteRequest,
  Bolt12MeltQuoteResponse,
  Bolt12MintSettings
} from '@/types/bolt12';

export class Bolt12MintClient {
  private mintUrl: string;
  private cashuMint: CashuMint;

  constructor(mintUrl: string) {
    this.mintUrl = mintUrl;
    this.cashuMint = new CashuMint(mintUrl);
  }

  /**
   * Check if mint supports BOLT12 (NUT-25)
   */
  async supportsBolt12(): Promise<boolean> {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const info: GetInfoResponse = await this.cashuMint.getInfo();
      clearTimeout(timeoutId);

      return info.nuts?.[25]?.supported === true;
    } catch (error) {
      console.error('Error checking BOLT12 support:', error);
      return false;
    }
  }

  /**
   * Get BOLT12 mint settings
   */
  async getBolt12Settings(): Promise<Bolt12MintSettings | null> {
    try {
      const info: GetInfoResponse = await this.cashuMint.getInfo();
      const bolt12Methods = info.nuts?.[25]?.methods?.filter(
        (method: any) => method.method === 'bolt12'
      );
      return bolt12Methods?.[0] || null;
    } catch (error) {
      console.error('Error getting BOLT12 settings:', error);
      return null;
    }
  }

  /**
   * Request BOLT12 mint quote
   */
  async requestMintQuote(
    request: Bolt12MintQuoteRequest
  ): Promise<Bolt12MintQuoteResponse> {
    const response = await fetch(`${this.mintUrl}/v1/mint/quote/bolt12`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BOLT12 mint quote failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check BOLT12 mint quote status
   */
  async checkMintQuote(quoteId: string): Promise<Bolt12MintQuoteResponse> {
    const response = await fetch(
      `${this.mintUrl}/v1/mint/quote/bolt12/${quoteId}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`BOLT12 mint quote check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Request BOLT12 melt quote
   */
  async requestMeltQuote(
    request: Bolt12MeltQuoteRequest
  ): Promise<Bolt12MeltQuoteResponse> {
    const response = await fetch(`${this.mintUrl}/v1/melt/quote/bolt12`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BOLT12 melt quote failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check BOLT12 melt quote status
   */
  async checkMeltQuote(quoteId: string): Promise<Bolt12MeltQuoteResponse> {
    const response = await fetch(
      `${this.mintUrl}/v1/melt/quote/bolt12/${quoteId}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`BOLT12 melt quote check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Execute mint operation using BOLT12 quote
   */
  async mintTokens(quoteId: string, outputs: any[]): Promise<any> {
    const response = await fetch(`${this.mintUrl}/v1/mint/bolt12`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote: quoteId,
        outputs,
      }),
    });

    if (!response.ok) {
      throw new Error(`BOLT12 mint failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Execute melt operation using BOLT12 quote
   */
  async meltTokens(quoteId: string, inputs: any[], outputs?: any[]): Promise<any> {
    const response = await fetch(`${this.mintUrl}/v1/melt/bolt12`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote: quoteId,
        inputs,
        ...(outputs && { outputs }),
      }),
    });

    if (!response.ok) {
      throw new Error(`BOLT12 melt failed: ${response.statusText}`);
    }

    return response.json();
  }
}