/**
 * Push Notification Unsubscribe API
 * 
 * This endpoint handles removing push notification subscriptions when users
 * disable notifications or when subscriptions become invalid.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface UnsubscribeRequest {
  endpoint: string;
  pubkey?: string;
}

// In-memory storage (shared with subscribe.ts in demo)
// In production, this would query the database
const subscriptions = new Map<string, any[]>();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, pubkey }: UnsubscribeRequest = req.body;

    // Validate required fields
    if (!endpoint) {
      return res.status(400).json({ 
        error: 'Missing required field: endpoint'
      });
    }

    let removed = false;

    if (pubkey) {
      // Remove subscription for specific user
      const userSubs = subscriptions.get(pubkey) || [];
      const filteredSubs = userSubs.filter(sub => sub.endpoint !== endpoint);
      
      if (filteredSubs.length < userSubs.length) {
        subscriptions.set(pubkey, filteredSubs);
        removed = true;
      }
    } else {
      // Search through all users and remove matching endpoint
      for (const [userId, subs] of subscriptions.entries()) {
        const filteredSubs = subs.filter(sub => sub.endpoint !== endpoint);
        if (filteredSubs.length < subs.length) {
          subscriptions.set(userId, filteredSubs);
          removed = true;
          break;
        }
      }
    }

    console.log('[Notifications] Unsubscribe:', {
      endpoint,
      pubkey,
      removed
    });

    return res.status(200).json({
      success: true,
      message: removed ? 'Subscription removed' : 'Subscription not found',
      removed
    });

  } catch (error) {
    console.error('[Notifications] Unsubscribe error:', error);
    return res.status(500).json({
      error: 'Failed to unsubscribe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * TODO: Production Implementation
 * 
 * 1. Database Query:
 *    DELETE FROM push_subscriptions 
 *    WHERE endpoint = $1 AND (pubkey = $2 OR $2 IS NULL);
 * 
 * 2. Batch Cleanup:
 *    Provide an endpoint to remove all subscriptions for a user:
 *    DELETE FROM push_subscriptions WHERE pubkey = $1;
 * 
 * 3. Expired Subscriptions:
 *    Regularly clean up subscriptions that return 410 Gone
 *    when attempting to send notifications
 */
