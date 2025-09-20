import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400'); // 5min cache, 1day stale

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try Mempool.space first (Bitcoin-focused, less likely to be blocked)
    console.log('[Bitcoin Price API] Attempting Mempool.space...');
    
    const mempoolResponse = await fetch('https://mempool.space/api/v1/prices', {
      headers: {
        'User-Agent': 'ZapTok/1.0'
      },
      signal: AbortSignal.timeout(8000) // 8 second timeout
    });
    
    if (mempoolResponse.ok) {
      const mempoolData = await mempoolResponse.json();
      console.log('[Bitcoin Price API] Success via Mempool.space');
      
      return res.json({
        source: 'mempool',
        prices: {
          USD: mempoolData.USD,
          EUR: mempoolData.EUR,
          GBP: mempoolData.GBP
        },
        timestamp: Date.now()
      });
    } else {
      console.log(`[Bitcoin Price API] Mempool.space HTTP error: ${mempoolResponse.status}`);
    }
  } catch (error) {
    console.log('[Bitcoin Price API] Mempool.space failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    // Fallback to CoinGecko
    console.log('[Bitcoin Price API] Falling back to CoinGecko...');
    
    const coingeckoResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp',
      {
        headers: {
          'User-Agent': 'ZapTok/1.0'
        },
        signal: AbortSignal.timeout(8000)
      }
    );
    
    if (coingeckoResponse.ok) {
      const coingeckoData = await coingeckoResponse.json();
      console.log('[Bitcoin Price API] Success via CoinGecko fallback');
      
      return res.json({
        source: 'coingecko',
        prices: {
          USD: coingeckoData.bitcoin.usd,
          EUR: coingeckoData.bitcoin.eur,
          GBP: coingeckoData.bitcoin.gbp
        },
        timestamp: Date.now()
      });
    } else {
      console.log(`[Bitcoin Price API] CoinGecko HTTP error: ${coingeckoResponse.status}`);
    }
  } catch (error) {
    console.log('[Bitcoin Price API] CoinGecko failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Both APIs failed - return reasonable fallback estimates
  console.log('[Bitcoin Price API] All APIs failed, using fallback prices');
  return res.status(503).json({
    source: 'fallback',
    prices: {
      USD: 65000, // Reasonable Bitcoin price estimate for 2025
      EUR: 59000,
      GBP: 51000
    },
    timestamp: Date.now(),
    error: 'All price APIs unavailable'
  });
}
