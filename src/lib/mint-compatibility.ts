/**
 * Mint compatibility utilities for NUT-11 P2PK support
 * Production-ready functions for checking mint capabilities
 */

import { CashuClient } from './cashu-client';
import type { MintInfo } from './cashu-types';

export interface MintCompatibilityResult {
  mintUrl: string;
  isCompatible: boolean;
  supportsP2PK: boolean;
  supportsDLEQ: boolean;
  supportsSpendingConditions: boolean;
  securityLevel: 'HIGH' | 'BASIC' | 'NONE';
  supportedUnits: string[];
  mintInfo?: MintInfo;
  error?: string;
  responseTime?: number;
}

/**
 * Check if a mint supports NUT-11 P2PK functionality
 * 
 * @param mintUrl - The URL of the mint to test
 * @param timeoutMs - Request timeout in milliseconds (default: 5000)
 * @returns Promise<MintCompatibilityResult>
 */
export async function checkMintP2PKCompatibility(
  mintUrl: string, 
  timeoutMs: number = 5000
): Promise<MintCompatibilityResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const client = new CashuClient({ url: mintUrl });
    
    // Wrap getMintInfo with fetch signal
    const mintInfo = await Promise.race([
      client.getMintInfo(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout'));
        });
      })
    ]);
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Check NUT support
    const supportsP2PK = mintInfo.nuts?.[11]?.supported === true;
    const supportsDLEQ = mintInfo.nuts?.[12]?.supported === true;
    const supportsSpendingConditions = mintInfo.nuts?.[10]?.supported === true;
    
    // Determine compatibility and security level
    const isCompatible = supportsP2PK && supportsSpendingConditions;
    const securityLevel: 'HIGH' | 'BASIC' | 'NONE' = 
      isCompatible && supportsDLEQ ? 'HIGH' :
      isCompatible ? 'BASIC' : 'NONE';
    
    // Extract supported units
    const supportedUnits = new Set<string>();
    
    // From NUT-4 (minting)
    if (mintInfo.nuts?.[4]?.methods) {
      mintInfo.nuts[4].methods.forEach(method => {
        supportedUnits.add(method.unit);
      });
    }
    
    // From NUT-5 (melting)
    if (mintInfo.nuts?.[5]?.methods) {
      mintInfo.nuts[5].methods.forEach(method => {
        supportedUnits.add(method.unit);
      });
    }
    
    return {
      mintUrl,
      isCompatible,
      supportsP2PK,
      supportsDLEQ,
      supportsSpendingConditions,
      securityLevel,
      supportedUnits: Array.from(supportedUnits),
      mintInfo,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      mintUrl,
      isCompatible: false,
      supportsP2PK: false,
      supportsDLEQ: false,
      supportsSpendingConditions: false,
      securityLevel: 'NONE',
      supportedUnits: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

/**
 * Check multiple mints for P2PK compatibility
 * 
 * @param mintUrls - Array of mint URLs to test
 * @param options - Configuration options
 * @returns Promise<MintCompatibilityResult[]>
 */
export async function checkMultipleMints(
  mintUrls: string[],
  options: {
    timeoutMs?: number;
    concurrency?: number;
    delayMs?: number;
  } = {}
): Promise<MintCompatibilityResult[]> {
  const { 
    timeoutMs = 5000, 
    concurrency = 3, 
    delayMs = 200 
  } = options;
  
  const results: MintCompatibilityResult[] = [];
  
  // Process mints in batches to avoid overwhelming servers
  for (let i = 0; i < mintUrls.length; i += concurrency) {
    const batch = mintUrls.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (mintUrl) => {
      const result = await checkMintP2PKCompatibility(mintUrl, timeoutMs);
      
      // Add delay between requests in the same batch
      if (delayMs > 0 && batch.length > 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      return result;
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Handle rejected promises (shouldn't happen with our error handling)
        const failedMintUrl = batch[results.length % batch.length];
        results.push({
          mintUrl: failedMintUrl,
          isCompatible: false,
          supportsP2PK: false,
          supportsDLEQ: false,
          supportsSpendingConditions: false,
          securityLevel: 'NONE',
          supportedUnits: [],
          error: 'Promise rejected'
        });
      }
    }
  }
  
  return results;
}

/**
 * Get the best compatible mint from a list
 * Prioritizes HIGH security level, then response time
 * 
 * @param results - Array of compatibility results
 * @returns The best mint result, or null if none are compatible
 */
export function getBestCompatibleMint(
  results: MintCompatibilityResult[]
): MintCompatibilityResult | null {
  const compatible = results.filter(r => r.isCompatible);
  
  if (compatible.length === 0) {
    return null;
  }
  
  // Sort by security level (HIGH first), then by response time
  compatible.sort((a, b) => {
    if (a.securityLevel !== b.securityLevel) {
      if (a.securityLevel === 'HIGH') return -1;
      if (b.securityLevel === 'HIGH') return 1;
      return 0;
    }
    
    // If security levels are equal, prefer faster response time
    const aTime = a.responseTime || Infinity;
    const bTime = b.responseTime || Infinity;
    return aTime - bTime;
  });
  
  return compatible[0];
}

/**
 * Filter mints by specific criteria
 * 
 * @param results - Array of compatibility results
 * @param criteria - Filtering criteria
 * @returns Filtered results
 */
export function filterMintsByCriteria(
  results: MintCompatibilityResult[],
  criteria: {
    requireP2PK?: boolean;
    requireDLEQ?: boolean;
    requiredUnits?: string[];
    maxResponseTime?: number;
    minSecurityLevel?: 'BASIC' | 'HIGH';
  }
): MintCompatibilityResult[] {
  return results.filter(result => {
    if (criteria.requireP2PK && !result.supportsP2PK) {
      return false;
    }
    
    if (criteria.requireDLEQ && !result.supportsDLEQ) {
      return false;
    }
    
    if (criteria.requiredUnits) {
      const hasAllUnits = criteria.requiredUnits.every(unit => 
        result.supportedUnits.includes(unit)
      );
      if (!hasAllUnits) {
        return false;
      }
    }
    
    if (criteria.maxResponseTime && result.responseTime) {
      if (result.responseTime > criteria.maxResponseTime) {
        return false;
      }
    }
    
    if (criteria.minSecurityLevel) {
      if (criteria.minSecurityLevel === 'HIGH' && result.securityLevel !== 'HIGH') {
        return false;
      }
      if (criteria.minSecurityLevel === 'BASIC' && result.securityLevel === 'NONE') {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Generate a compatibility report for display in UI
 * 
 * @param results - Array of compatibility results
 * @returns Human-readable compatibility report
 */
export function generateCompatibilityReport(
  results: MintCompatibilityResult[]
): {
  summary: string;
  compatible: MintCompatibilityResult[];
  incompatible: MintCompatibilityResult[];
  errors: MintCompatibilityResult[];
  recommendations: string[];
} {
  const compatible = results.filter(r => r.isCompatible);
  const incompatible = results.filter(r => !r.isCompatible && !r.error);
  const errors = results.filter(r => r.error);
  
  const highSecurity = compatible.filter(r => r.securityLevel === 'HIGH');
  const basicSecurity = compatible.filter(r => r.securityLevel === 'BASIC');
  
  const summary = `${compatible.length}/${results.length} mints support P2PK`;
  
  const recommendations: string[] = [];
  
  if (highSecurity.length > 0) {
    recommendations.push(`Use high-security mints (${highSecurity.length} available) for maximum protection`);
  }
  
  if (basicSecurity.length > 0 && highSecurity.length === 0) {
    recommendations.push(`Basic P2PK support available (${basicSecurity.length} mints), consider upgrading to DLEQ-enabled mints`);
  }
  
  if (compatible.length === 0) {
    recommendations.push('No P2PK compatible mints found. Consider using standard tokens or finding alternative mints.');
  }
  
  if (errors.length > 0) {
    recommendations.push(`${errors.length} mints are unreachable. Check network connectivity or mint status.`);
  }
  
  return {
    summary,
    compatible,
    incompatible,
    errors,
    recommendations
  };
}

/**
 * Cache-enabled mint compatibility checker
 * Caches results for a specified duration to avoid repeated API calls
 */
export class MintCompatibilityCache {
  private cache = new Map<string, { result: MintCompatibilityResult; timestamp: number }>();
  private cacheDurationMs: number;
  
  constructor(cacheDurationMs: number = 5 * 60 * 1000) { // 5 minutes default
    this.cacheDurationMs = cacheDurationMs;
  }
  
  async checkMint(mintUrl: string, timeoutMs?: number): Promise<MintCompatibilityResult> {
    const now = Date.now();
    const cached = this.cache.get(mintUrl);
    
    if (cached && (now - cached.timestamp) < this.cacheDurationMs) {
      return cached.result;
    }
    
    const result = await checkMintP2PKCompatibility(mintUrl, timeoutMs);
    this.cache.set(mintUrl, { result, timestamp: now });
    
    return result;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheSize(): number {
    return this.cache.size;
  }
}