import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed Lightning address domains for security
const ALLOWED_LIGHTNING_DOMAINS = [
  'primal.net',
  'walletofsatoshi.com',
  'getalby.com',
  'stacker.news',
  'zbd.gg',
  'lnbits.com',
  'strike.army',
  'coinos.io'
];

// Cache for Lightning address data (5 minutes TTL)
const CACHE = new Map<string, { data: LightningAddressData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface LightningAddressData {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  tag: string;
  allowsNostr?: boolean;
  nostrPubkey?: string;
}

interface LightningInvoiceResponse {
  pr: string;
  routes?: unknown[];
  status?: string;
  reason?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the origin first
  const origin = req.headers.origin;
  
  // Set CORS headers for your domain only
  const allowedOrigins = [
    'https://zaptok.vercel.app', // Production domain
    'https://silentius-satoshi.github.io', // GitHub Pages
    'https://zaptok-labs-cukp0oxws-zaptok-labs.vercel.app', // Current Vercel deployment
    'http://localhost:5173', // Development
    'http://localhost:3000', // Alternative dev port
  ];

  // Also allow any ZapTok-related Vercel deployment
  const isZapTokVercelDomain = origin && origin.match(/^https:\/\/zaptok.*\.vercel\.app$/);
  const isGitHubPages = origin && origin.includes('silentius-satoshi.github.io');

  if (allowedOrigins.includes(origin || '') || isZapTokVercelDomain || isGitHubPages) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, User-Agent');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const startTime = Date.now();

  try {
    if (req.method === 'GET') {
      // Handle Lightning address resolution
      const { lightningAddress } = req.query;

      if (!lightningAddress || typeof lightningAddress !== 'string') {
        return res.status(400).json({
          error: 'Lightning address is required',
          code: 'MISSING_ADDRESS'
        });
      }

      const result = await resolveLightningAddress(lightningAddress, req);
      const latency = Date.now() - startTime;

      logRequest('resolve', lightningAddress, true, latency, req);
      return res.status(200).json(result);

    } else if (req.method === 'POST') {
      // Handle Lightning invoice generation
      const { callback, amount, comment, nostr } = req.body;

      if (!callback || !amount) {
        return res.status(400).json({
          error: 'Callback URL and amount are required',
          code: 'MISSING_PARAMS'
        });
      }

      const result = await generateLightningInvoice(callback, amount, comment, nostr);
      const latency = Date.now() - startTime;

      logRequest('invoice', callback, true, latency, req);
      return res.status(200).json(result);

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Lightning proxy error:', {
      error: errorMessage,
      method: req.method,
      query: req.query,
      body: req.body,
      latency,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    logRequest('error', req.url || 'unknown', false, latency, req);

    // Return user-friendly error messages
    if (errorMessage.includes('not supported')) {
      return res.status(403).json({
        error: 'Lightning address domain not supported',
        code: 'DOMAIN_NOT_SUPPORTED'
      });
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return res.status(429).json({
        error: 'Rate limited. Please try again in a few minutes.',
        code: 'RATE_LIMITED'
      });
    }

    if (errorMessage.includes('timeout')) {
      return res.status(504).json({
        error: 'Lightning provider timeout. Please try again.',
        code: 'TIMEOUT'
      });
    }

    return res.status(500).json({
      error: 'Lightning service temporarily unavailable',
      code: 'SERVICE_ERROR'
    });
  }
}

/**
 * Resolve Lightning address with caching
 */
async function resolveLightningAddress(
  lightningAddress: string,
  req: VercelRequest
): Promise<LightningAddressData> {
  // Validate Lightning address format
  if (!lightningAddress.includes('@') || lightningAddress.split('@').length !== 2) {
    throw new Error('Invalid Lightning address format');
  }

  const [username, domain] = lightningAddress.split('@');

  if (!username || !domain) {
    throw new Error('Invalid Lightning address format');
  }

  // Check if domain is allowed
  if (!ALLOWED_LIGHTNING_DOMAINS.includes(domain)) {
    throw new Error(`Lightning address domain '${domain}' is not supported`);
  }

  // Check cache first
  const cacheKey = `resolve:${lightningAddress}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Construct the Lightning address URL
  const lightningUrl = `https://${domain}/.well-known/lnurlp/${username}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(lightningUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'ZapTok/1.0 Lightning Client',
        'Accept': 'application/json',
        'X-Forwarded-For': req.headers['x-forwarded-for'] as string,
        'X-Real-IP': req.headers['x-real-ip'] as string,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited by Lightning provider');
      }
      if (response.status >= 500) {
        throw new Error('Lightning provider server error');
      }
      throw new Error(`Lightning provider responded with ${response.status}`);
    }

    const data = await response.json();

    // Validate the Lightning response for security
    if (!data.callback || !data.minSendable || !data.maxSendable || !data.metadata) {
      throw new Error('Invalid Lightning address response from provider');
    }

    // Validate callback URL is from the same domain
    const callbackUrl = new URL(data.callback);
    if (callbackUrl.hostname !== domain) {
      throw new Error('Lightning address callback domain mismatch');
    }

    // Cache the result
    CACHE.set(cacheKey, { data, timestamp: Date.now() });

    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Lightning provider timeout');
    }

    throw error;
  }
}

/**
 * Generate Lightning invoice
 */
async function generateLightningInvoice(
  callback: string,
  amount: number,
  comment?: string,
  nostr?: { eventId?: string; pubkey?: string }
): Promise<LightningInvoiceResponse> {
  // Validate amount (in millisats)
  if (amount < 1000 || amount > 100000000000) { // 1 sat to 100,000 sats
    throw new Error('Invalid payment amount');
  }

  // Construct invoice request URL
  const url = new URL(callback);
  url.searchParams.set('amount', amount.toString());

  if (comment) {
    url.searchParams.set('comment', comment.slice(0, 500)); // Limit comment length
  }

  // Add Nostr zap parameters if provided
  if (nostr?.eventId) {
    url.searchParams.set('nostr', JSON.stringify({
      eventId: nostr.eventId,
      pubkey: nostr.pubkey
    }));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'ZapTok/1.0 Lightning Client',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited by Lightning provider');
      }
      throw new Error(`Invoice generation failed with status ${response.status}`);
    }

    const data = await response.json();

    // Validate invoice response
    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'Lightning invoice generation failed');
    }

    if (!data.pr) {
      throw new Error('Invalid invoice response - missing payment request');
    }

    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Lightning invoice generation timeout');
    }

    throw error;
  }
}

/**
 * Log Lightning proxy requests for monitoring
 */
function logRequest(
  action: string,
  target: string,
  success: boolean,
  latency: number,
  req: VercelRequest
): void {
  console.log({
    timestamp: new Date().toISOString(),
    action,
    target: target.replace(/[a-f0-9]{32,}/gi, '[REDACTED]'), // Hide sensitive data
    success,
    latency: `${latency}ms`,
    method: req.method,
    userAgent: req.headers['user-agent']?.slice(0, 100),
    origin: req.headers.origin,
    // Don't log IP addresses or other PII
  });
}
